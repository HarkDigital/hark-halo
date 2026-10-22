import { NA, NB, NC, P, TAU, WHITE, mix, rgba, strike, type RGB, type Scene } from '../../service/scenes/kit'

interface Win {
  x: number
  y: number
  w: number
  h: number
  /** when in the evening it lights (s into the cycle) */
  at: number
  /** lit by the hand (0..1, cools) */
  heat: number
}
interface Lamp {
  x: number
  y: number
  /** depth along the path, 0 near .. 1 far */
  d: number
  h: number
}

/** the warmest of the three lights, softened: the windows' light */
const WARM = mix([NA, NB, NC].reduce((a, b) => (a[0] - a[2] > b[0] - b[2] ? a : b)), WHITE, 0.35)
const CYCLE = 30
const DUSK = 20
const DAWN = 26

/*
 * SENIOR LIVING — a small campus at dusk, seen from the foot of its path: three
 * low buildings in clear glass with rows of windows, a path running up to the
 * middle door with lamp posts down both sides, and a tree or two. As evening
 * comes on the windows light one by one in warm neon, the lamps come up and
 * stars show; at dawn it all goes dark and the evening begins again. The hand
 * lights the windows near it, and a pool of lamp light walks the path to
 * wherever it points.
 */
export function campus(): Scene {
  let wins: Win[] = []
  let lamps: Lamp[] = []
  let stars = new Path2D()
  let walls = new Path2D()
  let panes = new Path2D()
  let path = new Path2D()
  let u = 1
  let L = 0
  let T = 0
  /** the path: its centre, its near and far ends and half-widths */
  let px = 0
  let nearY = 0
  let farY = 0
  let nearW = 0
  let farW = 0
  /** the walking pool of light: depth and side along the path */
  let pd = 0.5
  let ps = 0

  const halfW = (d: number) => nearW + (farW - nearW) * d
  const yAt = (d: number) => nearY + (farY - nearY) * d

  return {
    init(w, h, framed) {
      u = Math.min(w / 108, h / 66)
      L = w * (framed ? 0.5 : 0.52) - 50 * u
      T = h / 2 - 33 * u
      const X = (x: number) => L + x * u
      const Y = (y: number) => T + y * u
      px = X(50)
      nearY = Y(62)
      farY = Y(42.5)
      nearW = 12 * u
      farW = 1.8 * u

      walls = new Path2D()
      panes = new Path2D()
      wins = []
      // a building: its walls, a low gabled roof, a door, and rows of windows
      const building = (x: number, base: number, bw: number, bh: number, rows: number, cols: number, door: boolean) => {
        walls.rect(X(x), Y(base - bh), bw * u, bh * u)
        walls.moveTo(X(x - 0.6), Y(base - bh))
        walls.lineTo(X(x + bw / 2), Y(base - bh - 2.6))
        walls.lineTo(X(x + bw + 0.6), Y(base - bh))
        if (door) walls.rect(X(x + bw / 2 - 1.4), Y(base - 3.4), 2.8 * u, 3.4 * u)
        const gapX = bw / (cols + 1)
        const ww = Math.min(2.2, gapX * 0.62)
        const wh = Math.min(2.2, (bh / rows) * 0.46)
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const wx = x + gapX * (c + 1) - ww / 2
            const wy = base - bh + (bh / rows) * (r + 0.5) - wh / 2
            if (door && r === rows - 1 && (c === Math.floor(cols / 2) || c === Math.ceil(cols / 2) - 1)) continue
            panes.rect(X(wx), Y(wy), ww * u, wh * u)
            wins.push({ x: X(wx), y: Y(wy), w: ww * u, h: wh * u, at: 0, heat: 0 })
          }
        }
      }
      building(36, 42.5, 28, 14, 2, 7, true)
      building(7, 44.5, 22, 10, 2, 5, false)
      building(71, 44.5, 24, 11, 2, 5, false)
      // the evening's order: each window lights at its own moment of the dusk
      const order = wins.map((_, i) => i).sort(() => Math.random() - 0.5)
      order.forEach((i, k) => (wins[i].at = (k / wins.length) * DUSK + Math.random() * 0.6))

      // the path and its paving, the lamp posts, the trees
      path = new Path2D()
      path.moveTo(px - nearW, nearY)
      path.lineTo(px - farW, farY)
      path.moveTo(px + nearW, nearY)
      path.lineTo(px + farW, farY)
      for (const d of [0.22, 0.42, 0.6, 0.76, 0.9]) {
        path.moveTo(px - halfW(d), yAt(d))
        path.lineTo(px + halfW(d), yAt(d))
      }
      lamps = []
      for (const d of [0.12, 0.4, 0.68]) {
        for (const side of [-1, 1]) {
          const lh = (9 - 5 * d) * u
          lamps.push({ x: px + side * (halfW(d) + (2.4 - 1.6 * d) * u), y: yAt(d), d, h: lh })
        }
      }
      const tree = (x: number, base: number, r: number) => {
        path.moveTo(X(x), Y(base))
        path.lineTo(X(x), Y(base - r * 1.1))
        path.moveTo(X(x) + r * u, Y(base - r * 1.6))
        path.arc(X(x), Y(base - r * 1.6), r * u, 0, TAU)
        path.moveTo(X(x) + r * 0.55 * u, Y(base - r * 1.9))
        path.arc(X(x), Y(base - r * 1.9), r * 0.55 * u, 0, TAU)
      }
      tree(32.5, 47, 3.2)
      tree(68, 47.5, 2.8)
      tree(4, 50, 3.6)
      // the ground
      path.moveTo(X(0), Y(44.5))
      path.lineTo(X(100), Y(44.5))

      stars = new Path2D()
      for (let i = 0; i < 26; i++) {
        const sx = X(2 + Math.random() * 96)
        const sy = Y(1 + Math.random() * 22)
        stars.rect(sx - 0.7, sy - 0.7, 1.4, 1.4)
      }
      pd = 0.5
      ps = 0
    },

    frame(pen, _w, _h, pointer, dt, t) {
      // the evening, part way in when the page opens
      const ph = (t + 8) % CYCLE
      const dark = ph < DAWN ? 1 : Math.max(0, 1 - (ph - DAWN) / 1.2)
      const ev = Math.min(1, ph / DUSK)

      pen.ctx.fillStyle = rgba(WHITE, 0.45 * ev * dark)
      pen.ctx.fill(stars)

      pen.glass(walls, 0.3, 3)
      pen.glass(panes, 0.22, 2)
      pen.glass(path, 0.2, 3)

      // the walking pool of light: idle it strolls the path; the hand calls it over
      let dT = 0.5 + Math.sin(t * 0.21) * 0.42
      let sT = Math.sin(t * 0.37) * 0.5
      const hand = pointer.inside
      if (hand) {
        dT = Math.min(1, Math.max(0, (nearY - pointer.y) / (nearY - farY)))
        sT = Math.min(1, Math.max(-1, (pointer.x - px) / halfW(dT))) * 0.8
      }
      const ease = 1 - Math.exp(-(hand ? 3 : 1.2) * dt)
      pd += (dT - pd) * ease
      ps += (sT - ps) * ease
      const lx = px + ps * halfW(pd)
      const ly = yAt(pd)
      const near = 1 - pd

      // the lamps: lit from dusk, the one nearest the pool brighter
      for (const l of lamps) {
        const lit = Math.min(1, ev * 3) * dark
        const close = Math.max(0, 1 - Math.abs(l.d - pd) / 0.3)
        const r = (1.1 - 0.5 * l.d) * u
        pen.glass(P.line(l.x, l.y, l.x, l.y - l.h), 0.38, 2.4)
        pen.glass(P.circle(l.x, l.y - l.h - r, r), 0.3, 2)
        pen.fill(P.circle(l.x, l.y - l.h - r, r * 0.7), NA, lit * (0.55 + close * 0.45))
        const pool = new Path2D()
        pool.ellipse(l.x, l.y, (6 - 3.5 * l.d) * u, (1.7 - 1 * l.d) * u, 0, 0, TAU)
        pen.wash(pool, NA, lit * (0.04 + close * 0.05))
      }
      // the pool itself, and the lantern over it
      const pool = new Path2D()
      pool.ellipse(lx, ly, (3 + 5 * near) * u, (0.9 + 1.4 * near) * u, 0, 0, TAU)
      pen.wash(pool, NA, 0.1 + near * 0.06)
      pen.neon(pool, NA, 0.35 + near * 0.3, 1.3)
      const lh = (1.6 + 2.4 * near) * u
      pen.glass(P.line(lx, ly, lx, ly - lh), 0.35, 2)
      pen.fill(P.circle(lx, ly - lh, (0.5 + 0.5 * near) * u), NA, 1)

      // the windows: warm as the evening lights them; the hand's in the second colour
      const reach = 9 * u
      for (let i = 0; i < wins.length; i++) {
        const wn = wins[i]
        if (hand) {
          const d = Math.hypot(pointer.x - (wn.x + wn.w / 2), pointer.y - (wn.y + wn.h / 2))
          if (d < reach) wn.heat = Math.max(wn.heat, 1 - (d / reach) * 0.6)
        }
        const on = ph >= wn.at ? strike(ph - wn.at, i) * dark : 0
        if (on > 0) pen.box(wn.x, wn.y, wn.w, wn.h, WARM, on * 0.75)
        if (wn.heat > 0.02) pen.box(wn.x, wn.y, wn.w, wn.h, NB, wn.heat * 0.8)
        wn.heat = Math.max(0, wn.heat - dt * 1.1)
      }
    },
  }
}
