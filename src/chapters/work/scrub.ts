import * as THREE from 'three'

/*
 * SCRUB — a site's scroll-preview video as a texture whose frame the story's
 * scroll picks (the Work carousel's leaves and tiles).
 *
 * The videos (public/work/video/scrub/<id>.mp4, scripts/work-video.mjs
 * --scrub) are 7 s at 24 fps, no audio, a keyframe every 12 frames (a seek
 * decodes at most 11), 1280×800 for a leaf and 720×450 for a tile (800 / 480
 * on phones), limited-range BT.601, fully tagged: a 0.8 s hold
 * on the site's hero, an eased 5.4 s scroll down its homepage, a 0.8 s hold.
 * The chapter says which frame it wants (from `local`, so scrolling back
 * plays it back); this file gets that frame onto the GPU without janking:
 *
 *  - fetched whole as a blob (one request, seeks never wait on the network,
 *    and a released video re-attaches without downloading again)
 *  - a decoder only while the chapter says so (attach / release): a released
 *    video drops its src, and its texture keeps the last frame it uploaded
 *  - one seek at a time: a new target waits for the pending seek's 'seeked'
 *    AND its frame being presented (requestVideoFrameCallback), then the
 *    latest target goes; a target the video already shows costs nothing; and
 *    no more than ~30 a second (the video is 24 fps: a fast scroll gains
 *    nothing from more, and each seek is a decode and an upload)
 *  - the texture uploads only then (renderer.initTexture, at once: what is on
 *    the GPU is always a frame the video presented), never every frame as a
 *    plain VideoTexture would, and only the frame asked for: never a stray one
 *    the callback reports (iOS's warm-up play decodes the first frames). Without
 *    requestVideoFrameCallback (Safari 15.0–15.3, or a browser that doesn't
 *    call it for a paused, detached video) 'seeked' says the frame is ready
 *  - iOS: a muted inline video may not decode a frame until it has played,
 *    so each attach plays and pauses it first (a rejection is fine);
 *    elsewhere only a first seek that stalls tries the same
 *  - a video that never shows a frame (a device that can't decode it, a
 *    failed download) fails, and the chapter keeps the still
 *
 * Colour: three stores a VideoTexture unencoded (RGBA8, never SRGB8_ALPHA8:
 * browsers upload video to that slowly or not at all) and decodes sRGB in the
 * shader, as it does for its own video maps; the face shader does the same
 * when uShotEnc is 1 (scene.ts).
 */

export const SCRUB_FPS = 24
/** the last frame (7 s at 24 fps: frames 0–167) */
export const SCRUB_LAST = 167
/** the least time between two seeks (ms) */
const SEEK_GAP = 1000 / 30

const RVFC = typeof HTMLVideoElement !== 'undefined' && 'requestVideoFrameCallback' in HTMLVideoElement.prototype
const IOS =
  typeof navigator !== 'undefined' && (/iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))
/** set once requestVideoFrameCallback is seen not to fire for a seek: 'seeked' alone from then on */
let vfcQuiet = false

/**
 * Whether this device should scrub videos at all: not with Data Saver on or on
 * a slow connection (a featured site's video is ~2.5–4 MB on desktop, a tile's ~1 MB), and
 * only where an H.264 (High, level 3.2: what scripts/work-video.mjs writes) MP4 can play.
 * Everything else keeps the stills.
 */
export function scrubAllowed(): boolean {
  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') return false
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
  if (c?.saveData) return false
  if (c?.effectiveType && /(^|-)(2g|3g)$/.test(c.effectiveType)) return false
  try {
    return document.createElement('video').canPlayType('video/mp4; codecs="avc1.640020"') !== ''
  } catch {
    return false
  }
}

/** A VideoTexture that uploads only when told (Scrub.present), with mipmaps for the frosted glass. */
class ScrubTexture extends THREE.VideoTexture {
  constructor(video: HTMLVideoElement) {
    super(video)
    // VideoTexture re-uploads on every presented frame (its own requestVideoFrameCallback
    // loop) or, without one, every rendered frame: here Scrub says when
    const self = this as unknown as { _requestVideoFrameCallbackId: number }
    if (self._requestVideoFrameCallbackId) {
      video.cancelVideoFrameCallback(self._requestVideoFrameCallbackId)
      self._requestVideoFrameCallbackId = 0
    }
    this.colorSpace = THREE.SRGBColorSpace
    // the frost reads the print through its mips (scene.ts faceFrost)
    this.generateMipmaps = true
    this.minFilter = THREE.LinearMipmapLinearFilter
    this.anisotropy = 8
  }

