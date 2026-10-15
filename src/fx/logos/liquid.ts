import { NA, NB, NC, WHITE, mix, rgba, type RGB, type Scene } from '../../service/scenes/kit'
import { MARK, markBounds, markFrame, markOutline } from '../logo'
import { TAU, breath, hash, smooth, wash } from '../../service/stat/pictures/lib'

/*
 * LIQUID: the mark as hollow glass, its sleeves a little heavier than the
 * site's usual tube, and inside them liquid light. Everything below a wavy
 * surface is lit (NA in the loops, NC in the diamond): a gradient brightest
 * at the surface, a white-hot surface line, a soft band of glow under it,
 * motes rising in the light. The level cycles on t (ten seconds): it pours
 * in from the bottom of the mark over four seconds, holds full for two,
 * drains over three and rests empty for one. The surface sloshes: a damped
 * spring (2 Hz, lightly damped) tilts it about the mark's middle, so the
 * lit area stays what the level says. The pour and the drain each kick it;
 * the hand drives it: where it points is the tilt (the light leans toward
 * the cursor), how fast it moves is the kick, and a press jolts it. Two
 * sines ripple the surface always, choppier while it sloshes.
 */
const CYCLE = 10
const FILL = 4
const HOLD = 2
const DRAIN = 3
/** the surface at full (lapping just inside the top of loop A) and empty (below the mark) */
const Y_FULL = 0.03 * MARK.h
const Y_EMPTY = 1.05 * MARK.h
const OMEGA = TAU * 2 // 2 Hz
const ZETA = 0.14
const SEGS = 56
/** the surface polyline reaches past the mark at any tilt */
const HALF = 1.15 * Math.hypot(MARK.w / 2, MARK.h)
const DEEP = 4000
/** a mote rises this far (mark units) from where it was sown, then is sown again */
const RISE = 230
const K1 = (TAU * 1.5) / MARK.w
const K2 = (TAU * 3.4) / MARK.w

interface Mote {
  x: number
  y: number
  v: number
  ph: number
  r: number
}
interface Vessel {
  path: Path2D
  c: RGB
  deep: RGB
  motes: Mote[]
  wt: number
  /** the vessel's floor (mark units): its gradient runs from the surface to here */
  bottom: number
  /** how much brighter its liquid is (the small diamond holds a hotter light) */
  amp: number
  /** the liquid's alpha at the floor, sharp layer (the diamond stays lit under a full mark) */
  floorA: number
}

/** even-odd point in polygon (each contour of the mark is one simple polygon) */
function inPoly(poly: [number, number][], x: number, y: number) {
  let c = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c
  }
  return c
}

