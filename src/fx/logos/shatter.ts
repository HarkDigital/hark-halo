import { NA, NC, P, WHITE, mix, rgba, type RGB, type Scene } from '../../service/scenes/kit'
import { MARK, markBounds, markFrame, markOutline } from '../logo'
import { TAU, breath, clamp01, easeInOut, easeOut, hash, smooth, span, wash } from '../../service/stat/pictures/lib'

/*
 * SHATTER: the mark in frosted glass. Each contour is a pale fill with a
 * brighter rim, lit from within by a faint wash (NA in the loops, NC in the
 * diamond) that breathes, a slow sheen crossing it, a sparse grain in the
 * frost. In init the mark is cut into shards: a tilted, jittered grid of
 * cells over its box, each shard the mark clipped to one cell. Whole, the
 * shards sit exactly in place and the joins are invisible: the idle mark is
 * drawn in one piece, and under the hand only the lifted shards are drawn on
 * their own (the one piece is carved around their cells, even-odd).
 *
 * Struck (a press on it, or every ~9 s from the diamond), every shard flies
 * from the impact (the nearest fastest, the far ones hardly, mostly dropping),
 * spins, and falls under a little gravity for 1.4 s, its cut edges lit
 * white-hot in NA while the frost fades; then each eases home over 1.2 s and
 * the mark is whole again with a flash along the joins. Holding the press
 * keeps it broken, the shards hanging in the air, until it is let go.
 * Without pressing, a cold glint tracks the hand over the glass (a sheen
 * around it, and a specular on the rim nearest it that runs along the
 * contour) and the shards nearest it lift 2 px and show their edges.
 */
const GRID = 8 // cells across the jittered grid
const JIT = 0.22 // vertex jitter, in cells (under 0.25 keeps every cell convex)
const TILT = 0.21 // the grid's tilt, so the cracks cross the mark's own diagonals
const FLY = 1.4 // s in the air
const BACK = 1.2 // s easing home
const STAG = 0.15 // s of per-shard delay on the way home
const PERIOD = 9 // s between breaks when nobody touches it
const DRAG = 1.6 // air, 1/s
const G = 0.17 // gravity, mark heights per s²
const REACH = 160 // px the glint reaches
const LIFT_R = 110 // px within which shards lift to the hand

interface Shard {
  /** contour */
  i: number
  c: RGB
  /** the cell polygon, mark units */
  cell: Path2D
  cellId: number
  /** the shard's centre (its pivot), mark units */
  x: number
  y: number
  seed: number
  ph: number
  /** delay before it heads home */
  st: number
  vx: number
  vy: number
  spin: number
  /** how near the impact it was (1 at the point, fading out), for the heat of its edges */
  near: number
  /** the hand's lift, smoothed */
  lift: number
}

