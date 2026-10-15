import { NA, NB, NC, TAU, WHITE, mix, rgba, type RGB, type Scene } from '../../service/scenes/kit'
import { hash } from '../../service/stat/pictures/lib'

/*
 * INK: tendrils of lit smoke curling in still air. Seven strands. Each has a
 * HEAD that wanders by a smooth field (the curl of a stream function of sines
 * drifting in time, so the flow never piles the strands into a sink), with a
 * curl of its own that never quite stops (so a strand is never a straight
 * line) and a gentle rise, and a TAIL of 48 points chained behind it: each
 * eases toward the one before and drifts a little with the air, so the strand
 * curls behind its head and slowly straightens. Strands wrap round the edges
 * (the chain is drawn on both sides of a seam). Each strand is drawn as smoke,
 * not a tube: a broad faint haze and a soft body on the glow, a wide faint
 * ribbon and a mid tone on the sharp layer, and a short core toward white at
 * the head only (the fresh smoke), each pass a few coincident polylines from
 * the head of different lengths and widths (PASSES) so the strand is narrow
 * and bright at its head and spreads and dissolves toward the tail like smoke
 * diffusing, with no band seams; the head a faint bead. Four strands in NA,
 * two in NB, one in NC; the strands of a colour are batched into one path per
 * length.
 * The cursor STIRS: within ~160 px the air turns round it (strongest at 60 px)
 * and heads are drawn into its orbit; pressing reverses the turn and pushes
 * the smoke outward. A touch is the cursor while the finger is down. On a
 * small box (a phone, a thin band) the stir shrinks with it.
 */
const N = 49 // head + 48
const GROUPS: { c: RGB; n: number }[] = [
  { c: NA, n: 4 },
  { c: NB, n: 2 },
  { c: NC, n: 1 },
]
/**
 * The smoke stroke, seamless: each pass is a few coincident polylines from
 * the head, of different lengths (`ends`, 0..1 of the chain) and widths (`w`
 * times `m`, the longest the widest), each at a/ends.length, so they add to a
 * bright narrow core at the head that spreads and dims toward the tail (the
 * longest line is the widest and faintest: the old smoke is broad and thin),
 * with no seams; the white core dies first.
 */
const PASSES: { glow: boolean; hot?: boolean; w: number; a: number; ends: number[]; m: number[] }[] = [
  // the air round the strand: one broad faint wash on the glow (the bloom smears it)
  { glow: true, w: 54, a: 0.07, ends: [1], m: [1] },
  // the lit body on the glow: bright and narrow at the head, broad and dim down the tail
  { glow: true, w: 24, a: 0.3, ends: [1, 0.78, 0.56, 0.34, 0.16], m: [1.7, 1.35, 1.05, 0.8, 0.6] },
  // the ribbon: wide and faint, widening as it dissolves
  { glow: false, w: 11, a: 0.1, ends: [1, 0.78, 0.56, 0.34], m: [1.8, 1.35, 1, 0.7] },
  // the mid tone
  { glow: false, w: 4, a: 0.15, ends: [0.66, 0.46, 0.3, 0.16], m: [1.25, 1.1, 1, 0.9] },
  // the core toward white: the fresh smoke at the head, gone by a third of the way
  { glow: false, hot: true, w: 1.2, a: 0.42, ends: [0.32, 0.23, 0.15, 0.09, 0.04], m: [1, 1, 1, 1, 1] },
]

interface Strand {
  x: Float32Array
  y: Float32Array
  /** the curl of its own: two rates and three phases */
  w1: number
  w2: number
  p1: number
  p2: number
  p3: number
  /** its own orbit round the hand, as a fraction of the orbit (so gathered heads make a band, not a stack) */
  orb: number
}

