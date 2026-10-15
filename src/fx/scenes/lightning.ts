import { NB, NC, P, WHITE, mix, rgba, type RGB, type Scene } from '../../service/scenes/kit'
import { TAU, breath, clamp01, glint, hash, wash } from '../../service/stat/pictures/lib'

/*
 * LIGHTNING: bolts of light from the top of the box to a ground line near
 * the bottom. A bolt is a random walk down from its start (14 px steps, the
 * x jittering, with the odd kink) steered onto its foot, with two to four
 * branches that fork off it and die in the air, and a twig or two off those;
 * it is built whole the instant it fires, seeded by its fire time, so it
 * holds still while it shows. It strikes at full for 80 ms (blue, one in
 * three purple, a white-hot core and an overexposed white trunk), re-strikes
 * twice 60 ms apart, then fades over half a second on the sharp layer while
 * the bloom lingers and leaves the air faintly lit along the channel. Each
 * strike flashes the box white on the glow layer (120 ms): the sky lit from
 * the cloud base down, falling off toward the ground so the box never goes
 * a flat grey; it lights the cloud where the bolt left it, and the ground
 * glows at the foot for a second. A bolt that follows another within 0.6 s
 * finds the sky already lit and flashes it only a little (so holding the
 * button never strobes the box). Between bolts: dark, a faint cloud base, a
 * glass ground line with a slow rumble of light drifting along it, and a
 * drizzle of sixty faint specks falling (lit for an instant by every
 * flash). Bolts fire on their own every 1.2 to 3 s on a seeded schedule.
 * While the cursor is inside, every bolt lands at its x (and leaves the
 * cloud within 60 px of it), a charge pools on the ground under it with
 * streamers crackling up from it; pressing fires at once, and holding fires
 * about three times a second.
 */
interface Bolt {
  trunk: Path2D
  limbs: Path2D
  c: RGB
  hot: RGB
  born: number
  xTop: number
  xFoot: number
  /** how much of the box's flash this bolt gets (less on the heels of another) */
  fk: number
}
interface Speck {
  x0: number
  y0: number
  vx: number
  vy: number
  len: number
}

const CELL = 2.1 // s: one scheduled bolt per cell, fired 0 .. 0.9 s into it (gaps of 1.2 .. 3 s)
const LIFE = 2.4 // s: the last of the lit air
const MAX_BOLTS = 5
const HOLD = 0.34 // s: between bolts while the button is held (under three flashes a second)
const FLASH = 0.35 // the box's white flash at the top of the sky
/** the strikes: start, hold, brightness, the box's white flash */
const SPIKES: [number, number, number, number][] = [
  [0, 0.08, 1, FLASH],
  [0.14, 0.04, 0.82, 0.4 * FLASH],
  [0.2, 0.04, 0.66, 0],
]
const AFTER = 0.24 // s: the afterglow starts after the last re-strike

/** the strike's envelope at `age`: [core (the sharp layer), bloom (the glow layer), flash (the white wash)] */
function envelope(age: number): [number, number, number] {
  if (age < 0 || age >= LIFE) return [0, 0, 0]
  let core = 0, bloom = 0, flash = 0
  for (const [s, d, p, f] of SPIKES) {
    const a = age - s
    if (a < 0) continue
    flash += f * Math.max(0, 1 - a / 0.12)
    if (a < d) {
      core = Math.max(core, p)
      bloom = Math.max(bloom, p)
    } else {
      const e = a - d
      core = Math.max(core, p * 0.5 * Math.exp(-e / 0.07))
      bloom = Math.max(bloom, p * 0.65 * Math.exp(-e / 0.14))
    }
  }
  if (age > AFTER) {
    const f1 = clamp01((age - AFTER) / 0.5)
    core = Math.max(core, 0.32 * (1 - f1) * (1 - f1))
    const f2 = clamp01((age - AFTER) / 0.75)
    bloom = Math.max(bloom, 0.4 * Math.pow(1 - f2, 1.4))
    const f3 = clamp01((age - AFTER) / (LIFE - AFTER))
    bloom = Math.max(bloom, 0.17 * (1 - f3) * (1 - f3)) // the lit air, glow only
  }
  return [core, bloom, Math.min(FLASH, flash)]
}

