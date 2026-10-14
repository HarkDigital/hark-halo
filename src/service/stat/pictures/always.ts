import { NA, NB, P, WHITE, rgba, strike } from '../../scenes/kit'
import type { Builder, Label } from '../picture'
import { TAU, breath, clamp01, clock, easeOut, glint, hash, hot, moteAt, motes, smooth, wash, type Mote } from './lib'

/*
 * 24/7: SEVEN DAYS LIT (../PICTURES.md). Seven level glass tubes stacked in
 * dark air, one per day, Monday at the top, each lit blue from electrode to
 * electrode by a strike that cascades down the stack; "24/7" strikes as the
 * seventh front reaches its cap. One white-hot green bead creeps along
 * today's tube at the viewer's own hour, the only live data (lib.ts's clock,
 * read every frame: at midnight it simply moves to the next tube). Afterwards
 * the tubes breathe out of phase, one wavers at a time, dust drifts out
 * through the top, and the hand warms the lit glass.
 */
const REST = 0.78
export const always: Builder<{ kind: 'always' }> = () => {
  let x0 = 0, x1 = 1, L = 1
  let ys: number[] = []
  let wt = 2.8
  let sleeves = new Path2D(), collars = new Path2D(), points = new Path2D()
  let gas: Path2D[] = []
  let wide = false, narrow = false
  let dust: Mote[] = []
  let box: [number, number, number, number] = [0, 0, 1, 1]
  let W = 1, H = 1

  return {
    lead: [0.5, 0.5],
    dur: 2400,
    live: true,
    key: (_p, e) => e >= 0.78,
    init(w, h, env) {
      W = w
      H = h
      wide = env.mode === 'wide'
      narrow = env.narrow
      x0 = wide ? env.copyX + 0.07 * w : narrow ? 0.09 * w : 0.14 * w
      x1 = wide ? Math.min(0.92 * w, w - 112) : narrow ? 0.91 * w : 0.86 * w
      L = x1 - x0
      const [yt, yb] = narrow ? [0.17 * h, 0.83 * h] : wide ? [0.21 * h, 0.79 * h] : [0.2 * h, 0.8 * h]
      ys = Array.from({ length: 7 }, (_, i) => yt + ((yb - yt) * i) / 6)
      wt = narrow ? 2 : wide ? 2.8 : 2.4
      const g = wt * 4.3, c = wt * 8.6, pr = wt * 0.57
      sleeves = new Path2D()
      collars = new Path2D()
      points = new Path2D()
      gas = []
      for (const y of ys) {
        sleeves.moveTo(x0 - g, y)
        sleeves.lineTo(x1 + g, y)
        collars.moveTo(x0 - c, y)
        collars.lineTo(x0 - g, y)
        collars.moveTo(x1 + g, y)
        collars.lineTo(x1 + c, y)
        for (const x of [x0 - c - 2, x1 + c + 2]) {
          points.moveTo(x + pr, y)
          points.arc(x, y, pr, 0, TAU)
        }
        gas.push(P.line(x0, y, x1, y))
      }
      box = [0, 0, w, h]
      dust = motes(narrow ? 8 : wide ? 12 : 10, 247, box, [5, 9], [-6, -3])
      if (narrow) return
      const labels: Label[] = [
        { text: 'Mon', x: x0 - 44, y: ys[0] - 5, align: 'right' },
        { text: 'Sun', x: x0 - 44, y: ys[6] - 5, align: 'right' },
        { text: '24:00', x: x1 + 44, y: ys[0] - 5 },
      ]
      return labels
    },
    frame(pen, w, h, _p, e, t, pointer) {
      const { ctx, glow } = pen
      const wake = clamp01(e / 0.04)
      // the glass: sleeves, collars, cold electrode points
      pen.glass(sleeves, 0.14 + 0.03 * wake, wt * 3.4)
      pen.glass(collars, 0.22, wt * 5.4)
      ctx.fillStyle = rgba(WHITE, 0.3 + 0.1 * wake)
      ctx.fill(points)
      const levels: number[] = []
      const roomBreath = breath(t, 5.5, 0.04)
      // the hiccup: one settled tube at a time, 70 ms every 5.3 s
      const k5 = Math.floor(t / 5.3)
      const hic = e >= 1 ? Math.floor(7 * hash(k5)) : -1
      const hicAt = 0.4 + 4.4 * hash(k5 + 0.5)
      for (let i = 0; i < 7; i++) {
        const y = ys[i]
        const q = 0.01 + 0.065 * i, s = q + 0.05, a = s + 0.33
        // the pulse of current arriving from under the number (wide only)
        if (wide && e >= q && e < s) {
          const xh = 0.2 * w + (x0 - 26 - 0.2 * w) * ((e - q) / 0.05)
          pen.streak(xh - 64, y, xh, y, WHITE, 0.5, 1.4)
        }
        if (e < s) {
          levels.push(0)
          continue
        }
        const age = (e - s) * 2.4
        // the left electrode flares as the gas starts
        const fl = Math.max(0, 1 - age / 0.3)
        pen.fill(P.circle(x0 - wt * 8.6 - 2, y, wt * 0.57 + 1.6 * fl), WHITE, 0.5 + 0.5 * fl)
        if (wide) wash(pen, NB, x0 - 26, y, 0.15 * w, 0.15 * w, 0.12 * Math.max(0, 1 - age / 0.5))
        let level: number
        if (e < a) {
          // the front runs, its core 72 ms behind, a white head leading
          const u = easeOut((e - s) / 0.33)
          const uc = easeOut((e - s - 0.03) / 0.33)
          const xf = x0 + L * u, xc = x0 + L * Math.max(0, uc)
          glow.lineWidth = wt * 2.6
          glow.strokeStyle = rgba(NB, 0.72)
          glow.beginPath()
          glow.moveTo(x0, y)
          glow.lineTo(xf, y)
          glow.stroke()
          ctx.lineWidth = wt
          ctx.strokeStyle = rgba(NB, 0.576)
          ctx.beginPath()
          ctx.moveTo(x0, y)
          ctx.lineTo(xf, y)
          ctx.stroke()
          if (uc > 0) {
            ctx.lineWidth = wt * 0.4
            ctx.strokeStyle = rgba(hot(NB), 0.72)
            ctx.beginPath()
            ctx.moveTo(x0, y)
            ctx.lineTo(xc, y)
            ctx.stroke()
          }
          pen.fill(P.circle(xf, y, 2.4), WHITE, 1)
          level = 0.6
          levels.push(level * u)
          continue
        }
        // the cap: a right flare, a visible catch (never a blackout), a settle to rest
        const ageA = (e - a) * 2.4 + Math.max(0, t - 0.25 - 2.4)
        const fr = Math.max(0, 1 - ageA / 0.3)
        pen.fill(P.circle(x1 + wt * 8.6 + 2, y, wt * 0.57 + 1.6 * fr), WHITE, 0.5 + 0.5 * fr)
        if (ageA < 0.42) level = 0.55 + 0.45 * strike(ageA, i + 1)
        else if (ageA < 0.77) level = REST + (1 - REST) * (1 - smooth((ageA - 0.42) / 0.35))
        else level = REST
        // idle: breath, gas noise, the hiccup, the hand
        level *= breath(t, 4 + 0.37 * i, 0.05, 1.9 * i)
        level *= 1 + 0.02 * (2 * hash(Math.floor(24 * t) + 31 * i) - 1)
        if (i === hic && t - k5 * 5.3 >= hicAt && t - k5 * 5.3 < hicAt + 0.07) level *= 0.86
        let near = 0
        if (pointer.inside && pointer.x >= x0 - 40 && pointer.x <= x1 + 40) near = Math.max(0, 1 - Math.abs(pointer.y - y) / 160)
        level = Math.min(1, level + 0.2 * near)
        pen.neon(gas[i], NB, level, wt)
        if (near > 0.05) {
          glow.globalAlpha = 0.3 * near
          glow.fillStyle = rgba(NB, 1)
          glow.fillRect(pointer.x - 120, y - 12, 240, 24)
          glow.globalAlpha = 1
        }
        levels.push(level)
      }
      // the cold highlight on the nearest lit sleeve
      if (pointer.inside) {
        let best = -1, bd = 1e9
        levels.forEach((lv, i) => {
          const d = Math.abs(pointer.y - ys[i])
          if (lv > 0.3 && d < bd) (bd = d), (best = i)
        })
        if (best >= 0 && bd < 160 && pointer.x >= x0 - 40 && pointer.x <= x1 + 40) glint(pen, pointer.x - 35, ys[best] - 3, pointer.x + 35, ys[best] - 3, 0.5 * (1 - bd / 160))
      }
      // the room's light, cast by the lit tubes
      const mean = levels.reduce((s, v) => s + v, 0) / 7
      wash(pen, NB, wide ? 0.72 * w : 0.5 * w, 0.5 * h, wide ? 0.55 * w : narrow ? 0.7 * w : 0.5 * w, wide ? 0.55 * w : narrow ? 0.7 * w : 0.5 * w, (narrow ? 0.05 : wide ? 0.035 : 0.03) * mean * roomBreath)
      // the bead: a human on watch, at the viewer's hour on today's tube (from a beat after the word);
      // the clock is read here, every frame, so it creeps in real time and never drifts from the
      // band's own t across the minute rebuild
      if (e >= 0.82) {
        const ageB = t - (0.25 + 0.82 * 2.4)
        const now = new Date(clock())
        const hr = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600 + now.getMilliseconds() / 3.6e6
        const d = (now.getDay() + 6) % 7
        const xb = x0 + (L * hr) / 24, yb = ys[d]
        let on = strike(ageB, 9) * (0.85 + 0.15 * (0.5 + 0.5 * Math.sin((TAU * t) / 2.6)))
        let r = (narrow ? 2.6 : 3.4) + 2.6 * Math.max(0, 1 - ageB / 0.4) + 0.5 * (0.5 + 0.5 * Math.sin((TAU * t) / 2.6))
        let bloom = 1
        if (pointer.inside) {
          const dd = Math.hypot(pointer.x - xb, pointer.y - yb)
          if (dd < 160) {
            const k = 1 - dd / 160
            on = 1
            r *= 1 + 0.5 * k
            bloom = 1 + k
          }
        }
        wash(pen, NA, xb, yb, 36, 36, 0.5 * on * bloom)
        pen.fill(P.circle(xb, yb, r), NA, on)
        ctx.fillStyle = rgba(WHITE, on)
        ctx.beginPath()
        ctx.arc(xb, yb, narrow ? 1.5 : 2, 0, TAU)
        ctx.fill()
      }
      // dust, drifting up and to the right, out through the top hairline; brighter in a tube's light
      ctx.beginPath()
      const bright = new Path2D()
      for (const m of dust) {
        const [x, y] = moteAt(m, t, box, 6)
        const nearTube = x >= x0 && x <= x1 && ys.some((yy, i) => levels[i] > 0.3 && Math.abs(yy - y) < 10)
        if (nearTube) {
          bright.moveTo(x + 0.7, y)
          bright.arc(x, y, 0.7, 0, TAU)
        } else {
          ctx.moveTo(x + 0.7, y)
          ctx.arc(x, y, 0.7, 0, TAU)
        }
      }
      ctx.fillStyle = rgba(WHITE, 0.1)
      ctx.fill()
      ctx.fillStyle = rgba(WHITE, 0.2)
      ctx.fill(bright)
      void W, void H
    },
  }
}
