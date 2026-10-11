import * as THREE from 'three'
import type { CameraPose, Chapter, ChapterContext, Frame } from '../../core/types'
import { el, reveal, rise, setRise } from '../../core/dom'
import { clamp, ease, lerp, segment, smoothstep } from '../../core/math'
import { nextFrame } from '../../core/yield'
import { KNOWLEDGE_SPOT, serviceUrl } from '../../content'
import { G } from '../../kit/glass'
import { buildKnowledge, type KnowledgeSet } from './scene'
import './knowledge.css'

/*
 * CONSTELLATION: "Ask your whole company anything."
 *
 * A neon sign in clear glass tubes (the security chapter's language): a
 * search bar and an answer card, and round them, at different depths, the
 * company's knowledge as small signs of their own (files, chats, tasks), each
 * on a thin glass thread to the card.
 *
 *   0.00–0.26  SCATTERED  the sources drift in the dark as unlit glass (the
 *                         knowledge buried everywhere), a glimmer here and
 *                         there; the bar and card only faint. Copy A from 0.06;
 *                         the bar strikes on (0.235).
 *   0.28–0.40  HOLD       line 2 + the pitch over the constellation (the 0.33
 *                         landing: the bar lit, everything else waiting).
 *   0.40–0.74  THE ANSWER the four steps, each acted out while it's on:
 *              01 ASK      a caret in the bar; dashes of white light type in,
 *                          left to right (light, not words)
 *              02 SEARCH   a ring of light pulses out from the bar through the
 *                          constellation: every source glints as it passes, the
 *                          cited ones strike on in their colours and stay lit
 *              03 ANSWER   beads of light run down their threads into the card;
 *                          the card lights and its lines write in, one by one
 *              04 CITE     the citation dots light, each in its source's colour,
 *                          and a link runs from each dot back down its thread
 *                          to its source, and holds
 *   0.74–0.95  STEADY     the answer settled and cited, the CTA (anchor 0.84)
 *
 * Everything derives from `local`; frame.time only adds idle life (the
 * sources' sway, the caret's soft blink), none of it under reduced motion.
 */

const T = {
  in: 0.06,
  strike: 0.235,
  second: 0.28,
  handoff: 0.4,
  caret: 0.402,
  type0: 0.412,
  type1: 0.476,
  search0: 0.49,
  scan0: 0.495,
  scan1: 0.595,
  answer0: 0.6,
  lines0: 0.62,
  cite0: 0.67,
  link0: 0.676,
  cite1: 0.74,
  out: 0.95,
}
/** each step's stretch of the answer */
const STEPS: [number, number][] = [
  [T.handoff, T.search0],
  [T.search0, T.answer0],
  [T.answer0, T.cite0],
  [T.cite0, T.cite1],
]
/** the scan's reach (world, from the bar's centre) */
const R_MAX = 3.2

const COOL = new THREE.Color(G.ice)

// ------------------------------------------------------------------ camera

interface Layout {
  w: number
  h: number
  top: number
  bottom: number
  gutter: number
  copyRight: number
  copyTop: number
  ok: boolean
}
interface Region {
  cx: number
  cy: number
  fw: number
  fh: number
}
interface Key {
  l: number
  yaw: number
  pitch: number
  fill: number
  /** what's framed: its centre (world) and size [w, h] */
  s: [number, number, number]
  box: [number, number]
}

/*
 * Across the view the constellation spans about ±2 (its far right reaches
 * past that, off the edge), y -1.7..1.6. Framed boxes sit left of its centre:
 * the left sources stay clear of the copy, the right ones may run off the
 * edge of the screen (the knowledge goes on past it).
 */
