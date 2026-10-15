import { NA, P, WHITE, rgba, strike } from '../../scenes/kit'
import type { Builder, Label } from '../picture'
import { TAU, breath, clamp01, glint, hash, smooth, span, wash } from './lib'

/*
 * $1M+: PAST THE MARK, YEAR AFTER YEAR (../PICTURES.md). A row of open
 * columns of dark glass standing on the band's bottom hairline, every one
 * with green light risen past the one level mark labelled $1M, the row
 * running off the right edge (year after year, and on: they cannot be
 * counted). The columns pour in a cascade; "$1M+" strikes as the first
 * crosses the mark. Afterwards they creep upward at their own rates, never
 * resting at a height that could be read. The hand swells a column; the
 * scroll sloshes the light.
 */
const KEY = 0.48
export const bars: Builder<{ kind: 'bars'; mark: string }> = o => {
  let cols: { x: number; seed: number; start: number }[] = []
  let cw = 1, yMark = 0, yBase = 1, fadeTop = 0, markX = 0
  let wide = false, narrow = false
  let t1 = 0.25 + 3.4
  // the slosh: one damped spring tilting every surface, driven by the scroll
  let tilt = 0, tiltV = 0
  let lifts: number[] = []
  let W = 1, H = 1

  return {
    lead: [0, 0],
    dur: 3400,
    key: (_p, e) => e >= KEY,
    init(w, h, env) {
      W = w
      H = h
      wide = env.mode === 'wide'
      narrow = env.narrow
      let gap: number, x: number
      if (wide) {
        cw = 0.07 * w
        gap = 0.035 * w
        x = env.copyX + 0.1 * w
      } else if (narrow) {
        cw = 0.14 * w
        gap = 0.06 * w
        x = 0.06 * w
      } else {
        cw = 0.09 * w
        gap = 0.045 * w
        x = 0.06 * w
      }
      cols = []
      let j = 0
      while (x < w) {
        cols.push({ x, seed: j, start: 0.04 + 0.1 * j })
        x += cw + gap
        j++
      }
      lifts = cols.map(() => 0)
      yMark = narrow ? 0.42 * h : env.framed ? 0.48 * h : 0.46 * h
      yBase = h - 6
      fadeTop = narrow || env.framed ? 0.1 * h : 0.08 * h
      markX = wide ? env.copyX + 0.04 * w : 0
      t1 = 0.25 + 3.4
      tilt = 0
      tiltV = 0
      // (on a phone the mark runs edge to edge and the first column starts at the edge: the label names the line's right end)
      const labels: Label[] = narrow ? [{ text: o.mark, x: w - 10, y: yMark - 16, align: 'right', hi: true }] : [{ text: o.mark, x: cols[0].x - 16, y: yMark - 16, align: 'right', hi: true }]
      return labels
    },
    frame(pen, w, h, _p, e, t, pointer, dt) {
      const { ctx, glow } = pen
      // the slosh spring: the scroll's speed kicks it, it rings down (2.5 Hz, lightly damped)
      const target = Math.max(-0.07, Math.min(0.07, pointer.scrollV * 0.07))
      const k = (TAU * 2.5) ** 2, c = 2 * 0.3 * TAU * 2.5
      tiltV += (-k * (tilt - target) - c * tiltV) * dt
      tilt += tiltV * dt
      // the mark: one level glass hairline from the dark gap off the right edge
      const mg = ctx.createLinearGradient(markX, 0, markX + 0.06 * w, 0)
      mg.addColorStop(0, rgba(WHITE, narrow ? 0.14 : 0))
      mg.addColorStop(1, rgba(WHITE, 0.14))
      ctx.lineWidth = 3
      ctx.strokeStyle = rgba(WHITE, 0.028)
      ctx.beginPath()
      ctx.moveTo(markX, yMark)
      ctx.lineTo(w, yMark)
      ctx.stroke()
      ctx.lineWidth = 0.8
      ctx.strokeStyle = mg
      ctx.beginPath()
      ctx.moveTo(markX, yMark)
      ctx.lineTo(w, yMark)
      ctx.stroke()
      // a cold glint drifting along the mark, by the clock and by the scroll
      if (e >= 1) {
        const c9 = ((t - 3.65) % 9) / 9
        const gx = markX + (w - markX) * (0.6 * c9 + 0.4 * pointer.scroll)
        glint(pen, gx - 40, yMark, gx + 40, yMark, 0.35)
      }
      let litAll = 0
      cols.forEach((col, j) => {
        const xl = col.x, xr = col.x + cw, ry = 0.055 * (cw / 2)
        // the hand: a column near the pointer swells and lifts a little (light only)
        let near = 0
        if (pointer.inside) {
          const dx = Math.max(0, Math.abs(pointer.x - (xl + xr) / 2) - cw / 2)
          const dy = pointer.y < fadeTop ? fadeTop - pointer.y : pointer.y > yBase ? pointer.y - yBase : 0
          const d = Math.hypot(dx, dy)
          if (d < 100) near = 1 - d / 100
        }
        lifts[j] += (6 * near - lifts[j]) * Math.min(1, 6 * dt)
        // the surface: the pour, the crossing, the surge, the settle, the creep
        let yS = yBase
        const s0 = col.start
        if (e >= s0) {
          const u = span(s0, s0 + 0.44, e)
          yS = yBase - (yBase - yMark) * (1 - Math.pow(1 - u, 2.6))
          if (e >= s0 + 0.44) {
            const v = span(s0 + 0.44, s0 + 0.56, e)
            yS = yMark - 0.07 * h * smooth(v) * (1 + 0.08 * Math.sin(Math.PI * v))
            if (e >= s0 + 0.56) yS = yMark - 0.07 * h
            if (e >= 1) yS = yMark - 0.07 * h - 0.18 * h * (1 - Math.exp(-Math.max(0, t - t1) / (600 + 200 * hash(j + 0.4)))) + 3 * Math.sin((TAU * t) / (40 + 9 * j))
          }
        }
        yS -= lifts[j]
        const crossed = e >= s0 + 0.44
        const litH = yBase - yS
        const lit = clamp01(litH / (yBase - yMark))
        litAll += lit
        const br = breath(t, 4.8, 0.04, j * 1.1) * (1 + 0.3 * near)
        // the glass: walls dissolving upward, a faint body, a foot
        const wallA = (a: number) => {
          const g = ctx.createLinearGradient(0, yBase, 0, fadeTop)
          g.addColorStop(0, rgba(WHITE, a))
          g.addColorStop(0.5, rgba(WHITE, a))
          g.addColorStop(1, rgba(WHITE, 0))
          return g
        }
        ctx.fillStyle = wallA(0.02)
        ctx.fillRect(xl, fadeTop, cw, yBase - fadeTop)
        for (const x of [xl, xr]) {
          ctx.lineWidth = 3
          ctx.strokeStyle = wallA(0.03)
          ctx.beginPath()
          ctx.moveTo(x, yBase)
          ctx.lineTo(x, fadeTop)
          ctx.stroke()
          ctx.lineWidth = 0.8
          ctx.strokeStyle = wallA(0.12 + 0.1 * lit + 0.2 * near)
          ctx.beginPath()
          ctx.moveTo(x, yBase)
          ctx.lineTo(x, fadeTop)
          ctx.stroke()
        }
        if (near > 0 && pointer.y > fadeTop && pointer.y < yBase) glint(pen, pointer.x < (xl + xr) / 2 ? xl : xr, pointer.y - 30, pointer.x < (xl + xr) / 2 ? xl : xr, pointer.y + 30, 0.4 * near)
        const foot = new Path2D()
        foot.ellipse((xl + xr) / 2, yBase, cw / 2, ry, 0, 0, TAU)
        pen.glass(foot, 0.14, 2)
        if (e >= s0 - 0.04) pen.fill(P.circle((xl + xr) / 2, yBase + ry, 1.6), WHITE, e < s0 ? strike((e - s0 + 0.04) / 0.04 * 0.42, 3 + j) : 0.3)
        if (litH <= 1) return
        // the light below the surface, the surface itself (rippling, sloshing with the scroll)
        const ripple = (u: number) => {
          let r = 1.4 * Math.sin(TAU * 2 * u + 0.9 * t + j) + 0.8 * Math.sin(TAU * 4.3 * u - 1.7 * t + j * 2)
          r += (u - 0.5) * cw * Math.tan(tilt)
          return narrow ? r * 0.7 : r
        }
        const top = new Path2D()
        const N = 14
        for (let i = 0; i <= N; i++) {
          const x = xl + (cw * i) / N
          const y = yS + ripple(i / N)
          if (i === 0) top.moveTo(x, y)
          else top.lineTo(x, y)
        }
        const body = new Path2D(top)
        body.lineTo(xr, yBase)
        body.lineTo(xl, yBase)
        body.closePath()
        const knee = Math.min(0.99, (0.16 * h) / Math.max(1, litH))
        const bg = ctx.createLinearGradient(0, yS, 0, yBase)
        bg.addColorStop(0, rgba(NA, 0.3 * br))
        bg.addColorStop(knee, rgba(NA, 0.07 * br))
        bg.addColorStop(1, rgba(NA, 0.025 * br))
        ctx.fillStyle = bg
        ctx.fill(body)
        const gg = glow.createLinearGradient(0, yS, 0, yBase)
        gg.addColorStop(0, rgba(NA, 0.5 * br))
        gg.addColorStop(knee, rgba(NA, 0.1 * br))
        gg.addColorStop(1, rgba(NA, 0.04 * br))
        glow.fillStyle = gg
        glow.fill(body)
        const sb = ctx.createLinearGradient(0, yS, 0, yS + 14)
        sb.addColorStop(0, rgba(WHITE, 0.3 * br))
        sb.addColorStop(1, rgba(WHITE, 0))
        ctx.fillStyle = sb
        ctx.fillRect(xl, yS - 2, cw, 16)
        if (!narrow) {
          const pl = glow.createLinearGradient(0, yS, 0, 0)
          pl.addColorStop(0, rgba(NA, 0.1 * br))
          pl.addColorStop(1, rgba(NA, 0.03 * br))
          glow.fillStyle = pl
          glow.fillRect(xl, 0, cw, yS)
        }
        const mOn = Math.min(1, br * (1 + 0.05 * Math.sin((TAU * t) / 3.7 + 1.9 + j)) * (hash(Math.floor(30 * t) + j) < 0.004 ? 0.5 : 1))
        pen.neon(top, NA, mOn, 2)
        ctx.lineWidth = 0.9
        ctx.strokeStyle = rgba(WHITE, 0.9 * mOn)
        ctx.stroke(top)
        // the mark inside the walls, lit once crossed
        if (crossed) {
          const age = (e - s0 - 0.44) * 3.4 + (e >= 1 ? Math.max(0, t - t1) : 0)
          let on = age < 0.42 ? strike(age, 5 + j) : 0.45 + 0.4 * Math.max(0, 1 - (age - 0.42) / 0.8)
          const k9 = Math.floor(t / 9 + j * 0.37)
          if (e >= 1 && hash(k9) > 0.4 && t / 9 + j * 0.37 - k9 < 0.016) on = 0.85
          on = Math.min(1, on + 0.4 * near)
          pen.neon(P.line(xl, yMark, xr, yMark), WHITE, on, 1.6)
          glow.lineWidth = 4
          glow.strokeStyle = rgba(WHITE, 0.18 * on)
          glow.beginPath()
          glow.moveTo(xl - 24, yMark)
          glow.lineTo(xr + 24, yMark)
          glow.stroke()
        }
        // motes rising through the light, dimming above the surface, out through the top
        ctx.beginPath()
        for (let g = 0; g < (narrow ? 3 : 6); g++) {
          const gu = hash(j * 17 + g * 3 + 1), gv = 12 + 16 * hash(j * 17 + g * 3 + 2), gs = hash(j * 17 + g * 3 + 3)
          const x = xl + 6 + gu * (cw - 12) + 2 * Math.sin(1.1 * t + gs * 6)
          const cycle = yBase + 8
          const y = cycle - ((gv * t + gs * 1000) % cycle)
          ctx.moveTo(x + 1.1, y)
          ctx.arc(x, y, 1.1, 0, TAU)
        }
        ctx.fillStyle = rgba(WHITE, 0.45 * lit)
        ctx.fill()
        if (!narrow) wash(pen, NA, (xl + xr) / 2, yBase, 0.8 * cw, 0.03 * h, 0.1 * lit * br * (crossed && e < s0 + 0.56 ? 1.6 : 1))
      })
      // the room's light, from the row, leaning with the scroll
      const n = Math.max(1, cols.length)
      wash(pen, NA, cols[0].x + (Math.min(w, cols[n - 1].x) - cols[0].x) / 2 + (pointer.scroll - 0.5) * 20, yMark - 0.04 * h, narrow ? 0.6 * w : 0.5 * w, narrow ? 0.6 * w : 0.5 * h, 0.04 * (litAll / n) * breath(t, 4.8, 0.04))
      void W, void H
    },
  }
}
