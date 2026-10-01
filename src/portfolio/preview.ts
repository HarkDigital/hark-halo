import { workVideo } from '../content'
import { REDUCED_MOTION } from '../kit/motion'
import { VIDEOS } from 'virtual:work-videos'
import type { Item } from './wall'

/*
 * PREVIEWS: a site's screen plays a short film of its homepage scrolling by
 * (public/work/video/<id>.mp4: 800×500, ~7s, muted; scripts/work-video.mjs).
 * The still screenshot stays underneath as its poster: the <video> sits right
 * over .pf-img, under the name card, the clearing edge, sheen, glare, dim and
 * ring, so the pane still reads as lit glass. It is transparent until a frame
 * is actually on screen ('playing', then the first presented frame where the
 * browser can say), so it never flashes black, and fades back out to the still
 * when it stops (then pauses and rewinds).
 *
 *   pointer  (hover + fine pointer: wall.ts's "hot") the hot pane plays, looped: the
 *            pointer over its screen or its pill, or its pill focused from the
 *            keyboard (the visitor started it, and it stops when they leave). 180ms
 *            on it first, so a pointer sweeping across the wall downloads nothing
 *   touch    once a scroll has settled (400ms), the LIT pane plays: wall.ts picks
 *            it (the pane nearest the middle of the view) and tells us (lit()), so
 *            the light and the film are always on the same pane; it needs 70% of
 *            its screen in view, and a lit pane with no video plays nothing. It
 *            plays ONCE, not looped, and is out by 5s (RUN, then the fade): motion
 *            that starts by itself and stops by itself inside 5s (WCAG 2.2.2), as
 *            the page has no pause control. It stops sooner once half of it has
 *            gone, or as soon as another pane is lit, and it doesn't play again
 *            until another pane has been lit. Never on Data Saver or a
 *            3G-or-slower connection
 *   never    under prefers-reduced-motion, with the site's Motion switch off
 *            (html.motion-off, 'hark:motion'), on Data Saver, while the page is
 *            hidden, for a pane still coming in or leaving (a filter: wall.ts
 *            stills them all first), or one showing its name card (no screenshot)
 *
 * Only ids the build found a video for (virtual:work-videos) ever make one, and
 * only on their first play (preload="none" from then on: nothing is downloaded
 * until it is wanted). One plays at a time; at most two <video>s stay on the
 * wall (the least recently played other goes, its decoder freed). A video that
 * fails to load or play leaves its still screenshot, quietly, for good.
 */

const HAS_VIDEO = new Set(VIDEOS)
/** the pointer rests this long on a pane before its video is asked for */
const DWELL = 180
/** touch: a scroll is over once it has been still this long */
const SETTLE = 400
/** portfolio.css .pf-vid's fade out (then it pauses and rewinds) */
const FADE = 400
const MAX_ALIVE = 2
const SLOW = ['slow-2g', '2g', '3g']
/**
 * touch: how far into its film a pane plays (seconds) before it fades back to the still. With
 * 'timeupdate' up to 250ms late and FADE after it, the motion is over inside 5s (WCAG 2.2.2)
 */
const RUN = 4.2

type Mode = 'pointer' | 'touch'

interface Clip {
  it: Item
  v: HTMLVideoElement
  /** fading in or shown */
  on: boolean
  /** the pause + rewind after a fade out */
  rest: number
  used: number
  ac: AbortController
}

export interface Previews {
  /** pointer: the hot pane's video, please (after the dwell) */
  want(it: Item): void
  /** pointer: no longer hot */
  unwant(it: Item): void
  /** its entrance is over (is-hung): it may play now if it is wanted */
  ready(it: Item): void
  /** every video stopped at once (frozen, then faded): the wall is about to move (a filter) */
  stopAll(): void
  /** off the wall (a filter retired it): its video goes */
  drop(it: Item): void
  /** the wall's light mode changed */
  mode(m: Mode): void
  /** the wall moved under a still view (a filter): touch looks again once it is still */
  moved(): void
  /** touch: wall.ts's lit pane changed (null: none). The only pane a touch preview plays on */
  lit(it: Item | null): void
}

interface Connection {
  saveData?: boolean
  effectiveType?: string
}

