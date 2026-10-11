import * as THREE from 'three'
import type { CameraPose, Chapter, ChapterContext, Frame } from '../../core/types'
import { el, reveal, rise, setRise } from '../../core/dom'
import { clamp, ease, lerp, segment, smoothstep } from '../../core/math'
import { nextFrame } from '../../core/yield'
import { CRM_SPOT, serviceUrl } from '../../content'
import { G } from '../../kit/glass'
import { CHART_DROP, CZ, LH, W, buildBoard, laneColor, laneX, slotY, tintNeon, type BoardSet } from './scene'
import './crm.css'

/*
 * PIPELINE — "A CRM that works the way you do."
 *
 * A CRM's pipeline board as a neon sign in clear glass tubes (the security
 * sign's language): four lanes, LEAD, QUOTE, JOB, PAID, each in its stage's
 * light, and the jobs as small glass cards, a contact dot and two lines each,
 * glowing in the light of the lane they sit in. A report chart under it.
 *
 *   0.00–0.26  CHAOS → ORDER  the cards start as a loose, unlit pile (the
 *                       customer list in a spreadsheet, the follow-ups in
 *                       someone's head); the lanes strike on one by one, and
 *                       the cards fly into them, lighting in each lane's colour
 *                       as they land. The eyebrow and line 1 from 0.06.
 *   0.28–0.40  HOLD     line 2 + the pitch over the organised board (the 0.33
 *                       landing)
 *   0.40–0.74  THE FLOW the four steps, each ticked off in the list as the
 *                       sign does it:
 *              01 LEADS     a new lead drops into LEAD and strikes on
 *              02 FOLLOW-UP QUOTE's top card sends its follow-up (a spark round
 *                           it, two rings of light), then rides a lit path on
 *                           to JOB; QUOTE closes up
 *              03 STAGES    the next quote rides a lit path down into JOB (a
 *                           stop there, in JOB's light) and up into PAID: one
 *                           soft flash
 *              04 REPORTS   the chart under the board: its baseline draws in,
 *                           the bars rise in the three lights
 *   0.74–0.95  STEADY   the board settled, everything lit, the CTA (anchor 0.84)
 *
 * Everything derives from `local`; frame.time only adds idle life (the pile's
 * drift, the cards' breath), never under reduced motion.
 */

const T = {
  in: 0.06,
  strike: 0.07,
  fly: 0.1,
  order: 0.26,
  second: 0.28,
  handoff: 0.4,
  follow0: 0.49,
  move0: 0.6,
  report0: 0.67,
  report1: 0.74,
  out: 0.95,
}
/** each step's stretch of the flow */
const STEPS: [number, number][] = [
  [T.handoff, T.follow0],
  [T.follow0, T.move0],
  [T.move0, T.report0],
  [T.report0, T.report1],
]

// ------------------------------------------------------------------ the cards' scripts

interface Pose {
  p: [number, number, number]
  r: [number, number, number]
}
/** a move to a lane's slot over [a, b] of local progress */
interface Leg {
  a: number
  b: number
  lane: number
  slot: number
  /** ride a lit route (scene routes[i]) instead of a straight slide */
  route?: number
  /** a stop on the way: [lane, slot] (the route passes through it), and where on the route it is */
  via?: [number, number]
  viaU?: number
}
interface Script {
  /** where it lies in the pile; null: the new lead, dropped in from above */
  from: Pose | null
  legs: Leg[]
}

const P = (x: number, y: number, z: number, rx: number, ry: number, rz: number): Pose => ({ p: [x, y, z], r: [rx, ry, rz] })
/** out of the pile, k-th of eight (staggered; the last lands by ~0.26) */
const fly = (k: number, lane: number, slot: number): Leg => ({ a: T.fly + k * 0.0165, b: T.fly + k * 0.0165 + 0.05, lane, slot })

