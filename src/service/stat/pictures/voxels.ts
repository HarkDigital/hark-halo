import { NA, WHITE, rgba, strike, type RGB } from '../../scenes/kit'
import type { Builder } from '../picture'
import { TAU, breath, drawMotes, glint, hash, motes, wash, type Mote } from './lib'

/*
 * 94%: THE LIFT (../PICTURES.md). A slab of a hundred glass cubes, ten by
 * ten, lying on the dark floor right of centre and seen from above and to
 * one side: the conversions without 3D. On it a second layer of a hundred
 * cells, and `lift` of them light green cube by cube as the count runs,
 * each one dropping into its cell and flaring as it lands, in reading order
 * from the back row; the cells left empty sit together at the front corner.
 * The lit cubes are the number. Afterwards a wave of light runs across the
 * lit layer now and then; the block turns toward the hand (the scroll turns
 * it on a phone) and the cubes under the hand brighten and rise a little.
 * Nothing lit ever changes.
 */
const N = 10
const END = 3.05 // the strike's end on t: DELAY 0.25 s + dur 2.8 s
const clampA = (x: number) => (x < -1 ? -1 : x > 1 ? 1 : x)

export const voxels: Builder<{ kind: 'voxels'; base: number; lift: number }> = o => {
  let cx = 0, cy = 0, c = 0, yF = 0
  let narrow = false
  let yaw = 0, tilt = 0, near = 0
  let dust: Mote[] = []
  let box: [number, number, number, number] = [0, 0, 0, 0]
  const lift = Math.min(o.lift, N * N)

  // the cells of the upper layer in lighting order: reading order from the back row (left to right
  // as seen at rest), so the empty ones are the last cells of the front row
  const cells: [number, number][] = []
  for (let row = 0; row < N; row++) for (let col = 0; col < N; col++) cells.push([col, row])

  return {
    lead: [0, 0],
    dur: 2800,
    init(w, h, env) {
      narrow = env.narrow
      // the block's footprint seen at its resting turn spans ~13.9 cells across
      let span: number
      if (env.mode === 'wide') {
        cx = env.copyX + 0.52 * (w - env.copyX)
        span = Math.min(0.62 * (w - env.copyX), 1.15 * h)
      } else {
        cx = 0.5 * w
        span = narrow ? Math.min(0.8 * w, 1.25 * h) : Math.min(0.5 * w, 1.2 * h)
      }
      c = span / 13.9
      cy = 0.5 * h
      yF = cy + 4.3 * c
      yaw = tilt = near = 0
      box = [cx - 7 * c, cy - 6 * c, cx + 7 * c, yF]
      dust = narrow ? [] : motes(16, 11, box, [-3, 3], [-9, -3])
    },
    frame(pen, w, h, p, e, t, pointer, dt) {
      const { ctx } = pen
      void h
      const front = p * lift
      const k = Math.floor(front + 1e-6)
      const litShare = k / lift

      // ---- the pose: a resting turn; it turns and tips toward the hand (laptop), with the scroll (phone)
      let wantYaw = 0
      let wantTilt = 0
      if (pointer.inside && !pointer.coarse) {
        wantYaw = clampA((pointer.x - cx) / (8 * c)) * 0.2
        wantTilt = clampA((pointer.y - cy) / (6 * c)) * 0.1
      }
      if (pointer.coarse) {
        wantYaw = (pointer.scroll - 0.5) * 0.7
        wantTilt = clampA(pointer.scrollV) * 0.12
      }
      yaw += (wantYaw - yaw) * Math.min(1, 4 * dt)
      tilt += (wantTilt - tilt) * Math.min(1, 4 * dt)
      const want = pointer.inside && !pointer.coarse ? 1 : 0
      near += (want - near) * Math.min(1, 5 * dt)
      const th = 0.62 + yaw + 0.05 * Math.sin(t * 0.21)
      const ph = 0.62 + tilt
      const ct = Math.cos(th), st = Math.sin(th)
      const cp = Math.cos(ph), sp = Math.sin(ph)
      const F = 60 * c
      /** a point of the block (x across, z toward you, y up, in cells; the slab's centre at 0) on screen */
      const pt = (x: number, y: number, z: number): [number, number] => {
        const x1 = x * ct - z * st
        const z1 = x * st + z * ct
        const yy = y * cp - z1 * sp
        const zz = y * sp + z1 * cp
        const s = (F / (F - zz * c)) * c
        return [cx + x1 * s, cy + 2.2 * c - yy * s]
      }
      const line = (q: Path2D, a: [number, number], b: [number, number]) => {
        q.moveTo(a[0], a[1])
        q.lineTo(b[0], b[1])
      }
      const H = N / 2

      // ---- the floor: a hairline of glass, the lit layer's light pooled on it
      const fg = ctx.createLinearGradient(0, 0, w, 0)
      fg.addColorStop(0, rgba(WHITE, 0))
      fg.addColorStop(narrow ? 0.05 : 0.3, rgba(WHITE, 0.07))
      fg.addColorStop(1, rgba(WHITE, 0.07))
      ctx.strokeStyle = fg
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, yF)
      ctx.lineTo(w, yF)
      ctx.stroke()
      wash(pen, NA, cx, yF, 7.5 * c, 0.8 * c, 0.12 * litShare * breath(t, 4.3, 0.1))

      // ---- the slab: a hundred cubes of dark glass (its top ruled ten by ten, its sides by the cell)
      const slab = new Path2D()
      for (let i = 0; i <= N; i++) {
        line(slab, pt(-H + i, 1, -H), pt(-H + i, 1, H))
        line(slab, pt(-H, 1, -H + i), pt(H, 1, -H + i))
        // the two faces toward you, ruled by the cell (and the far corner's edge, faint through the glass)
        line(slab, pt(-H + i, 0, H), pt(-H + i, 1, H))
        line(slab, pt(-H, 0, -H + i), pt(-H, 1, -H + i))
      }
      line(slab, pt(-H, 0, H), pt(H, 0, H))
      line(slab, pt(-H, 0, -H), pt(-H, 0, H))
      line(slab, pt(H, 0, H), pt(H, 0, -H))
      line(slab, pt(H, 0, -H), pt(H, 1, -H))
      pen.glass(slab, 0.13, 1.6)
      ctx.fillStyle = rgba(WHITE, 0.012)
      const topFace = new Path2D()
      {
        const a = pt(-H, 1, -H), b = pt(H, 1, -H), d = pt(H, 1, H), g = pt(-H, 1, H)
        topFace.moveTo(a[0], a[1])
        topFace.lineTo(b[0], b[1])
        topFace.lineTo(d[0], d[1])
        topFace.lineTo(g[0], g[1])
        topFace.closePath()
      }
      ctx.fill(topFace)

      // ---- the lit layer: cube i lights while the count runs i → i+1, dropping into its cell
      // (settled cubes are drawn in two paths, a checkerboard, breathing out of phase: every inner
      // edge is shared by one cube of each, so the grid stays even; the few in motion, the wave and
      // the hand's own are drawn one by one)
      const waveOn = e >= 1 && k > 0
      const wph = ((t - END) % 6.5) / 6.5
      const wave = waveOn && wph < 0.5 ? (wph / 0.5) * (2 * N + 4) - 2 : -99
      const flickSlot = Math.floor(t / 2.3)
      const flick = e >= 1 && k > 0 ? Math.floor(hash(flickSlot + 0.37) * k) : -1
      const cube = (col: number, row: number, dy: number) => {
        const x0 = -H + col, z0 = -H + row
        const a = pt(x0, 2 + dy, z0), b = pt(x0 + 1, 2 + dy, z0), d = pt(x0 + 1, 2 + dy, z0 + 1), g = pt(x0, 2 + dy, z0 + 1)
        const top = new Path2D()
        top.moveTo(a[0], a[1])
        top.lineTo(b[0], b[1])
        top.lineTo(d[0], d[1])
        top.lineTo(g[0], g[1])
        top.closePath()
        const sides = new Path2D()
        line(sides, g, pt(x0, 1 + dy, z0 + 1))
        line(sides, d, pt(x0 + 1, 1 + dy, z0 + 1))
        line(sides, b, pt(x0 + 1, 1 + dy, z0))
        line(sides, pt(x0, 1 + dy, z0 + 1), pt(x0 + 1, 1 + dy, z0 + 1))
        line(sides, pt(x0 + 1, 1 + dy, z0 + 1), pt(x0 + 1, 1 + dy, z0))
        return [top, sides, (a[0] + d[0]) / 2, (a[1] + d[1]) / 2] as const
      }
      const draw = (top: Path2D, sides: Path2D, on: number, col: RGB = NA) => {
        pen.wash(top, col, 0.07 * on)
        pen.neon(top, col, 0.62 * on, 1.2)
        pen.neon(sides, col, 0.32 * on, 1)
      }
      const bins: Path2D[][] = [[new Path2D(), new Path2D()], [new Path2D(), new Path2D()]]
      const binUsed = [false, false]
      const empty = new Path2D()
      for (let i = 0; i < N * N; i++) {
        const [col, row] = cells[i]
        const u = front - i
        if (i >= lift || u <= 0) {
          // an empty cell: its outline in glass, waiting
          const [top, sides] = cube(col, row, 0)
          empty.addPath(top)
          empty.addPath(sides)
          continue
        }
        const [mx, my] = pt(-H + col + 0.5, 2, -H + row + 0.5)
        let q = 0
        if (near > 0.01 && pointer.inside) {
          const dd = Math.hypot(pointer.x - mx, pointer.y - my)
          if (dd < 160) q = (1 - dd / 160) * near
        }
        if (u < 1) {
          // in motion: it drops into its cell, white-hot as it lands
          const fall = (1 - u) * (1 - u) * 1.6
          const [top, sides] = cube(col, row, fall)
          draw(top, sides, 0.35 + 0.65 * u, NA)
          pen.neon(top, WHITE, 0.5 * u, 0.8)
          continue
        }
        const age = (u - 1) * 0.12 + (e >= 1 ? Math.max(0, t - END) : 0)
        let on = age < 0.42 ? 0.4 + 0.6 * strike(age, i) : 1
        on += 0.9 * Math.exp(-age / 0.12)
        const dWave = wave - (col + (N - 1 - row))
        if (dWave > -1.5 && dWave < 1.5) on += 0.45 * (1 - Math.abs(dWave) / 1.5)
        if (i === flick && t - flickSlot * 2.3 < 0.06) on *= 0.5
        const settled = on < 1.001 && on > 0.999 && q < 0.01
        if (settled) {
          const [top, sides] = cube(col, row, 0)
          const b = (col + row) % 2
          bins[b][0].addPath(top)
          bins[b][1].addPath(sides)
          binUsed[b] = true
        } else {
          const [top, sides] = cube(col, row, 0.18 * q)
          draw(top, sides, Math.min(1.6, on * (1 + 0.4 * q)))
        }
      }
      pen.glass(empty, 0.1, 1.4)
      for (let b = 0; b < 2; b++) {
        if (binUsed[b]) draw(bins[b][0], bins[b][1], breath(t, b ? 4.6 : 3.7, 0.06, b * 2.1))
      }

      // ---- the room's light, the dust in it, a cold glint along the slab's front edge
      wash(pen, NA, cx + yaw * 30, cy, 8 * c, 5.5 * c, 0.06 * litShare * breath(t, 5.1, 0.08))
      if (!narrow) {
        drawMotes(pen, dust, t, box, litShare)
        const gk = ((t * 0.1) % 1) * 1.4 - 0.2
        if (gk > 0 && gk < 1) {
          const [x0, y0] = pt(-H + gk * N - 0.6, 0, H)
          const [x1, y1] = pt(-H + gk * N + 0.6, 0, H)
          glint(pen, x0, y0, x1, y1, 0.22, 1.2)
        }
      }
    },
  }
}
