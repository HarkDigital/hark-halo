import { NA, NB, NC, P, TAU, WHITE, mix, rgba, type RGB, type Scene } from '../../service/scenes/kit'
import { breath, moteAt, motes, wash, type Mote } from '../../service/stat/pictures/lib'
import { MARK, markFrame } from '../logo'

/*
 * LAMP: the mark as clear glass, lit by one moving light. The lamp is a
 * white-hot bead with a wide wash of the first light on the wall behind it;
 * on its own it wanders round the mark on a slow lissajous (nine seconds a
 * turn, drifting so it never quite repeats), and while the hand is over the
 * box the cursor is the lamp. The glass answers the light four ways: a
 * specular glint runs along whichever edges are nearest the lamp (white-hot
 * on the sharp layer, blooming in the first light), a rim of the second light
 * catches the far side, the body of the mark holds the lamp's light so it
 * glows brighter inside the glass than on the wall around it, and that body
 * fades with distance so the far side sits in shadow; the diamond holds the
 * light as a gem, in the third. Dust in the air lights as the lamp passes.
 * Pressing turns the lamp up: twice the wash, a wider glint.
 */
export default function lamp(): Scene {
  let cx = 0, cy = 0, size = 100, s = 1, ox = 0, oy = 0
  /** how far the glint reaches from the lamp, px */
  let reach = 220
  let all = new Path2D()
  let dust: Mote[] = []
  let box: [number, number, number, number] = [0, 0, 1, 1]
  let lx = 0, ly = 0
  let placed = false
  let up = 0

  /** the lamp's own path: a slow lissajous round the mark, drifting so it never quite repeats */
  const orbit = (t: number): [number, number] => {
    const a = (TAU * t) / 9
    return [
      cx + size * (0.4 * Math.sin(2 * a + 0.6) + 0.07 * Math.sin((TAU * t) / 31)),
      cy + size * (0.34 * Math.sin(3 * a + 1.3) + 0.05 * Math.cos((TAU * t) / 23)),
    ]
  }
  /** a radial gradient about (x, y) in `col`, alpha by stop */
  const radial = (c: CanvasRenderingContext2D, x: number, y: number, r: number, col: RGB, stops: [number, number][]) => {
    const g = c.createRadialGradient(x, y, 0, x, y, Math.max(1, r))
    for (const [k, a] of stops) g.addColorStop(k, rgba(col, a))
    return g
  }

  return {
    init(w, h) {
      size = Math.min(h * 0.72, w * 0.6)
      cx = w / 2
      cy = h / 2
      s = size / MARK.h
      ox = cx - (MARK.w * s) / 2
      oy = cy - (MARK.h * s) / 2
      reach = 0.74 * size
      all = new Path2D()
      for (const p of MARK.all) all.addPath(p)
      box = [cx - 0.64 * size, cy - 0.52 * size, cx + 0.64 * size, cy + 0.52 * size]
      dust = motes(Math.max(8, Math.min(36, Math.round((w * h) / 14000))), 41, box, [-5, 5], [-4, 4])
      placed = false
      up = 0
    },
    frame(pen, _w, _h, pointer, dt, t) {
      const { ctx, glow } = pen
      // the lamp: the cursor while the hand is over the box, else its own orbit; eased either way
      const [tx, ty] = pointer.inside ? [pointer.x, pointer.y] : orbit(t)
      if (!placed) {
        lx = tx
        ly = ty
        placed = true
      }
      const k = Math.min(1, 6 * dt)
      lx += (tx - lx) * k
      ly += (ty - ly) * k
      up += ((pointer.inside && pointer.down ? 1 : 0) - up) * Math.min(1, 8 * dt)
      const br = breath(t, 5.3, 0.06)
      const R = reach * (1 + 0.5 * up)
      const W = (px: number) => px / s
      // the lamp in mark units, and the way from it to the mark's centre
      const mx = (lx - ox) / s, my = (ly - oy) / s, mr = R / s
      const dx = cx - lx, dy = cy - ly
      const dl = Math.hypot(dx, dy) || 1
      const ux = dx / dl, uy = dy / dl

      ctx.save()
      glow.save()
      markFrame(ctx, cx, cy, size)
      markFrame(glow, cx, cy, size)
      // the sleeves: clear glass, faint
      pen.glass(all, 0.13, W(9))
      // the body holds the light: the lamp's wash is stronger inside the glass (the bloom), a pool
      // about the lamp that fades with distance so the far side sits in shadow (the fill is the
      // contours themselves, so no clip); the diamond holds it as a gem, in the third light
      const body = 0.55 * MARK.h
      glow.fillStyle = radial(glow, mx, my, body, NA, [[0, 0.5 * br * (1 + 0.3 * up)], [0.25, 0.17 * br], [0.6, 0.05 * br], [1, 0]])
      glow.fill(all)
      glow.fillStyle = radial(glow, mx, my, body, NC, [[0, 0.5 * br], [0.5, 0.1 * br], [1, 0]])
      glow.fill(MARK.diamond)
      ctx.fillStyle = radial(ctx, mx, my, body, NA, [[0, 0.12 * br * (1 + 0.3 * up)], [0.3, 0.04 * br], [1, 0]])
      ctx.fill(all)
      ctx.fillStyle = radial(ctx, mx, my, body, mix(NC, WHITE, 0.3), [[0, 0.3 * br], [1, 0]])
      ctx.fill(MARK.diamond)
      // the rim: the second light catches the far side, the whole mark offset 2 px away from the lamp
      ctx.save()
      ctx.translate(ux * W(2), uy * W(2))
      ctx.lineWidth = W(1.3)
      ctx.strokeStyle = radial(ctx, mx, my, 1.3 * mr, NB, [[0, 0.02], [0.4, 0.1], [1, 0.24]])
      ctx.stroke(all)
      ctx.restore()
      glow.save()
      glow.translate(ux * W(3), uy * W(3))
      glow.lineWidth = W(4.5)
      glow.strokeStyle = radial(glow, mx, my, 1.3 * mr, NB, [[0, 0], [0.45, 0.08], [1, 0.26]])
      glow.stroke(all)
      glow.restore()
      // the specular glint: a hot spot on the edges nearest the lamp, falling fast to dark glass
      // well inside `reach`, so even with the lamp on the diamond the bulbs stay glass
      ctx.lineWidth = W(2.4)
      ctx.strokeStyle = radial(ctx, mx, my, mr, WHITE, [[0, 1], [0.1, 0.85 * br], [0.3, 0.32], [0.65, 0.07], [1, 0]])
      ctx.stroke(all)
      ctx.lineWidth = W(0.9)
      ctx.strokeStyle = radial(ctx, mx, my, 0.5 * mr, WHITE, [[0, 1], [0.4, 0.5], [1, 0]])
      ctx.stroke(all)
      glow.lineWidth = W(6)
      glow.strokeStyle = radial(glow, mx, my, mr, NA, [[0, 0.95 * br], [0.22, 0.46 * br], [0.6, 0.1], [1, 0]])
      glow.stroke(all)
      ctx.restore()
      glow.restore()

      // the lamp itself: its wash on the wall, a hot halo, and the white-hot bead
      const rw = 0.5 * size * (1 + 0.25 * up)
      wash(pen, NA, lx, ly, rw, rw, 0.26 * br * (1 + up))
      glow.fillStyle = rgba(mix(NA, WHITE, 0.5), 0.45 * br)
      glow.beginPath()
      glow.arc(lx, ly, 9 + 4 * up, 0, TAU)
      glow.fill()
      pen.fill(P.circle(lx, ly, 3 + 1.4 * up), WHITE, 1)
      // dust in the air, lit as the lamp passes
      const lit = 0.9 * R
      for (const m of dust) {
        const [x, y] = moteAt(m, t, box, 5)
        const d = Math.hypot(x - lx, y - ly)
        if (d >= lit) continue
        const f = 1 - d / lit
        ctx.fillStyle = rgba(WHITE, m.a * 2.4 * f * f * br)
        ctx.beginPath()
        ctx.arc(x, y, m.r, 0, TAU)
        ctx.fill()
      }
    },
  }
}
