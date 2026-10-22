import { NA, NB, NC, P, WHITE, rgba, strike, type RGB, type Scene } from '../../service/scenes/kit'

interface Product {
  x: number
  /** its shelf */
  row: number
  /** 0 a box, 1 a bottle, 2 a jar */
  kind: number
  w: number
  h: number
  /** on the shelf (1) or gone to the cart (0); restocks after a while */
  stock: number
  /** when it was restocked (t), for its strike */
  at: number
  seed: number
}
interface Mark {
  x: number
  y: number
  x0: number
  y0: number
  k: number
  col: RGB
}

const KINDS: RGB[] = [NA, NB, NC]
const clamp = (x: number, a = 0, b = 1) => (x < a ? a : x > b ? b : x)
const easeIn = (x: number) => clamp(x) ** 2

/*
 * RETAIL & ECOMMERCE — the aisle. Three shelves of glass run across the hero
 * with products in rows (boxes, bottles, jars), and a cart rolls the aisle
 * beneath them with a light on its handle: the products it passes light
 * in neon as its beam sweeps them, and every so often one rides into the
 * cart, a small lit mark flying down into the basket, where the haul
 * stacks up. At the end of the aisle the cart checks out (the basket clears
 * in a flash) and turns back, and the shelves restock behind it, each
 * product striking back on. The cursor pulls the cart along the aisle, and
 * the shelf nearest the hand is the one it shops; a touch counts.
 */
