import { NA, NB, P, WHITE, rgba, type Scene } from './kit'

/*
 * AERIAL — living topographic contours seen from above (glass, every third
 * one lit faintly in the second colour), with a drone tracing a survey path
 * in neon. The drone gently steers toward your cursor.
 */
export function aerial(): Scene {
  let dx = 0
  let dy = 0
  let trail: { x: number; y: number }[] = []

  return {
    init(w, h) {
      dx = w / 2
      dy = h / 2
      trail = []
    },

    frame(pen, w, h, pointer, dt, t) {
      const cx = w * 0.54
      const cy = h * 0.48

      // the terrain: wobbling contour rings
      for (let k = 0; k < 9; k++) {
        const base = 36 + k * Math.min(w, h) * 0.07
        const ring = new Path2D()
        for (let i = 0; i <= 90; i++) {
          const a = (i / 90) * Math.PI * 2
          const r = base + Math.sin(a * 3 + t * 0.25 + k * 1.3) * 8 + Math.sin(a * 5 - t * 0.18 + k * 0.7) * 5
          const x = cx + Math.cos(a) * r * 1.15
          const y = cy + Math.sin(a) * r * 0.82
          if (i === 0) ring.moveTo(x, y)
          else ring.lineTo(x, y)
        }
        ring.closePath()
        if (k % 3 === 1) pen.neon(ring, NB, 0.3 - k * 0.02, 1.2)
        else pen.glass(ring, 0.2 - k * 0.012, 4)
      }
      // the summit
      pen.fill(P.circle(cx, cy, 2.6), NB, 0.8)

      // the drone: a lissajous survey path, bending toward the pointer
      let tx = w * 0.5 + Math.cos(t * 0.42) * w * 0.3
      let ty = h * 0.48 + Math.sin(t * 0.31) * h * 0.26
      if (pointer.inside) {
        tx = tx * 0.45 + pointer.x * 0.55
        ty = ty * 0.45 + pointer.y * 0.55
      }
      const ease = 1 - Math.exp(-1.8 * dt)
      dx += (tx - dx) * ease
      dy += (ty - dy) * ease
      const heading = Math.atan2(dy - ty, dx - tx) + Math.PI

      trail.push({ x: dx, y: dy })
      if (trail.length > 70) trail.shift()

      // its flight trail, in neon, fading behind it (drawn in runs)
      const RUN = 7
      for (let s = 1; s < trail.length; s += RUN) {
        const run = new Path2D()
        run.moveTo(trail[s - 1].x, trail[s - 1].y)
        for (let i = s; i < Math.min(trail.length, s + RUN); i++) run.lineTo(trail[i].x, trail[i].y)
        pen.neon(run, NA, (s / trail.length) * 0.6, 1.4)
      }

      // the camera's footprint on the ground ahead of it
      const look = 48
      const fx = dx + Math.cos(heading) * look
      const fy = dy + Math.sin(heading) * look
      pen.ctx.lineWidth = 1
      pen.ctx.setLineDash([4, 5])
      pen.ctx.strokeStyle = rgba(WHITE, 0.3)
      pen.ctx.strokeRect(fx - 27, fy - 19, 54, 38)
      pen.ctx.setLineDash([])
      const cone = new Path2D()
      for (const [ox, oy] of [
        [-27, -19],
        [27, -19],
        [-27, 19],
        [27, 19],
      ]) {
        cone.moveTo(dx, dy)
        cone.lineTo(fx + ox, fy + oy)
      }
      pen.ctx.strokeStyle = rgba(WHITE, 0.12)
      pen.ctx.stroke(cone)

      // the drone: a white-hot body, glass arms, neon rotors
      const spin = t * 40
      const arms = new Path2D()
      for (let i = 0; i < 4; i++) {
        const a = (Math.PI / 2) * i + Math.PI / 4
        const rx = dx + Math.cos(a) * 10
        const ry = dy + Math.sin(a) * 10
        arms.moveTo(dx, dy)
        arms.lineTo(rx, ry)
        pen.neon(P.arc(rx, ry, 4.8, spin + i, spin + i + Math.PI * 1.4), NA, 0.85, 1.3)
      }
      pen.glass(arms, 0.5, 3)
      pen.fill(P.rect(dx - 2.6, dy - 2.6, 5.2, 5.2), WHITE, 1)
    },
  }
}
