import { NA, NC, P, TAU, WHITE, rgba, type Scene } from './kit'

interface Mote {
  x: number
  y: number
  vx: number
  seed: number
  keep: boolean
  decided: boolean
  lane: number
  alpha: number
}
interface Spark {
  x: number
  y: number
  age: number
}

const LANES = 4

/*
 * AI CONSULTING — the sieve. A torrent of hype (grey noise) drifts in from
 * the left; the filter, a glass tube with a neon diamond at its heart, lets
 * only the genuinely useful through, and it leaves as clean neon signal in
 * glass lanes. Move the cursor to move the filter.
 */
export function sift(): Scene {
  let motes: Mote[] = []
  let sparks: Spark[] = []
  let sieveX = 0

  const laneY = (h: number, i: number) => h * 0.38 + (i / (LANES - 1)) * h * 0.24
  const respawn = (m: Mote, w: number, h: number, initial = false) => {
    m.x = initial ? Math.random() * w : -10 - Math.random() * w * 0.15
    m.y = h * 0.12 + Math.random() * h * 0.76
    m.vx = 50 + Math.random() * 70
    m.seed = Math.random() * TAU
    m.keep = Math.random() < 0.24
    m.decided = initial && m.x >= sieveX
    m.lane = Math.floor(Math.random() * LANES)
    m.alpha = 1
  }

  return {
    init(w, h) {
      sieveX = w * 0.5
      sparks = []
      motes = Array.from({ length: 130 }, () => {
        const m = {} as Mote
        respawn(m, w, h, true)
        return m
      })
    },

    frame(pen, w, h, pointer, dt, t) {
      // the filter follows the cursor, lazily
      const targetX = pointer.inside ? Math.min(Math.max(pointer.x, w * 0.3), w * 0.72) : w * 0.5
      sieveX += (targetX - sieveX) * Math.min(1, dt * 3)

      // glass lanes, downstream of the filter only
      const lanes = new Path2D()
      for (let i = 0; i < LANES; i++) {
        lanes.moveTo(sieveX, laneY(h, i))
        lanes.lineTo(w, laneY(h, i))
      }
      pen.glass(lanes, 0.2, 7)
      pen.neon(lanes, NA, 0.08, 1)

      const noise = new Path2D()
      for (const m of motes) {
        if (!m.decided && m.x >= sieveX) {
          m.decided = true
          if (m.keep) sparks.push({ x: sieveX, y: m.y, age: 0 })
        }
        if (!m.decided) {
          // upstream: noisy drift
          m.x += m.vx * dt
          m.y += Math.sin(m.seed + t * 2.2) * 14 * dt
        } else if (m.keep) {
          // downstream signal: faster, snapping into its lane
          m.x += m.vx * 1.9 * dt
          m.y += (laneY(h, m.lane) - m.y) * Math.min(1, dt * 5)
        } else {
          // filtered out: sinks and fades
          m.x += m.vx * 0.4 * dt
          m.y += 26 * dt
          m.alpha -= dt * 1.1
        }
        if (m.x > w + 20 || m.alpha <= 0) respawn(m, w, h)

        if (m.decided && m.keep) pen.streak(m.x - 18, m.y, m.x, m.y, NA, 0.95, 1.8)
        else if (m.decided) {
          pen.ctx.fillStyle = rgba(WHITE, 0.2 * m.alpha)
          pen.ctx.beginPath()
          pen.ctx.arc(m.x, m.y, 1.5, 0, TAU)
          pen.ctx.fill()
        } else {
          noise.moveTo(m.x + 1.5, m.y)
          noise.arc(m.x, m.y, 1.5, 0, TAU)
        }
      }
      pen.ctx.fillStyle = rgba(WHITE, 0.36)
      pen.ctx.fill(noise)

      // the filter: a glass tube, dashed with light, a neon diamond at its heart
      const bar = P.line(sieveX, h * 0.08, sieveX, h * 0.92)
      pen.glass(bar, 0.2, 9)
      pen.dash([3, 9])
      pen.neon(bar, NC, 0.5, 1.4)
      pen.dash([])
      const s = 12 + Math.sin(t * 2.4) * 2
      pen.fill(P.diamond(sieveX, h / 2, s), NC, 1)
      pen.neon(P.diamond(sieveX, h / 2, s + 12), NC, 0.5, 1.4)

      // pass-through sparks
      sparks = sparks.filter(sp => sp.age < 0.5)
      for (const sp of sparks) {
        sp.age += dt
        const q = sp.age / 0.5
        pen.neon(P.circle(sp.x, sp.y, 2 + q * 16), NA, (1 - q) * 0.8, 1.2)
      }
    },
  }
}
