import { NA, P, WHITE, rgba, strike } from '../../scenes/kit'
import type { Builder, Label } from '../picture'
import { TAU, breath, clamp01, hash, hot, neonTo, span, wash } from './lib'

/*
 * Part 107: THE CITATION TUBE (../PICTURES.md). The licence as a real neon
 * sign: ONE continuous glass tube bent through the digits 1 0 7, two
 * electrodes, two feed wires, glass jumpers where the tube crosses dark
 * between digits, standoffs holding it to the wall. "14 CFR" beside it
 * completes the citation. The current arrives along the left feed, the gas
 * front runs the whole tube from A to B (nothing lights in the jumpers), and
 * "Part 107" strikes as the front reaches B and the sign stutters on as one
 * gas column. Afterwards the bloom breathes, a dim window of gas drifts
 * along the tube, and the hand warms the glass.
 */
type Seg = { kind: 'line'; a: [number, number]; b: [number, number]; len: number } | { kind: 'arc'; c: [number, number]; r: number; a0: number; a1: number; len: number }
interface Piece {
  path: Path2D
  segs: Seg[]
  len: number
  start: number
  lit: boolean
}
const line = (a: [number, number], b: [number, number]): Seg => ({ kind: 'line', a, b, len: Math.hypot(b[0] - a[0], b[1] - a[1]) })
const arc = (c: [number, number], r: number, a0: number, a1: number): Seg => ({ kind: 'arc', c, r, a0, a1, len: Math.abs(a1 - a0) * r })
const piece = (segs: Seg[], lit = true): Piece => {
  const path = new Path2D()
  segs.forEach((s, i) => {
    if (s.kind === 'line') {
      if (i === 0) path.moveTo(s.a[0], s.a[1])
      path.lineTo(s.b[0], s.b[1])
    } else path.arc(s.c[0], s.c[1], s.r, s.a0, s.a1, s.a1 < s.a0)
  })
  return { path, segs, len: segs.reduce((n, s) => n + s.len, 0), start: 0, lit }
}
/** the point `s` px along a piece */
const at = (p: Piece, s: number): [number, number] => {
  for (const seg of p.segs) {
    if (s <= seg.len) {
      if (seg.kind === 'line') {
        const k = seg.len ? s / seg.len : 0
        return [seg.a[0] + (seg.b[0] - seg.a[0]) * k, seg.a[1] + (seg.b[1] - seg.a[1]) * k]
      }
      const th = seg.a0 + (seg.a1 - seg.a0) * (s / seg.len)
      return [seg.c[0] + seg.r * Math.cos(th), seg.c[1] + seg.r * Math.sin(th)]
    }
    s -= seg.len
  }
  const last = p.segs[p.segs.length - 1]
  return last.kind === 'line' ? last.b : [last.c[0] + last.r * Math.cos(last.a1), last.c[1] + last.r * Math.sin(last.a1)]
}

