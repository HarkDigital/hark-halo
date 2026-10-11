import * as THREE from 'three'
import { G, closedOutline, neonPath, type NeonPath } from '../../kit/glass'
import { glassSleeve, sleeveGlass, sleeveWalls } from '../../kit/tube'
import { ACTIVE } from '../../kit/palette'

/*
 * PIPELINE — the Custom CRM chapter's set: a CRM PIPELINE BOARD as a NEON
 * SIGN in clear glass tubes (the security sign's language: the same tube
 * radii, glass sleeves, the three lights). World units, the board W x LH,
 * centred, facing +z; the report chart hangs below it.
 *
 *   lanes   four rounded frames, LEAD, QUOTE, JOB, PAID (no words: each has a
 *           short header tick, PAID's is a check), each in its stage's light
 *           (the service page's pipeline: b, c, a, and a paler a for paid)
 *   cards   the jobs: a small rounded card with a contact dot and two lines,
 *           each its own group (it flies, slides and changes colour), its own
 *           glass sleeve and walls
 *   chart   the report: a baseline and seven bars in the three lights, each
 *           bar its own group (it rises: scaled up from the baseline)
 *   rings   white rings of light (the follow-up going out, the paid flash)
 *   routes  the lit paths a card rides from stage to stage (white light,
 *           in front of the board); index.ts moves the card along the same curve
 */

export const LANES = 4
/** a lane's width, the gap between lanes, a lane's height */
export const LW = 0.92
export const LG = 0.08
export const LH = 2.2
/** the board's width */
export const W = LANES * LW + (LANES - 1) * LG
/** a card */
export const CW = 0.7
export const CH = 0.38
const CR = 0.085
/** the lane's header band (its tick), the gap between cards */
const HEAD = 0.29
const CG = 0.08
/** the cards sit a hair in front of the lanes */
export const CZ = 0.05
/** how far the chart reaches below the lanes' bottom edge */
export const CHART_DROP = 1.0

export const laneX = (i: number) => (i - (LANES - 1) / 2) * (LW + LG)
export const slotY = (k: number) => LH / 2 - HEAD - CH / 2 - k * (CH + CG)

const R_GLASS = 0.034
const R_CORE = 0.011
const R_GLOW = 0.075

/** each stage's light (the service page's pipeline: lead b, quote c, job a, paid a paler a) */
const mixHex = (a: string, b: string, t: number) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString()
export const LANE_HEX = [G.neonB, G.neonC, G.neonA, mixHex(G.neonA, '#ffffff', 0.35)]
/** their darker tones (lights with a drift), or none */
const TONE_HEX: (string | undefined)[] = [ACTIVE.bTone, ACTIVE.cTone, ACTIVE.aTone, ACTIVE.aTone ? mixHex(ACTIVE.aTone, '#ffffff', 0.35) : undefined]
export const LANE_TONE = LANE_HEX.map((h, i) => ({ color: new THREE.Color(h), tone: new THREE.Color(TONE_HEX[i] ?? h), amt: TONE_HEX[i] ? (ACTIVE.drift ?? 1) : 0 }))

type IsFrame = (rt: THREE.WebGLRenderTarget | null) => boolean

export interface Lane {
  frame: NeonPath
  tick: NeonPath
  walls: THREE.ShaderMaterial
}
export interface Card {
  root: THREE.Group
  /** outline, contact dot, two lines */
  tubes: NeonPath[]
  walls: THREE.ShaderMaterial
}
export interface Bar {
  root: THREE.Group
  tube: NeonPath
  walls: THREE.ShaderMaterial
}
export interface Ring {
  root: THREE.Group
  tube: NeonPath
}
export interface BoardSet {
  root: THREE.Group
  lanes: Lane[]
  cards: Card[]
  chart: THREE.Group
  base: { tube: NeonPath; walls: THREE.ShaderMaterial }
  bars: Bar[]
  rings: Ring[]
  routes: NeonPath[]
  glass: THREE.MeshPhysicalMaterial
}

