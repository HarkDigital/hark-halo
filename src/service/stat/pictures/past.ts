import { NA, P, WHITE, rgba, strike } from '../../scenes/kit'
import type { Builder, Label } from '../picture'
import { TAU, breath, clamp01, glint, hash, smooth, span, wash } from './lib'

/*
 * $1M+: PAST THE MARK (../PICTURES.md). An open column of dark glass standing
 * on the band's bottom hairline, one level mark across it labelled $1M, and
 * green light welled up inside past the mark, still rising; the glass has no
 * top. A word value: "$1M+" strikes as the surface touches the line. Then a
 * surge, a settle, and a glacial well that never arrives. Afterwards the
 * surface ripples, the column breathes, dust rises out through the top, and
 * the hand glints the walls, swells the meniscus and rings the surface.
 */
export const past: Builder<{ kind: 'past'; mark: string }> = o => {
  let xl = 0, xr = 1, cw = 1, yMark = 0, yBase = 1, fadeTop = 0
  let wide = false, narrow = false
  let t1 = 3.45
  let W = 1, H = 1
  const grains = Array.from({ length: 28 }, (_, i) => ({ u: hash(i * 3 + 1), v: 12 + 16 * hash(i * 3 + 2), s: hash(i * 3 + 3) }))
  const rings: { x: number; born: number }[] = []
  let lastRing = -9

  return {
    lead: [0, 0],
    dur: 3200,
    key: (_p, e) => e >= 0.62,
    init(w, h, env) {
      W = w
      H = h
      wide = env.mode === 'wide'
      narrow = env.narrow
      if (wide) {
        cw = Math.max(240, Math.min(360, 0.22 * w))
        const cx = Math.max(env.copyX + 0.12 * w + cw / 2, 0.7 * w)
        xl = cx - cw / 2
        xr = cx + cw / 2
      } else if (narrow) {
        xl = 0.25 * w
        xr = 0.75 * w
        cw = xr - xl
      } else {
        cw = Math.max(220, Math.min(320, 0.24 * w))
        xl = 0.5 * w - cw / 2
        xr = 0.5 * w + cw / 2
      }
      yMark = narrow ? 0.4 * h : env.framed ? 0.46 * h : 0.44 * h
      yBase = h - 6
      fadeTop = narrow || env.framed ? 0.1 * h : 0.08 * h
      t1 = 0.25 + 3.2
      rings.length = 0
      const labels: Label[] = [{ text: o.mark, x: xl - (narrow ? 10 : 16), y: yMark - 16, align: 'right', hi: true }]
      return labels
    },
    frame(pen, w, h, _p, e, t, pointer, dt) {
      const { ctx, glow } = pen
      const ry = 0.055 * (cw / 2)
      // the surface: a pour to the mark, a surge through it, a settle, then the glacial well
      let yS = yBase
      if (e >= 0.06) {
        const u = span(0.06, 0.62, e)
        yS = yBase - (yBase - yMark) * (1 - Math.pow(1 - u, 2.6))
        if (e >= 0.62) {
          const v = span(0.62, 0.76, e)
          yS = yMark - 0.1 * h * smooth(v) * (1 + 0.08 * Math.sin(Math.PI * v))
          if (e >= 0.76) {
            yS = yMark - 0.1 * h
            if (e >= 1) yS = yMark - 0.1 * h - 0.18 * h * (1 - Math.exp(-Math.max(0, t - t1) / 720))
          }
        }
      }
      const litH = yBase - yS
      const lit = clamp01(litH / (yBase - yMark))
      const br = breath(t, 4.8, 0.04) * (1 + 0.02 * (hash(Math.floor(12 * t)) - 0.5))
      // the glass: two walls dissolving upward, a faint body, a foot
      const wallA = (a: number) => {
        const g = ctx.createLinearGradient(0, yBase, 0, fadeTop)
        g.addColorStop(0, rgba(WHITE, a))
        g.addColorStop(0.5, rgba(WHITE, a))
        g.addColorStop(1, rgba(WHITE, 0))
        return g
      }
      const bodyG = ctx.createLinearGradient(0, yBase, 0, fadeTop)
      bodyG.addColorStop(0, rgba(WHITE, 0.022))
      bodyG.addColorStop(0.5, rgba(WHITE, 0.022))
      bodyG.addColorStop(1, rgba(WHITE, 0))
      ctx.fillStyle = bodyG
      ctx.fillRect(xl, fadeTop, cw, yBase - fadeTop)
      for (const [x, k] of [
        [xl, 0],
        [xr, 1],
      ] as const) {
        const near = pointer.inside ? Math.max(0, 1 - Math.hypot(pointer.x - x, 0) / 160) : 0
        ctx.lineWidth = 3
        ctx.strokeStyle = wallA(0.03 + 0.06 * near * 0.2)
        ctx.beginPath()
        ctx.moveTo(x, yBase)
        ctx.lineTo(x, fadeTop)
        ctx.stroke()
        ctx.lineWidth = 0.8
        ctx.strokeStyle = wallA(0.12 + 0.1 * lit)
        ctx.beginPath()
        ctx.moveTo(x, yBase)
        ctx.lineTo(x, fadeTop)
        ctx.stroke()
        // a cold glint on the nearest wall at the hand's height
        if (near > 0 && pointer.y > fadeTop && pointer.y < yBase && (k === 0 ? pointer.x < (xl + xr) / 2 : pointer.x >= (xl + xr) / 2)) glint(pen, x, pointer.y - 35, x, pointer.y + 35, 0.4 * near)
      }
      const foot = new Path2D()
      foot.ellipse((xl + xr) / 2, yBase, cw / 2, ry, 0, 0, TAU)
      pen.glass(foot, 0.14, 2)
      // the mark: one level glass hairline from the dark gap off the right edge, lit inside the walls once crossed
      const crossed = e >= 0.62
      const mg = ctx.createLinearGradient(xl - 0.07 * w, 0, xl, 0)
      mg.addColorStop(0, rgba(WHITE, 0))
      mg.addColorStop(1, rgba(WHITE, 0.14))
      ctx.lineWidth = 3
      ctx.strokeStyle = rgba(WHITE, 0.028)
      ctx.beginPath()
      ctx.moveTo(narrow ? 0 : xl - 0.07 * w, yMark)
      ctx.lineTo(w, yMark)
      ctx.stroke()
      ctx.lineWidth = 0.8
      ctx.strokeStyle = narrow ? rgba(WHITE, 0.14) : mg
      ctx.beginPath()
      ctx.moveTo(narrow ? 0 : xl - 0.07 * w, yMark)
      ctx.lineTo(xl, yMark)
      ctx.stroke()
      ctx.strokeStyle = rgba(WHITE, 0.14)
      ctx.beginPath()
      ctx.moveTo(xl, yMark)
      ctx.lineTo(w, yMark)
      ctx.stroke()
      // the foot's electrode lights first
      if (e > 0) {
        const on = e < 0.06 ? strike((e / 0.06) * 0.42, 3) : 0.18 + 0.3 * Math.max(0, 1 - (e - 0.06) * 4)
        pen.neon(P.arc((xl + xr) / 2, yBase, cw / 2, 0.15, Math.PI - 0.15), NA, on, 1.4)
        pen.fill(P.circle((xl + xr) / 2, yBase + ry, 2), WHITE, on)
      }
      if (litH > 1) {
        // the light below the surface: brightest at the top, falling into the dark
        const ripple = (x: number) => {
          const u = (x - xl) / cw
          let r = 1.4 * Math.sin(TAU * 2 * u + 0.9 * t) + 0.8 * Math.sin(TAU * 4.3 * u - 1.7 * t)
          if (pointer.inside && pointer.x > xl - 40 && pointer.x < xr + 40 && Math.abs(pointer.y - yS) < 160) {
            const k = 1 - Math.abs(pointer.y - yS) / 160
            r += 3.2 * k * Math.sin((x - pointer.x) / 9 - 7 * t) * Math.exp(-Math.abs(x - pointer.x) / 36) * (pointer.down ? 1.6 : 1)
          }
          return narrow ? r * 0.6 : r
        }
        const top = new Path2D()
        const N = 28
        for (let i = 0; i <= N; i++) {
          const x = xl + (cw * i) / N
          const y = yS + ripple(x)
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
        // a white band just under the surface, and the plume above it (light escaping the open top)
        const sb = ctx.createLinearGradient(0, yS, 0, yS + 18)
        sb.addColorStop(0, rgba(WHITE, 0.3 * br))
        sb.addColorStop(1, rgba(WHITE, 0))
        ctx.fillStyle = sb
        ctx.fillRect(xl, yS - 2, cw, 20)
        const pl = glow.createLinearGradient(0, yS, 0, 0)
        pl.addColorStop(0, rgba(NA, 0.1 * br))
        pl.addColorStop(1, rgba(NA, 0.03 * br))
        glow.fillStyle = pl
        glow.fillRect(xl, 0, cw, yS)
        // the meniscus: a white-hot line with green bloom, its two ends climbing the glass
        const mOn = Math.min(1, br * (1 + 0.05 * Math.sin(TAU * t / 3.7 + 1.9)) * (hash(Math.floor(30 * t)) < 0.004 ? 0.5 : 1))
        pen.neon(top, NA, mOn, 2.2)
        ctx.lineWidth = 0.9
        ctx.strokeStyle = rgba(WHITE, 0.9 * mOn)
        ctx.stroke(top)
        // the hand on the surface: a white-hot bead swells under it
        if (pointer.inside && pointer.x > xl && pointer.x < xr && Math.abs(pointer.y - yS) < 160) {
          const k = 1 - Math.abs(pointer.y - yS) / 160
          pen.fill(P.circle(pointer.x, yS + ripple(pointer.x), 2 + 2 * k), WHITE, 0.6 * k)
          // rings on the surface while the pointer is above it
          if (pointer.y < yS - 10 && t - lastRing > 0.9 && rings.length < 4) {
            rings.push({ x: pointer.x, born: t })
            lastRing = t
          }
        }
        for (let i = rings.length - 1; i >= 0; i--) {
          const age = t - rings[i].born
          if (age > 1.3) {
            rings.splice(i, 1)
            continue
          }
          const rr = 70 * (age / 1.3)
          const ring = new Path2D()
          ring.ellipse(rings[i].x, yS, rr, rr * 0.055, 0, 0, TAU)
          pen.neon(ring, NA, 0.45 * (1 - age / 1.3), 1.2)
        }
        // the mark inside the walls, lit once crossed: a white neon line with a leak past each wall
        if (crossed) {
          const age = (e - 0.62) * 3.2 + (e >= 1 ? Math.max(0, t - t1) : 0)
          let on = age < 0.42 ? strike(age, 5) : 0.45 + 0.4 * Math.max(0, 1 - (age - 0.42) / 0.8)
          const k9 = Math.floor(t / 9)
          if (e >= 1 && hash(k9) > 0.3 && t - 9 * k9 < 0.14) on = 0.85
          pen.neon(P.line(xl, yMark, xr, yMark), WHITE, on, 1.6)
          glow.lineWidth = 4
          glow.strokeStyle = rgba(WHITE, 0.18 * on)
          glow.beginPath()
          glow.moveTo(xl - 40, yMark)
          glow.lineTo(xr + 40, yMark)
          glow.stroke()
        }
        // motes rising through the light, dimming above the surface and leaving through the top
        const below = new Path2D()
        const above = new Path2D()
        for (const g of grains.slice(0, narrow ? 12 : 28)) {
          const x = xl + 8 + g.u * (cw - 16) + 3 * Math.sin(1.1 * t + g.s * 6)
          const cycle = yBase + 8
          const y = cycle - ((g.v * t + g.s * 1000) % cycle)
          const path = y < yS ? above : below
          path.moveTo(x + 1.2, y)
          path.arc(x, y, 1.2, 0, TAU)
        }
        ctx.fillStyle = rgba(WHITE, 0.5 * lit)
        ctx.fill(below)
        ctx.fillStyle = rgba(WHITE, 0.2 * lit)
        ctx.fill(above)
        // the pool on the floor and the room's light
        if (!narrow) wash(pen, NA, (xl + xr) / 2, yBase, 0.32 * w, 0.035 * h, 0.12 * lit * br * (crossed && e < 0.76 ? 1.6 : 1))
        wash(pen, NA, (xl + xr) / 2, yS, narrow ? 0.6 * w : 0.55 * w, narrow ? 0.6 * w : 0.55 * w, 0.035 * lit * br * (crossed && e < 0.76 ? 1.6 : 1))
      }
      void dt, void W, void H
    },
  }
}
