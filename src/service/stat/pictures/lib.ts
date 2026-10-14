import { WHITE, mix, rgba, type Pen, type RGB } from '../../scenes/kit'

/*
 * What the pictures share (../PICTURES.md, "The frame"): the deterministic hash
 * strike() uses (positions and schedules are pure functions of t, never random,
 * since init reruns on a resize or on the minute), the easings, a dust field, the
 * room's light cast on the glow layer, and the three strokes of a neon tube
 * drawn by hand so a running front can leave its white-hot core behind.
 */

declare global {
  interface Window {
    /** dev: a fixed epoch (ms) for the live pictures, so screenshots repeat */
    __statClock?: number
  }
}
/**
 * The viewer's clock (ms since the epoch): the only live data a picture may read, read once per
 * frame by the pictures that show the time (now, always), never remembered from init (the band's t
 * keeps running across the minute rebuild). Dev: window.__statClock fixes the instant.
 */
export const clock = () => (import.meta.env.DEV && typeof window.__statClock === 'number' ? window.__statClock : Date.now())

export const TAU = Math.PI * 2
export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
export const span = (a: number, b: number, e: number) => clamp01((e - a) / (b - a))
export const smooth = (x: number) => {
  x = clamp01(x)
  return x * x * (3 - 2 * x)
}
export const easeOut = (e: number) => 1 - Math.pow(1 - clamp01(e), 3)
export const easeInOut = (e: number) => {
  e = clamp01(e)
  return e < 0.5 ? 4 * e * e * e : 1 - Math.pow(-2 * e + 2, 3) / 2
}
/** strike()'s hash: 0..1 from an integer-ish seed */
export const hash = (n: number) => {
  const x = Math.sin(n * 12.9898) * 43758.5453
  return x - Math.floor(x)
}
/** the white-hot core colour of a tube in `c` (what the kit's own hot() does) */
export const hot = (c: RGB): RGB => mix(c, WHITE, 0.62)
/** a gentle sine breath around 1: ±amp on period T (seconds), phase ph */
export const breath = (t: number, T: number, amp: number, ph = 0) => 1 + amp * Math.sin((TAU * t) / T + ph)

/**
 * The three strokes of pen.neon, drawn by hand: the glow and the colour to `p`
 * (0..1 of a Path2D's dash length `L`) and the white-hot core to `pc` (behind
 * the colour front while it runs, equal to it at rest). With p = pc = 1 it is
 * pen.neon exactly.
 */
export function neonTo(pen: Pen, path: Path2D, L: number, c: RGB, on: number, w: number, p: number, pc = p) {
  if (on <= 0.004 || p <= 0) return
  const { ctx, glow } = pen
  const full = p >= 0.999
  if (!full) {
    glow.setLineDash([L * p, L * 2])
    ctx.setLineDash([L * p, L * 2])
  }
  glow.lineWidth = w * 2.6
  glow.strokeStyle = rgba(c, on)
  glow.stroke(path)
  ctx.lineWidth = w
  ctx.strokeStyle = rgba(c, on * 0.8)
  ctx.stroke(path)
  if (pc > 0) {
    if (!full || pc < 0.999) ctx.setLineDash([L * clamp01(pc), L * 2])
    ctx.lineWidth = Math.max(0.7, w * 0.4)
    ctx.strokeStyle = rgba(hot(c), on)
    ctx.stroke(path)
  }
  ctx.setLineDash([])
  glow.setLineDash([])
}

const lengths = new WeakMap<Path2D, number>()
/** a Path2D's length, measured once (an SVG path is walked; a canvas path is sampled by the caller) */
export function remember(path: Path2D, L: number) {
  lengths.set(path, L)
  return path
}
export const lengthOf = (path: Path2D) => lengths.get(path) ?? 0

/**
 * The room's light: an elliptical wash on the glow layer (the haze copies it),
 * rx by ry about (cx, cy), colour c at alpha a in the middle fading to nothing.
 * One unit gradient per colour per glow context, built on first use and
 * scaled into place.
 */
