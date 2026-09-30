import { NA, NB, NC, P, WHITE, mix, rgba, type RGB, type Scene } from './kit'

interface Streak {
  a: number // angle
  r: number // 0..1 distance out from the gauge
  len: number
  speed: number
}

/** the score's colour: the third light when slow, the second midway, the lead when fast */
const tone = (v: number): RGB => (v < 0.6 ? mix(NC, NB, Math.max(0, v - 0.2) / 0.4) : mix(NB, NA, Math.min(1, (v - 0.6) / 0.3)))

/*
 * PAGE SPEED — a performance gauge (à la Lighthouse / PageSpeed) that sweeps
 * up to a fast score: a neon arc in a glass track, the score itself bent in
 * tube, and speed streaks flying outward faster as it climbs. The light
 * shifts colour with the score. Move the cursor left / right to rev it.
 */
export function velocity(): Scene {
  let value = 0.2
  let streaks: Streak[] = []

  return {
    init() {
      value = 0.2
      streaks = Array.from({ length: 64 }, () => ({
        a: Math.random() * Math.PI * 2,
        r: Math.random(),
        len: 0.05 + Math.random() * 0.1,
        speed: 0.3 + Math.random() * 1.1,
      }))
    },

    frame(pen, w, h, pointer, dt, t) {
      const cx = w * 0.52
      const cy = h * 0.5
      const R = Math.min(w, h) * 0.3

      // idles as a healthy score with a gentle wobble; the cursor's x revs it from ~40 to ~100
      let target = 0.93 + Math.sin(t * 0.9) * 0.05
      let revving = 0
      if (pointer.inside) {
        target = 0.4 + Math.min(1, Math.max(0, pointer.x / w)) * 0.6
        revving = 1
      }
      value += (target - value) * Math.min(1, dt * 3.2)
      const col = tone(value)

      const START = Math.PI * 0.75 // 135 degrees, bottom left
      const SWEEP = Math.PI * 1.5 // 270 degrees clockwise
      const ang = (v: number) => START + SWEEP * v

      // ticks round the dial: lit up to the score, glass beyond
      const litTicks = new Path2D()
      const coldTicks = new Path2D()
      for (let i = 0; i <= 20; i++) {
        const v = i / 20
        const a = ang(v)
        const inner = R * (i % 5 === 0 ? 0.86 : 0.92)
        const p = v <= value ? litTicks : coldTicks
        p.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner)
        p.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R)
      }
      pen.neon(litTicks, col, 0.45, 1.4)
      pen.glass(coldTicks, 0.16, 3)

      // the track (glass) and the score (neon)
      const AR = R * 0.72
      pen.glass(P.arc(cx, cy, AR, START, START + SWEEP), 0.14, 14)
      pen.neon(P.arc(cx, cy, AR, START, ang(value)), col, 0.95, 6)

      // the needle: a pointer just inside the arc (clear of the readout)
      const na = ang(value)
      const nx = Math.cos(na)
      const ny = Math.sin(na)
      pen.neon(P.line(cx + nx * AR * 0.62, cy + ny * AR * 0.62, cx + nx * AR * 0.86, cy + ny * AR * 0.86), WHITE, 0.75, 2.2)
      pen.fill(P.circle(cx + nx * AR * 0.62, cy + ny * AR * 0.62, 3), col, 1)

      // the readout
      const font = `600 ${Math.round(R * 0.52)}px 'Schibsted Grotesk Variable', 'Schibsted Grotesk', system-ui, sans-serif`
      pen.text(String(Math.round(value * 100)), cx, cy + R * 0.02, font, col, 0.95, 1.8)
      pen.ctx.font = `700 ${Math.round(R * 0.075)}px 'Schibsted Grotesk Variable', 'Schibsted Grotesk', system-ui, sans-serif`
      pen.ctx.textAlign = 'center'
      pen.ctx.textBaseline = 'middle'
      pen.ctx.fillStyle = rgba(WHITE, 0.5)
      pen.ctx.fillText('SCORE', cx, cy + R * 0.32)

      // speed streaks radiating outward, faster and brighter as the score rises
      const spd = 0.25 + value * 1.7 + revving * 0.5
      const lines = new Path2D()
      for (const s of streaks) {
        s.r += s.speed * spd * dt * 0.4
        if (s.r > 1.3) {
          s.r = 0.1
          s.a = Math.random() * Math.PI * 2
        }
        const r0 = R * (1.12 + s.r * 0.85)
        const r1 = r0 + R * s.len * (0.5 + value)
        lines.moveTo(cx + Math.cos(s.a) * r0, cy + Math.sin(s.a) * r0)
        lines.lineTo(cx + Math.cos(s.a) * r1, cy + Math.sin(s.a) * r1)
      }
      pen.neon(lines, col, 0.06 + value * 0.2, 1.3)
    },
  }
}
