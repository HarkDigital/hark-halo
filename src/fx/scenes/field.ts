import { NA, NB, NC, P, WHITE, mix, type Scene } from '../../service/scenes/kit'
import { TAU, breath, clamp01, hash, smooth, wash } from '../../service/stat/pictures/lib'

/*
 * FIELD: lines of force in a dark field. The field is a uniform flow to the
 * right (leaning a few degrees either way over a minute, with a slow wave
 * crawling through it) plus a dipole: a magnet set against the flow, so the
 * lines part around it on a circle and close again behind. Every frame the
 * lines are traced afresh from seeds down the left edge (and a few from the
 * top and bottom), stepping 8 px along the field for as many steps as it
 * takes to cross the box (160 on the lab card, ~250 on a hero), and
 * drawn as thin neon in NA, their alphas differing by line; where a line
 * passes the magnet it brightens in NB, and twelve of them carry a bead of
 * light along their length: the field is alive with current.
 * Alone, the magnet drifts on a slow lissajous and now and then turns over
 * of its own accord. The cursor is the magnet; pressing turns it over, and
 * the lines stop wrapping round it and dive straight through.
 */
const STEP = 8
/** the lines' alphas, five families, most lines in the dim ones */
const LEVELS = [0.07, 0.12, 0.19, 0.3, 0.52]
const SHARE = [0.3, 0.55, 0.75, 0.9]
const CYCLE = 17 // seconds; alone, the magnet turns over at 11..14.2

