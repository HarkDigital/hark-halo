import { NB, P, WHITE, rgba, strike } from '../../scenes/kit'
import type { Builder } from '../picture'
import { breath, clamp01, glint, hash, hot, span, wash } from './lib'

/*
 * 19%: THE GAUGE GLASS (../PICTURES.md). A boiler's sight glass: one vertical
 * tube between two fittings standing on a bench, blue gas risen exactly
 * `share` of the way up it with a bright reading edge, dark glass above. The
 * level is p x share of the measured length, so it is the number every
 * frame. Afterwards the gas breathes and ripples, a cold highlight drifts on
 * the unlit glass, and the hand swells the bloom over the slug.
 */
export const gauge: Builder<{ kind: 'gauge'; share: number }> = o => {
  let x = 0, top = 0, base = 0, H = 1
  let gas = 12, sleeve = 20, fit = 26
  let walls = new Path2D()
  let fittings = new Path2D()
  let beads = new Path2D()
  let bench: Path2D | null = null
  let narrow = false

  return {
    lead: [0.5, 0.5],
    dur: 2600,
    init(w, h, env) {
      narrow = env.narrow
      x = env.mode === 'wide' ? 0.7 * w : 0.5 * w
      top = env.framed ? 0.1 * h : 0.13 * h
      base = env.framed ? 0.88 * h : 0.87 * h
      H = base - top
      gas = narrow ? 14 : 24
      sleeve = narrow ? 24 : 42
      fit = narrow ? 32 : 58
      walls = new Path2D()
      for (const dx of [-sleeve / 2, sleeve / 2]) {
        walls.moveTo(x + dx, top)
        walls.lineTo(x + dx, base)
      }
      fittings = new Path2D()
      for (const y of [top, base]) {
        fittings.moveTo(x - fit / 2, y)
        fittings.lineTo(x + fit / 2, y)
      }
      beads = new Path2D()
      for (const y of [top + 6, base - 6]) {
        beads.moveTo(x + 4.5, y)
        beads.arc(x, y, 4.5, 0, Math.PI * 2)
      }
      bench = narrow ? null : P.line(0, base, w, base)
    },
    frame(pen, w, h, p, e, t, pointer) {
      const { ctx, glow } = pen
      const warm = 0.1 + 0.06 * clamp01(t / 0.25)
      // the bench, the vessel, its fittings and electrode beads: glass before light
      if (bench) pen.glass(bench, 0.08, 4)
      ctx.fillStyle = rgba(WHITE, 0.04)
      ctx.fillRect(x - sleeve / 2, top, sleeve, H)
      pen.glass(walls, warm + 0.04, 4)
      pen.glass(fittings, 0.26, 4)
      ctx.fillStyle = rgba(WHITE, 0.2)
      ctx.fill(beads)
      // a fixed cold highlight down the left wall
      ctx.strokeStyle = rgba(WHITE, 0.06)
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x - 6, top + 4)
      ctx.lineTo(x - 6, base - 4)
      ctx.stroke()
      // the current arrives: a cold glint runs down the left wall in the first 250 ms
      if (t > 0 && t < 0.25) {
        const y = top + (H - 40) * (t / 0.25)
        glint(pen, x - sleeve / 2, y, x - sleeve / 2, y + 48, 0.5, 1.2)
      }
      // the base electrode fires at e = 0, stutters, then rests as an ember
      if (e > 0) {
        const age = t - 0.25
        const on = age < 0.42 ? strike(age, 3) : 0.3 + 0.04 * Math.sin((2 * Math.PI * t) / 5) + 0.7 * Math.max(0, 1 - (age - 0.42) / 0.3)
        pen.fill(P.circle(x, base - 6, 4.5), WHITE, on)
      }
      const L = p * o.share * H
      // the cursor: within 160 px of the axis
      let k = 0
      if (pointer.inside) {
        const dy = pointer.y < top ? top - pointer.y : pointer.y > base ? pointer.y - base : 0
        const d = Math.hypot(pointer.x - x, dy)
        if (d < 160) k = 1 - d / 160
      }
      // a cold highlight drifting on the unlit glass (it follows the hand over the dark part)
      if (!narrow && e >= 1) {
        const dark = H - L - 18
        let y = top + 10 + dark * (0.5 + 0.42 * Math.sin(0.21 * t))
        if (k > 0 && pointer.y < base - L - 30) y = y + (clamp01((pointer.y - top - 10) / Math.max(1, dark)) * dark + top + 10 - y) * k
        glint(pen, x - sleeve / 2, y - 18, x - sleeve / 2, y + 18, 0.3)
      }
      if (L <= 0.5) return
      // the gas: the slug from the base up, its core a shade behind the front
      const yS = base - L
      let on = (0.88 + 0.07 * Math.sin(1.25 * t)) * (1 + 0.12 * k)
      const stop = e >= 0.995 ? t - 2.85 : -1
      if (stop >= 0.12 && stop < 0.54) on *= 0.6 + 0.4 * strike(stop - 0.12, 7)
      const coreP = e >= 1 ? 1 : clamp01(1 - Math.pow(1 - Math.max(0, e - 0.05), 3)) / Math.max(1e-6, p)
      const yC = base - Math.min(L, L * Math.min(1, coreP))
      glow.lineWidth = gas * 2.6 * (1 + 0.45 * k)
      glow.strokeStyle = rgba(NB, on)
      glow.beginPath()
      glow.moveTo(x, base - gas / 2)
      glow.lineTo(x, yS + gas / 2)
      glow.stroke()
      ctx.lineWidth = gas
      ctx.strokeStyle = rgba(NB, on * 0.8)
      ctx.beginPath()
      ctx.moveTo(x, base - gas / 2)
      ctx.lineTo(x, yS + gas / 2)
      ctx.stroke()
      // the core: a slow ripple runs up it
      const cg = ctx.createLinearGradient(0, base, 0, yC)
      for (let i = 0; i <= 3; i++) {
        const y = base - (i / 3) * (base - yC)
        cg.addColorStop(i / 3, rgba(hot(NB), (0.9 + 0.06 * Math.sin(1.9 * t + 2)) * (1 + 0.08 * Math.sin(0.12 * y - 1.1 * t)) * on))
      }
      ctx.lineWidth = gas * 0.4
      ctx.strokeStyle = cg
      ctx.beginPath()
      ctx.moveTo(x, base - gas / 2)
      ctx.lineTo(x, yC + gas / 2)
      ctx.stroke()
      // a rare dip of the core: every ~9 s, 80 ms
      if (e >= 1) {
        const slot = Math.floor((t - 2.85) / 9)
        if (t - 2.85 - slot * 9 < 0.08 && hash(slot) > 0.3) {
          ctx.fillStyle = rgba(NB, 0.3)
          ctx.fillRect(x - gas / 2, yC, gas, Math.min(20, base - yC))
        }
      }
      // the meniscus: the reading edge, a shallow white-hot arc, flaring as the front stops
      const flare = stop >= 0 ? 1 + 0.5 * Math.exp(-stop / 0.12) : 1
      // (a chord of the inner width, sagging 2 px: the centre sits above the surface)
      const half = sleeve / 2 - 4, sag = 2, mr = (half * half + sag * sag) / (2 * sag), ma = Math.asin(half / mr)
      const m = P.arc(x, yS - 1 - (mr - sag), mr, Math.PI / 2 - ma, Math.PI / 2 + ma)
      glow.lineWidth = 3 * flare
      glow.strokeStyle = rgba(NB, (0.6 + 0.5 * (flare - 1)) * on)
      glow.stroke(m)
      ctx.lineWidth = 1.6 * flare
      ctx.strokeStyle = rgba(WHITE, Math.min(1, (0.9 + 0.2 * k) * on))
      ctx.stroke(m)
      // the top electrode answers the stop with a white glint
      if (stop >= 0) pen.fill(P.circle(x, top + 6, 4.5), WHITE, 0.05 + 0.13 * Math.max(0, 1 - stop / 0.3))
      // the pool on the bench, a beat behind the level
      const lag = e >= 1 ? 1 : clamp01(1 - Math.pow(1 - Math.max(0, e - 0.04), 3))
      if (!narrow) wash(pen, NB, x, base, 170, 55, 0.22 * lag * breath(t, 5.8, 0.06, 2.6) * (1 + 0.1 * k))
      // the room: a faint blue cast from the slug
      wash(pen, NB, x, yS, narrow ? 0.6 * w : 0.3 * w, narrow ? 0.4 * h : 0.35 * h, 0.05 * lag * breath(t, 5.8, 0.06, 2.6))
      void span, void h, void w
    },
  }
}