const radials = new WeakMap<CanvasRenderingContext2D, Map<string, CanvasGradient>>()
function radial(glow: CanvasRenderingContext2D, c: RGB): CanvasGradient {
  let m = radials.get(glow)
  if (!m) radials.set(glow, (m = new Map()))
  const k = c.join(',')
  let g = m.get(k)
  if (!g) {
    g = glow.createRadialGradient(0, 0, 0, 0, 0, 1)
    g.addColorStop(0, rgba(c, 1))
    g.addColorStop(1, rgba(c, 0))
    m.set(k, g)
  }
  return g
}
export function wash(pen: Pen, c: RGB, cx: number, cy: number, rx: number, ry: number, a: number) {
  if (a <= 0.002 || rx <= 0 || ry <= 0) return
  const { glow } = pen
  glow.save()
  glow.translate(cx, cy)
  glow.scale(rx, ry)
  glow.globalAlpha = Math.min(1, a)
  glow.fillStyle = radial(glow, c)
  glow.fillRect(-1, -1, 2, 2)
  glow.restore()
}

/** a cold glint on dark glass: a short white hairline with soft ends, sharp layer only */
export function glint(pen: Pen, x0: number, y0: number, x1: number, y1: number, a: number, w = 1) {
  if (a <= 0.004) return
  const { ctx } = pen
  const g = ctx.createLinearGradient(x0, y0, x1, y1)
  g.addColorStop(0, rgba(WHITE, 0))
  g.addColorStop(0.5, rgba(WHITE, a))
  g.addColorStop(1, rgba(WHITE, 0))
  ctx.strokeStyle = g
  ctx.lineWidth = w
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.lineTo(x1, y1)
  ctx.stroke()
}

export interface Mote {
  x0: number
  y0: number
  vx: number
  vy: number
  r: number
  a: number
  ph: number
}
/** n motes seeded by `seed` in a box, drifting (vx, vy) px/s with a sway; positions are pure in t */
export function motes(n: number, seed: number, box: [number, number, number, number], vx: [number, number], vy: [number, number]): Mote[] {
  return Array.from({ length: n }, (_, i) => {
    const h = (k: number) => hash(seed * 7919 + i * 31 + k)
    return {
      x0: box[0] + h(1) * (box[2] - box[0]),
      y0: box[1] + h(2) * (box[3] - box[1]),
      vx: vx[0] + h(3) * (vx[1] - vx[0]),
      vy: vy[0] + h(4) * (vy[1] - vy[0]),
      r: 0.8 + h(5) * 0.8,
      a: 0.08 + h(6) * 0.14,
      ph: h(7) * TAU,
    }
  })
}
/** a mote's place at t, wrapped inside its box, with a slow sideways sway */
export function moteAt(m: Mote, t: number, box: [number, number, number, number], sway = 6): [number, number] {
  const W = box[2] - box[0], H = box[3] - box[1]
  let x = m.x0 + m.vx * t + sway * Math.sin(0.5 * t + m.ph) - box[0]
  let y = m.y0 + m.vy * t - box[1]
  x = ((x % W) + W) % W
  y = ((y % H) + H) % H
  return [box[0] + x, box[1] + y]
}
/** the dust, drawn in one path on the sharp layer at alpha `a` (times each mote's own) */
export function drawMotes(pen: Pen, ms: Mote[], t: number, box: [number, number, number, number], a: number, sway = 6) {
  if (a <= 0.004) return
  const { ctx } = pen
  ctx.beginPath()
  for (const m of ms) {
    const [x, y] = moteAt(m, t, box, sway)
    ctx.moveTo(x + m.r, y)
    ctx.arc(x, y, m.r, 0, TAU)
  }
  ctx.fillStyle = rgba(WHITE, a * 0.16)
  ctx.fill()
}