export default function field(): Scene {
  let W = 0, H = 0
  let R = 160 // the magnet's reach: lines bend strongly inside it, barely beyond
  let A = 80 // the circle the lines part on (the dipole's strength is A²)
  let MAX = 160 // steps per line: enough to cross the box and round the magnet
  let n = 0 // lines
  let seeds = new Float32Array(0) // x, y per line
  let pts = new Float32Array(0) // (MAX + 1) points per line
  let counts = new Int16Array(0)
  let level = new Uint8Array(0)
  let beads: { i: number; speed: number; off: number }[] = []
  let k1 = 0, k2 = 0 // the waves' wavenumbers
  // the magnet
  let mx = 0, my = 0
  let sgn = 1 // +1 set against the flow (the lines wrap it), -1 along it (they dive through)
  // the field, per frame
  let ux0 = 1, uy0 = 0, ph1 = 0, ph2 = 0, mdx = -1, mdy = 0, K = 0
  let W1 = 0, W2 = 1 // the waves fade in between these radii from the magnet
  let Fx = 0, Fy = 0
  const field = (x: number, y: number) => {
    let ux = ux0
    let uy = uy0
    const rx = x - mx, ry = y - my
    const r2 = rx * rx + ry * ry
    // the waves, faded out around the magnet so its near field is the exact cylinder flow
    if (r2 > W1 * W1) {
      let q = r2 > W2 * W2 ? 1 : (Math.sqrt(r2) - W1) / (W2 - W1)
      q = q * q * (3 - 2 * q)
      uy += q * (0.11 * Math.cos(x * k1 + ph1) + 0.05 * Math.cos(x * k2 + y * 0.4 * k2 + ph2))
    }
    if (r2 > 1) {
      const g = K / r2
      const mr = (mdx * rx + mdy * ry) / r2
      ux += g * (2 * mr * rx - mdx)
      uy += g * (2 * mr * ry - mdy)
    }
    Fx = ux
    Fy = uy
  }
  /** the point `s` px along line i */
  const at = (i: number, s: number, out: [number, number]) => {
    const c = counts[i]
    const base = i * (MAX + 1) * 2
    let j = Math.floor(s / STEP)
    if (j >= c - 1) j = c - 2
    if (j < 0) j = 0
    const f = Math.max(0, Math.min(1, s / STEP - j))
    const x0 = pts[base + j * 2], y0 = pts[base + j * 2 + 1]
    const x1 = pts[base + j * 2 + 2], y1 = pts[base + j * 2 + 3]
    out[0] = x0 + (x1 - x0) * f
    out[1] = y0 + (y1 - y0) * f
  }
  const head: [number, number] = [0, 0]
  const tail: [number, number] = [0, 0]

  return {
    init(w, h) {
      W = w
      H = h
      R = Math.min(160, 0.5 * Math.min(w, h))
      A = R * 0.5
      W1 = 1.1 * A
      W2 = 1.8 * A
      k1 = TAU / (0.9 * w)
      k2 = TAU / (0.32 * w)
      // the box's width, the way round the magnet, and slack for the waves and a loop or two
      MAX = Math.max(120, Math.min(320, Math.ceil((w + 2 * R + 48) / STEP) + 32))
      const nL = Math.max(16, Math.min(36, Math.round(h / 14)))
      const nT = w < 500 ? 2 : 4
      n = nL + 2 * nT
      seeds = new Float32Array(n * 2)
      for (let i = 0; i < nL; i++) {
        seeds[i * 2] = -6
        seeds[i * 2 + 1] = -0.1 * h + (1.2 * h * (i + 0.5)) / nL
      }
      for (let j = 0; j < nT; j++) {
        const x = w * (0.1 + (0.7 * (j + 0.5)) / nT)
        const a = nL + j, b = nL + nT + j
        seeds[a * 2] = x
        seeds[a * 2 + 1] = -4
        seeds[b * 2] = x
        seeds[b * 2 + 1] = h + 4
      }
      pts = new Float32Array(n * (MAX + 1) * 2)
      counts = new Int16Array(n)
      level = new Uint8Array(n)
      beads = []
      for (let i = 0; i < n; i++) {
        const r = hash(i + 17)
        level[i] = r < SHARE[0] ? 0 : r < SHARE[1] ? 1 : r < SHARE[2] ? 2 : r < SHARE[3] ? 3 : 4
        if ((i * 7) % 44 < 12) beads.push({ i, speed: 60 + 80 * hash(i * 5 + 3), off: hash(i * 9 + 5) * 1600 })
      }
      mx = w / 2
      my = h / 2
      sgn = 1
    },

    frame(pen, w, h, pointer, dt, t) {
      // ---- the magnet: the hand, or a slow lissajous; pressed (or now and then alone) it turns over
      const tc = t % CYCLE
      const tx = pointer.inside ? pointer.x : w / 2 + 0.28 * w * Math.sin(0.17 * t + 0.6)
      const ty = pointer.inside ? pointer.y : h / 2 + 0.24 * h * Math.sin(0.26 * t + 2)
      const ease = Math.min(1, (pointer.inside ? 7 : 2.5) * dt)
      mx += (Math.max(0.06 * w, Math.min(0.94 * w, tx)) - mx) * ease
      my += (Math.max(0.08 * h, Math.min(0.92 * h, ty)) - my) * ease
      const flipped = pointer.inside ? pointer.down : tc > 11 && tc < 14.2
      sgn += ((flipped ? -1 : 1) - sgn) * Math.min(1, 5 * dt)
      const dive = smooth((1 - sgn) / 2)

      // ---- the field this frame: the flow leans a little, the waves crawl
      const th = 0.04 * Math.sin(0.17 * t) + 0.02 * Math.sin(0.31 * t + 2)
      ux0 = Math.cos(th)
      uy0 = Math.sin(th)
      ph1 = -0.4 * t
      ph2 = 0.27 * t + 1.7
      mdx = -sgn * ux0
      mdy = -sgn * uy0
      K = A * A

      // ---- trace the lines: midpoint steps along the normalised field, finer near the magnet
      const wrap = Math.max(0, sgn)
      const inside = 0.96 * A * wrap * (0.96 * A * wrap) // set against the flow, no line belongs inside the circle
      const R4 = R * R * 0.25
      const sleeve = A * 0.3
      const sleeve2 = sleeve * sleeve
      // set against the flow, a line that stalls at the front of the circle ends there (it would
      // otherwise flip a coin at the saddle and could run on inside the circle)
      const stall = wrap > 0.5 ? 0.18 : 1e-6
      for (let i = 0; i < n; i++) {
        const base = i * (MAX + 1) * 2
        let x = seeds[i * 2], y = seeds[i * 2 + 1]
        let c = 1
        pts[base] = x
        pts[base + 1] = y
        let pdx = 0, pdy = 0
        let dead = false
        let passes = 0 // times through the core (turned over, the lines dive through it)
        for (let s = 0; s < MAX && !dead; s++) {
          const rx = x - mx, ry = y - my
          const r2 = rx * rx + ry * ry
          const sub = r2 < R4 ? 4 : r2 < R * R ? 2 : 1
          const st = STEP / sub
          for (let k = 0; k < sub; k++) {
            field(x, y)
            let m = Math.hypot(Fx, Fy)
            if (m < stall) {
              dead = true
              break
            }
            field(x + (Fx / m) * (st / 2), y + (Fy / m) * (st / 2))
            m = Math.hypot(Fx, Fy)
            if (m < stall) {
              dead = true
              break
            }
            const dx = Fx / m, dy = Fy / m
            if (s + k > 0 && dx * pdx + dy * pdy < -0.2 && (wrap > 0.5 || r2 > sleeve2)) {
              dead = true // a stagnation point: the line ends there
              break
            }
            if (wrap > 0.5 && dx * ux0 + dy * uy0 < -0.3) {
              dead = true // outside the circle the flow never runs backwards: the line has strayed inside
              break
            }
            pdx = dx
            pdy = dy
            x += dx * st
            y += dy * st
            // through the magnet: the dipole's field is even, so a line closing on the core carries
            // on from its reflection (only while closing: the reflected point is already leaving).
            // A line back at the core a second time has drawn a closed loop and would only retrace it.
            const qx = x - mx, qy = y - my
            if (qx * qx + qy * qy < 12.25 && qx * dx + qy * dy < 0) {
              if (++passes >= 2) {
                dead = true
                break
              }
              x = mx - qx
              y = my - qy
            }
          }
          if (!dead) dead = (x - mx) * (x - mx) + (y - my) * (y - my) < inside
          pts[base + c * 2] = x
          pts[base + c * 2 + 1] = y
          c++
          if (dead) break
          if (x < -12 || x > w + 12 || y < -12 || y > h + 12) break
        }
        counts[i] = c
      }

      // ---- the lines, batched by alpha family; and the stretches near the magnet, in NB
      const paths = LEVELS.map(() => new Path2D())
      const near1 = new Path2D()
      const near2 = new Path2D()
      const R1 = R * R, R2 = 0.55 * R * (0.55 * R)
      const hole = (sleeve - 1) * (sleeve - 1) // inside the magnet's sleeve the lines are its own
      for (let i = 0; i < n; i++) {
        const c = counts[i]
        if (c < 2) continue
        const base = i * (MAX + 1) * 2
        const p = paths[level[i]]
        let px = pts[base], py = pts[base + 1]
        p.moveTo(px, py)
        let in1 = false, in2 = false
        let gap = false
        for (let j = 1; j < c; j++) {
          const x = pts[base + j * 2], y = pts[base + j * 2 + 1]
          const dx = x - mx, dy = y - my
          const d2 = dx * dx + dy * dy
          if (d2 < hole) {
            if (!gap) p.lineTo(x, y)
            gap = true
            px = x
            py = y
            in1 = in2 = false
            continue
          }
          if (gap) {
            p.moveTo(px, py)
            gap = false
          }
          p.lineTo(x, y)
          if (d2 < R1) {
            if (!in1) near1.moveTo(px, py)
            near1.lineTo(x, y)
            in1 = true
          } else in1 = false
          if (d2 < R2) {
            if (!in2) near2.moveTo(px, py)
            near2.lineTo(x, y)
            in2 = true
          } else in2 = false
          px = x
          py = y
        }
      }
      for (let b = 0; b < LEVELS.length; b++) pen.neon(paths[b], NA, LEVELS[b] * breath(t, 5.5 + b * 0.8, 0.1, b * 1.3), 1.2)
      pen.neon(near1, NB, 0.2, 1.2)
      pen.neon(near2, NB, 0.3 - 0.1 * dive, 1.3)

      // ---- the beads: current running along twelve of the lines
      for (const bd of beads) {
        const L = (counts[bd.i] - 1) * STEP
        if (L < 40) continue
        const s = (t * bd.speed + bd.off) % L
        at(bd.i, s, head)
        at(bd.i, Math.max(0, s - 22), tail)
        const d = Math.hypot(head[0] - mx, head[1] - my)
        if (d < sleeve) continue // inside the magnet
        const k = clamp01(1 - d / R)
        const col = mix(NA, NB, k)
        pen.streak(tail[0], tail[1], head[0], head[1], col, 1, 2)
        pen.fill(P.circle(head[0], head[1], 1.9 + 0.8 * k), col, 0.7 + 0.3 * k)
      }

      // ---- the magnet: a glass sleeve and a diamond, white-hot when it has turned over
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.6)
      pen.glass(P.circle(mx, my, sleeve), 0.2 + 0.12 * dive, 2)
      const mc = mix(NC, WHITE, 0.45 * dive)
      pen.fill(P.diamond(mx, my, 8 + 2 * pulse + 3 * dive), mc, 0.95)
      pen.neon(P.diamond(mx, my, 18 + 4 * pulse), NC, 0.22 + 0.3 * dive, 1.2)
      if (dive > 0.02) pen.neon(P.circle(mx, my, sleeve - 1.5 + 3 * pulse), NC, 0.35 * dive, 1.2)
      wash(pen, NB, mx, my, R * 1.2, R * 1.2, 0.05 + 0.07 * dive)
    },
  }
}
