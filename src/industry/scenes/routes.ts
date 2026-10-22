import { NA, NB, NC, P, WHITE, rgba, type Scene } from '../../service/scenes/kit'

interface Truck {
  /** the highway it is on, and how far along it (0 → 1) */
  e: number
  u: number
  /** travelling from the highway's a to b, or back */
  fwd: boolean
  speed: number
  /** a delivery: lights the city it arrives at */
  arrive: number
}

/** the map: cities as fractions of the drawing's box */
const CITIES: [number, number][] = [
  [0.08, 0.42],
  [0.24, 0.2],
  [0.3, 0.68],
  [0.47, 0.44],
  [0.6, 0.14],
  [0.66, 0.78],
  [0.8, 0.5],
  [0.95, 0.26],
  [0.93, 0.7],
]
/** the highways between them */
const ROADS: [number, number][] = [
  [0, 1],
  [0, 2],
  [1, 3],
  [2, 3],
  [1, 4],
  [3, 4],
  [3, 6],
  [2, 5],
  [5, 6],
  [4, 7],
  [6, 7],
  [6, 8],
  [5, 8],
  [3, 5],
]
const clamp = (x: number, a = 0, b = 1) => (x < a ? a : x > b ? b : x)

/*
 * TRANSPORTATION & LOGISTICS — the route map. Nine cities as glass nodes
 * with neon highways between them, and trucks (lit beads with comet trails)
 * running the roads in the lead colour, each lighting the city it pulls into.
 * The map has a waypoint, a diamond in the second colour drifting slowly
 * over it: the highways near it bend toward it, and the trucks take the
 * bend. The cursor drags the waypoint: the roads under the hand bow toward
 * it and the fleet follows; let go and it eases back to its drift; a touch
 * counts.
 */
