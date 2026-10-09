import { NA, NB, NC, P, WHITE, mix, rgba, strike, type RGB, type Scene } from './kit'

interface Card {
  stage: number
  /** when it arrived in its stage (orders the column) */
  order: number
  x: number
  y: number
  /** a move to the next stage: 0 → 1 (-1 settled), from where it started */
  move: number
  fx: number
  fy: number
  /** lit (a move, an arrival, the cursor), cools */
  heat: number
  /** the cursor's dwell on it (s): a follow-up sends it on */
  dwell: number
  born: number
  /** leaving the board (paid, then filed away): 1 → 0 */
  fade: number
}

const STAGES = ['LEAD', 'QUOTE', 'JOB', 'PAID']
const COLS: RGB[] = [NB, NC, NA, mix(NA, WHITE, 0.35)]
const FONT = (px: number) => `700 ${px}px 'Schibsted Grotesk Variable', 'Schibsted Grotesk', system-ui, sans-serif`

/*
 * CUSTOM CRM — the pipeline. Four glass lanes, your stages (lead, quote, job,
 * paid), and the jobs moving through them: every so often a card lights in
 * the next stage's colour and slides across, the paid column flashes as a job
 * lands, and new leads strike on at the start. Hold the cursor on a card for
 * a moment and it gets its follow-up: it moves on.
 */
