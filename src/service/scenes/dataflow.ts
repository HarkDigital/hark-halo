import { NA, NB, NC, P, WHITE, rgba, type RGB, type Scene } from './kit'

interface Packet {
  lane: number
  horizontal: boolean
  pos: number
  speed: number
  c: RGB
}

/*
 * SOFTWARE — data packets streaming through a circuit grid. The lanes are
 * clear glass tubing, each packet a slug of lit gas running through it, and
 * a junction flashes in the packet's colour as it passes. The cursor speeds
 * up nearby traffic (and stretches its light).
 */
export function dataflow(): Scene {
  let cols: number[] = []
  let rows: number[] = []
  let packets: Packet[] = []
  let heat = new Float32Array(0)
  let hue: RGB[] = []
  let lanes = new Path2D()
  const pick = () => {
    const r = Math.random()
    return r < 0.6 ? NA : r < 0.84 ? NB : NC
  }

  return {
    init(w, h) {
      const gap = Math.max(80, Math.min(w, h) / 7)
      cols = []
      rows = []
      for (let x = gap / 2; x < w; x += gap) cols.push(x)
      for (let y = gap / 2; y < h; y += gap) rows.push(y)
      heat = new Float32Array(rows.length * cols.length)
      hue = new Array<RGB>(heat.length).fill(NA)
      lanes = new Path2D()
      for (const x of cols) {
        lanes.moveTo(x, 0)
        lanes.lineTo(x, h)
      }
      for (const y of rows) {
        lanes.moveTo(0, y)
        lanes.lineTo(w, y)
      }
      const count = Math.min(72, Math.round((w * h) / 11000))
      packets = Array.from({ length: count }, () => {
        const horizontal = Math.random() < 0.5
        return {
          horizontal,
          lane: Math.floor(Math.random() * (horizontal ? rows.length : cols.length)),
          pos: Math.random() * Math.max(w, h),
          speed: 40 + Math.random() * 120,
          c: pick(),
        }
      })
    },

    frame(pen, w, h, pointer, dt) {
      pen.glass(lanes, 0.13, 6)

      for (const p of packets) {
        const lane = p.horizontal ? rows[p.lane] : cols[p.lane]
        if (lane === undefined) continue
        let boost = 1
        if (pointer.inside) {
          const dx = (p.horizontal ? p.pos : lane) - pointer.x
          const dy = (p.horizontal ? lane : p.pos) - pointer.y
          const d2 = dx * dx + dy * dy
          if (d2 < 160 * 160) boost = 1 + (1 - Math.sqrt(d2) / 160) * 3
        }
        p.pos += p.speed * boost * dt
        if (p.pos > (p.horizontal ? w : h) + 40) {
          p.pos = -40
          p.lane = Math.floor(Math.random() * (p.horizontal ? rows.length : cols.length))
          p.c = pick()
        }
        const x = p.horizontal ? p.pos : lane
        const y = p.horizontal ? lane : p.pos

        // light the junctions it passes
        const nodes = p.horizontal ? cols : rows
        for (let i = 0; i < nodes.length; i++) {
          if (Math.abs(nodes[i] - p.pos) < 6) {
            const k = (p.horizontal ? p.lane : i) * cols.length + (p.horizontal ? i : p.lane)
            heat[k] = 1
            hue[k] = p.c
          }
        }

        const L = 46 * boost
        pen.streak(p.horizontal ? x - L : x, p.horizontal ? y : y - L, x, y, p.c, 0.95, 2)
      }

      // junctions: glass beads that flash as packets pass
      const beads = new Path2D()
      for (let r = 0; r < rows.length; r++) {
        for (let c = 0; c < cols.length; c++) {
          const k = r * cols.length + c
          const g = heat[k]
          const x = cols[c]
          const y = rows[r]
          if (g > 0.04) {
            const s = 3 + g * 3
            pen.fill(P.rect(x - s / 2, y - s / 2, s, s), hue[k], 0.25 + g * 0.75)
          } else beads.rect(x - 2, y - 2, 4, 4)
          heat[k] = Math.max(0, g - dt * 1.4)
        }
      }
      pen.ctx.fillStyle = rgba(WHITE, 0.24)
      pen.ctx.fill(beads)
    },
  }
}
