import { ACTIVE } from '../../kit/palette'

/*
 * The service heroes' NEON KIT. Each service page's hero art is the classic
 * 2026 site's scene for that service (a 2D canvas that answers the cursor),
 * redrawn in Halo's light. Everything a scene draws is one of two things:
 *
 *   GLASS  clear, unlit tubing: a faint body with a hairline highlight
 *   NEON   lit gas in the active lights (--neon-a / b / c): a coloured tube
 *          with a white-hot core on the sharp layer, and the same shape in
 *          colour on the GLOW layer (drawn small and blurred by CSS: the bloom)
 *
 * `tube` is the site's motif, neon inside a glass sleeve. Both layers draw
 * additively ('lighter'), so crossings and overlaps run hotter.
 */

export type RGB = readonly [number, number, number]

const hex = (h: string): RGB => {
  const n = parseInt(h.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
/** the active lights: a (the lead), b, c */
export const NA = hex(ACTIVE.a)
export const NB = hex(ACTIVE.b)
export const NC = hex(ACTIVE.c)
export const WHITE: RGB = [255, 255, 255]
export const TAU = Math.PI * 2

export const mix = (c: RGB, d: RGB, k: number): RGB => [c[0] + (d[0] - c[0]) * k, c[1] + (d[1] - c[1]) * k, c[2] + (d[2] - c[2]) * k]
export const rgba = (c: RGB, a: number) =>
  `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a <= 0 ? 0 : a >= 1 ? 1 : a.toFixed(3)})`

const HOT = new WeakMap<RGB, RGB>()
/** the white-hot core of a tube in colour `c` */
const hot = (c: RGB) => {
  let h = HOT.get(c)
  if (!h) HOT.set(c, (h = mix(c, WHITE, 0.62)))
  return h
}

/** stutters on like a striking tube over ~0.4 s from age 0 (fully lit after) */
export function strike(age: number, seed = 0): number {
  if (age <= 0) return 0
  if (age >= 0.42) return 1
  const k = Math.floor(age * 30) + seed * 17
  const r = Math.abs(Math.sin(k * 12.9898 + seed * 78.233) * 43758.5453) % 1
  return r > 0.42 ? 0.4 + age * 1.4 : 0.06
}

export interface Pointer {
  x: number
  y: number
  /** over the art (a touch counts while the finger is down) */
  inside: boolean
  down: boolean
}

export interface Scene {
  /**
   * once per (re)size, CSS px. `framed`: the art is a band above centred copy
   * (tablets, and windows squarer than 5:4; service.css): below the header, nothing
   * beside it and possibly short, so the drawing stays centred and inside it.
   * Otherwise the art is a full screen tall, right of the copy (or above it on
   * a phone).
   */
  init(w: number, h: number, framed: boolean): void
  /** every frame; dt in seconds (clamped), t in seconds */
  frame(pen: Pen, w: number, h: number, pointer: Pointer, dt: number, t: number): void
}

/** path builders (Path2D, so one shape can be stroked on both layers) */
export const P = {
  line(x0: number, y0: number, x1: number, y1: number) {
    const p = new Path2D()
    p.moveTo(x0, y0)
    p.lineTo(x1, y1)
    return p
  },
  circle(x: number, y: number, r: number) {
    const p = new Path2D()
    p.arc(x, y, Math.max(0, r), 0, TAU)
    return p
  },
  arc(x: number, y: number, r: number, a0: number, a1: number) {
    const p = new Path2D()
    p.arc(x, y, Math.max(0, r), a0, a1)
    return p
  },
  rect(x: number, y: number, w: number, h: number) {
    const p = new Path2D()
    p.rect(x, y, w, h)
    return p
  },
  rrect(x: number, y: number, w: number, h: number, r: number) {
    const p = new Path2D()
    r = Math.min(r, w / 2, h / 2)
    p.moveTo(x + r, y)
    p.arcTo(x + w, y, x + w, y + h, r)
    p.arcTo(x + w, y + h, x, y + h, r)
    p.arcTo(x, y + h, x, y, r)
    p.arcTo(x, y, x + w, y, r)
    p.closePath()
    return p
  },
  /** the brand diamond: a square of side `s` turned 45 degrees */
  diamond(cx: number, cy: number, s: number) {
    const d = s / Math.SQRT2
    const p = new Path2D()
    p.moveTo(cx, cy - d)
    p.lineTo(cx + d, cy)
    p.lineTo(cx, cy + d)
    p.lineTo(cx - d, cy)
    p.closePath()
    return p
  },
}

export class Pen {
  /** the sharp layer */
  readonly ctx: CanvasRenderingContext2D
  /** the bloom layer (same coordinates; blurred by CSS) */
  readonly glow: CanvasRenderingContext2D

  constructor(ctx: CanvasRenderingContext2D, glow: CanvasRenderingContext2D) {
    this.ctx = ctx
    this.glow = glow
  }

  /** a lit neon line along `p`: bloom, coloured tube, white-hot core */
  neon(p: Path2D, c: RGB, on: number, w = 2) {
    if (on <= 0.004) return
    const { ctx, glow } = this
    glow.lineWidth = w * 2.6
    glow.strokeStyle = rgba(c, on)
    glow.stroke(p)
    ctx.lineWidth = w
    ctx.strokeStyle = rgba(c, on * 0.8)
    ctx.stroke(p)
    ctx.lineWidth = Math.max(0.7, w * 0.4)
    ctx.strokeStyle = rgba(hot(c), on)
    ctx.stroke(p)
  }

  /** the motif: neon inside a clear glass sleeve (the sleeve shows even when the gas is off) */
  tube(p: Path2D, c: RGB, on: number, w = 2.4) {
    this.glass(p, 0.16, w * 3.4)
    this.neon(p, c, on, w)
  }

  /** clear, unlit glass tubing along `p` */
  glass(p: Path2D, a: number, w = 3) {
    if (a <= 0.004) return
    const { ctx } = this
    ctx.lineWidth = w
    ctx.strokeStyle = rgba(WHITE, a * 0.2)
    ctx.stroke(p)
    ctx.lineWidth = 0.8
    ctx.strokeStyle = rgba(WHITE, a)
    ctx.stroke(p)
  }

  /** a lit shape (beads, diamonds): white-hot, blooming in colour */
  fill(p: Path2D, c: RGB, on: number) {
    if (on <= 0.004) return
    const { ctx, glow } = this
    glow.fillStyle = glow.strokeStyle = rgba(c, on)
    glow.lineWidth = 3
    glow.fill(p)
    glow.stroke(p)
    ctx.fillStyle = rgba(hot(c), on)
    ctx.fill(p)
  }

  /** a lit bar (fillRect, for many small ones) */
  box(x: number, y: number, w: number, h: number, c: RGB, on: number) {
    if (on <= 0.004) return
    this.glow.fillStyle = rgba(c, on)
    this.glow.fillRect(x - 1.5, y - 1.5, w + 3, h + 3)
    this.ctx.fillStyle = rgba(c, on * 0.85)
    this.ctx.fillRect(x, y, w, h)
    if (h > 2.4 && w > 2.4) {
      this.ctx.fillStyle = rgba(hot(c), on)
      this.ctx.fillRect(x + 0.8, y + h * 0.3, w - 1.6, h * 0.4)
    }
  }

  /** a soft wash of coloured light over a shape (a lit panel, not a tube) */
  wash(p: Path2D, c: RGB, a: number) {
    if (a <= 0.004) return
    this.glow.fillStyle = rgba(c, a * 1.6)
    this.glow.fill(p)
    this.ctx.fillStyle = rgba(c, a)
    this.ctx.fill(p)
  }

  /** a neon streak: dark at (x0, y0), lit toward a white-hot head at (x1, y1) */
  streak(x0: number, y0: number, x1: number, y1: number, c: RGB, on: number, w = 1.8) {
    if (on <= 0.004) return
    const { ctx, glow } = this
    const g = glow.createLinearGradient(x0, y0, x1, y1)
    g.addColorStop(0, rgba(c, 0))
    g.addColorStop(1, rgba(c, on))
    glow.strokeStyle = g
    glow.lineWidth = w * 2.6
    glow.beginPath()
    glow.moveTo(x0, y0)
    glow.lineTo(x1, y1)
    glow.stroke()
    const s = ctx.createLinearGradient(x0, y0, x1, y1)
    s.addColorStop(0, rgba(c, 0))
    s.addColorStop(0.7, rgba(c, on * 0.8))
    s.addColorStop(1, rgba(hot(c), on))
    ctx.strokeStyle = s
    ctx.lineWidth = w
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.stroke()
    ctx.fillStyle = rgba(WHITE, on * 0.9)
    ctx.beginPath()
    ctx.arc(x1, y1, w * 0.62, 0, TAU)
    ctx.fill()
  }

  /** neon lettering: the glyphs' outlines bent in tube */
  text(s: string, x: number, y: number, font: string, c: RGB, on: number, w = 2) {
    if (on <= 0.004) return
    for (const k of [this.ctx, this.glow]) {
      k.font = font
      k.textAlign = 'center'
      k.textBaseline = 'middle'
    }
    this.glow.lineWidth = w * 2.6
    this.glow.strokeStyle = rgba(c, on)
    this.glow.strokeText(s, x, y)
    this.ctx.lineWidth = w
    this.ctx.strokeStyle = rgba(c, on * 0.8)
    this.ctx.strokeText(s, x, y)
    this.ctx.lineWidth = Math.max(0.7, w * 0.4)
    this.ctx.strokeStyle = rgba(hot(c), on)
    this.ctx.strokeText(s, x, y)
  }

  /** dashes on both layers ([] for solid) */
  dash(segs: number[]) {
    this.ctx.setLineDash(segs)
    this.glow.setLineDash(segs)
  }
}