export function pipeline(): Scene {
  let cards: Card[] = []
  let bx = 0
  let by = 0
  let cw = 0
  let gap = 0
  let head = 0
  let ch = 0
  let cgap = 0
  let bh = 0
  let next = 1.2
  let clock = 0

  const laneX = (i: number) => bx + i * (cw + gap)
  const slot = (c: Card) => {
    const peers = cards.filter(o => o.stage === c.stage && o.fade === 1).sort((a, b) => a.order - b.order)
    const k = Math.max(0, peers.indexOf(c))
    return [laneX(c.stage) + cw * 0.08, by + head + k * (ch + cgap)] as const
  }
  const spawn = (stage: number, t: number, at = t) => {
    const c: Card = { stage, order: at, x: 0, y: 0, move: -1, fx: 0, fy: 0, heat: 0, dwell: 0, born: t, fade: 1 }
    cards.push(c)
    const [x, y] = slot(c)
    c.x = x
    c.y = y
    return c
  }
  /** a lane holds four (Paid files its oldest away instead) */
  const roomIn = (stage: number) => stage === STAGES.length - 1 || cards.filter(o => o.stage === stage && o.fade === 1).length < 4
  const advance = (c: Card) => {
    if (c.stage >= STAGES.length - 1 || c.move >= 0 || !roomIn(c.stage + 1)) return
    c.fx = c.x
    c.fy = c.y
    c.stage++
    c.order = clock
    c.move = 0
    c.heat = 1
    c.dwell = 0
    // the paid lane keeps three: the oldest is filed away, and a new lead comes in
    const paid = cards.filter(o => o.stage === STAGES.length - 1 && o.fade === 1)
    if (c.stage === STAGES.length - 1 && paid.length > 3) {
      paid.sort((a, b) => a.order - b.order)[0].fade = 0.999
      spawn(0, clock)
    }
  }

  return {
    init(w, h, framed) {
      // (beside the copy on desktop the hero's scrim darkens the art's left edge: the board sits a
      // little right of centre there; centred in a band or above the copy on a phone)
      const side = !framed && w > 600
      const bw = Math.min(w * (framed ? 0.8 : side ? 0.76 : 0.86), 700)
      gap = bw * 0.035
      cw = (bw - gap * 3) / 4
      ch = cw * 0.5
      cgap = ch * 0.28
      head = ch * 0.95
      bh = Math.min(h * 0.82, head + 4 * (ch + cgap) + cgap)
      bx = (w - bw) / 2 + (side ? w * 0.07 : 0)
      by = (h - bh) / 2
      cards = []
      clock = 0
      next = 1.2
      // a board already in motion
      ;[3, 3, 2, 2].forEach((n, s) => {
        for (let k = 0; k < n; k++) spawn(s, -10, -10 + k)
      })
    },

    frame(pen, _w, _h, pointer, dt, t) {
      clock = t
      const { ctx } = pen
      const r = Math.min(10, ch * 0.18)

      // the lanes
      STAGES.forEach((name, i) => {
        const x = laneX(i)
        pen.glass(P.rrect(x, by, cw, bh, r * 1.4), 0.22, 3)
        pen.wash(P.rrect(x, by, cw, bh, r * 1.4), COLS[i], 0.018)
        const fs = Math.max(9, Math.round(cw * 0.075))
        ctx.font = FONT(fs)
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = rgba(COLS[i], 0.85)
        ctx.fillText(name.split('').join(' '), x + cw * 0.08, by + head * 0.48)
        const n = cards.filter(c => c.stage === i && c.fade === 1).length
        ctx.fillStyle = rgba(WHITE, 0.32)
        ctx.textAlign = 'right'
        ctx.fillText(String(n), x + cw * 0.92, by + head * 0.48)
      })

      // the board moves on its own: the earliest card in the busiest stage goes next
      next -= dt
      if (next <= 0) {
        const open = cards.filter(c => c.stage < STAGES.length - 1 && c.move < 0 && c.fade === 1 && roomIn(c.stage + 1))
        if (open.length) {
          open.sort((a, b) => a.order - b.order)
          advance(open[Math.floor(Math.random() * Math.min(3, open.length))])
        }
        next = 1.3 + Math.random() * 0.8
      }

      // the cursor: dwell on a card and it gets its follow-up
      const cw2 = cw * 0.84
      let hovered: Card | null = null
      if (pointer.inside)
        for (const c of cards)
          if (c.fade === 1 && pointer.x > c.x && pointer.x < c.x + cw2 && pointer.y > c.y && pointer.y < c.y + ch) hovered = c
      for (const c of cards) {
        if (c === hovered && c.move < 0) {
          c.dwell += dt
          c.heat = Math.max(c.heat, 0.65)
          if (c.dwell > 0.7) advance(c)
        } else c.dwell = Math.max(0, c.dwell - dt * 2)
      }

      // place and draw the cards
      for (const c of cards) {
        const [tx, ty] = slot(c)
        if (c.move >= 0) {
          c.move = Math.min(1, c.move + dt / 0.85)
          const k = c.move < 0.5 ? 4 * c.move ** 3 : 1 - (-2 * c.move + 2) ** 3 / 2
          const lift = Math.sin(Math.PI * c.move) * ch * 0.6
          const px = c.x
          const py = c.y
          c.x = c.fx + (tx - c.fx) * k
          c.y = c.fy + (ty - c.fy) * k - lift
          if (k > 0.05) pen.streak(px - (c.x - px) * 6, py - (c.y - py) * 6 + ch / 2, c.x, c.y + ch / 2, COLS[c.stage], 0.7, 1.6)
          if (c.move >= 1) {
            c.move = -1
            c.heat = 1
          }
        } else {
          c.x += (tx - c.x) * Math.min(1, dt * 7)
          c.y += (ty - c.y) * Math.min(1, dt * 7)
        }
        if (c.fade < 1) c.fade = Math.max(0, c.fade - dt * 1.4)
        const on = c.fade * Math.min(1, strike(t - c.born + (c.born < 0 ? 1 : 0), c.order) + (c.born < 0 ? 1 : 0))
        if (on <= 0.01) continue
        const shape = P.rrect(c.x, c.y, cw2, ch, r)
        const col = COLS[c.stage]
        ctx.fillStyle = rgba(WHITE, 0.035 * on)
        ctx.fill(shape)
        pen.glass(shape, 0.32 * on, 2.4)
        if (c.heat > 0.02) {
          pen.neon(shape, col, c.heat * on, 1.6)
          pen.wash(shape, col, 0.06 * c.heat * on)
        }
        // its record: a contact dot and two lines
        const pad = ch * 0.22
        pen.fill(P.circle(c.x + pad + ch * 0.12, c.y + ch * 0.36, ch * 0.11), col, (0.35 + 0.65 * c.heat) * on)
        ctx.fillStyle = rgba(WHITE, 0.22 * on)
        ctx.fillRect(c.x + pad + ch * 0.36, c.y + ch * 0.3, cw2 * 0.45, Math.max(1.5, ch * 0.08))
        ctx.fillStyle = rgba(WHITE, 0.12 * on)
        ctx.fillRect(c.x + pad, c.y + ch * 0.62, cw2 * 0.62, Math.max(1.5, ch * 0.07))
        // the cursor's follow-up filling in along the bottom edge
        if (c.dwell > 0.02) pen.neon(P.line(c.x + r, c.y + ch - 1, c.x + r + (cw2 - 2 * r) * Math.min(1, c.dwell / 0.7), c.y + ch - 1), NA, 0.9, 1.4)
        // a job landing in Paid flashes once
        if (c.stage === STAGES.length - 1 && c.move < 0 && c.heat > 0.6) pen.neon(P.rrect(c.x - 4, c.y - 4, cw2 + 8, ch + 8, r + 4), col, (c.heat - 0.6) * 2.2 * on, 1.2)
        c.heat = Math.max(0, c.heat - dt * 0.8)
      }
      cards = cards.filter(c => c.fade > 0)
    },
  }
}
