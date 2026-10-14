import { NA, P, WHITE, rgba, strike } from '../../scenes/kit'
import type { Builder } from '../picture'
import { breath, clamp01, drawMotes, hash, motes, neonTo, remember, span, wash, type Mote } from './lib'

/*
 * 1 in 4: ONE PANE LIT (../PICTURES.md). One large window of dark glass
 * standing right of centre, two panes by two in a thin glass frame, and one
 * of the four lit from within, its light pooling on the floor. A word value:
 * "1 in 4" strikes as the pane does. Afterwards the lit pane breathes, a cold
 * glint passes over the dark panes, dust drifts in the shaft of light, and
 * the hand slides a highlight across the dark glass.
 */
export const windowPane: Builder<{ kind: 'window'; of: number }> = () => {
  let x0 = 0, y0 = 0, W = 1, H = 1, cx = 0, cy = 0
  let frame = new Path2D()
  let sill = new Path2D()
  let litRect = new Path2D()
  let litEdge = new Path2D()
  let litL = 1
  let panes: [number, number, number, number][] = []
  let lit = 3
  let narrow = false, framed = false
  let dust: Mote[] = []
  let shaft: [number, number, number, number] = [0, 0, 1, 1]
  let hb = 1

  return {
    lead: [0, 0],
    dur: 2600,
    key: (_p, e) => e >= 0.52,
    init(w, h, env) {
      narrow = env.narrow
      framed = env.framed
      hb = h
      H = narrow ? 0.7 * h : framed ? 0.74 * h : 0.62 * h
      W = 0.78 * H
      cx = env.mode === 'wide' ? env.copyX + 0.54 * (w - env.copyX) : 0.5 * w
      cy = narrow || framed ? 0.5 * h : 0.5 * h
      x0 = cx - W / 2
      y0 = cy - H / 2
      frame = new Path2D()
      frame.rect(x0, y0, W, H)
      frame.moveTo(cx, y0)
      frame.lineTo(cx, y0 + H)
      frame.moveTo(x0, cy)
      frame.lineTo(x0 + W, cy)
      sill = P.line(x0 - 10, y0 + H + 6, x0 + W + 10, y0 + H + 6)
      const g = 5
      panes = [
        [x0 + g, y0 + g, W / 2 - 2 * g, H / 2 - 2 * g],
        [cx + g, y0 + g, W / 2 - 2 * g, H / 2 - 2 * g],
        [x0 + g, cy + g, W / 2 - 2 * g, H / 2 - 2 * g],
        [cx + g, cy + g, W / 2 - 2 * g, H / 2 - 2 * g],
      ]
      lit = 3
      const [px, py, pw, ph] = panes[lit]
      litRect = P.rect(px, py, pw, ph)
      // the lit pane's edges as one run from its lower inner corner, clockwise: the front's path
      litEdge = new Path2D()
      litEdge.moveTo(px, py + ph)
      litEdge.lineTo(px, py)
      litEdge.lineTo(px + pw, py)
      litEdge.lineTo(px + pw, py + ph)
      litEdge.closePath()
      litL = 2 * (pw + ph)
      remember(litEdge, litL)
      shaft = [px - pw * 0.4, py + ph, px + pw * 1.4, h]
      dust = motes(narrow ? 0 : framed ? 10 : 16, 14, shaft, [-2, 2], [-7, -3])
    },
    frame(pen, w, h, _p, e, t, pointer) {
      const { ctx, glow } = pen
      const warm = 0.14 + 0.08 * clamp01(e / 0.1)
      // the frame, the sill, the panes' glass and their sheen
      pen.glass(frame, warm, 4)
      pen.glass(sill, warm + 0.04, 6)
      panes.forEach(([px, py, pw, ph], i) => {
        ctx.fillStyle = rgba(WHITE, 0.02)
        ctx.fillRect(px, py, pw, ph)
        // the sheen: a diagonal highlight that passes every 8 s and slides with the hand
        let s = 0.018
        if (e >= 1) {
          const ph8 = (t / 8 - i * 0.12) % 1
          if (ph8 > 0 && ph8 < 0.075) s += 0.04 * Math.sin((ph8 / 0.075) * Math.PI)
        }
        let shift = 0
        if (i !== lit && pointer.inside) {
          const d = Math.hypot(pointer.x - (px + pw / 2), pointer.y - (py + ph / 2))
          if (d < 160) {
            s += 0.04 * (1 - d / 160)
            shift = (pointer.x - (px + pw / 2)) * 0.3
          }
        }
        shift = Math.max(-pw / 3, Math.min(pw / 3, shift))
        ctx.save()
        ctx.beginPath()
        ctx.rect(px, py, pw, ph)
        ctx.clip()
        const sg = ctx.createLinearGradient(px + shift, py, px + 0.5 * pw + shift, py + ph)
        sg.addColorStop(0, rgba(WHITE, 0))
        sg.addColorStop(0.5, rgba(WHITE, s))
        sg.addColorStop(1, rgba(WHITE, 0))
        ctx.fillStyle = sg
        ctx.beginPath()
        ctx.moveTo(px - 0.1 * pw + shift, py)
        ctx.lineTo(px + 0.5 * pw + shift, py)
        ctx.lineTo(px + 1.1 * pw + shift, py + ph)
        ctx.lineTo(px + 0.5 * pw + shift, py + ph)
        ctx.closePath()
        ctx.fill()
        ctx.restore()
      })
      if (e <= 0) return
      const [px, py, pw, ph] = panes[lit]
      // the hum: the gas warms twice before it catches (sin² over one turn: two swells)
      const hum = e < 0.3 ? 0.06 * Math.pow(Math.sin(span(0.1, 0.3, e) * Math.PI * 2), 2) : 0
      // the electrode at the pane's lower inner corner and the front round its edges
      const run = span(0.3, 0.52, e)
      if (e >= 0.3 && e < 0.56) {
        pen.fill(P.circle(px, py + ph, 2.4 + 2 * Math.max(0, 1 - run)), WHITE, 1)
        if (run < 1) {
          neonTo(pen, litEdge, litL, NA, 0.9, 2, run, Math.max(0, run - 0.06))
          // the head
          const s = run * litL
          let hx = px, hy = py + ph
          if (s < ph) hy = py + ph - s
          else if (s < ph + pw) (hx = px + (s - ph)), (hy = py)
          else if (s < 2 * ph + pw) (hx = px + pw), (hy = py + (s - ph - pw))
          else (hx = px + pw - (s - 2 * ph - pw)), (hy = py + ph)
          pen.fill(P.circle(hx, hy, 3), WHITE, 1)
        }
      }
      // the pane strikes on as one at the key moment, then breathes
      let on = 0
      let b = 0
      if (pointer.inside) {
        const d = Math.hypot(Math.max(0, Math.abs(pointer.x - (px + pw / 2)) - pw / 2), Math.max(0, Math.abs(pointer.y - (py + ph / 2)) - ph / 2))
        if (d < 160) b = 1 - d / 160
      }
      if (e >= 0.52) {
        const age = (e - 0.52) * 2.6
        on = age < 0.42 ? strike(age, 4) : 1
        on *= breath(t, 4.4, 0.07)
        if (e >= 1) {
          const k = Math.floor(t / 9)
          if (hash(k) > 0.4 && t - 9 * k < 0.08) on *= 0.72
        }
      }
      const wa = hum + 0.2 * on + 0.08 * b * on
      if (wa > 0.004) {
        // the lit glass: gas in a pane, brightest along its bottom and its edges, bloom on the glow layer
        const g = ctx.createLinearGradient(0, py, 0, py + ph)
        g.addColorStop(0, rgba(NA, wa * 0.45))
        g.addColorStop(0.7, rgba(NA, wa * 0.7))
        g.addColorStop(1, rgba(NA, wa * 1.5))
        ctx.fillStyle = g
        ctx.fill(litRect)
        const gg = glow.createLinearGradient(0, py, 0, py + ph)
        gg.addColorStop(0, rgba(NA, wa * 1.2))
        gg.addColorStop(1, rgba(NA, wa * 2.4))
        glow.fillStyle = gg
        glow.fill(litRect)
      }
      if (on > 0) {
        pen.neon(litEdge, NA, on * (1 + 0.4 * b), 2)
        pen.fill(P.circle(px, py + ph, 2.4), WHITE, on)
        // the shaft of light on the floor, and its pool
        const lean = pointer.inside ? Math.max(-6, Math.min(6, (pointer.x - cx) * 0.03)) : 0
        if (!narrow) {
          const sg = glow.createLinearGradient(0, py + ph, 0, h)
          sg.addColorStop(0, rgba(NA, 0.3 * on))
          sg.addColorStop(1, rgba(NA, 0))
          glow.fillStyle = sg
          glow.beginPath()
          glow.moveTo(px + lean, py + ph)
          glow.lineTo(px + pw + lean, py + ph)
          glow.lineTo(px + pw * 1.5 + lean * 2, h)
          glow.lineTo(px - pw * 0.5 + lean * 2, h)
          glow.closePath()
          glow.fill()
          const cg = ctx.createLinearGradient(0, py + ph, 0, h)
          cg.addColorStop(0, rgba(NA, 0.08 * on))
          cg.addColorStop(1, rgba(NA, 0))
          ctx.fillStyle = cg
          ctx.beginPath()
          ctx.moveTo(px + lean, py + ph)
          ctx.lineTo(px + pw + lean, py + ph)
          ctx.lineTo(px + pw * 1.5 + lean * 2, h)
          ctx.lineTo(px - pw * 0.5 + lean * 2, h)
          ctx.closePath()
          ctx.fill()
        }
        wash(pen, NA, px + pw / 2 + lean, h, narrow ? 0.3 * w : 0.26 * w, 0.07 * h, 0.2 * on)
        wash(pen, NA, px + pw / 2, py + ph / 2, 0.45 * w, 0.45 * w, 0.05 * on)
        if (!narrow) drawMotes(pen, dust, t, shaft, on * span(0.52, 1, e), 3)
      }
      void hb
    },
  }
}
