import { NA, P, WHITE, mix, rgba, strike, type RGB } from '../../scenes/kit'
import type { Builder, Label } from '../picture'
import { breath, clamp01, drawMotes, hash, hot, motes, wash, type Mote } from './lib'

/*
 * 10 years: TEN STANDING TUBES (../PICTURES.md). Ten fat neon tubes standing
 * in a row on a mirror floor, like a light installation: one per year, all the
 * same height. Tube k rises while the count runs k-1 to k, so the lit row is
 * the number every frame; the tenth, this year, burns a touch whiter. The
 * floor is only what the tubes do to it: a reflection, a pool, a haze. After
 * the strike they breathe, hiccup one at a time, and swell under the hand.
 */
export const years: Builder<{ kind: 'years'; from: number; to: number }> = o => {
  const n = Math.max(1, o.to - o.from)
  let xs: number[] = []
  let yf = 0, yt = 0, Hh = 0, wt = 5
  let narrow = false, framed = false
  let sleeves = new Path2D()
  let beads = new Path2D()
  let dust: Mote[] = []
  let box: [number, number, number, number] = [0, 0, 1, 1]
  let W = 0, Hb = 0, copyX = 0
  const colour = (k: number): RGB => (k === n ? mix(NA, WHITE, 0.3) : NA)

  return {
    lead: [0, 0],
    dur: 2800,
    init(w, h, env) {
      W = w
      Hb = h
      copyX = env.copyX
      narrow = env.narrow
      framed = env.framed
      const [x0, x1] = narrow ? [0.09 * w, 0.91 * w] : framed ? [0.14 * w, 0.86 * w] : [Math.max(0.44 * w, env.copyX + 0.07 * w), 0.93 * w]
      yt = narrow ? 0.14 * h : framed ? 0.2 * h : 0.19 * h
      yf = narrow ? 0.8 * h : framed ? 0.72 * h : 0.73 * h
      Hh = yf - yt
      wt = narrow ? 3.2 : framed ? Math.max(4, Math.min(5.5, h / 85)) : Math.max(5.5, Math.min(7.5, h / 90))
      xs = Array.from({ length: n }, (_, i) => x0 + ((x1 - x0) * i) / Math.max(1, n - 1))
      sleeves = new Path2D()
      beads = new Path2D()
      for (const x of xs) {
        sleeves.moveTo(x, yf - 4)
        sleeves.lineTo(x, yt + 4)
        for (const y of [yt + 8, yf - 8]) {
          beads.moveTo(x + 2.2, y)
          beads.arc(x, y, 2.2, 0, Math.PI * 2)
        }
      }
      box = [x0 - 30, yt, x1 + 30, yf]
      dust = motes(narrow ? 8 : framed ? 14 : 24, 10, box, [-3, 3], [-12, -7])
      const labels: Label[] = narrow
        ? [
            { text: String(o.from), x: xs[0] - 4, y: yf + 12 },
            { text: String(o.to), x: xs[n - 1] + 4, y: yf + 12, align: 'right', hi: true },
          ]
        : [
            { text: String(o.from), x: xs[0] - 12, y: yf - 5, align: 'right' },
            { text: String(o.to), x: xs[n - 1] + 12, y: yf - 5, hi: true },
          ]
      return labels
    },
    frame(pen, w, h, p, e, t, pointer) {
      const { ctx, glow } = pen
      const x10 = p * n
      // the glass and the cold electrode beads: there before any light
      pen.glass(sleeves, 0.16, wt * 3.4)
      ctx.fillStyle = rgba(WHITE, 0.18)
      ctx.fill(beads)
      // the floor haze: a thin breath of green at floor height, under the copy and off the right edge
      if (!narrow && p > 0) {
        const g = glow.createLinearGradient(0, yf - 0.035 * h, 0, yf + 0.05 * h)
        g.addColorStop(0, rgba(NA, 0))
        g.addColorStop(0.41, rgba(NA, (framed ? 0.035 : 0.045) * p * breath(t, 5.5, 0.06)))
        g.addColorStop(1, rgba(NA, 0))
        glow.fillStyle = g
        glow.fillRect(framed ? 0 : 0.28 * w, yf - 0.035 * h, w, 0.085 * h)
      }
      // the hiccup: one tube at a time, the first 70 ms of each 5.3 s window
      const slot = Math.floor(t / 5.3)
      const hic = e >= 1 && t - slot * 5.3 < 0.07 ? Math.floor(hash(slot) * n) : -1
      let litAll = 0
      for (let k = 1; k <= n; k++) {
        const x = xs[k - 1]
        const rise = clamp01(x10 - (k - 1))
        // the cursor: within 160 px of the tube's axis, a cold highlight on the glass even unlit
        let b = 0
        if (pointer.inside) {
          const dx = Math.abs(pointer.x - x)
          const dy = pointer.y < yt ? yt - pointer.y : pointer.y > yf ? pointer.y - yf : 0
          const d = Math.hypot(dx, dy)
          if (d < 160) b = Math.pow(1 - d / 160, 1.5)
        }
        if (b > 0) pen.glass(P.line(x, yf - 4, x, yt + 4), 0.14 * b, wt * 3.4)
        if (rise <= 0) continue
        const c = colour(k)
        // the gas: a stutter as it catches (never below 0.35 once counted), then breath
        let on = rise < 0.4 ? 0.35 + 0.65 * strike((rise / 0.4) * 0.42, k) : 1
        on *= breath(t, 3.6 + 0.3 * k, 0.06, 1.3 * k)
        if (hic === k - 1) on *= t - slot * 5.3 < 0.035 ? 0.55 : 1.15
        on = Math.min(1.2, on + 0.12 * b)
        litAll += on
        const yFront = yf - 4 - rise * (Hh - 8)
        const core = clamp01((rise - 0.15) / 0.85)
        const yCore = yf - 4 - core * (Hh - 8)
        // glow and colour to the front, the white-hot core behind it
        glow.lineWidth = wt * 2.6 * (1 + 1.2 * b)
        glow.strokeStyle = rgba(c, Math.min(1, on * (b > 0 ? 1 : 1)))
        glow.beginPath()
        glow.moveTo(x, yf - 4)
        glow.lineTo(x, yFront)
        glow.stroke()
        ctx.lineWidth = wt
        ctx.strokeStyle = rgba(c, Math.min(1, on * 0.8))
        ctx.beginPath()
        ctx.moveTo(x, yf - 4)
        ctx.lineTo(x, yFront)
        ctx.stroke()
        if (core > 0) {
          ctx.lineWidth = Math.max(0.7, wt * (k === n ? 0.55 : 0.4) * (1 + 0.5 * b))
          ctx.strokeStyle = rgba(k === n ? WHITE : hot(c), Math.min(1, on))
          ctx.beginPath()
          ctx.moveTo(x, yf - 4)
          ctx.lineTo(x, yCore)
          ctx.stroke()
        }
        // the electrodes: the base flares as the tube strikes, the top as the front arrives
        const baseOn = rise < 0.5 ? 1 - rise : 0.3
        pen.fill(P.circle(x, yf - 8, 2.2 + 1.4 * (rise < 0.5 ? 1 - rise * 2 : 0)), WHITE, Math.min(1, baseOn + 0.3))
        if (rise >= 1) {
          const age = Math.max(0, (p * n - k) * 0.5)
          pen.fill(P.circle(x, yt + 8, 2.2 + 1 * Math.max(0, 1 - age / 0.2)), WHITE, 0.3 + 0.7 * Math.max(0, 1 - age / 0.2))
          if (age < 0.12) {
            glow.lineWidth = wt * 4
            glow.strokeStyle = rgba(c, 0.5 * (1 - age / 0.12))
            glow.stroke(P.line(x, yf - 4, x, yt + 4))
          }
        } else pen.fill(P.circle(x, yFront, 3.5), WHITE, Math.min(1, on))
        // the floor: a reflection a beat behind the front, a pool at the foot
        if (!narrow) {
          const lag = clamp01(rise - 0.08)
          const len = (framed ? 0.26 : 0.42) * Hh * lag * (1 + 0.03 * Math.sin(2.1 * t + k)) * (1 + 0.25 * b)
          if (len > 1) pen.streak(x, yf + len, x, yf, c, (framed ? 0.3 : 0.4) * on * (1 + 0.08 * Math.sin(1.7 * t + k)) * (1 + 0.8 * b), wt * 0.8)
        }
        wash(pen, NA, x, yf, wt * (narrow ? 2.5 : 5), wt * 1.1, 0.1 * on)
      }
      // dust rising through the lit tubes' light
      if (litAll > 0) drawMotes(pen, dust, t, box, Math.min(1, litAll / n) * 1.2, 5)
      void W, void Hb, void copyX
    },
  }
}