export function mountPreviews(): Previews {
  const html = document.documentElement
  const rm = matchMedia('(prefers-reduced-motion: reduce)')
  const clips = new Map<Item, Clip>()
  const failed = new Set<string>()
  let mode: Mode = 'touch'
  /** the pane that should be playing (it may still be coming in) */
  let wanted: Item | null = null
  /** the clip playing, or starting to */
  let current: Clip | null = null
  let dwell = 0
  let settleTimer = 0
  /** touch: nothing plays before the visitor has scrolled */
  let scrolled = false
  /** touch: wall.ts's lit pane (its light and its film are one choice: wall.ts makes it) */
  let litPane: Item | null = null
  /** touch: the pane whose one play is over: it waits until another pane has been lit */
  let spent: Item | null = null
  let ac = new AbortController()

  const conn = () => (navigator as Navigator & { connection?: Connection }).connection
  const thrifty = () => {
    const c = conn()
    if (!c) return false
    return c.saveData === true || (mode === 'touch' && SLOW.includes(c.effectiveType ?? ''))
  }
  const allowed = () => !REDUCED_MOTION && !rm.matches && !html.classList.contains('motion-off') && document.visibilityState !== 'hidden' && !thrifty()
  /** can have a video at all, now or once its entrance ends */
  const eligible = (it: Item) =>
    HAS_VIDEO.has(it.w.id) && !failed.has(it.w.id) && it.entered && !it.nofile && !it.li.hidden && !it.li.classList.contains('is-leaving')
  /** can play right now: in, its screenshot sharp, its entrance over */
  const playable = (it: Item) => eligible(it) && it.decoded && it.cleared && it.li.classList.contains('is-hung')

  // ------------------------------------------------------------ the <video>s
  function remove(c: Clip) {
    clearTimeout(c.rest)
    c.ac.abort()
    if (current === c) current = null
    clips.delete(c.it)
    c.v.pause()
    // (its file let go of, and its decoder with it)
    c.v.removeAttribute('src')
    try {
      c.v.load()
    } catch {
      /* nothing to let go of */
    }
    c.v.remove()
  }

  function clipOf(it: Item): Clip {
    const had = clips.get(it)
    if (had) {
      had.used = performance.now()
      return had
    }
    // at most MAX_ALIVE: the least recently played other one goes
    while (clips.size >= MAX_ALIVE) {
      let old: Clip | null = null
      for (const x of clips.values()) if (x !== current && (!old || x.used < old.used)) old = x
      if (!old) break
      remove(old)
    }
    const v = document.createElement('video')
    v.className = 'pf-vid'
    v.muted = true
    v.defaultMuted = true
    // (looped for the pointer only: start() sets it per play)
    v.loop = mode === 'pointer'
    v.playsInline = true
    v.preload = 'none'
    v.controls = false
    for (const a of ['muted', 'playsinline', 'disablepictureinpicture', 'disableremoteplayback']) v.setAttribute(a, '')
    v.setAttribute('preload', 'none')
    v.setAttribute('aria-hidden', 'true')
    v.setAttribute('tabindex', '-1')
    const c: Clip = { it, v, on: false, rest: 0, used: performance.now(), ac: new AbortController() }
    const opt = { signal: c.ac.signal }
    v.addEventListener('playing', () => current === c && show(c), opt)
    // touch: one play, over inside 5s (RUN), then back to the still
    v.addEventListener('timeupdate', () => mode === 'touch' && current === c && v.currentTime >= RUN && done(c), opt)
    v.addEventListener('ended', () => mode === 'touch' && current === c && done(c), opt)
    // a file that can't be had (or played): the still screenshot, for good
    v.addEventListener(
      'error',
      () => {
        failed.add(it.w.id)
        if (watched === it) unwatch()
        if (wanted === it) wanted = null
        remove(c)
      },
      opt,
    )
    v.src = workVideo(it.w.id)
    // right over the screenshot, under the name card and the glass's light
    it.img.after(v)
    clips.set(it, c)
    return c
  }

  /** in, once a frame of it is really on the glass */
  function show(c: Clip) {
    const v = c.v as HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number }
    const on = () => {
      if (current !== c || v.paused) return
      c.on = true
      v.classList.add('is-on')
    }
    if (typeof v.requestVideoFrameCallback === 'function') v.requestVideoFrameCallback(on)
    else on()
  }

  function start(it: Item) {
    if (wanted !== it || !allowed() || !playable(it)) return
    if (mode === 'touch' && it === spent) return
    if (current && current.it !== it) stop(current)
    const c = clipOf(it)
    current = c
    clearTimeout(c.rest)
    c.v.loop = mode === 'pointer'
    // still playing (it was fading out): straight back in
    if (!c.v.paused) return show(c)
    const p = c.v.play()
    // (refused, or a pause got there first: the still stays)
    if (p && typeof p.catch === 'function') p.catch(() => {})
  }

  /** out to the still: it fades, then pauses and rewinds. `now`: frozen at once (the wall moves) */
  function stop(c: Clip, now = false) {
    if (current === c) current = null
    // (never shown yet: nothing to fade, so it stops at once)
    if (now || !c.on) c.v.pause()
    c.on = false
    c.v.classList.remove('is-on')
    clearTimeout(c.rest)
    c.rest = window.setTimeout(() => {
      if (current === c) return
      c.v.pause()
      try {
        c.v.currentTime = 0
      } catch {
        /* not seekable yet: it starts from the top anyway */
      }
    }, FADE)
  }

  /** every video out (and none wanted) */
  function release(now = false) {
    clearTimeout(dwell)
    unwatch()
    wanted = null
    for (const c of clips.values()) if (c === current || c.on || !c.v.paused) stop(c, now)
  }

  // ------------------------------------------------------------ touch: the middle pane, once still
  // (it stops as soon as half of its screen has gone, mid-scroll: an observer, no layout reads)
  let watched: Item | null = null
  const away = new IntersectionObserver(
    es => {
      for (const e of es) {
        const it = wanted
        if (!it || e.target !== it.glass || e.intersectionRatio >= 0.5) continue
        unwatch()
        wanted = null
        const c = clips.get(it)
        if (c) stop(c)
      }
    },
    { threshold: [0, 0.5] },
  )
  function unwatch() {
    if (watched) away.unobserve(watched.glass)
    watched = null
  }
  function aim(it: Item | null) {
    if (wanted === it) return it && start(it)
    unwatch()
    const was = wanted && clips.get(wanted)
    if (was) stop(was)
    wanted = it
    if (!it) return
    watched = it
    away.observe(it.glass)
    start(it)
  }
  /** touch: its one play is over: back to the still, and it waits for another pane to be lit */
  function done(c: Clip) {
    spent = c.it
    if (wanted === c.it) aim(null)
    else stop(c)
  }
  /** touch, a scroll over: the lit pane plays, if it can (never another: the light is where the film is) */
  function settle() {
    if (mode !== 'touch' || !scrolled) return
    if (!allowed()) return aim(null)
    const it = litPane
    if (!it || it === spent || !eligible(it)) return aim(null)
    const vh = innerHeight || 1
    const r = it.glass.getBoundingClientRect()
    const seen = Math.min(r.bottom, vh) - Math.max(r.top, 0)
    aim(r.height && seen >= r.height * 0.7 ? it : null)
  }
  const later = () => {
    clearTimeout(settleTimer)
    settleTimer = window.setTimeout(settle, SETTLE)
  }
  const onScroll = () => {
    scrolled = true
    later()
  }

  // ------------------------------------------------------------ the page's own calm
  const resume = () => {
    if (!allowed()) return release(true)
    if (mode === 'touch') later()
    else if (wanted) start(wanted)
  }
  const pause = () => {
    // (the wanted pane is kept: it plays again when the page is back)
    clearTimeout(dwell)
    for (const c of clips.values()) if (c === current || c.on || !c.v.paused) stop(c, true)
  }
  document.addEventListener('visibilitychange', () => (document.visibilityState === 'hidden' ? pause() : resume()))
  addEventListener('hark:motion', () => (html.classList.contains('motion-off') ? release(true) : resume()))
  const onRm = () => (rm.matches ? release(true) : resume())
  if (typeof rm.addEventListener === 'function') rm.addEventListener('change', onRm)
  else rm.addListener?.(onRm)

  return {
    want(it) {
      if (mode !== 'pointer') return
      if (wanted !== it) {
        clearTimeout(dwell)
        if (current && current.it !== it) stop(current)
      }
      wanted = it
      if (!HAS_VIDEO.has(it.w.id)) return
      // back over one that is still fading out: in again at once
      const c = clips.get(it)
      if (c && !c.v.paused) return start(it)
      clearTimeout(dwell)
      dwell = window.setTimeout(() => start(it), DWELL)
    },
    unwant(it) {
      if (mode !== 'pointer' || wanted !== it) return
      clearTimeout(dwell)
      wanted = null
      const c = clips.get(it)
      if (c) stop(c)
    },
    ready(it) {
      if (wanted === it) start(it)
    },
    stopAll() {
      clearTimeout(settleTimer)
      release(true)
    },
    drop(it) {
      if (wanted === it) {
        unwatch()
        clearTimeout(dwell)
        wanted = null
      }
      const c = clips.get(it)
      if (c) remove(c)
    },
    mode(m) {
      ac.abort()
      ac = new AbortController()
      clearTimeout(settleTimer)
      release(true)
      mode = m
      litPane = null
      spent = null
      if (m === 'touch') addEventListener('scroll', onScroll, { signal: ac.signal, passive: true })
    },
    moved() {
      if (mode === 'touch' && scrolled) later()
    },
    lit(it) {
      if (litPane === it) return
      litPane = it
      // (another pane lit: the spent one may play again when it is lit again)
      if (it && it !== spent) spent = null
      if (mode !== 'touch') return
      // the light has moved on: so has the film (the new one plays once the scroll is over)
      if (wanted && wanted !== it) aim(null)
      if (scrolled) later()
    },
  }
}
