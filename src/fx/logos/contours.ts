import { NA, NB, NC, P, WHITE, mix, rgba, type RGB, type Scene } from '../../service/scenes/kit'
import { MARK, markFrame, markLength, markOutline } from '../logo'
import { breath, wash } from '../../service/stat/pictures/lib'

/*
 * CONTOURS: echoes of the mark, ring on ring, a topographic map of one shape.
 * Every ring is the mark's outline (all three contours as one path) stroked
 * wide in colour, then stroked a little narrower in opaque black: the canvas
 * is screened onto black, so the black is nothing and a hairline ring is left.
 * Widest first, so each ring sits in the last one's dark; the body is filled
 * black and the mark itself rides on top as white-hot tube. The rings breathe
 * outward forever: their widths grow with t, the outermost fading as it goes,
 * a new one born from under the tube. They cool with distance (NA near, NB
 * mid, faint NC far). A lamp lights the map: a bead that walks the outline of
 * loop A, hops to loop B where they nearly touch, walks that, and hops back;
 * ring brightness falls off from it (a radial gradient as each ring's stroke).
 * When the cursor is over the box, the cursor is the lamp; press to raise it.
 */
const LAP = 24 // seconds: the lamp's walk round both loops
const BORN = 0.5 // seconds between rings
const LAMP: RGB = mix(NA, WHITE, 0.4)
const LOOP_A: RGB = mix(NA, WHITE, 0.55)
const LOOP_B: RGB = mix(NB, WHITE, 0.55)

