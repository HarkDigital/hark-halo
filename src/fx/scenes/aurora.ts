import { NA, NB, NC, WHITE, mix, rgba, type RGB, type Scene } from '../../service/scenes/kit'

/*
 * AURORA: curtains of light hanging in the dark. Each curtain is a row of
 * thin vertical rays whose heights and brightness ride layered sines, so the
 * folds drift and sway; the rays are dark at their feet and white-hot at
 * their tops, in the lights by curtain. The cursor draws the nearest folds
 * toward it and brightens them; pressing sends a ripple along the curtain.
 */
interface Curtain {
  c: RGB
  c2: RGB
  y0: number // the foot
  amp: number
  speed: number
  phase: number
  x0: number
  x1: number
}
export default function aurora(): Scene {
  let curtains: Curtain[] = []
  let ripples: { x: number; born: number }[] = []
  let lastDown = -9
  let pull = 0

  return {
    init(w, h) {
      curtains = [
        { c: NA, c2: NB, y0: 0.92 * h, amp: 0.32 * h, speed: 0.18, phase: 0, x0: -0.1 * w, x1: 0.8 * w },
        { c: NB, c2: NC, y0: 0.86 * h, amp: 0.26 * h, speed: 0.13, phase: 2.1, x0: 0.2 * w, x1: 1.1 * w },
        { c: mix(NA, WHITE, 0.3), c2: NA, y0: 0.98 * h, amp: 0.2 * h, speed: 0.24, phase: 4.2, x0: 0.05 * w, x1: 1 * w },
      ]
      ripples = []
    },
    frame(pen, w, h, pointer, dt, t) {
      const { ctx, glow } = pen
      // pressing sends a ripple
      if (pointer.inside && pointer.down && t - lastDown > 0.5) {
        ripples.push({ x: pointer.x, born: t })
        lastDown = t
      }
      ripples = ripples.filter(r => t - r.born < 2.5)
      pull += ((pointer.inside ? 1 : 0) - pull) * Math.min(1, 3 * dt)
      const step = w < 600 ? 10 : 7
      curtains.forEach((cu, ci) => {
        const span = cu.x1 - cu.x0
        for (let x = cu.x0; x <= cu.x1; x += step) {
          const u = (x - cu.x0) / span
          // the fold: layered sines, drifting
          let f = 0.5 + 0.28 * Math.sin(u * 7.3 + t * cu.speed * 2 + cu.phase) + 0.18 * Math.sin(u * 17 - t * cu.speed * 3.1 + cu.phase * 1.7) + 0.1 * Math.sin(u * 41 + t * 0.9)
          // brightness folds: where the curtain bunches it glows more
          let b = 0.45 + 0.35 * Math.sin(u * 11 - t * cu.speed * 4 + cu.phase) + 0.2 * Math.sin(u * 29 + t * 1.3)
          // the ripples pressed into it
          for (const r of ripples) {
            const age = t - r.born
            const d = Math.abs(x - r.x) - age * 420
            const k = Math.exp(-(d * d) / (2 * 40 * 40)) * (1 - age / 2.5)
            f += 0.35 * k
            b += 0.6 * k
          }
          // the hand draws the folds toward it
          let dx = 0
          if (pull > 0.01) {
            const d = x - pointer.x
            const k = Math.exp(-(d * d) / (2 * 120 * 120)) * pull
            dx = -d * 0.25 * k
            b += 0.5 * k
            f += 0.2 * k
          }
          const top = cu.y0 - cu.amp * Math.max(0.08, f)
          const yf = cu.y0 + 6 * Math.sin(u * 23 + t * 0.7)
          const on = Math.max(0, Math.min(1, b)) * (0.55 + 0.45 * Math.sin(ci * 1.3 + t * 0.4 + u * 3) * 0.5 + 0.25)
          if (on < 0.03) continue
          const col = mix(cu.c, cu.c2, 0.5 + 0.5 * Math.sin(u * 5 + t * 0.3 + ci))
          // a ray: dark at its foot, lit toward its top, a white-hot tip
          const g = ctx.createLinearGradient(0, yf, 0, top)
          g.addColorStop(0, rgba(col, 0))
          g.addColorStop(0.55, rgba(col, 0.55 * on))
          g.addColorStop(1, rgba(mix(col, WHITE, 0.6), on))
          ctx.strokeStyle = g
          ctx.lineWidth = step * 0.7
          ctx.beginPath()
          ctx.moveTo(x, yf)
          ctx.lineTo(x + dx, top)
          ctx.stroke()
          const gg = glow.createLinearGradient(0, yf, 0, top)
          gg.addColorStop(0, rgba(col, 0))
          gg.addColorStop(0.6, rgba(col, 0.5 * on))
          gg.addColorStop(1, rgba(col, 0.9 * on))
          glow.strokeStyle = gg
          glow.lineWidth = step * 1.6
          glow.beginPath()
          glow.moveTo(x, yf)
          glow.lineTo(x + dx, top)
          glow.stroke()
        }
      })
      // a faint floor the curtains hang over
      ctx.strokeStyle = rgba(WHITE, 0.06)
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, 0.95 * h)
      ctx.lineTo(w, 0.95 * h)
      ctx.stroke()
    },
  }
}
