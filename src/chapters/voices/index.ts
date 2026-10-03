import * as THREE from 'three'
import type { CameraPose, Chapter, ChapterContext, Frame } from '../../core/types'
import { el, rise } from '../../core/dom'
import { clamp, smoothstep } from '../../core/math'
import { nextFrame } from '../../core/yield'
import { G } from '../../kit/glass'
import { SECTIONS, TESTIMONIALS } from '../../content'
import { buildFloor, buildPane, buildWire, setWireRadius, type Pane, type Wire } from './scene'
import { SPEECH_SAMPLES } from './voiceprint'
import { WordScrub, riseEase, wordRamp } from './scrub'
import './voices.css'

/*
 * VOICEPRINT (voices) — each client's voice drawn in neon.
 *
 * One glass neon tube, bent into an audio waveform, runs across the black room
 * behind a tall sheet of frosted glass. Every quote draws its own waveform
 * (voiceprint.ts: words → peaks, commas and full stops → silences). Behind the
 * frost the line blooms into soft colour; past the pane's edges it's a crisp
 * tube, mirrored in the black floor. The QUOTE is set large on the pane, the
 * speaker small beneath it; scrolling to the next voice morphs the tube into
 * the next speaker's print and shifts its colour (cyan → violet → magenta …).
 *
 *   0.00–0.12  intro: the line lies flat and dark: “They talk.” rises in
 *              (0.014–0.036). It catches (0.036–0.056) and lights up: “We
 *              Listen.” (0.040–0.058); settled 0.06 (heading) and 0.08
 *              (landing), clear of the cut; both leave 0.097–0.117
 *   0.12–0.93  eight voices (0.101 each): hold (the quote, the live line; a
 *              soft playhead reads along the voice as you scroll) → around
 *              each boundary (±0.021) the line quiets, drifts and re-forms as
 *              the next voice while the quote swaps
 *   0.93–1.00  the last voice finishes: the line settles flat for the cut
 *
 * The words are scrubbed by scroll, not played on a timer (scrub.ts): within
 * each voice's span (fractions of it, the re-forms at either end ≈ 0.21 each)
 *   0.03–0.42  the quote rises in word by word, in reading order (fully in
 *              ~36% into the hold, so it's read while the visitor scrolls on)
 *   0.30–0.47  the speaker, then the company, follow it in
 *   0.79–0.97  as the line starts to re-form, the words leave, last first
 *              (the last voice leaves with the line settling, 0.926–0.948)
 * so scrolling back plays it all in reverse, and into a voice from below its
 * words come back in reading order. Calm (Motion off / reduced motion): each
 * voice is set whole and swaps with a quick scroll-driven fade. A fast pass (a
 * pip landing runs the whole chapter in ~1 s, or a fling) fades the words out
 * whole until the scroll slows, so the quotes don't strobe past (GATE_*).
 *
 * The pane is locked to the DOM card the quote is set in: the camera looks
 * square-on at it, and every layout the pane is rebuilt to the card's size.
 * Everything is derived from `local`; frame.time only drives the idle shimmer.
 */

const N = TESTIMONIALS.length
const B0 = 0.12
const B1 = 0.93
const SPAN = (B1 - B0) / N
const HYST = 0.004
/** the line re-forms over ±MORPH (local) around each boundary between voices */
const MORPH = 0.021
/** intro beats: each title line's words rise in over [A0, A1]; both leave over TITLE_OUT */
const TITLE_A0 = 0.014
const TITLE_A1 = 0.036
const TITLE_B0 = 0.04
const TITLE_B1 = 0.058
const TITLE_OUT0 = B0 - 0.023
const TITLE_OUT1 = B0 - 0.003
const IGN_A = 0.036
const IGN_B = 0.056
/** the stutter as the gas catches */
const CATCH = 0.046
const TALK_A = 0.05
const TALK_B = B0 - 0.004
/** out beat: the voice finishes */
const OUT_A = B1 + 0.004
const OUT_B = 0.975

