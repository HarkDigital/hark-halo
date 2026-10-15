import { NA, P, WHITE, mix, rgba, strike, type RGB } from '../../scenes/kit'
import type { Builder } from '../picture'
import { TAU, breath, clamp01, drawMotes, hash, hot, motes, wash, type Mote } from './lib'

/*
 * 10 years: TEN RINGS (../PICTURES.md). A tree's cross-section in glass: ten
 * concentric rings, one per year, lit from the centre outward as the number
 * counts, the gas running both ways round each ring from a seed and meeting
 * opposite in a white weld; the outermost, this year, burns a touch whiter.
 * The rings breathe, a pulse of growth runs outward now and then, and the
 * hand reads one year: the ring nearest it swells while the others ease
 * back. The scroll parallaxes the rings into a shallow cone.
 */
export const rings: Builder<{ kind: 'rings'; from: number; to: number }> = o => {
  const n = Math.max(1, o.to - o.from)
  let cx = 0, cy = 0, R = 100, wt = 2.2
  let radii: number[] = []
  let narrow = false
  let dust: Mote[] = []
  let box: [number, number, number, number] = [0, 0, 1, 1]
  let focus = -1, focusK = 0
  let W = 1, H = 1
  const colour = (k: number): RGB => (k === n ? mix(NA, WHITE, 0.3) : NA)

  return {
    lead: [0, 0],
    dur: 2800,
    init(w, h, env) {
      W = w
      H = h
      narrow = env.narrow
      cx = env.mode === 'wide' ? env.copyX + 0.52 * (w - env.copyX) : 0.5 * w
      cy = 0.5 * h
      R = narrow ? Math.min(0.42 * h, 0.44 * w) : env.framed ? 0.42 * h : Math.min(0.4 * h, 0.3 * (w - env.copyX))
      wt = narrow ? 1.6 : 2
      radii = Array.from({ length: n }, (_, i) => R * (0.14 + 0.86 * Math.pow((i + 1) / n, 0.92)))
      box = [cx - 1.1 * R, cy - 1.1 * R, cx + 1.1 * R, cy + 1.1 * R]
      dust = motes(narrow ? 10 : 18, 2016, box, [-3, 3], [-8, -4])
      focus = -1
      focusK = 0
    },
    frame(pen, w, h, p, e, t, pointer, dt) {
      const { ctx, glow } = pen
      const x10 = p * n
      // the parallax: the scroll offsets each ring's centre by its depth (inner rings lag), a shallow cone
      const sx = (pointer.scroll - 0.5) * 28, sy = (pointer.scroll - 0.5) * 14
      const centre = (k: number): [number, number] => [cx + (sx * (n - k)) / n, cy + (sy * (n - k)) / n]
      // the hand reads one year: the nearest ring (lit or not) swells, the others ease back
      let want = -1
      if (pointer.inside && !pointer.coarse) {
        const d0 = Math.hypot(pointer.x - cx, pointer.y - cy)
        let best = 40
        radii.forEach((r, i) => {
          const d = Math.abs(d0 - r)
          if (d < best) (best = d), (want = i + 1)
        })
      }
      focus = want
      focusK += ((want > 0 ? 1 : 0) - focusK) * Math.min(1, 6 * dt)
      // a pulse of growth running outward every 7 s, and one per 0.3 viewport heights scrolled
      const pulseAt = (phase: number) => {
        if (phase < 0 || phase > 1.6) return -1
        return (phase / 1.6) * R
      }
      const pulseR = e >= 1 ? pulseAt((t - 3.05) % 7) : -1
      const scrollPulse = pulseAt(((pointer.scroll * 10) % 3) / 3 * 1.6)
      // the pith
      const pithOn = e > 0 ? (e < 0.16 ? strike(e * 2.8, 1) : 0.8 + 0.2 * Math.sin((TAU * t) / 3)) : 0
      const [px, py] = centre(0)
      if (e <= 0) pen.glass(P.circle(px, py, 3), 0.2, 1.5)
      else pen.fill(P.circle(px, py, 3 + 3 * Math.max(0, 1 - e / 0.1)), NA, pithOn)
      // the wash between the rings, growing outward with the count
      const litR = x10 > 0 ? radii[Math.min(n, Math.ceil(x10)) - 1] * Math.min(1, x10 / Math.ceil(x10 || 1)) : 0
      if (litR > 0) wash(pen, NA, cx, cy, litR * 1.3, litR * 1.3, 0.025 * breath(t, 5.2, 0.06))
      const slot = Math.floor(t / 5.3)
      const hic = e >= 1 ? Math.floor(hash(slot + 0.3) * Math.max(1, Math.floor(x10))) + 1 : -1
      for (let k = 1; k <= n; k++) {
        const r = radii[k - 1]
        const [kx, ky] = centre(k)
        const ring = P.circle(kx, ky, r)
        const isFocus = focus === k
        const fk = isFocus ? focusK : 0
        // the glass, always; a cold glint at the hand's angle on dark glass
        pen.glass(ring, 0.12 + 0.1 * fk, 3)
        const rise = clamp01(x10 - (k - 1))
        if (rise <= 0) {
          if (isFocus) {
            const a = Math.atan2(pointer.y - ky, pointer.x - kx)
            ctx.lineWidth = 1.2
            ctx.strokeStyle = rgba(WHITE, 0.5 * fk)
            ctx.stroke(P.arc(kx, ky, r, a - 0.21, a + 0.21))
          }
          continue
        }
        const c = colour(k)
        let on = rise < 0.4 ? 0.35 + 0.65 * strike((rise / 0.4) * 0.42, k) : 1
        on *= breath(t, 3.4 + 0.3 * k, 0.06, 1.3 * k)
        if (k === hic && t - slot * 5.3 < 0.07) on *= 0.55
        // the hand: the focused ring swells, the others ease to 0.8
        const other = focus > 0 && !isFocus ? 1 - 0.2 * focusK : 1
        on = Math.min(1.2, on * other * (1 + 0.5 * fk))
        const wk = wt * (1 + 0.4 * fk)
        // a pulse of growth passing this ring
        const pulse = (pr: number) => (pr >= 0 && Math.abs(pr - r) < 24 ? 0.2 * (1 - Math.abs(pr - r) / 24) : 0)
        const extra = pulse(pulseR) + pulse(scrollPulse)
        if (rise >= 1) {
          pen.neon(ring, c, Math.min(1.2, on + extra), wk)
          if (k === n) {
            ctx.lineWidth = Math.max(0.7, wk * 0.55)
            ctx.strokeStyle = rgba(WHITE, Math.min(1, on))
            ctx.stroke(ring)
          }
          // the weld where the two fronts met, flaring as the ring closes (the last ring's ages on t)
          const age = Math.max(0, (x10 - k) * 0.5 + (e >= 1 ? Math.max(0, t - 3.05) : 0))
          if (age < 0.3) {
            const a = -Math.PI / 2 + k * 0.6458 + Math.PI
            pen.fill(P.circle(kx + r * Math.cos(a), ky + r * Math.sin(a), 5 * (1 - age / 0.3)), WHITE, 1 - age / 0.3)
          }
          continue
        }
        // the gas runs both ways round the ring from its seed, white-hot heads leading, cores a little behind
        const a0 = -Math.PI / 2 + k * 0.6458
        const span = Math.PI * rise
        for (const dir of [1, -1]) {
          const a1 = a0 + dir * span
          const arc = dir > 0 ? P.arc(kx, ky, r, a0, a1) : P.arc(kx, ky, r, a1, a0)
          glow.lineWidth = wk * 2.6
          glow.strokeStyle = rgba(c, on)
          glow.stroke(arc)
          ctx.lineWidth = wk
          ctx.strokeStyle = rgba(c, on * 0.8)
          ctx.stroke(arc)
          const lag = 0.07
          if (span > lag) {
            const ac = a0 + dir * (span - lag)
            ctx.lineWidth = Math.max(0.7, wk * 0.4)
            ctx.strokeStyle = rgba(hot(c), on)
            ctx.stroke(dir > 0 ? P.arc(kx, ky, r, a0, ac) : P.arc(kx, ky, r, ac, a0))
          }
          pen.fill(P.circle(kx + r * Math.cos(a1), ky + r * Math.sin(a1), 3), WHITE, Math.min(1, on))
        }
      }
      if (x10 > 0) drawMotes(pen, dust, t, box, Math.min(1, x10 / n), 4)
      void W, void H, void h, void w
    },
  }
}