export default function liquid(): Scene {
  let cx = 0, cy = 0, size = 100, s = 1
  let vessels: Vessel[] = []
  let all = new Path2D()
  // the slosh: the surface's tilt (radians) and its speed
  let slosh = 0, sloshV = 0
  let lastX = 0, wasInside = false, lastDown = false, lastPhase = -1
  let hand = 0

  return {
    init(w, h) {
      size = Math.min(h * 0.72, w * 0.6)
      cx = w / 2
      cy = h / 2
      s = size / MARK.h
      const polys = markOutline(400)
      const bounds = markBounds()
      // motes sown inside contour i's body (rejection sampling on its polygon), stable per seed
      const moteR = Math.min(1, size / 260)
      const sow = (i: number, n: number, seed: number): Mote[] => {
        const out: Mote[] = []
        const b = bounds[i]
        for (let k = 0; out.length < n && k < 4000; k++) {
          const x = b.x + hash(seed * 7919 + k * 13 + 1) * b.w
          const y = b.y + hash(seed * 7919 + k * 13 + 2) * b.h
          if (!inPoly(polys[i], x, y)) continue
          out.push({ x, y, v: 40 + 50 * hash(seed * 7919 + k * 13 + 3), ph: hash(seed * 7919 + k * 13 + 4), r: ((1 + 0.6 * hash(seed * 7919 + k * 13 + 5)) * moteR) / s })
        }
        return out
      }
      const loops = new Path2D()
      loops.addPath(MARK.loops[0])
      loops.addPath(MARK.loops[1])
      const d = bounds[2]
      vessels = [
        { path: loops, c: NA, deep: mix(NA, NB, 0.4), motes: [...sow(0, 26, 1), ...sow(1, 26, 2)], wt: 2.4, bottom: 1.05 * MARK.h, amp: 1, floorA: 0.1 },
        { path: MARK.diamond, c: NC, deep: mix(NC, NB, 0.25), motes: sow(2, 5, 3), wt: 2, bottom: d.y + d.h * 1.15, amp: 1.4, floorA: 0.3 },
      ]
      all = new Path2D()
      for (const p of MARK.all) all.addPath(p)
      slosh = 0
      sloshV = 0
      wasInside = false
      lastDown = false
      lastPhase = -1
      hand = 0
    },
    frame(pen, w, h, pointer, dt, t) {
      const { ctx, glow } = pen
      const W = (px: number) => px / s
      // ---- the level: pour, hold, drain, rest
      const tc = t % CYCLE
      let f: number, phase: number
      if (tc < FILL) (f = smooth(tc / FILL)), (phase = 0)
      else if (tc < FILL + HOLD) (f = 1), (phase = 1)
      else if (tc < FILL + HOLD + DRAIN) (f = 1 - smooth((tc - FILL - HOLD) / DRAIN)), (phase = 2)
      else (f = 0), (phase = 3)
      const yL = Y_EMPTY + (Y_FULL - Y_EMPTY) * f
      // the pour and the drain each kick the slosh, a different way each cycle
      if (phase !== lastPhase) {
        const dir = hash(Math.floor(t / CYCLE) * 3 + 1) < 0.5 ? 1 : -1
        if (phase === 0) sloshV += dir * 1.6
        if (phase === 2) sloshV -= dir * 1.1
        lastPhase = phase
      }
      // ---- the hand: where it points is the tilt, how fast it moves is the kick, a press jolts
      let vx = 0
      if (pointer.inside && wasInside) vx = (pointer.x - lastX) / Math.max(dt, 1e-3)
      lastX = pointer.x
      wasInside = pointer.inside
      vx = Math.max(-5 * size, Math.min(5 * size, vx))
      hand += ((pointer.inside ? 1 : 0) - hand) * Math.min(1, 5 * dt)
      const aim = pointer.inside ? -0.38 * Math.max(-1, Math.min(1, (pointer.x - cx) / (0.7 * size))) : 0
      const target = aim * hand + 0.02 * Math.sin(0.41 * t)
      sloshV += (vx / size) * 3.2 * dt
      if (pointer.down && !lastDown && pointer.inside) sloshV += (hash(Math.floor(t * 7) + 11) < 0.5 ? 1 : -1) * 1.4
      lastDown = pointer.down
      // the spring (semi-implicit)
      sloshV += (-OMEGA * OMEGA * (slosh - target) - 2 * ZETA * OMEGA * sloshV) * dt
      slosh += sloshV * dt
      if (slosh > 0.5) (slosh = 0.5), (sloshV = Math.min(0, sloshV))
      if (slosh < -0.5) (slosh = -0.5), (sloshV = Math.max(0, sloshV))
      const cosT = Math.cos(slosh), sinT = Math.sin(slosh)

      const br = breath(t, 4.6, 0.05)
      // the ripples: two sines, choppier while it sloshes or under a pressed hand
      const choppy = 1 + Math.min(1.5, Math.abs(sloshV) * 0.35) + (pointer.down && pointer.inside ? 1 : 0)
      const A1 = 0.0065 * MARK.h * choppy, A2 = 0.0035 * MARK.h * choppy
      const ripple = (x: number) => A1 * Math.sin(K1 * x + 0.9 * t) + A2 * Math.sin(K2 * x - 1.7 * t)
      // anything lit? (the surface's highest reach over the mark, in the mark's frame)
      const reach = yL - (MARK.w / 2) * Math.abs(Math.tan(slosh)) - A1 - A2
      const lit = reach < MARK.h

      ctx.save()
      glow.save()
      markFrame(ctx, cx, cy, size)
      markFrame(glow, cx, cy, size)

      if (lit) {
        // the surface and the body below it, in a frame turned by the slosh about the level's middle
        const surface = new Path2D(), body = new Path2D()
        for (let i = 0; i <= SEGS; i++) {
          const x = -HALF + (2 * HALF * i) / SEGS
          const y = ripple(x)
          if (i === 0) (surface.moveTo(x, y), body.moveTo(x, y))
          else (surface.lineTo(x, y), body.lineTo(x, y))
        }
        body.lineTo(HALF, DEEP)
        body.lineTo(-HALF, DEEP)
        body.closePath()
        let on = br * (hash(Math.floor(30 * t)) < 0.004 ? 0.6 : 1)
        on = Math.min(1.2, on * (1 + 0.15 * Math.min(1, Math.abs(sloshV) * 0.4)))
        for (const v of vessels) {
          if (yL > v.bottom + (MARK.w / 2) * Math.abs(Math.tan(slosh)) + A1 + A2) continue
          const depth = Math.max(80, v.bottom - yL)
          const a = v.amp * br
          ctx.save()
          glow.save()
          ctx.clip(v.path)
          glow.clip(v.path)
          ctx.save()
          glow.save()
          ctx.translate(MARK.cx, yL)
          ctx.rotate(slosh)
          glow.translate(MARK.cx, yL)
          glow.rotate(slosh)
          // the liquid: brightest at the surface, deeper in colour below
          const bg = ctx.createLinearGradient(0, 0, 0, depth)
          bg.addColorStop(0, rgba(v.c, 0.36 * a))
          bg.addColorStop(0.35, rgba(v.c, 0.2 * a))
          bg.addColorStop(1, rgba(v.deep, v.floorA * a))
          ctx.fillStyle = bg
          ctx.fill(body)
          const gg = glow.createLinearGradient(0, 0, 0, depth)
          gg.addColorStop(0, rgba(v.c, 0.55 * a))
          gg.addColorStop(1, rgba(v.deep, 1.6 * v.floorA * a))
          glow.fillStyle = gg
          glow.fill(body)
          // the band under the surface: white-hot on the glass, colour in the bloom
          const sb = ctx.createLinearGradient(0, 0, 0, W(16))
          sb.addColorStop(0, rgba(WHITE, 0.3 * br))
          sb.addColorStop(1, rgba(WHITE, 0))
          ctx.fillStyle = sb
          ctx.fill(body)
          const gb = glow.createLinearGradient(0, 0, 0, W(40))
          gb.addColorStop(0, rgba(v.c, 0.5 * a))
          gb.addColorStop(1, rgba(v.c, 0))
          glow.fillStyle = gb
          glow.fill(body)
          // the surface line: neon in the liquid's colour, white-hot
          pen.neon(surface, v.c, on, W(v.wt))
          ctx.lineWidth = W(1)
          ctx.strokeStyle = rgba(WHITE, 0.85 * on)
          ctx.stroke(surface)
          ctx.restore()
          glow.restore()
          // motes rising in the light (the mark's frame, still clipped to the vessel), dying at the surface
          ctx.beginPath()
          for (const m of v.motes) {
            const rise = (m.v * t + m.ph * RISE) % RISE
            const y = m.y - rise
            const x = m.x + 8 * Math.sin(0.7 * t + m.ph * 6)
            const dx = x - MARK.cx, dy = y - yL
            const xr = dx * cosT + dy * sinT
            const yr = -dx * sinT + dy * cosT
            const under = yr - ripple(xr)
            if (under < W(3)) continue
            const k = Math.sin((Math.PI * rise) / RISE) * Math.min(1, under / W(24))
            const r = m.r * (0.4 + 0.6 * k)
            ctx.moveTo(x + r, y)
            ctx.arc(x, y, r, 0, TAU)
          }
          ctx.fillStyle = rgba(WHITE, 0.5 * br)
          ctx.fill()
          ctx.restore()
          glow.restore()
        }
      }

      // the sleeves: hollow glass, a little heavier than the site's tube: a faint body, a soft wall, a crisp edge
      ctx.fillStyle = rgba(WHITE, 0.016)
      ctx.fill(all)
      ctx.lineWidth = W(11)
      ctx.strokeStyle = rgba(WHITE, 0.028)
      ctx.stroke(all)
      ctx.lineWidth = W(1.1)
      ctx.strokeStyle = rgba(WHITE, 0.3)
      ctx.stroke(all)
      // the hand on the glass: a glint inside it, and the edge warms near it
      if (hand > 0.01) {
        const mx = (pointer.x - (cx - (MARK.w * s) / 2)) / s, my = (pointer.y - (cy - (MARK.h * s) / 2)) / s
        const R = W(160)
        const rg = ctx.createRadialGradient(mx, my, 0, mx, my, R)
        rg.addColorStop(0, rgba(WHITE, 0.6 * hand))
        rg.addColorStop(1, rgba(WHITE, 0))
        ctx.strokeStyle = rg
        ctx.lineWidth = W(1.6)
        ctx.stroke(all)
        ctx.save()
        ctx.clip(all)
        const rf = ctx.createRadialGradient(mx, my, 0, mx, my, R)
        rf.addColorStop(0, rgba(WHITE, 0.22 * hand))
        rf.addColorStop(1, rgba(WHITE, 0))
        ctx.fillStyle = rf
        ctx.fillRect(mx - R, my - R, 2 * R, 2 * R)
        ctx.restore()
      }
      ctx.restore()
      glow.restore()

      // the room's light from the lit glass
      wash(pen, NA, cx, cy + size * 0.3 * (1 - f), 0.8 * size, 0.6 * size, 0.1 * f * br)
      void w, void h
    },
  }
}