export default function ink(): Scene {
  let W = 1, H = 1
  let ws = 1 // widths scale with the box
  let kf = 0.012 // the field's spatial frequency
  let speed = 40
  let rate = 8 // the chain's easing, /s
  let rise = 7
  let R = 170 // the stir's reach
  let ro = 60 // the orbit
  let groups: Strand[][] = []
  const paths: (Path2D | undefined)[] = new Array(N)
  let tNow = 0
  // the hand
  let stir = 0
  let press = 0
  let px = -9999, py = -9999
  const v = { x: 0, y: 0 }

  const wrapX = (x: number) => x - Math.floor(x / W) * W
  const wrapY = (y: number) => y - Math.floor(y / H) * H

  /**
   * the air at (x, y): the curl of a stream function made of sines drifting in
   * time (so the flow never piles the strands into a sink); gentle, still air
   */
  const air = (x: number, y: number, t: number, k: number) => {
    const s = 0.45 * speed * k
    const a = x * kf + t * 0.2, b = y * kf * 0.8 - t * 0.25
    const c = (x + y) * kf * 1.4 + t * 0.35
    const e = x * kf * 1.9 - y * kf * 1.1 + t * 0.3
    const sa = Math.sin(a), ca = Math.cos(a), sb = Math.sin(b), cb = Math.cos(b), cc = Math.cos(c), se = Math.sin(e)
    v.x = s * (-0.8 * sa * sb + 0.7 * cc + 0.44 * se)
    v.y = -s * (ca * cb + 0.7 * cc - 0.76 * se) - rise * k
  }

  /**
   * the vortex round the hand, added to v (wrapped coordinates): the turn at
   * `kt`, the pull onto the orbit at `kr`, the push when pressed at `kp`. Heads
   * take all three; tail points only a gentle turn and the push, so the chain
   * is swept round the hand without piling onto the ring.
   */
  const vortex = (x: number, y: number, kt: number, kr: number, kp: number, orb: number) => {
    if (stir < 0.01) return
    const dx = x - px, dy = y - py
    const d = Math.sqrt(dx * dx + dy * dy)
    if (d > R || d < 0.5) return
    const win = Math.min(1, (R - d) / (0.35 * R)) * stir
    const xr = d / ro
    const tang = kt * 80 * ws * xr * Math.exp(0.5 * (1 - xr * xr)) * (1 - 2 * press)
    const rad = kr * (ro * orb - d) * 1.6 * (1 - press) + kp * press * 190 * ws * Math.exp(-d / (0.47 * R))
    const nx = dx / d, ny = dy / d
    v.x += win * (-ny * tang + nx * rad)
    v.y += win * (nx * tang + ny * rad)
  }

  const step = (dt: number, t: number) => {
    const e = 1 - Math.exp(-rate * dt)
    const cap = 240 * ws
    for (const gr of groups)
      for (const s of gr) {
        const { x, y } = s
        // the head: the air, its own curl (never quite still), the rise, the hand
        air(x[0], y[0], t, 1)
        const curl = speed * (0.7 + 0.3 * Math.sin(t * 0.17 + s.p3))
        const th = t * s.w1 + s.p1 + 0.8 * Math.sin(t * s.w2 + s.p2)
        v.x += curl * Math.cos(th)
        v.y += curl * Math.sin(th)
        vortex(x[0], y[0], 1, 1, 1, s.orb)
        const m = Math.sqrt(v.x * v.x + v.y * v.y)
        if (m > cap) (v.x *= cap / m), (v.y *= cap / m)
        x[0] += v.x * dt
        y[0] += v.y * dt
        // wrap the head; the tail moves with it (drawn wrapped, on both sides of a seam)
        let ox = 0, oy = 0
        if (x[0] < 0) ox = W
        else if (x[0] >= W) ox = -W
        if (y[0] < 0) oy = H
        else if (y[0] >= H) oy = -H
        if (ox || oy) for (let i = 0; i < N; i++) (x[i] += ox), (y[i] += oy)
        // the tail: a chain, each point easing to the one before, drifting with the air and a finer wisp
        for (let i = 1; i < N; i++) {
          air(x[i], y[i], t, 0.3)
          v.x += 0.2 * speed * Math.sin(x[i] * kf * 3.1 + t * 0.6) * Math.cos(y[i] * kf * 2.3 - t * 0.4)
          v.y += 0.2 * speed * Math.cos(y[i] * kf * 2.9 - t * 0.5) * Math.sin(x[i] * kf * 2.1 + t * 0.3)
          vortex(wrapX(x[i]), wrapY(y[i]), 0.35, 0, 0.5, 1)
          x[i] += (x[i - 1] - x[i]) * e + v.x * dt
          y[i] += (y[i - 1] - y[i]) * e + v.y * dt
        }
      }
  }

  /** strand s from its head to point n into `p`, wrapped, the chain drawn on both sides of a seam */
  const polyline = (p: Path2D, s: Strand, n: number) => {
    let lx = wrapX(s.x[0]), ly = wrapY(s.y[0])
    p.moveTo(lx, ly)
    for (let i = 1; i <= n; i++) {
      const x = wrapX(s.x[i]), y = wrapY(s.y[i])
      const dx = x - lx, dy = y - ly
      const ox = dx > W / 2 ? -W : dx < -W / 2 ? W : 0
      const oy = dy > H / 2 ? -H : dy < -H / 2 ? H : 0
      if (ox || oy) {
        p.lineTo(x + ox, y + oy)
        p.moveTo(lx - ox, ly - oy)
      }
      p.lineTo(x, y)
      lx = x
      ly = y
    }
  }

  return {
    init(w, h) {
      W = Math.max(1, w)
      H = Math.max(1, h)
      const m = Math.min(W, H)
      ws = Math.min(1.5, Math.max(0.6, Math.sqrt(m / 412)))
      kf = 5 / m
      speed = 40 * ws
      rise = 7 * ws
      // the stir: ~160 px on a laptop, smaller with a small box
      R = Math.min(170, 0.62 * m)
      ro = R * (60 / 170)
      // the chain's lag per link makes a tail most of the box long (it folds on its curls)
      rate = (0.6 * speed * (N - 1)) / (0.8 * m)
      groups = []
      let i = 0
      for (const gr of GROUPS) {
        const mine: Strand[] = []
        for (let k = 0; k < gr.n; k++, i++) {
          const r = (j: number) => hash(i * 37 + j * 11 + 5)
          const x = new Float32Array(N).fill(r(1) * W)
          const y = new Float32Array(N).fill(r(2) * H)
          mine.push({ x, y, w1: 0.45 + r(3) * 0.5, w2: 0.17 + r(4) * 0.25, p1: r(5) * TAU, p2: r(6) * TAU, p3: r(7) * TAU, orb: 0.7 + r(8) * 0.6 })
        }
        groups.push(mine)
      }
      // let the tails grow before the first frame
      const keep = stir
      stir = 0
      for (let k = 360; k > 0; k--) step(1 / 30, tNow - k / 30)
      stir = keep
    },
    frame(pen, _w, _h, pointer, dt, t) {
      const { ctx, glow } = pen
      tNow = t
      if (pointer.inside) {
        px = pointer.x
        py = pointer.y
      }
      stir += ((pointer.inside ? 1 : 0) - stir) * Math.min(1, 5 * dt)
      press += ((pointer.inside && pointer.down ? 1 : 0) - press) * Math.min(1, 8 * dt)
      step(dt, t)

      for (let g = 0; g < groups.length; g++) {
        const mine = groups[g]
        const c = GROUPS[g].c
        const hc = mix(c, WHITE, 0.6)
        const br = 0.85 + 0.15 * Math.sin(t * 0.45 + g * 2.1)
        // the strands of a colour, head to point n, one path per length asked for
        paths.fill(undefined)
        for (const ps of PASSES) {
          const k = ps.glow ? glow : ctx
          const a = (ps.a * br) / ps.ends.length
          for (let j = 0; j < ps.ends.length; j++) {
            const n = Math.max(1, Math.round(ps.ends[j] * (N - 1)))
            let p = paths[n]
            if (!p) {
              p = new Path2D()
              for (const s of mine) polyline(p, s, n)
              paths[n] = p
            }
            k.lineWidth = ps.w * ws * ps.m[j]
            k.strokeStyle = rgba(ps.hot ? hc : c, a)
            k.stroke(p)
          }
        }
        // the heads: faint beads
        const beads = new Path2D()
        for (const s of mine) {
          const x = wrapX(s.x[0]), y = wrapY(s.y[0])
          beads.moveTo(x + 1.6 * ws, y)
          beads.arc(x, y, 1.6 * ws, 0, TAU)
        }
        pen.fill(beads, c, 0.3 * br)
      }
    },
  }
}
