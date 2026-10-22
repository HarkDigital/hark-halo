import { NA, NB, NC, P, TAU, WHITE, rgba, strike, type Scene } from '../../service/scenes/kit'

interface Table {
  x: number
  y: number
  /** its size (a round's radius, a square's half side) */
  r: number
  round: boolean
  seats: number
  /** lit by an order or the hand, cools */
  heat: number
  /** when its order came in (t), for the strike */
  at: number
  /** the hand's dwell on it (s): seated, and after a moment its order goes up */
  dwell: number
}
interface Ticket {
  /** from the table to the pass: 0 → 1, then along the rail */
  k: number
  x0: number
  y0: number
  /** its place on the rail */
  slot: number
  age: number
}

const FONT = (px: number) => `700 ${px}px 'Schibsted Grotesk Variable', 'Schibsted Grotesk', system-ui, sans-serif`
const clamp = (x: number, a = 0, b = 1) => (x < a ? a : x > b ? b : x)
const easeOut = (x: number) => 1 - Math.pow(1 - clamp(x), 3)

/*
 * RESTAURANTS & BARS — the floor, from above. A dining room drawn in glass:
 * rounds and squares with their chairs, a bar down the right edge with its
 * stools and a rail of bottles lit in the third colour, and the pass across
 * the top. Service runs on its own: every few seconds a table's order comes
 * in (it strikes on in the lead colour, a ring of light under it) and its
 * ticket rises to the pass in the second colour, where the tickets rail up
 * and clear in turn; lit tables cool as they are served. The cursor is the
 * host: the table under it is seated (it lights and stays lit while the hand
 * is there, and after a moment its order goes up); a touch counts.
 */