export const sign: Builder<{ kind: 'sign'; text: string; cite: string }> = o => {
  let run: Piece[] = []
  let total = 1
  let jumpers = new Path2D(), feeds = new Path2D(), standoffs = new Path2D()
  let A: [number, number] = [0, 0], B: [number, number] = [0, 0]
  let feedIn: [number, number] = [0, 0]
  let wt = 3.2
  let scx = 0, scy = 0
  let narrow = false, framed = false
  let samples: [number, number][] = []
  let W = 1, Hb = 1

  return {
    lead: [0, 0],
    dur: 2800,
    key: (_p, e) => e >= 0.78,
    init(w, h, env) {
      W = w
      Hb = h
      narrow = env.narrow
      framed = env.framed
      const wide = env.mode === 'wide'
      // the sign's size and place: cap height H, the digits 1.66H wide
      let H = narrow ? 0.44 * h : framed ? 0.46 * h : 0.5 * h
      if (wide) H = Math.min(H, (0.38 * w) / 1.66)
      const yB = narrow || framed ? 0.7 * h : 0.72 * h
      const yT = yB - H
      const cx = wide ? Math.max(0.69 * w, env.copyX + 0.07 * w + 0.83 * H) : 0.5 * w
      const xL = cx - 0.83 * H
      const yE = yB + 0.05 * h
      wt = narrow ? 2.4 : narrow || framed ? 3 : 3.2
      scx = cx
      scy = (yT + yB) / 2
      // the digits, in the order the gas runs: stub A up, the 1, (jumper), the 0 clockwise from its top, (jumper), the 7, stub B
      const x0 = xL + 0.22 * H, r0 = 0.32 * H
      const x7 = xL + 1.08 * H
      const foot: [number, number] = [x7 + 0.14 * H, yB]
      const barR: [number, number] = [x7 + 0.58 * H, yT]
      const dir = [foot[0] - barR[0], foot[1] - barR[1]]
      const dl = Math.hypot(dir[0], dir[1])
      const ext = (yE - yB) / (dir[1] / dl)
      B = [foot[0] + (dir[0] / dl) * ext, yE]
      A = [xL, yE]
      run = [
        piece([line(A, [xL, yB])]),
        piece([line([xL, yB], [xL, yT])]),
        piece([line([xL, yT], [x0 + r0, yT])], false),
        piece([
          arc([x0 + r0, yT + r0], r0, -Math.PI / 2, 0),
          line([x0 + 2 * r0, yT + r0], [x0 + 2 * r0, yB - r0]),
          arc([x0 + r0, yB - r0], r0, 0, Math.PI),
          line([x0, yB - r0], [x0, yT + r0]),
          arc([x0 + r0, yT + r0], r0, Math.PI, 1.5 * Math.PI),
        ]),
        piece([line([x0 + r0, yT], [x7, yT])], false),
        piece([line([x7, yT], barR), line(barR, foot)]),
        piece([line(foot, B)]),
      ]
      let s = 0
      for (const p of run) {
        p.start = s
        s += p.len
      }
      total = s
      jumpers = new Path2D()
      for (const p of run) if (!p.lit) jumpers.addPath(p.path)
      feeds = new Path2D()
      feedIn = [narrow ? Math.max(0, A[0] - 0.2 * w) : 0, yE]
      feeds.moveTo(feedIn[0], yE)
      feeds.lineTo(A[0], yE)
      feeds.moveTo(B[0], yE)
      feeds.lineTo(w, yE)
      standoffs = new Path2D()
      if (!narrow) {
        const pts: [number, number][] = [
          [xL, yB - 0.25 * H],
          [xL, yB - 0.75 * H],
          [x0, yT + 0.3 * H],
          [x0 + 2 * r0, yT + 0.3 * H],
          [x0, yT + 0.7 * H],
          [x0 + 2 * r0, yT + 0.7 * H],
          [x7 + 0.29 * H, yT],
          [(barR[0] + foot[0]) / 2, (barR[1] + foot[1]) / 2],
        ]
        for (const [x, y] of pts) {
          standoffs.moveTo(x + 3.5, y)
          standoffs.arc(x, y, 3.5, 0, TAU)
        }
      }
      // samples every ~6 px along the lit tube, for the cursor
      samples = []
      for (const p of run) if (p.lit) for (let d = 0; d <= p.len; d += 6) samples.push(at(p, d))
      const labels: Label[] = [{ text: o.cite, x: xL, y: yT - (narrow ? 18 : 26) }]
      return labels
    },
    frame(pen, w, h, _p, e, t, pointer) {
      const { ctx, glow } = pen
      // the glass: every sleeve, the jumpers, the feeds, the standoffs, the electrode rings
      for (const p of run) if (p.lit) pen.glass(p.path, 0.16, wt * 3.4)
      pen.glass(jumpers, 0.1, 3)
      pen.glass(feeds, 0.08, 2)
      pen.glass(standoffs, 0.22, 2)
      // the current arrives along the left feed
      if (e >= 0.02 && e < 0.12) {
        const u = span(0.02, 0.12, e)
        const x1 = feedIn[0] + (A[0] - feedIn[0]) * u
        pen.streak(Math.max(feedIn[0], x1 - 0.12 * w), A[1], x1, A[1], NA, 0.9, 2.2)
      }
      // the electrodes
      const electrode = (pt: [number, number], from: number, seed: number, period: number) => {
        if (e < from) {
          pen.glass(P.circle(pt[0], pt[1], 4), 0.3, 2)
          return
        }
        const age = (e - from) * 2.8
        const on = age < 0.42 ? strike(age, seed) : 1
        const pulse = e >= 1 ? 0.75 + 0.25 * (0.5 + 0.5 * Math.sin((TAU * t) / period + seed)) : 1
        const flare = age < 0.4 ? 4 + 8 * Math.sin(Math.min(1, age / 0.4) * Math.PI) : 5
        let near = 0
        if (pointer.inside) {
          const d = Math.hypot(pointer.x - pt[0], pointer.y - pt[1])
          if (d < 160) near = 1 - d / 160
        }
        wash(pen, NA, pt[0], pt[1], flare, flare, 0.6 * on)
        pen.fill(P.circle(pt[0], pt[1], 2.6), WHITE, Math.min(1, on * pulse + near))
      }
      electrode(A, 0.12, 5, 3.7)
      electrode(B, 0.78, 9, 4.9)
      if (e < 0.14) return
      // the front: the gas runs the whole tube A to B at one speed; the core lags 6% of it
      const front = e < 0.78 ? total * span(0.14, 0.78, e) : total
      const coreF = e < 0.78 ? front - 0.06 * total : e < 0.84 ? total - 0.06 * total * (1 - span(0.78, 0.84, e)) : total
      // the whole sign stutters on as one column at the key moment, then settles and breathes
      let on = 0.85
      if (e >= 0.78) {
        const age = (e - 0.78) * 2.8
        on = age < 0.42 ? 0.85 + 0.3 * strike(age, 1) : e < 1 ? 1.15 - 0.15 * span(0.93, 1, e) : 1
      }
      const bb = e >= 1 ? breath(t, 5.2, 0.06) : 1
      const dip = e >= 1 && hash(Math.floor(t / 8.3)) < 0.35 && t - Math.floor(t / 8.3) * 8.3 < 0.1 ? 0.8 : 1
      const glowOn = Math.min(1.2, on * bb * dip)
      // the cursor: the nearest sample
      let near = 0, ni = -1
      if (pointer.inside) {
        let bd = 1e9
        samples.forEach(([x, y], i) => {
          const d = Math.hypot(pointer.x - x, pointer.y - y)
          if (d < bd) (bd = d), (ni = i)
        })
        if (bd < 160) near = 1 - bd / 160
      }
      // the glow layer leans a little toward the hand
      const lx = pointer.inside ? Math.max(-6, Math.min(6, (pointer.x - scx) * 0.012)) : 0
      const ly = pointer.inside ? Math.max(-6, Math.min(6, (pointer.y - scy) * 0.012)) : 0
      glow.save()
      glow.translate(lx, ly)
      for (const p of run) {
        if (!p.lit) continue
        const lit = clamp01((front - p.start) / p.len)
        const core = clamp01((coreF - p.start) / p.len)
        if (lit <= 0) continue
        // the glow and colour breathe; the core stays steady
        glow.lineWidth = wt * 2.6
        glow.strokeStyle = rgba(NA, glowOn)
        if (lit < 1) glow.setLineDash([p.len * lit, p.len * 2])
        glow.stroke(p.path)
        glow.setLineDash([])
        neonTo(pen, p.path, p.len, NA, 0, wt, lit, core)
        ctx.lineWidth = wt
        ctx.strokeStyle = rgba(NA, Math.min(1, 0.8 * on * bb * dip))
        if (lit < 1) ctx.setLineDash([p.len * lit, p.len * 2])
        ctx.stroke(p.path)
        ctx.setLineDash([])
        if (core > 0) {
          ctx.lineWidth = Math.max(0.7, wt * 0.4)
          ctx.strokeStyle = rgba(hot(NA), Math.min(1, on))
          if (core < 1) ctx.setLineDash([p.len * core, p.len * 2])
          ctx.stroke(p.path)
          ctx.setLineDash([])
        }
      }
      // the drifting window of gas: a dim headless stretch travelling A to B every 6.5 s
      if (e >= 1) {
        const cyc = (t - 3.6) % 6.5
        const span12 = 0.12 * total
        const head = cyc * 0.35 * total
        if (cyc > 0 && head - span12 < total) {
          for (const p of run) {
            if (!p.lit) continue
            const a0 = Math.max(0, head - span12 - p.start), a1 = Math.min(p.len, head - p.start)
            if (a1 <= 0 || a0 >= p.len) continue
            glow.lineWidth = wt * 2.6
            glow.strokeStyle = rgba(NA, 0.12)
            glow.setLineDash([a1 - a0, p.len * 2])
            glow.lineDashOffset = -a0
            glow.stroke(p.path)
            glow.setLineDash([])
            glow.lineDashOffset = 0
          }
        }
      }
      // the gas warms under the hand
      if (near > 0 && ni >= 0) {
        const [x, y] = samples[ni]
        wash(pen, NA, x, y, 40, 40, 0.5 * near)
        pen.fill(P.circle(x, y, wt * 0.5), WHITE, 0.4 * near)
      }
      glow.restore()
      // the front's white-hot head and the brighter window behind it while it runs
      if (e < 0.78) {
        for (const p of run) {
          if (front >= p.start && front <= p.start + p.len) {
            const [x, y] = at(p, front - p.start)
            if (p.lit) pen.fill(P.circle(x, y, 3.5), WHITE, 1)
            break
          }
        }
      }
      // the exit streak along the right feed
      if (e >= 0.8 && e < 0.92) {
        const u = span(0.8, 0.92, e)
        const x1 = B[0] + (w - B[0]) * u
        pen.streak(Math.max(B[0], x1 - 0.12 * w), B[1], x1, B[1], NA, 0.9 * (1 - u * 0.5), 2.2)
      }
      // the wall light
      const litFrac = clamp01(front / total)
      wash(pen, NA, scx, scy, narrow ? 0.48 * w : framed ? 0.4 * w : 0.42 * w, narrow ? 0.55 * h : 0.5 * h, 0.055 * litFrac * bb)
      void W, void Hb, void h
    },
  }
}