const FOLLOW = { card: 2, send0: 0.494, send1: 0.556, rings: [0.503, 0.524] }
const PAID_AT = 0.655
const SCRIPTS: Script[] = [
  // LEAD
  { from: P(-0.95, 0.38, 0.12, 0.2, -0.3, 0.32), legs: [fly(0, 0, 0)] },
  { from: P(-0.38, -0.44, 0.3, -0.25, 0.2, -0.18), legs: [fly(3, 0, 1)] },
  // QUOTE: the top card sends its follow-up and goes on to JOB (02); the next rides all the way to PAID (03)
  { from: P(0.12, 0.5, -0.05, 0.15, 0.35, -0.42), legs: [fly(1, 1, 0), { a: 0.556, b: 0.598, lane: 2, slot: 2, route: 0 }] },
  {
    from: P(0.6, -0.12, 0.2, -0.3, -0.2, 0.55),
    legs: [fly(4, 1, 1), { a: 0.578, b: 0.6, lane: 1, slot: 0 }, { a: 0.604, b: PAID_AT, lane: 3, slot: 1, route: 1, via: [2, 3] }],
  },
  {
    from: P(-0.6, 0.04, -0.14, 0.3, 0.1, -0.62),
    legs: [fly(7, 1, 2), { a: 0.584, b: 0.606, lane: 1, slot: 1 }, { a: 0.642, b: 0.664, lane: 1, slot: 0 }],
  },
  // JOB
  { from: P(0.98, 0.4, 0.06, -0.1, -0.35, 0.14), legs: [fly(2, 2, 0)] },
  { from: P(0.28, -0.56, 0.44, 0.35, 0.15, 0.28), legs: [fly(6, 2, 1)] },
  // PAID
  { from: P(-1.08, -0.5, 0.0, -0.2, 0.3, -0.08), legs: [fly(5, 3, 0)] },
  // 01: the new lead
  { from: null, legs: [{ a: 0.412, b: 0.446, lane: 0, slot: 2 }] },
]
/** the routes' legs (draw the path as the move begins, let it go once the card lands) */
const ROUTE_LEGS: Leg[] = SCRIPTS.flatMap(s => s.legs.filter(g => g.route !== undefined)).sort((a, b) => a.route! - b.route!)

/** a route with a stop at u = m: where on it at p, and how far through its own hop (for the bank) */
const HOP = { a: 0.42, b: 0.58 }
function hop(p: number, m: number) {
  if (p < HOP.a) return { u: m * ease.inOutCubic(p / HOP.a), k: Math.sin((Math.PI * p) / HOP.a) }
  if (p < HOP.b) return { u: m, k: 0 }
  const q = (p - HOP.b) / (1 - HOP.b)
  return { u: m + (1 - m) * ease.inOutCubic(q), k: Math.sin(Math.PI * q) }
}
/** a lamp striking on: one stutter, then up (scroll-driven, so it holds) */
const strikeOn = (d: number) => (d <= 0 ? 0 : d < 0.004 ? 0.8 : d < 0.008 ? 0.2 : lerp(0.2, 1, smoothstep(0.008, 0.02, d)))
/** a landing's brief glow (fades over 0.03 of scroll) */
const bump = (d: number) => (d >= 0 && d < 0.03 ? (1 - d / 0.03) ** 2 : 0)
const window01 = (x: number, a: number, b: number, f: number) => smoothstep(a, a + f, x) * (1 - smoothstep(b - f, b, x))

interface CardState {
  pos: THREE.Vector3
  rot: THREE.Euler
  col: { color: THREE.Color; tone: THREE.Color; amt: number }
  /** 0 = unlit (a cold glimmer), 1 = lit in its lane's light */
  lit: number
  heat: number
  visible: boolean
}

// ------------------------------------------------------------------ camera

interface Layout {
  w: number
  h: number
  top: number
  bottom: number
  gutter: number
  /** copy A's / copy B's right edge (landscape) and top (portrait) */
  rightA: number
  rightB: number
  topA: number
  topB: number
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
  /** subject centre offset (world) */
  s: [number, number, number]
  /** the chart in frame (0..1) */
  c: number
}

