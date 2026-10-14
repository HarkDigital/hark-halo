import { NA, P, WHITE, rgba, strike } from '../../scenes/kit'
import type { Builder } from '../picture'
import { TAU, breath, clamp01, drawMotes, hash, motes, wash, type Mote } from './lib'

/*
 * 43%: THE BEAD CURTAIN (../PICTURES.md). A hundred glass beads hung on ten
 * hairline strands from the top of the band, ten a strand; `share` of them
 * lit from the bottom up, strand by strand from the left, so the lit block
 * is four whole strands and three beads of the fifth: 43 of 100 at a glance.
 * One bead is mid-strike at any frame and the number ticks as it settles.
 * Afterwards the beads breathe, one wavers at a time, the strands sway, and
 * the hand brightens a bead or glints an unlit one.
 */
export const beads: Builder<{ kind: 'beads'; share: number; of: number }> = o => {
  const strands = 10
  const per = Math.ceil(o.of / strands)
  let xs: number[] = []
  let ys: number[] = []
  let r = 5.5, bottom = 0
  let narrow = false
  let dust: Mote[] = []
  let box: [number, number, number, number] = [0, 0, 1, 1]
  /** bead i (lit order) is strand j, row k from the bottom */
  const where = (i: number) => [Math.floor(i / per), i % per] as const

  return {
    lead: [0, 0],
    dur: 2800,
    init(w, h, env) {
      narrow = env.narrow
      const [x0, x1] = narrow ? [0.08 * w, 0.92 * w] : env.framed ? [0.14 * w, 0.86 * w] : [Math.max(0.47 * w, env.copyX + 0.1 * w), 0.93 * w]
      const [y0, y1] = narrow ? [0.12 * h, 0.88 * h] : [0.2 * h, 0.86 * h]
      xs = Array.from({ length: strands }, (_, j) => x0 + ((x1 - x0) * j) / (strands - 1))
      ys = Array.from({ length: per }, (_, k) => y0 + ((y1 - y0) * k) / (per - 1))
      r = narrow ? 3.2 : env.framed ? 5 : 5.5
      bottom = y1
      box = [x0 - 20, y0, x1 + 20, y1 + 20]
      dust = motes(narrow ? 0 : env.framed ? 8 : 10, 43, box, [-3, 3], [-9, -5])
    },
    frame(pen, w, h, p, e, t, pointer) {
      const { ctx, glow } = pen
      const u = p * o.share
      const lit = Math.floor(u + 1e-6)
      // the strands sway a little, and lean away from the hand
      const dx = (j: number) => {
        let s = 1.5 * Math.sin(0.6 * t + 0.7 * j)
        if (pointer.inside) {
          const d = Math.abs(pointer.x - xs[j])
          if (d < 160) s += 4 * (1 - d / 160) * (pointer.x < xs[j] ? 1 : -1)
        }
        return s
      }
      const warm = 0.1 + 0.06 * clamp01(e / 0.08)
      ctx.beginPath()
      for (let j = 0; j < strands; j++) {
        ctx.moveTo(xs[j] + dx(j) * 0.3, 0)
        ctx.lineTo(xs[j] + dx(j), bottom + r)
      }
      ctx.lineWidth = 2
      ctx.strokeStyle = rgba(WHITE, 0.03)
      ctx.stroke()
      ctx.lineWidth = 0.8
      ctx.strokeStyle = rgba(WHITE, warm)
      ctx.stroke()
      // the unlit beads: glass spheres with a fixed highlight, in one path
      const glass = new Path2D()
      const hi = new Path2D()
      for (let i = lit + 1; i < o.of; i++) {
        const [j, k] = where(i)
        const x = xs[j] + dx(j) * (1 - k / per), y = ys[per - 1 - k]
        glass.moveTo(x + r, y)
        glass.arc(x, y, r, 0, TAU)
        let g = 0.14
        if (pointer.inside) {
          const d = Math.hypot(pointer.x - x, pointer.y - y)
          if (d < 160) g += 0.36 * (1 - d / 160)
        }
        hi.moveTo(x - r * 0.35 + 1, y - r * 0.35)
        hi.arc(x - r * 0.35, y - r * 0.35, Math.max(0.6, r * 0.18), 0, TAU)
        void g
      }
      ctx.fillStyle = rgba(WHITE, 0.04)
      ctx.fill(glass)
      ctx.lineWidth = 1.5
      ctx.strokeStyle = rgba(WHITE, 0.18 * 0.2)
      ctx.stroke(glass)
      ctx.lineWidth = 0.8
      ctx.strokeStyle = rgba(WHITE, 0.18)
      ctx.stroke(glass)
      ctx.fillStyle = rgba(WHITE, 0.14)
      ctx.fill(hi)
      if (u <= 0) return
      // the lit beads: white-hot cores in green bloom, the strand lit a pitch above and below
      const pitch = ys[1] - ys[0]
      const slot = Math.floor(t / 1.5)
      const waver = e >= 1 && t - slot * 1.5 < 0.06 ? Math.floor(hash(slot) * lit) : -1
      const perStrand = new Array<number>(strands).fill(0)
      let cxs = 0, cys = 0
      for (let i = 0; i <= Math.min(o.of - 1, lit); i++) {
        const age = u - i
        if (age <= 0) continue
        const [j, k] = where(i)
        const x = xs[j] + dx(j) * (1 - k / per), y = ys[per - 1 - k]
        let on = age < 1 ? strike(age * 0.42, i) : 1
        on *= breath(t, 3 + 3 * hash(i), 0.06, hash(i + 0.5) * TAU)
        if (i === waver) on *= 0.5
        let b = 0
        if (pointer.inside) {
          const d = Math.hypot(pointer.x - x, pointer.y - y)
          if (d < 160) b = 1 - d / 160
        }
        on = Math.min(1.2, on * (1 + 0.5 * b))
        const flash = age < 1 ? 1.4 : e >= 0.995 && i === lit - 1 && t - 3.05 < 0.3 ? 1 + 0.6 * Math.max(0, 1 - (t - 3.05) / 0.3) : 1
        const rr = r * 0.9 * flash
        glow.fillStyle = rgba(NA, 0.22 * on * (1 + 0.5 * b))
        glow.beginPath()
        glow.arc(x, y, r * 2.6 * (1 + 0.3 * b), 0, TAU)
        glow.fill()
        pen.fill(P.circle(x, y, rr), NA, on)
        pen.neon(P.line(x, y - pitch, x, y + pitch), NA, 0.25 * on, 1)
        if (age >= 1) {
          perStrand[j]++
          cxs += x
          cys += y
        }
      }
      // the pools under the lit strands' feet, and the room's light from the lit block
      for (let j = 0; j < strands; j++) if (perStrand[j] > 0) wash(pen, NA, xs[j], bottom + r, narrow ? 0.03 * w : 0.05 * w, narrow ? 0.02 * h : 0.03 * h, 0.1 * (perStrand[j] / per))
      if (lit > 0) wash(pen, NA, cxs / lit, cys / lit, 0.5 * w, 0.5 * w, 0.05 * (lit / o.of))
      if (lit > 0) drawMotes(pen, dust, t, box, lit / o.of, 4)
      void h
    },
  }
}
