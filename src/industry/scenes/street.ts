import { NA, NB, NC, P, WHITE, rgba, strike, type Scene } from '../../service/scenes/kit'

interface House {
  /** base-left corner and scale (the street recedes to the right) */
  x: number
  y: number
  s: number
  w: number
  h: number
  /** the sign: how far it has flipped to SOLD (0..1), and when it sold (-1: for sale) */
  flip: number
  soldAt: number
  /** the sign's swing: angle and speed */
  sa: number
  sv: number
  /** lit by the hand or its sale (0..1, cools) */
  heat: number
}

const FONT = "'Schibsted Grotesk Variable', 'Schibsted Grotesk', system-ui, sans-serif"
const SELL = 2.4

/*
 * REAL ESTATE — a street of houses in clear glass, receding to the right, each
 * with a yard sign hanging from its post. One at a time the signs flip round
 * to a neon SOLD as the street sells; when the last goes the street relists
 * and sells again. A drone's light drifts over the roofs in the third
 * colour. The hand hovers a house: it lights in the second colour and its
 * sign swings on its chains, and the drone turns toward the hand.
 */
export function street(): Scene {
  let houses: House[] = []
  let order: number[] = []
  let road = new Path2D()
  let lane = new Path2D()
  let u = 1
  let L = 0
  let T = 0
  let nextSale = 0
  let hovered = -1
  /** the drone */
  let dx = 0
  let dy = 0
  let font = ''

  const groundAt = (x: number) => T + (52 - ((x - L) / u) * 0.13) * u

  const sell = (t: number) => {
    const next = order.find(i => houses[i].soldAt < 0)
    if (next === undefined) {
      // all sold: hold, then relist
      if (t - nextSale > 2) {
        for (const h of houses) h.soldAt = -1
        order.sort(() => Math.random() - 0.5)
        nextSale = t + 1
      }
      return
    }
    const h = houses[next]
    h.soldAt = t
    h.heat = 1
    h.sv += 2.5
    nextSale = t + SELL * (0.8 + Math.random() * 0.4)
  }

  return {
    init(w, h, framed) {
      u = Math.min(w / 108, h / 66)
      L = w * (framed ? 0.5 : 0.52) - 50 * u
      T = h / 2 - 33 * u
      houses = []
      let x = 5
      for (let i = 0; i < 5; i++) {
        const s = 1 - i * 0.11
        const hw = 18 * s
        const hx = L + x * u
        houses.push({ x: hx, y: groundAt(hx + (hw * u) / 2) - 2 * s * u, s, w: hw * u, h: 11 * s * u, flip: 0, soldAt: -1, sa: 0, sv: 0, heat: 0 })
        x += hw + 3 * s
      }
      order = houses.map((_, i) => i).sort(() => Math.random() - 0.5)
      // two sold already
      for (const i of order.slice(0, 2)) {
        houses[i].soldAt = -9
        houses[i].flip = 1
      }
      nextSale = 1.6
      // the kerb and the road's far edge, converging; the lane line dashed
      road = new Path2D()
      road.moveTo(L + 2 * u, T + 55.7 * u)
      road.lineTo(L + 97 * u, T + 43.4 * u)
      road.moveTo(L + 2 * u, T + 65.6 * u)
      road.lineTo(L + 97 * u, T + 48.5 * u)
      lane = new Path2D()
      lane.moveTo(L + 4 * u, T + 61.1 * u)
      lane.lineTo(L + 97 * u, T + 46.1 * u)
      dx = L + 50 * u
      dy = T + 22 * u
      font = `700 ${Math.round(1.9 * u)}px ${FONT}`
      hovered = -1
    },

    frame(pen, _w, _h, pointer, dt, t) {
      if (t > nextSale) sell(t)

      // the street
      pen.glass(road, 0.22, 3)
      pen.dash([6, 8])
      pen.glass(lane, 0.14, 2)
      pen.dash([])

      // the hand over a house
      let over = -1
      if (pointer.inside) {
        for (let i = 0; i < houses.length; i++) {
          const h = houses[i]
          if (pointer.x > h.x - u && pointer.x < h.x + h.w + 5 * h.s * u && pointer.y > h.y - h.h - 6 * h.s * u && pointer.y < h.y + 4 * u) over = i
        }
      }
      if (over !== hovered) {
        hovered = over
        if (over >= 0) houses[over].sv += 3.2
      }

      // the drone: a lazy drift over the roofs, bending toward the hand
      let tx = L + (50 + Math.cos(t * 0.37) * 40) * u
      let ty = T + (20 + Math.sin(t * 0.53) * 7) * u
      if (pointer.inside) {
        tx = tx * 0.4 + pointer.x * 0.6
        ty = ty * 0.4 + pointer.y * 0.6
      }
      const ez = 1 - Math.exp(-1.6 * dt)
      dx += (tx - dx) * ez
      dy += (ty - dy) * ez
      // its light on the roofs beneath it
      const gy = groundAt(dx) - 7 * u
      const cone = new Path2D()
      cone.moveTo(dx, dy)
      cone.lineTo(dx - 5 * u, gy)
      cone.moveTo(dx, dy)
      cone.lineTo(dx + 5 * u, gy)
      pen.ctx.strokeStyle = rgba(NC, 0.18)
      pen.ctx.lineWidth = 1
      pen.ctx.stroke(cone)
      const spot = new Path2D()
      spot.ellipse(dx, gy, 5.5 * u, 2 * u, 0, 0, Math.PI * 2)
      pen.wash(spot, NC, 0.09)

      for (let i = 0; i < houses.length; i++) {
        const h = houses[i]
        const { x, y, s, w, h: hh } = h
        const peak = y - hh - 5 * s * u
        // the house: walls, roof, chimney, door, two windows
        const body = new Path2D()
        body.rect(x, y - hh, w, hh)
        body.moveTo(x - 0.8 * s * u, y - hh)
        body.lineTo(x + w / 2, peak)
        body.lineTo(x + w + 0.8 * s * u, y - hh)
        body.rect(x + w * 0.72, peak + 1.4 * s * u, 1.6 * s * u, 2.2 * s * u)
        body.rect(x + w * 0.42, y - hh * 0.5, w * 0.16, hh * 0.5)
        body.rect(x + w * 0.1, y - hh * 0.8, w * 0.22, hh * 0.32)
        body.rect(x + w * 0.68, y - hh * 0.8, w * 0.22, hh * 0.32)
        const lit = Math.abs(dx - (x + w / 2)) < w * 0.7 ? 0.25 : 0
        pen.glass(body, 0.3, 3)
        if (lit > 0) pen.neon(body, NC, lit, 1.2)
        if (h.heat > 0.02) pen.neon(body, h.soldAt >= 0 && t - h.soldAt < 1 ? NA : NB, h.heat * 0.9, 1.6)
        if (over === i) {
          h.heat = 1
          pen.box(x + w * 0.1, y - hh * 0.8, w * 0.22, hh * 0.32, NB, 0.5)
          pen.box(x + w * 0.68, y - hh * 0.8, w * 0.22, hh * 0.32, NB, 0.5)
        }
        h.heat = Math.max(0, h.heat - dt * 1.3)

        // the sign: a post with an arm, the panel hanging from it; it swings, and flips round to SOLD
        h.sv += (-h.sa * 60 - h.sv * 3) * dt
        h.sa += h.sv * dt
        const sold = h.soldAt >= 0 || h.soldAt < -1
        h.flip += ((sold ? 1 : 0) - h.flip) * Math.min(1, dt * 3)
        const px = x + w + 1.6 * s * u
        const py = y + 2.4 * s * u
        const ph = 6 * s * u
        const arm = 3.4 * s * u
        const post = new Path2D()
        post.moveTo(px, py)
        post.lineTo(px, py - ph)
        post.lineTo(px + arm, py - ph)
        pen.glass(post, 0.4, 2.4)
        const ax = px + arm * 0.55
        const ay = py - ph
        const cos = Math.cos(h.flip * Math.PI)
        const hw = 2.9 * s * u * Math.abs(cos)
        const top = 0.7 * s * u
        const bot = 3.2 * s * u
        const ca = Math.cos(h.sa)
        const sa = Math.sin(h.sa)
        const pt = (ox: number, oy: number) => [ax + ox * ca - oy * sa, ay + ox * sa + oy * ca] as const
        const panel = new Path2D()
        const [x0, y0] = pt(-hw, top)
        const [x1, y1] = pt(hw, top)
        const [x2, y2] = pt(hw, bot)
        const [x3, y3] = pt(-hw, bot)
        panel.moveTo(x0, y0)
        panel.lineTo(x1, y1)
        panel.lineTo(x2, y2)
        panel.lineTo(x3, y3)
        panel.closePath()
        panel.moveTo(...pt(-hw * 0.7, 0))
        panel.lineTo(x0, y0)
        panel.moveTo(...pt(hw * 0.7, 0))
        panel.lineTo(x1, y1)
        const face = cos < 0 ? -cos : 0
        pen.glass(panel, 0.4, 2.4)
        if (face > 0) {
          const on = face * (h.soldAt >= 0 ? strike(t - h.soldAt - 0.3, i) : 1)
          pen.neon(panel, NA, on * 0.8, 1.4)
          for (const k of [pen.ctx, pen.glow]) {
            k.save()
            k.translate(ax, ay)
            k.rotate(h.sa)
            k.scale(face * s, s)
          }
          pen.text('SOLD', 0, (top + bot) / 2 / s, font, NA, on, Math.max(0.8, 0.5 * s))
          for (const k of [pen.ctx, pen.glow]) k.restore()
        }
      }

      // the drone: a white-hot body, glass arms, neon rotors
      const spin = t * 40
      const arms = new Path2D()
      for (let i = 0; i < 4; i++) {
        const a = (Math.PI / 2) * i + Math.PI / 4
        const rx = dx + Math.cos(a) * 1.3 * u
        const ry = dy + Math.sin(a) * 0.7 * u
        arms.moveTo(dx, dy)
        arms.lineTo(rx, ry)
        pen.neon(P.arc(rx, ry, 0.6 * u, spin + i, spin + i + Math.PI * 1.4), NC, 0.85, 1.2)
      }
      pen.glass(arms, 0.5, 2.4)
      pen.fill(P.rect(dx - 0.35 * u, dy - 0.35 * u, 0.7 * u, 0.7 * u), WHITE, 1)
      pen.fill(P.circle(dx, dy + 0.5 * u, 0.25 * u), NC, 0.9)
    },
  }
}