  override update() {
    /* uploads come from Scrub.present only */
  }
}

export interface ScrubHooks {
  /** put the texture on the GPU now (renderer.initTexture) */
  upload(tex: THREE.Texture): void
  /** a new frame is up (wake a Motion-off engine) */
  frame(): void
  /** this video can't be shown (the chapter keeps the still) */
  failed(s: Scrub, decode: boolean): void
}

type State = 'idle' | 'fetching' | 'fetched' | 'failed'
type Dog = 'first' | 'stall' | 'frame' | 'warm' | 'gap'

export class Scrub {
  state: State = 'idle'
  tex: THREE.VideoTexture | null = null
  /** the frame on the GPU (-1: none yet) */
  frame = -1
  /** the video's width in texels (the frost's mip bias against the still's) */
  width = 0
  /** holds a decoder */
  attached = false

  private blob = ''
  private v: HTMLVideoElement | null = null
  /** the frame the chapter wants; the frame of the seek last sent */
  private want = 0
  private asked = -1
  private seekDone = true
  private frameDone = true
  /** metadata in (and warmed, on iOS): seeks may go */
  private ready = false
  private warming = false
  /** played and paused since this attach (a fresh src may need it again) */
  private warmed = false
  /** a frame presented since this attach */
  private got = false
  /** bumps on every attach / release: callbacks from an older one ignore themselves */
  private gen = 0
  private vfId = 0
  /** watchdogs, one of each kind at a time */
  private dogs: Record<Dog, number> = { first: 0, stall: 0, frame: 0, warm: 0, gap: 0 }
  private seekAt = -1e9

  constructor(
    readonly url: string,
    private hooks: ScrubHooks,
  ) {}

  /** the frame on the GPU is the one wanted, and nothing is in flight */
  get settled() {
    return this.frame === this.want && this.seekDone && this.frameDone && !this.warming
  }

