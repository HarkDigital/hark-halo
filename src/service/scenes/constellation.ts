import { NA, NB, NC, P, TAU, WHITE, rgba, strike, type RGB, type Scene } from './kit'

type Kind = 'file' | 'chat' | 'task'

interface Node {
  kind: Kind
  /** home position and drift */
  hx: number
  hy: number
  ph: number
  amp: number
  x: number
  y: number
  /** lit by a question (0..1, cools) */
  heat: number
  /** a bead on its thread: 0 → 1 toward the answer (or the cursor), -1 none */
  bead: number
  c: RGB
}

const COLOR: Record<Kind, RGB> = { file: NA, chat: NB, task: NC }

/*
 * COMPANY KNOWLEDGE AI — a constellation of the company's knowledge: files
 * (a page with a folded corner), chat (a speech bubble) and tasks (a ticked
 * box) drifting in clear glass around one answer card. Every few seconds a
 * question is asked: a handful of nodes light, each sends a bead of light
 * down its thread into the card, and the card writes its answer, a cited dot
 * per source. The cursor is a question too: the nearest nodes light and send
 * their threads toward it.
 */
export function constellation(): Scene {
  let nodes: Node[] = []
  let cx = 0
  let cy = 0
  let cw = 0
  let ch = 0
  let s = 10
  /** the current question: its sources, and how far through it is (s) */
  let asked: Node[] = []
  let age = 99
  const CYCLE = 4.2

  const card = () => P.rrect(cx - cw / 2, cy - ch / 2, cw, ch, Math.min(14, ch * 0.16))

  const glyph = (n: Node): Path2D => {
    const p = new Path2D()
    const { x, y } = n
    if (n.kind === 'file') {
      // a page with a folded corner
      const w = s * 1.5
      const h = s * 1.9
      const f = s * 0.55
      p.moveTo(x - w / 2, y - h / 2)
      p.lineTo(x + w / 2 - f, y - h / 2)
      p.lineTo(x + w / 2, y - h / 2 + f)
      p.lineTo(x + w / 2, y + h / 2)
      p.lineTo(x - w / 2, y + h / 2)
      p.closePath()
      p.moveTo(x + w / 2 - f, y - h / 2)
      p.lineTo(x + w / 2 - f, y - h / 2 + f)
      p.lineTo(x + w / 2, y - h / 2 + f)
    } else if (n.kind === 'chat') {
      // a speech bubble with a tail
      const w = s * 2
      const h = s * 1.4
      const r = s * 0.45
      const l = x - w / 2
      const t = y - h / 2
      p.moveTo(l + r, t)
      p.arcTo(l + w, t, l + w, t + h, r)
      p.arcTo(l + w, t + h, l, t + h, r)
      p.lineTo(l + w * 0.42, t + h)
      p.lineTo(l + w * 0.22, t + h + s * 0.55)
      p.lineTo(l + w * 0.26, t + h)
      p.arcTo(l, t + h, l, t, r)
      p.arcTo(l, t, l + w, t, r)
      p.closePath()
    } else {
      // a ticked box
      const a = s * 1.5
      const r = s * 0.3
      const l = x - a / 2
      const t = y - a / 2
      p.moveTo(l + r, t)
      p.arcTo(l + a, t, l + a, t + a, r)
      p.arcTo(l + a, t + a, l, t + a, r)
      p.arcTo(l, t + a, l, t, r)
      p.arcTo(l, t, l + a, t, r)
      p.closePath()
      p.moveTo(x - a * 0.24, y + a * 0.02)
      p.lineTo(x - a * 0.05, y + a * 0.2)
      p.lineTo(x + a * 0.26, y - a * 0.18)
    }
    return p
  }

  /** a thread from a node to (tx, ty): a gentle curve, so the web reads as threads, not spokes */
  const thread = (n: Node, tx: number, ty: number) => {
    const mx = (n.x + tx) / 2
    const my = (n.y + ty) / 2
    const dx = tx - n.x
    const dy = ty - n.y
    const bend = 0.12
    const qx = mx - dy * bend
    const qy = my + dx * bend
    const p = new Path2D()
    p.moveTo(n.x, n.y)
    p.quadraticCurveTo(qx, qy, tx, ty)
    return { p, at: (k: number) => [(1 - k) ** 2 * n.x + 2 * (1 - k) * k * qx + k * k * tx, (1 - k) ** 2 * n.y + 2 * (1 - k) * k * qy + k * k * ty] as const }
  }

  const ask = () => {
    const pool = nodes.slice()
    asked = []
    const n = Math.min(pool.length, 3 + Math.floor(Math.random() * 2))
    for (let i = 0; i < n; i++) asked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0])
    for (const nd of asked) nd.bead = -0.18 * asked.indexOf(nd)
    age = 0
  }

  return {
    init(w, h, framed) {
      cx = w / 2
      cy = h / 2
      const m = Math.min(w, h)
      s = Math.max(6.5, Math.min(12, m / 44))
      cw = Math.min(w * 0.36, m * 0.5, 260)
      ch = cw * 0.62
      const rx = Math.min(w * 0.44, framed ? w * 0.4 : w * 0.46)
      const ry = Math.min(h * 0.4, framed ? h * 0.36 : h * 0.42)
      const count = Math.round(Math.max(12, Math.min(24, (w * h) / 26000)))
      const kinds: Kind[] = ['file', 'chat', 'task']
      nodes = []
      let tries = 0
      while (nodes.length < count && tries++ < 2000) {
        const a = Math.random() * TAU
        const r = 0.42 + Math.random() * 0.58
        const x = cx + Math.cos(a) * rx * r
        const y = cy + Math.sin(a) * ry * r
        // clear of the card, and of each other
        if (Math.abs(x - cx) < cw / 2 + s * 3 && Math.abs(y - cy) < ch / 2 + s * 3) continue
        if (nodes.some(o => (o.hx - x) ** 2 + (o.hy - y) ** 2 < (s * 5.2) ** 2)) continue
        const kind = kinds[nodes.length % 3]
        nodes.push({ kind, hx: x, hy: y, ph: Math.random() * TAU, amp: s * (0.5 + Math.random() * 0.7), x, y, heat: 0, bead: -1, c: COLOR[kind] })
      }
      asked = []
      age = 99
    },

    frame(pen, _w, _h, pointer, dt, t) {
      // drift
      for (const n of nodes) {
        n.x = n.hx + Math.cos(t * 0.31 + n.ph) * n.amp
        n.y = n.hy + Math.sin(t * 0.27 + n.ph * 1.7) * n.amp * 0.8
      }

      // a new question every few seconds
      age += dt
      if (age > CYCLE) ask()

      // the cursor's question: the nearest few light and reach for it
      const q = pointer.inside
      const near = q
        ? nodes
            .map(n => ({ n, d: (n.x - pointer.x) ** 2 + (n.y - pointer.y) ** 2 }))
            .sort((a, b) => a.d - b.d)
            .slice(0, 4)
            .map(o => o.n)
        : []

      // threads: unlit glass to the card for every node
      const web = new Path2D()
      for (const n of nodes) web.addPath(thread(n, cx, cy).p)
      pen.glass(web, 0.07, 2)

      // the asked sources: lit threads, beads running into the card
      let arrived = 0
      for (const n of asked) {
        const th = thread(n, cx, cy)
        const fade = Math.max(0, Math.min(1, (CYCLE - age) / 0.8))
        n.heat = Math.max(n.heat, 0.9 * fade)
        pen.neon(th.p, n.c, 0.42 * fade * strike(age * 1.6, asked.indexOf(n)), 1.5)
        n.bead = Math.min(1, n.bead + dt * 0.75)
        if (n.bead >= 1) arrived++
        else if (n.bead > 0) {
          const [bx, by] = th.at(n.bead)
          const [tx, ty] = th.at(Math.max(0, n.bead - 0.12))
          pen.streak(tx, ty, bx, by, n.c, 0.95 * fade, 2)
        }
      }

      // the cursor's sources reach for it
      for (const n of near) {
        n.heat = 1
        const th = thread(n, pointer.x, pointer.y)
        pen.neon(th.p, n.c, 0.55, 1.4)
        const k = (t * 0.9 + n.ph) % 1
        const [bx, by] = th.at(k)
        pen.fill(P.circle(bx, by, 2.2), n.c, 0.9)
      }
      if (q) {
        pen.neon(P.circle(pointer.x, pointer.y, s * 1.1 + Math.sin(t * 4) * 1.5), NA, 0.8, 1.6)
        pen.fill(P.circle(pointer.x, pointer.y, 2.6), NA, 1)
      }

      // the nodes
      for (const n of nodes) {
        const g = glyph(n)
        pen.glass(g, 0.34, 2.4)
        if (n.heat > 0.02) pen.neon(g, n.c, n.heat, 1.6)
        n.heat = Math.max(0, n.heat - dt * 0.9)
      }

      // the answer card: glass, its lines written as the sources arrive, a cited dot per source
      const c = card()
      pen.wash(c, NA, 0.035)
      pen.tube(c, NA, 0.28 + 0.4 * Math.min(1, arrived / Math.max(1, asked.length)), 1.8)
      const pad = cw * 0.1
      const lines = 4
      const written = asked.length ? Math.max(0, Math.min(1, (age - 1.2) / 1.4)) * Math.min(1, (CYCLE - age) / 0.6) : 0
      for (let i = 0; i < lines; i++) {
        const lw = (cw - pad * 2) * (i === lines - 1 ? 0.55 : 1 - (i % 2) * 0.12)
        const y = cy - ch / 2 + pad + i * (ch - pad * 2.6) / (lines - 1)
        const k = Math.max(0, Math.min(1, written * lines - i))
        pen.ctx.fillStyle = rgba(WHITE, 0.07)
        pen.ctx.fillRect(cx - cw / 2 + pad, y, lw, 2)
        if (k > 0) pen.box(cx - cw / 2 + pad, y - 0.5, lw * k, 3, i === 0 ? WHITE : NA, 0.75 * k)
      }
      // the citations
      asked.forEach((n, i) => {
        const on = n.bead >= 1 ? Math.min(1, (CYCLE - age) / 0.6) : 0
        const x = cx - cw / 2 + pad + i * s * 1.6
        const y = cy + ch / 2 - pad * 0.9
        pen.glass(P.circle(x, y, s * 0.42), 0.3, 1.4)
        if (on > 0) pen.fill(P.circle(x, y, s * 0.36), n.c, on)
      })
    },
  }
}