const HOLD: [number, number] = [3.5, 2.85]
const KEYS: Key[] = [
  // in among the sources, drifting out through them (clear of the copy by the time it's in)
  { l: 0.0, yaw: -0.68, pitch: 0.11, fill: 1.35, s: [-0.2, 0.1, 0.35], box: HOLD },
  { l: 0.13, yaw: -0.54, pitch: 0.085, fill: 1.06, s: [-0.36, -0.02, 0.1], box: HOLD },
  { l: 0.24, yaw: -0.46, pitch: 0.075, fill: 1.0, s: [-0.3, -0.05, 0], box: HOLD },
  { l: T.handoff, yaw: -0.4, pitch: 0.065, fill: 1.0, s: [-0.3, -0.05, 0], box: HOLD },
  // toward the bar while it types
  { l: 0.48, yaw: -0.36, pitch: 0.06, fill: 1.0, s: [-0.4, 0.1, 0], box: [3.3, 2.6] },
  // back out for the scan through the whole constellation
  { l: 0.575, yaw: -0.46, pitch: 0.07, fill: 1.0, s: [-0.15, -0.05, 0], box: [4.1, 3.3] },
  // lean in on the card for the answer
  { l: 0.68, yaw: -0.34, pitch: 0.05, fill: 1.0, s: [-0.42, -0.4, 0], box: [3.2, 2.5] },
  // the answer, cited: its sources back in the frame
  { l: 0.82, yaw: -0.4, pitch: 0.06, fill: 1.0, s: [-0.25, -0.12, 0], box: [3.7, 2.95] },
  { l: 1.0, yaw: -0.32, pitch: 0.05, fill: 1.0, s: [-0.25, -0.12, 0], box: [3.7, 2.95] },
]
const TALL: [number, number] = [3.9, 3.3]
const KEYS_TALL: Key[] = [
  { l: 0.0, yaw: -0.5, pitch: 0.1, fill: 1.3, s: [0.2, 0.05, 0.3], box: TALL },
  { l: 0.13, yaw: -0.38, pitch: 0.08, fill: 1.06, s: [0.05, -0.02, 0.1], box: TALL },
  { l: 0.24, yaw: -0.32, pitch: 0.07, fill: 1.0, s: [0, -0.05, 0], box: TALL },
  { l: T.handoff, yaw: -0.28, pitch: 0.06, fill: 1.0, s: [0, -0.05, 0], box: TALL },
  { l: 0.48, yaw: -0.24, pitch: 0.05, fill: 1.0, s: [0, 0.05, 0], box: [3.4, 2.9] },
  { l: 0.575, yaw: -0.32, pitch: 0.06, fill: 1.0, s: [0, -0.05, 0], box: [4.1, 3.4] },
  { l: 0.68, yaw: -0.22, pitch: 0.05, fill: 1.0, s: [0, -0.35, 0], box: [3.7, 2.9] },
  { l: 0.82, yaw: -0.26, pitch: 0.05, fill: 1.0, s: [0, -0.1, 0], box: TALL },
  { l: 1.0, yaw: -0.2, pitch: 0.05, fill: 1.0, s: [0, -0.1, 0], box: TALL },
]
/** the studio turn: strips glide along the glass tubes */
const TURN: [number, number][] = [
  [0.0, 0.4],
  [0.24, 0.05],
  [0.4, -0.12],
  [T.scan1, 0.25],
  [T.cite1, 0.9],
  [1.0, 0.75],
]
function envTurn(l: number) {
  for (let i = 0; i < TURN.length - 1; i++) {
    const [a, va] = TURN[i]
    const [b, vb] = TURN[i + 1]
    if (l <= b) return lerp(va, vb, ease.inOutCubic(segment(l, a, b)))
  }
  return TURN[TURN.length - 1][1]
}

const isTall = (frame: Frame) => frame.height > frame.width * 1.05

function regionFor(L: Layout, frame: Frame, out: Region) {
  const w = L.ok ? L.w : frame.width
  const h = L.ok ? L.h : frame.height
  const tall = h > w * 1.05
  let x0 = L.gutter
  let x1 = w - L.gutter
  let y0 = L.top
  let y1 = h - L.bottom
  if (L.ok) {
    if (tall) y1 = Math.min(y1, L.copyTop - 18)
    else x0 = Math.max(x0, L.copyRight + 36)
  } else if (tall) y1 = h * 0.52
  else x0 = w * 0.42
  if (y1 - y0 < h * 0.22) y1 = y0 + h * 0.22
  if (x1 - x0 < w * 0.3) x0 = x1 - w * 0.3
  // the chrome sits in the top band: nudge the subject a touch lower on wide screens
  if (!tall) y0 += Math.min(20, h * 0.02)
  out.cx = (x0 + x1) / w - 1
  out.cy = 1 - (y0 + y1) / h
  out.fw = (x1 - x0) / w
  out.fh = (y1 - y0) / h
}

