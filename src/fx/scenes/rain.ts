import { NA, NB, WHITE, mix, rgba, type RGB, type Scene } from '../../service/scenes/kit'
import { TAU, clamp01, easeOut, hash, hot } from '../../service/stat/pictures/lib'

/*
 * RAIN: rain on a window at night. Behind the glass a few lights hang out of
 * focus, soft discs in the lead and second lights and a cool white, drifting.
 * On the glass, drops: each a bead with a white-hot core blooming in the
 * second light that lands, swells, sits a moment and then runs, wobbling,
 * slipping and sticking, behind a thin fading streak, taking any smaller
 * drop it touches and growing with it; a few only sit and tremble. A drop
 * over a background light lights up with it. Drops that reach the sill die
 * and land again somewhere else.
 *
 * The hand is a finger on the glass: drops under it are wiped away (a tiny
 * splash each), the ones near it are pushed aside and set running, and a
 * faint clear streak follows where the finger went, fading over two
 * seconds. Pressing wipes a wider circle.
 *
 * Everything is batched: the beads go in one Path2D per colour-and-level
 * bucket, the trails in three (near, mid, far), the splashes in three ages;
 * the streak is one short butt-capped stroke per remembered step, each at
 * its own fade, so it thins evenly with no seams.
 */

interface Light {
  c: RGB
  x0: number
  y0: number
  ax: number
  ay: number
  fx: number
  fy: number
  ph: number
  r: number
  a: number
}

interface Drop {
  /** the track's base x (the wobble rides on it) */
  x0: number
  y: number
  /** the full radius */
  r: number
  /** the drawn radius this frame (0 before it lands) */
  cur: number
  born: number
  swell: number
  /** seconds it sits after swelling before it runs (Infinity: a still drop) */
  dwell: number
  running: boolean
  runT: number
  vy: number
  /** the base speed (px/s) at a radius of 1.8: it runs faster as it grows */
  speed: number
  amp: number
  k1: number
  ph1: number
  k2: number
  ph2: number
  ph: number
  seed: number
  /** the trail's length, grown from the drop */
  trail: number
  /** which light it sits over (-1: none) and how much */
  slot: number
  lit: number
}

interface Splash {
  x: number
  y: number
  r: number
  born: number
}

interface Pt {
  x: number
  y: number
  t: number
  wide: boolean
  /** the finger lifted and landed again: no smear between this and the point before */
  brk: boolean
}

const MAX_SPLASH = 32
const TRAIL_PTS = 40
const STREAK_LIFE = 2
const LEVELS = 4
/** the smear's fade steps (one polyline each; twelve is fine enough that no step shows, even on a phone) */
const BANDS = 12
/** the "white" light behind the glass: a pale blue-white (a neutral white at this depth reads as grey, not light) */
const COOL: RGB = mix(NB, WHITE, 0.25)
/** the first stretch of a trail, just behind the bead: wetter, a touch hotter */
const WET: RGB = mix(NB, WHITE, 0.35)

/** the disc of an out-of-focus light: a flat middle, a slightly brighter rim, a soft edge */
const discShape = (u: number) => (u >= 1 ? 0 : u < 0.7 ? 0.92 : u < 0.8 ? 0.92 + 0.8 * (u - 0.7) : (1 - u) / 0.2)