/** a bolt, whole: the trunk walked from (xTop, 0) onto (xFoot, gy), its branches and twigs */
function build(seed: number, xTop: number, xFoot: number, gy: number, h: number, step: number, born: number, fk: number): Bolt {
  const R = (k: number) => hash((seed % 9973) * 0.731 + k * 1.137 + 0.21)
  const jit = 18 * (step / 14)
  const n = Math.max(4, Math.round(gy / step))
  const xs = new Float32Array(n + 1), ys = new Float32Array(n + 1)
  const trunk = new Path2D()
  trunk.moveTo(xTop, 0)
  xs[0] = xTop
  let x = xTop
  for (let i = 1; i <= n; i++) {
    const y = i === n ? gy : i * step
    const taper = Math.min(1, (n - i) / 2.5) // settles onto the foot
    let j = jit * (2 * R(i * 3 + 1) - 1)
    if (R(i * 3 + 2) < 0.14) j += jit * 1.8 * (2 * R(i * 3 + 3) - 1) // a kink
    x += (xFoot - x) / (n - i + 1) + j * taper
    xs[i] = x
    ys[i] = y
    trunk.lineTo(x, y)
  }
  const limbs = new Path2D()
  const nb = 2 + Math.floor(R(500) * 3) // 2 .. 4
  for (let b = 0; b < nb; b++) {
    const k = 600 + b * 7
    const fi = Math.floor(n * (0.1 + 0.6 * R(k)))
    const side = (b % 2 === 0 ? 1 : -1) * (R(k + 1) < 0.7 ? 1 : -1)
    let bx = xs[fi], by = ys[fi]
    const room = gy - 0.08 * h - by // it dies before the ground
    const len = Math.min(Math.floor((n - fi) * (0.25 + 0.5 * R(k + 2))), Math.floor(room / (step * 0.85)))
    if (len < 3) continue
    const lean = side * step * (0.45 + 0.5 * R(k + 3))
    let mx = bx, my = by
    limbs.moveTo(bx, by)
    for (let i = 1; i <= len; i++) {
      bx += lean * (1 - (0.5 * i) / len) + jit * 0.9 * (2 * R(700 + b * 61 + i * 3) - 1)
      by += step * (0.55 + 0.6 * R(701 + b * 61 + i * 3))
      limbs.lineTo(bx, by)
      if (i === Math.floor(len / 2)) (mx = bx), (my = by)
    }
    if (len >= 4 && R(k + 4) < 0.6) {
      // a twig off the branch's middle
      const tl = 2 + Math.floor(R(k + 5) * 3)
      limbs.moveTo(mx, my)
      for (let i = 1; i <= tl; i++) {
        mx += side * step * 0.8 + jit * 0.7 * (2 * R(800 + b * 61 + i * 3) - 1)
        my += step * 0.6
        limbs.lineTo(mx, my)
      }
    }
  }
  const c = R(900) < 0.33 ? NC : NB
  return { trunk, limbs, c, hot: mix(c, WHITE, 0.62), born, xTop, xFoot, fk }
}

