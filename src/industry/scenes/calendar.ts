import { NA, NB, NC, P, TAU, WHITE, rgba, strike, type RGB, type Scene } from '../../service/scenes/kit'

interface Block {
  cell: number
  /** when it landed, and when it cleared (-1: not fading) */
  at: number
  off: number
  /** its width, 0..1 of the day */
  len: number
  c: RGB
}

const COLS = 7
const ROWS = 5
const DAYS = 'MTWTFSS'
/** the month starts on a Wednesday and has 30 days */
const FIRST = 2
const LAST = 30
const TODAY = 14
const FONT = "'Schibsted Grotesk Variable', 'Schibsted Grotesk', system-ui, sans-serif"
/** the signature: signed, held, faded, a pause, again */
const SIGN = 2.4
const HOLD = 2.8
const FADE = 0.6
const CYCLE = SIGN + HOLD + FADE + 0.8

/*
 * PROFESSIONAL SERVICES — a desk calendar's month in clear glass, its days
 * numbered, with a signature line beneath. Appointments land as neon blocks in
 * the days (the second colour) until the month is full and clears, and a
 * signature writes itself in tube along the line, holds, clears and signs
 * again. The hand books the day it is over (in the third colour) and bends the
 * signature's flourish toward it.
 */
export function calendar(): Scene {
  let blocks: Block[] = []
  let grid = new Path2D()
  let gx = 0
  let gy = 0
  let cw = 0
  let ch = 0
  let acc = 0
  let next = 0.5
  let lastCell = -1
  let lastHand = -9
  let fontDay = ''
  let fontInitial = ''
  /** the signature's line and the scribble along it (points), and the flourish's end */
  let lx = 0
  let ly = 0
  let len = 0
  let hs = 0
  let scribble: [number, number][] = []
  let fx = 0
  let fy = 0

  const dayOf = (cell: number) => cell - FIRST + 1
  const isDay = (cell: number) => dayOf(cell) >= 1 && dayOf(cell) <= LAST
  const count = (cell: number) => blocks.reduce((n, b) => n + (b.cell === cell && b.off < 0 ? 1 : 0), 0)
  const land = (cell: number, c: RGB, t: number) => {
    if (count(cell) >= 3) return
    blocks.push({ cell, at: t, off: -1, len: 0.45 + Math.random() * 0.35, c })
  }
  const landSomewhere = (t: number) => {
    const open = []
    for (let i = 0; i < COLS * ROWS; i++) if (isDay(i) && count(i) < 3) open.push(i)
    if (open.length) land(open[Math.floor(Math.random() * open.length)], NB, t)
  }

  return {
    init(w, h, framed) {
      cw = Math.min((w * 0.72) / COLS, 80, (h * 0.8) / (ROWS * 0.72 + 2.1))
      ch = cw * 0.72
      const total = cw * 0.55 + ch * ROWS + cw * 0.5 + cw * 1.05
      gx = w * (framed ? 0.5 : 0.52) - (cw * COLS) / 2
      gy = h / 2 - total / 2 + cw * 0.55
      fontDay = `600 ${Math.round(Math.max(8, cw * 0.16))}px ${FONT}`
      fontInitial = `700 ${Math.round(Math.max(8, cw * 0.15))}px ${FONT}`
      grid = new Path2D()
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (isDay(r * COLS + c)) grid.rect(gx + c * cw + 1, gy + r * ch + 1, cw - 2, ch - 2)
      // a month part way through its bookings
      blocks = []
      for (let i = 0; i < 14; i++) landSomewhere(-9 - i)
      acc = 0
      lastCell = -1

      // the signature line, and the scribble: a trochoid that loops back on itself like cursive,
      // tall for the capital and once more in the middle
      lx = gx + cw * 0.4
      ly = gy + ch * ROWS + cw * 0.5 + cw * 0.78
      len = cw * COLS - cw * 0.8
      hs = cw * 0.75
      scribble = []
      const N = 120
      for (let i = 0; i <= N; i++) {
        const k = i / N
        const th = k * TAU * 6.5
        const env = 0.28 + 0.72 * Math.exp(-(((k - 0.05) / 0.07) ** 2)) + 0.55 * Math.exp(-(((k - 0.56) / 0.05) ** 2))
        scribble.push([lx + len * 0.68 * k + len * 0.026 * Math.sin(th) * (0.5 + env), ly - hs * env * (1 - Math.cos(th)) * 0.5])
      }
      fx = lx + len * 0.96
      fy = ly + hs * 0.08
    },

    frame(pen, _w, _h, pointer, dt, t) {
      const hand = pointer.inside
      // appointments land; a full month clears
      acc += dt
      if (acc > next) {
        acc = 0
        next = 0.35 + Math.random() * 0.5
        if (blocks.filter(b => b.off < 0).length > 46) for (const b of blocks) if (b.off < 0) b.off = t
        else landSomewhere(t)
      }
      // the hand books the day it is over (once per visit; a touch books again)
      if (hand) {
        const c = Math.floor((pointer.x - gx) / cw)
        const r = Math.floor((pointer.y - gy) / ch)
        const cell = c >= 0 && c < COLS && r >= 0 && r < ROWS ? r * COLS + c : -1
        if (cell >= 0 && isDay(cell) && (cell !== lastCell || (pointer.down && t - lastHand > 0.5))) {
          land(cell, NC, t)
          lastHand = t
        }
        lastCell = cell
      } else lastCell = -1

      // the month: initials, the days in glass with their numerals, today's diamond
      pen.ctx.textAlign = 'center'
      pen.ctx.textBaseline = 'middle'
      pen.ctx.font = fontInitial
      pen.ctx.fillStyle = rgba(WHITE, 0.45)
      for (let c = 0; c < COLS; c++) pen.ctx.fillText(DAYS[c], gx + c * cw + cw / 2, gy - cw * 0.26)
      pen.glass(grid, 0.16, 2.4)
      pen.ctx.font = fontDay
      pen.ctx.textAlign = 'left'
      pen.ctx.textBaseline = 'top'
      pen.ctx.fillStyle = rgba(WHITE, 0.38)
      for (let i = 0; i < COLS * ROWS; i++) {
        if (!isDay(i)) continue
        pen.ctx.fillText(String(dayOf(i)), gx + (i % COLS) * cw + cw * 0.1, gy + Math.floor(i / COLS) * ch + ch * 0.1)
      }
      const td = TODAY + FIRST - 1
      const tx = gx + (td % COLS) * cw + cw * 0.86
      const ty = gy + Math.floor(td / COLS) * ch + ch * 0.2
      pen.fill(P.diamond(tx, ty, cw * 0.09 + Math.sin(t * 3) * 0.6), NA, 0.9)

      // the appointments
      const rows = new Map<number, number>()
      for (const b of blocks) {
        const j = rows.get(b.cell) ?? 0
        rows.set(b.cell, j + 1)
        const on = b.off >= 0 ? Math.max(0, 1 - (t - b.off) / 0.8) : strike(t - b.at, b.cell + j)
        if (on <= 0) continue
        const x = gx + (b.cell % COLS) * cw + cw * 0.1
        const y = gy + Math.floor(b.cell / COLS) * ch + ch * (0.4 + j * 0.19)
        pen.box(x, y, (cw * 0.8) * b.len, ch * 0.13, b.c, on * 0.7)
      }
      blocks = blocks.filter(b => b.off < 0 || t - b.off < 0.8)

      // the signature line, with its x
      pen.glass(P.line(lx - cw * 0.1, ly + hs * 0.06, lx + len + cw * 0.1, ly + hs * 0.06), 0.28, 3)
      const xm = new Path2D()
      xm.moveTo(lx - cw * 0.3, ly - hs * 0.08)
      xm.lineTo(lx - cw * 0.16, ly + hs * 0.06)
      xm.moveTo(lx - cw * 0.16, ly - hs * 0.08)
      xm.lineTo(lx - cw * 0.3, ly + hs * 0.06)
      pen.glass(xm, 0.3, 2)

      // the signature: the scribble, then the flourish, whose end the hand bends toward itself
      let ex = lx + len * 0.96
      let ey = ly + hs * 0.08
      if (hand) {
        const reach = len * 0.45
        const ddx = pointer.x - ex
        const ddy = pointer.y - ey
        const d = Math.hypot(ddx, ddy)
        const k = Math.min(1, reach / Math.max(1, d))
        ex += ddx * k
        ey += ddy * k
      }
      fx += (ex - fx) * Math.min(1, dt * 4)
      fy += (ey - fy) * Math.min(1, dt * 4)
      const ph = t % CYCLE
      const p = Math.min(1, ph / SIGN)
      const on = ph < SIGN + HOLD ? 1 : Math.max(0, 1 - (ph - SIGN - HOLD) / FADE)
      if (on > 0) {
        const sig = new Path2D()
        const main = Math.min(1, p / 0.8)
        const n = scribble.length - 1
        const upto = main * n
        sig.moveTo(scribble[0][0], scribble[0][1])
        let hx = scribble[0][0]
        let hy = scribble[0][1]
        for (let i = 1; i <= Math.floor(upto); i++) sig.lineTo(scribble[i][0], scribble[i][1])
        if (upto < n) {
          const i = Math.floor(upto)
          const f = upto - i
          hx = scribble[i][0] + (scribble[i + 1][0] - scribble[i][0]) * f
          hy = scribble[i][1] + (scribble[i + 1][1] - scribble[i][1]) * f
          sig.lineTo(hx, hy)
        } else {
          // the flourish: a sweep from the scribble's end, up and over to its end point (part way while writing)
          const [sx, sy] = scribble[n]
          const cxp = (sx + fx) / 2 + (fy - sy) * 0.6
          const cyp = (sy + fy) / 2 - (fx - sx) * 0.6
          const q = Math.min(1, (p - 0.8) / 0.2)
          const c1x = sx + (cxp - sx) * q
          const c1y = sy + (cyp - sy) * q
          hx = (1 - q) ** 2 * sx + 2 * (1 - q) * q * cxp + q * q * fx
          hy = (1 - q) ** 2 * sy + 2 * (1 - q) * q * cyp + q * q * fy
          sig.quadraticCurveTo(c1x, c1y, hx, hy)
        }
        pen.tube(sig, NA, on, 2.2)
        if (p < 1) {
          pen.fill(P.circle(hx, hy, 2.6), WHITE, 1)
          pen.neon(P.circle(hx, hy, 6), NA, 0.35, 1.2)
        }
      }
    },
  }
}
