import { NB, P, WHITE, rgba, strike } from '../../scenes/kit'
import type { Builder } from '../picture'
import { TAU, breath, clamp01, hash, hot, wash } from './lib'

/*
 * 19%: THE ORB (../PICTURES.md). A large glass sphere on a plinth right of
 * centre, blue light pooled in its bottom with a level, the lit part exactly
 * `share` of the disc's area. The level rises with the count and never
 * changes after; the sphere rolls under the hand (and with the scroll) and
 * the light sloshes, which is light only: the area stays the share.
 */
/** the height of the circular segment whose area is `f` of the disc of radius R (bisection) */
function segmentH(f: number, R: number) {
  const area = (h: number) => R * R * Math.acos(Math.max(-1, Math.min(1, (R - h) / R))) - (R - h) * Math.sqrt(Math.max(0, 2 * R * h - h * h))
  const want = f * Math.PI * R * R
  let lo = 0, hi = 2 * R
  for (let i = 0; i < 28; i++) {
    const mid = (lo + hi) / 2
    if (area(mid) < want) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}
export const orb: Builder<{ kind: 'orb'; share: number }> = o => {
  let cx = 0, cy = 0, R = 100, wt = 4
  let roll = 0, lastRoll = 0, slosh = 0, sloshV = 0
  let narrow = false
  let W = 1, H = 1

  return {
    lead: [0.5, 0.5],
    dur: 2600,
    init(w, h, env) {
      W = w
      H = h
      narrow = env.narrow
      cx = env.mode === 'wide' ? env.copyX + 0.52 * (w - env.copyX) : 0.5 * w
      cy = 0.5 * h
      R = narrow ? Math.min(0.36 * h, 0.4 * w) : env.framed ? 0.36 * h : Math.min(0.36 * h, 0.3 * (w - env.copyX))
      wt = narrow ? 3 : 4
      roll = 0
      lastRoll = 0
      slosh = 0
      sloshV = 0
    },
    frame(pen, w, h, p, e, t, pointer, dt) {
      const { ctx, glow } = pen
      // the roll: toward the hand on a laptop, with the scroll on a phone; its speed kicks the slosh
      const wantRoll = pointer.inside && !pointer.coarse ? ((pointer.x - cx) / R) * 0.6 : (pointer.scroll - 0.5) * 2.4
      roll += (wantRoll - roll) * Math.min(1, 4 * dt)
      const rollV = (roll - lastRoll) / Math.max(1e-3, dt)
      lastRoll = roll
      const target = Math.max(-0.12, Math.min(0.12, rollV * 0.15 + pointer.scrollV * 0.12))
      const kS = (TAU * 2) ** 2, cS = 2 * 0.35 * TAU * 2
      sloshV += (-kS * (slosh - target) - cS * sloshV) * dt
      slosh += sloshV * dt
      const disc = P.circle(cx, cy, R)
      const warm = 0.1 + 0.04 * clamp01(e / 0.08)
      // the plinth and its pool
      const plinth = new Path2D()
      plinth.ellipse(cx, cy + R + 4, 0.5 * R, 0.08 * R, 0, 0, TAU)
      pen.glass(plinth, 0.14, 2)
      if (e > 0) pen.neon(P.arc(cx, cy + R + 4, 0.5 * R, 0.3, Math.PI - 0.3), NB, e < 0.08 ? strike((e / 0.08) * 0.42, 3) : 0.2, 1.2)
      // the glass: a faint body, the sphere's edge, three meridians turning with the roll
      ctx.fillStyle = rgba(WHITE, 0.015)
      ctx.fill(disc)
      pen.glass(disc, warm + 0.04, wt)
      ctx.save()
      ctx.clip(disc)
      for (let i = 0; i < 3; i++) {
        const phi = roll + (i * TAU) / 3
        const rx = R * Math.abs(Math.cos(phi))
        if (rx < 2) continue
        const m = new Path2D()
        m.ellipse(cx, cy, rx, R, 0, 0, TAU)
        ctx.lineWidth = 0.8
        ctx.strokeStyle = rgba(WHITE, 0.05)
        ctx.stroke(m)
      }
      // the level: the segment whose area is the share, its surface tilted by the slosh about its middle
      const f = p * o.share
      const hS = segmentH(f, R)
      const yL = cy + R - hS
      const lit = hS > 0.5
      if (lit) {
        const half = Math.sqrt(Math.max(0, R * R - (yL - cy) * (yL - cy)))
        const surface = new Path2D()
        const Nn = 24
        const yAt = (u: number) => {
          const x = (u - 0.5) * 2 * (half + 20)
          const ripple = 1.5 * Math.sin(TAU * 1.5 * u + 0.9 * t) + 0.8 * Math.sin(TAU * 3.1 * u - 1.6 * t)
          return yL + x * Math.tan(slosh) + (narrow ? 0.6 : 1) * ripple
        }
        for (let i = 0; i <= Nn; i++) {
          const u = i / Nn
          const x = cx + (u - 0.5) * 2 * (half + 20)
          if (i === 0) surface.moveTo(x, yAt(u))
          else surface.lineTo(x, yAt(u))
        }
        const body = new Path2D(surface)
        body.lineTo(cx + half + 20, cy + R + 10)
        body.lineTo(cx - half - 20, cy + R + 10)
        body.closePath()
        const br = breath(t, 4.6, 0.05)
        const bg = ctx.createLinearGradient(0, yL, 0, cy + R)
        bg.addColorStop(0, rgba(NB, 0.3 * br))
        bg.addColorStop(1, rgba(NB, 0.08 * br))
        ctx.fillStyle = bg
        ctx.fill(body)
        const gg = glow.createLinearGradient(0, yL, 0, cy + R)
        gg.addColorStop(0, rgba(NB, 0.5 * br))
        gg.addColorStop(1, rgba(NB, 0.12 * br))
        glow.save()
        glow.clip(disc)
        glow.fillStyle = gg
        glow.fill(body)
        glow.restore()
        const sb = ctx.createLinearGradient(0, yL, 0, yL + 14)
        sb.addColorStop(0, rgba(WHITE, 0.25 * br))
        sb.addColorStop(1, rgba(WHITE, 0))
        ctx.fillStyle = sb
        ctx.fill(body)
        // the surface: white-hot, flaring once the count lands
        const stop = e >= 0.995 ? t - 2.85 : -1
        const flare = stop >= 0 ? 1 + 0.5 * Math.exp(-stop / 0.12) : 1
        let on = br * (stop >= 0.1 && stop < 0.5 ? 0.6 + 0.4 * strike(stop - 0.1, 7) : 1)
        on = Math.min(1, on * (hash(Math.floor(30 * t)) < 0.004 ? 0.6 : 1))
        glow.save()
        glow.clip(disc)
        pen.neon(surface, NB, on, 2 * flare)
        glow.restore()
        ctx.lineWidth = 0.9 * flare
        ctx.strokeStyle = rgba(hot(NB), on)
        ctx.stroke(surface)
        ctx.strokeStyle = rgba(WHITE, 0.8 * on)
        ctx.stroke(surface)
        // motes rising in the light and dying at the surface
        ctx.beginPath()
        for (let m = 0; m < (narrow ? 5 : 10); m++) {
          const u = hash(m * 3 + 0.5)
          const x = cx + (u - 0.5) * 1.6 * half + 3 * Math.sin(1.2 * t + m)
          const y = cy + R - 4 - ((hash(m * 3 + 0.6) * hS + (10 + 8 * hash(m * 3 + 0.7)) * t) % Math.max(1, hS - 6))
          ctx.moveTo(x + 1, y)
          ctx.arc(x, y, 1, 0, TAU)
        }
        ctx.fillStyle = rgba(WHITE, 0.5)
        ctx.fill()
      }
      // the highlights: a crescent at upper-left that turns a little with the roll, and a dot; a glint sweeping the dark glass
      const ca = -2.4 + roll * 0.3
      const sweep = e >= 1 ? ((t - 2.85) % 10) / 10 : -1
      const sweepA = sweep >= 0 ? -Math.PI / 2 + sweep * TAU : 99
      const crescentHot = sweep >= 0 ? Math.max(0, 1 - Math.abs(((sweepA - ca + Math.PI) % TAU) - Math.PI) / 0.6) : 0
      ctx.lineWidth = wt
      ctx.strokeStyle = rgba(WHITE, 0.3 + 0.3 * crescentHot)
      ctx.stroke(P.arc(cx, cy, 0.86 * R, ca - 0.44, ca + 0.44))
      ctx.fillStyle = rgba(WHITE, 0.5)
      ctx.beginPath()
      ctx.arc(cx + 0.72 * R * Math.cos(ca - 0.1), cy + 0.72 * R * Math.sin(ca - 0.1), 3, 0, TAU)
      ctx.fill()
      if (sweep >= 0) {
        ctx.lineWidth = 1.2
        ctx.strokeStyle = rgba(WHITE, 0.4)
        ctx.stroke(P.arc(cx, cy, R - 2, sweepA - 0.12, sweepA + 0.12))
      }
      // the hand's glint on the glass
      if (pointer.inside && !pointer.coarse) {
        const d = Math.hypot(pointer.x - cx, pointer.y - cy)
        if (d < R + 160) {
          const near = d < R ? 1 : 1 - (d - R) / 160
          const rg = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 110)
          rg.addColorStop(0, rgba(WHITE, 0.07 * near))
          rg.addColorStop(1, rgba(WHITE, 0))
          ctx.fillStyle = rg
          ctx.fillRect(pointer.x - 110, pointer.y - 110, 220, 220)
        }
      }
      ctx.restore()
      // the room's light: blue from the lit segment, pooling on the plinth
      wash(pen, NB, cx, cy + R, 0.6 * R, 0.1 * R, 0.2 * f * breath(t, 5.8, 0.06))
      wash(pen, NB, cx, cy + R - hS / 2, narrow ? 0.6 * w : 0.35 * w, narrow ? 0.6 * w : 0.35 * h, 0.05 * f * breath(t, 5.8, 0.06))
      void W, void H, void w, void h
    },
  }
}
