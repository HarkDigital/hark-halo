import { NA, NB, P, rgba, type Scene } from './kit'

interface Ping {
  x: number
  age: number
}

// a bounded, mean-reverting random walk: gentle ups and downs around a healthy
// midline, no dramatic spikes or resets (it reads like a normal analytics chart)
const TARGET = 0.55
const nextValue = (prev: number) => {
  const v = prev + (TARGET - prev) * 0.05 + (Math.random() - 0.5) * 0.045
  return Math.min(0.82, Math.max(0.2, v))
}

/*
 * ECOMMERCE — a live revenue line, bent in neon, running to the right with
 * a pulsing white-hot head, a wash of its light beneath it and rings for
 * each sale. Hover the line to ring one up yourself.
 */
export function commerce(): Scene {
  let values: number[] = []
  let pings: Ping[] = []
  let acc = 0
  let lastHoverPing = 0
  const STEP = 0.38
  // how far across the line runs: room on the right for the head's rings (framed, the band's
  // edges fade, so the head stops short of them)
  let reach = 0.9

  return {
    init(w, _h, framed) {
      reach = framed ? 0.82 : 0.9
      const n = Math.max(30, Math.floor((w * reach) / 24))
      let v = 0.5
      values = Array.from({ length: n }, () => (v = nextValue(v)))
      pings = []
    },

    frame(pen, w, h, pointer, dt, t) {
      acc += dt
      while (acc > STEP) {
        acc -= STEP
        values.push(nextValue(values[values.length - 1]))
        values.shift()
        if (Math.random() < 0.3) pings.push({ x: w * reach, age: 0 })
      }

      const cw = w * reach // the chart's width
      const pad = h * 0.22
      const toY = (v: number) => h - pad - v * (h - pad * 2)
      const dx = cw / (values.length - 1)
      const shift = (acc / STEP) * dx // the sub-step slide, for smooth motion
      const at = (x: number) => values[Math.min(values.length - 1, Math.max(0, Math.round((x + shift) / dx)))]

      // baselines, in clear glass
      const grid = new Path2D()
      for (let i = 1; i <= 3; i++) {
        const y = pad + ((h - pad * 2) / 4) * i
        grid.moveTo(0, y)
        grid.lineTo(w, y)
      }
      pen.glass(grid, 0.1, 5)

      const line = new Path2D()
      line.moveTo(-shift, toY(values[0]))
      values.forEach((v, i) => line.lineTo(i * dx - shift, toY(v)))

      // the light it throws beneath it
      const area = new Path2D(line)
      area.lineTo(cw - shift, h)
      area.lineTo(-shift, h)
      area.closePath()
      for (const [k, a] of [
        [pen.ctx, 0.075],
        [pen.glow, 0.06],
      ] as const) {
        const g = k.createLinearGradient(0, pad, 0, h - pad * 0.5)
        g.addColorStop(0, rgba(NA, a))
        g.addColorStop(1, rgba(NA, 0))
        k.fillStyle = g
        k.fill(area)
      }

      pen.tube(line, NA, 0.95, 2.2)

      // the head, pulsing
      const hx = (values.length - 1) * dx - shift
      const hy = toY(values[values.length - 1])
      pen.fill(P.circle(hx, hy, 3.6 + Math.sin(t * 6) * 1), NA, 1)
      pen.neon(P.circle(hx, hy, 9 + Math.sin(t * 6) * 1.5), NA, 0.35, 1.2)

      // the cursor rings one up
      if (pointer.inside && t - lastHoverPing > 0.6 && pointer.x > 0 && pointer.x < cw) {
        if (Math.abs(toY(at(pointer.x)) - pointer.y) < 60) {
          pings.push({ x: pointer.x, age: 0 })
          lastHoverPing = t
        }
      }

      // sales: rings that ride the line
      pings = pings.filter(p => p.age < 1.4)
      for (const p of pings) {
        p.age += dt
        p.x -= (dx / STEP) * dt
        const a = 1 - p.age / 1.4
        const y = toY(at(p.x))
        pen.neon(P.circle(p.x, y, 4 + p.age * 28), NB, a * 0.85, 1.5)
        pen.fill(P.circle(p.x, y, 2.4), NB, a)
      }
    },
  }
}