/** ray cast: is (x, y) inside the polygon */
function inPoly(pts: [number, number][], x: number, y: number) {
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]
    const [xj, yj] = pts[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

export default function shatter(): Scene {
  let cx = 0, cy = 0, size = 100, s = 1, ox = 0, oy = 0
  let shards: Shard[] = []
  let net = new Path2D()
  let all = new Path2D()
  let loops = new Path2D()
  let grain: Path2D[] = []
  let outline: [number, number][][] = []
  let carved = new Uint8Array(GRID * GRID)
  let breakAt = -1e9, returnAt = -1e9, joinAt = -1e9
  let nextAuto = 4.5
  let breaks = 0
  let impact: [number, number] = [MARK.cx, MARK.cy]
  let latch = false
  let hov = 0

  const W = (px: number) => px / s

  /** every shard gets its flight from the impact: the nearest fly, the far ones mostly drop */
  const doBreak = () => {
    const [ix, iy] = impact
    const k = breaks * 977
    for (const sh of shards) {
      const ddx = sh.x - ix, ddy = sh.y - iy
      const d = Math.hypot(ddx, ddy)
      const near = Math.exp(-d / (0.42 * MARK.h))
      const sp = Math.min(0.6, (0.07 + 0.5 * Math.pow(near, 1.4)) * (0.55 + 0.9 * hash(sh.seed + k + 1))) * MARK.h
      const a = (d < 1 ? hash(sh.seed + k + 7) * TAU : Math.atan2(ddy, ddx)) + (hash(sh.seed + k + 2) - 0.5) * 0.6
      const h3 = hash(sh.seed + k + 3)
      sh.near = near
      sh.vx = Math.cos(a) * sp
      sh.vy = Math.sin(a) * sp - MARK.h * (0.04 + 0.3 * h3 * h3 * (0.4 + near))
      sh.spin = (hash(sh.seed + k + 4) - 0.5) * 2 * (0.6 + 3 * near)
    }
  }

  /** a layer moved to a shard's pose and clipped to its cell */
  const shardFrame = (c: CanvasRenderingContext2D, sh: Shard, dx: number, dy: number, ang: number) => {
    c.save()
    if (dx !== 0 || dy !== 0 || ang !== 0) {
      c.translate(sh.x + dx, sh.y + dy)
      if (ang !== 0) c.rotate(ang)
      c.translate(-sh.x, -sh.y)
    }
    c.clip(sh.cell)
  }

  /**
   * a cold glint lying ON the rim: the contour's own points for `L` mark units either side of
   * point k, stroked white with soft ends (sharp layer only; the outline is evenly spaced)
   */
  const rimGlint = (ctx: CanvasRenderingContext2D, pts: [number, number][], k: number, L: number, a: number, w: number) => {
    const n = pts.length
    let i0 = k, i1 = k, acc = 0
    while (acc < L) {
      const j = (i0 - 1 + n) % n
      acc += Math.hypot(pts[j][0] - pts[i0][0], pts[j][1] - pts[i0][1])
      i0 = j
      if (i0 === k) break
    }
    acc = 0
    while (acc < L) {
      const j = (i1 + 1) % n
      acc += Math.hypot(pts[j][0] - pts[i1][0], pts[j][1] - pts[i1][1])
      i1 = j
      if (i1 === k) break
    }
    const p = new Path2D()
    p.moveTo(pts[i0][0], pts[i0][1])
    for (let i = (i0 + 1) % n, m = 0; m < n; i = (i + 1) % n, m++) {
      p.lineTo(pts[i][0], pts[i][1])
      if (i === i1) break
    }
    const g = ctx.createLinearGradient(pts[i0][0], pts[i0][1], pts[i1][0], pts[i1][1])
    g.addColorStop(0, rgba(WHITE, 0))
    g.addColorStop(0.5, rgba(WHITE, a))
    g.addColorStop(1, rgba(WHITE, 0))
    ctx.strokeStyle = g
    ctx.lineWidth = w
    ctx.stroke(p)
  }

  /** the glass rim: a soft body and a bright hairline */
  const sleeve = (ctx: CanvasRenderingContext2D, p: Path2D, a: number) => {
    if (a <= 0.004) return
    ctx.lineWidth = W(4)
    ctx.strokeStyle = rgba(WHITE, a * 0.18)
    ctx.stroke(p)
    ctx.lineWidth = W(1.1)
    ctx.strokeStyle = rgba(WHITE, a)
    ctx.stroke(p)
  }

  /** the frost as a gradient: pale white brightest top left, a sheen crossing it, the inner tint folded in */
  const frost = (ctx: CanvasRenderingContext2D, c: RGB, tint: number, fb: number, pb: number) => {
    const g = ctx.createLinearGradient(0, 0, MARK.w, MARK.h)
    const base = (p: number) => (0.165 + (0.105 - 0.165) * p) * fb
    const sheen = (p: number) => (Math.abs(p - pb) < 0.14 ? 0.06 * (1 - Math.abs(p - pb) / 0.14) : 0)
    const stop = (p: number) => {
      if (p < 0 || p > 1) return
      const a = base(p) + sheen(p)
      const t = a + tint
      g.addColorStop(p, rgba([(255 * a + c[0] * tint) / t, (255 * a + c[1] * tint) / t, (255 * a + c[2] * tint) / t], t))
    }
    stop(0)
    stop(pb - 0.14)
    stop(pb)
    stop(pb + 0.14)
    stop(1)
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
      all = new Path2D()
      loops = new Path2D()
      for (const p of MARK.all) all.addPath(p)
      loops.addPath(MARK.all[0])
      loops.addPath(MARK.all[1])
      carved = new Uint8Array(GRID * GRID)

      // ---- the cut: a tilted, jittered grid over the mark's box
      outline = markOutline(400)
      const boxes = markBounds()
      const R = 1040
      const cell = (2 * R) / GRID
      const cs = Math.cos(TILT), sn = Math.sin(TILT)
      const V: [number, number][][] = []
      for (let r = 0; r <= GRID; r++) {
        V[r] = []
        for (let c = 0; c <= GRID; c++) {
          const gx = -R + c * cell + (hash(r * 131 + c * 17 + 3) - 0.5) * 2 * JIT * cell
          const gy = -R + r * cell + (hash(r * 131 + c * 17 + 4) - 0.5) * 2 * JIT * cell
          V[r][c] = [MARK.cx + gx * cs - gy * sn, MARK.cy + gx * sn + gy * cs]
        }
      }
      // the crack net, each edge once (for the flash at the join)
      net = new Path2D()
      for (let r = 0; r <= GRID; r++) {
        net.moveTo(V[r][0][0], V[r][0][1])
        for (let c = 1; c <= GRID; c++) net.lineTo(V[r][c][0], V[r][c][1])
      }
      for (let c = 0; c <= GRID; c++) {
        net.moveTo(V[0][c][0], V[0][c][1])
        for (let r = 1; r <= GRID; r++) net.lineTo(V[r][c][0], V[r][c][1])
      }
      // the shards: every (cell, contour) that overlap
      shards = []
      let k = 0
      for (let r = 0; r < GRID; r++) {
        for (let c = 0; c < GRID; c++) {
          const poly: [number, number][] = [V[r][c], V[r][c + 1], V[r + 1][c + 1], V[r + 1][c]]
          let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity
          for (const [px, py] of poly) {
            if (px < bx0) bx0 = px
            if (py < by0) by0 = py
            if (px > bx1) bx1 = px
            if (py > by1) by1 = py
          }
          let cp: Path2D | null = null
          for (let i = 0; i < 3; i++) {
            const b = boxes[i]
            if (bx1 < b.x || bx0 > b.x + b.w || by1 < b.y || by0 > b.y + b.h) continue
            let sx = 0, sy = 0, n = 0
            for (let a = 0; a < 7; a++) {
              for (let q = 0; q < 7; q++) {
                const px = bx0 + ((a + 0.5) / 7) * (bx1 - bx0)
                const py = by0 + ((q + 0.5) / 7) * (by1 - by0)
                if (inPoly(poly, px, py) && inPoly(outline[i], px, py)) {
                  sx += px
                  sy += py
                  n++
                }
              }
            }
            let ex = 0, ey = 0, m = 0
            for (const [px, py] of outline[i]) {
              if (inPoly(poly, px, py)) {
                ex += px
                ey += py
                m++
              }
            }
            if (n + m === 0) continue
            // the pivot: the area samples, steadied by the edge points (a sliver has only those)
            const x = (sx + ex * 0.35) / (n + m * 0.35)
            const y = (sy + ey * 0.35) / (n + m * 0.35)
            if (!cp) {
              cp = new Path2D()
              cp.moveTo(poly[0][0], poly[0][1])
              for (let v = 1; v < 4; v++) cp.lineTo(poly[v][0], poly[v][1])
              cp.closePath()
            }
            shards.push({
              i,
              c: i === 2 ? NC : NA,
              cell: cp,
              cellId: r * GRID + c,
              x,
              y,
              seed: 1000 + k * 13 + i * 7,
              ph: hash(k * 3 + i + 5) * TAU,
              st: STAG * hash(k * 5 + i + 2),
              vx: 0,
              vy: 0,
              spin: 0,
              near: 0,
              lift: 0,
            })
            k++
          }
        }
      }
      // the frost's grain: a sparse sparkle inside the glass, in three groups that twinkle apart
      grain = [new Path2D(), new Path2D(), new Path2D()]
      const gs = W(1.2)
      let got = 0
      for (let n = 0; n < 1600 && got < 100; n++) {
        const px = hash(n * 2 + 11) * MARK.w
        const py = hash(n * 2 + 12) * MARK.h
        let hit = false
        for (let i = 0; i < 3 && !hit; i++) {
          const b = boxes[i]
          if (px < b.x || px > b.x + b.w || py < b.y || py > b.y + b.h) continue
          hit = inPoly(outline[i], px, py)
        }
        if (!hit) continue
        grain[got % 3].rect(px - gs / 2, py - gs / 2, gs, gs)
        got++
      }
      // a resize mid-flight: the new shards take up the same break
      if (joinAt < breakAt) doBreak()
    },

    frame(pen, w, h, pointer, dt, t) {
      const { ctx, glow } = pen
      const br = breath(t, 5.2, 0.36)
      const sb = breath(t, 5.2, 0.12, 1)
      const mx = (pointer.x - ox) / s, my = (pointer.y - oy) / s
      hov += ((pointer.inside ? 1 : 0) - hov) * Math.min(1, 8 * dt)
      if (!pointer.down) latch = false

      // ---- the clock: whole, flying, hanging, coming home
      let whole = joinAt >= breakAt
      if (whole) {
        const press = pointer.inside && pointer.down && !latch
        if (press || t >= nextAuto) {
          breakAt = t
          breaks++
          impact = press ? [Math.max(-100, Math.min(MARK.w + 100, mx)), Math.max(-100, Math.min(MARK.h + 100, my))] : [MARK.cx, MARK.cy]
          if (press) latch = true
          doBreak()
          whole = false
        }
      }
      const tf = t - breakAt
      let returning = returnAt > breakAt
      if (!whole && !returning && tf >= FLY && !(pointer.down && pointer.inside)) {
        returnAt = t
        returning = true
      }
      const tr = returning ? t - returnAt : 0
      if (!whole && returning && tr >= BACK + STAG) {
        joinAt = t
        nextAuto = t + PERIOD - FLY - BACK - STAG
        whole = true
      }
      const fl = joinAt > breakAt && t - joinAt < 1.6 ? Math.exp(-4 * (t - joinAt)) : 0
      const burst = whole ? 0 : clamp01(1 - tf / 0.55)
      // time spent hanging (held), frozen once it heads home
      const hbT = Math.max(0, (returning ? returnAt - breakAt : tf) - FLY)
      const bobK = 1 - Math.exp(-2 * hbT)

      // the hand lifts the shards nearest it (on the whole mark); their cells are carved out of the one piece
      carved.fill(0)
      let nCarved = 0
      for (const sh of shards) {
        let want = 0
        if (whole && pointer.inside) {
          const d = Math.hypot((sh.x - mx) * s, (sh.y - my) * s)
          if (d < LIFT_R) {
            want = 1 - d / LIFT_R
            want *= want
          }
        }
        sh.lift += (want - sh.lift) * Math.min(1, 10 * dt)
        if (whole && sh.lift > 0.02 && !carved[sh.cellId]) {
          carved[sh.cellId] = 1
          nCarved++
        }
      }

      // the room's light from the lit glass, flaring at the break and the join
      wash(pen, NA, cx, cy, size * 0.95, size * 0.8, 0.05 * br + 0.22 * burst + 0.18 * fl)
      if (burst > 0) wash(pen, NA, ox + impact[0] * s, oy + impact[1] * s, size * 0.4, size * 0.4, 0.45 * burst)

      ctx.save()
      glow.save()
      markFrame(ctx, cx, cy, size)
      markFrame(glow, cx, cy, size)

      const fb = 1 + 0.1 * Math.sin((TAU * t) / 5.2 + 0.8)
      const pb = ((t / 11) % 1) * 1.5 - 0.25
      const tint = 0.015 * br
      const fgA = frost(ctx, NA, tint, fb, pb)
      const fgC = frost(ctx, NC, tint, fb, pb)
      const washA = 0.042 * br

      /** one shard on its own: its inner light with it (glow), its frost, rim and cut edges (sharp) */
      const drawShard = (sh: Shard, dx: number, dy: number, ang: number, glassA: number, edgeOn: number, hotK: number, cutA: number, withGlow: boolean) => {
        const path = MARK.all[sh.i]
        const c = sh.c
        const lit = sh.lift
        if (withGlow) {
          shardFrame(glow, sh, dx, dy, ang)
          glow.fillStyle = rgba(c, washA * glassA)
          glow.fill(path)
          if (edgeOn > 0.004) {
            glow.clip(path)
            glow.lineWidth = W(2.2) * 2.6
            glow.strokeStyle = rgba(c, edgeOn)
            glow.stroke(sh.cell)
          }
          glow.restore()
        }
        shardFrame(ctx, sh, dx, dy, ang)
        ctx.globalAlpha = glassA
        ctx.fillStyle = sh.i === 2 ? fgC : fgA
        ctx.fill(path)
        if (lit > 0.004) {
          ctx.fillStyle = rgba(WHITE, 0.09 * lit)
          ctx.fill(path)
        }
        sleeve(ctx, path, 0.42 * sb + 0.35 * lit)
        ctx.globalAlpha = 1
        if (edgeOn > 0.004 || cutA > 0.004) {
          ctx.clip(path)
          if (edgeOn > 0.004) {
            ctx.lineWidth = W(2.2)
            ctx.strokeStyle = rgba(mix(c, WHITE, 0.8 * hotK), edgeOn * 0.8)
            ctx.stroke(sh.cell)
            ctx.lineWidth = W(1)
            ctx.strokeStyle = rgba(mix(c, WHITE, 0.62 + 0.38 * hotK), edgeOn)
            ctx.stroke(sh.cell)
          }
          if (cutA > 0.004) {
            ctx.lineWidth = W(1)
            ctx.strokeStyle = rgba(WHITE, cutA)
            ctx.stroke(sh.cell)
          }
        }
        ctx.restore()
      }

      if (whole) {
        // the inner light, in one piece (a 2 px lift is nothing to the bloom)
        glow.fillStyle = rgba(NA, washA)
        glow.fill(loops)
        glow.fillStyle = rgba(NC, washA)
        glow.fill(MARK.diamond)
        // the glass in one piece, carved around the lifted cells
        ctx.save()
        if (nCarved) {
          const carve = new Path2D()
          carve.rect(-300, -300, MARK.w + 600, MARK.h + 600)
          for (const sh of shards) {
            if (carved[sh.cellId] !== 1) continue
            carved[sh.cellId] = 2
            carve.addPath(sh.cell)
          }
          ctx.clip(carve, 'evenodd')
        }
        ctx.fillStyle = fgA
        ctx.fill(loops)
        ctx.fillStyle = fgC
        ctx.fill(MARK.diamond)
        sleeve(ctx, all, 0.42 * sb)
        ctx.restore()
        if (nCarved) {
          for (const sh of shards) {
            if (!carved[sh.cellId]) continue
            drawShard(sh, 0, -W(2) * sh.lift, 0, 1, 0, 0, 0.4 * sh.lift, false)
          }
        }
      } else {
        for (const sh of shards) {
          const tq = Math.min(tf, FLY)
          const k = (1 - Math.exp(-DRAG * tq)) / DRAG
          let dx = sh.vx * k
          let dy = sh.vy * k + 0.5 * G * MARK.h * tq * tq + 0.012 * MARK.h * bobK * Math.sin(1.2 * hbT + sh.ph)
          let ang = sh.spin * k + 0.05 * bobK * Math.sin(0.9 * hbT + sh.ph * 1.7)
          const f = smooth(tq / FLY)
          // the edges burn hottest and longest on the shards nearest the impact; the far ones only glow
          const heat = 0.5 + 0.5 * sh.near
          let glassA = 1 - 0.65 * f
          let edgeOn = (1.1 - 0.3 * f + 0.15 * bobK * Math.sin(3 * hbT + sh.ph)) * heat
          const hotK = clamp01(1 - tf / (0.22 + 0.3 * sh.near))
          if (returning) {
            const e = easeInOut(span(sh.st, sh.st + BACK, tr))
            dx *= 1 - e
            dy *= 1 - e
            ang *= 1 - e
            glassA = 0.35 + 0.65 * e
            edgeOn = 0.85 * (1 - e) * (0.65 + 0.35 * sh.near)
          }
          drawShard(sh, dx, dy, ang, glassA, edgeOn, hotK, 0, true)
        }
      }

      // the grain, while the glass is whole
      const ga = whole ? 1 : clamp01(1 - tf / 0.3)
      if (ga > 0.004) {
        for (let g = 0; g < 3; g++) {
          ctx.fillStyle = rgba(WHITE, ga * (0.04 + 0.05 * (0.5 + 0.5 * Math.sin(1.7 * t + 2.1 * g))))
          ctx.fill(grain[g])
        }
      }

      // the cold glint under the hand: a sheen on the glass around it, and a specular on the rim
      // nearest it (the edge catching the light, running along the contour as the hand moves)
      if (hov > 0.01 && whole) {
        let bi = 0, bk = 0, bd = Infinity
        for (let i = 0; i < 3; i++) {
          const pts = outline[i]
          for (let k = 0; k < pts.length; k++) {
            const ddx = pts[k][0] - mx, ddy = pts[k][1] - my
            const d2 = ddx * ddx + ddy * ddy
            if (d2 < bd) {
              bd = d2
              bi = i
              bk = k
            }
          }
        }
        const on = hov * (1 - clamp01((Math.sqrt(bd) * s) / REACH))
        if (on > 0.01) {
          ctx.save()
          ctx.clip(all)
          const R = W(REACH * 1.1)
          const gl = ctx.createRadialGradient(mx, my, 0, mx, my, R)
          gl.addColorStop(0, rgba(WHITE, 0.2 * on))
          gl.addColorStop(0.4, rgba(WHITE, 0.06 * on))
          gl.addColorStop(1, rgba(WHITE, 0))
          ctx.fillStyle = gl
          ctx.fillRect(mx - R, my - R, 2 * R, 2 * R)
          ctx.restore()
          const L = W(20 + 10 * on)
          rimGlint(ctx, outline[bi], bk, L * 1.5, 0.28 * on, W(4))
          rimGlint(ctx, outline[bi], bk, L, 0.95 * on, W(1.4))
        }
      }

      // the flash at the join: the rim, and every crack lit white for a moment
      if (fl > 0.004) {
        pen.neon(all, WHITE, 0.55 * fl, W(1.4))
        ctx.save()
        glow.save()
        ctx.clip(all)
        glow.clip(all)
        ctx.lineWidth = W(1.2)
        ctx.strokeStyle = rgba(WHITE, 0.9 * fl)
        ctx.stroke(net)
        glow.lineWidth = W(3.5)
        glow.strokeStyle = rgba(NA, 0.7 * fl)
        glow.stroke(net)
        ctx.restore()
        glow.restore()
      }

      // the impact: a white-hot point and a ring running out from it
      if (burst > 0) {
        const [ix, iy] = impact
        const u = 1 - burst
        pen.neon(P.circle(ix, iy, (0.03 + 0.55 * easeOut(u)) * MARK.h), NA, burst, W(1.8))
        pen.fill(P.circle(ix, iy, W(3 + 7 * burst)), WHITE, burst)
      }

      ctx.restore()
      glow.restore()
      void h
    },
  }
}
