import { NA, P, WHITE, rgba, strike } from '../../scenes/kit'
import type { Builder } from '../picture'
import { TAU, breath, clamp01, glint, hash, neonTo, smooth, span, wash } from './lib'

/*
 * 28%: THE REAM (../PICTURES.md). A stack of a hundred sheets of glass seen
 * edge-on, standing on a floor right of centre: the bottom `share` of them
 * lit green (the selling), the rest dark glass (the paper). The lit block is
 * the number: sheet k lights while the count runs k-1 to k, bottom up, a
 * white-hot front running its length. The hand riffles the stack; the
 * scroll fans it open.
 */
const N = 100
export const ream: Builder<{ kind: 'ream'; share: number }> = o => {
  const lit = Math.round(o.share * N)
  let x0 = 0, Wd = 1, pitch0 = 3, cy = 0
  let dx = 14, dy = 5
  let narrow = false, framed = false
  let riffle = new Float32Array(N)
  let W = 1, H = 1

  return {
    lead: [0, 0],
    dur: 2600,
    init(w, h, env) {
      W = w
      H = h
      narrow = env.narrow
      framed = env.framed
      if (env.mode === 'wide') {
        x0 = env.copyX + 0.1 * w
        Wd = 0.5 * (w - env.copyX)
      } else if (framed) {
        Wd = 0.7 * w
        x0 = 0.5 * w - Wd / 2
      } else {
        Wd = 0.84 * w
        x0 = 0.5 * w - Wd / 2
      }
      pitch0 = narrow ? 3 : 4
      dx = narrow ? 0 : 14
      dy = narrow ? 0 : 5
      cy = 0.5 * h
      riffle = new Float32Array(N)
    },
    frame(pen, w, h, p, e, t, pointer, dt) {
      const { ctx, glow } = pen
      const k = Math.floor(p * lit + 1e-6)
      // the fan: the scroll opens the stack; a lean with it
      const fan = smooth(span(0.25, 0.75, pointer.scroll))
      const pitch = pitch0 + (narrow ? 2.4 : 4) * fan
      const lean = 6 * (pointer.scroll - 0.5)
      const yb = cy + (N * pitch) / 2
      const yOf = (i: number) => yb - i * pitch
      const xOf = (i: number) => x0 + lean * (i / N)
      // the riffle: sheets near the hand lift above it and press below it, the stack closing behind
      for (let i = 0; i < N; i++) {
        let want = 0
        if (pointer.inside && !pointer.coarse) {
          const d = yOf(i) - pointer.y
          const g = Math.exp(-(d * d) / (2 * 40 * 40))
          want = d < 0 ? -24 * g : 8 * g
        }
        riffle[i] += (want - riffle[i]) * Math.min(1, 8 * dt)
      }
      // the floor
      const fg = ctx.createLinearGradient(0, 0, w, 0)
      fg.addColorStop(0, rgba(WHITE, 0))
      fg.addColorStop(0.3, rgba(WHITE, 0.08))
      fg.addColorStop(1, rgba(WHITE, 0.08))
      ctx.strokeStyle = fg
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, yb + 3)
      ctx.lineTo(w, yb + 3)
      ctx.stroke()
      // the dark sheets, batched: front edges and the end face's depth edges
      const warm = 0.1 + 0.04 * clamp01(e / 0.08)
      const dark = new Path2D()
      const bright = new Path2D()
      for (let i = k + 1; i < N; i++) {
        const y = yOf(i) + riffle[i], x = xOf(i)
        const near = pointer.inside && !pointer.coarse ? Math.exp(-((y - pointer.y) * (y - pointer.y)) / (2 * 50 * 50)) : 0
        const path = near > 0.2 ? bright : dark
        path.moveTo(x, y)
        path.lineTo(x + Wd, y)
        if (dx) path.lineTo(x + Wd + dx, y - dy)
      }
      ctx.lineWidth = 2
      ctx.strokeStyle = rgba(WHITE, 0.025)
      ctx.stroke(dark)
      ctx.lineWidth = 0.8
      ctx.strokeStyle = rgba(WHITE, warm)
      ctx.stroke(dark)
      ctx.strokeStyle = rgba(WHITE, 0.3)
      ctx.stroke(bright)
      // the top face of the top sheet
      const yt = yOf(N - 1) + riffle[N - 1], xt = xOf(N - 1)
      if (dx) {
        ctx.fillStyle = rgba(WHITE, 0.03)
        ctx.beginPath()
        ctx.moveTo(xt, yt)
        ctx.lineTo(xt + Wd, yt)
        ctx.lineTo(xt + Wd + dx, yt - dy)
        ctx.lineTo(xt + dx, yt - dy)
        ctx.closePath()
        ctx.fill()
        // a cold glint running down the end face every 8 s, and with the scroll
        if (e >= 1) {
          const c8 = ((t - 2.85) % 8) / 8
          if (c8 < 0.25) {
            const y = yt + (yb - yt) * (c8 / 0.25)
            glint(pen, x0 + Wd + 2, y - 2 - 12, x0 + Wd + dx - 2, y - dy + 2 + 12, 0.5)
          }
        }
      }
      if (k <= 0 && p * lit <= 0) return
      // the lit sheets: a white-hot front runs each in its unit of the count, then it stutters and rests
      const flickSlot = Math.floor(t / 2.5)
      const flick = e >= 1 && k > 0 ? Math.floor(hash(flickSlot + 0.2) * k) : -1
      for (let i = 0; i <= Math.min(lit - 1, k); i++) {
        const u = p * lit - i
        if (u <= 0) continue
        const y = yOf(i) + riffle[i], x = xOf(i)
        const line = P.line(x, y, x + Wd, y)
        let on: number
        let rise = 1
        if (u < 1) {
          rise = u
          on = 0.9
        } else {
          const age = (u - 1) * 0.6 + (e >= 1 ? Math.max(0, t - 2.85) : 0)
          on = age < 0.42 ? 0.35 + 0.65 * strike(age, i) : 1
          on *= breath(t, 3.2 + 2 * hash(i + 0.7), 0.06, hash(i + 0.8) * TAU)
          if (i === flick && t - flickSlot * 2.5 < 0.06) on *= 0.5
          if (e >= 0.995 && i === k - 1 && t - 2.85 < 0.3) on *= 1 + 0.6 * (1 - (t - 2.85) / 0.3)
        }
        const near = pointer.inside && !pointer.coarse ? Math.exp(-((y - pointer.y) * (y - pointer.y)) / (2 * 50 * 50)) : 0
        on = Math.min(1, on * 0.85 * (1 + 0.3 * near))
        // (each sheet a crisp ruled line with a white-hot core on the sharp layer; the block glows as one mass below)
        if (rise < 1) {
          ctx.setLineDash([Wd * rise, Wd * 2])
          glow.setLineDash([Wd * rise, Wd * 2])
        }
        ctx.lineWidth = 1.2
        ctx.strokeStyle = rgba(NA, 0.7 * on)
        ctx.stroke(line)
        ctx.lineWidth = 0.6
        ctx.strokeStyle = rgba(WHITE, 0.55 * on)
        ctx.stroke(line)
        glow.lineWidth = 1.6
        glow.strokeStyle = rgba(NA, 0.35 * on)
        glow.stroke(line)
        ctx.setLineDash([])
        glow.setLineDash([])
        if (rise < 1) pen.fill(P.circle(x + Wd * rise, y, 2.2), WHITE, 1)
        else if (dx) pen.neon(P.line(x + Wd, y, x + Wd + dx, y - dy), NA, on * 0.7, 0.8)
      }
      // the lit block's glow as one mass
      if (k > 0) {
        const yTopLit = yOf(k - 1) + riffle[k - 1], yBot = yOf(0) + riffle[0]
        const bgl = glow.createLinearGradient(0, yTopLit, 0, yBot)
        bgl.addColorStop(0, rgba(NA, 0.3))
        bgl.addColorStop(1, rgba(NA, 0.18))
        glow.fillStyle = bgl
        glow.fillRect(x0, yTopLit, Wd, yBot - yTopLit)
      }
      // the lit block's light: pooling under the stack, and cast up through the dark sheets above it
      const frac = k / lit
      wash(pen, NA, x0 + Wd / 2, yb, 0.5 * Wd, 0.05 * h, 0.12 * frac * breath(t, 4.8, 0.05))
      if (k > 0) {
        const yTop = yOf(k - 1) + riffle[k - 1]
        const cg = glow.createLinearGradient(0, yTop, 0, yTop - 4 * pitch)
        cg.addColorStop(0, rgba(NA, 0.12))
        cg.addColorStop(1, rgba(NA, 0))
        glow.fillStyle = cg
        glow.fillRect(x0, yTop - 4 * pitch, Wd, 4 * pitch)
      }
      wash(pen, NA, x0 + Wd / 2, cy, narrow ? 0.6 * w : 0.4 * w, narrow ? 0.6 * w : 0.4 * h, 0.04 * frac)
      // dust in the lit block's light
      if (k > 2 && !narrow) {
        ctx.beginPath()
        for (let m = 0; m < 8; m++) {
          const x = x0 + ((hash(m + 0.41) * Wd + 6 * t * (0.5 + hash(m + 0.42))) % Wd)
          const y = yb - ((hash(m + 0.43) * k * pitch + 5 * t) % Math.max(1, k * pitch))
          ctx.moveTo(x + 0.8, y)
          ctx.arc(x, y, 0.8, 0, TAU)
        }
        ctx.fillStyle = rgba(WHITE, 0.3)
        ctx.fill()
      }
      void W, void H
    },
  }
}
