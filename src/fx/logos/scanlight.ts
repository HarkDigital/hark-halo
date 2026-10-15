import { NA, NB, NC, P, WHITE, mix, rgba, type RGB, type Scene } from '../../service/scenes/kit'
import { MARK, markFrame, markOutline } from '../logo'
import { TAU, clamp01, hash, hot, wash } from '../../service/stat/pictures/lib'

/*
 * SCAN: the mark stands as unlit glass. A tall bar of white light sweeps the
 * box left to right, and wherever it has passed the tubes are lit and stay
 * lit (loop A in the first light, loop B the second, the diamond the third),
 * the gas catching white-hot just behind the bar and sparks spitting where
 * the bar crosses a tube; the unlit glass ahead glints as the light reaches
 * it. Off the right edge the lit sign holds, breathing, then a dark bar comes
 * back the other way and puts the tubes out behind it (the white core dies
 * first, the colour gutters after), and after a beat of dark glass it begins
 * again. The hand takes the bar: while the cursor is inside the bar is drawn
 * to its x and the cycle waits; dragged rightward it lights, leftward it puts
 * out (a drag, not a flick: the bar must travel a real distance the new way
 * before it changes, so a hand leaving the box does not turn it round); let
 * go and it carries on from where it is. Pressing doubles the light.
 */
const SWEEP = 3 // s, each pass of the bar across the box
const HOLD_LIT = 2.5 // s, the lit sign holding
const HOLD_DARK = 0.9 // s, dark glass before it begins again
const BAR = 30 // the band's half width, px
const CATCH = 50 // the hotter stretch behind the bar, px
const EASE = 6 // /s, the bar following the hand
const POOL = 240 // sparks alive at most
const MAX_CROSS = 64
const LIGHTS: RGB[] = [NA, NB, NC]
const HOTS = LIGHTS.map(hot)
const COOL = mix(WHITE, NB, 0.45) // the dark bar's tint
const ROOM = mix(NA, NB, 0.3) // the lit sign's light on the room

interface Spark {
  x: number
  y: number
  vx: number
  vy: number
  age: number
  life: number
  c: number
}
type Stop = [number, RGB, number]