export default function rain(): Scene {
  let W = 1, H = 1
  let sc = 1
  let lights: Light[] = []
  let lx: number[] = [], ly: number[] = [], la: number[] = []
  let drops: Drop[] = []
  let splashes: Splash[] = []
  let pts: Pt[] = []
  let gen = 0
  let nDrops = 0
  let rMax = 3.2
  let discs: CanvasGradient[] | null = null
  let discFor: CanvasRenderingContext2D | null = null
  /** per (slot, level): the bloom and core styles; slot 0 is plain NB, slot i+1 is over light i */
  let glowStyle: string[][] = []
  let coreStyle: string[][] = []
  let push = 0
  /** init seeds the drops as if t were 0; the first frame after it shifts them to the real clock */
  let fresh = true
  let smearW = 24

  const wob = (d: Drop, y: number) => d.amp * Math.sin(y * d.k1 + d.ph1) + d.amp * 0.25 * Math.sin(y * d.k2 + d.ph2)

  /** a drop lands fresh at a random place (hash seeded by its index and generation) */
  const land = (d: Drop, i: number, t: number, initial: boolean) => {
    gen++
    const s = i * 131 + gen * 17
    const h = (k: number) => hash(s + k * 7.1)
    d.seed = s
    let x = 3 + h(1) * (W - 6)
    let y = h(2) * H * 0.96
    // not under the finger, and not where it just wiped
    for (let tries = 0; tries < 4; tries++) {
      let bad = false
      for (let k = pts.length - 1; k >= 0 && k >= pts.length - 12; k--) {
        const p = pts[k]
        if (t - p.t < STREAK_LIFE * 0.6 && Math.hypot(p.x - x, p.y - y) < (p.wide ? 70 : 36)) {
          bad = true
          break
        }
      }
      if (!bad) break
      x = 3 + h(20 + tries) * (W - 6)
      y = h(30 + tries) * H * 0.96
    }
    d.x0 = x
    d.y = y
    d.r = (1.2 + h(3) * 1.2) * sc
    d.cur = 0
    d.born = initial ? t - h(4) * 6 : t + 0.1 + h(4) * 1.4
    d.swell = 0.5 + h(5) * 1.3
    d.dwell = h(6) < 0.16 ? Infinity : 0.3 + Math.pow(h(7), 2) * 4
    d.running = false
    d.runT = 0
    d.vy = 0
    d.speed = (45 + h(8) * 120) * sc
    d.amp = (1.2 + h(9) * 2.6) * sc
    d.k1 = TAU / ((40 + h(10) * 70) * sc)
    d.ph1 = h(11) * TAU
    d.k2 = TAU / ((14 + h(12) * 18) * sc)
    d.ph2 = h(13) * TAU
    d.ph = h(14) * TAU
    d.trail = 0
    d.slot = 0
    d.lit = 0
  }

  const splash = (d: Drop, t: number) => {
    if (d.cur < 0.5) return
    if (splashes.length >= MAX_SPLASH) splashes.shift()
    splashes.push({ x: d.x0 + wob(d, d.y), y: d.y, r: d.cur, born: t })
  }

  const startRun = (d: Drop, t: number) => {
    if (d.running) return
    d.running = true
    d.runT = t
    d.trail = 0
  }

  return {
    init(w, h) {
      W = w
      H = h
      sc = Math.sqrt(Math.max(0.8, Math.min(2, h / 412)))
      rMax = 3.4 * sc
      smearW = 24 * (0.55 + 0.45 * sc)
      // the lights behind the glass: the lead twice, the second twice, one cool white; sized by the
      // box's area (a wide thin band gets lights that fit inside it, not discs taller than the band)
      const m = Math.sqrt(w * h)
      const cols: RGB[] = [NA, NB, NA, COOL, NB]
      const n = w < 480 ? 4 : 5
      lights = []
      for (let i = 0; i < n; i++) {
        const hh = (k: number) => hash(i * 53 + k * 3.3)
        const c = cols[i]
        lights.push({
          c,
          x0: (0.08 + 0.84 * ((i + 0.5) / n) + (hh(1) - 0.5) * 0.14) * w,
          y0: (0.18 + hh(2) * 0.6) * h,
          ax: (0.04 + hh(3) * 0.06) * w,
          ay: (0.04 + hh(4) * 0.06) * h,
          fx: 0.06 + hh(5) * 0.07,
          fy: 0.05 + hh(6) * 0.06,
          ph: hh(7) * TAU,
          r: Math.min(0.45 * h, (0.07 + hh(8) * 0.05) * m),
          a: c === COOL ? 0.1 : 0.11 + hh(9) * 0.05,
        })
      }
      lx = new Array(n).fill(0)
      ly = new Array(n).fill(0)
      la = new Array(n).fill(0)
      discs = null
      discFor = null
      glowStyle = []
      coreStyle = []
      for (let s = 0; s <= lights.length; s++) {
        glowStyle[s] = []
        coreStyle[s] = []
        for (let l = 0; l < LEVELS; l++) {
          const k = l / (LEVELS - 1)
          const c = s === 0 ? NB : mix(NB, lights[s - 1].c, 0.45 + 0.35 * k)
          glowStyle[s][l] = rgba(c, 0.5 + 0.5 * k)
          coreStyle[s][l] = rgba(hot(c), 0.72 + 0.28 * k)
        }
      }
      nDrops = Math.max(60, Math.min(240, Math.round((w * h) / 1900)))
      splashes = []
      pts = []
      gen = 0
      drops = []
      for (let i = 0; i < nDrops; i++) {
        const d = {} as Drop
        land(d, i, 0, true)
        // the ones that landed a while ago are already running, with a head start
        const age = -d.born
        if (age > d.swell + d.dwell) {
          d.running = true
          d.runT = -(age - d.swell - d.dwell)
          d.y = Math.min(H * 0.96, d.y + d.speed * 0.6 * (age - d.swell - d.dwell))
          d.trail = 1
        }
        drops.push(d)
      }
      push = 0
      fresh = true
    },

    frame(pen, w, h, pointer, dt, t) {
      const { ctx, glow } = pen
      if (fresh) {
        // init's clock started at 0; move every drop's schedule onto the runner's t
        fresh = false
        for (const d of drops) {
          d.born += t
          d.runT += t
        }
      }
      const hand = pointer.inside
      push += ((hand ? 1 : 0) - push) * Math.min(1, 6 * dt)
      const wipeR = (pointer.down ? 120 : 60) * Math.min(1, 0.6 + 0.4 * sc)
      const pushR = pointer.down ? 140 : 100

      // ---- the lights behind the glass (glow layer), drifting
      if (discFor !== glow || !discs) {
        discFor = glow
        discs = lights.map(L => {
          const g = glow.createRadialGradient(0, 0, 0, 0, 0, 1)
          g.addColorStop(0, rgba(L.c, 0.92))
          g.addColorStop(0.7, rgba(L.c, 0.92))
          g.addColorStop(0.8, rgba(L.c, 1))
          g.addColorStop(1, rgba(L.c, 0))
          return g
        })
      }
      for (let i = 0; i < lights.length; i++) {
        const L = lights[i]
        const x = L.x0 + L.ax * Math.sin(t * L.fx + L.ph) + L.ax * 0.3 * Math.sin(t * L.fx * 2.7 + L.ph * 2)
        const y = L.y0 + L.ay * Math.sin(t * L.fy + L.ph * 1.7)
        const a = L.a * (1 + 0.12 * Math.sin(t * 0.37 + L.ph * 3))
        lx[i] = x
        ly[i] = y
        la[i] = a
        glow.save()
        glow.translate(x, y)
        glow.scale(L.r, L.r)
        glow.globalAlpha = a
        glow.fillStyle = discs![i]
        glow.fillRect(-1, -1, 2, 2)
        glow.restore()
      }

      // ---- the finger's streak: remember where it went
      if (hand) {
        const last = pts[pts.length - 1]
        const gap = last ? Math.hypot(last.x - pointer.x, last.y - pointer.y) : 0
        if (!last || gap > 3 || last.wide !== pointer.down) {
          if (pts.length >= TRAIL_PTS) pts.shift()
          pts.push({ x: pointer.x, y: pointer.y, t, wide: pointer.down, brk: !last || gap > 90 || t - last.t > 0.35 })
        } else last.t = t
      }
      while (pts.length && t - pts[0].t > STREAK_LIFE) pts.shift()

      // ---- the drops: land, swell, sit, run; the finger wipes and pushes
      const beadGlow: (Path2D | null)[] = []
      const beadCore: (Path2D | null)[] = []
      const glints = new Path2D()
      let anyGlint = false
      const trails = [new Path2D(), new Path2D(), new Path2D()]
      let anyTrail = false

      for (let i = 0; i < drops.length; i++) {
        const d = drops[i]
        const age = t - d.born
        if (age < 0) {
          d.cur = 0
          continue
        }
        // the swell: up past its size and back as it lands
        const u = age / d.swell
        let cur = d.r * (u < 1 ? easeOut(u) * (1 + 0.22 * Math.sin(u * Math.PI)) : 1)
        // sitting drops tremble in bursts
        let tx = 0
        if (!d.running) {
          const gate = hash(Math.floor(t * 1.4 + d.ph) + d.seed) < 0.35 ? 1 : 0
          if (gate) {
            cur *= 1 + 0.07 * Math.sin(t * 29 + d.ph)
            tx = 0.5 * sc * Math.sin(t * 31 + d.ph * 2)
          }
          if (u >= 1 && age - d.swell > d.dwell) startRun(d, t)
        }
        d.cur = cur

        // the finger: wipe under it, push beside it
        if (push > 0.02) {
          const x = d.x0 + wob(d, d.y)
          const dx = x - pointer.x
          const dy = d.y - pointer.y
          const dist = Math.hypot(dx, dy)
          if (dist < wipeR * push) {
            splash(d, t)
            land(d, i, t, false)
            continue
          }
          if (dist < pushR) {
            const k = (1 - dist / pushR) * push
            d.x0 += Math.sign(dx || 1) * k * k * 260 * dt
            if (k > 0.3 && u >= 1 && !d.running) startRun(d, t)
            if (d.x0 < -6 || d.x0 > W + 6) {
              land(d, i, t, false)
              continue
            }
          }
        }

        if (d.running) {
          // slipping and sticking: a swell and a stall, by its own seeds
          const m = 0.62 + 0.38 * Math.sin(t * (2.2 + hash(d.seed) * 2) + d.ph)
          const stall = hash(Math.floor(t * 2.5 + d.ph) * 3 + d.seed) < 0.14 ? 0.18 : 1
          const want = d.speed * (d.cur / (1.8 * sc)) * m * stall
          d.vy += (want - d.vy) * Math.min(1, 5 * dt)
          d.y += d.vy * dt
          d.trail = Math.min(1, d.trail + dt * 2)
          if (d.y > H + d.cur + 2) {
            land(d, i, t, false)
            continue
          }
          // it takes any smaller drop it touches; a bigger one takes it
          const x = d.x0 + wob(d, d.y)
          const reach = d.cur + rMax
          for (let j = 0; j < drops.length; j++) {
            if (j === i) continue
            const o = drops[j]
            if (o.cur <= 0) continue
            const oy = o.y
            if (oy < d.y - reach || oy > d.y + reach) continue
            const ox = o.x0 + wob(o, oy)
            if (Math.abs(ox - x) > reach) continue
            if (Math.hypot(ox - x, oy - d.y) > d.cur + o.cur) continue
            if (o.cur <= d.cur) {
              d.r = Math.min(rMax, Math.sqrt(d.r * d.r + o.r * o.r * 0.7))
              land(o, j, t, false)
            } else {
              o.r = Math.min(rMax, Math.sqrt(o.r * o.r + d.r * d.r * 0.7))
              startRun(o, t)
              land(d, i, t, false)
              break
            }
          }
          if (d.cur <= 0) continue
        }

        // over a light it lights up with it
        const x = d.x0 + wob(d, d.y) + tx
        let lit = 0, slot = 0, best = 0
        for (let k = 0; k < lights.length; k++) {
          const L = lights[k]
          const dd = Math.hypot(x - lx[k], d.y - ly[k]) / L.r
          if (dd >= 1) continue
          const v = discShape(dd) * (la[k] / 0.13)
          lit += v
          if (v > best) (best = v), (slot = k + 1)
        }
        lit = clamp01(lit)
        if (lit < 0.1) slot = 0
        const level = Math.min(LEVELS - 1, Math.floor(lit * LEVELS))
        d.slot = slot
        d.lit = lit
        const key = slot * LEVELS + level
        const bg = beadGlow[key] ?? (beadGlow[key] = new Path2D())
        const bc = beadCore[key] ?? (beadCore[key] = new Path2D())
        const rg = d.cur + 1.3 * sc + 0.5 * lit
        bg.moveTo(x + rg, d.y)
        bg.arc(x, d.y, rg, 0, TAU)
        bc.moveTo(x + d.cur, d.y)
        bc.arc(x, d.y, d.cur, 0, TAU)
        if (d.cur > 1.3 * sc) {
          const gr = d.cur * 0.32
          const gx = x - d.cur * 0.3, gy = d.y - d.cur * 0.32
          glints.moveTo(gx + gr, gy)
          glints.arc(gx, gy, gr, 0, TAU)
          anyGlint = true
        }

        // the trail: three segments behind a running drop along its own track, longer the faster it runs
        if (d.running && d.vy > 4 * sc) {
          const L = Math.max(10 * sc, Math.min(80 * sc, d.vy * 0.42)) * easeOut(d.trail)
          let px = x, py = d.y
          for (let s = 0; s < 3; s++) {
            const yy = d.y - (L * (s + 1)) / 3
            const xx = d.x0 + wob(d, yy)
            trails[s].moveTo(px, py)
            trails[s].lineTo(xx, yy)
            px = xx
            py = yy
          }
          anyTrail = true
        }
      }

      // ---- draw: trails, then beads (bloom under, core over), then glints
      if (anyTrail) {
        const on = [0.6, 0.32, 0.12]
        for (let s = 0; s < 3; s++) {
          glow.lineWidth = 3.4 * sc
          glow.strokeStyle = rgba(NB, on[s])
          glow.stroke(trails[s])
          ctx.lineWidth = 1.1 * sc
          ctx.strokeStyle = rgba(s === 0 ? WET : NB, on[s] * 0.75)
          ctx.stroke(trails[s])
        }
      }
      for (let key = 0; key < beadGlow.length; key++) {
        const bg = beadGlow[key]
        if (!bg) continue
        const slot = Math.floor(key / LEVELS), level = key % LEVELS
        glow.fillStyle = glowStyle[slot][level]
        glow.fill(bg)
        ctx.fillStyle = coreStyle[slot][level]
        ctx.fill(beadCore[key]!)
      }
      if (anyGlint) {
        ctx.fillStyle = rgba(WHITE, 0.85)
        ctx.fill(glints)
      }

      // ---- the splashes: tiny rings, three ages
      if (splashes.length) {
        const rings = [new Path2D(), new Path2D(), new Path2D()]
        const any = [false, false, false]
        let keep = 0
        for (const s of splashes) {
          const q = (t - s.born) / 0.3
          if (q >= 1) continue
          splashes[keep++] = s
          const b = Math.min(2, Math.floor(q * 3))
          const r = s.r + (1 + 4.5 * sc) * easeOut(q)
          rings[b].moveTo(s.x + r, s.y)
          rings[b].arc(s.x, s.y, r, 0, TAU)
          any[b] = true
        }
        splashes.length = keep
        const on = [0.7, 0.36, 0.12]
        for (let b = 0; b < 3; b++) {
          if (!any[b]) continue
          glow.lineWidth = 2.4
          glow.strokeStyle = rgba(NB, on[b])
          glow.stroke(rings[b])
          ctx.lineWidth = 0.9
          ctx.strokeStyle = rgba(hot(NB), on[b] * 0.9)
          ctx.stroke(rings[b])
        }
      }

      // ---- the finger's streak on the glass: a faint white stroke, fading over two seconds
      if (pts.length > 1) {
        // one polyline per fade band (and per width): round joins carry it round every turn in one
        // stroke, and the bands are fine enough that no step shows where they meet (butt ends there)
        const bands: (Path2D | null)[] = []
        let prevB = -1
        for (let i = 0; i < pts.length; i++) {
          const p = pts[i]
          const fade = 1 - (t - p.t) / STREAK_LIFE
          if (fade <= 0 || p.brk) prevB = -1
          if (fade <= 0) continue
          const b = Math.min(BANDS - 1, Math.floor(fade * BANDS)) + (p.wide ? BANDS : 0)
          const path = bands[b] ?? (bands[b] = new Path2D())
          if (b !== prevB) {
            if (prevB >= 0) path.moveTo(pts[i - 1].x, pts[i - 1].y)
            else path.moveTo(p.x, p.y)
          }
          path.lineTo(p.x + (prevB < 0 ? 0.01 : 0), p.y)
          prevB = b
        }
        ctx.lineCap = 'butt'
        for (let b = 0; b < BANDS * 2; b++) {
          const path = bands[b]
          if (!path) continue
          const fade = ((b % BANDS) + 0.5) / BANDS
          ctx.lineWidth = smearW * (b >= BANDS ? 1.6 : 1)
          ctx.strokeStyle = rgba(WHITE, 0.05 * fade)
          ctx.stroke(path)
        }
        ctx.lineCap = 'round'
      }
      // the fingertip itself: a small pale print where it rests on the glass, a little wider pressed;
      // the wipe shows by what is gone, not by a cloud
      if (hand && push > 0.02) {
        const rp = (pointer.down ? 40 : 28) * Math.min(1, 0.6 + 0.4 * sc)
        const g = glow.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, rp * 1.2)
        g.addColorStop(0, rgba(COOL, 0.09 * push))
        g.addColorStop(0.5, rgba(COOL, 0.03 * push))
        g.addColorStop(1, rgba(COOL, 0))
        glow.fillStyle = g
        glow.fillRect(pointer.x - rp * 1.2, pointer.y - rp * 1.2, rp * 2.4, rp * 2.4)
        const s = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, rp)
        s.addColorStop(0, rgba(WHITE, 0.1 * push))
        s.addColorStop(0.55, rgba(WHITE, 0.045 * push))
        s.addColorStop(1, rgba(WHITE, 0))
        ctx.fillStyle = s
        ctx.fillRect(pointer.x - rp, pointer.y - rp, rp * 2, rp * 2)
      }
    },
  }
}