export function shelves(): Scene {
  let products: Product[] = []
  let marks: Mark[] = []
  let haul: Mark[] = []
  let cart = 0, cartV = 0, dir = 1
  let ax0 = 0, ax1 = 0, floor = 0, U = 0
  let rowY: number[] = []
  let pickT = 0
  let checkout = 0
  let rowPick = 1

  const place = () => {
    products = []
    for (let r = 0; r < 3; r++) {
      let x = ax0 + U * 1.6
      let i = 0
      while (x < ax1 - U * 2) {
        const kind = (r + i * 2 + (i >> 2)) % 3
        const pw = U * (kind === 0 ? 2.4 + ((i * 7) % 3) * 0.5 : kind === 1 ? 1.1 : 1.9)
        const ph = U * (kind === 0 ? 2.2 + ((i * 5) % 2) * 0.6 : kind === 1 ? 3.3 : 2)
        if (x + pw > ax1 - U * 0.8) break
        products.push({ x: x + pw / 2, row: r, kind, w: pw, h: ph, stock: 1, at: -10, seed: i + r * 31 })
        x += pw + U * (0.5 + ((i * 3) % 2) * 0.4)
        i++
      }
    }
  }

  return {
    init(w, h, framed) {
      const side = !framed && w > 600
      const aw = Math.min(w * (framed ? 0.8 : side ? 0.74 : 0.9), h * 1.3)
      const cx = w * (framed ? 0.5 : side ? 0.55 : 0.5)
      ax0 = cx - aw / 2
      ax1 = cx + aw / 2
      U = Math.min(h * 0.8, aw * 0.68) / 16
      floor = h / 2 + U * 9
      rowY = [floor - U * 13.5, floor - U * 9.2, floor - U * 5]
      place()
      marks = []
      haul = []
      cart = cx - aw * 0.15
      cartV = 0
      dir = 1
      pickT = 0
      checkout = 0
      rowPick = 1
      // a shop already under way: a few things in the cart, a couple gone from the shelves
      for (let i = 0; i < 4; i++) haul.push({ x: 0, y: 0, x0: 0, y0: 0, k: 1, col: KINDS[i % 3] })
      for (const p of products) if (p.seed % 11 === 3) p.stock = 0
    },

    frame(pen, _w, _h, pointer, dt, t) {
      const { ctx, glow } = pen
      const hand = pointer.inside
      const cw = U * 3.4 // the cart's basket width

      // ---- the cart: the hand pulls it; alone, it rolls the aisle end to end and back
      let target: number
      if (hand) {
        target = clamp(pointer.x, ax0 + cw, ax1 - cw)
        rowPick = pointer.y < rowY[0] + U * 2 ? 0 : pointer.y < rowY[1] + U * 2 ? 1 : 2
      } else {
        target = dir > 0 ? ax1 - cw : ax0 + cw
        if (Math.abs(cart - target) < U * 0.5 && checkout <= 0) {
          dir = -dir
          if (dir < 0) checkout = 1 // the right end is the register
        }
        rowPick = 1 + Math.round(Math.sin(t * 0.37))
      }
      const wantV = clamp((target - cart) / (U * 6), -1, 1) * U * (hand ? 14 : 5.5)
      cartV += (wantV - cartV) * Math.min(1, dt * 4)
      cart += cartV * dt
      const moving = Math.abs(cartV) / (U * 5.5)

      // ---- the shelves and their uprights
      const shelf = new Path2D()
      const under = new Path2D()
      for (const y of rowY) {
        shelf.moveTo(ax0, y)
        shelf.lineTo(ax1, y)
        under.moveTo(ax0, y + U * 0.35)
        under.lineTo(ax1, y + U * 0.35)
      }
      pen.glass(shelf, 0.34, 3.5)
      pen.glass(under, 0.14, 1.5)
      const posts = new Path2D()
      for (const x of [ax0, (ax0 + ax1) / 2, ax1]) {
        posts.moveTo(x, rowY[0] - U * 4.2)
        posts.lineTo(x, floor)
      }
      pen.glass(posts, 0.26, 3)
      pen.glass(P.line(ax0 - U, floor, ax1 + U, floor), 0.3, 3)
      // the strip lights under the top rail
      pen.neon(P.line(ax0 + U, rowY[0] - U * 4.2, ax1 - U, rowY[0] - U * 4.2), NC, 0.12, 1.2)

      // ---- the cart's light: a cone up from its handle, sweeping the shelves
      const lampX = cart + dir * cw * 0.45
      const lampY = floor - U * 3.2
      const beam = U * 7
      {
        const g = glow.createRadialGradient(lampX, lampY, 0, lampX, lampY, beam * 1.6)
        g.addColorStop(0, rgba(NA, 0.22))
        g.addColorStop(1, rgba(NA, 0))
        glow.fillStyle = g
        glow.fillRect(lampX - beam * 1.6, lampY - beam * 1.6, beam * 3.2, beam * 3.2)
      }

      // ---- the products: glass, lit as the beam passes, now and then one into the cart
      pickT -= dt
      let picked = false
      for (const p of products) {
        const y = rowY[p.row]
        if (p.stock < 1) {
          // restocked once the cart has moved on
          if (Math.abs(p.x - cart) > beam * 1.5 && Math.random() < dt * 0.4) {
            p.stock = 1
            p.at = t
          } else continue
        }
        const on = p.at < 0 ? 1 : strike(t - p.at, p.seed)
        const d = Math.hypot(p.x - lampX, y - U - lampY)
        const lit = clamp(1 - d / beam) * (p.row === rowPick ? 1 : 0.55)
        let shape: Path2D
        const col = KINDS[p.kind]
        if (p.kind === 0) shape = P.rrect(p.x - p.w / 2, y - p.h, p.w, p.h, U * 0.15)
        else if (p.kind === 1) {
          shape = new Path2D()
          const nw = p.w * 0.42
          shape.moveTo(p.x - p.w / 2, y)
          shape.lineTo(p.x - p.w / 2, y - p.h * 0.62)
          shape.quadraticCurveTo(p.x - p.w / 2, y - p.h * 0.78, p.x - nw, y - p.h * 0.8)
          shape.lineTo(p.x - nw, y - p.h)
          shape.lineTo(p.x + nw, y - p.h)
          shape.lineTo(p.x + nw, y - p.h * 0.8)
          shape.quadraticCurveTo(p.x + p.w / 2, y - p.h * 0.78, p.x + p.w / 2, y - p.h * 0.62)
          shape.lineTo(p.x + p.w / 2, y)
          shape.closePath()
        } else {
          shape = P.rrect(p.x - p.w / 2, y - p.h, p.w, p.h, U * 0.5)
        }
        ctx.fillStyle = rgba(WHITE, 0.025 * on)
        ctx.fill(shape)
        pen.glass(shape, 0.32 * on, 2)
        if (p.kind === 2) pen.glass(P.line(p.x - p.w * 0.4, y - p.h * 0.78, p.x + p.w * 0.4, y - p.h * 0.78), 0.3 * on, 1.5)
        if (p.kind === 0) pen.glass(P.line(p.x - p.w * 0.3, y - p.h * 0.5, p.x + p.w * 0.3, y - p.h * 0.5), 0.2 * on, 1.2)
        if (lit > 0.01) {
          pen.neon(shape, col, lit * on * 0.9, 1.4)
          pen.wash(shape, col, lit * on * 0.05)
        }
        // one rides into the cart: the nearest lit product on the shelf being shopped
        if (!picked && pickT <= 0 && lit > 0.55 && p.row === rowPick && (moving > 0.15 || hand)) {
          picked = true
          pickT = hand ? 0.5 : 0.75
          p.stock = 0
          marks.push({ x: p.x, y: y - p.h / 2, x0: p.x, y0: y - p.h / 2, k: 0, col })
        }
      }

      // ---- the cart: a glass basket on wheels, the lamp on its handle, the haul inside
      const bx = cart - cw / 2
      const by = floor - U * 3
      const basket = new Path2D()
      basket.moveTo(bx - U * 0.3, by)
      basket.lineTo(bx + cw + U * 0.3, by)
      basket.lineTo(bx + cw, floor - U * 0.9)
      basket.lineTo(bx, floor - U * 0.9)
      basket.closePath()
      ctx.fillStyle = rgba(WHITE, 0.03)
      ctx.fill(basket)
      pen.glass(basket, 0.4, 2.6)
      const mesh = new Path2D()
      for (let i = 1; i < 4; i++) {
        mesh.moveTo(bx + (cw * i) / 4, by)
        mesh.lineTo(bx + (cw * i) / 4, floor - U * 0.9)
      }
      mesh.moveTo(bx - U * 0.1, by + (floor - U * 0.9 - by) * 0.5)
      mesh.lineTo(bx + cw + U * 0.1, by + (floor - U * 0.9 - by) * 0.5)
      pen.glass(mesh, 0.16, 1.2)
      // the handle, with the lamp on top
      const hx = cart + dir * cw * 0.5
      const handle = new Path2D()
      handle.moveTo(hx, by)
      handle.lineTo(hx + dir * U * 0.5, by - U * 1.4)
      handle.lineTo(hx + dir * U * 1.1, by - U * 1.4)
      pen.glass(handle, 0.4, 2.6)
      pen.fill(P.circle(lampX, lampY, U * 0.28), NA, 0.9 + 0.1 * Math.sin(t * 8))
      pen.neon(P.circle(lampX, lampY, U * 0.6), NA, 0.35, 1)
      // the wheels, turning
      const spin = cart / (U * 0.4)
      for (const wx of [bx + U * 0.6, bx + cw - U * 0.6]) {
        pen.glass(P.circle(wx, floor - U * 0.4, U * 0.4), 0.4, 2)
        pen.glass(P.line(wx + Math.cos(spin) * U * 0.3, floor - U * 0.4 + Math.sin(spin) * U * 0.3, wx - Math.cos(spin) * U * 0.3, floor - U * 0.4 - Math.sin(spin) * U * 0.3), 0.3, 1)
      }
      // the haul: marks stacked in the basket
      haul.forEach((m, i) => {
        const col = i % 4
        const row = Math.floor(i / 4)
        m.x = bx + U * 0.5 + col * (cw - U) / 3.4
        m.y = floor - U * 1.3 - row * U * 0.6
        pen.fill(P.rect(m.x - U * 0.25, m.y - U * 0.22, U * 0.5, U * 0.44), m.col, 0.8 * (1 - checkout * 0.8))
      })
      // marks flying from the shelf into the basket
      marks = marks.filter(m => m.k < 1)
      for (const m of marks) {
        m.k = Math.min(1, m.k + dt / 0.55)
        const e = easeIn(m.k)
        const tx = cart
        const ty = floor - U * 1.6
        const px = m.x
        const py = m.y
        m.x = m.x0 + (tx - m.x0) * e
        m.y = m.y0 + (ty - m.y0) * e - Math.sin(m.k * Math.PI) * U * 2
        pen.streak(px - (m.x - px) * 4, py - (m.y - py) * 4, m.x, m.y, m.col, 0.9, 1.6)
        pen.fill(P.rect(m.x - U * 0.25, m.y - U * 0.22, U * 0.5, U * 0.44), m.col, 1)
        if (m.k >= 1) {
          haul.push({ ...m })
          if (haul.length > 12) haul.shift()
        }
      }

      // ---- checkout at the aisle's end: the basket clears in a flash of the second colour
      if (checkout > 0) {
        checkout = Math.max(0, checkout - dt * 1.4)
        pen.neon(basket, NB, checkout * 0.9, 1.8)
        const g = glow.createRadialGradient(cart, by, 0, cart, by, U * 5)
        g.addColorStop(0, rgba(NB, 0.35 * checkout))
        g.addColorStop(1, rgba(NB, 0))
        glow.fillStyle = g
        glow.fillRect(cart - U * 5, by - U * 5, U * 10, U * 10)
        if (checkout < 0.5 && haul.length) haul = []
      }
      // the register at the aisle's right end
      pen.glass(P.rrect(ax1 + U * 0.3, floor - U * 2.4, U * 1.2, U * 2.4, 2), 0.3, 2)
      pen.fill(P.circle(ax1 + U * 0.9, floor - U * 2.9, U * 0.2), NB, 0.5 + 0.5 * (Math.sin(t * 3) > 0.6 ? 1 : 0))
    },
  }
}