const V = (x: number, y: number, z = 0) => new THREE.Vector3(x, y, z)

function rrect(cx: number, cy: number, w: number, h: number, r: number, step: number): THREE.Vector3[] {
  const p = new THREE.Path()
  const x0 = cx - w / 2
  const x1 = cx + w / 2
  const y0 = cy - h / 2
  const y1 = cy + h / 2
  // from the top-left corner, clockwise (a lane strikes on like a pen stroke from there)
  p.moveTo(x0 + r, y1)
  p.lineTo(x1 - r, y1)
  p.absarc(x1 - r, y1 - r, r, Math.PI / 2, 0, true)
  p.lineTo(x1, y0 + r)
  p.absarc(x1 - r, y0 + r, r, 0, -Math.PI / 2, true)
  p.lineTo(x0 + r, y0)
  p.absarc(x0 + r, y0 + r, r, -Math.PI / 2, -Math.PI, true)
  p.lineTo(x0, y1 - r)
  p.absarc(x0 + r, y1 - r, r, Math.PI, Math.PI / 2, true)
  return closedOutline(p, step).map(q => V(q.x, q.y))
}

function circle(cx: number, cy: number, r: number): THREE.Vector3[] {
  const p = new THREE.Path()
  p.absarc(cx, cy, r, 0, Math.PI * 2, false)
  return closedOutline(p, Math.min(0.01, r * 0.15)).map(q => V(q.x, q.y))
}

function line(x0: number, y0: number, x1: number, y1: number, step = 0.03): THREE.Vector3[] {
  const n = Math.max(8, Math.round(Math.hypot(x1 - x0, y1 - y0) / step))
  return Array.from({ length: n + 1 }, (_, i) => V(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n))
}

/** an open polyline, its corners rounded (a bent tube turns, it doesn't kink), evenly sampled */
function bent(pts: THREE.Vector2[], step: number, corner: number): THREE.Vector3[] {
  const v: THREE.Vector2[] = [pts[0]]
  for (let i = 1; i < pts.length - 1; i++) {
    const c = pts[i]
    const a = pts[i - 1].clone().sub(c)
    const b = pts[i + 1].clone().sub(c)
    const s0 = c.clone().addScaledVector(a, corner / a.length())
    const s1 = c.clone().addScaledVector(b, corner / b.length())
    for (let k = 0; k <= 6; k++) {
      const t = k / 6
      const u = 1 - t
      v.push(new THREE.Vector2(u * u * s0.x + 2 * u * t * c.x + t * t * s1.x, u * u * s0.y + 2 * u * t * c.y + t * t * s1.y))
    }
  }
  v.push(pts[pts.length - 1])
  const cum = [0]
  for (let i = 1; i < v.length; i++) cum.push(cum[i - 1] + v[i].distanceTo(v[i - 1]))
  const total = cum[cum.length - 1]
  const n = Math.max(8, Math.round(total / step))
  const out: THREE.Vector3[] = []
  let seg = 0
  for (let k = 0; k <= n; k++) {
    const d = (k / n) * total
    while (seg < v.length - 2 && cum[seg + 1] < d) seg++
    const len = cum[seg + 1] - cum[seg] || 1
    const q = v[seg].clone().lerp(v[seg + 1], (d - cum[seg]) / len)
    out.push(V(q.x, q.y))
  }
  return out
}

/** the chart's bars: x, height (of the tallest), colour slot (b, c, a: the lanes' order) */
export const BARS: [number, number][] = [0.42, 0.58, 0.5, 0.72, 0.64, 0.86, 1].map((h, j) => [(j - 3) * 0.28, h])
const BAR_MAX = 0.58
/** the bars' foot (board space) */
export const BAR_Y = -LH / 2 - 0.28 - BAR_MAX