export default function contours(): Scene {
  let cx = 0, cy = 0, size = 100, s = 1, ox = 0, oy = 0
  let gap = 7, step = 14, N = 8, lw = 1.3, reach = 160, speed = 40
  let all = new Path2D()
  let outline: [number, number][][] = []
  let lens: [number, number] = [1, 1]
  let hop: [number, number] = [0, 0] // the outline indices where the loops nearly touch
  let walkSpeed = 1
  // the lamp (px), eased toward the cursor or the walker; its heat and reach
  let lx = 0, ly = 0, li = 1, lr = 1
  let settled = false

  /** the walker's place at t: round loop A from the hop, round loop B from its hop, again */
  const walker = (t: number): [number, number] => {
    const total = lens[0] + lens[1]
    let pos = (t * walkSpeed) % total
    let i = 0
    if (pos >= lens[0]) {
      pos -= lens[0]
      i = 1
    }
    const pts = outline[i]
    const n = pts.length
    const f = hop[i] + (pos / lens[i]) * n
    const i0 = Math.floor(f) % n, i1 = (i0 + 1) % n, fr = f - Math.floor(f)
    const mx = pts[i0][0] + (pts[i1][0] - pts[i0][0]) * fr
    const my = pts[i0][1] + (pts[i1][1] - pts[i0][1]) * fr
    return [ox + mx * s, oy + my * s]
  }

  return {
    init(w, h) {
      size = Math.min(h * 0.72, w * 0.6)
      cx = w / 2
      cy = h / 2
      s = size / MARK.h
      ox = cx - (MARK.w * s) / 2
      oy = cy - (MARK.h * s) / 2
      // the rings: spaced by the mark's size, enough of them to reach the box's edge, fewer as the
      // mark grows (every ring is a wide stroke over the whole shape: the fill grows with size^2 * N^2)
      gap = Math.max(4.5, Math.min(16, size * 0.024))
      step = gap * 2
      lw = w < 480 ? 1.2 : 1.4
      const room = Math.max((w - size) / 2, (h - size) / 2)
      const cap = Math.round(Math.max(10, Math.min(20, 5200 / size)))
      N = Math.max(8, Math.min(w * h < 240000 ? 12 : cap, Math.ceil(room / gap) + 1))
      speed = step / BORN
      // the lamp's pool: tight enough that the map is lit WHERE the lamp is, not everywhere
      reach = Math.max(80, size * 0.46)
      all = new Path2D()
      for (const p of MARK.all) all.addPath(p)
      outline = markOutline(600)
      lens = [markLength(0), markLength(1)]
      walkSpeed = (lens[0] + lens[1]) / LAP
      // where loop A and loop B come nearest: the lamp hops there
      let best = Infinity
      const a = outline[0], b = outline[1]
      for (let i = 0; i < a.length; i += 2) {
        for (let j = 0; j < b.length; j += 2) {
          const dx = a[i][0] - b[j][0], dy = a[i][1] - b[j][1]
          const d = dx * dx + dy * dy
          if (d < best) {
            best = d
            hop = [i, j]
          }
        }
      }
      settled = false
    },

    frame(pen, _w, _h, pointer, dt, t) {
      const { ctx, glow } = pen
      // the lamp: the cursor over the box, else the walker; it slides between them
      const [wx, wy] = walker(t)
      if (!settled) {
        lx = wx
        ly = wy
        settled = true
      }
      const tx = pointer.inside ? pointer.x : wx, ty = pointer.inside ? pointer.y : wy
      const ease = Math.min(1, (pointer.inside ? 10 : 6) * dt)
      lx += (tx - lx) * ease
      ly += (ty - ly) * ease
      li += ((pointer.inside ? (pointer.down ? 1.5 : 1.2) : 1) - li) * Math.min(1, 5 * dt)
      lr += ((pointer.inside && pointer.down ? 1.25 : 1) - lr) * Math.min(1, 4 * dt)
      const R = reach * lr
      const flick = 1 + 0.04 * Math.sin(t * 9.1) * Math.sin(t * 2.3)
      const heat = li * flick
      // in mark units (the frame below)
      const lmx = (lx - ox) / s, lmy = (ly - oy) / s, Rm = R / s
      const off = (t * speed) % step
      const amb = 0.23 * breath(t, 7, 0.12)

      ctx.save()
      glow.save()
      markFrame(ctx, cx, cy, size)
      markFrame(glow, cx, cy, size)
      ctx.globalCompositeOperation = 'source-over'
      glow.globalCompositeOperation = 'source-over'
      // the rings, widest first: colour, then black a hairline narrower
      for (let k = N; k >= 1; k--) {
        const wk = (k - 1) * step + off
        if (wk < 0.5) continue
        const u = wk / (N * step)
        const c = u < 0.5 ? mix(NA, NB, u * 2) : mix(NB, NC, (u - 0.5) * 2)
        // the ring's own light cools with distance; the lamp lights it wherever it is
        let fade = 1
        if (k === N) fade = 1 - off / step // the outermost fades as it goes
        else if (k === 1) fade = off / step // the newest is born from under the tube
        if (fade < 0.01) continue
        // the ring's own light: dimmer near the mark than the lamp's pool, the far field as faint as ever
        const aAmb = (0.78 - 0.5 * u) * amb * fade
        const aLit = Math.min(1, (0.5 + 0.3 * (1 - u)) * heat) * fade
        const aMid = Math.min(1, (0.24 + 0.2 * (1 - u)) * (0.4 + 0.6 * heat)) * fade
        const hotC = mix(c, WHITE, 0.6)
        // the sharp ring every time; its faint copy on the glow every other ring (the blur joins them)
        const onGlow = (N - k) % 2 === 0
        for (const [cv, al, width] of [
          [ctx, 1, lw],
          [glow, onGlow ? 0.3 : 0, lw * 2.2],
        ] as const) {
          if (al <= 0) continue
          const g = cv.createRadialGradient(lmx, lmy, 0, lmx, lmy, Rm)
          g.addColorStop(0, rgba(hotC, aLit * al))
          g.addColorStop(0.22, rgba(mix(c, WHITE, 0.35), aLit * 0.85 * al))
          g.addColorStop(0.58, rgba(c, aMid * al))
          g.addColorStop(1, rgba(c, aAmb * al))
          cv.strokeStyle = g
          cv.lineWidth = wk / s
          cv.stroke(all)
          const inner = wk - 2 * width
          if (inner > 0.1) {
            cv.strokeStyle = '#000'
            cv.lineWidth = inner / s
            cv.stroke(all)
          }
        }
      }
      // the body: dark, so the rings are echoes outside the shape
      ctx.fillStyle = '#000'
      ctx.fill(all)
      glow.fillStyle = '#000'
      glow.fill(all)
      ctx.globalCompositeOperation = 'lighter'
      glow.globalCompositeOperation = 'lighter'
      // the mark itself, white-hot, the summit
      const on = 0.94 + 0.06 * Math.sin(t * 1.3)
      const tw = 2.6 / s
      pen.tube(MARK.loops[0], LOOP_A, on, tw)
      pen.tube(MARK.loops[1], LOOP_B, on, tw)
      pen.tube(MARK.diamond, WHITE, on, tw)
      ctx.restore()
      glow.restore()

      // the lamp: its light on the air, and the bead itself
      wash(pen, LAMP, lx, ly, R * 0.8, R * 0.8, 0.15 * heat)
      const hr = 11 + 7 * heat
      const halo = ctx.createRadialGradient(lx, ly, 0, lx, ly, hr)
      halo.addColorStop(0, rgba(WHITE, 0.42 * heat))
      halo.addColorStop(1, rgba(LAMP, 0))
      ctx.fillStyle = halo
      ctx.fillRect(lx - hr, ly - hr, hr * 2, hr * 2)
      pen.fill(P.circle(lx, ly, 1.8 + 1.1 * heat), WHITE, 1)
    },
  }
}
