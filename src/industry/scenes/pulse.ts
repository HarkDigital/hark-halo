import { NA, NB, NC, P, WHITE, rgba, strike, type RGB, type Scene } from '../../service/scenes/kit'

interface Slot {
  /** when it booked (-1: open; a time before the page opened for the ones booked already) */
  at: number
  /** when it cleared (-1: not fading) */
  off: number
  c: RGB
}

const COLS = 7
const ROWS = 8
const DAYS = 'MTWTFSS'
const FONT = "'Schibsted Grotesk Variable', 'Schibsted Grotesk', system-ui, sans-serif"

/** one heartbeat (P, QRS, T) over phase 0..1, the R peak at 0.3, in units of its amplitude */
const ecg = (p: number) => {
  p -= Math.floor(p)
  if (p > 0.1 && p < 0.2) return 0.14 * Math.sin(((p - 0.1) / 0.1) * Math.PI)
  if (p > 0.25 && p < 0.28) return (-0.14 * (p - 0.25)) / 0.03
  if (p >= 0.28 && p < 0.3) return -0.14 + (1.14 * (p - 0.28)) / 0.02
  if (p >= 0.3 && p < 0.32) return 1 - (1.34 * (p - 0.3)) / 0.02
  if (p >= 0.32 && p < 0.36) return -0.34 + (0.34 * (p - 0.32)) / 0.04
  if (p > 0.46 && p < 0.62) return 0.28 * Math.sin(((p - 0.46) / 0.16) * Math.PI)
  return 0
}

/*
 * HEALTHCARE — a heartbeat trace sweeping left to right in neon over a week's
 * appointment grid in clear glass, drawn the way a monitor draws it: a
 * white-hot head writes the trace, a gap of erased line runs ahead of it, and
 * the old trace waits beyond. On every beat a slot books (strikes on in the
 * second colour); a full week frees its oldest slots. The hand's height sets
 * the trace's amplitude, its x is where the beat strikes, and the slot under
 * it books in the third colour.
 */
