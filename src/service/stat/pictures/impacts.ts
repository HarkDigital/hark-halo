import { NC, P, WHITE, rgba, strike } from '../../scenes/kit'
import type { Builder } from '../picture'
import { TAU, breath, clamp01, hash, wash } from './lib'

/*
 * 94: HAIL ON THE GLASS (../PICTURES.md). A sheet of dark glass standing
 * right of centre, and the day's attacks hitting it: each a white-hot strike
 * with a short purple splash and a ring on the glass, leaving a purple ember
 * where it landed. The embers are the number (one per attack, the count is
 * the value), so the eased count makes a hailstorm that slows to single hits.
 * Nothing gets through: the glass stays dark. Afterwards the embers breathe,
 * a cold glint crosses the pane, a stray spark now and then drifts in from
 * the right and dies at the glass, and the hand glints the glass and warms
 * the embers near it.
 */
interface Hit {
  x: number
  y: number
  order: number
  seed: number
}
export const impacts: Builder<{ kind: 'impacts' }> = (_o, value) => {
  const n = Math.max(1, Math.round(Number(value)) || 1)
  let x0 = 0, y0 = 0, pw = 1, ph = 1
  let pane = new Path2D()
  let hits: Hit[] = []
  let narrow = false, framed = false
  let W = 1, H = 1
  const splashR = () => (narrow ? 12 : 20)

  return {
    lead: [1, 1],
    dur: 3000,
    init(w, h, env) {
      W = w
      H = h
      narrow = env.narrow
      framed = env.framed
      if (env.mode === 'wide') {
        x0 = env.copyX + 0.08 * w
        pw = 0.92 * w - x0
        ph = 0.62 * h
      } else if (framed) {
        pw = 0.72 * w
        ph = 0.68 * h
        x0 = 0.5 * w - pw / 2
      } else {
        pw = 0.84 * w
        ph = 0.72 * h
        x0 = 0.5 * w - pw / 2
      }
      y0 = 0.5 * h - ph / 2
      pane = P.rect(x0, y0, pw, ph)
      // the hits: n seeded places on the pane, none too near another, in a seeded order (attacks come from anywhere)
      const pts: [number, number][] = []
      const gap = Math.max(8, Math.sqrt((pw * ph) / n) * 0.45)
      let k = 1
      while (pts.length < n && k < 40000) {
        const u = hash(k * 3 + 0.1), v = hash(k * 3 + 0.2)
        k++
        const x = x0 + 14 + u * (pw - 28), y = y0 + 14 + v * (ph - 28)
        if (pts.every(([a, b]) => Math.hypot(a - x, b - y) >= gap * (k > 20000 ? 0.5 : 1))) pts.push([x, y])
      }
      hits = pts.map(([x, y], i) => ({ x, y, order: hash(i * 7 + 0.3), seed: i }))
      hits.sort((a, b) => a.order - b.order)
      hits.forEach((hit, i) => (hit.order = i))
    },
    frame(pen, w, h, p, e, t, pointer) {
      const { ctx, glow } = pen
      const k = Math.floor(p * n + 1e-6)
      const warm = 0.08 + 0.06 * clamp01(e / 0.08)
      // the glass: a faint body, a hairline edge, a fixed sheen down its left third
      ctx.fillStyle = rgba(WHITE, 0.015)
      ctx.fill(pane)
      pen.glass(pane, warm, 4)
      const sh = ctx.createLinearGradient(x0, y0, x0 + 0.4 * pw, y0 + ph)
      sh.addColorStop(0, rgba(WHITE, 0))
      sh.addColorStop(0.5, rgba(WHITE, 0.02))
      sh.addColorStop(1, rgba(WHITE, 0))
      ctx.fillStyle = sh
      ctx.fill(pane)
      // the cold glint crossing the pane every ~9 s, and the hand's glint on the glass
      ctx.save()
      ctx.clip(pane)
      if (e >= 1) {
        const c = ((t - 3.25) % 9) / 9
        if (c > 0 && c < 0.25) {
          const gx = x0 - 0.3 * pw + (c / 0.25) * 1.6 * pw
          const gg = ctx.createLinearGradient(gx - 0.12 * pw, 0, gx + 0.12 * pw, 0)
          gg.addColorStop(0, rgba(WHITE, 0))
          gg.addColorStop(0.5, rgba(WHITE, 0.045))
          gg.addColorStop(1, rgba(WHITE, 0))
          ctx.fillStyle = gg
          ctx.fillRect(gx - 0.12 * pw, y0, 0.24 * pw, ph)
        }
      }
      let near = 0
      if (pointer.inside) {
        const dx = Math.max(0, Math.abs(pointer.x - (x0 + pw / 2)) - pw / 2), dy = Math.max(0, Math.abs(pointer.y - (y0 + ph / 2)) - ph / 2)
        const d = Math.hypot(dx, dy)
        if (d < 160) near = 1 - d / 160
        if (near > 0) {
          const rg = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 120)
          rg.addColorStop(0, rgba(WHITE, 0.06 * near))
          rg.addColorStop(1, rgba(WHITE, 0))
          ctx.fillStyle = rg
          ctx.fillRect(pointer.x - 120, pointer.y - 120, 240, 240)
        }
      }
      ctx.restore()
      if (k <= 0 && p * n <= 0) return
      // the hits: a landed one is an ember; the one mid-strike flashes; a just-landed one splashes
      const slot = Math.floor(t / 4.1)
      const flick = e >= 1 && k > 0 ? Math.floor(hash(slot + 0.7) * k) : -1
      for (const hit of hits) {
        const i = hit.order
        if (i > k) continue
        const u = p * n - i
        if (u <= 0) continue
        let hand = 0
        if (pointer.inside) {
          const d = Math.hypot(pointer.x - hit.x, pointer.y - hit.y)
          if (d < 120) hand = 1 - d / 120
        }
        if (i === k) {
          // mid-strike: a white-hot point swelling in, the splash about to break
          const r = 1.6 + 4 * Math.pow(u, 0.5)
          pen.fill(P.circle(hit.x, hit.y, r), WHITE, Math.min(1, 0.5 + u))
          continue
        }
        // landed: age since it landed, from the eased clock inverted (the last hit ages on t)
        const ei = 1 - Math.pow(1 - (i + 1) / n, 1 / 3)
        const age = Math.max(0, (e - ei) * 3 + (e >= 1 ? Math.max(0, t - 3.25) : 0))
        if (age < 0.4) {
          // the splash: a white-hot flash, short purple streaks, a ring on the glass
          const f = 1 - age / 0.4
          pen.fill(P.circle(hit.x, hit.y, 1.6 + 4.5 * f), WHITE, f)
          const nS = narrow ? 4 : 6
          for (let s = 0; s < nS; s++) {
            const a = hash(hit.seed * 11 + s) * TAU
            const L = splashR() * (0.6 + 0.6 * hash(hit.seed * 13 + s)) * (0.3 + 0.7 * (1 - f))
            pen.streak(hit.x, hit.y, hit.x + L * Math.cos(a), hit.y + L * Math.sin(a), NC, 0.9 * f, 1.4)
          }
          ctx.save()
          ctx.clip(pane)
          pen.glass(P.circle(hit.x, hit.y, 4 + 26 * (1 - f)), 0.3 * f, 2)
          ctx.restore()
        }
        // the ember it leaves: purple, breathing, warmer under the hand
        let on = 0.72 * breath(t, 2.2 + 2.6 * hash(hit.seed + 0.5), 0.08, hash(hit.seed + 0.9) * TAU)
        if (i === flick && t - slot * 4.1 < 0.08) on *= 0.4
        on = Math.min(1, on * (1 + 0.6 * hand) + 0.3 * Math.max(0, 1 - age / 0.4))
        pen.fill(P.circle(hit.x, hit.y, (narrow ? 1.5 : 2) * (1 + 0.4 * hand)), NC, on)
        glow.fillStyle = rgba(NC, 0.32 * on)
        glow.beginPath()
        glow.arc(hit.x, hit.y, narrow ? 5 : 8, 0, TAU)
        glow.fill()
      }
      // a stray spark now and then drifts in from the right and dies at the glass: nothing gets through
      if (e >= 1 && !narrow) {
        const cyc = 6.3
        const c = ((t - 3.25) % cyc) / cyc
        const which = Math.floor((t - 3.25) / cyc)
        if (c > 0.1 && c < 0.6) {
          const q = (c - 0.1) / 0.5
          const yS = y0 + (0.15 + 0.7 * hash(which + 0.33)) * ph
          const xS = w + 10 - (w + 10 - (x0 + pw)) * q
          const a = q < 0.85 ? 0.5 : 0.5 * (1 - (q - 0.85) / 0.15)
          pen.streak(xS + 30, yS, xS, yS, NC, a, 1.2)
        }
      }
      // the room's light: purple from the embers, pooling on the floor under the pane
      const lit = k / n
      wash(pen, NC, x0 + pw / 2, y0 + ph / 2, narrow ? 0.6 * w : 0.45 * w, narrow ? 0.6 * w : 0.45 * w, 0.05 * lit * breath(t, 5.1, 0.06))
      if (!narrow) wash(pen, NC, x0 + pw / 2, y0 + ph, 0.4 * pw, 0.05 * h, 0.12 * lit)
      void W, void H, void h
    },
  }
}