export default function scanlight(): Scene {
  let H = 1, cx = 0, cy = 0, size = 100, s = 1, x0 = 0, y0 = 0
  /** each contour's outline in px, closed (x, y pairs) */
  let pts: Float32Array[] = []
  let left = 0, right = 0
  let bar = 0
  let dir: 1 | -1 = 1 // the bar's travel: +1 lighting (left to right), -1 putting out
  let cand: 1 | -1 = 1, travel = 0, latch = 48 // the hand's way, and how far the bar has gone that way
  let sweeping = true
  let hold = 0
  let press = 0, grip = 0
  let sparks: Spark[] = []
  let next = 0
  let seed = 1
  const rnd = () => hash(seed++)
  const cross = new Float32Array(3 * MAX_CROSS) // where the bar crosses a tube this frame: x, y, contour
  let nCross = 0

  const grad = (k: CanvasRenderingContext2D, xa: number, xb: number, stops: Stop[]) => {
    const g = k.createLinearGradient(xa, 0, xb, 0)
    for (const [p, c, a] of stops) g.addColorStop(p, rgba(c, a))
    return g
  }
  const spawn = (x: number, y: number, c: number, k: number) => {
    const sp = sparks[next]
    next = (next + 1) % POOL
    sp.x = x
    sp.y = y
    sp.vx = ((rnd() - 0.5) * 180 + dir * 70) * k
    sp.vy = (rnd() - 0.5) * 220 * k
    sp.age = 0
    sp.life = 0.22 + rnd() * 0.42
    sp.c = c
  }

  return {
    init(w, h) {
      H = h
      size = Math.min(h * 0.72, w * 0.6)
      cx = w / 2
      cy = h / 2
      s = size / MARK.h
      x0 = cx - (MARK.w * s) / 2
      y0 = cy - (MARK.h * s) / 2
      pts = markOutline(240).map(c => {
        const a = new Float32Array(c.length * 2 + 2)
        for (let k = 0; k <= c.length; k++) {
          const [mx, my] = c[k % c.length]
          a[2 * k] = x0 + mx * s
          a[2 * k + 1] = y0 + my * s
        }
        return a
      })
      left = -BAR * 1.6
      right = w + BAR * 1.6
      bar = left
      dir = 1
      cand = 1
      travel = 0
      latch = Math.max(48, 0.08 * w)
      sweeping = true
      hold = 0
      press = 0
      grip = 0
      seed = 1
      next = 0
      sparks = Array.from({ length: POOL }, () => ({ x: 0, y: 0, vx: 0, vy: 0, age: 1, life: 1, c: 0 }))
    },

    frame(pen, _w, _h, pointer, dt, t) {
      const { ctx, glow } = pen
      const prev = bar
      grip += ((pointer.inside ? 1 : 0) - grip) * Math.min(1, 8 * dt)
      press += ((pointer.inside && pointer.down ? 1 : 0) - press) * Math.min(1, 10 * dt)

      // ---- the cycle, or the hand
      if (pointer.inside) {
        bar += (pointer.x - bar) * Math.min(1, EASE * dt)
        sweeping = true
        // the way the hand drags decides the look, once the bar has gone `latch` px that way
        const d = bar - prev
        if (Math.abs(d) > 0.05) {
          const c: 1 | -1 = d > 0 ? 1 : -1
          if (c !== cand) {
            cand = c
            travel = 0
          }
          travel += Math.abs(d)
          if (travel >= latch) dir = cand
        }
      } else {
        cand = dir
        travel = 0
        if (sweeping) {
          bar += (dir * (right - left) * dt) / SWEEP
          if (dir > 0 && bar >= right) {
            bar = right
            sweeping = false
            hold = HOLD_LIT
          } else if (dir < 0 && bar <= left) {
            bar = left
            sweeping = false
            hold = HOLD_DARK
          }
        } else {
          hold -= dt
          if (hold <= 0) {
            dir = dir > 0 ? -1 : 1
            sweeping = true
          }
        }
      }
      const moved = Math.abs(bar - prev)
      const inBox = bar > left && bar < right
      const bright = (dir > 0 ? 1 : 0.22) * (1 + press) * (1 + 0.03 * Math.sin(t * 11) + 0.02 * Math.sin(t * 29))
      const bm = (bar - x0) / s // the bar in mark units
      const flick = [0, 1, 2].map(i => 0.6 + 0.4 * hash(Math.floor(t * 40) + i * 7))
      // the lit tubes breathe, with a rare hiccup
      const slot = Math.floor(t / 5.3)
      const hic = Math.floor(hash(slot) * 3)
      const on = [0, 1, 2].map(i => (1 + 0.045 * Math.sin((TAU * t) / (4.2 + 0.7 * i) + i)) * (hic === i && t - slot * 5.3 < 0.06 ? 0.6 : 1))

      // ---- where the bar crosses a tube
      nCross = 0
      if (inBox) {
        for (let i = 0; i < 3 && nCross < MAX_CROSS; i++) {
          const a = pts[i]
          for (let k = 0; k + 3 < a.length && nCross < MAX_CROSS; k += 2) {
            const xa = a[k], xb = a[k + 2]
            if (xa === xb || (xa - bar) * (xb - bar) > 0) continue
            const u = (bar - xa) / (xb - xa)
            cross[nCross * 3] = bar
            cross[nCross * 3 + 1] = a[k + 1] + u * (a[k + 3] - a[k + 1])
            cross[nCross * 3 + 2] = i
            nCross++
          }
        }
      }

      // ---- the mark
      ctx.save()
      glow.save()
      markFrame(ctx, cx, cy, size)
      markFrame(glow, cx, cy, size)
      const px = (n: number) => n / s
      // the glass sleeves, always
      for (const p of MARK.all) {
        ctx.lineWidth = px(9)
        ctx.strokeStyle = rgba(WHITE, 0.032)
        ctx.stroke(p)
        ctx.lineWidth = px(0.9)
        ctx.strokeStyle = rgba(WHITE, 0.16)
        ctx.stroke(p)
      }
      // the glass catching the light as the bar reaches it
      if (inBox && bar > x0 - 60 && bar < x0 + MARK.w * s + 60) {
        const g = grad(ctx, bm - px(48), bm + px(48), [
          [0, WHITE, 0],
          [0.5, WHITE, Math.min(1, 0.5 * bright)],
          [1, WHITE, 0],
        ])
        ctx.strokeStyle = g
        ctx.lineWidth = px(1)
        for (const p of MARK.all) ctx.stroke(p)
        ctx.globalAlpha = 0.22
        ctx.lineWidth = px(8)
        for (const p of MARK.all) ctx.stroke(p)
        ctx.globalAlpha = 1
      }
      // the lit tubes: everything the bar has passed (x < bar)
      if (bm > -px(200)) {
        const whole = bm > MARK.w + px(200)
        if (!whole) {
          for (const k of [ctx, glow]) {
            k.save()
            k.beginPath()
            k.rect(-px(200), -px(200), bm + px(200), MARK.h + px(400))
            k.clip()
          }
        }
        for (let i = 0; i < 3; i++) {
          const path = MARK.all[i], c = LIGHTS[i], hc = HOTS[i], o = on[i]
          const w = px(2.6)
          const coreW = Math.max(px(0.7), w * 0.4)
          if (dir > 0) {
            glow.lineWidth = w * 2.6
            glow.strokeStyle = rgba(c, o)
            glow.stroke(path)
            ctx.lineWidth = w
            ctx.strokeStyle = rgba(c, o * 0.8)
            ctx.stroke(path)
            ctx.lineWidth = coreW
            ctx.strokeStyle = rgba(hc, o)
            ctx.stroke(path)
            // the gas catching just behind the bar: an extra white-hot core
            const a = bm - px(CATCH)
            if (a < MARK.w + px(20) && bm > -px(20)) {
              const k = flick[i] * (1 + 0.6 * press)
              ctx.lineWidth = w * 0.8
              ctx.strokeStyle = grad(ctx, a, bm, [
                [0, WHITE, 0],
                [0.55, WHITE, 0.45 * k],
                [1, WHITE, Math.min(1, k)],
              ])
              ctx.stroke(path)
              glow.lineWidth = w * 3.4
              glow.strokeStyle = grad(glow, a, bm, [
                [0, c, 0],
                [1, c, Math.min(1, 0.9 * k)],
              ])
              glow.stroke(path)
            }
          } else {
            // going out: the core dies first, the colour gutters after
            const a = bm - px(70)
            glow.lineWidth = w * 2.6
            glow.strokeStyle = grad(glow, a, bm, [
              [0, c, o],
              [1, c, o * 0.2 * flick[i]],
            ])
            glow.stroke(path)
            ctx.lineWidth = w
            ctx.strokeStyle = grad(ctx, a, bm, [
              [0, c, o * 0.8],
              [0.85, c, o * 0.3 * flick[i]],
              [1, c, o * 0.06],
            ])
            ctx.stroke(path)
            ctx.lineWidth = coreW
            ctx.strokeStyle = grad(ctx, a, bm, [
              [0, hc, o],
              [0.5, hc, 0],
            ])
            ctx.stroke(path)
          }
        }
        if (!whole) {
          ctx.restore()
          glow.restore()
        }
      }
      ctx.restore()
      glow.restore()

      // ---- the bar
      if (inBox) {
        const col = dir > 0 ? WHITE : COOL
        const b = bright
        ctx.fillStyle = grad(ctx, bar - BAR, bar + BAR, [
          [0, col, 0],
          [0.3, col, 0.045 * b],
          [0.5, col, 0.34 * b],
          [0.7, col, 0.045 * b],
          [1, col, 0],
        ])
        ctx.fillRect(bar - BAR, 0, 2 * BAR, H)
        ctx.fillStyle = rgba(col, Math.min(1, 0.8 * b))
        ctx.fillRect(bar - 0.6, 0, 1.2, H)
        glow.fillStyle = grad(glow, bar - BAR * 1.3, bar + BAR * 1.3, [
          [0, col, 0],
          [0.5, col, 0.22 * b],
          [1, col, 0],
        ])
        glow.fillRect(bar - BAR * 1.3, 0, BAR * 2.6, H)
        // brightest where it crosses the mark
        wash(pen, col, bar, cy, BAR * 1.8, size * 0.7, 0.14 * b)
      }

      // ---- sparks where the bar crosses a tube, and the beads of light there
      const kv = Math.max(0.45, Math.min(1.3, size / 320))
      let budget = 14
      for (let j = 0; j < nCross; j++) {
        const x = cross[j * 3], y = cross[j * 3 + 1], i = cross[j * 3 + 2]
        if (dir > 0) pen.fill(P.circle(x, y, 2 + 1.2 * press), WHITE, Math.min(1, 0.9 * bright))
        else pen.fill(P.circle(x, y, 1.6), LIGHTS[i], 0.35 * (1 + press))
        if (budget <= 0) continue
        const want = dir > 0 ? moved / 10 + (grip > 0.5 && moved < 0.5 ? 0.1 : 0.03) : moved / 24 + 0.015
        let n = Math.min(4, Math.floor(want + rnd()))
        while (n-- > 0 && budget-- > 0) spawn(x, y, i, kv)
      }
      const paths: Path2D[] = []
      for (let i = 0; i < 6; i++) paths.push(new Path2D())
      let live = 0
      for (const sp of sparks) {
        if (sp.age >= sp.life) continue
        sp.age += dt
        sp.x += sp.vx * dt
        sp.y += sp.vy * dt
        const drag = 1 - Math.min(1, 3 * dt)
        sp.vx *= drag
        sp.vy *= drag
        const k = 1 - sp.age / sp.life
        const p = paths[sp.c * 2 + (k > 0.5 ? 0 : 1)]
        p.moveTo(sp.x - sp.vx * 0.05, sp.y - sp.vy * 0.05)
        p.lineTo(sp.x, sp.y)
        live++
      }
      if (live) {
        for (let i = 0; i < 3; i++) {
          for (let b = 0; b < 2; b++) {
            const p = paths[i * 2 + b]
            const a = b ? 0.4 : 1
            glow.lineWidth = 3.4
            glow.strokeStyle = rgba(LIGHTS[i], 0.8 * a)
            glow.stroke(p)
            ctx.lineWidth = 1.3
            ctx.strokeStyle = rgba(HOTS[i], 0.95 * a)
            ctx.stroke(p)
          }
        }
      }

      // ---- the room's light, from the lit sign
      const lit = clamp01((bar - x0) / (MARK.w * s))
      wash(pen, ROOM, cx, cy, size * 0.95, size * 0.75, 0.12 * lit * (dir > 0 ? 1 : 0.8))
    },
  }
}
