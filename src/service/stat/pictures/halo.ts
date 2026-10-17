import { NA, P, WHITE, rgba, strike, type RGB } from '../../scenes/kit'
import type { Builder } from '../picture'
import { TAU, breath, drawMotes, glint, hash, hot, motes, wash, type Mote } from './lib'

/*
 * 88%: THE HALO (../PICTURES.md). A ring of a hundred glass beads threaded on
 * a glass wire, hovering tilted in the dark right of centre, seen from a
 * little above and in perspective: the near beads larger, the far ones
 * small, its reflection in the dark glass floor beneath it. `share` of the
 * beads light green as the count runs, the gas running round the wire
 * behind a white-hot head and each bead flaring as the head passes it; the
 * twelve at the end of the round stay dark glass. The lit beads are the
 * number. Afterwards the ring turns, slowly on its own, faster under the
 * hand (a sideways flick of the cursor spins it; the scroll turns it on a
 * phone), and a comet of light runs the lit stretch every few seconds.
 * Nothing lit ever changes.
 */
const TILT = 1.0
const clampA = (x: number) => (x < -1 ? -1 : x > 1 ? 1 : x)

export const halo: Builder<{ kind: 'halo'; share: number; of: number }> = o => {
  let cx = 0, cy = 0, R = 0, rb = 0, yF = 0, F = 0
  let narrow = false
  let tilt = 0, userSpin = 0, spinV = 0, near = 0, lastPx = NaN
  let dust: Mote[] = []
  let box: [number, number, number, number] = [0, 0, 0, 0]
  const n = o.of
  const X = new Float32Array(n)
  const Y = new Float32Array(n)
  const S = new Float32Array(n)
  const Z = new Float32Array(n)
  const order = Array.from({ length: n }, (_, i) => i)

  /** a disc on a layer, no path allocated */
  const disc = (c: CanvasRenderingContext2D, x: number, y: number, r: number, style: string) => {
    c.fillStyle = style
    c.beginPath()
    c.arc(x, y, r, 0, TAU)
    c.fill()
  }

  return {
    lead: [0, 0],
    dur: 2800,
    init(w, h, env) {
      narrow = env.narrow
      if (env.mode === 'wide') {
        cx = env.copyX + 0.52 * (w - env.copyX)
        R = Math.min(0.42 * h, 0.32 * (w - env.copyX))
      } else {
        cx = 0.5 * w
        R = narrow ? Math.min(0.4 * h, 0.42 * w) : Math.min(0.42 * h, 0.3 * w)
      }
      cy = 0.44 * h
      rb = Math.max(narrow ? 1.6 : 2, R * 0.02)
      F = 3.2 * R
      // the floor: just under the ring's near edge
      yF = cy + 0.74 * R + 0.04 * h
      tilt = userSpin = spinV = near = 0
      lastPx = NaN
      box = [cx - 1.5 * R, cy - 0.9 * R, cx + 1.5 * R, yF]
      dust = narrow ? [] : motes(18, 3, box, [-3, 3], [-10, -3])
    },
    frame(pen, w, h, p, e, t, pointer, dt) {
      const { ctx, glow } = pen
      const k = Math.floor(p * o.share + 1e-6)
      const litShare = k / o.share
      void h

      // ---- the pose: a slow turn of its own; the hand's sideways flick spins it and its height
      // tilts it (laptop); the scroll turns and tilts it (phone)
      let wantTilt = 0
      if (pointer.inside && !pointer.coarse) wantTilt = clampA((pointer.y - cy) / (1.5 * R)) * 0.25
      if (pointer.coarse) wantTilt = clampA(pointer.scrollV) * 0.2
      tilt += (wantTilt - tilt) * Math.min(1, 4 * dt)
      if (pointer.inside && !pointer.coarse) {
        if (!Number.isNaN(lastPx)) spinV += ((pointer.x - lastPx) / R) * 0.9
        lastPx = pointer.x
      } else lastPx = NaN
      spinV *= Math.exp(-dt * 1.6)
      userSpin += spinV * dt
      const phi = 0.07 * t + userSpin + (pointer.coarse ? (pointer.scroll - 0.5) * 2.2 : 0)
      const th = TILT + tilt
      const ct = Math.cos(th)
      const st = Math.sin(th)
      /** a point of the ring at angle a, in perspective: x, y, scale */
      const proj = (a: number): [number, number, number] => {
        const ux = Math.cos(a)
        const uy = Math.sin(a)
        const s = F / (F - uy * st * R)
        return [cx + R * ux * s, cy + R * uy * ct * s, s]
      }
      const angle = (i: number) => -Math.PI / 2 + (TAU * i) / n + phi
      for (let i = 0; i < n; i++) {
        const a = angle(i)
        const [x, y, s] = proj(a)
        X[i] = x
        Y[i] = y
        S[i] = s
        Z[i] = Math.sin(a)
      }
      order.sort((a, b) => Z[a] - Z[b])
      const want = pointer.inside && !pointer.coarse ? 1 : 0
      near += (want - near) * Math.min(1, 5 * dt)

      // ---- the floor: a hairline of glass, the ring's light pooled on it
      const fg = ctx.createLinearGradient(0, 0, w, 0)
      fg.addColorStop(0, rgba(WHITE, 0))
      fg.addColorStop(narrow ? 0.05 : 0.3, rgba(WHITE, 0.08))
      fg.addColorStop(1, rgba(WHITE, 0.08))
      ctx.strokeStyle = fg
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, yF)
      ctx.lineTo(w, yF)
      ctx.stroke()
      wash(pen, NA, cx, yF, 1.2 * R, 0.12 * R, 0.16 * litShare * breath(t, 4.1, 0.1))

      // ---- the wire: dark glass all round, the lit stretch running through it to the front
      const front = p * o.share
      const wire = new Path2D()
      wire.moveTo(X[0], Y[0])
      for (let i = 1; i < n; i++) wire.lineTo(X[i], Y[i])
      wire.closePath()
      pen.glass(wire, 0.14, 2)
      const sub = (from: number, to: number) => {
        const q = new Path2D()
        const i0 = Math.max(0, Math.ceil(from))
        const [fx, fy] = proj(angle(from))
        q.moveTo(fx, fy)
        for (let i = i0; i <= Math.floor(to); i++) q.lineTo(X[i], Y[i])
        const [tx, ty] = proj(angle(to))
        q.lineTo(tx, ty)
        return q
      }
      if (front > 0.02) pen.neon(sub(0, Math.min(front, n - 1)), NA, 0.3 * breath(t, 4.7, 0.08), 1.2)

      // ---- the comet: after the strike, a head of light runs the lit stretch every seven seconds
      let cometAt = -1
      let cometEnd = 0
      if (e >= 1 && k > 0) {
        const ph = ((t - 3.05) % 7) / 7
        if (ph < 0.78) cometAt = (ph / 0.78) * k
        else if (ph < 0.86) cometEnd = 1 - (ph - 0.78) / 0.08
      }
      const flickSlot = Math.floor(t / 2.1)
      const flick = e >= 1 && k > 0 ? Math.floor(hash(flickSlot + 0.9) * k) : -1

      // ---- the beads, far side first, each with its reflection in the floor
      const bead = (i: number, x: number, y: number, s: number, on: number, q: number, mirror: number) => {
        const br = rb * s * (1 + 0.3 * q)
        disc(glow, x, y, br * 1.1, rgba(NA, on * mirror))
        disc(ctx, x, y, br, rgba(NA, Math.min(1, on * 0.85) * mirror))
        if (mirror === 1) disc(ctx, x, y, br * 0.5, rgba(hot(NA), Math.min(1, on)))
      }
      let hx = 0, hy = 0, hs = 1, head = 0
      for (const i of order) {
        const x = X[i], y = Y[i], s = S[i]
        let q = 0
        if (near > 0.01 && pointer.inside) {
          const d = Math.hypot(pointer.x - x, pointer.y - y)
          if (d < 160) q = (1 - d / 160) * near
        }
        const u = front - i
        if (u <= 0) {
          // dark glass: a bead's rim, a cold glint under the hand; its ghost in the floor
          pen.glass(P.circle(x, y, rb * s), 0.16 + 0.2 * q, 2)
          continue
        }
        let on: number
        if (u < 1) {
          on = 0.9 * u
          hx = x
          hy = y
          hs = s
          head = 1
        } else {
          const age = (u - 1) * 0.5 + (e >= 1 ? Math.max(0, t - 3.05) : 0)
          on = age < 0.42 ? 0.35 + 0.65 * strike(age, i) : 1
          on += 0.9 * Math.exp(-age / 0.12)
          on *= breath(t, 3 + 2 * hash(i + 0.4), 0.06, hash(i + 0.5) * TAU)
          if (cometAt >= 0) {
            const d = cometAt - i
            if (d >= 0 && d < 9) on += 0.7 * (1 - d / 9) * (1 - d / 9)
          }
          if (cometEnd > 0 && i === k - 1) on += 1.2 * cometEnd
          if (i === flick && t - flickSlot * 2.1 < 0.06) on *= 0.5
        }
        on = Math.min(1.5, on * (1 + 0.4 * q))
        // the reflection: fading with the bead's height over the floor
        const lift = (yF - y) / (0.6 * R)
        if (lift < 1) bead(i, x, 2 * yF - y, s, on, q, 0.32 * (1 - lift))
        bead(i, x, y, s, on, q, 1)
      }
      // the white-hot head running the wire while the count runs, a streak of gas behind it
      if (head && e < 1) {
        pen.neon(sub(Math.max(0, front - 6), front), NA, 0.9, 1.8)
        disc(glow, hx, hy, rb * hs * 2.2, rgba(NA, 1))
        disc(ctx, hx, hy, rb * hs * 1.5, rgba(WHITE, 1))
      }
      // the comet's head, the wire hot behind it
      if (cometAt > 0) {
        const [x, y, s] = proj(angle(cometAt))
        pen.neon(sub(Math.max(0, cometAt - 9), cometAt), NA, 0.7, 1.6)
        disc(glow, x, y, rb * s * 2, rgba(NA, 1))
        disc(ctx, x, y, rb * s * 1.4, rgba(WHITE, 1))
        const lift = (yF - y) / (0.6 * R)
        if (lift < 1) disc(glow, x, 2 * yF - y, rb * s * 2, rgba(NA, 0.4 * (1 - lift)))
      }

      // ---- the room's light, the dust in it, a cold glint round the wire
      wash(pen, NA, cx + tilt * 20, cy, 1.5 * R, 1.1 * R, 0.06 * litShare * breath(t, 5.3, 0.08))
      if (!narrow) {
        drawMotes(pen, dust, t, box, litShare)
        const ga = ((t * 0.11) % 1) * TAU
        const [gx, gy] = proj(ga)
        const [nx, ny] = proj(ga + 0.05)
        const dx = nx - gx, dy = ny - gy
        const L = Math.hypot(dx, dy) || 1
        glint(pen, gx - (dx / L) * 14, gy - (dy / L) * 14, gx + (dx / L) * 14, gy + (dy / L) * 14, 0.22, 1.2)
      }
      void (WHITE as RGB)
    },
  }
}
