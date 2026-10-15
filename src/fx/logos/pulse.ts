import { NA, NB, NC, P, WHITE, mix, rgba, strike, type Pen, type RGB, type Scene } from '../../service/scenes/kit'
import { MARK, markFrame, markLength, markOutline } from '../logo'
import { TAU, easeOut, hash, hot, wash } from '../../service/stat/pictures/lib'

/*
 * PULSE: the mark's loops as glass sleeves with slugs of light racing round
 * them like current in a circuit: four to a loop, NA on loop A, NB on loop
 * B, each a short streak with a white-hot head, unevenly spaced and never
 * quite in step (each runs at its own pace, so they bunch and spread). The
 * diamond sits in the middle as glass; each time a slug passes the point of
 * its loop nearest the diamond the current jumps the gap and the diamond
 * strikes in NC, stuttering out over 0.4 s with a wash of its light on the
 * room. Behind every slug the sleeve glows for a moment.
 * The cursor speeds (up to 3x) and stretches the slugs near it and warms the
 * sleeve under it; pressing sends a surge: every slug doubles speed for a
 * second and the diamond flares, a ring of its light going out through the
 * loops.
 */
const N = 1200 // samples per contour in the slugs' table
const PER_LOOP = 4
const LAP = 0.35 // loops a second, at rest
const FLASH = 0.4 // seconds a strike takes to die
const SURGE = 1 // seconds a press doubles the current
const FL = 6 // flashes remembered (plenty: at most ~3 overlap)
const HOT: RGB[] = [hot(NA), hot(NB)]
/** the sleeve's tint where a slug has warmed it */
const TINT: RGB[] = [mix(NA, WHITE, 0.5), mix(NB, WHITE, 0.5)]

interface Slug {
  loop: number
  /** mark units along the contour: the head */
  pos: number
  /** mark units a second, at rest */
  speed: number
  /** the hand's boost, smoothed (1..3) */
  boost: number
}

