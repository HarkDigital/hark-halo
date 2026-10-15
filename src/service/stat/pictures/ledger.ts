import { NA, P, WHITE, rgba, strike } from '../../scenes/kit'
import type { Builder } from '../picture'
import { TAU, breath, clamp01, hash, neonTo, wash } from './lib'

/*
 * 84%: THE LEDGER (../PICTURES.md). A sheet of glass ruled with a hundred
 * lines in four columns, standing right of centre; `share` of them filled in
 * by hand: a stroke of neon handwriting on each, written live by a white-hot
 * nib as the number counts, in reading order, the sixteen blanks lying dark.
 * The strokes are strokes, never words: the picture counts lines written by
 * hand, nothing else. After the strike the nib never stops: every second or
 * so it dims one written line and writes it again (the manual process, every
 * day); scrolling makes it frantic; on a laptop it follows the hand, re-inking
 * the line under the cursor. The scroll tilts the sheet in parallax.
 */
interface Line {
  x0: number
  y: number
  len: number
  path: Path2D
  L: number
  /** its index in the writing order, or -1 for a blank */
  order: number
  seed: number
}
const COLS = 4
const PERIOD = 1.4
export const ledger: Builder<{ kind: 'ledger'; share: number; of: number }> = o => {
  let lines: Line[] = []
  let byOrder: Line[] = []
  let sx = 0, sy = 0, sw = 1, sh = 1, pitch = 8
  let narrow = false
  let clock = 0
  let nib: [number, number] = [0, 0], nibSet = false
  let W = 1, H = 1

  return {
    lead: [0, 0],
    dur: 2800,
    init(w, h, env) {
      W = w
      H = h
      narrow = env.narrow
      if (env.mode === 'wide') {
        sx = env.copyX + 0.08 * w
        sw = 0.94 * w - sx
        sy = 0.14 * h
        sh = 0.74 * h
      } else if (env.framed) {
        sw = 0.76 * w
        sx = 0.5 * w - sw / 2
        sy = 0.12 * h
        sh = 0.76 * h
      } else {
        sw = 0.9 * w
        sx = 0.5 * w - sw / 2
        sy = 0.1 * h
        sh = 0.8 * h
      }
      const rows = Math.ceil(o.of / COLS)
      const pad = narrow ? 10 : 18
      const colW = (sw - 2 * pad) / COLS
      pitch = (sh - 2 * pad) / rows
      // which lines stay blank: a seeded set of (of - share), scattered
      const blank = new Set(
        Array.from({ length: o.of }, (_, i) => i)
          .sort((a, b) => hash(a * 13 + 0.41) - hash(b * 13 + 0.41))
          .slice(0, Math.max(0, o.of - o.share)),
      )
      lines = []
      let order = 0
      for (let i = 0; i < o.of; i++) {
        const col = Math.floor(i / rows), row = i % rows
        const x0 = sx + pad + col * colW + 6
        const y = sy + pad + (row + 0.75) * pitch
        const len = (colW - 18) * (0.55 + 0.4 * hash(i * 7 + 0.23))
        // the stroke: handwriting's rhythm, a seeded wobble about the line, never a letter
        const A = pitch * 0.3
        const ph = hash(i * 7 + 0.29) * TAU
        const path = new Path2D()
        const N = Math.max(6, Math.round(len / 7))
        let L = 0, px = x0, py = y
        path.moveTo(x0, y)
        for (let k = 1; k <= N; k++) {
          const x = x0 + (len * k) / N
          const yy = y - A * (0.55 * Math.sin(k * 0.95 + ph) + 0.45 * (hash(i * 97 + k) - 0.5) * 1.6 + 0.35)
          path.lineTo(x, yy)
          L += Math.hypot(x - px, yy - py)
          px = x
          py = yy
        }
        lines.push({ x0, y, len, path, L, order: blank.has(i) ? -1 : order++, seed: i })
      }
      byOrder = lines.filter(l => l.order >= 0).sort((a, b) => a.order - b.order)
      clock = 0
      nibSet = false
    },
    frame(pen, w, h, p, e, t, pointer, dt) {
      const { ctx, glow } = pen
      const k = Math.floor(p * o.share + 1e-6)
      // the parallax: the scroll tilts the sheet
      const ox = (pointer.scroll - 0.5) * 24, oy = (pointer.scroll - 0.5) * 10
      for (const c of [ctx, glow]) {
        c.save()
        c.translate(ox, oy)
      }
      // the sheet: a faint body, a hairline edge, a sheen that slides with the scroll
      const warm = 0.08 + 0.06 * clamp01(e / 0.08)
      const sheet = P.rect(sx, sy, sw, sh)
      ctx.fillStyle = rgba(WHITE, 0.015)
      ctx.fill(sheet)
      pen.glass(sheet, warm, 4)
      ctx.save()
      ctx.clip(sheet)
      const gx = sx + sw * (0.15 + 0.7 * clamp01((pointer.scroll - 0.2) / 0.6))
      const sg = ctx.createLinearGradient(gx - 0.2 * sw, sy, gx + 0.2 * sw, sy + sh)
      sg.addColorStop(0, rgba(WHITE, 0))
      sg.addColorStop(0.5, rgba(WHITE, 0.025))
      sg.addColorStop(1, rgba(WHITE, 0))
      ctx.fillStyle = sg
      ctx.fillRect(sx, sy, sw, sh)
      // the rules, batched; the dividers between the columns
      const rules = new Path2D()
      for (const l of lines) {
        rules.moveTo(l.x0 - 6, l.y)
        rules.lineTo(l.x0 - 6 + (sw - 2 * (narrow ? 10 : 18)) / COLS - 6, l.y)
      }
      ctx.lineWidth = 0.8
      ctx.strokeStyle = rgba(WHITE, 0.07)
      ctx.stroke(rules)
      ctx.restore()
      // the retyping clock: faster while scrolling
      clock += dt * (1 + 3 * clamp01(Math.abs(pointer.scrollV)))
      const idle = e >= 1
      const slot = Math.floor(clock / PERIOD)
      const phase = clock - slot * PERIOD
      const rewriting = idle && k > 0 ? Math.floor(hash(slot + 0.5) * k) : -1
      // the hand: the nearest written line (a laptop only)
      let hover: Line | null = null, hoverK = 0
      if (pointer.inside && !pointer.coarse) {
        let best = 60
        for (const l of lines) {
          if (l.order < 0 || l.order >= k) continue
          const dx = pointer.x - ox < l.x0 ? l.x0 - (pointer.x - ox) : pointer.x - ox > l.x0 + l.len ? pointer.x - ox - l.x0 - l.len : 0
          const d = Math.hypot(dx, pointer.y - oy - l.y)
          if (d < best) (best = d), (hover = l)
        }
        if (hover) hoverK = 1 - best / 60
        // a cold glint on a blank line under the hand
        for (const l of lines) {
          if (l.order >= 0 && l.order < k) continue
          const d = Math.abs(pointer.y - oy - l.y)
          if (d < 40 && pointer.x - ox > l.x0 - 10 && pointer.x - ox < l.x0 + l.len + 10) {
            ctx.lineWidth = 1
            ctx.strokeStyle = rgba(WHITE, 0.3 * (1 - d / 40))
            ctx.beginPath()
            ctx.moveTo(l.x0 - 6, l.y)
            ctx.lineTo(l.x0 + l.len + 6, l.y)
            ctx.stroke()
          }
        }
      }
      // the written lines, and where the nib wants to be
      let target: [number, number] | null = null
      let litAll = 0
      const flickSlot = Math.floor(t / 2.1)
      const flick = idle && k > 0 ? Math.floor(hash(flickSlot + 0.8) * k) : -1
      for (const l of byOrder) {
        const i = l.order
        const u = p * o.share - i
        if (u <= 0) continue
        let on: number
        let rise = 1
        let dim = 0
        if (u < 1) {
          // being written: the nib runs the stroke in this unit of the count
          rise = u
          on = 0.95
          target = [l.x0 + l.len * rise, l.y]
        } else {
          const age = (u - 1) * 0.5 + (idle ? Math.max(0, t - 3.05) : 0)
          on = age < 0.42 ? 0.4 + 0.6 * strike(age, l.seed) : 1
          on *= breath(t, 3.2 + 2 * hash(l.seed + 0.6), 0.05, hash(l.seed + 0.7) * TAU)
          if (i === flick && t - flickSlot * 2.1 < 0.06) on *= 0.5
          if (i === rewriting) {
            // the retyping: the line dims, then the nib writes it again
            if (phase < 0.12) dim = 1 - (phase / 0.12) * 0.7
            else if (phase < 0.72) {
              dim = 0.3
              rise = (phase - 0.12) / 0.6
              target = [l.x0 + l.len * rise, l.y]
            }
          }
        }
        const hk = hover === l ? hoverK : 0
        on = Math.min(1.1, on * (1 + 0.3 * hk))
        litAll += on
        if (dim > 0) {
          // the dimmed line under the rewrite, then the fresh stroke over it
          pen.neon(l.path, NA, on * dim, 1.5)
          if (rise < 1 && rise > 0) neonTo(pen, l.path, l.L, NA, on, 1.5, rise, Math.max(0, rise - 0.1))
        } else neonTo(pen, l.path, l.L, NA, on, 1.5, rise, rise >= 1 ? 1 : Math.max(0, rise - 0.1))
        // the hand re-inks the line under it
        if (hk > 0) {
          const nx = Math.max(l.x0, Math.min(l.x0 + l.len, pointer.x - ox))
          glow.lineWidth = 6
          glow.strokeStyle = rgba(NA, 0.4 * hk)
          glow.beginPath()
          glow.moveTo(Math.max(l.x0, nx - 40), l.y - 2)
          glow.lineTo(Math.min(l.x0 + l.len, nx + 40), l.y - 2)
          glow.stroke()
          if (!target) target = [nx, l.y - 2]
        }
      }
      // the nib: eased toward its work, parked at the last line's end when it has none
      if (!target && k > 0) {
        const last = byOrder[Math.min(k, byOrder.length) - 1]
        target = [last.x0 + last.len, last.y]
      }
      if (target) {
        if (!nibSet || e < 1) {
          nib = target
          nibSet = true
        } else {
          const kk = Math.min(1, 14 * dt)
          nib = [nib[0] + (target[0] - nib[0]) * kk, nib[1] + (target[1] - nib[1]) * kk]
        }
        const flare = e < 0.08 ? 1 + 2 * (1 - e / 0.08) : 1
        pen.fill(P.circle(nib[0], nib[1] - 1, 2.6 * flare), WHITE, 1)
        wash(pen, NA, nib[0], nib[1], 22, 22, 0.5)
      }
      for (const c of [ctx, glow]) c.restore()
      // the room's light, from the written lines, pooling under the sheet
      const lit = k / o.share
      wash(pen, NA, sx + sw / 2 + ox, sy + sh / 2 + oy, narrow ? 0.6 * w : 0.42 * w, narrow ? 0.6 * w : 0.42 * w, 0.045 * lit * breath(t, 5.1, 0.05))
      if (!narrow) wash(pen, NA, sx + sw / 2 + ox, sy + sh + oy, 0.4 * sw, 0.05 * h, 0.12 * lit)
      void litAll, void W, void H
    },
  }
}
