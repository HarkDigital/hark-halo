import { NA, NB, NC, P, WHITE, rgba, strike, type RGB, type Scene } from '../../service/scenes/kit'
import { MARK, markFrame, markLength, markOutline, markPointAt } from '../logo'

/*
 * STRUCK: the mark as three neon tubes in glass sleeves. The sleeves stand
 * unlit; an electrode flares on loop A and the gas runs round it behind a
 * white-hot head, the core lagging; loop B follows, then the diamond; each
 * stutters on as its circuit closes. The sign dwells, breathing, with a rare
 * hiccup, then the gas drains back the way it came and it strikes again.
 * The cursor warms the tube nearest it and the bloom leans toward the hand.
 */
const CYCLE = 11 // seconds: strike, dwell, drain
const TUBES: { i: number; c: RGB; start: number; run: number; seed: number }[] = [
  { i: 0, c: NA, start: 0.3, run: 1.6, seed: 3 },
  { i: 1, c: NB, start: 1.2, run: 1.6, seed: 5 },
  { i: 2, c: NC, start: 2.6, run: 0.5, seed: 7 },
]
export default function tubeDraw(): Scene {
  let cx = 0, cy = 0, size = 100, s = 1
  let outline: [number, number][][] = []
  const lengths: number[] = []
  let lean = [0, 0]

  return {
    init(w, h) {
      size = Math.min(h * 0.72, w * 0.6)
      cx = w / 2
      cy = h / 2
      s = size / MARK.h
      outline = markOutline(240)
      for (let i = 0; i < 3; i++) lengths[i] = markLength(i)
    },
    frame(pen, w, h, pointer, dt, t) {
      const { ctx, glow } = pen
      const tc = t % CYCLE
      const drain = tc > CYCLE - 1.6 ? (tc - (CYCLE - 1.6)) / 1.6 : 0
      // the hand, in mark units, and the tube nearest it
      const mx = (pointer.x - (cx - (MARK.w * s) / 2)) / s, my = (pointer.y - (cy - (MARK.h * s) / 2)) / s
      let nearI = -1, nearD = Infinity
      if (pointer.inside) {
        outline.forEach((pts, i) => {
          for (const [x, y] of pts) {
            const d = Math.hypot(x - mx, y - my) * s
            if (d < nearD) (nearD = d), (nearI = i)
          }
        })
      }
      const near = nearD < 160 ? 1 - nearD / 160 : 0
      // the bloom leans toward the hand
      const want = pointer.inside ? [Math.max(-8, Math.min(8, (pointer.x - cx) * 0.02)), Math.max(-8, Math.min(8, (pointer.y - cy) * 0.02))] : [0, 0]
      lean = [lean[0] + (want[0] - lean[0]) * Math.min(1, 4 * dt), lean[1] + (want[1] - lean[1]) * Math.min(1, 4 * dt)]
      ctx.save()
      glow.save()
      glow.translate(lean[0], lean[1])
      markFrame(ctx, cx, cy, size)
      markFrame(glow, cx, cy, size)
      const W = (px: number) => px / s
      // the glass sleeves, always; a cold glint on the nearest unlit sleeve
      for (let i = 0; i < 3; i++) pen.glass(MARK.all[i], 0.16 + (i === nearI ? 0.14 * near : 0), W(9))
      for (const tb of TUBES) {
        const L = lengths[tb.i]
        const path = MARK.all[tb.i]
        // how far the gas has run: the strike, then the drain back
        let run = Math.max(0, Math.min(1, (tc - tb.start) / tb.run))
        run = 1 - Math.pow(1 - run, 2.2)
        if (drain > 0) run = Math.min(run, 1 - drain * (1 + 0.3 * tb.i))
        if (run <= 0) continue
        const age = tc - tb.start - tb.run
        let on = age >= 0 ? (age < 0.42 ? 0.45 + 0.55 * strike(age, tb.seed) : 1) : 0.9
        if (age >= 0.42) {
          on *= 1 + 0.05 * Math.sin((2 * Math.PI * t) / (4.2 + tb.i)) // breath
          const slot = Math.floor(t / 5.3)
          if (Math.floor((Math.sin(slot * 12.9898) * 43758.5453) % 1 * 3 + 3) % 3 === tb.i && t - slot * 5.3 < 0.06) on *= 0.55 // hiccup
        }
        if (drain > 0) on *= 1 - 0.3 * drain
        on = Math.min(1.2, on * (1 + (tb.i === nearI ? 0.35 * near : 0)))
        const wt = W(2.6) * (1 + (tb.i === nearI ? 0.3 * near : 0))
        // the glow and colour to the front, the white-hot core a little behind
        const front = L * run
        const core = Math.max(0, front - L * 0.04 * (age < 0 ? 1 : Math.max(0, 1 - age / 0.3)))
        glow.setLineDash([front, L * 2])
        glow.lineWidth = wt * 2.6
        glow.strokeStyle = rgba(tb.c, on)
        glow.stroke(path)
        ctx.setLineDash([front, L * 2])
        ctx.lineWidth = wt
        ctx.strokeStyle = rgba(tb.c, on * 0.8)
        ctx.stroke(path)
        ctx.setLineDash([core, L * 2])
        ctx.lineWidth = Math.max(W(0.7), wt * 0.4)
        ctx.strokeStyle = rgba([tb.c[0] + (255 - tb.c[0]) * 0.62, tb.c[1] + (255 - tb.c[1]) * 0.62, tb.c[2] + (255 - tb.c[2]) * 0.62], on)
        ctx.stroke(path)
        ctx.setLineDash([])
        glow.setLineDash([])
        // the electrode where the gas enters, and the head while it runs
        const [ex, ey] = markPointAt(tb.i, 0)
        const flare = age < 0 ? 1 : Math.max(0, 1 - age / 0.4)
        pen.fill(P.circle(ex, ey, W(2.4 + 3 * flare)), WHITE, 0.6 + 0.4 * flare)
        if (run < 0.999) {
          const [hx, hy] = markPointAt(tb.i, front)
          pen.fill(P.circle(hx, hy, W(3.2)), WHITE, 1)
        }
      }
      ctx.restore()
      glow.restore()
      // the room's light, from the lit sign
      const lit = TUBES.reduce((a, tb) => a + Math.max(0, Math.min(1, (tc - tb.start) / tb.run)), 0) / 3
      const g = glow.createRadialGradient(cx + lean[0] * 3, cy + lean[1] * 3, 0, cx, cy, size * 0.9)
      g.addColorStop(0, rgba(NA, 0.08 * lit * (1 - 0.5 * drain)))
      g.addColorStop(1, rgba(NA, 0))
      glow.fillStyle = g
      glow.fillRect(0, 0, w, h)
    },
  }
}