export default function pulse(): Scene {
  let cx = 0, cy = 0, size = 100, s = 1, ox = 0, oy = 0
  let table: [number, number][][] = []
  let coarse: [number, number][][] = []
  const len = [1, 1, 1]
  /** where each loop passes nearest the diamond (mark units along it), and the gap the current jumps */
  const passAt = [0, 0]
  const sparks: Path2D[] = []
  let slugs: Slug[] = []
  let slugLen = 90
  /** px: the hand's reach (160, less in a small box) */
  let reach = 160
  /** px: how far along the sleeve the hand's warmth runs each way (70, less in a small box) */
  let warmR = 70
  /** the lit run behind a slug, in slug lengths (2, less in a small box, where it would fill the loop) */
  let trailRun = 2
  /** how much a boosted slug stretches per unit of boost (0.7: 2.4x at 3x; less in a small box) */
  let stretchK = 0.7
  /** the diamond's glass holds a little warmth from the strikes */
  let ember = 0
  const flashT = new Float64Array(FL).fill(-9)
  const flashLoop = new Int8Array(FL)
  const flashSeed = new Int32Array(FL)
  let flashN = 0
  let surgeT = -9
  // scratch
  const pa: [number, number] = [0, 0]
  const pb: [number, number] = [0, 0]
  const pc: [number, number] = [0, 0]

  /** the point `u` mark units along contour i (wrapping), from the table */
  const at = (i: number, u: number, out: [number, number]) => {
    const tb = table[i]
    const f = ((((u / len[i]) % 1) + 1) % 1) * N
    const k = Math.floor(f)
    const fr = f - k
    const a = tb[k % N]
    const b = tb[(k + 1) % N]
    out[0] = a[0] + (b[0] - a[0]) * fr
    out[1] = a[1] + (b[1] - a[1]) * fr
  }
  /** a polyline along contour i from `tail` for `length` (either way), in n steps */
  const trace = (k: CanvasRenderingContext2D, i: number, tail: number, length: number, n: number) => {
    at(i, tail, pc)
    k.beginPath()
    k.moveTo(pc[0], pc[1])
    for (let j = 1; j <= n; j++) {
      at(i, tail + (length * j) / n, pc)
      k.lineTo(pc[0], pc[1])
    }
  }
  /** the ends of a run along contour i from `from` for `length` into pa (the start) and pb (the end), apart enough for a gradient */
  const ends = (i: number, from: number, length: number) => {
    at(i, from, pa)
    at(i, from + length, pb)
    // a run folded on itself (never, in practice) would give a gradient one point
    if (Math.abs(pa[0] - pb[0]) + Math.abs(pa[1] - pb[1]) < 0.5) pa[0] -= 1
  }
  /**
   * the sleeve, lit for a moment where a slug has been: a soft run under the
   * slug and fading out behind its tail (continuous under the slug, so the
   * sleeve's light never steps where the slug's dark tail begins)
   */
  const trail = (pen: Pen, g: Slug, length: number, on: number, w: number) => {
    const { ctx, glow } = pen
    const c = g.loop === 0 ? NA : NB
    const run = length * trailRun
    const total = run + length
    const from = g.pos - total
    ends(g.loop, from, total)
    const n = Math.min(16, Math.max(5, Math.ceil(total / 30)))
    const kTail = run / total
    const gg = glow.createLinearGradient(pa[0], pa[1], pb[0], pb[1])
    gg.addColorStop(0, rgba(c, 0))
    gg.addColorStop(kTail, rgba(c, 0.22 * on))
    gg.addColorStop(1, rgba(c, 0.22 * on))
    glow.strokeStyle = gg
    glow.lineWidth = w * 1.4
    trace(glow, g.loop, from, total, n)
    glow.stroke()
    const gs = ctx.createLinearGradient(pa[0], pa[1], pb[0], pb[1])
    gs.addColorStop(0, rgba(c, 0))
    gs.addColorStop(kTail, rgba(TINT[g.loop], 0.11 * on))
    gs.addColorStop(1, rgba(TINT[g.loop], 0.11 * on))
    ctx.strokeStyle = gs
    ctx.lineWidth = w
    trace(ctx, g.loop, from, total, n)
    ctx.stroke()
  }
  /**
   * the sleeve warming under the hand: its colour blooming out from the point
   * nearest the cursor and fading to nothing R units along the sleeve each
   * way, a faint tint in the glass on the sharp layer (no hard ends, nothing
   * flat: the glass is lit, not filled)
   */
  const warm = (pen: Pen, i: number, u: number, R: number, near: number, w: number) => {
    const { ctx, glow } = pen
    const col = i === 0 ? NA : i === 1 ? NB : NC
    const tint = mix(col, WHITE, 0.5)
    const n = Math.min(10, Math.max(4, Math.ceil(R / 30)))
    // the two halves meet at the nearest point: butt ends, or their round caps stack into a dot there
    glow.lineCap = ctx.lineCap = 'butt'
    for (let dir = -1; dir <= 1; dir += 2) {
      ends(i, u, dir * R)
      const gg = glow.createLinearGradient(pa[0], pa[1], pb[0], pb[1])
      gg.addColorStop(0, rgba(col, 0.4 * near))
      gg.addColorStop(1, rgba(col, 0))
      glow.strokeStyle = gg
      glow.lineWidth = w * 1.3
      trace(glow, i, u, dir * R, n)
      glow.stroke()
      const gs = ctx.createLinearGradient(pa[0], pa[1], pb[0], pb[1])
      gs.addColorStop(0, rgba(tint, 0.12 * near))
      gs.addColorStop(1, rgba(tint, 0))
      ctx.strokeStyle = gs
      ctx.lineWidth = w
      trace(ctx, i, u, dir * R, n)
      ctx.stroke()
    }
    glow.lineCap = ctx.lineCap = 'round'
  }
  /** a slug: a streak along its loop, dark at the tail, white-hot at the head */
  const streak = (pen: Pen, g: Slug, length: number, on: number, w: number) => {
    const { ctx, glow } = pen
    const c = g.loop === 0 ? NA : NB
    const tail = g.pos - length
    ends(g.loop, tail, length)
    const n = Math.min(12, Math.max(4, Math.ceil(length / 30)))
    const gg = glow.createLinearGradient(pa[0], pa[1], pb[0], pb[1])
    gg.addColorStop(0, rgba(c, 0))
    gg.addColorStop(1, rgba(c, on))
    glow.strokeStyle = gg
    glow.lineWidth = w * 2.6
    trace(glow, g.loop, tail, length, n)
    glow.stroke()
    const gs = ctx.createLinearGradient(pa[0], pa[1], pb[0], pb[1])
    gs.addColorStop(0, rgba(c, 0))
    gs.addColorStop(0.7, rgba(c, on * 0.8))
    gs.addColorStop(1, rgba(HOT[g.loop], on))
    ctx.strokeStyle = gs
    ctx.lineWidth = w
    trace(ctx, g.loop, tail, length, n)
    ctx.stroke()
    // the head
    glow.fillStyle = rgba(c, on)
    glow.beginPath()
    glow.arc(pb[0], pb[1], w * 1.9, 0, TAU)
    glow.fill()
    ctx.fillStyle = rgba(WHITE, on)
    ctx.beginPath()
    ctx.arc(pb[0], pb[1], w * 0.8, 0, TAU)
    ctx.fill()
  }

  return {
    init(w, h) {
      size = Math.min(h * 0.72, w * 0.6)
      cx = w / 2
      cy = h / 2
      s = size / MARK.h
      ox = cx - (MARK.w * s) / 2
      oy = cy - (MARK.h * s) / 2
      table = markOutline(N)
      coarse = markOutline(240)
      for (let i = 0; i < 3; i++) len[i] = markLength(i)
      // where each loop comes nearest the mark's centre, and the diamond's nearest point to that
      sparks.length = 0
      for (let i = 0; i < 2; i++) {
        let best = 0, bd = Infinity
        table[i].forEach(([x, y], k) => {
          const d = (x - MARK.cx) ** 2 + (y - MARK.cy) ** 2
          if (d < bd) (bd = d), (best = k)
        })
        passAt[i] = (len[i] * best) / N
        const [px, py] = table[i][best]
        let gx = px, gy = py, gd = Infinity
        for (const [x, y] of table[2]) {
          const d = (x - px) ** 2 + (y - py) ** 2
          if (d < gd) (gd = d), (gx = x), (gy = y)
        }
        sparks[i] = P.line(px, py, gx, gy)
      }
      // a slug is ~90 mark units, never shorter than 8.5% of the mark's height or 18 px (so it reads as a slug, not a bead)
      slugLen = Math.max(90, Math.max(18, size * 0.085) / s)
      reach = Math.min(160, Math.max(80, size * 0.5))
      // in a small box the hand's warmth, the trails and the stretch are reined in, or boosted slugs bunched on a curl fill the loop and blow out
      warmR = Math.min(70, size * 0.22)
      trailRun = Math.max(1.2, Math.min(2, size / 150))
      stretchK = Math.max(0.35, Math.min(0.7, size / 420))
      ember = 0
      slugs = []
      for (let loop = 0; loop < 2; loop++) {
        for (let k = 0; k < PER_LOOP; k++) {
          const seed = loop * PER_LOOP + k + 1
          slugs.push({
            loop,
            pos: len[loop] * ((k + 0.5 + (hash(seed * 3 + 1) - 0.5) * 0.7) / PER_LOOP),
            speed: len[loop] * LAP * (0.86 + 0.28 * hash(seed * 3 + 2)),
            boost: 1,
          })
        }
      }
      flashT.fill(-9)
      flashN = 0
      surgeT = -9
    },

    frame(pen, _w, _h, pointer, dt, t) {
      const { ctx, glow } = pen
      const W = (px: number) => px / s
      // a press sends a surge (held: one a second)
      if (pointer.inside && pointer.down && t - surgeT >= SURGE) surgeT = t
      const sAge = t - surgeT
      const surge = sAge < SURGE ? (sAge < SURGE - 0.25 ? 1 : (SURGE - sAge) / 0.25) : 0
      // the hand, in mark units, and the sleeve nearest it
      const mx = (pointer.x - ox) / s, my = (pointer.y - oy) / s
      let nearI = -1, nearK = 0, nearD2 = Infinity
      if (pointer.inside) {
        for (let i = 0; i < 3; i++) {
          const pts = coarse[i]
          for (let k = 0; k < pts.length; k++) {
            const dx = pts[k][0] - mx, dy = pts[k][1] - my
            const d2 = dx * dx + dy * dy
            if (d2 < nearD2) (nearD2 = d2), (nearI = i), (nearK = k)
          }
        }
      }
      const nearD = Math.sqrt(nearD2) * s
      const near = nearD < reach ? 1 - nearD / reach : 0

      // the current runs; a slug passing the diamond's point strikes it
      for (const g of slugs) {
        const L = len[g.loop]
        at(g.loop, g.pos, pa)
        let want = 1
        if (pointer.inside) {
          const d = Math.hypot((pa[0] - mx) * s, (pa[1] - my) * s)
          if (d < reach) want = 1 + (1 - d / reach) * 2
        }
        g.boost += (want - g.boost) * Math.min(1, 8 * dt)
        const step = g.speed * g.boost * (1 + surge) * dt
        const ahead = (((passAt[g.loop] - g.pos) % L) + L) % L
        if (ahead < step) {
          const j = flashN % FL
          flashT[j] = t
          flashLoop[j] = g.loop
          flashSeed[j] = flashN
          flashN++
        }
        g.pos = (g.pos + step) % L
      }
      // the diamond's light: each strike dying, stuttering as it goes; the freshest jumps the gap
      let fl = 0, sparkLoop = -1, sparkAge = 9
      for (let j = 0; j < FL; j++) {
        const age = t - flashT[j]
        if (age < 0 || age >= FLASH) continue
        const k = 1 - age / FLASH
        fl += k * k * (strike(age + 0.03, flashSeed[j]) > 0.2 ? 1 : 0.45)
        if (age < sparkAge) (sparkAge = age), (sparkLoop = flashLoop[j])
      }
      const flare = sAge < SURGE ? 0.45 + 0.55 * (1 - sAge / SURGE) ** 2 : 0
      // the ember: a little of each strike stays in the glass and fades over a couple of seconds
      ember = Math.max(ember * Math.exp(-dt / 1.6), Math.min(0.2, 0.2 * fl))
      const on = Math.min(1.25, fl + flare + ember)

      ctx.save()
      glow.save()
      markFrame(ctx, cx, cy, size)
      markFrame(glow, cx, cy, size)
      // the glass: two sleeves and the diamond
      for (let i = 0; i < 3; i++) pen.glass(MARK.all[i], 0.2 + (i === nearI ? 0.1 * near : 0), W(9))
      // the sleeve warms under the hand
      if (near > 0.01 && nearI >= 0) warm(pen, nearI, (len[nearI] * nearK) / coarse[nearI].length, W(warmR), near, W(9))
      // the slugs, each with the sleeve lit for a moment behind it
      const stretch = (g: Slug) => slugLen * (1 + stretchK * (g.boost - 1)) * (1 + 0.4 * surge)
      const lit = (g: Slug) => Math.min(1.15, 0.92 + 0.12 * (g.boost - 1) + 0.15 * surge)
      for (const g of slugs) trail(pen, g, stretch(g), lit(g), W(8))
      for (const g of slugs) streak(pen, g, stretch(g), lit(g), W(2.4) * (1 + 0.12 * (g.boost - 1)))
      // the diamond struck, and the current jumping the gap
      if (on > 0.004) {
        pen.wash(MARK.diamond, NC, 0.3 * on)
        pen.neon(MARK.diamond, NC, on, W(2.4))
      }
      if (sparkLoop >= 0 && sparkAge < 0.14) pen.neon(sparks[sparkLoop], NC, (1 - sparkAge / 0.14) * 0.9, W(1.4))
      ctx.restore()
      glow.restore()
      // the room: the diamond's light, and the surge's ring going out through the loops
      wash(pen, NC, cx, cy, size * 0.36, size * 0.36, 0.2 * on)
      if (sAge >= 0 && sAge < 0.7) {
        const k = sAge / 0.7
        pen.neon(P.circle(cx, cy, size * (0.08 + 0.58 * easeOut(k))), NC, (1 - k) * 0.4, 1.4)
      }
    },
  }
}
