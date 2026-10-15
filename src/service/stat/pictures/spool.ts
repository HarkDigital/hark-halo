import { NA, P, WHITE, rgba, strike } from '../../scenes/kit'
import type { Builder } from '../picture'
import { TAU, breath, clamp01, easeOut, glint, hash, span, wash } from './lib'

/*
 * Hours: THE SPOOL (../PICTURES.md). A glass reel right of centre, turning,
 * winding in a line of green light that runs in from under the copy: time
 * reeled back. Illustrative: it counts nothing, nothing is marked, the wound
 * coil grows without ever being a figure. "Hours" strikes as the line's head
 * meets the reel and the first turn wraps. The hand spins it faster; so does
 * the scroll.
 */
export const spool: Builder<{ kind: 'spool' }> = () => {
  let cx = 0, cy = 0, R = 100, hub = 20
  let yLine = 0, yFloor = 0
  let theta = 0, omega = 0, wound = 0
  let narrow = false, framed = false
  let W = 1, H = 1

  return {
    lead: [0, 0],
    dur: 3000,
    key: (_p, e) => e >= 0.6,
    init(w, h, env) {
      W = w
      H = h
      narrow = env.narrow
      framed = env.framed
      cx = env.mode === 'wide' ? env.copyX + 0.58 * (w - env.copyX) : narrow ? 0.56 * w : 0.5 * w
      cy = 0.5 * h
      R = narrow ? 0.28 * h : 0.3 * h
      hub = 0.07 * h
      yLine = cy + R * 0.92
      yFloor = cy + R + 0.06 * h
      theta = 0
      omega = 0
      wound = 0
    },
    frame(pen, w, h, _p, e, t, pointer, dt) {
      const { ctx, glow } = pen
      // the floor and the stand
      const fg = ctx.createLinearGradient(0, 0, w, 0)
      fg.addColorStop(0, rgba(WHITE, 0))
      fg.addColorStop(0.3, rgba(WHITE, 0.08))
      fg.addColorStop(1, rgba(WHITE, 0.08))
      ctx.strokeStyle = fg
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, yFloor)
      ctx.lineTo(w, yFloor)
      ctx.stroke()
      pen.glass(P.line(cx - 0.3 * R, yFloor, cx - 0.08 * R, cy), 0.14, 3)
      pen.glass(P.line(cx + 0.3 * R, yFloor, cx + 0.08 * R, cy), 0.14, 3)
      // the reel turns: once the line is on it, at its cruise, faster under the hand or the scroll (never backward)
      const near = pointer.inside && !pointer.coarse ? Math.max(0, 1 - Math.max(0, Math.hypot(pointer.x - cx, pointer.y - cy) - R) / 200) : 0
      const cruise = e < 0.6 ? 0 : 0.5 * easeOut(span(0.6, 0.8, e))
      const want = cruise * (1 + 2.2 * near) + (pointer.coarse ? 2.2 * clamp01(Math.abs(pointer.scrollV)) : 0) * (e >= 0.6 ? 1 : 0)
      omega += (want - omega) * Math.min(1, 3 * dt)
      theta += omega * dt
      // (the line arrives with slack: a turn and a half wraps at the key moment, then the reel winds on)
      wound = Math.max(wound + omega * R * dt, e >= 0.6 ? TAU * hub * 1.5 * easeOut(span(0.6, 0.9, e)) : 0)
      const lean = (pointer.scroll - 0.5) * 8
      // the far flange, the near flange, the spokes
      pen.glass(P.circle(cx + 10 + lean, cy - 10, R), 0.08, 3)
      const flange = P.circle(cx, cy, R)
      pen.glass(flange, 0.14, 3)
      const spokeOn = e >= 0.6 ? 0.3 * easeOut(span(0.6, 1, e)) : 0
      for (let i = 0; i < 5; i++) {
        const a = theta + (i * TAU) / 5
        const sp = P.line(cx + hub * Math.cos(a), cy + hub * Math.sin(a), cx + R * 0.96 * Math.cos(a), cy + R * 0.96 * Math.sin(a))
        pen.glass(sp, 0.12, 2.5)
        if (spokeOn > 0) pen.neon(sp, NA, spokeOn * breath(t, 4, 0.06, i), 1)
      }
      // the line of light: in from under the copy to the reel's underside, its head running in during the strike
      const xTan = cx
      const head = e < 0.6 ? Math.max(0, easeOut(span(0.1, 0.6, e))) : 1
      const xHead = -20 + (xTan + 20) * head
      const lineOn = 0.9 * breath(t, 5.1, 0.05)
      if (head > 0) {
        pen.neon(P.line(0, yLine, xHead, yLine), NA, lineOn * (e < 0.6 ? Math.max(0.35, strike(e * 3, 4)) : 1), 2.4)
        if (head < 1) pen.streak(Math.max(0, xHead - 60), yLine, xHead, yLine, NA, 1, 2.6)
        // the line moving: dim windows of extra brightness travelling toward the reel at the rim's speed
        if (e >= 0.6) {
          const speed = omega * R
          for (let k = 0; k < 3; k++) {
            const x = ((t * speed + k * (xTan / 3) + hash(k) * 50) % (xTan + 120)) - 120
            if (x > 0 && x < xTan) {
              glow.lineWidth = 2.4 * 2.6
              glow.strokeStyle = rgba(NA, 0.16)
              glow.beginPath()
              glow.moveTo(Math.max(0, x - 90), yLine)
              glow.lineTo(x, yLine)
              glow.stroke()
            }
          }
        }
        // the hand on the line: it runs hotter under the pointer
        if (pointer.inside && !pointer.coarse && Math.abs(pointer.y - yLine) < 60 && pointer.x < xTan) {
          const q = 1 - Math.abs(pointer.y - yLine) / 60
          pen.neon(P.line(Math.max(0, pointer.x - 60), yLine, Math.min(xTan, pointer.x + 60), yLine), NA, 0.5 * q, 3)
          pen.fill(P.circle(pointer.x, yLine, 2.6), WHITE, 0.7 * q)
        }
      }
      // where the line meets the reel: a white-hot bead; the hub flares at the key moment
      if (e >= 0.6) {
        const age = (e - 0.6) * 3
        pen.fill(P.circle(xTan, yLine, 2.6 + 3 * Math.max(0, 1 - age / 0.4)), WHITE, 1)
        const hubOn = age < 0.42 ? strike(age, 6) : 0.75 + 0.25 * Math.sin(theta * 4)
        pen.fill(P.circle(cx, cy, hub * 0.18), NA, hubOn)
        wash(pen, NA, cx, cy, hub * 1.4, hub * 1.4, 0.5 * hubOn * (1 + near))
      }
      pen.glass(P.circle(cx, cy, hub), 0.2, 2)
      // the wound coil: a spiral from the hub out to the wound radius, and the mass of it on the glow layer
      const rW = hub + 0.9 * (R - hub) * (1 - Math.exp(-wound / (4 * R)))
      if (e >= 0.6 && wound > 1) {
        const turnsMax = 40
        const spiral = new Path2D()
        const pitchR = (R - hub) / turnsMax
        const turns = Math.min(turnsMax, (rW - hub) / pitchR)
        const steps = Math.ceil(turns * 24)
        for (let i = 0; i <= steps; i++) {
          const a = (i / 24) * TAU + theta
          const r = hub + (i / 24) * pitchR
          const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a)
          if (i === 0) spiral.moveTo(x, y)
          else spiral.lineTo(x, y)
        }
        // the first turn draws in at the key moment
        const first = Math.min(1, (e - 0.6) * 3 / 0.9)
        if (first < 1) {
          const L = TAU * hub * 1.2
          ctx.setLineDash([L * first, L * 4])
          glow.setLineDash([L * first, L * 4])
        }
        pen.neon(spiral, NA, 0.7 * breath(t, 3.7, 0.06, 1), 1.6)
        ctx.setLineDash([])
        glow.setLineDash([])
        wash(pen, NA, cx, cy, rW * 1.1, rW * 1.1, (0.25 + 0.1 * near) * breath(t, 3.7, 0.06, 1))
      }
      // a cold glint across the near flange every 11 s
      if (e >= 1) {
        const c = ((t - 3.25) % 11) / 11
        if (c < 0.12) {
          const a = -2.2 + (c / 0.12) * 1.4
          ctx.lineWidth = 1.2
          ctx.strokeStyle = rgba(WHITE, 0.4 * Math.sin((c / 0.12) * Math.PI))
          ctx.stroke(P.arc(cx, cy, R, a - 0.2, a + 0.2))
        }
      }
      if (pointer.inside && !pointer.coarse && near > 0) {
        const d = Math.hypot(pointer.x - cx, pointer.y - cy)
        if (Math.abs(d - R) < 60) {
          const a = Math.atan2(pointer.y - cy, pointer.x - cx)
          ctx.lineWidth = 1.2
          ctx.strokeStyle = rgba(WHITE, 0.5 * (1 - Math.abs(d - R) / 60))
          ctx.stroke(P.arc(cx, cy, R, a - 0.18, a + 0.18))
        }
      }
      // the room's light, and dust in it
      const lit = e < 0.1 ? 0 : clamp01(head) * 0.5 + (e >= 0.6 ? 0.5 : 0)
      wash(pen, NA, cx - 0.2 * R, cy, narrow ? 0.6 * w : 0.42 * w, narrow ? 0.6 * w : 0.5 * h, 0.05 * lit * breath(t, 5.1, 0.05))
      if (!narrow && !framed && lit > 0.5) {
        ctx.beginPath()
        for (let m = 0; m < 10; m++) {
          const x = cx - 1.4 * R + ((hash(m + 0.11) * 2.8 * R + 7 * t * (0.6 + hash(m + 0.12))) % (2.8 * R))
          const y = cy - 1.2 * R + ((hash(m + 0.13) * 2.4 * R - 5 * t) % (2.4 * R) + 2.4 * R) % (2.4 * R)
          ctx.moveTo(x + 0.8, y)
          ctx.arc(x, y, 0.8, 0, TAU)
        }
        ctx.fillStyle = rgba(WHITE, 0.16)
        ctx.fill()
      }
      void glint, void W, void H, void h
    },
  }
}