/** each voice's words, in fractions of its span (see the header) */
const QUOTE_IN0 = 0.03
const QUOTE_IN1 = 0.42
const CREDIT_IN0 = 0.3
const CREDIT_IN1 = 0.47
const WORDS_OUT0 = 0.79
const WORDS_OUT1 = 0.97
/** the last voice leaves with the line settling flat (local) */
const LAST_OUT0 = B1 - 0.004
const LAST_OUT1 = B1 + 0.018
/** calm: how quickly a whole voice fades in / out (fraction of its span) */
const CALM_FADE = 0.08
/**
 * Fast passes keep the words down. A pip landing runs the whole chapter in
 * ~1 s (up to ~13 vh/s), a fling as fast: scrubbed straight from local, every
 * quote would flick past for a frame or two. Above GATE_LO vh/s (|frame.velocity|,
 * already damped) the words dim, gone by GATE_HI (about where the engine's own
 * fling dim is full), and they come back over GATE_RISE s only once the scroll
 * is under GATE_LO again, so a landing's tail doesn't flash the voice it slows
 * past. Reading-speed scrolls (wheel, trackpad: ≲ 1 vh/s, ~1.6 voices a second)
 * never touch it, so there the words stay a pure function of local.
 */
const GATE_LO = 2
const GATE_HI = 4
const GATE_RISE = 0.3

/** the band at the foot of the pane the line runs through (fraction of the card's height) */
const BAND = 0.3
/** camera distance to the pane's front face (world units) and field of view */
const DIST = 10
const FOV = 32
/** how far behind the pane's back face the tube runs */
const WIRE_GAP = 0.32
const PANE_DEPTH = 0.11
/** samples the old line drifts out / the new one drifts in by while re-forming */
const DRIFT = Math.round(SPEECH_SAMPLES * 0.07)

const PALETTE = [G.neonA, G.neonB, G.neonC].map(c => new THREE.Color(c))
const voiceColor = (i: number) => PALETTE[((i % PALETTE.length) + PALETTE.length) % PALETTE.length]

const easeInOut = (t: number) => {
  const x = clamp(t)
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}
/** 0 → 1 → 0 over x ∈ [-1, 1] */
const bump = (x: number) => {
  const a = clamp(1 - x * x)
  return a * a
}

/** continuous voice index along the chapter (holds mid-beat, re-forms across each boundary) */
function voiceAt(local: number) {
  let f = 0
  for (let k = 1; k < N; k++) f += easeInOut((local - (B0 + k * SPAN) + MORPH) / (2 * MORPH))
  return f
}

interface Layout {
  w: number
  h: number
  portrait: boolean
  /** the card (= the pane) in px */
  x0: number
  y0: number
  x1: number
  y1: number
  band: number
  ok: boolean
}