const _r: Region = { cx: 0, cy: 0, fw: 1, fh: 1 }
const _dir = new THREE.Vector3()
const _fwd = new THREE.Vector3()
const _right = new THREE.Vector3()
const _up = new THREE.Vector3()
const _Y = new THREE.Vector3(0, 1, 0)

function solvePose(l: number, frame: Frame, L: Layout, out: CameraPose): Region {
  const tall = isTall(frame)
  const keys = tall ? KEYS_TALL : KEYS
  let k = 0
  while (k < keys.length - 2 && l > keys[k + 1].l) k++
  const a = keys[k]
  const b = keys[k + 1]
  const t = ease.inOutCubic(segment(l, a.l, b.l))
  regionFor(L, frame, _r)
  const yaw = lerp(a.yaw, b.yaw, t)
  const pitch = lerp(a.pitch, b.pitch, t)
  const fill = lerp(a.fill, b.fill, t)
  const fov = tall ? 34 : 28
  const aspect = frame.width / Math.max(1, frame.height)
  const tanV = Math.tan(THREE.MathUtils.degToRad(fov / 2))
  const tanX = tanV * aspect
  // the set seen at an angle is narrower on screen: frame its projected width
  const sw = lerp(a.box[0], b.box[0], t) * Math.cos(yaw) + 0.2
  const sh = lerp(a.box[1], b.box[1], t) + 0.1
  const D = Math.max(sw / (2 * tanX * _r.fw * fill), sh / (2 * tanV * _r.fh * fill))
  _dir.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch))
  _fwd.copy(_dir).negate()
  _right.crossVectors(_fwd, _Y).normalize()
  _up.crossVectors(_right, _fwd)
  out.position
    .set(lerp(a.s[0], b.s[0], t), lerp(a.s[1], b.s[1], t), lerp(a.s[2], b.s[2], t))
    .addScaledVector(_dir, D)
    .addScaledVector(_right, -_r.cx * D * tanX)
    .addScaledVector(_up, -_r.cy * D * tanV)
  out.target.copy(out.position).addScaledVector(_fwd, D)
  out.fov = fov
  out.roll = 0
  out.parallax = frame.reducedMotion || frame.still ? 0 : 0.2
  return _r
}

/** a tube striking on at `at` (scroll): a single stutter, then on */
function strike(l: number, at: number) {
  const d = l - at
  return d <= 0 ? 0 : d < 0.004 ? 0.8 : d < 0.009 ? 0.2 : smoothstep(0.009, 0.02, d)
}
/** a soft bump of light centred on `at` (scroll) */
const bump = (l: number, at: number, w: number) => Math.exp(-(((l - at) / w) ** 2))

// ------------------------------------------------------------------ chapter

