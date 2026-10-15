import { NA, NB, P, WHITE, mix, rgba, type Pen, type RGB, type Scene } from '../../service/scenes/kit'
import { TAU, breath, clamp01, hash, hot, wash } from '../../service/stat/pictures/lib'

/*
 * SCOPE: an oscilloscope trace on dark glass. A graticule of glass hairlines
 * (eight by six, the centre lines brighter and ticked) under a whisper of
 * phosphor; on it the TRACE, one signal that is the sum of three sines
 * sliding at their own rates and breathing, drawn full width in the lead
 * light with a white-hot core. The beam that writes it sweeps left to right
 * once a second, a white bead with a comet tail, the phosphor freshest just
 * behind it; and the trace's last third of a second stays on the glass as
 * fading ghosts (the same signal evaluated 0.08, 0.16, 0.24, 0.32 s ago).
 * The hand bends the wave: a gaussian bump under the cursor pulls the trace
 * to the cursor's height, a probe line and a bead mark where it reads, and
 * the trace runs hotter there. Pressing adds a NOTE: a sine whose frequency
 * is the cursor's x (2 to 12 cycles), held while the finger is down, then
 * ringing out over three seconds (three at most); the trace leans toward the
 * second light while notes sound. A soft limiter keeps the trace off the
 * edges however hard it is pulled.
 */
interface Note {
  /** cycles across the box */
  f: number
  born: number
  /** released at (Infinity while held) */
  off: number
  ph: number
}

const GHOST_DT = 0.08
const GHOST_A = [0.4, 0.26, 0.15, 0.07]
const SIGMA = 60
const HIST = 96

/** the three strokes of pen.neon along `p`, the light running a horizontal gradient: alpha `a` at fraction `q` of x0..x1 */
function neonAcross(pen: Pen, p: Path2D, c: RGB, w: number, x0: number, x1: number, stops: [number, number][]) {
  const { ctx, glow } = pen
  const g = glow.createLinearGradient(x0, 0, x1, 0)
  const s = ctx.createLinearGradient(x0, 0, x1, 0)
  const k = ctx.createLinearGradient(x0, 0, x1, 0)
  const hc = hot(c)
  for (const [q, a] of stops) {
    g.addColorStop(q, rgba(c, a))
    s.addColorStop(q, rgba(c, a * 0.8))
    k.addColorStop(q, rgba(hc, a))
  }
  glow.lineWidth = w * 2.6
  glow.strokeStyle = g
  glow.stroke(p)
  ctx.lineWidth = w
  ctx.strokeStyle = s
  ctx.stroke(p)
  ctx.lineWidth = Math.max(0.7, w * 0.4)
  ctx.strokeStyle = k
  ctx.stroke(p)
}

