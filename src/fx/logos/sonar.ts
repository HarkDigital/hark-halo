import { NA, NB, NC, P, TAU, WHITE, rgba, type RGB, type Scene } from '../../service/scenes/kit'
import { MARK, markFrame, markOutline } from '../logo'
import { wash } from '../../service/stat/pictures/lib'

/*
 * SONAR: the diamond lit and pulsing at the heart of the mark, the loops dark
 * glass. Every 2.2 s it pings: a thin ring of light expands from the source,
 * fading as it grows, and where it crosses the loops the glass lights. Each
 * point of the contour is sampled once (500 a loop); the wavefront heats the
 * points it passes and they cool behind it, so the wave visibly travels
 * through the glass and leaves it glowing, ebbing. The diamond flashes with
 * each ping and again when a ring returns through it. The cursor is the
 * source (the rings come from where you point, eased), the rate rises while
 * it is inside, and a press pings at once. Up to four rings alive.
 */
const N = 500
const LEVELS = 6
const LOOP_C: RGB[] = [NA, NB]
const IDLE = 2.2 // seconds between pings
const HOVER = 1.0
const HELD = 0.7
const MAX_RINGS = 4
const COOL = 2 // heat lost per second
const EBB = 0.35 // the sleeve's slower warmth, lost per second: the glass still remembers the wave at the next ping
const WARMTH = 0.3 // how bright that warmth draws, at most
const CHARGE = 1.1 // seconds before a ping over which the diamond gathers light

interface Ring {
  ox: number
  oy: number
  born: number
  /** the radius it dies at: past the far side of the mark */
  far: number
}

const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x)