const KEYS: Key[] = [
  // close on the pile, then back as the lanes strike on and the cards fly in
  { l: 0.0, yaw: -0.56, pitch: 0.12, fill: 1.1, s: [0, 0, 0.1], c: 0 },
  { l: T.strike, yaw: -0.52, pitch: 0.1, fill: 1.04, s: [0, 0, 0.05], c: 0 },
  { l: T.order, yaw: -0.42, pitch: 0.08, fill: 0.98, s: [0, 0, 0], c: 0 },
  { l: T.handoff, yaw: -0.4, pitch: 0.08, fill: 1.0, s: [0, 0, 0], c: 0 },
  // 01: toward LEAD, where the new lead drops in
  { l: 0.455, yaw: -0.36, pitch: 0.07, fill: 1.04, s: [-0.5, -0.05, 0], c: 0 },
  // 02: lean in on the follow-up (QUOTE's top card)
  { l: 0.53, yaw: -0.33, pitch: 0.07, fill: 1.1, s: [-0.42, 0.3, 0], c: 0 },
  // follow it over to JOB, then the next one through JOB to PAID (turning to face PAID:
  // leaning right would push LEAD into the copy)
  { l: 0.6, yaw: -0.33, pitch: 0.07, fill: 1.04, s: [0.04, 0.05, 0], c: 0 },
  { l: PAID_AT, yaw: -0.26, pitch: 0.07, fill: 1.02, s: [0.2, 0.0, 0], c: 0 },
  // 04: back to the whole board, the report under it
  { l: 0.71, yaw: -0.44, pitch: 0.08, fill: 0.96, s: [0, 0, 0], c: 1 },
  { l: 0.84, yaw: -0.4, pitch: 0.08, fill: 0.97, s: [0, 0, 0], c: 1 },
  { l: 1.0, yaw: -0.32, pitch: 0.07, fill: 0.97, s: [0, 0, 0], c: 1 },
]
const KEYS_TALL: Key[] = [
  { l: 0.0, yaw: -0.4, pitch: 0.1, fill: 1.08, s: [0, 0, 0.1], c: 0 },
  { l: T.strike, yaw: -0.36, pitch: 0.09, fill: 1.02, s: [0, 0, 0.05], c: 0 },
  { l: T.order, yaw: -0.3, pitch: 0.07, fill: 0.96, s: [0, 0, 0], c: 0 },
  { l: T.handoff, yaw: -0.28, pitch: 0.07, fill: 0.98, s: [0, 0, 0], c: 0 },
  { l: 0.455, yaw: -0.26, pitch: 0.06, fill: 1.04, s: [-0.4, -0.05, 0], c: 0 },
  { l: 0.53, yaw: -0.24, pitch: 0.06, fill: 1.2, s: [-0.45, 0.3, 0], c: 0 },
  { l: 0.6, yaw: -0.24, pitch: 0.06, fill: 1.12, s: [0.15, 0.05, 0], c: 0 },
  { l: PAID_AT, yaw: -0.2, pitch: 0.06, fill: 1.12, s: [0.55, 0.0, 0], c: 0 },
  { l: 0.71, yaw: -0.32, pitch: 0.07, fill: 0.97, s: [0, 0, 0], c: 1 },
  { l: 0.84, yaw: -0.28, pitch: 0.07, fill: 0.97, s: [0, 0, 0], c: 1 },
  { l: 1.0, yaw: -0.22, pitch: 0.06, fill: 0.97, s: [0, 0, 0], c: 1 },
]
/** the studio turn: strips glide along the glass tubes */
const TURN: [number, number][] = [
  [0.0, 0.35],
  [T.order, 0.0],
  [T.handoff, -0.1],
  [T.move0, 0.2],
  [T.report1, 0.9],
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

/** the space the copy leaves (copy A's while it shows, copy B's from the handoff) */
function regionFor(L: Layout, frame: Frame, kB: number, out: Region) {
  const w = L.ok ? L.w : frame.width
  const h = L.ok ? L.h : frame.height
  const tall = h > w * 1.05
  let x0 = L.gutter
  let x1 = w - L.gutter
  let y0 = L.top
  let y1 = h - L.bottom
  if (L.ok) {
    if (tall) y1 = Math.min(y1, lerp(L.topA, L.topB, kB) - 18)
    else x0 = Math.max(x0, lerp(L.rightA, L.rightB, kB) + 36)
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
  regionFor(L, frame, smoothstep(T.handoff - 0.03, T.handoff + 0.03, l), _r)
  const yaw = lerp(a.yaw, b.yaw, t)
  const pitch = lerp(a.pitch, b.pitch, t)
  const fill = lerp(a.fill, b.fill, t)
  const c = lerp(a.c, b.c, t)
  const sx = lerp(a.s[0], b.s[0], t)
  const sy = lerp(a.s[1], b.s[1], t) - (c * CHART_DROP) / 2
  const sz = lerp(a.s[2], b.s[2], t)
  const fov = tall ? 34 : 28
  const aspect = frame.width / Math.max(1, frame.height)
  const tanV = Math.tan(THREE.MathUtils.degToRad(fov / 2))
  const tanX = tanV * aspect
  // the board seen at an angle is narrower on screen: frame its projected width
  const sw = W * Math.cos(yaw) + (tall ? 0.22 : 0.5)
  const sh = LH + 0.26 + c * CHART_DROP
  const D = Math.max(sw / (2 * tanX * _r.fw * fill), sh / (2 * tanV * _r.fh * fill))
  _dir.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch))
  _fwd.copy(_dir).negate()
  _right.crossVectors(_fwd, _Y).normalize()
  _up.crossVectors(_right, _fwd)
  out.position
    .set(sx, sy, sz)
    .addScaledVector(_dir, D)
    .addScaledVector(_right, -_r.cx * D * tanX)
    .addScaledVector(_up, -_r.cy * D * tanV)
  out.target.copy(out.position).addScaledVector(_fwd, D)
  out.fov = fov
  out.roll = 0
  out.parallax = frame.reducedMotion || frame.still ? 0 : 0.16
  return _r
}

