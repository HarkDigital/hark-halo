import { NA, P, WHITE, rgba, strike } from '../../scenes/kit'
import type { Builder } from '../picture'
import { TAU, breath, clamp01, hash, hot, moteAt, motes, wash, type Mote } from './lib'

/*
 * 28%: THE SELLING ARC (../PICTURES.md). One large glass ring hanging face-on
 * in black, `share` of it lit green clockwise from twelve o'clock behind a
 * white-hot head; the dark remainder is clear glass, "most of the rest".
 * The arc's angle is p x share of the circle, so it is the number every
 * frame. Afterwards it breathes, a cold highlight laps the dark glass, dust
 * warms as it drifts through the arc's light, and the hand brings a glint to
 * the glass or a swell to the gas.
 */
export const arc: Builder<{ kind: 'arc'; share: number }> = o => {
  let cx = 0, cy = 0, r = 100, wt = 3.4
  let ring = new Path2D()
  let dust: Mote[] = []
  let box: [number, number, number, number] = [0, 0, 1, 1]
  let narrow = false
  const sweep = TAU * o.share
  const at = (a: number, rr = r): [number, number] => [cx + rr * Math.cos(a), cy + rr * Math.sin(a)]
  /** a short arc of the ring from angle a0 to a1 */
  const seg = (a0: number, a1: number) => P.arc(cx, cy, r, a0, a1)

  return {
    lead: [0, 0],
    dur: 2600,
    init(w, h, env) {
      narrow = env.narrow
      if (env.mode === 'wide') {
        cx = env.copyX + 0.52 * (w - env.copyX)
        cy = 0.5 * h
        r = Math.min(0.38 * h, 0.3 * (w - env.copyX))
        wt = 3.4
      } else if (env.framed) {
        cx = 0.5 * w
        cy = 0.52 * h
        r = 0.36 * h
        wt = 3.2
      } else {
        cx = 0.5 * w
        cy = 0.5 * h
        r = Math.min(0.3 * w, 0.39 * h)
        wt = 2.8
      }
      ring = P.circle(cx, cy, r)
      box = [0, 0, w, h]
      dust = motes(narrow ? 12 : env.framed ? 20 : 36, 28, box, [-4, 4], [-14, -6])
    },
    frame(pen, w, h, p, e, t, pointer) {
      const { ctx, glow } = pen
      const a0 = -Math.PI / 2
      const a1 = a0 + sweep * p
      const warm = 0.1 + 0.06 * clamp01(e / 0.07)
      // the ring: clear glass on the sharp layer only
      pen.glass(ring, warm, narrow ? 9 : 12)
      // light on the dark glass: lit by its neighbour past the head, and behind the electrode
      if (p > 0) {
        for (let i = 0; i < 4; i++) {
          const b0 = a1 + (i * 10 * Math.PI) / 180
          ctx.lineWidth = narrow ? 9 : 12
          ctx.strokeStyle = rgba(WHITE, 0.06 * (1 - i / 4) * p)
          ctx.stroke(seg(b0, b0 + (10 * Math.PI) / 180))
        }
      }
      // the cold highlight lapping the dark glass once every 24 s (never over the lit arc: clipped
      // to the dark range a1 .. twelve)
      if (e >= 1) {
        const lap = a1 + ((t % 24) / 24) * (TAU - sweep)
        const vis = clamp01(((lap - a1) % TAU) / 0.2) * clamp01((a0 + TAU - lap) / 0.2)
        ctx.lineWidth = 1.2
        ctx.strokeStyle = rgba(WHITE, 0.55 * vis)
        ctx.stroke(seg(Math.max(a1, lap - 0.19), Math.min(a0 + TAU, lap + 0.19)))
      }
      // the cursor on the ring: a glint on the dark glass (clipped to it), a swell on the lit gas
      let near = 0, ca = 0
      if (pointer.inside) {
        const d = Math.abs(Math.hypot(pointer.x - cx, pointer.y - cy) - r)
        if (d < 160) {
          near = 1 - d / 160
          ca = Math.atan2(pointer.y - cy, pointer.x - cx)
          let rel = ca - a0
          rel = ((rel % TAU) + TAU) % TAU
          if (rel > sweep * p) {
            const cu = a0 + rel
            ctx.lineWidth = 1.2
            ctx.strokeStyle = rgba(WHITE, 0.6 * near)
            ctx.stroke(seg(Math.max(a1, cu - 0.16), Math.min(a0 + TAU, cu + 0.16)))
          }
        }
      }
      // the electrode at twelve
      const eOn = e > 0 ? (e < 0.16 ? strike(e * 2.6 * 1.6, 3) : 0.5 + 0.1 * Math.sin(1.1 * t)) : 0
      pen.fill(P.circle(cx, cy - r, 2.2 + 3.3 * clamp01(1 - e / 0.1)), WHITE, Math.max(0.18, eOn))
      if (p <= 0) return
      // the gas: the arc to p x share, stuttering as it catches, breathing after; one blink at the stop
      let on = e < 0.16 ? Math.max(0.35, strike(e * 2.6, 5)) : 1
      on *= breath(t, 4.6, 0.07)
      if (e >= 1) {
        const k = Math.floor(t / 9)
        if (hash(k) > 0.5 && t - 9 * k < 0.08) on *= 0.8
      }
      const endAge = e >= 0.995 ? t - 2.85 : -1
      if (endAge >= 0.1 && endAge < 0.16) on *= 0.62
      const path = seg(a0, a1)
      const coreLag = ((4 * Math.PI) / 180) * (1 - clamp01((e - 0.95) / 0.05))
      glow.lineWidth = wt * 2.6 * breath(t, 4.6, 0.08, 0.6)
      glow.strokeStyle = rgba(NA, on)
      glow.stroke(path)
      ctx.lineWidth = wt
      ctx.strokeStyle = rgba(NA, on * 0.8)
      ctx.stroke(path)
      ctx.lineWidth = Math.max(0.7, wt * 0.4)
      ctx.strokeStyle = rgba(hot(NA), on)
      ctx.stroke(seg(a0, Math.max(a0, a1 - coreLag)))
      // the swell under the hand over the lit gas
      if (near > 0) {
        let rel = ((ca - a0) % TAU + TAU) % TAU
        if (rel <= sweep * p) {
          glow.lineWidth = wt * 2.6 * 1.6
          glow.strokeStyle = rgba(NA, 0.6 * near)
          glow.stroke(seg(Math.max(a0, ca - 0.17), Math.min(a1, ca + 0.17)))
        }
      }
      // the white-hot head: the last degrees run hotter, a bead rides the front
      const [hx, hy] = at(a1)
      const [sx, sy] = at(Math.max(a0, a1 - 0.12))
      pen.streak(sx, sy, hx, hy, NA, on, wt * 0.7)
      const headR = endAge >= 0 ? 3 + 4 * Math.exp(-5 * endAge) + 0.6 * Math.sin(1.7 * t + 2) : 3.6
      pen.fill(P.circle(hx, hy, headR), WHITE, Math.min(1, on))
      // the room's light, cast from the lit arc's midpoint
      const [mx, my] = at(a0 + (sweep * p) / 2, 0.35 * r)
      wash(pen, NA, mx, my, narrow ? 0.9 * w : 0.5 * w, narrow ? 0.9 * w : 0.5 * w, (narrow ? 0.05 : 0.055) * p * breath(t, 4.6, 0.07))
      // dust: faint across the band, warming to green near the lit arc (a shorter reach on a phone,
      // where 200 px would warm half the band)
      const reach = narrow ? 110 : 200
      let warmed = 0
      ctx.beginPath()
      for (const m of dust) {
        const [x, y] = moteAt(m, t, box, 6)
        const ang = Math.atan2(y - cy, x - cx)
        let rel = ((ang - a0) % TAU + TAU) % TAU
        const onArc = rel <= sweep * p
        const d = onArc ? Math.abs(Math.hypot(x - cx, y - cy) - r) : Math.min(Math.hypot(x - hx, y - hy), Math.hypot(x - cx, y - (cy - r)))
        if (d < reach && warmed < 10) {
          warmed++
          pen.fill(P.circle(x, y, 1.6), NA, m.a * 3 * (1 - d / reach) * p)
        } else {
          ctx.moveTo(x + m.r, y)
          ctx.arc(x, y, m.r, 0, TAU)
        }
      }
      ctx.fillStyle = rgba(WHITE, 0.14 * p)
      ctx.fill()
    },
  }
}
