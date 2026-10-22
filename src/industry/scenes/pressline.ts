import { NA, NB, NC, P, WHITE, rgba, strike, type Scene } from '../../service/scenes/kit'

interface Part {
  /** centre on the belt (px) */
  x: number
  /** stamped: when (t), for its strike */
  done: number
  seed: number
}
interface Spark {
  x: number
  y: number
  vx: number
  vy: number
  age: number
}

const clamp = (x: number, a = 0, b = 1) => (x < a ? a : x > b ? b : x)

/*
 * MANUFACTURING — the press line. A conveyor in glass runs right to left
 * across the hero carrying blank parts (clear glass squares) under a press:
 * the head drops as each blank comes under it, and the part leaves stamped,
 * a finished piece lit in the lead colour with its mark struck into it,
 * sparks flying from the die. The rollers turn with the belt and a stack
 * light on the press frame blinks each stamp. The cursor runs the line: its
 * x is the throttle (left slow, right fast: the belt and the stamping with
 * it), its y lifts or lowers the press head between strokes; a touch counts.
 */
export function pressline(): Scene {
  let parts: Part[] = []
  let sparks: Spark[] = []
  let cx = 0, by = 0, x0 = 0, x1 = 0, S = 0, GAP = 0
  let speed = 0
  let hover = 0.5
  let stroke = 0
  let lamp = 0
  let roll = 0
  let count = 0

  return {
    init(w, h, framed) {
      const side = !framed && w > 600
      cx = w * (framed ? 0.5 : side ? 0.54 : 0.5)
      by = h * (framed ? 0.6 : 0.58)
      S = Math.min(w, h) * (framed ? 0.085 : side ? 0.105 : 0.09)
      GAP = S * 2.3
      x0 = -S
      x1 = w + S
      parts = []
      sparks = []
      speed = 0
      hover = 0.5
      stroke = 0
      lamp = 0
      roll = 0
      count = 0
      // a line already running: blanks to the right of the press, finished parts to its left
      for (let x = cx + GAP * 0.5; x < x1; x += GAP) parts.push({ x, done: 0, seed: x })
      for (let x = cx - GAP * 0.5; x > x0; x -= GAP) parts.push({ x, done: -10, seed: x })
    },

    frame(pen, w, h, pointer, dt, t) {
      const { ctx, glow } = pen
      const over = pointer.inside

      // ---- the throttle and the head's height: the hand sets them, the line idles without it
      const wantSpeed = over ? 0.25 + clamp(pointer.x / w) * 1.6 : 0.62 + Math.sin(t * 0.35) * 0.12
      const wantHover = over ? clamp((pointer.y - h * 0.12) / (by - h * 0.12)) : 0.5 + Math.sin(t * 0.5) * 0.08
      speed += (wantSpeed - speed) * Math.min(1, dt * 2.5)
      hover += (wantHover - hover) * Math.min(1, dt * 4)
      const v = S * 1.6 * speed // px/s, leftward
      roll += (v / (S * 0.3)) * dt

      // ---- the belt: two glass rails, rollers turning beneath, a tread of ticks sliding left
      pen.glass(P.line(x0, by, x1, by), 0.3, 3)
      pen.glass(P.line(x0, by + S * 0.34, x1, by + S * 0.34), 0.2, 3)
      const tread = new Path2D()
      const pitch = S * 0.55
      const slide = ((roll * S * 0.3) % pitch) + pitch
      for (let x = x0 - slide; x < x1; x += pitch) {
        tread.moveTo(x, by + S * 0.08)
        tread.lineTo(x - S * 0.12, by + S * 0.26)
      }
      pen.glass(tread, 0.12, 1.5)
      const rollers = new Path2D()
      const spokes = new Path2D()
      const rr = S * 0.17
      for (let x = x0 + pitch * 1.5; x < x1; x += pitch * 3) {
        const y = by + S * 0.17
        rollers.moveTo(x + rr, y)
        rollers.arc(x, y, rr, 0, Math.PI * 2)
        const a = -roll
        spokes.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
        spokes.lineTo(x - Math.cos(a) * rr, y - Math.sin(a) * rr)
      }
      pen.glass(rollers, 0.22, 2)
      pen.glass(spokes, 0.14, 1.2)
      // the belt's legs, down to the shop floor
      const floor = by + S * 1.5
      const legs = new Path2D()
      for (let x = x0 + pitch * 3; x < x1; x += pitch * 6) {
        legs.moveTo(x, by + S * 0.34)
        legs.lineTo(x, floor)
      }
      pen.glass(legs, 0.14, 3)
      pen.glass(P.line(x0, floor, x1, floor), 0.12, 3)

      // ---- the parts: they ride left; the one under the press is stamped as it passes
      const reach = S * 1.1
      let nearest = -1
      let nd = 1e9
      for (const p of parts) {
        p.x -= v * dt
        if (!p.done) {
          const d = Math.abs(p.x - cx)
          if (p.x < cx - S * 0.1) {
            // it passed under the head: stamped
            p.done = t
            count++
            lamp = 1
            for (let i = 0; i < 9; i++) {
              const a = Math.PI + (Math.random() - 0.5) * 2.2
              const sp = S * (2 + Math.random() * 5)
              sparks.push({ x: cx, y: by - S * 0.5, vx: Math.cos(a) * sp * (Math.random() < 0.5 ? -1 : 1), vy: -Math.abs(Math.sin(a)) * sp, age: 0 })
            }
          } else if (d < nd) {
            nd = d
            nearest = p.x
          }
        }
      }
      parts = parts.filter(p => p.x > x0)
      // a fresh blank joins at the right as the last one moves off its mark
      const tail = parts.reduce((m, p) => Math.max(m, p.x), -1e9)
      if (tail < x1 - GAP) parts.push({ x: tail + GAP, done: 0, seed: t })

      // ---- the press: the head drops as the next blank comes under it (in step with the belt)
      const want = nearest < 0 ? 0 : Math.pow(clamp(1 - nd / reach), 0.55)
      stroke += (want - stroke) * Math.min(1, dt * 18)
      const frameTop = by - S * 2.9
      const lift = (0.35 + hover * 0.95) * S // the head's rest height above the part
      const headH = S * 0.5
      const headY = by - S * 0.78 - lift * (1 - stroke) - headH
      const fw = S * 1.2
      // the frame: two uprights and a crossbeam
      const frame = new Path2D()
      frame.moveTo(cx - fw, by + S * 0.34)
      frame.lineTo(cx - fw, frameTop)
      frame.lineTo(cx + fw, frameTop)
      frame.lineTo(cx + fw, by + S * 0.34)
      pen.glass(frame, 0.34, 4)
      pen.glass(P.rect(cx - fw * 0.55, frameTop, fw * 1.1, S * 0.4), 0.28, 2.5)
      // the ram
      pen.glass(P.rect(cx - S * 0.16, frameTop + S * 0.4, S * 0.32, headY - frameTop - S * 0.4), 0.3, 3)
      // the head, its die lit as it strikes
      const head = P.rrect(cx - S * 0.7, headY, S * 1.4, headH, 3)
      ctx.fillStyle = rgba(WHITE, 0.03 + stroke * 0.04)
      ctx.fill(head)
      pen.glass(head, 0.4, 3)
      pen.neon(P.line(cx - S * 0.66, headY + headH, cx + S * 0.66, headY + headH), NA, 0.25 + stroke * 0.75, 1.6 + stroke)
      pen.neon(P.diamond(cx, headY + headH * 0.5, S * 0.26), NA, 0.3 + stroke * 0.7, 1.2)
      // the stack light on the frame: the second colour blinks each stamp, the third holds while it runs
      lamp = Math.max(0, lamp - dt * 2.2)
      pen.fill(P.circle(cx + fw, frameTop - S * 0.42, S * 0.09), NB, 0.15 + lamp * 0.85)
      pen.fill(P.circle(cx + fw, frameTop - S * 0.2, S * 0.09), NC, 0.35 + speed * 0.3)
      pen.glass(P.line(cx + fw, frameTop, cx + fw, frameTop - S * 0.55), 0.3, 2)
      // the throttle: a glass dial on the frame whose needle turns with the speed
      const dx = cx - fw, dy = frameTop - S * 0.3
      pen.glass(P.circle(dx, dy, S * 0.2), 0.3, 2)
      const na = Math.PI * 0.8 + clamp(speed / 1.9) * Math.PI * 1.4
      pen.neon(P.line(dx, dy, dx + Math.cos(na) * S * 0.16, dy + Math.sin(na) * S * 0.16), NC, 0.8, 1.3)
      pen.glass(P.line(dx, frameTop, dx, dy + S * 0.2), 0.3, 2)

      // ---- the parts themselves: blanks in clear glass, stamped ones lit with their mark
      for (const p of parts) {
        const y = by - S * 0.33
        const shape = P.rrect(p.x - S * 0.36, y - S * 0.26, S * 0.72, S * 0.52, S * 0.08)
        if (!p.done) {
          ctx.fillStyle = rgba(WHITE, 0.03)
          ctx.fill(shape)
          pen.glass(shape, 0.36, 2.4)
          // under the head it glows with the die's light
          const near = clamp(1 - Math.abs(p.x - cx) / reach)
          if (near > 0.01) pen.neon(shape, NA, near * stroke * 0.5, 1.2)
        } else {
          const on = p.done < 0 ? 1 : strike(t - p.done, p.seed)
          pen.glass(shape, 0.3, 2.4)
          pen.neon(shape, NA, 0.85 * on, 1.6)
          pen.wash(shape, NA, 0.05 * on)
          pen.neon(P.diamond(p.x, y, S * 0.22), NA, 0.9 * on, 1.3)
          pen.fill(P.circle(p.x, y, S * 0.035), NA, on)
        }
      }

      // ---- sparks off the die
      sparks = sparks.filter(s => s.age < 0.5)
      for (const s of sparks) {
        s.age += dt
        s.x += s.vx * dt
        s.y += s.vy * dt
        s.vy += S * 14 * dt
        const a = 1 - s.age / 0.5
        pen.streak(s.x - s.vx * 0.03, s.y - s.vy * 0.03, s.x, s.y, NB, a, 1.3)
      }
      // the stamp's flash under the head
      if (stroke > 0.6) {
        const f = (stroke - 0.6) * 2.5
        const g = glow.createRadialGradient(cx, by - S * 0.4, 0, cx, by - S * 0.4, S * 1.6)
        g.addColorStop(0, rgba(NA, 0.3 * f))
        g.addColorStop(1, rgba(NA, 0))
        glow.fillStyle = g
        glow.fillRect(cx - S * 1.6, by - S * 2, S * 3.2, S * 3.2)
      }

      // ---- the output: a tally of finished parts, bent in tube, over the line's end
      const n = Math.min(999, 128 + count)
      pen.text(String(n), cx - fw * 2.4, by - S * 1.9, `600 ${Math.round(S * 0.6)}px 'Schibsted Grotesk Variable', 'Schibsted Grotesk', system-ui, sans-serif`, NA, 0.7, 1.4)
      ctx.font = `700 ${Math.round(S * 0.13)}px 'Schibsted Grotesk Variable', 'Schibsted Grotesk', system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = rgba(WHITE, 0.45)
      ctx.fillText('P A R T S', cx - fw * 2.4, by - S * 1.45)
    },
  }
}