export default function create(): Chapter {
  const group = new THREE.Group()
  let set: KnowledgeSet | null = null

  // DOM
  let copyA: HTMLElement
  let eyebrow: HTMLElement
  let line1: HTMLElement
  let line2: HTMLElement
  let panel: HTMLElement
  let copyB: HTMLElement
  let flowTitle: HTMLElement
  const stepEls: HTMLElement[] = []
  const stepState: string[] = []
  const stepP: number[] = []
  let probe: HTMLElement

  const layout: Layout = { w: 1, h: 1, top: 90, bottom: 90, gutter: 32, copyRight: 0, copyTop: 0, ok: false }
  const scratch: CameraPose = { position: new THREE.Vector3(), target: new THREE.Vector3(), fov: 30, roll: 0, parallax: 0 }

  function measure(stage: HTMLElement) {
    const cs = getComputedStyle(probe)
    layout.w = stage.clientWidth || window.innerWidth
    layout.h = stage.clientHeight || window.innerHeight
    layout.top = parseFloat(cs.paddingTop) || 90
    layout.bottom = parseFloat(cs.paddingBottom) || 90
    layout.gutter = parseFloat(cs.paddingLeft) || 32
    layout.copyRight = Math.max(copyA.offsetLeft + copyA.offsetWidth, copyB.offsetLeft + copyB.offsetWidth)
    layout.copyTop = Math.min(copyA.offsetTop, copyB.offsetTop)
    layout.ok = layout.w > 0 && layout.h > 0 && copyA.offsetWidth > 0
  }

  return {
    id: 'knowledge',
    group,
    anchors: [0.84],

    async init(ctx: ChapterContext) {
      const stage = ctx.stage

      // ---------------- DOM (the visual layer; the accessible copy is srContent)
      copyA = el('div', 'kn-a', undefined, stage)
      eyebrow = el('p', 'hud-eyebrow kn-eyebrow', KNOWLEDGE_SPOT.eyebrow, copyA)
      const h = el('h2', 'hud-title kn-title', undefined, copyA)
      line1 = rise(el('span', 'kn-line', undefined, h), KNOWLEDGE_SPOT.title[0])
      line2 = rise(el('span', 'kn-line', undefined, h), `<em>${KNOWLEDGE_SPOT.title[1]}</em>`)
      panel = el('div', 'hud-panel hud-panel--strong kn-panel', undefined, copyA)
      el('p', 'hud-body', KNOWLEDGE_SPOT.body, panel)

      // how it answers: the steps (unnumbered), ticked off as the sign does them, and the CTA
      copyB = el('div', 'kn-b', undefined, stage)
      el('p', 'hud-eyebrow', KNOWLEDGE_SPOT.flowEyebrow, copyB)
      flowTitle = rise(el('h2', 'hud-h2 kn-flow-title', undefined, copyB), KNOWLEDGE_SPOT.flowTitle)
      const ol = el('ol', 'hud-panel hud-panel--strong kn-steps', undefined, copyB)
      KNOWLEDGE_SPOT.steps.forEach(s => {
        const li = el('li', 'kn-step', undefined, ol)
        el('span', 'kn-step-t', s, li)
        el('span', 'kn-step-mark', undefined, li).setAttribute('aria-hidden', 'true')
        stepEls.push(li)
        stepState.push('')
        stepP.push(-1)
      })
      const cta = el('a', 'hud-btn kn-cta', KNOWLEDGE_SPOT.cta, copyB)
      cta.href = serviceUrl(KNOWLEDGE_SPOT.slug)

      probe = el('div', 'kn-probe', undefined, stage)
      reveal(copyA, 0)
      reveal(copyB, 0)
      reveal(panel, 0, 0)
      measure(stage)
      if (typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(() => measure(stage))
        ro.observe(stage)
        ro.observe(copyA)
        ro.observe(copyB)
      } else window.addEventListener('resize', () => measure(stage))

      // ---------------- the sign
      set = buildKnowledge(rt => ctx.post.isFrameTarget(rt), ctx.mobile, ctx.world.envMap)
      group.add(set.root)
      await nextFrame()
    },

    update(l: number, frame: Frame, ctx: ChapterContext) {
      if (!set) return
      const s = set
      const calm = ctx.reducedMotion || !!frame.still
      const t = calm ? 0 : frame.time
      const wp = ctx.world.params
      const pp = ctx.post.params

      // ---------------- the bar: faint, then struck on; the card faint until the answer
      const barOn = lerp(0.05, 1, strike(l, T.strike))
      s.bar.on.value = barOn
      const lensOn = lerp(0.05, 1, strike(l, T.strike + 0.007))
      for (const tb of s.lens) tb.on.value = lensOn
      s.walls.bar.uniforms.uK.value = 0.04 + 0.38 * barOn
      s.walls.lens.uniforms.uK.value = 0.04 + 0.38 * lensOn
      const answered = smoothstep(T.answer0, T.answer0 + 0.02, l)
      const cardOn = lerp(0.05, 0.22, strike(l, T.strike + 0.014)) + 0.78 * answered
      s.card.on.value = cardOn
      s.walls.card.uniforms.uK.value = 0.04 + 0.38 * cardOn

      // ---------------- 01 ASK: the caret, then the typing (light, not words), left to right
      const typedP = segment(l, T.type0, T.type1)
      const head = lerp(s.typeX0, s.typeX1, typedP)
      const typing = typedP > 0 && typedP < 1
      // the question goes in on 02: the typing flares once, then settles
      const sent = smoothstep(T.search0, T.search0 + 0.004, l)
      const typedOn = 1 + 1.2 * bump(l, T.search0 + 0.004, 0.006) - 0.3 * sent
      for (const w of s.typed) {
        const d = clamp((head - w.x0) / w.len)
        w.tube.draw.value = d
        w.tube.on.value = d > 0 ? typedOn : 0
        w.tube.root.visible = d > 0
      }
      // a soft blink (never off) while it waits; steady while it types, and under reduced motion
      const blink = typing || calm ? 1 : 0.6 + 0.4 * Math.cos(t * Math.PI * 2 * 0.9)
      const caretOn = smoothstep(T.caret, T.caret + 0.006, l) * (1 - smoothstep(T.search0 + 0.006, T.search0 + 0.02, l))
      s.caret.on.value = caretOn * blink
      s.caret.root.visible = caretOn > 0.001
      s.caretRoot.position.x = head + (typedP > 0 ? 0.035 : 0)

      // ---------------- 02 SEARCH: the scan pulses out from the bar, and its echo
      const sp = segment(l, T.scan0, T.scan1)
      const R = lerp(0.2, R_MAX, ease.outQuad(sp))
      const ringK = sp > 0 && sp < 1 ? smoothstep(0, 0.06, sp) * (1 - sp) ** 1.6 : 0
      s.scans[0].u.uR.value = R
      s.scans[0].u.uK.value = ringK
      s.scans[0].mesh.visible = ringK > 0.002
      const ep = segment(l, T.scan0 + 0.018, T.scan1 + 0.004)
      const R2 = lerp(0.2, R_MAX, ease.outQuad(ep))
      const echoK = ep > 0 && ep < 1 ? 0.45 * smoothstep(0, 0.06, ep) * (1 - ep) ** 1.6 : 0
      s.scans[1].u.uR.value = R2
      s.scans[1].u.uK.value = echoK
      s.scans[1].mesh.visible = echoK > 0.002

      // ---------------- the sources: turned and drifting while they're buried, settling for
      // the search; a glimmer here and there; the scan lights the cited ones
      const settle = ease.inOutCubic(segment(l, 0.03, 0.36))
      const loose = 1 - settle
      for (const src of s.sources) {
        const k = src.seed * 6.283
        const sway = calm ? 0 : 0.035
        src.pivot.rotation.set(
          src.rest[0] + loose * 0.32 * Math.sin(k * 1.7 + l * 5.0) + sway * Math.sin(t * 0.37 + k),
          src.rest[1] + loose * 0.7 * Math.sin(k + l * 6.0) + sway * Math.sin(t * 0.29 + k * 1.3),
          src.rest[2] + loose * 0.3 * Math.sin(k * 2.3 + l * 4.0) + sway * 0.6 * Math.sin(t * 0.33 + k * 0.7),
        )
        // buried: a ghost of its colour, and a glimmer as the camera drifts past
        let on = 0.03 + 0.3 * bump(l, src.glint, 0.014) * (1 - smoothstep(0.22, 0.26, l))
        // the scan passes it: every source glints
        const hit = ringK > 0 ? Math.exp(-(((R - src.dist) / 0.22) ** 2)) * Math.min(1, ringK * 2.2) : 0
        on = Math.max(on, 0.5 * hit)
        let found = 0
        if (src.cite >= 0) {
          // the cited ones strike on as it reaches them (a single stutter), and stay lit
          found = sp > 0 ? smoothstep(src.dist - 0.04, src.dist + 0.3, R) : 0
          const stutter = found > 0.3 && found < 0.5 ? 0.35 : 1
          // their link reaching them in 04: a brief swell
          const back = bump(l, T.link0 + src.cite * 0.011 + 0.03, 0.008)
          on = Math.max(on, found * stutter * (1 + 0.5 * back))
        }
        for (const tb of src.tubes) tb.on.value = on
        src.walls.uniforms.uK.value = 0.035 + 0.38 * Math.min(1.2, on)

        // its thread: dark glass; a cited one lit faintly once it's found, beads in 03,
        // the link from its dot in 04
        const th = src.thread
        if (src.cite < 0) {
          th.on.value = 0.25 * hit
          th.draw.value = 1
          th.pulse.value.set(0, 0)
          // (dark: not drawn at all)
          th.root.visible = th.on.value > 0.001
        } else {
          const c = src.cite
          const linkAt = T.link0 + c * 0.011
          if (l < linkAt) {
            th.draw.value = 1
            th.on.value = 0.14 * found * (1 - smoothstep(T.cite0 - 0.008, T.cite0 + 0.002, l))
            // two beads, source to card (u runs card → source)
            const b0 = T.answer0 + c * 0.004
            const r0 = segment(l, b0, b0 + 0.022)
            const r1 = segment(l, b0 + 0.024, b0 + 0.046)
            const p = ease.inQuad(r1 > 0 ? r1 : r0)
            const live = p > 0 && p < 1 ? smoothstep(0, 0.08, p) * (1 - smoothstep(0.92, 1, p)) : 0
            th.pulse.value.set(1 - p, 12 * live)
            const bd = s.beads[c]
            bd.mesh.visible = live > 0.001
            if (live > 0.001) {
              bd.curve.getPointAt(1 - p, bd.mesh.position)
              bd.u.uK.value = live
            }
          } else {
            th.draw.value = ease.inOutQuad(segment(l, linkAt, linkAt + 0.03))
            th.on.value = 0.36
            th.pulse.value.set(0, 0)
            s.beads[c].mesh.visible = false
          }
        }
      }
      s.walls.threads.uniforms.uK.value = 0.1

      // ---------------- 03 ANSWER: the beads land, the lines write in one by one
      s.lines.forEach((ln, i) => {
        const a = T.lines0 + i * 0.0105
        const d = segment(l, a, a + 0.016)
        ln.draw.value = d
        ln.on.value = d > 0 ? 1 : 0
        ln.root.visible = d > 0
      })
      s.walls.lines.uniforms.uK.value = 0.04 + 0.26 * answered

      // ---------------- 04 CITE: the dots light in their sources' colours (a glint as each bead lands)
      s.dots.forEach((dt, i) => {
        const land = T.answer0 + i * 0.004 + 0.022
        const lit = smoothstep(T.cite0 + 0.002 + i * 0.011, T.cite0 + 0.01 + i * 0.011, l)
        const on = Math.max(lit, 0.3 * bump(l, land, 0.005) + 0.3 * bump(l, land + 0.024, 0.005))
        dt.on.value = on
        s.walls.dots[i].uniforms.uK.value = 0.04 + 0.38 * on
      })

      // ---------------- the room: a halo behind the set, warming up as the answer comes
      const reg = solvePose(l, frame, layout, scratch)
      const aspect = frame.width / Math.max(1, frame.height)
      wp.top = '#020203'
      wp.bottom = '#000000'
      wp.focus.set(reg.cx * aspect, reg.cy)
      wp.haloSize = clamp(reg.fh * 1.55, 0.8, 1.7)
      wp.halo = 0.42 + 0.12 * strike(l, T.strike) + 0.22 * ringK + 0.2 * answered
      wp.haloColor = COOL
      wp.slits = 0
      wp.slitAngle = 0
      wp.envTurn = envTurn(l)
      wp.env = 1
      wp.keyDir.set(-0.5, 0.8, 0.55)
      wp.key = 1.2
      wp.fill = 0.04

      // ---------------- post: the neon blooms (no glitch, no flash)
      pp.vignette = 0.55
      pp.bloomStrength = 0.22
      pp.bloomRadius = 0.25
      pp.bloomThreshold = 1.6
      pp.glitch = 0

      // ---------------- DOM
      const inA = smoothstep(T.in - 0.005, T.in + 0.015, l) * (1 - smoothstep(T.handoff - 0.02, T.handoff, l))
      reveal(copyA, inA)
      setRise(line1, l > T.in && l < T.handoff)
      setRise(line2, l > T.second && l < T.handoff)
      reveal(panel, smoothstep(T.second, T.second + 0.03, l), 0)
      reveal(eyebrow, 1, 0)
      const inB = smoothstep(T.handoff - 0.004, T.handoff + 0.016, l) * (1 - smoothstep(T.out, T.out + 0.02, l))
      reveal(copyB, inB)
      setRise(flowTitle, l > T.handoff && l < T.out + 0.01)
      for (let i = 0; i < stepEls.length; i++) {
        const [a, b] = STEPS[i]
        const st = l >= b ? 'is-done' : l >= a ? 'is-on' : ''
        if (st !== stepState[i]) {
          stepEls[i].classList.remove('is-on', 'is-done')
          if (st) stepEls[i].classList.add(st)
          stepState[i] = st
        }
        // (written only when it changes: no per-frame style writes once it's done)
        const p = Math.round(segment(l, a, b) * 200) / 200
        if (p !== stepP[i]) {
          stepP[i] = p
          stepEls[i].style.setProperty('--p', String(p))
        }
      }
    },

    camera(l: number, frame: Frame, out: CameraPose) {
      solvePose(l, frame, layout, out)
    },
  }
}
