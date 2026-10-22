import { NA, NB, NC, P, TAU, WHITE, rgba, strike, type RGB, type Scene } from '../../service/scenes/kit'

interface Gift {
  x: number
  y: number
  /** the bend of its flight */
  bend: number
  amount: number
  /** 0 → 1 along its flight */
  p: number
  c: RGB
}
interface Burst {
  a: number
  age: number
}

const FONT = "'Schibsted Grotesk Variable', 'Schibsted Grotesk', system-ui, sans-serif"
const GOAL = 25000
const TOP = -Math.PI / 2
const ease = (p: number) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2)
const dollars = (n: number) => '$' + Math.round(n).toLocaleString('en-US')

/*
 * NONPROFITS — a campaign thermometer bent into a ring: a glass track that
 * fills clockwise from the top in neon as gifts arrive, each gift a bead that
 * flies in from the edge, lands at the head of the fill and nudges it round,
 * with the total raised bent in tube at the centre. At the goal the ring
 * strikes full, holds, and a new campaign begins. The hand gives too: a bead
 * flies from it to the ring every half second (and on a touch), in the third
 * colour, and the ring brightens where the hand is near it.
 */
export function giving(): Scene {
  let gifts: Gift[] = []
  let bursts: Burst[] = []
  let raised = 0
  let shown = 0
  let fill = 0
  let acc = 0
  let next = 0.6
  let lastHand = -9
  /** at the goal: when it was reached (-1: not yet) */
  let full = -1
  let mid = 0.52
  let cx = 0
  let cy = 0
  let R = 0
  let W = 0
  let H = 0

  const head = () => TOP + TAU * fill
  const give = (x: number, y: number, amount: number, c: RGB) => {
    gifts.push({ x, y, bend: (Math.random() - 0.5) * 0.7, amount, p: 0, c })
  }
  /** a gift from the edge of the art, flown part way when `p` is given (the page opens mid-campaign) */
  const arrive = (p = 0) => {
    const side = Math.floor(Math.random() * 4)
    const m = Math.min(W, H) * 0.06
    const x = side === 0 ? m : side === 1 ? W - m : m + Math.random() * (W - m * 2)
    const y = side === 2 ? m : side === 3 ? H - m : m + Math.random() * (H - m * 2)
    give(x, y, 150 + Math.random() * 900, NB)
    gifts[gifts.length - 1].p = p
  }

  return {
    init(w, h, framed) {
      mid = framed ? 0.5 : 0.52
      W = w
      H = h
      cx = w * mid
      cy = h * 0.5
      R = Math.min(w * 0.26, h * 0.3)
      raised = GOAL * 0.38
      shown = raised
      fill = raised / GOAL
      gifts = []
      bursts = []
      for (let i = 0; i < 3; i++) arrive(i * 0.3)
      full = -1
      acc = 0
    },

    frame(pen, _w, _h, pointer, dt, t) {
      const hand = pointer.inside
      // gifts arrive on their own; the hand's come from the hand
      acc += dt
      if (acc > next && full < 0) {
        acc = 0
        next = 0.55 + Math.random() * 0.5
        arrive()
      }
      if (hand && full < 0 && t - lastHand > (pointer.down ? 0.18 : 0.5)) {
        lastHand = t
        give(pointer.x, pointer.y, 400 + Math.random() * 800, NC)
      }

      // the goal: strike full, hold, then a new campaign
      if (full < 0 && raised >= GOAL) full = t
      if (full >= 0 && t - full > 2.6) {
        full = -1
        raised = 0
        gifts = []
      }
      fill += ((Math.min(GOAL, raised) / GOAL) - fill) * Math.min(1, dt * 4)
      shown += (raised - shown) * Math.min(1, dt * 5)
      const flash = full >= 0 ? strike(t - full, 3) : 1

      // the ticks round the ring: lit up to the fill, glass beyond
      const lit = new Path2D()
      const cold = new Path2D()
      for (let i = 0; i < 24; i++) {
        const k = i / 24
        const a = TOP + TAU * k
        const inner = R * (i % 6 === 0 ? 1.12 : 1.16)
        const p = k < fill ? lit : cold
        p.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner)
        p.lineTo(cx + Math.cos(a) * R * 1.22, cy + Math.sin(a) * R * 1.22)
      }
      pen.neon(lit, NA, 0.4 * flash, 1.4)
      pen.glass(cold, 0.18, 3)

      // the ring: a glass track, the fill in neon, the goal's mark at the top
      pen.glass(P.circle(cx, cy, R), 0.16, R * 0.11)
      if (fill > 0.002) pen.neon(P.arc(cx, cy, R, TOP, head()), NA, 0.92 * flash, R * 0.055)
      pen.fill(P.diamond(cx, cy - R, R * 0.07), fill >= 0.999 ? NA : WHITE, 0.8)

      // the hand near the ring brightens the fill there
      if (hand) {
        const dx = pointer.x - cx
        const dy = pointer.y - cy
        const d = Math.hypot(dx, dy)
        const near = 1 - Math.min(1, Math.abs(d - R) / (R * 0.5))
        if (near > 0) {
          const a = Math.atan2(dy, dx)
          let k = (a - TOP) / TAU
          k -= Math.floor(k)
          const a0 = Math.max(TOP, TOP + TAU * (k - 0.07))
          const a1 = Math.min(head(), TOP + TAU * (k + 0.07))
          if (a1 > a0) pen.neon(P.arc(cx, cy, R, a0, a1), NA, near * 0.9, R * 0.075)
        }
        pen.glass(P.circle(pointer.x, pointer.y, R * 0.08), 0.5, 2)
      }

      // the gifts in flight: a bead with a tail, bending in toward the head of the fill
      const ha = head()
      const hx = cx + Math.cos(ha) * R
      const hy = cy + Math.sin(ha) * R
      for (const g of gifts) {
        g.p = Math.min(1, g.p + dt / 1.1)
        const k = ease(g.p)
        const k0 = ease(Math.max(0, g.p - 0.1))
        const mx = (g.x + hx) / 2 - (hy - g.y) * g.bend
        const my = (g.y + hy) / 2 + (hx - g.x) * g.bend
        const at = (q: number) => [(1 - q) ** 2 * g.x + 2 * (1 - q) * q * mx + q * q * hx, (1 - q) ** 2 * g.y + 2 * (1 - q) * q * my + q * q * hy] as const
        const [bx, by] = at(k)
        const [tx, ty] = at(k0)
        pen.streak(tx, ty, bx, by, g.c, 0.9, 2.4)
        pen.fill(P.circle(bx, by, 3), g.c, 1)
        if (g.p >= 1) {
          raised += g.amount
          bursts.push({ a: ha, age: 0 })
        }
      }
      gifts = gifts.filter(g => g.p < 1)
      bursts = bursts.filter(b => b.age < 0.6)
      for (const b of bursts) {
        b.age += dt
        const q = b.age / 0.6
        pen.neon(P.circle(cx + Math.cos(b.a) * R, cy + Math.sin(b.a) * R, 4 + q * R * 0.3), NA, (1 - q) * 0.7, 1.4)
      }

      // the counter
      const font = `600 ${Math.round(R * 0.26)}px ${FONT}`
      pen.text(dollars(shown), cx, cy - R * 0.02, font, NA, 0.95 * flash, 1.6)
      pen.ctx.font = `700 ${Math.round(R * 0.085)}px ${FONT}`
      pen.ctx.textAlign = 'center'
      pen.ctx.textBaseline = 'middle'
      pen.ctx.fillStyle = rgba(WHITE, 0.5)
      pen.ctx.fillText(full >= 0 ? 'GOAL' : 'RAISED', cx, cy + R * 0.24)
    },
  }
}
