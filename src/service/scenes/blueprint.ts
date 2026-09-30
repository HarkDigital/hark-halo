import { NA, NB, P, WHITE, rgba, strike, type Scene } from './kit'

interface Box {
  x: number
  y: number
  w: number
  h: number
  start: number
  cross?: boolean
  seed: number
}

/** a rectangle's outline from its top-left corner, clockwise, `len` long; and where the pen is */
function traced(b: Box, len: number): { path: Path2D; hx: number; hy: number } {
  const pts: [number, number][] = [
    [b.x, b.y],
    [b.x + b.w, b.y],
    [b.x + b.w, b.y + b.h],
    [b.x, b.y + b.h],
    [b.x, b.y],
  ]
  const path = new Path2D()
  path.moveTo(b.x, b.y)
  let hx = b.x
  let hy = b.y
  for (let i = 1; i < pts.length && len > 0; i++) {
    const [x0, y0] = pts[i - 1]
    const [x1, y1] = pts[i]
    const seg = Math.hypot(x1 - x0, y1 - y0)
    const k = Math.min(1, len / seg)
    hx = x0 + (x1 - x0) * k
    hy = y0 + (y1 - y0) * k
    path.lineTo(hx, hy)
    len -= seg
  }
  return { path, hx, hy }
}

/*
 * WEB DESIGN — a wireframe that sketches itself in neon, holds, flickers
 * out, and drafts a brand-new layout. Each box is bent from one tube, a
 * white-hot spark running ahead as it draws; the box under the cursor
 * lights up in the lead colour.
 */
export function blueprint(): Scene {
  let boxes: Box[] = []
  let cycleStart = -1
  let dots = new Path2D()
  const CYCLE = 9

  const generate = (w: number, h: number, t: number) => {
    const m = Math.min(w, h) * 0.1
    const top = Math.max(m, h * 0.15) // clear of the header
    const gw = w - m * 2
    const gh = h - top - m
    boxes = []
    let delay = 0
    const add = (x: number, y: number, bw: number, bh: number, cross = false) => {
      boxes.push({ x, y, w: bw, h: bh, start: t + delay, cross, seed: boxes.length })
      delay += 0.22
    }
    // header + nav pill
    add(m, top, gw, gh * 0.1)
    add(m + gw * 0.8, top + gh * 0.02, gw * 0.18, gh * 0.06)
    // hero split (random ratio): the image side gets an X placeholder
    const split = 0.5 + Math.random() * 0.2
    const heroH = gh * (0.3 + Math.random() * 0.12)
    add(m, top + gh * 0.13, gw * split - 10, heroH)
    add(m + gw * split + 10, top + gh * 0.13, gw * (1 - split) - 10, heroH, true)
    // column cards
    const colY = top + gh * 0.13 + heroH + 24
    const nCols = 3 + Math.floor(Math.random() * 2)
    const colH = Math.max(60, gh - (colY - top) - gh * 0.12)
    for (let i = 0; i < nCols; i++) {
      const cw = (gw - (nCols - 1) * 20) / nCols
      add(m + i * (cw + 20), colY, cw, colH, Math.random() < 0.3)
    }
    // footer bar
    add(m, top + gh - gh * 0.07, gw, gh * 0.07)
  }

  return {
    init(w, h) {
      boxes = []
      cycleStart = -1
      dots = new Path2D()
      const gap = 40
      for (let y = gap; y < h; y += gap) for (let x = gap; x < w; x += gap) dots.rect(x - 0.6, y - 0.6, 1.2, 1.2)
    },

    frame(pen, w, h, pointer, _dt, t) {
      if (cycleStart < 0 || t - cycleStart > CYCLE) {
        cycleStart = t
        generate(w, h, t)
      }
      const phase = t - cycleStart
      // the end of a cycle: the tubes flicker out
      const out = phase > CYCLE - 1.2 ? Math.max(0, (CYCLE - phase) / 1.2) : 1

      pen.ctx.fillStyle = rgba(WHITE, 0.07 * out)
      pen.ctx.fill(dots)

      for (const b of boxes) {
        const age = t - b.start
        const p = Math.min(1, Math.max(0, age / 1.1))
        if (p <= 0) continue
        const hovered = pointer.inside && pointer.x > b.x && pointer.x < b.x + b.w && pointer.y > b.y && pointer.y < b.y + b.h
        const flick = out < 1 ? out * strike(0.05 + (1 - out) * 0.3, b.seed) : 1
        const perim = 2 * (b.w + b.h)
        const { path, hx, hy } = traced(b, perim * p)
        pen.neon(path, hovered ? NA : NB, (hovered ? 1 : 0.5) * flick, hovered ? 2.2 : 1.8)

        // the drawing spark
        if (p < 1) pen.fill(P.circle(hx, hy, 2.2), NB, 1)

        // corner beads once drawn
        if (p >= 1) {
          const c = hovered ? NA : NB
          for (const [x, y] of [
            [b.x, b.y],
            [b.x + b.w, b.y],
            [b.x, b.y + b.h],
            [b.x + b.w, b.y + b.h],
          ]) {
            pen.fill(P.rect(x - 1.8, y - 1.8, 3.6, 3.6), c, 0.9 * flick)
          }
        }

        // the image placeholder's X, in clear glass
        if (b.cross && p >= 1) {
          const x = new Path2D()
          x.moveTo(b.x, b.y)
          x.lineTo(b.x + b.w, b.y + b.h)
          x.moveTo(b.x + b.w, b.y)
          x.lineTo(b.x, b.y + b.h)
          if (hovered) pen.neon(x, NA, 0.4, 1.2)
          else pen.glass(x, 0.2 * out, 3)
        }
      }
    },
  }
}