// ------------------------------------------------------------------ chapter

export default function create(): Chapter {
  const group = new THREE.Group()
  let board: BoardSet | null = null
  let curves: THREE.Curve<THREE.Vector3>[] = []

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

  const layout: Layout = { w: 1, h: 1, top: 90, bottom: 90, gutter: 32, rightA: 0, rightB: 0, topA: 0, topB: 0, ok: false }
  const scratch: CameraPose = { position: new THREE.Vector3(), target: new THREE.Vector3(), fov: 30, roll: 0, parallax: 0 }
  const COOL = new THREE.Color(G.ice)
  const st: CardState = {
    pos: new THREE.Vector3(),
    rot: new THREE.Euler(),
    col: { color: new THREE.Color(), tone: new THREE.Color(), amt: 0 },
    lit: 0,
    heat: 0,
    visible: true,
  }
  const _a = new THREE.Vector3()
  const _b = new THREE.Vector3()
  const landed = [0, 0, 0, 0]

  function measure(stage: HTMLElement) {
    const cs = getComputedStyle(probe)
    layout.w = stage.clientWidth || window.innerWidth
    layout.h = stage.clientHeight || window.innerHeight
    layout.top = parseFloat(cs.paddingTop) || 90
    layout.bottom = parseFloat(cs.paddingBottom) || 90
    layout.gutter = parseFloat(cs.paddingLeft) || 32
    layout.rightA = copyA.offsetLeft + copyA.offsetWidth
    layout.rightB = copyB.offsetLeft + copyB.offsetWidth
    layout.topA = copyA.offsetTop
    layout.topB = copyB.offsetTop
    layout.ok = layout.w > 0 && layout.h > 0 && copyA.offsetWidth > 0
  }

  /** where card i is at `l`, in what light, how lit */
  function cardAt(i: number, l: number, out: CardState) {
    const s = SCRIPTS[i]
    const first = s.legs[0]
    const pos = out.pos
    const rot = out.rot
    let lane = -1
    let lit = 0
    let heat = 0
    let moving = false
    if (s.from) {
      pos.set(...s.from.p)
      rot.set(...s.from.r)
    } else {
      // the new lead waits above the board, out of sight
      pos.set(laneX(first.lane), slotY(first.slot) + 2.6, CZ + 0.6)
      rot.set(0.35, 0, 0.3)
    }
    out.visible = !!s.from || l > first.a
    laneColor(-1, -1, 0, out.col)
    for (const g of s.legs) {
      if (l <= g.a) break
      _b.set(laneX(g.lane), slotY(g.slot), CZ)
      if (l >= g.b) {
        pos.copy(_b)
        rot.set(0, 0, 0)
        lane = g.lane
        heat = Math.max(heat, bump(l - g.b))
        continue
      }
      moving = true
      const p = (l - g.a) / (g.b - g.a)
      if (g.route !== undefined) {
        // along a lit route (with a stop on the way: it lands there, in that lane's light, then goes on)
        const m = g.viaU ?? 1
        const h = g.via ? hop(p, m) : { u: ease.inOutCubic(p), k: Math.sin(Math.PI * p) }
        const u = h.u
        curves[g.route].getPointAt(u, pos)
        rot.set(0, -0.22 * h.k, 0.08 * h.k)
        if (g.via) {
          if (u <= m) laneColor(lane, g.via[0], smoothstep(m * 0.55, m * 0.97, u), out.col)
          else laneColor(g.via[0], g.lane, smoothstep(m + (1 - m) * 0.45, m + (1 - m) * 0.9, u), out.col)
          // its landing in the stop's lane glows like any other
          if (p >= HOP.a) heat = Math.max(heat, bump((p - HOP.a) * (g.b - g.a)))
        } else laneColor(lane, g.lane, smoothstep(0.5, 0.88, u), out.col)
        lit = 1
        heat = Math.max(heat, 0.35 * h.k)
      } else if (lane < 0 && s.from) {
        // out of the pile: an arc toward the camera, straightening as it goes; it lights as it lands
        const e = ease.inOutCubic(p)
        _a.set(...s.from.p)
        pos.lerpVectors(_a, _b, e)
        pos.z += 0.4 * Math.sin(Math.PI * e)
        rot.set(lerp(s.from.r[0], 0, e), lerp(s.from.r[1], 0, e), lerp(s.from.r[2], 0, e))
        lit = smoothstep(0.78, 1, p)
        laneColor(-1, g.lane, lit, out.col)
      } else if (lane < 0) {
        // dropped in from above, settling into its slot (it strikes on once it lands)
        const e = ease.outCubic(p)
        pos.set(_b.x, _b.y + 2.6 * (1 - e), _b.z + 0.6 * (1 - e))
        rot.set(0.35 * (1 - e), 0, 0.3 * (1 - e))
      } else {
        // closing up in its lane
        const e = ease.inOutCubic(p)
        _a.copy(pos)
        pos.lerpVectors(_a, _b, e)
        pos.z += 0.08 * Math.sin(Math.PI * e)
        laneColor(lane, g.lane, 1, out.col)
        lit = 1
      }
      break
    }
    if (!moving) {
      laneColor(lane, lane, 0, out.col)
      // the new lead strikes on in place; the rest are simply lit once they've landed
      lit = lane < 0 ? 0 : s.from ? 1 : strikeOn(l - first.b)
    }
    out.lit = lit
    out.heat = heat
  }

  return {
    id: 'crm',
    group,
    anchors: [0.84],

    async init(ctx: ChapterContext) {
      const stage = ctx.stage

      // ---------------- DOM (the visual layer; the accessible copy is srContent)
      copyA = el('div', 'cr-a', undefined, stage)
      eyebrow = el('p', 'hud-eyebrow cr-eyebrow', CRM_SPOT.eyebrow, copyA)
      const h = el('h2', 'hud-title cr-title', undefined, copyA)
      line1 = rise(el('span', 'cr-line', undefined, h), CRM_SPOT.title[0])
      line2 = rise(el('span', 'cr-line', undefined, h), `<em>${CRM_SPOT.title[1]}</em>`)
      panel = el('div', 'hud-panel hud-panel--strong cr-panel', undefined, copyA)
      el('p', 'hud-body', CRM_SPOT.body, panel)

      // the flow: the steps (unnumbered), ticked off as the sign does them, and the way to the service
      copyB = el('div', 'cr-b', undefined, stage)
      el('p', 'hud-eyebrow', CRM_SPOT.flowEyebrow, copyB)
      flowTitle = rise(el('h2', 'hud-h2 cr-flow-title', undefined, copyB), CRM_SPOT.flowTitle)
      const ol = el('ol', 'hud-panel hud-panel--strong cr-steps', undefined, copyB)
      CRM_SPOT.steps.forEach(s => {
        const li = el('li', 'cr-step', undefined, ol)
        el('span', 'cr-step-t', s, li)
        el('span', 'cr-step-mark', undefined, li).setAttribute('aria-hidden', 'true')
        stepEls.push(li)
        stepState.push('')
        stepP.push(-1)
      })
      const cta = el('a', 'hud-btn cr-cta', CRM_SPOT.cta, copyB)
      cta.href = serviceUrl(CRM_SPOT.slug)

      probe = el('div', 'cr-probe', undefined, stage)
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
      board = buildBoard(rt => ctx.post.isFrameTarget(rt), ctx.mobile, ctx.world.envMap, SCRIPTS.length)
      curves = board.routes.map(r => r.tube.geometry.parameters.path)
      // where each route passes through its stop
      const q = new THREE.Vector3()
      for (const g of ROUTE_LEGS) {
        if (!g.via || g.route === undefined) continue
        const at = new THREE.Vector3(laneX(g.via[0]), slotY(g.via[1]), CZ)
        let best = Infinity
        for (let i = 0; i <= 400; i++) {
          const d = curves[g.route].getPointAt(i / 400, q).distanceTo(at)
          if (d < best) {
            best = d
            g.viaU = i / 400
          }
        }
      }
      group.add(board.root)
      await nextFrame()
    },

    update(l: number, frame: Frame, ctx: ChapterContext) {
      if (!board) return
      const b = board
      const calm = ctx.reducedMotion || !!frame.still
      const t = frame.time
      const wp = ctx.world.params
      const pp = ctx.post.params

      // ---------------- the lanes strike on, one by one, like pen strokes (their ticks after them);
      // a lane brightens a little as a card lands in it, PAID flashes once for the paid job
      const paidRp = segment(l, PAID_AT, PAID_AT + 0.035)
      const flash = paidRp > 0 && paidRp < 1 ? (1 - paidRp) ** 2 : 0
      landed.fill(0)
      for (const s of SCRIPTS)
        for (const g of s.legs) {
          landed[g.lane] = Math.max(landed[g.lane], bump(l - g.b))
          if (g.via) landed[g.via[0]] = Math.max(landed[g.via[0]], bump(l - g.a - HOP.a * (g.b - g.a)))
        }
      b.lanes.forEach((lane, i) => {
        const a = T.strike + i * 0.018
        const d = ease.inOutCubic(segment(l, a, a + 0.035))
        const boost = (1 + 0.35 * landed[i]) * (i === b.lanes.length - 1 ? 1 + flash : 1)
        lane.frame.draw.value = d
        lane.frame.on.value = (d > 0 ? 1 : 0) * boost
        lane.frame.root.visible = d > 0
        lane.tick.on.value = strikeOn(l - a - 0.035) * boost
        lane.tick.root.visible = lane.tick.on.value > 0.001
        lane.walls.uniforms.uK.value = lerp(0.05, 0.4, d) * boost
      })

      // ---------------- the cards
      for (let i = 0; i < b.cards.length; i++) {
        const c = b.cards[i]
        cardAt(i, l, st)
        c.root.visible = st.visible
        if (!st.visible) continue
        c.root.position.copy(st.pos)
        c.root.rotation.copy(st.rot)
        // idle life: the pile drifts a little (gone as each card leaves it)
        if (!calm && SCRIPTS[i].from) {
          const k = 0.012 * (1 - smoothstep(SCRIPTS[i].legs[0].a - 0.03, SCRIPTS[i].legs[0].a, l))
          c.root.position.y += k * Math.sin(t * 0.8 + i * 1.7)
          c.root.rotation.z += k * 1.6 * Math.sin(t * 0.6 + i * 2.3)
        }
        let heat = st.heat
        // 02: the follow-up goes out: the card brightens, a spark runs round it twice
        let spark = 0
        if (i === FOLLOW.card) {
          const send = window01(l, FOLLOW.send0, FOLLOW.send1, 0.008)
          heat = Math.max(heat, 0.35 * send)
          spark = 1.8 * send
          c.tubes[0].pulse.value.set((segment(l, FOLLOW.send0 + 0.003, FOLLOW.rings[1] + 0.012) * 2) % 1, spark)
        }
        // the paid flash
        if (i === 3) heat = Math.max(heat, 0.8 * flash)
        const breath = calm ? 1 : 1 - 0.05 * (0.5 + 0.5 * Math.sin(t * 1.1 + i * 1.9))
        const on = lerp(0.1, 1, st.lit) * (1 + 0.9 * heat) * breath
        for (const tube of c.tubes) {
          tintNeon(tube, st.col.color, st.col.tone, st.col.amt)
          tube.on.value = on
        }
        const wu = c.walls.uniforms
        ;(wu.uColor.value as THREE.Color).copy(st.col.color)
        wu.uK.value = lerp(0.12, 0.42, st.lit) * (1 + heat)
      }

      // ---------------- white light: the follow-up's two rings, the paid flash's ring
      const ringAt = (k: number, p: number, x: number, y: number, grow: number, k2: number) => {
        const r = b.rings[k]
        r.root.position.set(x, y, CZ + 0.01)
        r.root.scale.setScalar(lerp(1, grow, ease.outCubic(p)))
        r.tube.on.value = p > 0 && p < 1 ? (1 - p) ** 2 * k2 : 0
        r.root.visible = r.tube.on.value > 0.001
      }
      FOLLOW.rings.forEach((s, k) => ringAt(k, segment(l, s, s + 0.034), laneX(1), slotY(0), 1.7, 1.7))
      ringAt(2, paidRp, laneX(3), slotY(1), 1.5, 2)

      // ---------------- the routes: lit as the move begins, let go once the card has landed
      b.routes.forEach((r, k) => {
        const g = ROUTE_LEGS[k]
        r.draw.value = ease.outCubic(segment(l, g.a - 0.006, g.a + 0.012))
        r.on.value = 1.2 * smoothstep(g.a - 0.006, g.a - 0.002, l) * (1 - smoothstep(g.b, g.b + 0.018, l))
        r.root.visible = r.on.value > 0.001
      })

      // ---------------- 04: the report: the baseline draws in, the bars rise
      b.chart.visible = l > T.report0 - 0.004
      if (b.chart.visible) {
        const d = ease.outCubic(segment(l, T.report0, T.report0 + 0.02))
        b.base.tube.draw.value = d
        b.base.walls.uniforms.uK.value = 0.4 * d
        const n = b.bars.length
        b.bars.forEach((bar, j) => {
          const a = T.report0 + 0.006 + (j * 0.039) / Math.max(1, n - 1)
          const p = segment(l, a, a + 0.025)
          bar.root.visible = p > 0
          bar.root.scale.y = Math.max(1e-3, ease.outCubic(p))
          bar.tube.on.value = 1 + 0.8 * bump(l - a - 0.025)
          bar.walls.uniforms.uK.value = 0.42
        })
      }
      b.glass.envMapIntensity = 1.0

      // ---------------- the room: a cool halo behind the board (a touch warmer on the paid flash)
      const reg = solvePose(l, frame, layout, scratch)
      const aspect = frame.width / Math.max(1, frame.height)
      const order = smoothstep(T.fly, T.order, l)
      wp.top = '#020203'
      wp.bottom = '#000000'
      wp.focus.set(reg.cx * aspect, reg.cy)
      wp.haloSize = clamp(reg.fh * 1.55, 0.8, 1.7)
      wp.halo = lerp(0.42, 0.55, order) + 0.3 * flash
      wp.haloColor = COOL
      wp.slits = 0
      wp.slitAngle = 0
      wp.envTurn = envTurn(l)
      wp.env = 1
      wp.keyDir.set(-0.5, 0.8, 0.55)
      wp.key = 1.2
      wp.fill = 0.04

      // ---------------- post: the neon blooms; PAID's one soft flash (post keeps the flash budget)
      pp.vignette = 0.55
      pp.bloomStrength = 0.22
      pp.bloomRadius = 0.25
      pp.bloomThreshold = 1.6
      pp.glitch = 0
      pp.flash = calm ? 0 : 0.06 * flash

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
        const [a, bEnd] = STEPS[i]
        const s = l >= bEnd ? 'is-done' : l >= a ? 'is-on' : ''
        if (s !== stepState[i]) {
          stepEls[i].classList.remove('is-on', 'is-done')
          if (s) stepEls[i].classList.add(s)
          stepState[i] = s
        }
        // (written only when it changes: no per-frame style writes once it's done)
        const p = Math.round(segment(l, a, bEnd) * 200) / 200
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
