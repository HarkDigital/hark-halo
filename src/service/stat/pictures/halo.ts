import { NA, P, WHITE, rgba, strike } from '../../scenes/kit'
import type { Builder } from '../picture'
import { TAU, breath, clamp01, drawMotes, glint, hash, hot, motes, wash, type Mote } from './lib'

/*
 * 88%: THE HALO (../PICTURES.md). A ring of a hundred glass beads threaded on
 * a glass wire, standing right of centre, `share` of them lit green clockwise
 * from the top: the gas runs round the wire behind a white-hot head as the
 * count runs, and each bead strikes on as the head passes it. The lit beads
 * are the number; the twelve at the end of the round stay dark glass. The
 * ring leans toward the hand and turns with the scroll; nothing lit ever
 * changes.
 */
export const halo: Builder<{ kind: 'halo'; share: number; of: number }> = o => {
  let cx = 0, cy = 0, R = 0, rb = 0
  let narrow = false
  let tiltX = 0, tiltY = 0, spin = 0, near = 0
  let dust: Mote[] = []
  let box: [number, number, number, number] = [0, 0, 0, 0]
  const clampA = (x: number) => (x < -1 ? -1 : x > 1 ? 1 : x)

  return {
    lead: [0, 0],
    dur: 2800,
    init(w, h, env) {
      narrow = env.narrow
      if (env.mode === 'wide') {
        cx = env.copyX + 0.52 * (w - env.copyX)
        cy = 0.5 * h
        R = Math.min(0.36 * h, 0.3 * (w - env.copyX))
      } else {
        cx = 0.5 * w
        cy = 0.5 * h
        R = narrow ? Math.min(0.36 * h, 0.4 * w) : Math.min(0.36 * h, 0.3 * w)
      }
      rb = Math.max(narrow ? 1.6 : 2, R * 0.019)
      tiltX = tiltY = spin = near = 0
      box = [cx - 1.4 * R, cy - 1.4 * R, cx + 1.4 * R, cy + 1.4 * R]
      dust = narrow ? [] : motes(16, 3, box, [-3, 3], [-9, -3])
    },
    frame(pen, w, h, p, e, t, pointer, dt) {
      const { ctx } = pen
      const n = o.of
      const k = Math.floor(p * o.share + 1e-6)
      void w, void h

      // ---- the pose: a lean toward the hand on a laptop; a turn with the scroll on a phone
      let wantX = 0
      let wantY = 0
      if (pointer.inside && !pointer.coarse) {
        wantX = clampA((pointer.x - cx) / (1.5 * R))
        wantY = clampA((pointer.y - cy) / (1.5 * R))
      }
      if (pointer.coarse) wantY = clampA(pointer.scrollV) * 0.8
      tiltX += (wantX - tiltX) * Math.min(1, 4 * dt)
      tiltY += (wantY - tiltY) * Math.min(1, 4 * dt)
      const wantSpin = pointer.coarse ? (pointer.scroll - 0.5) * 0.9 : 0
      spin += (wantSpin - spin) * Math.min(1, 6 * dt)
      const thX = tiltX * 0.5
      const thY = tiltY * 0.45
      const rx = R * Math.cos(thX)
      const ry = R * Math.cos(thY)
      const at = (i: number) => {
        const a = -Math.PI / 2 + (TAU * i) / n + spin
        const ux = Math.cos(a)
        const uy = Math.sin(a)
        return [cx + rx * ux, cy + ry * uy, ux * Math.sin(thX) + uy * Math.sin(thY)] as const
      }
      const a0 = -Math.PI / 2 + spin
      const front = (p * o.share) / n

      // ---- the wire: dark glass all round, the lit stretch running through it to the front
      const wire = new Path2D()
      wire.ellipse(cx, cy, rx, ry, 0, 0, TAU)
      pen.glass(wire, 0.14, 2)
      if (front > 0) {
        const lit = new Path2D()
        lit.ellipse(cx, cy, rx, ry, 0, a0, a0 + TAU * front)
        pen.neon(lit, NA, 0.32 * breath(t, 4.7, 0.08), 1.2)
      }

      // ---- the beads, far side first
      const want = pointer.inside && !pointer.coarse ? 1 : 0
      near += (want - near) * Math.min(1, 5 * dt)
      const flickSlot = Math.floor(t / 2.1)
      const flick = e >= 1 && k > 0 ? Math.floor(hash(flickSlot + 0.9) * k) : -1
      const shimmer = ((t * 0.09) % 1) * TAU
      let hx = 0, hy = 0, head = 0
      for (const pass of [0, 1]) {
        for (let i = 0; i < n; i++) {
          const [x, y, z] = at(i)
          if ((z >= 0 ? 1 : 0) !== pass) continue
          const s = 1 + 0.25 * z
          let q = 0
          if (near > 0.01 && pointer.inside) {
            const d = Math.hypot(pointer.x - x, pointer.y - y)
            if (d < 160) q = (1 - d / 160) * near
          }
          const u = p * o.share - i
          if (u <= 0) {
            // dark glass: a bead's rim, a cold glint under the hand
            pen.glass(P.circle(x, y, rb * s), 0.16 + 0.2 * q, 2)
            continue
          }
          let on: number
          if (u < 1) {
            on = 0.9 * u
            hx = x
            hy = y
            head = 1
          } else {
            const age = (u - 1) * 0.5 + (e >= 1 ? Math.max(0, t - 3.05) : 0)
            on = age < 0.42 ? 0.35 + 0.65 * strike(age, i) : 1
            on *= breath(t, 3 + 2 * hash(i + 0.4), 0.06, hash(i + 0.5) * TAU)
            // a shimmer circling the ring, a bead at a time
            const da = Math.abs((((TAU * i) / n - shimmer + Math.PI) % TAU) - Math.PI)
            on += 0.3 * Math.max(0, 1 - da / 0.35)
            if (i === flick && t - flickSlot * 2.1 < 0.06) on *= 0.5
          }
          on = Math.min(1.3, on * (1 + 0.4 * q))
          // a bead of gas: its bloom, the coloured bead, a white-hot core (a tube seen end on)
          const br = rb * s * (1 + 0.3 * q)
          const bead = P.circle(x, y, br)
          pen.glow.fillStyle = rgba(NA, on)
          pen.glow.fill(bead)
          ctx.fillStyle = rgba(NA, Math.min(1, on * 0.85))
          ctx.fill(bead)
          ctx.fillStyle = rgba(hot(NA), Math.min(1, on))
          ctx.fill(P.circle(x, y, br * 0.5))
        }
      }
      // the white-hot head running the wire while the count runs
      if (head && e < 1) {
        pen.fill(P.circle(hx, hy, rb * 1.5), WHITE, 1)
        const [bx, by] = at(Math.max(0, p * o.share - 2.5))
        pen.streak(bx, by, hx, hy, NA, 0.8, rb * 0.9)
      }

      // ---- the room's light, the dust in it, a cold glint round the wire
      const lit = k / o.share
      wash(pen, NA, cx + tiltX * 20, cy + tiltY * 12, 1.6 * R, 1.3 * R, 0.07 * lit * breath(t, 5.3, 0.08))
      if (!narrow) {
        drawMotes(pen, dust, t, box, lit)
        const ga = a0 + ((t * 0.11) % 1) * TAU
        const gx = cx + rx * Math.cos(ga)
        const gy = cy + ry * Math.sin(ga)
        glint(pen, gx + 14 * Math.sin(ga), gy - 14 * Math.cos(ga), gx - 14 * Math.sin(ga), gy + 14 * Math.cos(ga), 0.22, 1.2)
      }
      void clamp01
    },
  }
}
