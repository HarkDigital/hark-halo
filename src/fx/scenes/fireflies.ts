import { NA, NB, TAU, WHITE, rgba, type Pen, type RGB, type Scene } from '../../service/scenes/kit'
import { breath, clamp01, hash, hot, smooth, wash } from '../../service/stat/pictures/lib'

/*
 * FIREFLIES: a swarm of lit points in the dark, each blinking in its own
 * time. Every agent wanders (its velocity eased toward a target it changes
 * every 1.5-3 s, capped at a stroll, turned back by soft edges) and carries a
 * phase that runs at its own rate; the flash is a high power of that sine,
 * so each lights for a third of a second every few seconds. Two small
 * groups share a rate and phase and flash in unison. Lit, an agent is a
 * white-hot bead with a bloom in NA (one in ten NB) and a short streak of its
 * own motion, the way a long exposure sees them; unlit it is nothing. A faint
 * line of ground haze lies along the bottom so the dark reads as a field at
 * night. Near the cursor the targets lean in to a ring around the hand and
 * the blinking doubles; pressing bursts them outward and hushes the flashing
 * for half a second, and holding keeps a clearing open until you let go.
 */
export default function fireflies(): Scene {
  let n = 0
  let x = new Float32Array(0)
  let y = new Float32Array(0)
  let vx = new Float32Array(0)
  let vy = new Float32Array(0)
  let tx = new Float32Array(0)
  let ty = new Float32Array(0)
  let hold = new Float32Array(0) // seconds until the next target
  let f = new Float32Array(0) // blink rate, Hz
  let ph = new Float32Array(0) // blink phase, radians
  let z = new Float32Array(0) // depth: 0 far, 1 near
  let spd = new Float32Array(0) // stroll speed, px/s
  let quiet = new Float32Array(0) // seconds of hush left (dark, then a short ramp back)
  let gen = new Float32Array(0) // how many targets picked (seeds the next)
  let blue = new Uint8Array(0)
  let gy = 0 // the ground line
  let edge = 0
  let R = 0 // the hand's reach
  // the field they keep to
  let x0 = 0
  let y0 = 0
  let x1 = 0
  let y1 = 0
  let pull = 0
  let wasDown = false
  let hotA: RGB = WHITE
  let hotB: RGB = WHITE
  let groundCtx: CanvasRenderingContext2D | null = null
  let ground: CanvasGradient | null = null

  /** a new target for agent i: anywhere in the field, or (near the hand) a spot on a ring around it */
  const pick = (i: number, px: number, py: number, near: number) => {
    const g = ++gen[i]
    const r1 = hash(i * 131 + g * 17 + 1)
    const r2 = hash(i * 131 + g * 17 + 2)
    const r3 = hash(i * 131 + g * 17 + 3)
    if (near > 0.5) {
      const a = r1 * TAU
      const rr = R * (0.08 + 0.3 * r2)
      tx[i] = Math.min(x1, Math.max(x0, px + Math.cos(a) * rr))
      ty[i] = Math.min(y1, Math.max(y0, py + Math.sin(a) * rr * 0.8))
    } else {
      tx[i] = x0 + r1 * (x1 - x0)
      ty[i] = y0 + r2 * (y1 - y0)
    }
    hold[i] = 1.5 + 1.5 * r3
  }

  /** a lit firefly: bloom on the glow, a white-hot bead on the sharp layer */
  const bead = (pen: Pen, bx: number, by: number, r: number, c: RGB, hc: RGB, on: number) => {
    const { ctx, glow } = pen
    glow.fillStyle = rgba(c, on)
    glow.beginPath()
    glow.arc(bx, by, r + 2.5 + 4.5 * on, 0, TAU)
    glow.fill()
    ctx.fillStyle = rgba(hc, on)
    ctx.beginPath()
    ctx.arc(bx, by, r, 0, TAU)
    ctx.fill()
    if (on > 0.45) {
      ctx.fillStyle = rgba(WHITE, (on - 0.45) * 1.6)
      ctx.beginPath()
      ctx.arc(bx, by, r * 0.5, 0, TAU)
      ctx.fill()
    }
  }

  return {
    init(w, h) {
      gy = h * 0.9
      edge = Math.min(48, Math.max(12, 0.07 * Math.min(w, h)))
      R = Math.min(300, Math.max(140, 0.45 * w))
      x0 = edge
      y0 = edge
      x1 = w - edge
      y1 = gy - edge * 0.6
      ground = null
      groundCtx = null
      n = Math.round(Math.min(170, Math.max(72, (w * h) / 2300)))
      x = new Float32Array(n)
      y = new Float32Array(n)
      vx = new Float32Array(n)
      vy = new Float32Array(n)
      tx = new Float32Array(n)
      ty = new Float32Array(n)
      hold = new Float32Array(n)
      f = new Float32Array(n)
      ph = new Float32Array(n)
      z = new Float32Array(n)
      spd = new Float32Array(n)
      quiet = new Float32Array(n)
      gen = new Float32Array(n)
      blue = new Uint8Array(n)
      hotA = hot(NA)
      hotB = hot(NB)
      pull = 0
      wasDown = false
      for (let i = 0; i < n; i++) {
        const r = (k: number) => hash(i * 97 + k * 7919 + 0.5)
        x[i] = x0 + r(1) * (x1 - x0)
        y[i] = y0 + r(2) * (y1 - y0)
        z[i] = 0.35 + 0.65 * r(3)
        spd[i] = (14 + 21 * r(4)) * (0.6 + 0.4 * z[i])
        f[i] = 0.25 + 0.35 * r(5)
        ph[i] = r(6) * TAU
        blue[i] = r(7) < 0.1 ? 1 : 0
        quiet[i] = 0
        gen[i] = 0
        pick(i, 0, 0, 0)
        hold[i] *= r(8) // stagger the first change
        // a wander already under way
        const a = r(9) * TAU
        vx[i] = Math.cos(a) * spd[i]
        vy[i] = Math.sin(a) * spd[i]
      }
      // two small groups flash in unison
      for (let i = 0; i < n; i++) {
        const k = i % 11
        if (k === 3) {
          f[i] = 0.34
          ph[i] = 1.1
        } else if (k === 7) {
          f[i] = 0.29
          ph[i] = 4.0
        }
      }
    },

    frame(pen, w, h, pointer, dt, t) {
      const { ctx } = pen
      const inside = pointer.inside
      const px = pointer.x
      const py = pointer.y
      const down = inside && pointer.down
      pull += ((inside && !down ? 1 : 0) - pull) * Math.min(1, 3 * dt)

      // pressing: a burst outward from the hand, and every light goes quiet
      if (down && !wasDown) {
        for (let i = 0; i < n; i++) {
          const dx = x[i] - px
          const dy = y[i] - py
          const d = Math.sqrt(dx * dx + dy * dy)
          const r1 = hash(i * 53 + t * 7 + 0.25)
          if (d < R) {
            const k = 1 - d / R
            const ux = d > 1 ? dx / d : Math.cos(r1 * TAU)
            const uy = d > 1 ? dy / d : Math.sin(r1 * TAU)
            const kick = 160 + 260 * k
            vx[i] += ux * kick
            vy[i] += uy * kick
            tx[i] = Math.min(x1, Math.max(x0, x[i] + ux * R * 0.7 * k))
            ty[i] = Math.min(y1, Math.max(y0, y[i] + uy * R * 0.7 * k))
            hold[i] = 1.4 + r1
            quiet[i] = 0.85 + 0.25 * r1
          } else quiet[i] = 0.6 + 0.15 * r1
        }
      }
      wasDown = pointer.down

      // the ground haze: a soft hairline with a breath of mist lying over it
      const mist = 0.04 * breath(t, 9, 0.3)
      wash(pen, WHITE, w * 0.5, gy + h * 0.03, w * 0.78, h * 0.11, mist)
      if (!ground || groundCtx !== ctx) {
        groundCtx = ctx
        ground = ctx.createLinearGradient(0, 0, w, 0)
        ground.addColorStop(0, rgba(WHITE, 0))
        ground.addColorStop(0.5, rgba(WHITE, 1))
        ground.addColorStop(1, rgba(WHITE, 0))
      }
      ctx.strokeStyle = ground
      ctx.beginPath()
      ctx.moveTo(0, gy)
      ctx.lineTo(w, gy)
      ctx.globalAlpha = 0.045
      ctx.lineWidth = 3
      ctx.stroke()
      ctx.globalAlpha = 0.17
      ctx.lineWidth = 0.9
      ctx.stroke()
      ctx.globalAlpha = 1

      // a slow breeze across the field
      const bzx = 7 * Math.sin(t * 0.11) + 3 * Math.sin(t * 0.23 + 1)
      const bzy = 2.5 * Math.sin(t * 0.07 + 2)
      const holdR = R * 0.55
      const ease = Math.min(1, 2.2 * dt)

      for (let i = 0; i < n; i++) {
        // the hand
        let near = 0
        let d = 1e9
        let dx = 0
        let dy = 0
        if (inside) {
          dx = x[i] - px
          dy = y[i] - py
          d = Math.sqrt(dx * dx + dy * dy)
          if (d < R) near = smooth(1 - d / R)
        }
        // gather: the target leans in to a ring around the hand
        if (near > 0 && pull > 0.01) {
          const k = near * pull * 1.3 * dt
          const ux = d > 1 ? dx / d : 1
          const uy = d > 1 ? dy / d : 0
          const rr = R * (0.1 + 0.18 * hash(i * 3.7 + 0.5))
          tx[i] += (px + ux * rr - tx[i]) * k
          ty[i] += (py + uy * rr * 0.8 - ty[i]) * k
        }
        // a new target when the old one is reached or stale
        hold[i] -= dt
        const gx = tx[i] - x[i]
        const gyy = ty[i] - y[i]
        const gd = Math.sqrt(gx * gx + gyy * gyy)
        if (hold[i] <= 0 || gd < 6) pick(i, px, py, near * pull)

        // wander: eased toward the target at a stroll, with a sway and the breeze
        const sway = 0.7 * Math.sin(t * 1.7 + i * 0.9)
        const cs = Math.cos(sway)
        const sn = Math.sin(sway)
        const ux = gd > 0.01 ? gx / gd : 0
        const uy = gd > 0.01 ? gyy / gd : 0
        const s = spd[i] * (0.6 + 0.4 * Math.min(1, gd / 40)) * (1 + 0.4 * near * pull)
        let wx = (ux * cs - uy * sn) * s + bzx * z[i]
        let wy = (ux * sn + uy * cs) * s + bzy * z[i]
        // soft edges turn them back
        if (x[i] < x0 + edge) wx += ((x0 + edge - x[i]) / edge) * 40
        else if (x[i] > x1 - edge) wx -= ((x[i] - x1 + edge) / edge) * 40
        if (y[i] < y0 + edge) wy += ((y0 + edge - y[i]) / edge) * 40
        else if (y[i] > y1 - edge * 0.5) wy -= ((y[i] - y1 + edge * 0.5) / (edge * 0.5)) * 40
        // holding keeps a clearing open
        if (down && d < holdR) {
          const k = (1 - d / holdR) * 90
          wx += (d > 1 ? dx / d : 1) * k
          wy += (d > 1 ? dy / d : 0) * k
        }
        vx[i] += (wx - vx[i]) * ease
        vy[i] += (wy - vy[i]) * ease
        x[i] += vx[i] * dt
        y[i] += vy[i] * dt
        if (x[i] < -12) x[i] = -12
        else if (x[i] > w + 12) x[i] = w + 12
        if (y[i] < -12) y[i] = -12
        else if (y[i] > gy - 3) {
          // the ground is solid: a burst can throw them down to it, not through it
          y[i] = gy - 3
          if (vy[i] > 0) vy[i] = -vy[i] * 0.3
        }

        // the blink: its own rate, doubled by the hand
        const rate = f[i] * (1 + near * pull)
        ph[i] += TAU * rate * dt
        if (ph[i] > TAU) ph[i] -= TAU
        const sv = Math.sin(ph[i])
        if (quiet[i] > 0) quiet[i] -= dt
        if (sv <= 0.55) continue
        const s2 = sv * sv
        const s4 = s2 * s2
        const s8 = s4 * s4
        let flash = s8 * s4 * s2
        if (quiet[i] > 0) flash *= smooth(1 - quiet[i] / 0.3)
        if (flash < 0.012) continue
        const on = clamp01(flash) * (0.5 + 0.5 * z[i])
        const r = (1.6 + 1.2 * flash) * (0.65 + 0.45 * z[i])
        const c = blue[i] ? NB : NA
        const hc = blue[i] ? hotB : hotA
        // a long exposure sees its flight while lit
        const sp2 = vx[i] * vx[i] + vy[i] * vy[i]
        if (on > 0.2 && sp2 > 18 * 18) {
          const L = Math.min(0.4, 0.3 * z[i] + 0.1)
          pen.streak(x[i] - vx[i] * L, y[i] - vy[i] * L, x[i], y[i], c, on * 0.55, r * 0.9)
        }
        bead(pen, x[i], y[i], r, c, hc, on)
      }
    },
  }
}
