import { NA, NB, P, WHITE, rgba, strike } from '../../scenes/kit'
import type { Builder, Label } from '../picture'
import { TAU, breath, clamp01, easeOut, glint, hash, neonTo, span, wash } from './lib'

/*
 * $3.5M+: THE CLIMB (../PICTURES.md). A revenue line in glass and neon rising
 * left to right across the band, drawn live by a white-hot head as the strike
 * runs: gentle ups and small dips, trending up, crossing one level mark
 * labelled `mark` and climbing on past it to the right edge, where the head
 * keeps pushing upward. The line's shape is illustrative (a seeded climb, no
 * axis, no figures but the mark's); the number is a word value and strikes
 * as the line crosses the mark. Afterwards sales ring up along the line, the
 * light beneath it breathes, the head pulses and creeps higher; the hand rings
 * one up where it points and lights the line under it; the scroll parallaxes
 * the graph and quickens the ringing.
 */
const N = 72
export const climb: Builder<{ kind: 'climb'; mark: string }> = o => {
  let pts: [number, number][] = []
  let segL: number[] = []
  let total = 1
  let path = new Path2D()
  let x0 = 0, x1 = 1, base = 1, top = 0, yMark = 0, uCross = 0.68
  let narrow = false, framed = false
  let lastHover = -9
  const rings: { x: number; born: number; hand: boolean }[] = []
  let ringClock = 0
  let W = 1, H = 1

  /** the point at fraction u (0..1) of the line's length */
  const at = (u: number): [number, number] => {
    let s = u * total
    for (let i = 0; i < segL.length; i++) {
      if (s <= segL[i] || i === segL.length - 1) {
        const k = segL[i] ? Math.min(1, s / segL[i]) : 0
        return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k]
      }
      s -= segL[i]
    }
    return pts[pts.length - 1]
  }
  /** the line's y at x, by interpolation */
  const yAt = (x: number) => {
    if (x <= pts[0][0]) return pts[0][1]
    for (let i = 0; i < pts.length - 1; i++) if (x <= pts[i + 1][0]) return pts[i][1] + ((pts[i + 1][1] - pts[i][1]) * (x - pts[i][0])) / (pts[i + 1][0] - pts[i][0])
    return pts[pts.length - 1][1]
  }

  return {
    lead: [0, 0],
    dur: 3200,
    key: (_p, e) => e >= 0.08 + 0.87 * uCross,
    init(w, h, env) {
      W = w
      H = h
      narrow = env.narrow
      framed = env.framed
      x0 = env.mode === 'wide' ? env.copyX - 0.06 * w : narrow ? 0.02 * w : 0.04 * w
      x1 = narrow ? 0.98 * w : 0.97 * w
      base = narrow ? 0.9 * h : 0.84 * h
      top = narrow ? 0.14 * h : 0.12 * h
      const Hc = base - top
      // the climb: a seeded line trending up, with gentle ups and small dips that never undo the trend
      pts = []
      let peak = 0
      for (let i = 0; i <= N; i++) {
        const u = i / N
        const trend = Math.pow(u, 1.1) * 0.94
        const wobble = 0.05 * Math.sin(u * 19 + 1.3) + 0.03 * Math.sin(u * 41 + 0.4) + 0.03 * (hash(i * 3 + 0.7) - 0.5)
        let v = trend + wobble
        v = Math.max(v, peak - 0.06)
        peak = Math.max(peak, v)
        pts.push([x0 + (x1 - x0) * u, base - Hc * clamp01(v)])
      }
      path = new Path2D()
      segL = []
      total = 0
      pts.forEach(([x, y], i) => {
        if (i === 0) path.moveTo(x, y)
        else {
          path.lineTo(x, y)
          const L = Math.hypot(x - pts[i - 1][0], y - pts[i - 1][1])
          segL.push(L)
          total += L
        }
      })
      // the mark: level, crossed about two thirds of the way along
      yMark = base - Hc * 0.62
      let s = 0
      uCross = 0.68
      for (let i = 0; i < segL.length; i++) {
        if (pts[i][1] >= yMark && pts[i + 1][1] < yMark) {
          const k = (pts[i][1] - yMark) / (pts[i][1] - pts[i + 1][1])
          uCross = (s + segL[i] * k) / total
          break
        }
        s += segL[i]
      }
      rings.length = 0
      ringClock = 0
      lastHover = -9
      const labels: Label[] = narrow
        ? [{ text: o.mark, x: w - 10, y: yMark - 16, align: 'right', hi: true }]
        : [{ text: o.mark, x: Math.max(env.copyX + 0.02 * w, x0 + 0.08 * w), y: yMark - 16, hi: true }]
      return labels
    },
    frame(pen, w, h, _p, e, t, pointer, dt) {
      const { ctx, glow } = pen
      // the parallax: the scroll tilts the graph a little
      const ox = (pointer.scroll - 0.5) * 20, oy = (pointer.scroll - 0.5) * 8
      for (const c of [ctx, glow]) {
        c.save()
        c.translate(ox, oy)
      }
      // the floor and the mark: glass before light
      const fg = ctx.createLinearGradient(0, 0, w, 0)
      fg.addColorStop(0, rgba(WHITE, 0))
      fg.addColorStop(0.3, rgba(WHITE, 0.08))
      fg.addColorStop(1, rgba(WHITE, 0.08))
      ctx.strokeStyle = fg
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, base)
      ctx.lineTo(w, base)
      ctx.stroke()
      const crossedAt = 0.08 + 0.87 * uCross
      const crossed = e >= crossedAt
      const mg = ctx.createLinearGradient(narrow ? 0 : x0 + 0.04 * w, 0, narrow ? 0.1 * w : x0 + 0.14 * w, 0)
      mg.addColorStop(0, rgba(WHITE, narrow ? 0.14 : 0))
      mg.addColorStop(1, rgba(WHITE, 0.14))
      ctx.lineWidth = 3
      ctx.strokeStyle = rgba(WHITE, 0.028)
      ctx.beginPath()
      ctx.moveTo(narrow ? 0 : x0 + 0.04 * w, yMark)
      ctx.lineTo(w, yMark)
      ctx.stroke()
      ctx.lineWidth = 0.8
      ctx.strokeStyle = mg
      ctx.beginPath()
      ctx.moveTo(narrow ? 0 : x0 + 0.04 * w, yMark)
      ctx.lineTo(w, yMark)
      ctx.stroke()
      // the line's glass sleeve, there before the gas
      pen.glass(path, 0.1 + 0.04 * clamp01(e / 0.08), 7)
      if (e < 0.08) {
        for (const c of [ctx, glow]) c.restore()
        return
      }
      // the front: the gas runs the line left to right, the core a little behind, a white-hot head leading
      const u = e < 0.95 ? easeOut(span(0.08, 0.95, e)) * 0.985 + 0.015 * span(0.08, 0.95, e) : 1
      const [hx, hy0] = at(u)
      // after the strike the head keeps pushing higher, glacially and for good
      const creep = e >= 1 ? Math.min(0.08 * h, 0.05 * Math.max(0, t - 3.45)) : 0
      const hy = hy0 - creep
      let on = e < 0.3 ? Math.max(0.4, strike((e - 0.08) * 3.2, 4)) : 1
      on *= breath(t, 4.6, 0.05)
      // the light the line throws beneath it (and its reflection below the floor), to the front
      const area = new Path2D()
      area.moveTo(pts[0][0], base)
      let drawn = 0
      for (let i = 0; i < pts.length; i++) {
        if (i > 0) drawn += segL[i - 1]
        if (drawn / total > u) break
        area.lineTo(pts[i][0], pts[i][1])
      }
      area.lineTo(hx, hy)
      area.lineTo(hx, base)
      area.closePath()
      const ag = ctx.createLinearGradient(0, top, 0, base)
      ag.addColorStop(0, rgba(NA, 0.1 * on))
      ag.addColorStop(1, rgba(NA, 0))
      ctx.fillStyle = ag
      ctx.fill(area)
      const gg = glow.createLinearGradient(0, top, 0, base)
      gg.addColorStop(0, rgba(NA, 0.14 * on))
      gg.addColorStop(1, rgba(NA, 0))
      glow.fillStyle = gg
      glow.fill(area)
      // the hand lights the line under it, and rings one up
      let hoverX = -1
      if (pointer.inside && !pointer.coarse) {
        const px = pointer.x - ox, py = pointer.y - oy
        if (px > pts[0][0] && px < Math.min(hx, x1) && Math.abs(yAt(px) - py) < 80) {
          hoverX = px
          const q = 1 - Math.abs(yAt(px) - py) / 80
          glow.lineWidth = 10
          glow.strokeStyle = rgba(NA, 0.5 * q)
          glow.beginPath()
          const lo = Math.max(pts[0][0], px - 70), hi = Math.min(hx, px + 70)
          for (let x = lo; x <= hi; x += 6) {
            if (x === lo) glow.moveTo(x, yAt(x))
            else glow.lineTo(x, yAt(x))
          }
          glow.stroke()
          if (t - lastHover > 0.7) {
            rings.push({ x: px, born: t, hand: true })
            lastHover = t
          }
        }
      }
      neonTo(pen, path, total, NA, on, 2.4, u, Math.max(0, u - 0.03))
      if (!narrow) {
        // the reflection on the floor
        ctx.save()
        glow.save()
        for (const c of [ctx, glow]) {
          c.translate(0, 2 * base)
          c.scale(1, -0.35)
        }
        ctx.globalAlpha = 0.22
        glow.globalAlpha = 0.3
        neonTo(pen, path, total, NA, on, 2.4, u, u)
        ctx.restore()
        glow.restore()
      }
      // the mark's segment under the line lights white once crossed
      if (crossed) {
        const age = (e - crossedAt) * 3.2 + (e >= 1 ? Math.max(0, t - 3.45) : 0)
        let mOn = age < 0.42 ? strike(age, 5) : 0.45 + 0.4 * Math.max(0, 1 - (age - 0.42) / 0.8)
        const k9 = Math.floor(t / 9)
        if (e >= 1 && hash(k9) > 0.4 && t - 9 * k9 < 0.14) mOn = 0.85
        const [cx] = at(uCross)
        pen.neon(P.line(cx - 0.06 * w, yMark, Math.min(w, cx + 0.1 * w), yMark), WHITE, mOn, 1.4)
        pen.fill(P.circle(cx, yMark, 2.4 + 3 * Math.max(0, 1 - age / 0.4)), WHITE, Math.min(1, mOn + 0.3))
      }
      // the head: white-hot, pulsing once it has arrived
      const arrived = e >= 0.95
      const pulse = arrived ? 1 + 0.25 * Math.sin(6 * t) : 1
      pen.fill(P.circle(hx, hy, (narrow ? 3 : 3.6) * pulse + (e >= 0.95 && e < 1.0 ? 4 * (1 - span(0.95, 1, e)) : 0)), NA, 1)
      pen.fill(P.circle(hx, hy, 1.8), WHITE, 1)
      if (arrived) pen.neon(P.circle(hx, hy, 9 + 1.5 * Math.sin(6 * t)), NA, 0.35 * on, 1.2)
      if (!arrived) pen.streak(Math.max(pts[0][0], hx - 50), yAt(Math.max(pts[0][0], hx - 50)), hx, hy, NA, 1, 2.6)
      // sales: rings that ride the line, more of them while scrolling
      if (e >= 1) {
        ringClock += dt * (1 + 3 * clamp01(Math.abs(pointer.scrollV)))
        const slot = Math.floor(ringClock / 0.9)
        if (rings.length === 0 || rings[rings.length - 1].born < t - 0.85 / (1 + 3 * clamp01(Math.abs(pointer.scrollV)))) {
          if (Math.floor((ringClock - dt) / 0.9) !== slot) rings.push({ x: pts[0][0] + 0.1 * (x1 - x0) + hash(slot + 0.33) * 0.88 * (x1 - x0), born: t, hand: false })
        }
      }
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i]
        const age = t - r.born
        if (age > 1.4) {
          rings.splice(i, 1)
          continue
        }
        const a = 1 - age / 1.4
        const y = yAt(r.x)
        pen.neon(P.circle(r.x, y, 4 + age * 28), NB, a * 0.85, 1.5)
        pen.fill(P.circle(r.x, y, 2.4), NB, a)
      }
      if (rings.length > 8) rings.splice(0, rings.length - 8)
      // a cold glint sliding along the mark with the scroll
      glint(pen, x0 + (w - x0) * clamp01((pointer.scroll - 0.15) / 0.7) - 40, yMark, x0 + (w - x0) * clamp01((pointer.scroll - 0.15) / 0.7) + 40, yMark, 0.3)
      for (const c of [ctx, glow]) c.restore()
      // the room's light from the line, and dust in it
      wash(pen, NA, (x0 + x1) / 2 + ox, (top + base) / 2 + oy, narrow ? 0.6 * w : 0.45 * w, narrow ? 0.5 * h : 0.5 * h, 0.05 * u * breath(t, 5.1, 0.05))
      if (!narrow && !framed && u > 0.3) {
        ctx.beginPath()
        for (let m = 0; m < 14; m++) {
          const x = x0 + ((hash(m + 0.51) * (x1 - x0) + 6 * t * (0.5 + hash(m + 0.52))) % (x1 - x0))
          if (x > hx) continue
          const span2 = Math.max(10, base - yAt(x))
          const y = base - ((hash(m + 0.53) * span2 + 9 * t) % span2)
          ctx.moveTo(x + ox + 0.8, y + oy)
          ctx.arc(x + ox, y + oy, 0.8, 0, TAU)
        }
        ctx.fillStyle = rgba(WHITE, 0.18)
        ctx.fill()
      }
      void hoverX, void W, void H
    },
  }
}