/**
 * The routes (board space): QUOTE's top card over to the third slot in JOB (the
 * follow-up's job), and QUOTE's top card down into JOB's empty fourth slot (a
 * stop there) and up into PAID's second. Lifted toward the camera between the
 * slots, so the card passes in front of the others.
 */
export function routePoints(): THREE.Vector3[][] {
  const q = V(laneX(1), slotY(0), CZ)
  const j2 = V(laneX(2), slotY(2), CZ)
  const j3 = V(laneX(2), slotY(3), CZ)
  const p1 = V(laneX(3), slotY(1), CZ)
  return [
    [q, V(laneX(1) + 0.3, slotY(0) - 0.12, CZ + 0.22), V((laneX(1) + laneX(2)) / 2, (slotY(0) + slotY(2)) / 2, CZ + 0.32), V(laneX(2) - 0.3, slotY(2) + 0.12, CZ + 0.22), j2],
    [q, V((laneX(1) + laneX(2)) / 2, (slotY(0) + slotY(3)) / 2 + 0.1, CZ + 0.3), j3, V((laneX(2) + laneX(3)) / 2, (slotY(3) + slotY(1)) / 2 + 0.1, CZ + 0.3), p1],
  ]
}

export function buildBoard(isFrameTarget: IsFrame, mobile: boolean, envMap: THREE.Texture | null, nCards: number): BoardSet {
  const root = new THREE.Group()
  const glass = sleeveGlass(R_GLASS * 0.12, mobile, envMap)
  const step = mobile ? 0.02 : 0.01
  // (evenly spaced points: a segment and a half per point keeps the corners round)
  const segK = mobile ? 1 : 1.5
  const tube = (pts: THREE.Vector3[], closed: boolean, color: THREE.ColorRepresentation, parent: THREE.Object3D, o: { tone?: THREE.ColorRepresentation; toneAmt?: number } = {}) => {
    const t = neonPath({ points: pts, closed, color, radius: R_CORE, glowRadius: R_GLOW, segments: Math.max(32, Math.round(pts.length * segK)), isFrameTarget, ...o })
    t.k.main.tube = 3.0
    t.k.main.glow = 0.3
    t.k.trans.tube = 3.0
    t.k.trans.glow = 0.34
    parent.add(t.root)
    return t
  }
  /** a clear glass sleeve round some neon, its walls lit in a colour (its own material: index.ts drives it) */
  const sleeve = (tubes: NeonPath[], closed: boolean[], color: THREE.ColorRepresentation, parent: THREE.Object3D) => {
    const geo = glassSleeve(
      tubes.map((t, i) => ({ curve: t.tube.geometry.parameters.path, closed: closed[i] })),
      R_GLASS,
      mobile,
    )
    const walls = sleeveWalls(color)
    const w = new THREE.Mesh(geo, walls)
    w.renderOrder = 2
    parent.add(new THREE.Mesh(geo, glass), w)
    return walls
  }

  // ---- the lanes: a frame and a header tick each (PAID's tick is a check)
  const lanes: Lane[] = LANE_HEX.map((hex, i) => {
    const x0 = laneX(i) - LW / 2
    const yT = LH / 2 - 0.135
    const tone = { tone: LANE_TONE[i].tone, toneAmt: LANE_TONE[i].amt }
    const frame = tube(rrect(laneX(i), 0, LW, LH, 0.13, step), true, hex, root, tone)
    const tickPts =
      i === LANES - 1
        ? bent([new THREE.Vector2(x0 + 0.13, yT), new THREE.Vector2(x0 + 0.19, yT - 0.055), new THREE.Vector2(x0 + 0.33, yT + 0.055)], 0.012, 0.02)
        : line(x0 + 0.13, yT, x0 + 0.4, yT, 0.02)
    const tick = tube(tickPts, false, hex, root, tone)
    const walls = sleeve([frame, tick], [true, false], hex, root)
    return { frame, tick, walls }
  })

  // ---- the cards (all alike: index.ts places, tints and lights them)
  const cards: Card[] = []
  for (let n = 0; n < nCards; n++) {
    const g = new THREE.Group()
    const defs: [THREE.Vector3[], boolean][] = [
      [rrect(0, 0, CW, CH, CR, step), true],
      [circle(-0.215, 0.06, 0.036), true],
      [line(-0.09, 0.06, 0.15, 0.06, 0.02), false],
      [line(-0.24, -0.075, 0.2, -0.075, 0.02), false],
    ]
    const tubes = defs.map(([pts, closed]) => tube(pts, closed, G.ice, g, { toneAmt: 0 }))
    const walls = sleeve(
      tubes,
      defs.map(d => d[1]),
      G.ice,
      g,
    )
    root.add(g)
    cards.push({ root: g, tubes, walls })
  }

  // ---- the report: a baseline and the bars (each rises from its foot)
  const chart = new THREE.Group()
  root.add(chart)
  const baseTube = tube(line(-1.08, BAR_Y - 0.075, 1.08, BAR_Y - 0.075, 0.02), false, LANE_HEX[3], chart, { tone: LANE_TONE[3].tone, toneAmt: LANE_TONE[3].amt })
  const baseWalls = sleeve([baseTube], [false], LANE_HEX[3], chart)
  const bars: Bar[] = (mobile ? BARS.filter((_, j) => j % 3 !== 1) : BARS).map(([x, h], j) => {
    const g = new THREE.Group()
    g.position.set(x, BAR_Y, 0)
    const slot = j % 3
    const t = tube(line(0, 0, 0, h * BAR_MAX, 0.02), false, LANE_HEX[slot], g, { tone: LANE_TONE[slot].tone, toneAmt: LANE_TONE[slot].amt })
    const walls = sleeve([t], [false], LANE_HEX[slot], g)
    chart.add(g)
    return { root: g, tube: t, walls }
  })

  // ---- white light: rings round a card (the follow-up, the paid flash) and the routes
  const rings: Ring[] = [0, 1, 2].map(() => {
    const g = new THREE.Group()
    const t = neonPath({ points: rrect(0, 0, CW + 0.1, CH + 0.1, CR + 0.05, 0.012), closed: true, color: G.ice, radius: 0.008, glowRadius: 0.06, segments: 260, isFrameTarget })
    t.k.main.tube = 3.0
    t.k.main.glow = 0.55
    g.add(t.root)
    root.add(g)
    return { root: g, tube: t }
  })
  const routes = routePoints().map(pts => {
    const t = neonPath({ points: pts, color: G.ice, radius: 0.006, glowRadius: 0.055, endFade: 0.25, segments: 160, isFrameTarget })
    t.k.main.tube = 3.0
    t.k.main.glow = 0.5
    root.add(t.root)
    return t
  })

  return { root, lanes, cards, chart, base: { tube: baseTube, walls: baseWalls }, bars, rings, routes, glass }
}

/** tint a neon (and its tone) between two stages' lights; lane -1 is unlit (a cold white) */
const ICE = new THREE.Color(G.ice)
export function tintNeon(t: NeonPath, color: THREE.Color, tone: THREE.Color, amt: number) {
  t.color.value.copy(color)
  const u = t.tube.material.uniforms
  ;(u.uTone.value as THREE.Color).copy(tone)
  u.uToneAmt.value = amt
}
export function laneColor(a: number, b: number, t: number, out: { color: THREE.Color; tone: THREE.Color; amt: number }) {
  const A = a < 0 ? null : LANE_TONE[a]
  const B = b < 0 ? null : LANE_TONE[b]
  out.color.copy(A ? A.color : ICE).lerp(B ? B.color : ICE, t)
  out.tone.copy(A ? A.tone : ICE).lerp(B ? B.tone : ICE, t)
  out.amt = (A ? A.amt : 0) * (1 - t) + (B ? B.amt : 0) * t
  return out
}