  /** Download the whole video (once). */
  async fetch(low: boolean): Promise<void> {
    if (this.state !== 'idle') return
    this.state = 'fetching'
    try {
      const res = await fetch(this.url, { priority: low ? 'low' : 'high' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      this.blob = URL.createObjectURL(await res.blob())
      this.state = 'fetched'
    } catch (err) {
      console.warn(`[work] scrub video unavailable: ${this.url}`, err)
      this.fail(false)
    }
  }

  /** The frame the chapter wants (0..SCRUB_LAST); goes when the video is free. */
  seek(frame: number) {
    if (frame === this.want) return
    this.want = frame
    this.pump()
  }

  /** Take a decoder and show the wanted frame. */
  attach() {
    if (this.attached || this.state !== 'fetched') return
    this.attached = true
    const g = ++this.gen
    let v = this.v
    if (!v) {
      v = document.createElement('video')
      v.muted = true
      v.defaultMuted = true
      v.playsInline = true
      v.setAttribute('muted', '')
      v.setAttribute('playsinline', '')
      v.setAttribute('webkit-playsinline', '')
      v.disablePictureInPicture = true
      v.preload = 'auto'
      v.addEventListener('seeked', this.onSeeked)
      v.addEventListener('error', this.onError)
      this.v = v
      this.tex = new ScrubTexture(v)
    }
    this.ready = false
    this.got = false
    this.warmed = false
    this.asked = -1
    this.seekDone = this.frameDone = true
    const video = v
    video.addEventListener(
      'loadedmetadata',
      () => {
        if (g !== this.gen) return
        this.width = video.videoWidth
        const go = () => {
          this.ready = true
          this.pump()
        }
        if (IOS) this.warm(g, go)
        else go()
      },
      { once: true },
    )
    if (RVFC) this.vfId = video.requestVideoFrameCallback(this.onFrame)
    video.src = this.blob
    // a video that never shows a frame keeps its still
    this.dog('first', 4000, g, () => {
      if (!this.got) this.fail(true)
    })
  }

  /** Drop the decoder; the texture keeps the frame it last uploaded. */
  release() {
    if (!this.attached) return
    this.attached = false
    this.gen++
    for (const k of Object.keys(this.dogs) as Dog[]) {
      clearTimeout(this.dogs[k])
      this.dogs[k] = 0
    }
    const v = this.v
    if (!v) return
    if (this.vfId) v.cancelVideoFrameCallback(this.vfId)
    this.vfId = 0
    this.ready = false
    this.warming = false
    this.seekDone = this.frameDone = true
    try {
      v.pause()
      v.removeAttribute('src')
      v.load()
    } catch {
      /* already empty */
    }
  }

  // ------------------------------------------------------------------ internals

  private pump() {
    const v = this.v
    if (!v || !this.attached || !this.ready || this.warming) return
    if (!this.seekDone || !this.frameDone || this.want === this.asked) return
    const g = this.gen
    const wait = this.seekAt + SEEK_GAP - performance.now()
    if (wait > 1) {
      if (!this.dogs.gap) this.dog('gap', wait, g, () => this.pump())
      return
    }
    this.seekAt = performance.now()
    this.asked = this.want
    this.seekDone = false
    this.frameDone = !RVFC || vfcQuiet
    v.currentTime = (this.want + 0.5) / SCRUB_FPS
    // the first seek never completing: try a play/pause (a WebKit that won't decode
    // until it has played), then let the no-frame dog decide
    if (this.got || this.warmed) return
    const asked = this.asked
    this.dog('stall', 1200, g, () => {
      if (this.seekDone || this.asked !== asked) return
      this.warm(g, () => {
        this.asked = -1
        this.seekDone = this.frameDone = true
        this.pump()
      })
    })
  }

  private onSeeked = () => {
    if (!this.attached || this.warming) return
    this.seekDone = true
    if (!RVFC || vfcQuiet) {
      this.present(this.asked)
      this.frameDone = true
    } else if (!this.frameDone) {
      // requestVideoFrameCallback should follow within a frame or two; if it doesn't, stop waiting for it
      const asked = this.asked
      this.dog('frame', 120, this.gen, () => {
        if (this.frameDone || this.asked !== asked) return
        // (a hidden tab presents nothing: that says nothing about the callback)
        if (!document.hidden) vfcQuiet = true
        this.present(asked)
        this.frameDone = true
        this.pump()
      })
    }
    this.pump()
  }

  private onFrame = (_now: number, meta: VideoFrameCallbackMetadata) => {
    const v = this.v
    if (!v || !this.attached) return
    this.vfId = v.requestVideoFrameCallback(this.onFrame)
    if (this.warming || this.asked < 0) return
    // only the frame asked for goes up: a stray one (iOS's warm-up play decodes the
    // first frames, and its callback can land after the first seek has gone) would
    // flash the hero over the frame this print should be on. (A seek whose frame never
    // reports here is presented by the 'frame' dog after 'seeked'.)
    const f = Math.round(meta.mediaTime * SCRUB_FPS)
    if (f !== this.asked) return
    this.present(f)
    this.frameDone = true
    this.pump()
  }

  private onError = () => {
    // (a release empties the src without an error; only a real one while attached counts)
    const v = this.v
    if (this.attached && v?.error && v.getAttribute('src')) this.fail(true)
  }

  /** The video's current frame to the GPU, now. */
  private present(f: number) {
    const tex = this.tex
    if (!tex || f < 0) return
    tex.needsUpdate = true
    try {
      this.hooks.upload(tex)
    } catch {
      return
    }
    this.frame = Math.max(0, Math.min(SCRUB_LAST, f))
    this.got = true
    this.hooks.frame()
  }

  /** iOS: play and pause once so the decoder runs (a rejection — Low Power Mode — is fine). */
  private warm(g: number, then: () => void) {
    const v = this.v
    if (!v) return
    this.warming = true
    let done = false
    const finish = () => {
      if (done || g !== this.gen) return
      done = true
      try {
        v.pause()
      } catch {
        /* fine */
      }
      this.warming = false
      this.warmed = true
      then()
    }
    try {
      const p = v.play()
      if (p && typeof p.then === 'function') p.then(finish, finish)
      else finish()
    } catch {
      finish()
    }
    this.dog('warm', 800, g, finish)
  }

  private fail(decode: boolean) {
    if (this.state === 'failed') return
    this.release()
    this.state = 'failed'
    this.hooks.failed(this, decode)
  }

  private dog(kind: Dog, ms: number, g: number, fn: () => void) {
    clearTimeout(this.dogs[kind])
    this.dogs[kind] = window.setTimeout(() => {
      this.dogs[kind] = 0
      if (g === this.gen) fn()
    }, ms)
  }
}

/**
 * A site's scrub video (scripts/work-video.mjs --scrub): public/work/video/scrub/<id>.mp4,
 * or on phones scrub/m/<id>.mp4, sized to the smaller stills they draw (800 / 480 wide:
 * the phone canvas renders a leaf about 485 px wide, so more is only download).
 */
export const scrubUrl = (id: string, small = false) => `${import.meta.env.BASE_URL}work/video/scrub/${small ? 'm/' : ''}${id}.mp4`