export default function sonar(): Scene {
  let cx = 0, cy = 0, size = 100, s = 1
  let speed = 300, band = 14, lw = 1
  const pts: [number, number][][] = [] // the contours, mark units
  const px: Float32Array[] = [] // the same points, px
  const py: Float32Array[] = []
  const heat: Float32Array[] = [] // the wavefront's light, cooling fast
  const warm: Float32Array[] = [] // the glass's warmth, ebbing slowly behind it
  const paths: (Path2D | null)[][] = [[], []]
  let rings: Ring[] = []
  let ox = 0, oy = 0 // the source
  let lastPing = -1e9
  let wasDown = false
  let echo = 0 // the diamond's flash
  let hand = 0 // how far the source has left the diamond for the hand

  const ping = (t: number) => {
    if (rings.length >= MAX_RINGS) rings.shift()
    rings.push({ ox, oy, born: t, far: Math.hypot(ox - cx, oy - cy) + size * 1.5 })
    lastPing = t
    echo = 1
  }

  return {
    init(w, h) {
      size = Math.min(h * 0.72, w * 0.6)
      cx = w / 2
      cy = h / 2
      s = size / MARK.h
      const k = size / 300 // the lab card is the reference size
      speed = 300 * clamp(k, 0.5, 1.2)
      band = 14 * clamp(k, 0.6, 1.4)
      lw = clamp(k, 0.7, 1.5)
      const o = markOutline(N)
      const x0 = cx - (MARK.w * s) / 2, y0 = cy - (MARK.h * s) / 2
      for (let L = 0; L < 2; L++) {
        pts[L] = o[L]
        px[L] = new Float32Array(N)
        py[L] = new Float32Array(N)
        heat[L] = new Float32Array(N)
        warm[L] = new Float32Array(N)
        for (let i = 0; i < N; i++) {
          px[L][i] = x0 + o[L][i][0] * s
          py[L][i] = y0 + o[L][i][1] * s
        }
      }
      rings = []
      ox = cx
      oy = cy
      lastPing = -1e9
      echo = 0
      hand = 0
      wasDown = false
    },

    frame(pen, _w, _h, pointer, dt, t) {
      const { ctx, glow } = pen
      const inside = pointer.inside
      const down = inside && pointer.down
      // the source eases to the hand, and home to the diamond when it leaves
      const tx = inside ? pointer.x : cx, ty = inside ? pointer.y : cy
      const e = Math.min(1, 6 * dt)
      ox += (tx - ox) * e
      oy += (ty - oy) * e
      hand += ((inside ? 1 : 0) - hand) * Math.min(1, 4 * dt)
      echo = Math.max(0, echo - 4 * dt)
      // the rhythm: idle, quicker under the hand, at once on a press
      const period = down ? HELD : inside ? HOVER : IDLE
      if ((down && !wasDown) || t - lastPing >= period) ping(t)
      wasDown = down

      // the glass cools, then heats where a ring's wavefront crosses it
      const cool = COOL * dt, ebb = EBB * dt
      for (let L = 0; L < 2; L++) {
        const H = heat[L], M = warm[L]
        for (let i = 0; i < N; i++) {
          H[i] = H[i] > cool ? H[i] - cool : 0
          M[i] = M[i] > ebb ? M[i] - ebb : 0
        }
      }
      let keep = 0
      for (const rg of rings) {
        const r = (t - rg.born) * speed
        if (r >= rg.far) continue
        rings[keep++] = rg
        const lo = Math.max(0, r - band) ** 2, hi = (r + band) ** 2
        for (let L = 0; L < 2; L++) {
          const X = px[L], Y = py[L], H = heat[L], M = warm[L]
          for (let i = 0; i < N; i++) {
            const dx = X[i] - rg.ox, dy = Y[i] - rg.oy
            const d2 = dx * dx + dy * dy
            if (d2 > lo && d2 < hi) H[i] = M[i] = 1
          }
        }
        // a ring sent from the hand returns through the diamond: it answers
        const dx = cx - rg.ox, dy = cy - rg.oy
        const d2 = dx * dx + dy * dy
        if (d2 > band * band && d2 > lo && d2 < hi) echo = Math.max(echo, 0.85)
      }
      rings.length = keep

      ctx.save()
      glow.save()
      markFrame(ctx, cx, cy, size)
      markFrame(glow, cx, cy, size)
      const W = (p: number) => (p * lw) / s
      // the loops: unlit glass sleeves
      for (let L = 0; L < 2; L++) pen.glass(MARK.loops[L], 0.16, W(9))
      // the lit glass: runs of each contour at each heat, one path a level, neon in the loop's light
      ctx.lineCap = glow.lineCap = 'butt'
      for (let L = 0; L < 2; L++) {
        const H = heat[L], M = warm[L], Q = pts[L], ps = paths[L]
        for (let k = 0; k < LEVELS; k++) ps[k] = null
        let cur = -1, left = 0
        for (let i = 0; i < N; i++) {
          left += M[i]
          const hv = H[i]
          if (hv <= 0.012) {
            cur = -1
            continue
          }
          const k = Math.min(LEVELS - 1, Math.floor(hv * LEVELS))
          const q1 = Q[i + 1 < N ? i + 1 : 0]
          let p = ps[k]
          if (!p) p = ps[k] = new Path2D()
          if (k !== cur) {
            p.moveTo(Q[i][0], Q[i][1])
            cur = k
          }
          p.lineTo(q1[0], q1[1])
        }
        // what the wave left: the whole loop faintly lit by its warmth, ebbing (smooth, under the runs)
        pen.neon(MARK.loops[L], LOOP_C[L], WARMTH * (left / N), W(2.4))
        for (let k = 0; k < LEVELS; k++) {
          const p = ps[k]
          if (!p) continue
          const a = Math.pow((k + 0.5) / LEVELS, 1.15)
          // the sleeve itself brightens
          ctx.lineWidth = W(9)
          ctx.strokeStyle = rgba(WHITE, 0.11 * a)
          ctx.stroke(p)
          pen.neon(p, LOOP_C[L], a, W(2.4))
        }
      }
      ctx.lineCap = glow.lineCap = 'round'
      // the diamond: lit, breathing, gathering light before each ping and flashing with it
      const charge = clamp((t - lastPing - (period - CHARGE)) / CHARGE, 0, 1) ** 2
      const on = 0.44 + 0.05 * Math.sin((TAU * t) / 3.1) + 0.22 * charge + 0.42 * echo
      pen.neon(MARK.diamond, NC, 0.28 + 0.2 * charge + 0.45 * echo, W(1.6))
      pen.fill(MARK.diamond, NC, on)
      if (echo > 0.01) pen.fill(MARK.diamond, WHITE, 0.18 * echo * echo)
      ctx.restore()
      glow.restore()

      // the rings, thin lit circles fading as they grow, a soft wavefront on the bloom
      for (const rg of rings) {
        const age = t - rg.born
        const r = age * speed
        const u = r / rg.far
        const a = 0.9 * Math.pow(1 - u, 1.1)
        const c = P.circle(rg.ox, rg.oy, r)
        glow.lineWidth = band * 2.2
        glow.strokeStyle = rgba(NA, a * 0.22)
        glow.stroke(c)
        pen.neon(c, NA, a, 1.3 * lw)
        // the flash at the source
        const flash = Math.exp(-age * 7)
        if (flash > 0.02) {
          pen.fill(P.circle(rg.ox, rg.oy, (2.5 + 5 * flash) * lw), WHITE, 0.85 * flash)
          wash(pen, NA, rg.ox, rg.oy, size * 0.3, size * 0.3, 0.3 * flash)
        }
      }
      // the source under the hand: a bead the rings come from
      if (hand > 0.01) pen.fill(P.circle(ox, oy, 2 * lw), NA, 0.55 * hand)
      // the room's light from the lit diamond
      wash(pen, NC, cx, cy, size * 0.5, size * 0.5, 0.04 + 0.05 * charge + 0.08 * echo)
    },
  }
}