export function floorplan(): Scene {
  let tables: Table[] = []
  let tickets: Ticket[] = []
  let rx = 0, ry = 0, rw = 0, rh = 0, passY = 0, barX = 0, U = 0
  let next = 1.4
  let hovered = -1

  const order = (tb: Table, t: number) => {
    tb.heat = 1
    tb.at = t
    tickets.push({ k: 0, x0: tb.x, y0: tb.y, slot: tickets.length, age: 0 })
  }

  return {
    init(w, h, framed) {
      const side = !framed && w > 600
      rw = Math.min(w * (framed ? 0.74 : side ? 0.68 : 0.84), h * 1.25)
      rh = Math.min(h * (framed ? 0.76 : 0.72), rw * 0.82)
      rx = w * (framed ? 0.5 : side ? 0.55 : 0.5) - rw / 2
      ry = (h - rh) / 2
      U = rh / 100
      passY = ry + U * 12
      barX = rx + rw - U * 15
      tables = []
      tickets = []
      next = 1.4
      hovered = -1
      // the room: three rows, rounds and squares by turns, the floor's grid eased a little
      const cols = 4
      const rows = 3
      const fx0 = rx + U * 12
      const fx1 = barX - U * 15
      const fy0 = passY + U * 20
      const fy1 = ry + rh - U * 12
      for (let j = 0; j < rows; j++)
        for (let i = 0; i < cols; i++) {
          const round = (i + j) % 2 === 0
          const big = round && j === 1
          tables.push({
            x: fx0 + ((fx1 - fx0) * i) / (cols - 1) + (j % 2 ? U * 2 : -U * 2),
            y: fy0 + ((fy1 - fy0) * j) / (rows - 1),
            r: U * (big ? 7 : 5.2),
            round,
            seats: big ? 6 : 4,
            heat: 0,
            at: -10,
            dwell: 0,
          })
        }
      // a service already running: a couple of tables in, a ticket on the pass
      tables[5].heat = 0.7
      tables[5].at = -10
      tables[10].heat = 0.4
      tables[10].at = -10
      tickets.push({ k: 1, x0: tables[5].x, y0: tables[5].y, slot: 0, age: 1 })
    },

    frame(pen, _w, _h, pointer, dt, t) {
      const { ctx, glow } = pen

      // ---- the room: its walls, the pass across the top, the bar down the right
      const room = P.rrect(rx, ry, rw, rh, U * 3)
      ctx.fillStyle = rgba(WHITE, 0.018)
      ctx.fill(room)
      pen.glass(room, 0.3, 4)
      // the pass: a counter under the kitchen window, its rail lit faintly
      pen.glass(P.line(rx + U * 4, passY, barX - U * 6, passY), 0.3, 6)
      pen.neon(P.line(rx + U * 4, passY, barX - U * 6, passY), NB, 0.12, 1.2)
      ctx.font = FONT(Math.max(9, Math.round(U * 3.2)))
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = rgba(WHITE, 0.4)
      ctx.fillText('P A S S', barX - U * 6, passY - U * 5.5)
      // the bar: a long counter, its stools, and a rail of bottles behind it
      const bar = P.rrect(barX, passY + U * 8, U * 8, rh - U * 22, U * 2)
      ctx.fillStyle = rgba(WHITE, 0.025)
      ctx.fill(bar)
      pen.glass(bar, 0.34, 3)
      pen.neon(P.line(barX + U * 1.5, passY + U * 9.5, barX + U * 1.5, ry + rh - U * 15.5), NC, 0.3, 1.2)
      const stools = new Path2D()
      const n = 6
      for (let i = 0; i < n; i++) {
        const y = passY + U * 12 + ((rh - U * 30) * i) / (n - 1)
        stools.moveTo(barX - U * 2.4 + U * 1.6, y)
        stools.arc(barX - U * 2.4, y, U * 1.6, 0, TAU)
      }
      pen.glass(stools, 0.3, 2)
      // the bottles: beads along the back bar, the third colour breathing
      for (let i = 0; i < 9; i++) {
        const y = passY + U * 11 + ((rh - U * 28) * i) / 8
        pen.fill(P.circle(barX + U * 6.2, y, U * 0.8), NC, 0.45 + 0.35 * Math.sin(t * 1.3 + i * 0.9))
      }
      ctx.fillStyle = rgba(WHITE, 0.4)
      ctx.textAlign = 'center'
      ctx.fillText('B A R', barX + U * 4, ry + rh - U * 7)
      // the door
      pen.glass(P.arc(rx + U * 7, ry + rh, U * 6, Math.PI, Math.PI * 1.5), 0.26, 2)

      // ---- service: an order comes in somewhere every few seconds
      next -= dt
      if (next <= 0) {
        const cold = tables.filter(tb => tb.heat < 0.25)
        if (cold.length) order(cold[Math.floor(Math.random() * cold.length)], t)
        next = 2 + Math.random() * 1.6
      }

      // ---- the hand seats a table: the one under it lights and stays lit
      hovered = -1
      if (pointer.inside) {
        let bd = 1e9
        tables.forEach((tb, i) => {
          const d = Math.hypot(pointer.x - tb.x, pointer.y - tb.y)
          if (d < tb.r * 2.2 && d < bd) {
            bd = d
            hovered = i
          }
        })
      }
      tables.forEach((tb, i) => {
        if (i === hovered) {
          if (tb.dwell === 0 && tb.heat < 0.25) tb.at = t
          tb.dwell += dt
          tb.heat = Math.max(tb.heat, 0.9)
          if (tb.dwell > 0.9 && tb.dwell - dt <= 0.9) order(tb, t)
        } else {
          tb.dwell = 0
          tb.heat = Math.max(0, tb.heat - dt * 0.22)
        }
      })

      // ---- the tables: glass, their chairs round them, lit as their orders come in
      for (const tb of tables) {
        const on = tb.heat
        const lit = on > 0.02 ? Math.max(0.3, strike(t - tb.at, tb.x)) : 0
        const top = tb.round ? P.circle(tb.x, tb.y, tb.r) : P.rrect(tb.x - tb.r, tb.y - tb.r, tb.r * 2, tb.r * 2, U * 1.2)
        // the pool of light under a lit table
        if (on > 0.02) {
          const g = glow.createRadialGradient(tb.x, tb.y, 0, tb.x, tb.y, tb.r * 2.6)
          g.addColorStop(0, rgba(NA, 0.3 * on * lit))
          g.addColorStop(1, rgba(NA, 0))
          glow.fillStyle = g
          glow.fillRect(tb.x - tb.r * 2.6, tb.y - tb.r * 2.6, tb.r * 5.2, tb.r * 5.2)
        }
        ctx.fillStyle = rgba(WHITE, 0.03)
        ctx.fill(top)
        pen.glass(top, 0.36, 2.6)
        pen.neon(top, NA, on * lit, 1.6)
        // the chairs: short arcs facing in
        const chairs = new Path2D()
        for (let s = 0; s < tb.seats; s++) {
          const a = (TAU * s) / tb.seats + (tb.round ? 0 : Math.PI / 4)
          const d = tb.r * 1.55
          const cxs = tb.x + Math.cos(a) * d
          const cys = tb.y + Math.sin(a) * d
          chairs.moveTo(cxs + Math.cos(a - 0.9) * U * 2.2, cys + Math.sin(a - 0.9) * U * 2.2)
          chairs.arc(cxs, cys, U * 2.2, a - 0.9, a + 0.9)
        }
        pen.glass(chairs, 0.3, 2)
        if (on > 0.02) pen.neon(chairs, NA, on * lit * 0.45, 1.1)
        // a setting on the table: a plate and a glass
        pen.fill(P.circle(tb.x, tb.y, U * 0.9), NA, 0.25 + on * lit * 0.75)
        if (tb.dwell > 0.02 && tb.dwell < 0.9) pen.neon(P.arc(tb.x, tb.y, tb.r * 1.15, -Math.PI / 2, -Math.PI / 2 + TAU * (tb.dwell / 0.9)), NB, 0.9, 1.4)
      }

      // ---- the tickets: up to the pass, then along the rail, cleared in turn
      const railX = (slot: number) => rx + U * 8 + slot * U * 9
      tickets.forEach((tk, i) => {
        tk.slot += (i - tk.slot) * Math.min(1, dt * 6)
        if (tk.k < 1) {
          tk.k = Math.min(1, tk.k + dt / 0.7)
          const e = easeOut(tk.k)
          const x = tk.x0 + (railX(tk.slot) - tk.x0) * e
          const y = tk.y0 + (passY - U * 2.5 - tk.y0) * e
          const tf = easeOut(tk.k - 0.2)
          pen.streak(tk.x0 + (railX(tk.slot) - tk.x0) * tf, tk.y0 + (passY - U * 2.5 - tk.y0) * tf, x, y, NB, 0.8, 1.4)
          pen.fill(P.rrect(x - U * 2.2, y - U * 1.6, U * 4.4, U * 3.2, 1.5), NB, 0.6 + 0.4 * e)
        } else {
          tk.age += dt
          const x = railX(tk.slot)
          const y = passY - U * 2.5
          const shape = P.rrect(x - U * 2.6, y - U * 2.2, U * 5.2, U * 4.4, 1.5)
          const a = i === 0 ? Math.max(0, 1 - Math.max(0, tk.age - 2.6) / 0.5) : 1
          ctx.fillStyle = rgba(WHITE, 0.04 * a)
          ctx.fill(shape)
          pen.glass(shape, 0.4 * a, 2)
          pen.neon(shape, NB, 0.55 * a, 1.2)
          ctx.fillStyle = rgba(WHITE, 0.3 * a)
          ctx.fillRect(x - U * 1.6, y - U * 0.9, U * 3.2, Math.max(1, U * 0.5))
          ctx.fillRect(x - U * 1.6, y + U * 0.4, U * 2, Math.max(1, U * 0.5))
          pen.glass(P.line(x, passY - U * 0.3, x, passY), 0.4, 1.5)
        }
      })
      // the first ticket on the rail is served after a moment
      if (tickets.length && tickets[0].k >= 1 && tickets[0].age > 3.1) tickets.shift()
      while (tickets.length > 7) tickets.shift()
    },
  }
}