export function routes(): Scene {
  let trucks: Truck[] = []
  const cx = new Float32Array(CITIES.length)
  const cy = new Float32Array(CITIES.length)
  const heat = new Float32Array(CITIES.length)
  // each road's control point (bent toward the waypoint)
  const kx = new Float32Array(ROADS.length)
  const ky = new Float32Array(ROADS.length)
  let bx = 0, by = 0, bw = 0, bh = 0, R = 0
  let wx = 0, wy = 0 // the waypoint
  let grip = 0

  /** the roads out of a city, other than the one just taken */
  const next = (city: number, from: number) => {
    const out: number[] = []
    for (let i = 0; i < ROADS.length; i++) if (i !== from && (ROADS[i][0] === city || ROADS[i][1] === city)) out.push(i)
    return out.length ? out[Math.floor(Math.random() * out.length)] : from
  }
  /** a point along road e at u (from a to b), on its bent curve */
  const at = (e: number, u: number): [number, number] => {
    const [a, b] = ROADS[e]
    const s = 1 - u
    return [s * s * cx[a] + 2 * s * u * kx[e] + u * u * cx[b], s * s * cy[a] + 2 * s * u * ky[e] + u * u * cy[b]]
  }

  return {
    init(w, h, framed) {
      const side = !framed && w > 600
      bw = Math.min(w * (framed ? 0.8 : side ? 0.78 : 0.9), h * 1.35)
      bh = Math.min(h * (framed ? 0.72 : 0.7), bw * 0.72)
      bx = w * (framed ? 0.5 : side ? 0.55 : 0.5) - bw / 2
      by = (h - bh) / 2
      R = Math.min(bw, bh) * 0.028
      CITIES.forEach(([fx, fy], i) => {
        cx[i] = bx + fx * bw
        cy[i] = by + fy * bh
        heat[i] = 0
      })
      trucks = []
      for (let i = 0; i < 7; i++) trucks.push({ e: (i * 5) % ROADS.length, u: (i * 0.37) % 1, fwd: i % 2 === 0, speed: 0.11 + (i % 3) * 0.025, arrive: 0 })
      wx = bx + bw * 0.5
      wy = by + bh * 0.5
      grip = 0
    },

    frame(pen, _w, _h, pointer, dt, t) {
      const { ctx, glow } = pen

      // ---- the waypoint: under the hand, or drifting slowly over the map
      const hand = pointer.inside
      const tx = hand ? clamp(pointer.x, bx, bx + bw) : bx + bw * (0.5 + Math.cos(t * 0.21) * 0.3)
      const ty = hand ? clamp(pointer.y, by, by + bh) : by + bh * (0.5 + Math.sin(t * 0.3) * 0.3)
      const ease = Math.min(1, dt * (hand ? 7 : 1.6))
      wx += (tx - wx) * ease
      wy += (ty - wy) * ease
      grip += ((hand ? 1 : 0) - grip) * Math.min(1, dt * 4)
      // the roads bend toward it: each control point is pulled from the road's middle by how near it is
      const reach = Math.min(bw, bh) * 0.55
      for (let e = 0; e < ROADS.length; e++) {
        const [a, b] = ROADS[e]
        const mx = (cx[a] + cx[b]) / 2
        const my = (cy[a] + cy[b]) / 2
        const d = Math.hypot(wx - mx, wy - my)
        const pull = clamp(1 - d / reach) ** 1.6 * (0.7 + grip * 0.3)
        kx[e] = mx + (wx - mx) * pull
        ky[e] = my + (wy - my) * pull
      }

      // ---- the highways: glass tubes, the gas lit faintly, brighter near the waypoint
      for (let e = 0; e < ROADS.length; e++) {
        const [a, b] = ROADS[e]
        const road = new Path2D()
        road.moveTo(cx[a], cy[a])
        road.quadraticCurveTo(kx[e], ky[e], cx[b], cy[b])
        const d = Math.hypot(wx - kx[e], wy - ky[e])
        const near = clamp(1 - d / reach)
        pen.glass(road, 0.2, 6)
        pen.neon(road, NA, 0.16 + near * 0.3, 1.2)
      }

      // ---- the trucks: beads running the roads with comet trails; a city lights as one pulls in
      for (const tr of trucks) {
        const [a, b] = ROADS[tr.e]
        const len = Math.hypot(cx[b] - cx[a], cy[b] - cy[a]) + 1
        // the hand's roads run busier
        const d = Math.hypot(wx - kx[tr.e], wy - ky[tr.e])
        const hurry = 1 + clamp(1 - d / reach) * grip * 0.8
        tr.u += ((tr.fwd ? 1 : -1) * tr.speed * hurry * dt * Math.min(bw, bh)) / len
        if (tr.u >= 1 || tr.u <= 0) {
          const city = tr.fwd ? b : a
          heat[city] = 1
          tr.arrive = 1
          const e = next(city, tr.e)
          tr.e = e
          tr.fwd = ROADS[e][0] === city
          tr.u = tr.fwd ? 0 : 1
        }
        tr.arrive = Math.max(0, tr.arrive - dt * 1.5)
        const [x, y] = at(tr.e, tr.u)
        // the trail: short runs back along the curve, dimmer the further back
        const back = (tr.fwd ? -1 : 1) * 0.07
        let px = x
        let py = y
        for (let s = 1; s <= 6; s++) {
          const uu = clamp(tr.u + back * s)
          const [qx, qy] = at(tr.e, uu)
          pen.streak(qx, qy, px, py, NA, 0.8 - s * 0.13, 2.1 - s * 0.25)
          px = qx
          py = qy
        }
        pen.fill(P.circle(x, y, R * 0.42), NA, 1)
        if (tr.arrive > 0.01) pen.neon(P.circle(x, y, R * 0.6 + (1 - tr.arrive) * R * 1.4), NA, tr.arrive * 0.6, 1.2)
      }

      // ---- the cities: glass rings, a lit core, warming as trucks arrive; the hub nearest the waypoint lit most
      for (let i = 0; i < CITIES.length; i++) {
        heat[i] = Math.max(0, heat[i] - dt * 0.5)
        const d = Math.hypot(wx - cx[i], wy - cy[i])
        const near = clamp(1 - d / (reach * 0.7))
        const on = Math.max(heat[i], near * 0.6)
        const g = glow.createRadialGradient(cx[i], cy[i], 0, cx[i], cy[i], R * 4)
        g.addColorStop(0, rgba(NA, 0.1 + on * 0.25))
        g.addColorStop(1, rgba(NA, 0))
        glow.fillStyle = g
        glow.fillRect(cx[i] - R * 4, cy[i] - R * 4, R * 8, R * 8)
        const ring = P.circle(cx[i], cy[i], R)
        ctx.fillStyle = rgba(WHITE, 0.04)
        ctx.fill(ring)
        pen.glass(ring, 0.42, 3)
        pen.neon(ring, NA, 0.2 + on * 0.75, 1.4)
        pen.fill(P.circle(cx[i], cy[i], R * 0.3), NA, 0.5 + on * 0.5)
        // a depot's bays: a few ticks round the bigger hubs
        if (i === 3 || i === 6) {
          pen.glass(P.circle(cx[i], cy[i], R * 1.7), 0.22, 1.5)
          pen.fill(P.rect(cx[i] - R * 2.4, cy[i] + R * 1.9, R * 4.8, R * 0.3), NC, 0.3 + on * 0.5)
        }
      }

      // ---- the waypoint: a diamond in the second colour, its pull drawn as a faint ring
      const pulse = 1 + Math.sin(t * 3) * 0.08
      pen.neon(P.circle(wx, wy, reach * 0.3 * (0.6 + grip * 0.4)), NB, 0.06 + grip * 0.1, 1)
      pen.glass(P.diamond(wx, wy, R * 3.2 * pulse), 0.3, 3)
      pen.neon(P.diamond(wx, wy, R * 2.2 * pulse), NB, 0.7 + grip * 0.3, 1.6)
      pen.fill(P.circle(wx, wy, R * 0.35), NB, 1)
      // a fine grid under the map, the sea chart
      const grid = new Path2D()
      for (let i = 1; i < 6; i++) {
        grid.moveTo(bx + (bw * i) / 6, by - R)
        grid.lineTo(bx + (bw * i) / 6, by + bh + R)
      }
      for (let j = 1; j < 4; j++) {
        grid.moveTo(bx - R, by + (bh * j) / 4)
        grid.lineTo(bx + bw + R, by + (bh * j) / 4)
      }
      pen.glass(grid, 0.06, 2)
    },
  }
}
