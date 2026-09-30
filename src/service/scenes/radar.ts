import { NA, NB, P, TAU, WHITE, rgba, type RGB, type Scene } from './kit'

interface Blip {
  x: number
  y: number
  heat: number
  c: RGB
}

/*
 * SEO / GEO — a radar sweep that finds you. Glass rings and spokes under a
 * neon rim; the beam is a lit tube dragging a fan of light, and scattered
 * blips flare as it passes. Hover to drop your own blip (in the second
 * colour) and get discovered.
 */
export function radar(): Scene {
  let blips: Blip[] = []
  let cx = 0
  let cy = 0
  let R = 0
  let grid = new Path2D()
  const angleOf = (b: Blip) => Math.atan2(b.y - cy, b.x - cx)

  return {
    init(w, h) {
      cx = w / 2
      cy = h / 2
      R = Math.min(w, h) * 0.4
      blips = Array.from({ length: 34 }, () => {
        const a = Math.random() * TAU
        const r = R * (0.2 + Math.random() * 0.75)
        return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, heat: 0, c: NA }
      })
      grid = new Path2D()
      for (let i = 1; i <= 2; i++) {
        grid.moveTo(cx + (R / 3) * i, cy)
        grid.arc(cx, cy, (R / 3) * i, 0, TAU)
      }
      for (let i = 0; i < 4; i++) {
        const a = (Math.PI / 4) * i
        grid.moveTo(cx - Math.cos(a) * R, cy - Math.sin(a) * R)
        grid.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R)
      }
    },

    frame(pen, _w, _h, pointer, dt, t) {
      const beam = (t * 0.9) % TAU

      pen.glass(grid, 0.12, 4)
      pen.tube(P.circle(cx, cy, R), NB, 0.32, 2)

      // the fan of light behind the beam
      const FAN = 0.55
      for (const [k, a] of [
        [pen.ctx, 0.2],
        [pen.glow, 0.34],
      ] as const) {
        if (!('createConicGradient' in k)) break
        const g = k.createConicGradient(beam - FAN, cx, cy)
        g.addColorStop(0, rgba(NA, 0))
        g.addColorStop(FAN / TAU, rgba(NA, a))
        g.addColorStop(Math.min(1, FAN / TAU + 0.002), rgba(NA, 0))
        g.addColorStop(1, rgba(NA, 0))
        k.fillStyle = g
        k.fill(P.circle(cx, cy, R))
      }
      pen.neon(P.line(cx, cy, cx + Math.cos(beam) * R, cy + Math.sin(beam) * R), NA, 0.95, 2)

      // the cursor drops a blip (not too close to another)
      if (pointer.inside && blips.length < 60) {
        const dx = pointer.x - cx
        const dy = pointer.y - cy
        if (dx * dx + dy * dy < R * R) {
          const near = blips.some(b => (b.x - pointer.x) ** 2 + (b.y - pointer.y) ** 2 < 40 * 40)
          if (!near) blips.push({ x: pointer.x, y: pointer.y, heat: 0, c: NB })
        }
      }

      const cold = new Path2D()
      for (const b of blips) {
        let diff = beam - angleOf(b)
        while (diff < 0) diff += TAU
        if (diff < 0.06) b.heat = 1
        if (b.heat > 0.05) {
          pen.fill(P.circle(b.x, b.y, 2 + b.heat * 1.8), b.c, 0.3 + b.heat * 0.7)
          if (b.heat > 0.5) pen.neon(P.circle(b.x, b.y, 5 + (1 - b.heat) * 28), b.c, (b.heat - 0.5) * 1.2, 1.2)
        } else {
          cold.moveTo(b.x + 2, b.y)
          cold.arc(b.x, b.y, 2, 0, TAU)
        }
        b.heat = Math.max(0, b.heat - dt * 0.5)
      }
      pen.ctx.fillStyle = rgba(WHITE, 0.2)
      pen.ctx.fill(cold)

      pen.fill(P.circle(cx, cy, 3.2), NA, 1)
    },
  }
}
