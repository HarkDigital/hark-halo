import { NA, NC, P, WHITE, rgba, strike } from '../../scenes/kit'
import type { Builder } from '../picture'
import { TAU, breath, clamp01, easeOut, hash, span, wash } from './lib'

/*
 * Part 107: THE AIRCRAFT (../PICTURES.md). A quadcopter in glass and neon,
 * licensed, right of centre: a glass body and arms, four rotors that spin up
 * into lit rings, a port light (purple) and a starboard light (green), a
 * camera under it, its shadow on the floor. It stands on the floor, its
 * lights come on, the rotors spin up, and it lifts off: "Part 107" strikes at
 * lift-off. Then it hovers, drifts, and follows the hand: toward the pointer
 * on a laptop, banking into the motion; climbing with the scroll on a phone.
 * No altitude, no map, no path: an aircraft, close.
 */
export const drone: Builder<{ kind: 'drone' }> = () => {
  let S = 100, yF = 0
  let rest: [number, number] = [0, 0], hover: [number, number] = [0, 0]
  let minX = 0, maxX = 1, minY = 0, maxY = 1
  let narrow = false, framed = false, wide = false
  // where it is and how it moves (the follow is the one piece of state: the hand's, like the hero's boost)
  let pos: [number, number] = [0, 0], vel: [number, number] = [0, 0]
  let roll = 0, pitch = 0
  let W = 1, H = 1
  // rotor pods, in the aircraft's own frame (x right, y down; the rear pair higher and smaller)
  const PODS: [number, number, number, number][] = [
    [-0.5, -0.16, 0.86, 1], // rear left (port)
    [0.5, -0.16, 0.86, 0], // rear right (starboard)
    [-0.5, 0.12, 1, 1], // front left (port)
    [0.5, 0.12, 1, 0], // front right (starboard)
  ]

  return {
    lead: [0, 0],
    dur: 3200,
    key: (_p, e) => e >= 0.6,
    init(w, h, env) {
      W = w
      H = h
      wide = env.mode === 'wide'
      narrow = env.narrow
      framed = env.framed
      yF = narrow ? 0.84 * h : framed ? 0.82 * h : 0.8 * h
      S = narrow ? 0.38 * w : framed ? 0.34 * h : Math.min(0.36 * h, 0.2 * (w - env.copyX))
      const cx = wide ? env.copyX + 0.55 * (w - env.copyX) : 0.5 * w
      rest = [cx, yF - 0.03 * h]
      hover = [cx, yF - (narrow ? 0.26 : 0.3) * h]
      minX = wide ? env.copyX + 0.1 * w + 0.6 * S : 0.6 * S
      maxX = w - 0.6 * S
      minY = 0.15 * h
      maxY = yF - 0.1 * h
      pos = [...rest]
      vel = [0, 0]
      roll = 0
      pitch = 0
    },
    frame(pen, w, h, _p, e, t, pointer, dt) {
      const { ctx, glow } = pen
      // the floor
      const fg = ctx.createLinearGradient(0, 0, w, 0)
      fg.addColorStop(0, rgba(WHITE, 0))
      fg.addColorStop(0.3, rgba(WHITE, 0.1))
      fg.addColorStop(1, rgba(WHITE, 0.1))
      ctx.strokeStyle = fg
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, yF)
      ctx.lineTo(w, yF)
      ctx.stroke()
      // the flight: on the floor until lift-off, then up to the hover point, then wherever the hand asks
      const lift = e < 0.6 ? 0 : easeOut(span(0.6, 1, e))
      const base: [number, number] = [rest[0], rest[1] + (hover[1] - rest[1]) * lift]
      let target: [number, number] = base
      if (e >= 1) {
        if (pointer.inside && !pointer.coarse) {
          target = [Math.max(minX, Math.min(maxX, pointer.x)), Math.max(minY, Math.min(maxY, pointer.y))]
        } else {
          // a phone: the altitude follows the scroll
          const climb = pointer.coarse ? 0.1 * h + 0.3 * h * clamp01((pointer.scroll - 0.25) / 0.5) - (yF - hover[1]) : 0
          target = [hover[0], hover[1] - climb]
        }
        // the drift and the bob, always
        target = [target[0] + 10 * Math.sin((TAU * t) / 7), target[1] + 4 * Math.sin((TAU * t) / 2.3)]
      }
      if (e < 1) {
        pos = [base[0], base[1]]
        vel = [0, 0]
      } else {
        // (a frame drawn straight at rest, the dev seek: start from the hover point, not the floor)
        if (pos[0] === rest[0] && pos[1] === rest[1]) pos = [base[0], base[1]]
        const k = Math.min(1, 2.2 * dt)
        const nx = pos[0] + (target[0] - pos[0]) * k, ny = pos[1] + (target[1] - pos[1]) * k
        vel = [(nx - pos[0]) / Math.max(1e-3, dt), (ny - pos[1]) / Math.max(1e-3, dt)]
        pos = [nx, ny]
      }
      const wantRoll = Math.max(-0.21, Math.min(0.21, vel[0] * 0.0012 + (pointer.coarse ? pointer.scrollV * 0.14 : 0)))
      const wantPitch = Math.max(-0.12, Math.min(0.12, vel[1] * 0.0006 + (e >= 0.6 && e < 1 ? 0.09 * (1 - lift) : 0)))
      roll += (wantRoll - roll) * Math.min(1, 4 * dt)
      pitch += (wantPitch - pitch) * Math.min(1, 4 * dt)
      const [cx, cy] = pos
      const height = yF - cy
      // the shadow on the floor: smaller and fainter the higher it flies
      const kSh = 1 - 0.6 * clamp01(height / (0.3 * h))
      wash(pen, NA, cx, yF, 0.5 * S * kSh + 0.2 * S, 0.08 * S * kSh + 0.03 * S, 0.14 * kSh * (e > 0.2 ? 1 : 0.5))
      // the downwash: faint rings expanding on the floor while the rotors run
      const spin = e < 0.2 ? 0 : e < 0.6 ? Math.pow(span(0.2, 0.6, e), 2) : 1
      if (spin > 0.3) {
        const c4 = (t % 0.4) / 0.4
        const rr = new Path2D()
        rr.ellipse(cx, yF, (0.3 + 0.5 * c4) * S * kSh, (0.05 + 0.08 * c4) * S * kSh, 0, 0, TAU)
        pen.glass(rr, 0.12 * (1 - c4) * spin, 2)
      }
      // the aircraft, in its own frame, rolled and pitched
      for (const c of [ctx, glow]) {
        c.save()
        c.translate(cx, cy)
        c.rotate(roll)
        c.scale(1, 1 - 0.2 * Math.abs(pitch))
      }
      const wt = narrow ? 2 : 3
      // the legs (on the floor until lift-off: they just hang after)
      const leg = (sx: number) => P.line(sx * 0.16 * S, 0.04 * S, sx * 0.2 * S, 0.22 * S)
      pen.glass(leg(-1), 0.2, 2.5)
      pen.glass(leg(1), 0.2, 2.5)
      // the arms and the body
      for (const [ax, ay, sc] of PODS) pen.glass(P.line(0, 0, ax * S, ay * S), 0.16, wt * sc)
      const body = new Path2D()
      const bw = 0.22 * S, bh = 0.09 * S
      body.moveTo(-bw / 2, 0)
      body.lineTo(-bw / 4, -bh / 2)
      body.lineTo(bw / 4, -bh / 2)
      body.lineTo(bw / 2, 0)
      body.lineTo(bw / 4, bh / 2)
      body.lineTo(-bw / 4, bh / 2)
      body.closePath()
      ctx.fillStyle = rgba(WHITE, 0.03)
      ctx.fill(body)
      pen.glass(body, 0.22, 3)
      pen.glass(P.line(-bw / 4, -bh / 2, bw / 4, -bh / 2), 0.3, 1.5)
      // the camera under the body, its lens looking toward the hand
      const camY = 0.1 * S
      pen.glass(P.line(0, bh / 2, 0, camY - 0.03 * S), 0.2, 2)
      pen.glass(P.circle(0, camY, 0.045 * S), 0.2, 2)
      const lit = e >= 0.12
      if (lit) {
        const look = pointer.inside && !pointer.coarse ? Math.max(-1, Math.min(1, (pointer.x - cx) / (0.5 * w))) : Math.sin((TAU * t) / 9) * 0.5
        pen.fill(P.circle(look * 0.018 * S, camY + 0.006 * S, 0.016 * S), WHITE, 0.8 + 0.2 * Math.sin((TAU * t) / 3))
      }
      // the rotors: two blades each, spinning up into lit rings
      PODS.forEach(([ax, ay, sc, port], i) => {
        const px = ax * S, py = ay * S
        const rx = 0.26 * S * sc, ry = 0.09 * S * sc
        const ring = new Path2D()
        ring.ellipse(px, py, rx, ry, 0, 0, TAU)
        pen.glass(ring, 0.14, 2.5)
        const omega = 60 * spin
        const blur = clamp01((omega - 20) / 30)
        if (omega > 0) {
          const dir = i % 2 === 0 ? 1 : -1
          const a = dir * (omega * t + i * 0.8)
          for (const off of [0, Math.PI]) {
            const bx = Math.cos(a + off) * rx * 0.92, by = Math.sin(a + off) * ry * 0.92
            pen.neon(P.line(px, py, px + bx, py + by), NA, 0.9 * (1 - 0.7 * blur), 1.6)
          }
          if (blur > 0) {
            pen.neon(ring, NA, 0.6 * blur * breath(t, 1.1, 0.1, i), 1.4)
            const disc = new Path2D()
            disc.ellipse(px, py, rx, ry, 0, 0, TAU)
            pen.wash(disc, NA, 0.08 * blur)
          }
        }
        pen.fill(P.circle(px, py, 0.02 * S), WHITE, lit ? 0.6 : 0.2)
        // the navigation light: port purple, starboard green; two blinks when they come on, then a slow pulse
        if (lit) {
          const age = (e - 0.12) * 3.2
          const blink = age < 0.6 ? (age % 0.3 < 0.15 ? 1 : 0.15) : 1
          const on = blink * (0.75 + 0.25 * Math.sin((TAU * t) / 2.6 + port * Math.PI))
          pen.fill(P.circle(px + (port ? -1 : 1) * 0.04 * S, py + 0.03 * S, 0.024 * S), port ? NC : NA, on)
        }
      })
      // the tail strobe: a white flash every 1.2 s
      if (lit && (t % 1.2) < 0.06) pen.fill(P.circle(0, -0.07 * S, 0.02 * S), WHITE, 1)
      for (const c of [ctx, glow]) c.restore()
      // lift-off: the hub bead flares and "Part 107" strikes with it
      if (e >= 0.6 && e < 0.72) pen.fill(P.circle(cx, cy, 0.03 * S * (1 + 2 * (1 - span(0.6, 0.72, e)))), WHITE, strike((e - 0.6) * 3.2, 7))
      // the room's light from the aircraft and the dust in its downwash
      wash(pen, NA, cx, cy, narrow ? 0.5 * w : 0.35 * w, narrow ? 0.5 * w : 0.35 * w, 0.045 * spin * breath(t, 5, 0.06))
      if (!narrow && spin > 0.5) {
        ctx.beginPath()
        for (let m = 0; m < 12; m++) {
          const ph = hash(m + 0.21) * TAU
          const r = (0.3 + 0.9 * ((t * (0.25 + 0.2 * hash(m + 0.5)) + hash(m)) % 1)) * S
          const x = cx + r * Math.cos(ph + 0.2 * t), y = yF - 2 - 6 * hash(m + 0.8) - 3 * Math.sin(2 * t + m)
          ctx.moveTo(x + 0.8, y)
          ctx.arc(x, y, 0.8, 0, TAU)
        }
        ctx.fillStyle = rgba(WHITE, 0.14 * kSh)
        ctx.fill()
      }
      void W, void H, void glow
    },
  }
}