export function pulse(): Scene {
  let slots: Slot[] = []
  let gx = 0
  let gy = 0
  let gw = 0
  let gh = 0
  let cw = 0
  let ch = 0
  /** the trace: one sample a pixel from tx0, the head writing at `head` */
  let tx0 = 0
  let ys: number[] = []
  let head = 0
  let speed = 0
  let beatW = 0
  let amp = 1
  let x0 = 0
  /** the last strike's flash, and where it struck */
  let beat = 0
  let bx = 0
  let by = 0
  let mid = 0.52
  let font = ''
  let mark = new Path2D()

  const phase = (x: number) => (x - x0) / beatW + 0.3
  const booked = () => slots.reduce((n, s) => n + (s.at !== -1 ? 1 : 0), 0)
  const book = (i: number, c: RGB, t: number) => {
    const s = slots[i]
    if (s.at !== -1) return
    s.at = t
    s.off = -1
    s.c = c
  }

  return {
    init(w, h, framed) {
      mid = framed ? 0.5 : 0.52
      gw = Math.min(w * 0.72, 560, h * 1.1)
      cw = gw / COLS
      ch = Math.min(cw * 0.78, (h * (framed ? 0.56 : 0.62)) / ROWS)
      gh = ch * ROWS
      gx = w * mid - gw / 2
      gy = h * 0.5 - gh / 2 + ch * 0.25
      font = `700 ${Math.round(Math.max(9, cw * 0.17))}px ${FONT}`
      // a week part way through its bookings
      slots = Array.from({ length: COLS * ROWS }, () => ({ at: Math.random() < 0.3 ? -5 - Math.random() * 20 : -1, off: -1, c: NB }))
      beatW = gw * 0.3
      amp = 1
      x0 = gx + gw * 0.55
      tx0 = gx - cw * 0.35
      const n = Math.ceil(gw + cw * 0.7)
      ys = Array.from({ length: n }, (_, i) => ecg(phase(tx0 + i)))
      head = 0
      speed = n / 3.6
      beat = 0
      mark = new Path2D()
      for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) mark.rect(gx + c * cw + cw * 0.12, gy + r * ch + ch * 0.17, cw * 0.76, ch * 0.66)
    },

    frame(pen, w, h, pointer, dt, t) {
      const hand = pointer.inside
      // the hand's height is the amplitude, its x where the beat strikes; idle, a gentle breath
      const ampT = hand ? 0.5 + 1.1 * Math.min(1, Math.max(0, 1 - pointer.y / h)) : 1 + Math.sin(t * 0.7) * 0.1
      const x0T = hand ? Math.min(gx + gw, Math.max(gx, pointer.x)) : gx + gw * 0.55 + Math.sin(t * 0.23) * gw * 0.08
      amp += (ampT - amp) * Math.min(1, dt * 4)
      x0 += (x0T - x0) * Math.min(1, dt * 4)

      const base = gy + gh * 0.5
      const A = gh * 0.27 * amp

      // the head writes a sample a pixel; crossing an R peak is a beat
      const n = ys.length
      const from = Math.floor(head)
      head += speed * dt
      if (head >= n) head -= n
      let i = from
      let prev = phase(tx0 + i)
      for (let k = 0; k < speed * dt + 1 && k < n; k++) {
        i = (from + k) % n
        const p = phase(tx0 + i)
        ys[i] = ecg(p)
        const f = Math.floor(p)
        if (prev < f + 0.3 && p >= f + 0.3 && Math.abs(p - prev) < 0.5) {
          beat = 1
          bx = tx0 + i
          by = base - A
          // a booking lands on the beat; a full week frees its oldest few
          const open = slots.map((s, j) => (s.at === -1 ? j : -1)).filter(j => j >= 0)
          if (open.length) book(open[Math.floor(Math.random() * open.length)], NB, t)
          if (booked() > slots.length * 0.74) {
            const old = slots
              .map((s, j) => ({ s, j }))
              .filter(o => o.s.at !== -1)
              .sort((a, b) => a.s.at - b.s.at)
              .slice(0, 5)
            for (const o of old) {
              o.s.at = -1
              o.s.off = t
            }
          }
        }
        prev = p
      }

      // the slot under the hand books
      if (hand) {
        const c = Math.floor((pointer.x - gx) / cw)
        const r = Math.floor((pointer.y - gy) / ch)
        if (c >= 0 && c < COLS && r >= 0 && r < ROWS) book(c * ROWS + r, NC, t)
      }

      // the week: day initials, the slots in glass, the booked ones lit
      pen.ctx.font = font
      pen.ctx.textAlign = 'center'
      pen.ctx.textBaseline = 'middle'
      pen.ctx.fillStyle = rgba(WHITE, 0.45)
      for (let c = 0; c < COLS; c++) pen.ctx.fillText(DAYS[c], gx + c * cw + cw / 2, gy - ch * 0.4)
      pen.glass(mark, 0.13, 2.4)
      for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
          const s = slots[c * ROWS + r]
          let on = 0
          if (s.at !== -1) on = strike(t - s.at, c * ROWS + r)
          else if (s.off >= 0) on = Math.max(0, 1 - (t - s.off) / 0.8)
          if (on > 0) pen.box(gx + c * cw + cw * 0.12, gy + r * ch + ch * 0.17, cw * 0.76, ch * 0.66, s.c, on * 0.55)
        }
      }
      // where the beat will strike
      if (hand) pen.glass(P.line(x0, gy, x0, gy + gh), 0.28, 2)

      // the trace: the old line beyond the erased gap, the fresh run up to the head
      const GAP = Math.round(n * 0.1)
      const FRESH = Math.round(n * 0.28)
      const hi = Math.floor(head)
      const old = new Path2D()
      const fresh = new Path2D()
      let pen0 = false
      let pen1 = false
      for (let k = GAP; k < n; k++) {
        const j = (hi + k) % n
        const x = tx0 + j
        const y = base - ys[j] * A
        const p = k >= n - FRESH ? fresh : old
        const was = p === fresh ? pen1 : pen0
        if (!was || j === 0) p.moveTo(x, y)
        else p.lineTo(x, y)
        if (p === fresh) pen1 = true
        else pen0 = true
      }
      pen.neon(old, NA, 0.42, 1.6)
      pen.neon(fresh, NA, 0.95, 2)
      const hx = tx0 + hi
      const hy = base - ys[hi] * A
      pen.fill(P.circle(hx, hy, 3.2), NA, 1)
      pen.neon(P.circle(hx, hy, 7 + Math.sin(t * 7) * 1.2), NA, 0.3, 1.2)

      // the strike's flash
      if (beat > 0.02) {
        pen.neon(P.circle(bx, by, 5 + (1 - beat) * 34), NA, beat * 0.7, 1.4)
        pen.fill(P.circle(bx, by, 2.4), WHITE, beat)
      }
      beat = Math.max(0, beat - dt * 2.2)
    },
  }
}
