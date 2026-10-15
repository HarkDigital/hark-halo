import { NC, P, WHITE, rgba, strike } from '../../scenes/kit'
import type { Builder } from '../picture'
import { TAU, breath, clamp01, hash, wash } from './lib'

/*
 * 94: HAIL ON THE GLASS (../PICTURES.md). A sheet of dark glass standing
 * right of centre, and the day's attacks hitting it: each a white-hot strike
 * with a short purple splash and a ring on the glass, leaving a purple ember
 * where it landed. The embers are the number (one per attack, the count is
 * the value), so the eased count makes a hailstorm that slows to single hits.
 * Nothing gets through: the glass stays dark. Afterwards it never sits still:
 * probes keep flying in and bursting on the glass without leaving an ember,
 * the embers breathe, a cold glint crosses the pane. The hand is a shield
 * (a probe aimed near it fizzes out before the glass) and warms the embers;
 * the scroll tilts the pane in parallax and turns the probes' approach.
 */
interface Hit {
  x: number
  y: number
  order: number
  seed: number
  depth: number
}
interface Probe {
  at: number
  ax: number
  ay: number
  from: number
  dur: number
}
const PROBES = 320
export const impacts: Builder<{ kind: 'impacts' }> = (_o, value) => {
  const n = Math.max(1, Math.round(Number(value)) || 1)
  let x0 = 0, y0 = 0, pw = 1, ph = 1
  let hits: Hit[] = []
  let probes: Probe[] = []
  let probeSpan = 1
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
      hits = pts.map(([x, y], i) => ({ x, y, order: hash(i * 7 + 0.3), seed: i, depth: hash(i * 7 + 0.77) }))
      hits.sort((a, b) => a.order - b.order)
      hits.forEach((hit, i) => (hit.order = i))
      // the probes after the strike: a seeded schedule that wraps (pure in t)
      probes = []
      let at = 0
      for (let i = 0; i < PROBES; i++) {
        at += 0.5 + 0.6 * hash(i * 3 + 0.11)
        probes.push({ at, ax: x0 + 14 + hash(i * 3 + 0.12) * (pw - 28), ay: y0 + 14 + hash(i * 3 + 0.13) * (ph - 28), from: hash(i * 3 + 0.14), dur: 0 })
      }
      probeSpan = at + 1
    },
    frame(pen, w, h, p, e, t, pointer) {
      const { ctx, glow } = pen
      const k = Math.floor(p * n + 1e-6)
      const warm = 0.08 + 0.06 * clamp01(e / 0.08)
      // the parallax: the scroll tilts the pane; embers shift by their depth, the outline by a third
      const px = (pointer.scroll - 0.5) * 30, py = (pointer.scroll - 0.5) * 14
      const ox = x0 + px / 3, oy = y0 + py / 3
      const pane = P.rect(ox, oy, pw, ph)
      // the glass: a faint body, a hairline edge, a sheen down its left third, the scroll's glint
      ctx.fillStyle = rgba(WHITE, 0.015)
      ctx.fill(pane)
      pen.glass(pane, warm, 4)
      ctx.save()
      ctx.clip(pane)
      const sh = ctx.createLinearGradient(ox, oy, ox + 0.4 * pw, oy + ph)
      sh.addColorStop(0, rgba(WHITE, 0))
      sh.addColorStop(0.5, rgba(WHITE, 0.02))
      sh.addColorStop(1, rgba(WHITE, 0))
      ctx.fillStyle = sh
      ctx.fillRect(ox, oy, pw, ph)
      const glintAt = (gx: number, a: number) => {
        const gg = ctx.createLinearGradient(gx - 0.12 * pw, 0, gx + 0.12 * pw, 0)
        gg.addColorStop(0, rgba(WHITE, 0))
        gg.addColorStop(0.5, rgba(WHITE, a))
        gg.addColorStop(1, rgba(WHITE, 0))
        ctx.fillStyle = gg
        ctx.fillRect(gx - 0.12 * pw, oy, 0.24 * pw, ph)
      }
      if (e >= 1) {
        const c = ((t - 3.25) % 9) / 9
        if (c > 0 && c < 0.25) glintAt(ox - 0.3 * pw + (c / 0.25) * 1.6 * pw, 0.045)
      }
      glintAt(ox + pw * clamp01((pointer.scroll - 0.2) / 0.6), 0.035)
      let near = 0
      if (pointer.inside) {
        const dx = Math.max(0, Math.abs(pointer.x - (ox + pw / 2)) - pw / 2), dy = Math.max(0, Math.abs(pointer.y - (oy + ph / 2)) - ph / 2)
        const d = Math.hypot(dx, dy)
        if (d < 160) near = 1 - d / 160
        if (near > 0) {
          const rg = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 120)
          rg.addColorStop(0, rgba(WHITE, 0.07 * near))
          rg.addColorStop(1, rgba(WHITE, 0))
          ctx.fillStyle = rg
          ctx.fillRect(pointer.x - 120, pointer.y - 120, 240, 240)
        }
      }
      ctx.restore()
      // the splash of a strike: a white flash, short purple streaks, a ring on the glass (no ember here)
      const splash = (x: number, y: number, f: number, seed: number, nS: number) => {
        pen.fill(P.circle(x, y, 1.6 + 4.5 * f), WHITE, f)
        for (let s = 0; s < nS; s++) {
          const a = hash(seed * 11 + s) * TAU
          const L = splashR() * (0.6 + 0.6 * hash(seed * 13 + s)) * (0.3 + 0.7 * (1 - f))
          pen.streak(x, y, x + L * Math.cos(a), y + L * Math.sin(a), NC, 0.9 * f, 1.4)
        }
        ctx.save()
        ctx.clip(pane)
        pen.glass(P.circle(x, y, 4 + 26 * (1 - f)), 0.3 * f, 2)
        ctx.restore()
      }
      // the probes: after the strike, sparks fly in and burst on the glass; the hand shields the spot they aim at
      const bursts: [number, number, number][] = []
      if (e >= 1 && !(narrow && framed)) {
        const tp = (t - 3.25) % probeSpan
        const fromTop = pointer.scrollV > 0.05, fromBottom = pointer.scrollV < -0.05
        for (const pr of probes) {
          const age = tp - pr.at
          if (age < 0 || age > 1.6) continue
          const tx = pr.ax + px * hash(pr.at) * 0.5, ty = pr.ay + py * hash(pr.at) * 0.5
          const side = fromTop ? 1 : fromBottom ? 2 : pr.from < 0.6 ? 0 : 1
          const sx = side === 0 ? w + 20 : tx + (pr.from - 0.5) * 0.4 * w, sy = side === 0 ? ty + (pr.from - 0.5) * 0.5 * h : side === 1 ? -20 : h + 20
          const dist = Math.hypot(tx - sx, ty - sy)
          const dur = dist / (600 + 300 * hash(pr.at + 0.2))
          const shielded = pointer.inside && Math.hypot(pointer.x - tx, pointer.y - ty) < 140
          const q = age / dur
          if (q < (shielded ? 0.72 : 1)) {
            const cx = sx + (tx - sx) * q, cy = sy + (ty - sy) * q
            const ux = (tx - sx) / dist, uy = (ty - sy) / dist
            pen.streak(cx - ux * 40, cy - uy * 40, cx, cy, NC, 0.8, 1.3)
            pen.fill(P.circle(cx, cy, 2), WHITE, 0.9)
          } else if (shielded) {
            // turned away: a purple puff short of the glass
            const f = clamp01(1 - (age - dur * 0.72) / 0.3)
            if (f > 0) {
              const cx = sx + (tx - sx) * 0.72, cy = sy + (ty - sy) * 0.72
              wash(pen, NC, cx, cy, 18 + 20 * (1 - f), 18 + 20 * (1 - f), 0.6 * f)
            }
          } else {
            const f = clamp01(1 - (age - dur) / 0.3)
            if (f > 0) {
              splash(tx, ty, f, Math.floor(pr.at * 97), narrow ? 3 : 4)
              bursts.push([tx, ty, f])
            }
          }
        }
      }
      if (k <= 0 && p * n <= 0) return
      // the hits: a landed one is an ember; the one mid-strike flashes; a just-landed one splashes
      const slot = Math.floor(t / 4.1)
      const flick = e >= 1 && k > 0 ? Math.floor(hash(slot + 0.7) * k) : -1
      for (const hit of hits) {
        const i = hit.order
        if (i > k) continue
        const u = p * n - i
        if (u <= 0) continue
        const hx = hit.x + px * (0.4 + 0.6 * hit.depth), hy = hit.y + py * (0.4 + 0.6 * hit.depth)
        let hand = 0
        if (pointer.inside) {
          const d = Math.hypot(pointer.x - hx, pointer.y - hy)
          if (d < 120) hand = 1 - d / 120
        }
        for (const [bx, by, bf] of bursts) {
          const d = Math.hypot(bx - hx, by - hy)
          if (d < 60) hand += 0.3 * bf * (1 - d / 60)
        }
        if (i === k) {
          const r = 1.6 + 4 * Math.pow(u, 0.5)
          pen.fill(P.circle(hx, hy, r), WHITE, Math.min(1, 0.5 + u))
          continue
        }
        const ei = 1 - Math.pow(1 - (i + 1) / n, 1 / 3)
        const age = Math.max(0, (e - ei) * 3 + (e >= 1 ? Math.max(0, t - 3.25) : 0))
        if (age < 0.4) splash(hx, hy, 1 - age / 0.4, hit.seed, narrow ? 4 : 6)
        let on = 0.72 * breath(t, 2.2 + 2.6 * hash(hit.seed + 0.5), 0.08, hash(hit.seed + 0.9) * TAU)
        if (i === flick && t - slot * 4.1 < 0.08) on *= 0.4
        on = Math.min(1, on * (1 + 0.6 * hand) + 0.3 * Math.max(0, 1 - age / 0.4))
        pen.fill(P.circle(hx, hy, (narrow ? 1.5 : 2) * (1 + 0.4 * hand)), NC, on)
        glow.fillStyle = rgba(NC, 0.32 * on)
        glow.beginPath()
        glow.arc(hx, hy, narrow ? 5 : 8, 0, TAU)
        glow.fill()
      }
      // the room's light: purple from the embers, pooling on the floor under the pane
      const lit = k / n
      wash(pen, NC, ox + pw / 2, oy + ph / 2, narrow ? 0.6 * w : 0.45 * w, narrow ? 0.6 * w : 0.45 * w, 0.05 * lit * breath(t, 5.1, 0.06))
      if (!narrow) wash(pen, NC, ox + pw / 2, oy + ph, 0.4 * pw, 0.05 * h, 0.12 * lit)
      void W, void H, void h
    },
  }
}