export default function lightning(): Scene {
  let W = 1, H = 1
  let gy = 0 // the ground line
  let step = 14
  let lw = 2.4 // the trunk's width
  let ground = new Path2D()
  let specks: Speck[] = []
  let bolts: Bolt[] = []
  let lastCell = -1
  let lastPress = -9
  let charge = 0 // the hand's charge on the ground, eased
  let hx = 0 // where the hand last was
  let wasInside = false
  let entryAt = -1 // a strike owed to the hand's arrival
  let sky: CanvasGradient | null = null // the flash: lit from the cloud base down, built per size

  const fire = (seed: number, xFoot: number, xTop: number, born: number) => {
    xFoot = Math.max(0.03 * W, Math.min(0.97 * W, xFoot))
    xTop = Math.max(0.02 * W, Math.min(0.98 * W, xTop))
    const prev = bolts[bolts.length - 1]
    const fk = prev && born - prev.born < 0.6 ? 0.3 : 1 // on another's heels the sky is already lit
    bolts.push(build(seed, xTop, xFoot, gy, H, step, born, fk))
    if (bolts.length > MAX_BOLTS) bolts.shift()
  }

  return {
    init(w, h) {
      W = w
      H = h
      gy = h - Math.max(16, Math.min(0.14 * h, 120))
      step = Math.max(9, Math.min(14, h / 30))
      lw = Math.max(1.6, Math.min(3, h / 170))
      ground = P.line(0, gy, w, gy)
      bolts = []
      lastCell = -1
      lastPress = -9
      charge = 0
      wasInside = false
      entryAt = -1
      sky = null
      const fall = Math.max(0.5, h / 412)
      specks = Array.from({ length: 60 }, (_, i) => {
        const r = (k: number) => hash(i * 17 + k * 0.37 + 0.11)
        return { x0: r(1) * w, y0: r(2) * gy, vx: (r(3) - 0.5) * 10, vy: (45 + 70 * r(4)) * fall, len: 2.5 + 3 * r(5) }
      })
    },

    frame(pen, w, h, pointer, dt, t) {
      const { ctx, glow } = pen
      const inside = pointer.inside
      if (inside) hx = pointer.x

      // ---- the schedule: one bolt a cell, at a seeded moment in it; the hand's x is its foot
      const cell = Math.floor(t / CELL)
      const at = cell * CELL + 0.9 * hash(cell * 7 + 0.13)
      if (cell !== lastCell && t >= at) {
        lastCell = cell
        const s = cell * 31 + 29 // (29: the first bolts a visitor sees lead blue)
        const foot = inside ? pointer.x : W * (0.1 + 0.8 * hash(s + 0.41))
        const lean = inside ? 60 : Math.max(60, 0.1 * W)
        fire(s, foot, foot + (2 * hash(s + 0.67) - 1) * lean, at)
      }
      // ---- the hand's arrival owes it a strike (unless one is about to fall anyway)
      if (inside && !wasInside && (at < t || at - t > 0.8)) entryAt = t + 0.35
      wasInside = inside
      if (entryAt > 0 && (!inside || t >= entryAt)) {
        if (inside) {
          const s = (Math.floor(t * 1000) % 100000) + 5
          fire(s, pointer.x, pointer.x + (2 * hash(s + 0.67) - 1) * 60, t)
          lastPress = t
        }
        entryAt = -1
      }
      // ---- pressing fires at once (held: about three a second); a tap's own strike settles the arrival's
      if (inside && pointer.down && t - lastPress > HOLD) {
        lastPress = t
        entryAt = -1
        const s = (Math.floor(t * 1000) % 100000) + 3
        fire(s, pointer.x, pointer.x + (2 * hash(s + 0.67) - 1) * 60, t)
      }
      if (bolts.length && t - bolts[0].born > LIFE) bolts = bolts.filter(b => t - b.born < LIFE)

      // ---- the bolts: envelopes first (the flash lights the rain)
      let flash = 0
      const env: [number, number, number][] = []
      for (const b of bolts) {
        const e = envelope(t - b.born)
        e[2] *= b.fk
        env.push(e)
        flash += e[2]
      }
      flash = Math.min(FLASH, flash) // strikes stacked never flash brighter than one

      // ---- the cloud base, faintly there, lit by the strikes
      wash(pen, NB, w / 2, -0.04 * h, 0.7 * w, 0.12 * h, 0.07 * breath(t, 7.3, 0.4))

      // ---- the drizzle: sixty specks falling, lit for an instant by a flash
      ctx.beginPath()
      for (const s of specks) {
        const y = (s.y0 + s.vy * t) % gy
        const x = (((s.x0 + s.vx * t) % w) + w) % w
        ctx.moveTo(x, y)
        ctx.lineTo(x + s.vx * 0.04, y + s.len)
      }
      ctx.lineWidth = 0.9
      ctx.strokeStyle = rgba(WHITE, 0.11 * (1 + 4 * flash))
      ctx.stroke()

      // ---- the ground: a glass line, the rumble drifting along it, the hand's charge
      pen.glass(ground, 0.14 + 0.5 * flash, 3)
      const L = Math.max(80, 0.22 * w)
      const span = w + 2 * L
      const gx = ((t * Math.max(30, 0.055 * w)) % span) - L
      glint(pen, gx - L / 2, gy, gx + L / 2, gy, 0.14 * breath(t, 3.7, 0.4), 1)
      wash(pen, NB, gx, gy, L * 0.5, Math.max(8, 0.015 * h), 0.06 * breath(t, 2.9, 0.4, 1))
      const gx2 = w - (((t * Math.max(18, 0.03 * w) + 0.5 * span) % span) - L)
      glint(pen, gx2 - L * 0.3, gy, gx2 + L * 0.3, gy, 0.08 * breath(t, 5.1, 0.4, 2), 1)
      charge += ((inside ? 1 : 0) - charge) * Math.min(1, 5 * dt)
      if (charge > 0.01) {
        // the charge: a restless pool of blue on the ground under the hand, a bead crackling at its
        // middle, and streamers reaching up from the ground the way the ground answers a cloud
        const b = breath(t, 0.9, 0.35) * (0.85 + 0.15 * hash(Math.floor(t * 24)))
        wash(pen, NB, hx, gy, Math.max(60, 0.1 * w), Math.max(12, 0.025 * h), 0.55 * charge * b)
        glint(pen, hx - 48, gy, hx + 48, gy, 0.5 * charge * b, 1.2)
        ctx.fillStyle = rgba(WHITE, 0.7 * charge * b)
        ctx.beginPath()
        ctx.arc(hx, gy, 1.3, 0, TAU)
        ctx.fill()
        const tick = Math.floor(t * 11) // the streamers re-form eleven times a second
        const rise = Math.max(14, Math.min(34, 0.07 * h))
        const st = new Path2D()
        for (let i = 0; i < 4; i++) {
          const r = (j: number) => hash(tick * 3.17 + i * 17.3 + j * 0.37 + 0.05)
          if (r(0) < 0.3) continue // not every streamer, every tick
          let x = hx + (r(1) - 0.5) * 44, y = gy
          const n = 3 + Math.floor(r(2) * 3)
          const h0 = rise * (0.4 + 0.6 * r(3))
          st.moveTo(x, y)
          for (let j = 1; j <= n; j++) {
            x += (r(4 + j) - 0.5) * 8
            y -= (h0 / n) * (0.6 + 0.8 * r(10 + j))
            st.lineTo(x, y)
          }
        }
        pen.neon(st, NB, 0.75 * charge * b, 1)
      }

      // ---- the bolts
      bolts.forEach((b, i) => {
        const [core, bloom, f] = env[i]
        const age = t - b.born
        if (bloom > 0.004) {
          glow.strokeStyle = rgba(b.c, bloom)
          glow.lineWidth = lw * 3
          glow.stroke(b.trunk)
          glow.strokeStyle = rgba(b.c, bloom * 0.7)
          glow.lineWidth = lw * 1.8
          glow.stroke(b.limbs)
        }
        if (core > 0.004) {
          ctx.strokeStyle = rgba(b.c, core * 0.85)
          ctx.lineWidth = lw
          ctx.stroke(b.trunk)
          ctx.strokeStyle = rgba(b.c, core * 0.7)
          ctx.lineWidth = lw * 0.6
          ctx.stroke(b.limbs)
          ctx.strokeStyle = rgba(b.hot, core)
          ctx.lineWidth = Math.max(0.8, lw * 0.45)
          ctx.stroke(b.trunk)
          ctx.strokeStyle = rgba(b.hot, core * 0.8)
          ctx.lineWidth = Math.max(0.6, lw * 0.3)
          ctx.stroke(b.limbs)
          if (core > 0.6) {
            // the strike itself: overexposed white
            ctx.strokeStyle = rgba(WHITE, ((core - 0.6) / 0.4) * 0.9)
            ctx.lineWidth = lw * 1.5
            ctx.stroke(b.trunk)
          }
          // the foot, white-hot, and the bloom pooling there
          ctx.fillStyle = rgba(WHITE, core)
          ctx.beginPath()
          ctx.arc(b.xFoot, gy, lw * 1.1 + 2 * core, 0, TAU)
          ctx.fill()
          glow.fillStyle = rgba(b.c, core)
          glow.beginPath()
          glow.arc(b.xFoot, gy, lw * 3, 0, TAU)
          glow.fill()
        }
        // the cloud lit where the bolt left it, in the bolt's own colour
        if (f > 0.004) wash(pen, mix(b.c, WHITE, 0.3), b.xTop, 0, Math.max(110, 0.2 * w), Math.max(24, 0.11 * h), 1.6 * f)
        // the ground glowing at the foot for a second
        if (age < 1) {
          const g = Math.pow(1 - age, 1.5)
          wash(pen, b.c, b.xFoot, gy, Math.max(60, 0.1 * w) * (1 + 0.6 * age), Math.max(10, 0.02 * h) * (1 + age), 0.7 * g)
          const r = Math.max(50, 0.09 * w)
          const gr = ctx.createLinearGradient(b.xFoot - r, 0, b.xFoot + r, 0)
          gr.addColorStop(0, rgba(b.c, 0))
          gr.addColorStop(0.5, rgba(b.hot, 0.9 * g))
          gr.addColorStop(1, rgba(b.c, 0))
          ctx.strokeStyle = gr
          ctx.lineWidth = 1.4
          ctx.beginPath()
          ctx.moveTo(b.xFoot - r, gy)
          ctx.lineTo(b.xFoot + r, gy)
          ctx.stroke()
        }
      })

      // ---- the flash: the sky, white, on the glow layer: full at the cloud base, a third of it at the
      // ground, dark below (lit from above, not a flat grey card)
      if (flash > 0.004) {
        if (!sky) {
          sky = glow.createLinearGradient(0, 0, 0, h)
          sky.addColorStop(0, rgba(WHITE, 1))
          sky.addColorStop(0.45, rgba(WHITE, 0.6))
          sky.addColorStop(gy / h, rgba(WHITE, 0.3))
          sky.addColorStop(1, rgba(WHITE, 0.06))
        }
        glow.globalAlpha = flash
        glow.fillStyle = sky
        glow.fillRect(0, 0, w, h)
        glow.globalAlpha = 1
      }
    },
  }
}
