import { NA, NC, P, WHITE, rgba, strike } from '../../scenes/kit'
import type { Builder } from '../picture'
import { TAU, breath, clamp01, clock, hash, neonTo, span, wash } from './lib'

/*
 * Now: THE CLOCK SAYS NOW (../PICTURES.md). A clock with no rim and no
 * numerals standing right of centre in the dark, reading the viewer's own
 * time: twelve dim embers for hours, hour and minute hands in green tube
 * with white-hot cores, a thin purple second hand sweeping with a white-hot
 * tip, dust visible only where the dial lights it. The ticks strike round
 * from twelve, the hands strike in place at the real time, and "Now" strikes
 * at the second hand's first movement. The viewer's clock is the only live
 * data; the second hand does not exist before it moves (a stopped one would
 * lie). Dev: window.__statClock (lib.ts's clock) fixes the instant for
 * screenshots.
 */
export const now: Builder<{ kind: 'now' }> = () => {
  let cx = 0, cy = 0, R = 100
  let ticks: { path: Path2D; w: number; ember: number; x: number; y: number }[] = []
  let hour = new Path2D(), minute = new Path2D(), second = new Path2D()
  let hourL = 1, minuteL = 1
  let disc = new Path2D(), edgeArc = new Path2D()
  let wide = false, narrow = false, framed = false
  let dust: { x0: number; y0: number; s: number; a0: number; v: number; T: number; ph: number; bloom: boolean }[] = []
  let lean: [number, number] = [0, 0]
  let W = 1, H = 1

  return {
    lead: [0, 0],
    dur: 3000,
    live: true,
    key: (_p, e) => e >= 0.72,
    init(w, h, env) {
      W = w
      H = h
      wide = env.mode === 'wide'
      narrow = env.narrow
      framed = env.framed
      if (wide) {
        cx = (env.copyX + w) / 2
        cy = 0.5 * h
        R = Math.min(0.39 * h, 0.3 * (w - env.copyX))
      } else {
        cx = 0.5 * w
        cy = 0.5 * h
        R = narrow ? Math.min(0.4 * h, 0.32 * w) : Math.min(0.4 * h, 0.22 * w)
      }
      ticks = Array.from({ length: 12 }, (_, i) => {
        const th = -Math.PI / 2 + (i * TAU) / 12
        const quarter = i % 3 === 0
        const len = quarter ? Math.max(0.085 * R, 12) : Math.max(0.05 * R, 8)
        const path = P.line(cx + R * Math.cos(th), cy + R * Math.sin(th), cx + (R - len) * Math.cos(th), cy + (R - len) * Math.sin(th))
        return { path, w: narrow ? (quarter ? 2 : 1.6) : quarter ? 2.6 : 2, ember: quarter ? 0.42 : 0.3, x: cx + (R - len / 2) * Math.cos(th), y: cy + (R - len / 2) * Math.sin(th) }
      })
      hourL = 0.52 * R
      minuteL = 0.82 * R
      hour = P.line(0, 0, hourL, 0)
      minute = P.line(0, 0, minuteL, 0)
      second = P.line(-0.18 * R, 0, 0.9 * R, 0)
      disc = P.circle(cx, cy, R)
      edgeArc = P.arc(0, 0, R, (-20 * Math.PI) / 180, (20 * Math.PI) / 180)
      const count = narrow ? 0 : framed ? 24 : 40
      dust = Array.from({ length: count }, (_, j) => ({
        x0: Math.max(0, Math.min(w, cx - 1.9 * R + hash(j * 3 + 1) * 3.8 * R)),
        y0: hash(j * 3 + 2) * h,
        s: 1.6 + 1.2 * hash(j * 3 + 3),
        a0: 0.06 + 0.14 * hash(j * 7 + 1),
        v: 6 + 8 * hash(j * 7 + 2),
        T: 5 + 4 * hash(j * 7 + 3),
        ph: TAU * hash(j * 7 + 4),
        bloom: false,
      }))
      dust
        .map((d, i) => [d.a0, i] as const)
        .sort((a, b) => b[0] - a[0])
        .slice(0, 6)
        .forEach(([, i]) => (dust[i].bloom = true))
      lean = [0, 0]
    },
    frame(pen, w, h, _p, e, t, pointer, dt) {
      const { ctx, glow } = pen
      // the time, read once a frame: continuous angles
      const d = new Date(clock())
      const hh = d.getHours() % 12, mm = d.getMinutes(), ss = d.getSeconds(), f = d.getMilliseconds() / 1000
      const thH = -Math.PI / 2 + TAU * ((hh + mm / 60 + ss / 3600) / 12)
      const thM = -Math.PI / 2 + TAU * ((mm + ss / 60 + f / 60) / 60)
      const thS = -Math.PI / 2 + TAU * ((ss + f) / 60)
      const lit = e < 0.72 ? 0.6 * clamp01((e - 0.04) / 0.28) : 0.6 + 0.4 * clamp01((e - 0.72) / 0.28)
      // the cursor
      const dC = pointer.inside ? Math.hypot(pointer.x - cx, pointer.y - cy) : 1e9
      const want: [number, number] = pointer.inside && !narrow ? [(pointer.x - cx) * (28 / 420), (pointer.y - cy) * (28 / 420)] : [0, 0]
      const wl = Math.hypot(want[0], want[1])
      if (wl > 28) (want[0] *= 28 / wl), (want[1] *= 28 / wl)
      lean = [lean[0] + (want[0] - lean[0]) * Math.min(1, 8 * dt), lean[1] + (want[1] - lean[1]) * Math.min(1, 8 * dt)]
      // the room wash, cast by the dial, leaning toward the hand
      const rx = wide ? 1.9 * R : Math.min(narrow ? 1.4 * R : 1.5 * R, 0.48 * w), ry = wide ? 1.35 * R : Math.min(narrow ? 1.1 * R : 1.2 * R, 0.48 * h)
      wash(pen, NA, cx + lean[0], cy + lean[1], rx, ry, 0.07 * lit * breath(t, 5.2, 0.08, 2.4))
      // the twelve ticks: they strike clockwise from twelve and cool to embers
      const flickSlot = Math.floor(t * 30)
      const flick = e >= 1 && hash(flickSlot) < 1 / 210 ? Math.floor(hash(flickSlot + 0.5) * 12) : -1
      ticks.forEach((tk, i) => {
        let on = 0
        const s = 0.04 + i * 0.0217
        if (e >= s) {
          const a = (e - s) * 3
          on = a < 0.42 ? strike(a, i) : tk.ember + (1 - tk.ember) * Math.max(0, 1 - (a - 0.42) / 0.5)
          if (i === 0 && e >= 0.3) on = Math.max(on, strike((e - 0.3) * 3, 12) * (e < 0.44 ? 1 : 0) + (e >= 0.44 ? 0 : 0))
          if (e >= 1) on = tk.ember
        }
        on *= breath(t, 4.6, 0.06)
        if (i === flick) on *= 0.5
        if (pointer.inside) {
          const dd = Math.hypot(pointer.x - tk.x, pointer.y - tk.y)
          if (dd < 90) on += 0.25 * (1 - dd / 90)
        }
        pen.tube(tk.path, NA, Math.min(1, on), tk.w)
      })
      // the electrode at the top of twelve, during the strike only
      if (e > 0 && e < 0.33) {
        const r = e < 0.3 ? 4 * clamp01(e / 0.04) : 4 * (1 - clamp01((e - 0.3) / 0.03))
        if (r > 0.2) pen.fill(P.circle(cx, cy - R, r), NA, 1)
      }
      // the hands, drawn under a rotation on both layers so the bloom sits on the tube
      const hand = (path: Path2D, L: number, th: number, c: typeof NA, on: number, wt: number, front: number, core: number, sleeve: boolean) => {
        for (const k of [ctx, glow]) {
          k.save()
          k.translate(cx, cy)
          k.rotate(th)
        }
        if (sleeve) pen.glass(path, 0.16, wt * 3.4)
        if (on > 0) neonTo(pen, path, L, c, on, wt, front, core)
        for (const k of [ctx, glow]) k.restore()
      }
      const swell = (th: number, L: number) => {
        if (!pointer.inside || narrow) return 0
        // the pointer's distance to the hand's segment
        const ux = Math.cos(th), uy = Math.sin(th)
        const px = pointer.x - cx, py = pointer.y - cy
        const s = Math.max(-0.18 * L, Math.min(L, px * ux + py * uy))
        const dd = Math.hypot(px - s * ux, py - s * uy)
        return dd < 160 ? 1 - dd / 160 : 0
      }
      const hb = breath(t, 3.4, 0.05, 1.2)
      // the hour hand strikes in place at e 0.38
      {
        const q = swell(thH, hourL)
        const fr = clamp01((e - 0.38) / 0.0833)
        const core = clamp01((e - 0.38 - 0.011) / 0.0833)
        const on = e < 0.38 ? 0 : fr < 1 ? 0.95 : Math.min(1, 0.95 * (e >= 1 ? hb : strike((e - 0.38 - 0.0833) * 3 + 0.12, 20)) + 0.2 * q)
        hand(hour, hourL, thH, NA, on, (narrow ? 2.6 : 3.2) * (1 + 0.25 * q), fr, core, true)
        // the centre bead
        if (e < 0.38) pen.glass(P.circle(cx, cy, 4.5), 0.2, 1.5)
        else pen.fill(P.circle(cx, cy, narrow ? 2.4 : 3), NA, 0.9 * on)
      }
      // the minute hand at e 0.54
      {
        const q = swell(thM, minuteL)
        const fr = clamp01((e - 0.54) / 0.0833)
        const core = clamp01((e - 0.54 - 0.011) / 0.0833)
        const on = e < 0.54 ? 0 : fr < 1 ? 0.95 : Math.min(1, 0.95 * (e >= 1 ? hb : strike((e - 0.54 - 0.0833) * 3 + 0.12, 21)) + 0.2 * q)
        hand(minute, minuteL, thM, NA, on, (narrow ? 2 : 2.4) * (1 + 0.25 * q), fr, core, true)
      }
      // the second hand appears already sweeping at the key moment: bare neon, a white-hot tip, a short trail
      if (e >= 0.72) {
        const q = swell(thS, 0.9 * R)
        const on = Math.min(1, 0.9 * (e >= 0.86 ? breath(t, 3.1, 0.05, 1.3) : strike((e - 0.72) * 3, 22)) + 0.2 * q)
        const trail = clamp01((e - 0.72) / 0.13)
        for (const k of [ctx, glow]) {
          k.save()
          k.translate(cx, cy)
          k.rotate(thS)
        }
        pen.neon(second, NC, on, (narrow ? 1 : 1.2) * (1 + 0.25 * q))
        pen.fill(P.circle(0.9 * R, 0, narrow ? 2 : 2.4), NC, on)
        pen.fill(P.circle(-0.18 * R, 0, 1.8), NC, on * 0.8)
        const g = Math.max(0, 1 - f * 6)
        if (g > 0) pen.fill(P.circle(0.9 * R, 0, narrow ? 3.6 : 4.4), NC, on * 0.6 * g)
        if (!narrow) {
          const alphas = [0.3, 0.22, 0.14, 0.08, 0.03]
          for (let k = 1; k <= 5; k++) {
            const seg = P.arc(0, 0, 0.9 * R, (-k * Math.PI) / 180, (-(k - 1) * Math.PI) / 180)
            pen.neon(seg, NC, on * trail * alphas[k - 1], 1.2)
          }
        }
        for (const k of [ctx, glow]) k.restore()
      }
      // the glass the hand finds: a glint on the face, a cold arc on the invisible rim
      if (pointer.inside && !narrow) {
        if (dC < R) {
          ctx.save()
          ctx.clip(disc)
          const gg = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 110)
          gg.addColorStop(0, rgba(WHITE, 0.06 * Math.min(1, (R - dC) / 40)))
          gg.addColorStop(1, rgba(WHITE, 0))
          ctx.fillStyle = gg
          ctx.fillRect(pointer.x - 110, pointer.y - 110, 220, 220)
          ctx.restore()
        }
        const qe = Math.max(0, 1 - Math.abs(dC - R) / 160)
        if (qe > 0) {
          ctx.save()
          ctx.translate(cx, cy)
          ctx.rotate(Math.atan2(pointer.y - cy, pointer.x - cx))
          pen.glass(edgeArc, 0.2 * qe, 3)
          ctx.restore()
        }
      }
      // dust, lit only where the dial lights it
      for (const m of dust) {
        const y = ((((m.y0 - m.v * t) % (h + 16)) + h + 16) % (h + 16)) - 8
        const x = m.x0 + 8 * Math.sin((TAU * t) / m.T + m.ph)
        const dd = Math.hypot(x - cx, y - cy)
        const L = dd < R ? 1.6 : 1.6 * Math.max(0, 1 - (dd - R) / (0.9 * R))
        let a = m.a0 * L * lit
        let px = x, py = y
        if (pointer.inside) {
          const dp = Math.hypot(pointer.x - x, pointer.y - y)
          if (dp < 160) {
            const q = 1 - dp / 160
            a *= 2
            px += (pointer.x - x) * 0.04 * q
            py += (pointer.y - y) * 0.04 * q
          }
        }
        if (a <= 0.004) continue
        ctx.fillStyle = rgba(WHITE, Math.min(1, a))
        ctx.fillRect(px, py, m.s, m.s)
        if (m.bloom) {
          glow.fillStyle = rgba(WHITE, Math.min(1, a))
          glow.fillRect(px - 2, py - 2, 5, 5)
        }
      }
      void span, void W, void H
    },
  }
}