export default function create(): Chapter {
  const group = new THREE.Group()
  let wire: Wire
  let pane: Pane
  let floor: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>
  const floorColor = new THREE.Color(G.neonA)

  // DOM
  let card: HTMLElement
  let body: HTMLElement
  let eyebrow: HTMLElement
  let index: HTMLElement
  let ticks: HTMLElement[] = []
  let titleA: HTMLElement
  let titleB: HTMLElement
  let title: HTMLElement
  /** each voice's words: the quote's first (`quote` of them), then the speaker's */
  const voices: { root: HTMLElement; scrub: WordScrub; quote: number }[] = []
  let titleScrubA: WordScrub
  let titleScrubB: WordScrub
  let shown = -2 // -2 fresh, -1 intro, 0..N-1 voice, N out
  let deferShow = 0
  /** the speed gate over every word group, 0..1 (-1: set it from the next frame's speed) */
  let gate = -1
  const lay: Layout = { w: 0, h: 0, portrait: false, x0: 0, y0: 0, x1: 1, y1: 1, band: 0, ok: false }
  let fitW = -1
  let fitH = -1

  /* -------------------------------------------------------------- DOM */

  function buildDom(stage: HTMLElement) {
    card = el('div', 'vx-card', undefined, stage)
    const meta = el('div', 'vx-meta', undefined, card)
    eyebrow = el('p', 'hud-eyebrow vx-eyebrow', SECTIONS.voices.eyebrow, meta)
    index = el('div', 'vx-index', undefined, meta)
    const tickRow = el('div', 'vx-ticks', undefined, index)
    ticks = TESTIMONIALS.map(() => el('i', '', undefined, tickRow))

    body = el('div', 'vx-body', undefined, card)
    // “They talk.” first; “We listen.” (the lit accent) once the line catches.
    // (on the card, not the body: it's centred on the whole pane)
    const m = SECTIONS.voices.title.match(/^(.*?\.)\s+(.*)$/)
    title = el('h2', 'hud-h2 vx-title', undefined, card)
    titleA = rise(el('span', 'vx-t1', undefined, title), m ? m[1] : SECTIONS.voices.title)
    title.appendChild(document.createTextNode(' '))
    titleB = rise(el('span', 'vx-t2', undefined, title), m ? `<em>${m[2]}</em>` : '')
    titleScrubA = new WordScrub(titleA, [titleA])
    titleScrubB = new WordScrub(titleB, [titleB])

    const stack = el('div', 'vx-voices', undefined, body)
    TESTIMONIALS.forEach(t => {
      const root = el('figure', 'vx-voice', undefined, stack)
      const q = rise(el('blockquote', 'vx-quote', undefined, root), `“${t.quote}”`)
      const credit = el('figcaption', 'vx-credit', undefined, root)
      const name = rise(el('span', 'vx-name', undefined, credit), t.name)
      const co = rise(el('span', 'vx-co', undefined, credit), t.company)
      const scrub = new WordScrub(root, [q, name, co])
      voices.push({ root, scrub, quote: q.querySelectorAll('.rise-w').length })
    })
    el('div', 'vx-band', undefined, card)

    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => measure()).observe(card)
    window.addEventListener('resize', () => measure())
    document.fonts?.ready.then(() => {
      fitW = -1
      measure()
    })
    measure()
  }

  /** the card's rect (the pane follows it) and the quote size that fits every voice; on resize only */
  function measure() {
    if (!card) return
    const r = card.getBoundingClientRect()
    if (r.width < 10 || r.height < 10) return
    const band = Math.round(r.height * BAND)
    card.style.setProperty('--vx-band', `${band}px`)
    lay.x0 = r.left
    lay.y0 = r.top
    lay.x1 = r.right
    lay.y1 = r.bottom
    lay.band = band
    lay.w = window.innerWidth
    lay.h = window.innerHeight
    lay.portrait = lay.w / Math.max(1, lay.h) <= 1
    lay.ok = true
    fitQuotes()
  }

  /** one quote size for all eight voices: the largest at which the longest still fits */
  function fitQuotes() {
    const bw = body.clientWidth
    const bh = body.clientHeight
    if (!bw || !bh || (bw === fitW && bh === fitH)) return
    fitW = bw
    fitH = bh
    const max = Math.min(48, Math.max(20, bw * 0.078))
    let lo = 14
    let hi = max
    const tallest = () => voices.reduce((a, v) => Math.max(a, v.root.offsetHeight), 0)
    card.style.setProperty('--vx-fs', `${hi}px`)
    if (tallest() <= bh) lo = hi
    else
      for (let i = 0; i < 9; i++) {
        const mid = (lo + hi) / 2
        card.style.setProperty('--vx-fs', `${mid}px`)
        if (tallest() <= bh) lo = mid
        else hi = mid
      }
    card.style.setProperty('--vx-fs', `${Math.floor(lo * 4) / 4}px`)
  }

  function sinkAll() {
    for (const v of voices) v.scrub.clear()
    titleScrubA.clear()
    titleScrubB.clear()
    card.classList.remove('is-intro', 'is-voice')
    shown = -2
  }

  /** the speed gate: drops at once with speed, recovers only once the scroll is slow again */
  function stepGate(frame: Frame) {
    const speed = Math.abs(frame.velocity)
    const drop = 1 - smoothstep(GATE_LO, GATE_HI, speed)
    if (gate < 0 || drop < gate) gate = drop
    else if (speed < GATE_LO && gate < 1) gate = Math.min(1, gate + frame.dt / GATE_RISE)
    return gate * gate * (3 - 2 * gate)
  }

  /**
   * Every word's reveal from `local` alone (forward and back alike). Calm:
   * no movement — whole lines, faded in and out by scroll. `g` (the speed
   * gate) only fades whole groups, on top.
   */
  function scrubWords(local: number, calm: boolean, g: number) {
    /* the intro title: “They talk.”, then “We listen.”; they leave last word first */
    const nA = titleScrubA.count
    const nB = titleScrubB.count
    if (local >= TITLE_OUT1) {
      titleScrubA.clear()
      titleScrubB.clear()
    } else if (calm) {
      const out = 1 - smoothstep(TITLE_OUT0 + 0.003, TITLE_OUT1 - 0.003, local)
      const oA = Math.min(smoothstep(TITLE_A0, TITLE_A0 + 0.016, local), out)
      const oB = Math.min(smoothstep(TITLE_B0, TITLE_B0 + 0.014, local), out)
      for (let k = 0; k < nA; k++) titleScrubA.set(k, oA > 0 ? 1 : 0)
      for (let k = 0; k < nB; k++) titleScrubB.set(k, oB > 0 ? 1 : 0)
      titleScrubA.fade(oA * g)
      titleScrubB.fade(oB * g)
    } else {
      const n = nA + nB
      for (let k = 0; k < nA; k++) {
        const into = wordRamp(local, TITLE_A0, TITLE_A1, k, nA)
        const out = wordRamp(local, TITLE_OUT0, TITLE_OUT1, n - 1 - k, n)
        titleScrubA.set(k, riseEase(Math.min(into, 1 - out)))
      }
      for (let k = 0; k < nB; k++) {
        const into = wordRamp(local, TITLE_B0, TITLE_B1, k, nB)
        const out = wordRamp(local, TITLE_OUT0, TITLE_OUT1, nB - 1 - k, n)
        titleScrubB.set(k, riseEase(Math.min(into, 1 - out)))
      }
      titleScrubA.fade(g)
      titleScrubB.fade(g)
    }

    /* the voices: each one's words through its own span */
    const at = (local - B0) / SPAN
    for (let i = 0; i < N; i++) {
      const v = voices[i]
      const ph = at - i
      const last = i === N - 1
      const o0 = last ? (LAST_OUT0 - B0) / SPAN - i : WORDS_OUT0
      const o1 = last ? (LAST_OUT1 - B0) / SPAN - i : WORDS_OUT1
      if (ph <= QUOTE_IN0 || ph >= o1) {
        v.scrub.clear()
        continue
      }
      const n = v.scrub.count
      if (calm) {
        const o = Math.min(smoothstep(QUOTE_IN0, QUOTE_IN0 + CALM_FADE, ph), 1 - smoothstep(o1 - CALM_FADE, o1, ph))
        for (let k = 0; k < n; k++) v.scrub.set(k, o > 0 ? 1 : 0)
        v.scrub.fade(o * g)
        continue
      }
      const nq = v.quote
      for (let k = 0; k < n; k++) {
        const into = k < nq ? wordRamp(ph, QUOTE_IN0, QUOTE_IN1, k, nq) : wordRamp(ph, CREDIT_IN0, CREDIT_IN1, k - nq, n - nq)
        const out = wordRamp(ph, o0, o1, n - 1 - k, n)
        v.scrub.set(k, riseEase(Math.min(into, 1 - out)))
      }
      v.scrub.fade(g)
    }
  }

  function wantAt(local: number) {
    let want = local < B0 ? -1 : local >= B1 ? N : Math.min(N - 1, Math.floor((local - B0) / SPAN))
    if (shown >= -1 && want !== shown && Math.abs(want - shown) === 1) {
      const hi = Math.max(want, shown)
      const boundary = hi >= N ? B1 : B0 + hi * SPAN
      if (Math.abs(local - boundary) < HYST) want = shown
    }
    return want
  }

  /** the meta line (its ticks) follows the voice in view; the words are scrubbed (scrubWords) */
  function show(next: number) {
    if (next === shown) return
    shown = next
    const isVoice = next >= 0 && next < N
    card.classList.toggle('is-voice', isVoice)
    card.classList.toggle('is-intro', next === -1)
    if (isVoice) {
      ticks.forEach((d, i) => {
        d.classList.toggle('is-on', i === next)
        d.classList.toggle('is-past', i < next)
      })
    }
  }

  /* ------------------------------------------------------------ camera */

  const cam = { pos: new THREE.Vector3(0, 2, DIST), target: new THREE.Vector3(0, 2, 0) }
  const tmpC = new THREE.Color()

  /** lock the pane to the card: size it, place the camera square-on, place the line */
  function place(frame: Frame) {
    const W = frame.width
    const H = frame.height
    if (!lay.ok) measure()
    const tanV = Math.tan(THREE.MathUtils.degToRad(FOV / 2))
    const tanH = tanV * (W / Math.max(1, H))
    // world units per px on the pane's front face (z = 0) and on the tube's plane
    const k0 = (2 * DIST * tanV) / H
    const zW = -(PANE_DEPTH + WIRE_GAP)
    const kW = (2 * (DIST - zW) * tanV) / H
    const pw = (lay.x1 - lay.x0) * k0
    const ph = (lay.y1 - lay.y0) * k0
    const radius = (lay.portrait ? 14 : 20) * k0
    pane.resize(pw, ph, PANE_DEPTH, radius)
    // the camera looks straight down -z; the pane (foot on the floor, y = 0) lands on the card
    const nx = ((lay.x0 + lay.x1) / W) - 1
    const ny = 1 - ((lay.y0 + lay.y1) / H)
    cam.pos.set(-nx * DIST * tanH, ph / 2 - ny * DIST * tanV, DIST)
    cam.target.set(cam.pos.x, cam.pos.y, 0)
    // the line: through the middle of the band at the pane's foot
    const lineY = lay.y1 - lay.band * 0.5
    const ly = 1 - (2 * lineY) / H
    const cx = (lay.x0 + lay.x1) / 2
    const lx = (2 * cx) / W - 1
    const dW = DIST - zW
    wire.u.uOrigin.value.set(cam.pos.x + lx * dW * tanH, cam.pos.y + ly * dW * tanV, zW)
    // speech runs a little wider than the pane (so its first and last words are crisp)
    // (portrait: a closer listen — the middle of the voice under the frost, the rest running off-screen)
    const speechPx = (lay.x1 - lay.x0) * (lay.portrait ? 2.1 : 1.85)
    wire.u.uScale.value.set((speechPx / 2) * kW, lay.band * (lay.portrait ? 0.34 : 0.38) * kW)
    const r = (frame.mobile ? 1.7 : 2.3) * kW
    setWireRadius(wire, r, r * (frame.mobile ? 4 : 5.5))
    // the pane's x-range (reflection: behind it, the mirrored tube is frosted away)
    wire.u.uPaneX.value.set(-pw / 2 + 0.02, pw / 2 - 0.02)
    const fu = floor.material.uniforms
    fu.uPool.value.set(0, 0.9)
    fu.uPoolR.value.set(pw * 0.62, 1.1)
  }

  /* ----------------------------------------------------------- chapter */

  return {
    id: 'voices',
    group,
    // keyboard stops land on each voice with its quote settled and the line holding
    anchors: TESTIMONIALS.map((_, i) => B0 + SPAN * (i + 0.5)),

    async init(ctx: ChapterContext) {
      buildDom(ctx.stage)
      await nextFrame()
      wire = buildWire(
        TESTIMONIALS.map(t => t.quote),
        { mobile: ctx.mobile, isFrameTarget: rt => ctx.post.isFrameTarget(rt) },
      )
      group.add(wire.core, wire.glow, wire.reflCore, wire.reflGlow)
      await nextFrame()
      pane = buildPane({ mobile: ctx.mobile, envMap: ctx.world.envMap, frost: 0.4 })
      group.add(pane.mesh)
      floor = buildFloor(floorColor)
      group.add(floor)
      // a first layout so the pane has geometry before prewarm
      measure()
      pane.resize(4, 5, PANE_DEPTH, 0.1)
      await nextFrame()
    },

    onEnter() {
      sinkAll()
      gate = -1
      deferShow = 1
      measure()
    },

    onLeave() {
      sinkAll()
    },

    update(local, frame, ctx) {
      const calm = frame.reducedMotion || !!frame.still
      place(frame)

      /* ---- the line ---- */
      const f = voiceAt(local)
      const a = Math.min(N - 1, Math.floor(f))
      const b = Math.min(N - 1, a + 1)
      const m = f - a
      const u = wire.u
      u.uRowA.value = a
      u.uRowB.value = b
      u.uMix.value = m
      // re-forming: the old voice drifts out to the left as the new one drifts in from the right
      u.uShiftA.value = m * DRIFT
      u.uShiftB.value = -(1 - m) * DRIFT
      // intro: flat, then it catches and starts to talk; out: the voice finishes
      const tk = clamp((local - TALK_A) / (TALK_B - TALK_A))
      const talk = 1 - (1 - tk) * (1 - tk)
      const done = easeInOut((local - OUT_A) / (OUT_B - OUT_A))
      // between two voices the line quiets for a breath
      const breath = 1 - 0.62 * Math.sin(Math.PI * m)
      u.uGain.value = talk * (1 - done) * breath
      let on = smoothstep(IGN_A, IGN_B, local)
      // one soft stutter as the gas catches (never in reduced motion)
      if (!calm) on *= 1 - 0.55 * bump((local - CATCH) / 0.0045)
      on *= 1 - 0.35 * done
      u.uOn.value = on
      u.uDark.value = 1
      // idle: a slow swell along the line while a voice holds
      u.uLive.value = calm ? 0 : talk * (1 - done) * (1 - Math.sin(Math.PI * m))
      u.uTime.value = frame.time
      // the playhead reads along the voice as you scroll through it (between re-forms)
      const beatU = (local - B0) / SPAN
      const ph = beatU - Math.floor(beatU)
      const hold = MORPH / SPAN
      const hp = clamp((ph - hold) / (1 - 2 * hold))
      u.uHead.value = -1.25 + 2.5 * hp
      u.uHeadK.value = local >= B0 && local < B1 ? smoothstep(0, 0.12, hp) * (1 - smoothstep(0.88, 1, hp)) * talk * (1 - done) : 0
      // round the colour wheel (cyan → blue → violet …), never through a grey mix
      tmpC.copy(voiceColor(a)).lerpHSL(voiceColor(b), m)
      u.uColor.value.copy(tmpC)
      floorColor.copy(tmpC)
      floor.material.uniforms.uK.value = 0.1 * on * (0.35 + 0.65 * talk * (1 - done))

      /* ---- world + post ---- */
      const w = ctx.world.params
      w.top = '#000000'
      w.bottom = '#000000'
      // a faint wash of the voice's own colour behind the pane's foot (never white)
      const cy = 1 - (2 * (lay.y1 - lay.band * 0.5)) / frame.height
      const cxN = ((lay.x0 + lay.x1) / frame.width) - 1
      w.focus.set(cxN * (frame.width / Math.max(1, frame.height)), cy)
      w.halo = 0.07 * on * talk
      w.haloSize = lay.portrait ? 0.8 : 1
      w.haloColor = `#${tmpC.getHexString()}`
      w.slits = 0
      w.env = 1
      w.envTurn = 1.1
      w.key = 0
      w.fill = 0.02
      const post = ctx.post.params
      post.vignette = 0.5
      post.bloomStrength = 0.55
      post.bloomRadius = 0.45
      post.bloomThreshold = 1.0
      post.grain = 0.02

      /* ---- DOM ---- */
      // the words: every frame, straight from local (writes only what changed)
      // (a fast pass — a pip landing, a fling — fades them out whole: stepGate)
      scrubWords(local, calm || document.documentElement.classList.contains('motion-off'), stepGate(frame))
      if (deferShow > 0) {
        deferShow--
        return
      }
      show(wantAt(local))
    },

    camera(_local: number, frame: Frame, out: CameraPose) {
      out.position.copy(cam.pos)
      out.target.copy(cam.target)
      out.fov = FOV
      out.roll = 0
      // a touch of depth under the pointer (the line behind the glass shifts against it)
      out.parallax = frame.reducedMotion || frame.still || frame.mobile ? 0 : 0.25
    },
  }
}