export default function scope(): Scene {
  let W = 1, cy = 0, step = 3, n = 2, lim = 1, lw = 2
  let A1 = 0, A2 = 0, A3 = 0, A4 = 0, AN = 0
  let grid = new Path2D(), axes = new Path2D(), ticks = new Path2D()
  let xs = new Float32Array(2), ys = new Float32Array(2)
  // the hand's bend (x, height), eased, with a short history the ghosts read
  let bx = 0, bh = 0, hand = 0, press = 0
  const hx = new Float32Array(HIST), hh = new Float32Array(HIST), ht = new Float32Array(HIST)
  let head = 0, filled = 0
  let notes: Note[] = []
  let struck = 0
  let wasDown = false
  let rings: { x: number; y: number; born: number }[] = []
  // scratch for the notes while a trace is built
  const nA = new Float64Array(3), nF = new Float64Array(3), nP = new Float64Array(3)

  /** the bend as it was at tt, read from the history */
  const bumpAt = (tt: number): [number, number] => {
    if (filled === 0) return [bx, bh]
    let i = (head - 1 + HIST) % HIST
    if (ht[i] <= tt) return [hx[i], hh[i]]
    for (let c = 1; c < filled; c++) {
      const j = (i - 1 + HIST) % HIST
      if (ht[j] <= tt) {
        const k = ht[i] > ht[j] ? (tt - ht[j]) / (ht[i] - ht[j]) : 1
        return [hx[j] + (hx[i] - hx[j]) * k, hh[j] + (hh[i] - hh[j]) * k]
      }
      i = j
    }
    return [hx[i], hh[i]]
  }
  /** a note's envelope at tt: a quick attack, held, then ringing out over 3 s */
  const noteAmp = (nt: Note, tt: number) => {
    if (tt < nt.born) return 0
    let a = Math.min(1, (tt - nt.born) / 0.1)
    if (tt > nt.off) {
      const q = (tt - nt.off) / 3
      if (q >= 1) return 0
      a *= (1 - q) * (1 - q)
    }
    return a
  }
  /** the trace at tt with the bend (bxx, bhh), as a path; `out` takes the y's */
  const build = (tt: number, bxx: number, bhh: number, out: Float32Array | null) => {
    const p = new Path2D()
    const a1 = A1 * breath(tt, 6.5, 0.16), a2 = A2 * breath(tt, 4.1, 0.3, 1), a3 = A3 * breath(tt, 3.3, 0.4, 2)
    const p1 = tt * 1.2, p2 = 1.1 - tt * 1.9, p3 = 2.4 + tt * 3.0, p4 = -tt * 9
    const m = notes.length
    for (let j = 0; j < m; j++) {
      const nt = notes[j]
      nA[j] = AN * noteAmp(nt, tt)
      nF[j] = TAU * nt.f
      nP[j] = nt.ph - tt * (1.2 + 0.25 * nt.f)
    }
    const g = -1 / (2 * SIGMA * SIGMA)
    for (let i = 0; i < n; i++) {
      const x = xs[i], u = x / W
      let v = a1 * Math.sin(TAU * 2 * u + p1) + a2 * Math.sin(TAU * 3.1 * u + p2) + a3 * Math.sin(TAU * 5.3 * u + p3) + A4 * Math.sin(TAU * 19 * u + p4)
      for (let j = 0; j < m; j++) v += nA[j] * Math.sin(nF[j] * u + nP[j])
      const d = x - bxx
      v += bhh * Math.exp(d * d * g)
      // the soft limiter: never off the glass
      const y = cy + lim * Math.tanh(v / lim)
      if (i) p.lineTo(x, y)
      else p.moveTo(x, y)
      if (out) out[i] = y
    }
    return p
  }
  /** the live trace's y at x */
  const yAt = (x: number) => {
    x = Math.max(0, Math.min(W, x))
    const i = Math.min(n - 2, Math.floor(x / step))
    const x0 = xs[i], x1 = xs[i + 1]
    const f = x1 > x0 ? (x - x0) / (x1 - x0) : 0
    return ys[i] + (ys[i + 1] - ys[i]) * f
  }
  /** the live trace between xa and xb */
  const sub = (xa: number, xb: number) => {
    xa = Math.max(0, xa)
    xb = Math.min(W, xb)
    const p = new Path2D()
    p.moveTo(xa, yAt(xa))
    const i0 = Math.floor(xa / step) + 1, i1 = Math.min(n - 1, Math.ceil(xb / step) - 1)
    for (let i = i0; i <= i1; i++) p.lineTo(xs[i], ys[i])
    p.lineTo(xb, yAt(xb))
    return p
  }

  return {
    init(w, h) {
      W = w
      cy = h / 2
      step = w > 900 ? 4 : 3
      n = Math.ceil(w / step) + 1
      xs = new Float32Array(n)
      ys = new Float32Array(n)
      for (let i = 0; i < n; i++) xs[i] = Math.min(w, i * step)
      ys.fill(cy)
      lim = 0.42 * h
      lw = h < 260 ? 1.6 : 2
      A1 = 0.18 * h
      A2 = 0.07 * h
      A3 = 0.03 * h
      A4 = 0.006 * h
      AN = 0.09 * h
      // the graticule: eight by six, the centre lines apart, ticked
      grid = new Path2D()
      axes = new Path2D()
      ticks = new Path2D()
      for (let i = 1; i < 8; i++) {
        if (i === 4) continue
        const x = (w * i) / 8
        grid.moveTo(x, 0)
        grid.lineTo(x, h)
      }
      for (let j = 1; j < 6; j++) {
        if (j === 3) continue
        const y = (h * j) / 6
        grid.moveTo(0, y)
        grid.lineTo(w, y)
      }
      axes.moveTo(w / 2, 0)
      axes.lineTo(w / 2, h)
      axes.moveTo(0, cy)
      axes.lineTo(w, cy)
      for (let i = 1; i < 40; i++) {
        const x = (w * i) / 40, L = i % 5 === 0 ? 5 : 2.5
        ticks.moveTo(x, cy - L)
        ticks.lineTo(x, cy + L)
      }
      for (let j = 1; j < 30; j++) {
        const y = (h * j) / 30, L = j % 5 === 0 ? 5 : 2.5
        ticks.moveTo(w / 2 - L, y)
        ticks.lineTo(w / 2 + L, y)
      }
      bx = w / 2
      bh = 0
      hand = 0
      press = 0
      head = 0
      filled = 0
      notes = []
      rings = []
      wasDown = false
      struck = 0
    },

    frame(pen, w, h, pointer, dt, t) {
      const { ctx, glow } = pen
      // ---- the hand: its bend eased 8/s, remembered for the ghosts
      const inside = pointer.inside
      const down = inside && pointer.down
      hand += ((inside ? 1 : 0) - hand) * Math.min(1, 6 * dt)
      press += ((down ? 1 : 0) - press) * Math.min(1, 10 * dt)
      const k8 = 1 - Math.exp(-8 * dt)
      if (inside) {
        bx += (pointer.x - bx) * k8
        bh += (pointer.y - cy - bh) * k8
      } else bh -= bh * k8
      hx[head] = bx
      hh[head] = bh
      ht[head] = t
      head = (head + 1) % HIST
      if (filled < HIST) filled++
      // ---- the notes: struck on the press, held, released
      const fWant = 2 + 10 * clamp01(pointer.x / w)
      if (down && !wasDown) {
        notes.push({ f: fWant, born: t, off: Infinity, ph: hash(++struck + 0.37) * TAU })
        if (notes.length > 3) notes.shift()
        rings.push({ x: pointer.x, y: pointer.y, born: t })
        if (rings.length > 4) rings.shift()
      }
      if (!down && wasDown) for (const nt of notes) if (nt.off === Infinity) nt.off = t
      wasDown = down
      for (const nt of notes) if (nt.off === Infinity && inside) nt.f += (fWant - nt.f) * Math.min(1, 3 * dt)
      if (notes.length && t - notes[0].off >= 3) notes = notes.filter(nt => t - nt.off < 3)
      if (rings.length && t - rings[0].born >= 0.7) rings = rings.filter(r => t - r.born < 0.7)
      let energy = 0
      for (const nt of notes) energy = Math.max(energy, noteAmp(nt, t))
      const col = mix(NA, NB, 0.4 * energy)

      // ---- the glass: phosphor in the air, the graticule
      wash(pen, NA, w / 2, cy, 0.62 * w, 0.6 * h, 0.035 * breath(t, 5.3, 0.25) + 0.03 * energy)
      pen.glass(grid, 0.09, 3)
      pen.glass(axes, 0.22, 3)
      ctx.lineWidth = 1
      ctx.strokeStyle = rgba(WHITE, 0.2)
      ctx.stroke(ticks)

      // ---- persistence: the trace as it was, oldest first, fading
      for (let k = GHOST_A.length - 1; k >= 0; k--) {
        const tt = t - (k + 1) * GHOST_DT
        const [gx, gh] = bumpAt(tt)
        const p = build(tt, gx, gh, null)
        glow.lineWidth = lw * 2.2
        glow.strokeStyle = rgba(col, GHOST_A[k] * 0.8)
        glow.stroke(p)
        ctx.lineWidth = lw * 0.9
        ctx.strokeStyle = rgba(col, GHOST_A[k] * 0.6)
        ctx.stroke(p)
      }

      // ---- the trace: a soft band of light under it, then the tube, freshest behind the beam
      const trace = build(t, bx, bh, ys)
      glow.lineWidth = lw * 8
      glow.strokeStyle = rgba(col, 0.1)
      glow.stroke(trace)
      const u = t % 1
      const q = Math.min(0.996, Math.max(0.003, u))
      const b0 = 1 - 0.4 * q
      neonAcross(pen, trace, col, lw, 0, w, [
        [0, b0],
        [q, 1],
        [q + 0.002, 0.6],
        [1, b0],
      ])

      // ---- under the hand: the trace runs hotter, a probe line, a bead where it reads
      if (hand > 0.01) {
        const hc = mix(col, NB, press)
        const R = 130
        const seg = sub(bx - R, bx + R)
        // the bloom swells where the gas runs hotter (the tube itself is already white-hot, so the heat shows in the air)
        const sw = glow.createLinearGradient(bx - R, 0, bx + R, 0)
        sw.addColorStop(0, rgba(hc, 0))
        sw.addColorStop(0.5, rgba(hc, (0.34 + 0.2 * press) * hand))
        sw.addColorStop(1, rgba(hc, 0))
        glow.lineWidth = lw * 9
        glow.strokeStyle = sw
        glow.stroke(seg)
        neonAcross(pen, seg, hc, lw * 1.25, bx - R, bx + R, [
          [0, 0],
          [0.5, 0.9 * hand],
          [1, 0],
        ])
        const py = yAt(bx)
        ctx.lineWidth = 1
        ctx.strokeStyle = rgba(WHITE, 0.3 * hand)
        ctx.beginPath()
        ctx.moveTo(bx, 0)
        ctx.lineTo(bx, h)
        ctx.stroke()
        pen.fill(P.circle(bx, py, 2.6 + 1.2 * press), hc, hand)
        ctx.fillStyle = rgba(WHITE, hand * (0.5 + 0.5 * press))
        ctx.beginPath()
        ctx.arc(bx, py, 1.4, 0, TAU)
        ctx.fill()
      }
      for (const r of rings) {
        const a = (t - r.born) / 0.7
        pen.neon(P.circle(r.x, r.y, 3 + a * 44), NB, (1 - a) * (1 - a) * 0.9, 1.4)
      }

      // ---- the beam: a white bead writing the trace left to right once a second, a comet tail behind it
      const bxh = u * w
      const by = yAt(bxh)
      const vis = Math.min(1, u / 0.03, (1 - u) / 0.03)
      if (vis > 0.01) {
        // the phosphor just written is white-hot and cools to colour along the tail
        const tail = Math.min(bxh, 0.11 * w + 30)
        if (tail > 2)
          neonAcross(pen, sub(bxh - tail, bxh), mix(col, WHITE, 0.55), lw * 1.7, bxh - tail, bxh, [
            [0, 0],
            [0.6, 0.45 * vis],
            [1, vis],
          ])
        const sg = ctx.createLinearGradient(0, by - 0.4 * h, 0, by + 0.4 * h)
        sg.addColorStop(0, rgba(WHITE, 0))
        sg.addColorStop(0.5, rgba(WHITE, 0.22 * vis))
        sg.addColorStop(1, rgba(WHITE, 0))
        ctx.strokeStyle = sg
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(bxh, by - 0.4 * h)
        ctx.lineTo(bxh, by + 0.4 * h)
        ctx.stroke()
        pen.fill(P.circle(bxh, by, lw * 4), col, 0.55 * vis)
        pen.fill(P.circle(bxh, by, lw * 2.1), WHITE, vis)
      }
    },
  }
}
