import { NA, P, WHITE, rgba, strike } from '../../scenes/kit'
import type { Builder } from '../picture'
import { TAU, breath, clamp01, hash, hot, wash } from './lib'

/*
 * 43%: THE REED BED (../PICTURES.md). A hundred thin stalks of glass standing
 * in a dark field right of centre, `share` of them lit green from the floor
 * to a white-hot tip, the whole bed swaying in a slow wind. The lit stalks
 * are the number: a seeded 43 light in a seeded order as the count runs,
 * each from the floor up. The hand parts the reeds; the scroll sends a gust
 * through them. Nothing is counted but stalks.
 */
interface Stalk {
  x: number
  d: number
  h: number
  w: number
  lit: number // its index in the lit order, or -1
  seed: number
  ph: number
}
export const reeds: Builder<{ kind: 'reeds'; share: number; of: number }> = o => {
  let bed: Stalk[] = []
  let yF = 0
  let narrow = false
  let gust = 0, lean = 0
  let W = 1, H = 1
  let part: Float32Array = new Float32Array(0)

  return {
    lead: [0, 0],
    dur: 2800,
    init(w, h, env) {
      W = w
      H = h
      narrow = env.narrow
      yF = narrow ? 0.86 * h : env.framed ? 0.86 * h : 0.84 * h
      const [x0, x1] = narrow ? [0.05 * w, 0.95 * w] : env.framed ? [0.08 * w, 0.92 * w] : [env.copyX + 0.08 * w, 0.96 * w]
      const minGap = (0.5 * (x1 - x0)) / o.of
      const xs: number[] = []
      let k = 1
      while (xs.length < o.of && k < 20000) {
        const x = x0 + hash(k * 3 + 0.17) * (x1 - x0)
        k++
        if (xs.every(a => Math.abs(a - x) >= minGap * (k > 10000 ? 0.4 : 1))) xs.push(x)
      }
      bed = xs.map((x, i) => {
        const d = hash(i * 5 + 0.31)
        const tall = narrow ? 0.25 + 0.35 * (1 - d) : 0.3 + 0.38 * (1 - d)
        return { x, d, h: tall * h * (0.85 + 0.3 * hash(i * 5 + 0.32)), w: (1.4 + 1.6 * (1 - d)) * (narrow ? 0.8 : 1), lit: -1, seed: i, ph: hash(i * 5 + 0.33) * TAU }
      })
      // which are lit: a seeded subset of exactly `share`, in a seeded order
      const order = bed.map((_, i) => i).sort((a, b) => hash(a * 7 + 0.5) - hash(b * 7 + 0.5))
      order.slice(0, o.share).forEach((i, k2) => (bed[i].lit = k2))
      // far to near
      bed.sort((a, b) => a.d > b.d ? -1 : 1)
      part = new Float32Array(bed.length)
      gust = 0
      lean = 0
    },
    frame(pen, w, h, p, e, t, pointer, dt) {
      const { ctx } = pen
      const k = Math.floor(p * o.share + 1e-6)
      // the floor
      const fg = ctx.createLinearGradient(0, 0, w, 0)
      fg.addColorStop(0, rgba(WHITE, 0))
      fg.addColorStop(0.3, rgba(WHITE, 0.08))
      fg.addColorStop(1, rgba(WHITE, 0.08))
      ctx.strokeStyle = fg
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, yF)
      ctx.lineTo(w, yF)
      ctx.stroke()
      // the wind, and the gust the scroll sends through the bed (easing back over a second)
      const wantGust = 4 * clamp01(Math.abs(pointer.scrollV))
      gust += (wantGust - gust) * Math.min(1, (wantGust > gust ? 10 : 1.2) * dt)
      const wantLean = 16 * Math.max(-1, Math.min(1, pointer.scrollV))
      lean += (wantLean - lean) * Math.min(1, (Math.abs(wantLean) > Math.abs(lean) ? 10 : 1.2) * dt)
      const omega = 0.9 * (1 + gust / 4)
      const kx = TAU / (0.5 * w)
      let litAll = 0
      const flickSlot = Math.floor(t / 1.8)
      const flick = e >= 1 && k > 0 ? Math.floor(hash(flickSlot + 0.9) * k) : -1
      bed.forEach((s, i) => {
        const A = (10 + 12 * (1 - s.d)) * (1 + gust)
        let sway = A * Math.sin(omega * t - kx * s.x + s.ph) + 0.3 * A * Math.sin(2.3 * omega * t + s.ph) + lean * (1 - 0.5 * s.d)
        // the hand parts the reeds: stalks near the pointer bend away, the bed closing behind it
        let want = 0
        let near = 0
        if (pointer.inside && !pointer.coarse) {
          const dx = s.x - pointer.x
          const dy = Math.max(0, Math.abs(pointer.y - (yF - s.h * 0.5)) - s.h * 0.5)
          const d = Math.hypot(dx, dy)
          if (d < 200) {
            near = 1 - d / 200
            const g = near * near * (3 - 2 * near)
            want = Math.sign(dx || 1) * 38 * g * (1 - 0.5 * s.d)
          }
        }
        part[i] += (want - part[i]) * Math.min(1, 6 * dt)
        sway += part[i]
        const tipX = s.x + sway, tipY = yF - s.h
        const stalk = new Path2D()
        stalk.moveTo(s.x, yF)
        stalk.quadraticCurveTo(s.x + 0.3 * sway, yF - 0.55 * s.h, tipX, tipY)
        // the glass, lit or not; the hand low in the bed glints the dark stalks it touches
        pen.glass(stalk, 0.1 + 0.06 * (1 - s.d) + (near > 0 && pointer.y > tipY ? 0.2 * near : 0), 2 + s.w * 0.6)
        if (s.lit < 0) return
        const u = p * o.share - s.lit
        if (u <= 0) return
        let on: number
        let rise = 1
        if (u < 1) {
          rise = u
          on = 0.9
        } else {
          const age = (u - 1) * 0.5 + (e >= 1 ? Math.max(0, t - 3.05) : 0)
          on = age < 0.42 ? 0.35 + 0.65 * strike(age, s.seed) : 1
          on *= breath(t, 3 + 2 * hash(s.seed + 0.4), 0.06, s.ph)
          if (s.lit === flick && t - flickSlot * 1.8 < 0.06) on *= 0.5
        }
        on = Math.min(1.2, on * (1 + 0.3 * near))
        litAll += on
        if (rise < 1) {
          // the gas runs from the floor to the tip, its core a little behind, a white head leading
          const L = s.h * 1.05
          ctx.setLineDash([L * rise, L * 2])
          pen.glow.setLineDash([L * rise, L * 2])
          pen.glow.lineWidth = s.w * 0.9 * 2.6
          pen.glow.strokeStyle = rgba(NA, on)
          pen.glow.stroke(stalk)
          ctx.lineWidth = s.w * 0.9
          ctx.strokeStyle = rgba(NA, on * 0.8)
          ctx.stroke(stalk)
          ctx.setLineDash([L * Math.max(0, rise - 0.15), L * 2])
          ctx.lineWidth = Math.max(0.7, s.w * 0.36)
          ctx.strokeStyle = rgba(hot(NA), on)
          ctx.stroke(stalk)
          ctx.setLineDash([])
          pen.glow.setLineDash([])
          // the head: a point along the curve
          const q = rise
          const hx = (1 - q) * (1 - q) * s.x + 2 * (1 - q) * q * (s.x + 0.3 * sway) + q * q * tipX
          const hy = (1 - q) * (1 - q) * yF + 2 * (1 - q) * q * (yF - 0.55 * s.h) + q * q * tipY
          pen.fill(P.circle(hx, hy, 2.2), WHITE, 1)
        } else {
          pen.neon(stalk, NA, on, s.w * 0.9)
          // the tip: a white-hot bead, twinkling
          pen.fill(P.circle(tipX, tipY, (1.2 + 1.2 * (1 - s.d)) * (0.9 + 0.1 * Math.sin(5 * t + s.ph))), NA, Math.min(1, on))
          wash(pen, NA, s.x, yF, 18, 5, 0.1 * on)
        }
      })
      // the room's light from the bed, and dust low over the floor
      wash(pen, NA, narrow ? 0.5 * w : 0.68 * w, yF - 0.2 * h, narrow ? 0.6 * w : 0.5 * w, 0.4 * h, 0.05 * (k / o.share) * breath(t, 5.3, 0.06))
      if (!narrow && k > 0) {
        ctx.beginPath()
        for (let m = 0; m < 12; m++) {
          const x = ((hash(m + 0.61) * w + 8 * t * (0.5 + hash(m + 0.62))) % (0.6 * w)) + 0.38 * w
          const y = yF - 6 - 30 * hash(m + 0.63) - 4 * Math.sin(1.3 * t + m)
          ctx.moveTo(x + 0.8, y)
          ctx.arc(x, y, 0.8, 0, TAU)
        }
        ctx.fillStyle = rgba(WHITE, 0.14 * (k / o.share))
        ctx.fill()
      }
      void litAll, void W, void H
    },
  }
}
