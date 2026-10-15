import { NB, P, WHITE, rgba, strike } from '../../scenes/kit'
import type { Builder } from '../picture'
import { TAU, breath, clamp01, easeOut, hash, moteAt, motes, neonTo, span, wash, type Mote } from './lib'

/*
 * Page 1: HALL OF PAGES (../PICTURES.md). A dark gallery: one tall sheet of
 * glass stands near, lit blue; behind it identical sheets recede in one-point
 * perspective to the right until they vanish. Only the first is lit. The
 * blue front runs round its edges and "Page 1" strikes as the join closes;
 * the dark sheets drift back a little, no longer looked at. Afterwards the
 * sheet breathes, one edge hiccups now and then, a cold glint runs down the
 * hall, dust drifts in the light, and the hall leans with the hand.
 */
interface Sheet {
  x: number
  y: number
  w: number
  h: number
  a: number
  s: number
}
export const first: Builder<{ kind: 'first' }> = () => {
  let page: [number, number, number, number] = [0, 0, 1, 1]
  let edge = new Path2D()
  let per = 1
  let ghosts: Sheet[] = []
  let vps: [number, number][] = []
  let narrow = false, framed = false
  let dust: Mote[] = []
  let box: [number, number, number, number] = [0, 0, 1, 1]
  let lean: [number, number] = [0, 0]
  let W = 1, H = 1

  const project = (vp: [number, number], s: number): Sheet => {
    const [x, y, w, h] = page
    return { x: vp[0] + (x - vp[0]) * s, y: vp[1] + (y - vp[1]) * s, w: w * s, h: h * s, a: 0, s }
  }

  return {
    lead: [0.5, 0.5],
    dur: 2600,
    key: (_p, e) => e >= 0.78,
    init(w, h, env) {
      W = w
      H = h
      narrow = env.narrow
      framed = env.framed
      let count: number
      if (env.mode === 'wide') {
        const x0 = Math.min(0.46 * w, env.copyX + 0.07 * w)
        page = [x0, 0.16 * h, 0.185 * w, 0.64 * h]
        vps = [[0.93 * w, 0.46 * h]]
        count = 9
      } else if (framed) {
        const ph = 0.7 * h, pw = 0.6 * ph
        page = [0.5 * w - pw / 2, 0.15 * h, pw, ph]
        vps = [
          [0.94 * w, 0.47 * h],
          [0.06 * w, 0.47 * h],
        ]
        count = 5
      } else {
        page = [0.1 * w, 0.13 * h, 0.34 * w, 0.71 * h]
        vps = [[0.97 * w, 0.46 * h]]
        count = 3
      }
      const alphas = [0.26, 0.19, 0.14, 0.1, 0.075, 0.055, 0.04, 0.03, 0.02]
      ghosts = []
      vps.forEach(vp => {
        for (let k = 1; k <= count; k++) {
          const sh = project(vp, 1 / (1 + 0.8 * k))
          sh.a = alphas[k - 1]
          ghosts.push(sh)
        }
      })
      const [x, y, pw, ph] = page
      edge = new Path2D()
      edge.moveTo(x, y)
      edge.lineTo(x + pw, y)
      edge.lineTo(x + pw, y + ph)
      edge.lineTo(x, y + ph)
      edge.closePath()
      per = 2 * (pw + ph)
      box = [x - 0.15 * pw, y - 0.15 * ph, x + 1.15 * pw, y + ph]
      dust = motes(narrow ? 6 : framed ? 10 : 14, 1, box, [2, 4], [-13, -7])
      lean = [0, 0]
    },
    frame(pen, w, h, _p, e, t, pointer, dt) {
      const { ctx, glow } = pen
      const [x, y, pw, ph] = page
      // the hall leans with the hand: the vanishing points ease toward it, the near page stays
      // (the hand: the pointer on a laptop, the scroll on a phone; both tilt the hall)
      const cur: [number, number] = pointer.inside && !narrow ? [Math.max(-22, Math.min(22, (pointer.x - w / 2) * 0.05)), Math.max(-12, Math.min(12, (pointer.y - h / 2) * 0.05))] : [0, 0]
      const want: [number, number] = [cur[0] + (pointer.scroll - 0.5) * 44, cur[1] + (pointer.scroll - 0.5) * 18]
      lean = [lean[0] + (want[0] - lean[0]) * Math.min(1, 5 * dt), lean[1] + (want[1] - lean[1]) * Math.min(1, 5 * dt)]
      // the ghosts arrive far to near, then drift back once the first page is lit
      const back = e >= 0.8 ? 0.045 * easeOut(span(0.8, 1, e)) : 0
      const n = ghosts.length / vps.length
      ghosts.forEach((g, idx) => {
        const k = (idx % n) + 1
        const arrive = clamp01(span(0.03 * (n - k), 0.03 * (n - k) + 0.08, e))
        const a = g.a * (0.35 + 0.65 * easeOut(arrive)) * (1 - 0.3 * back / 0.045)
        const vp = vps[Math.floor(idx / n)]
        const s = g.s * (1 - back)
        const gx = vp[0] + lean[0] * (1 - g.s) + (x - vp[0]) * s
        const gy = vp[1] + lean[1] * (1 - g.s) + (y - vp[1]) * s
        const gw = pw * s, gh = ph * s
        let lift = 0
        if (pointer.inside) {
          const d = Math.hypot(pointer.x - (gx + gw / 2), pointer.y - (gy + gh / 2))
          if (d < 160) lift = 0.12 * (1 - d / 160)
        }
        const rect = P.rect(gx, gy, gw, gh)
        ctx.lineWidth = 1.5 + 1.5 * g.s
        ctx.strokeStyle = rgba(WHITE, (a + lift) * 0.2)
        ctx.stroke(rect)
        ctx.lineWidth = 0.8
        ctx.strokeStyle = rgba(WHITE, a + lift)
        ctx.stroke(rect)
        // the travelling glint: a cold highlight slides down each sheet's near edge, near to far
        if (e >= 1) {
          const ph65 = ((t - 3.6) % 6.5) - 0.28 * (k - 1)
          if (ph65 > 0 && ph65 < 0.5) {
            const gy2 = gy + gh * (ph65 / 0.5)
            const nx = vp[0] > w / 2 ? gx : gx + gw
            ctx.strokeStyle = rgba(WHITE, 0.22 * (1 - k / 12))
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(nx, gy2 - 18)
            ctx.lineTo(nx, gy2 + 18)
            ctx.stroke()
          }
        }
      })
      // page one's sleeve, there before any light
      const sleeveA = 0.16 * 0.35 + (0.22 - 0.16 * 0.35) * easeOut(span(0.26, 0.36, e)) - 0.06 * span(0.8, 1, e)
      pen.glass(edge, Math.max(0.1, sleeveA), 8)
      // the electrode warms at the top-left corner
      if (e >= 0.36 && e < 0.86) {
        const r = e < 0.78 ? 2 + 3 * span(0.36, 0.4, e) : 9 * (1 - span(0.78, 0.86, e))
        pen.fill(P.circle(x, y, r), WHITE, 1)
        if (e >= 0.78) wash(pen, NB, x, y, 26, 26, 0.8 * (1 - span(0.78, 0.86, e)))
      }
      // the front runs clockwise round the outline; the join closes at e = 0.78 and the page takes
      const run = span(0.4, 0.78, e)
      const u = run < 0.08 ? run * run / 0.08 : run
      let on = 0
      let near = 0
      if (pointer.inside) {
        const d = Math.hypot(Math.max(0, Math.abs(pointer.x - (x + pw / 2)) - pw / 2), Math.max(0, Math.abs(pointer.y - (y + ph / 2)) - ph / 2))
        if (d < 160) near = 1 - d / 160
      }
      if (e >= 0.4 && e < 0.78) {
        neonTo(pen, edge, per, NB, 0.85, 2.4, u, Math.max(0, u - 70 / per))
        const s = u * per
        let hx = x, hy = y
        if (s < pw) hx = x + s
        else if (s < pw + ph) (hx = x + pw), (hy = y + (s - pw))
        else if (s < 2 * pw + ph) (hx = x + pw - (s - pw - ph)), (hy = y + ph)
        else (hx = x), (hy = y + ph - (s - 2 * pw - ph))
        pen.fill(P.circle(hx, hy, 3.4), WHITE, 1)
      }
      if (e >= 0.78) {
        const age = (e - 0.78) * 2.6
        on = age < 0.42 ? strike(age, 3) : 1
        on *= breath(t, 4.8, 0.07)
        // one edge hiccups every 7 to 11 s
        const k9 = Math.floor(t / 9.3)
        const hic = e >= 1 && hash(k9) > 0.2 && t - 9.3 * k9 < 0.08 ? Math.floor(hash(k9 + 0.5) * 4) : -1
        const edges = [P.line(x, y, x + pw, y), P.line(x + pw, y, x + pw, y + ph), P.line(x + pw, y + ph, x, y + ph), P.line(x, y + ph, x, y)]
        edges.forEach((ed, i) => {
          glow.lineWidth = 2.4 * 2.6 * (1 + 0.6 * near)
          glow.strokeStyle = rgba(NB, on * (i === hic ? 0.72 : 1))
          glow.stroke(ed)
          pen.neon(ed, NB, on * (i === hic ? 0.72 : 1), 2.4)
        })
        pen.wash(P.rect(x, y, pw, ph), NB, (0.035 + 0.04 * near) * on)
        // the reflection on the floor, the spill under the copy, the dust
        if (!narrow) {
          for (const rx of [x, x + pw]) pen.streak(rx, framed ? y + ph + 0.1 * h : 0.97 * h, rx, y + ph, NB, 0.28 * on, 2)
        }
        wash(pen, NB, x, y + ph / 2, narrow ? 0.5 * w : 0.28 * w, narrow ? 0.5 * w : 0.28 * w, 0.1 * on)
        ctx.beginPath()
        for (const m of dust) {
          const [mx, my] = moteAt(m, t, box, 4)
          ctx.moveTo(mx + m.r, my)
          ctx.arc(mx, my, m.r, 0, TAU)
        }
        ctx.fillStyle = rgba(WHITE, 0.2 * on * span(0.78, 1, e))
        ctx.fill()
        for (const m of dust.slice(0, 4)) {
          const [mx, my] = moteAt(m, t, box, 4)
          glow.fillStyle = rgba(NB, 0.3 * on)
          glow.fillRect(mx - 1.5, my - 1.5, 3, 3)
        }
      }
      void W, void H
    },
  }
}
