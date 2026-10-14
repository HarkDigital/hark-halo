import { NA, NC, P, WHITE, rgba, strike, type RGB } from '../../scenes/kit'
import type { Builder, Label } from '../picture'
import { breath, clamp01, drawMotes, glint, hash, motes, neonTo, remember, wash, type Mote } from './lib'

/*
 * 32%: PAST THE LINE (../PICTURES.md). Two straight glass tubes lying
 * horizontally in the dark, one above the other, both starting from the
 * same left point; a plumb line hangs from the end of the upper one. Two
 * loads started together: the upper fills in one second, the lower crawls
 * for three and runs past the line by `rise` of the upper's length, in
 * purple. The number is dark until the lower front reaches the line, then
 * counts with the purple: the picture sets countFrom so p begins there.
 */
export const loads: Builder<{ kind: 'loads'; from: number; to: number; rise: number }> = o => {
  const ratio = 1 + o.rise
  const from = 1 / ratio
  let x0 = 0, L = 1, yU = 0, yL = 0, wt = 5
  let upper = new Path2D(), lowerGreen = new Path2D(), lowerPurple = new Path2D()
  let sleeves = new Path2D()
  let narrow = false, framed = false
  let dust: Mote[] = []
  let box: [number, number, number, number] = [0, 0, 1, 1]
  let hb = 1

  return {
    lead: [0, 1],
    dur: 3000,
    countFrom: from,
    key: (_p, e) => e >= from,
    init(w, h, env) {
      narrow = env.narrow
      framed = env.framed
      hb = h
      const x1 = narrow ? 0.95 * w : framed ? 0.93 * w : 0.95 * w
      x0 = narrow ? 0.16 * w : framed ? 0.15 * w : Math.max(env.copyX + 72, 0.46 * w)
      L = (x1 - x0) / ratio
      yU = narrow || framed ? 0.4 * h : 0.44 * h
      yL = narrow || framed ? 0.6 * h : 0.56 * h
      wt = narrow ? 4.5 : framed ? 5.5 : 6.5
      upper = remember(P.line(x0, yU, x0 + L, yU), L)
      lowerGreen = remember(P.line(x0, yL, x0 + L, yL), L)
      lowerPurple = remember(P.line(x0 + L, yL, x0 + L * ratio, yL), L * o.rise)
      sleeves = new Path2D()
      sleeves.moveTo(x0, yU)
      sleeves.lineTo(x0 + L, yU)
      sleeves.moveTo(x0, yL)
      sleeves.lineTo(x0 + L * ratio, yL)
      box = [x0, 0.1 * h, x1, 0.9 * h]
      dust = motes(narrow ? 0 : framed ? 8 : 12, 32, box, [-3, 3], [-18, -12])
      const labels: Label[] = [
        { text: `${o.from} S`, x: x0 - 16, y: yU - 5, align: 'right' },
        { text: `${o.to} S`, x: x0 - 16, y: yL - 5, align: 'right', hi: true },
      ]
      return labels
    },
    frame(pen, w, h, p, e, t, pointer) {
      const { ctx } = pen
      // the glass: both sleeves and the four cap beads, the plumb line hung from the upper cap
      pen.glass(sleeves, 0.14, wt * 3.4)
      const xL = x0 + L
      const crossed = e >= from
      const plumbA = crossed ? 0.2 + 0.7 * Math.max(0, 1 - (e - from) * 6) : 0.12
      const pg = ctx.createLinearGradient(0, yU, 0, narrow ? yL + 0.12 * h : 0.96 * h)
      pg.addColorStop(0, rgba(WHITE, plumbA))
      pg.addColorStop(narrow ? 1 : 0.55, rgba(WHITE, plumbA))
      pg.addColorStop(1, rgba(WHITE, 0))
      ctx.strokeStyle = pg
      ctx.lineWidth = crossed && e - from < 0.17 ? 1.2 : 1
      ctx.beginPath()
      ctx.moveTo(xL, yU)
      ctx.lineTo(xL, narrow ? yL + 0.12 * h : 0.96 * h)
      ctx.stroke()
      if (crossed && e - from < 0.17) pen.neon(P.line(xL, yU, xL, yL + 20), WHITE, 0.9 * (1 - (e - from) * 6), 1.2)
      // the cursor: q to the nearest tube's axis
      const near = (y: number, xa: number, xb: number) => {
        if (!pointer.inside) return 0
        const dx = pointer.x < xa ? xa - pointer.x : pointer.x > xb ? pointer.x - xb : 0
        const d = Math.hypot(dx, pointer.y - y)
        return d < 160 ? 1 - d / 160 : 0
      }
      const qU = near(yU, x0, xL), qL = near(yL, x0, xL * 1 + L * o.rise)
      if (qU > 0) glint(pen, pointer.x - 18, yU - wt * 1.5, pointer.x + 18, yU - wt * 1.5, 0.3 * qU)
      if (qL > 0) glint(pen, pointer.x - 18, yL - wt * 1.5, pointer.x + 18, yL - wt * 1.5, 0.3 * qL)
      const caps: [number, number, RGB][] = [
        [x0, yU, NA],
        [x0 + L, yU, NA],
        [x0, yL, NA],
        [x0 + L * ratio, yL, NC],
      ]
      if (e <= 0) {
        for (const [x, y] of caps) pen.glass(P.circle(x, y, 3.2), 0.3, 2)
        return
      }
      // the fronts: the upper runs L in a second, the lower a third as fast
      const uU = clamp01(e / 0.333)
      const uL = clamp01(e / from)
      const stutter = (seed: number) => (e < 0.14 ? Math.max(0.35, strike(e * 3, seed)) : 1)
      const onU = stutter(1) * breath(t, 5.7, 0.06) * (1 + 0.1 * qU)
      const onL = stutter(2) * breath(t, 5.7, 0.06, 2.1) * (1 + 0.1 * qL)
      const lag = 22 / L
      neonTo(pen, upper, L, NA, onU, wt, uU, uU >= 1 ? 1 : Math.max(0, uU - lag))
      neonTo(pen, lowerGreen, L, NA, onL, wt, uL, uL >= 1 ? 1 : Math.max(0, uL - lag))
      // the heads while a front runs
      const head = (x: number, y: number, c: RGB, on: number) => {
        pen.streak(x - 40, y, x, y, c, on, wt * 0.7)
        pen.fill(P.circle(x, y, 3), WHITE, on)
      }
      if (uU < 1) head(x0 + L * uU, yU, NA, onU)
      if (uL < 1) head(x0 + L * uL, yL, NA, onL)
      // past the line: the purple, exactly rise x L x p, uneasy once lit
      let onP = 0
      if (p > 0) {
        onP = (0.88 + 0.08 * Math.sin(1.7 * t + 1)) * (1 + 0.2 * qL)
        const win = Math.floor(t / 5)
        if (hash(win) > 0.66 && t - win * 5 < 0.12) onP *= 0.6
        neonTo(pen, lowerPurple, L * o.rise, NC, onP, wt, p, e >= 1 ? 1 : Math.max(0, p - lag / o.rise))
        if (p < 1) head(xL + L * o.rise * p, yL, NC, onP)
        if (qL > 0 && pointer.x > xL) {
          pen.glow.lineWidth = wt * 2.2
          pen.glow.strokeStyle = rgba(NC, 0.3 * qL)
          pen.glow.stroke(P.line(Math.max(xL, pointer.x - 55), yL, Math.min(xL + L * o.rise * p, pointer.x + 55), yL))
        }
      }
      // the electrodes flare at the start, the caps as a front arrives
      const flare = (age: number) => Math.max(0, 1 - age / 0.3)
      pen.fill(P.circle(x0, yU, 2.6 + 3.4 * flare(e * 3)), WHITE, 0.5 + 0.5 * flare(e * 3))
      pen.fill(P.circle(x0, yL, 2.6 + 3.4 * flare(e * 3)), WHITE, 0.5 + 0.5 * flare(e * 3))
      if (uU >= 1) pen.fill(P.circle(x0 + L, yU, 2.6 + 2.4 * flare((e - 0.333) * 3)), NA, 0.8 + 0.2 * flare((e - 0.333) * 3))
      else pen.glass(P.circle(x0 + L, yU, 3.2), 0.3, 2)
      if (e >= 1) pen.fill(P.circle(x0 + L * ratio, yL, 2.8 + 3 * flare(t - 3.25)), NC, 0.8 + 0.2 * flare(t - 3.25))
      else pen.glass(P.circle(x0 + L * ratio, yL, 3.2), 0.3, 2)
      // the room's light, cast by what is lit
      const litAmount = (uU + uL + p * o.rise) / (2 + o.rise)
      wash(pen, NA, xL, 0.5 * h, narrow ? 0.6 * w : framed ? 0.45 * w : 0.5 * w, narrow ? 0.6 * w : 0.5 * h, (narrow ? 0.04 : 0.045) * litAmount * breath(t, 5.7, 0.06))
      if (!narrow && p > 0) wash(pen, NC, xL + (L * o.rise * p) / 2, yL, 0.16 * w, 0.16 * w, 0.07 * p * (0.88 + 0.08 * Math.sin(1.7 * t + 1)))
      if (e > 0.3) drawMotes(pen, dust, t, box, clamp01((e - 0.3) / 0.3), 14)
      void hb
    },
  }
}
