import { NA, NB, NC, WHITE, mix, rgba, type RGB, type Scene } from '../../service/scenes/kit'
import { MARK, markLength, markOutline } from '../logo'
import { MARK_DIAMOND } from '../../logo/svgSource'
import { TAU, clamp01, hash, wash } from '../../service/stat/pictures/lib'

/*
 * MOTES: a cloud of lit dust that gathers into the mark, holds, and drifts
 * apart. Every mote has a home on the glass: along loop A, along loop B, on
 * the diamond's edge or inside its fill. On a twelve-second cycle the dust
 * drifts as a slow turbulent cloud across the whole box, dim and whitish;
 * then, loop A first, loop B after, the diamond last, each mote is sprung to
 * its home, overshoots a touch and settles, brightening as it lands, so the
 * mark assembles out of the air; it holds five seconds, jittering and
 * twinkling, a tenth of it white-hot; then a gust runs left to right and the
 * dust lifts off the glass and drifts away. The hand pushes the dust aside
 * within 140 px (a hole opens in the mark, the spring closes it once the hand
 * leaves) and lights what it touches; pressing pushes harder.
 *
 * Positions and velocities live in Float32Arrays; the air is a curl field
 * (four shear waves, divergence-free, so the cloud never clumps); the
 * spring is underdamped while gathering and near-critical while holding.
 * Drawn batched: each mote is a short stroke from where it was a moment ago
 * to where it is (a dot at rest, a streak in flight), sorted into Path2D by
 * colour and brightness tier, a few dozen strokes a frame on each layer.
 */
const CYCLE = 12
const PHASE0 = 3.3 // the cycle's phase at t = 0: the first gather comes at once
const GATHER_AT = 3.4
const RELEASE_AT = 10.4
const TIERS = 8
/** the white-hot tenth's own brightness, against the untamed mote: lit, never clipped */
const HOTK = 0.65
const LIGHTS: RGB[] = [NA, NB, NC]
/**
 * the dust's own colour when lit: the light, barely warmed (the white-hot tenth and the sparkles do
 * the rest). Any more white and the strokes' additive overlap under the bloom clips loop B to cyan.
 */
const LIT = LIGHTS.map(c => mix(c, WHITE, 0.12))
const ROOM = mix(NA, NB, 0.35)
/** the diamond's corners (mark units): right, bottom, left, top */
const CORNERS = (MARK_DIAMOND.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)

export default function motes(): Scene {
  let n = 0
  let cx = 0, cy = 0, size = 100, s = 1
  let r = 1.2, litR = 24, J = 0.6, alphaK = 1, pushR = 140
  // the air's four shear waves (three broad, one fine that parts neighbours): direction, wavenumber, speed
  const wux = [0, 0, 0, 0], wuy = [0, 0, 0, 0], wk = [0, 0, 0, 0], wv = [0, 0, 0, 0]
  // per mote
  let hx = new Float32Array(0), hy = hx, x = hx, y = hx, vx = hx, vy = hx
  let gAt = hx, rAt = hx, dX = hx, dY = hx, wgt = hx, dim = hx, f1 = hx, p1 = hx, f2 = hx, p2 = hx
  let kind = new Uint8Array(0), white = kind, was = kind
  let fresh = true
  const lit = [0, 0, 0]
  const count = [0, 0, 0]
  const ph = [0, 0, 0, 0]

  return {
    init(w, h) {
      size = Math.min(h * 0.72, w * 0.6)
      cx = w / 2
      cy = h / 2
      s = size / MARK.h
      r = Math.max(0.8, Math.min(2.4, size * 0.0046))
      litR = Math.max(14, size * 0.09)
      pushR = Math.min(140, Math.max(60, size * 0.48)) // the hand's reach, within 140 px (less on a phone, where the mark is small)
      J = 0.45 + size * 0.0015
      n = Math.round(Math.max(1000, Math.min(2000, (w * h) / 140)))
      const nLoop = Math.round(n * 0.36)
      const nEdge = Math.round(n * 0.07)
      const nFill = n - 2 * nLoop - nEdge
      hx = new Float32Array(n)
      hy = new Float32Array(n)
      x = new Float32Array(n)
      y = new Float32Array(n)
      vx = new Float32Array(n)
      vy = new Float32Array(n)
      gAt = new Float32Array(n)
      rAt = new Float32Array(n)
      dX = new Float32Array(n)
      dY = new Float32Array(n)
      wgt = new Float32Array(n)
      dim = new Float32Array(n)
      f1 = new Float32Array(n)
      p1 = new Float32Array(n)
      f2 = new Float32Array(n)
      p2 = new Float32Array(n)
      kind = new Uint8Array(n)
      white = new Uint8Array(n)
      was = new Uint8Array(n)
      count[0] = count[1] = nLoop
      count[2] = nEdge + nFill
      // the homes, in px (the mark centred, `size` tall: markFrame's own placing)
      const ox = cx - (MARK.w * s) / 2, oy = cy - (MARK.h * s) / 2
      const loops = markOutline(720)
      const edge = markOutline(160)[2]
      let i = 0
      const place = (k: number, mx: number, my: number, weight: number) => {
        hx[i] = ox + mx * s
        hy[i] = oy + my * s
        kind[i] = k
        wgt[i] = weight
        i++
      }
      for (let k = 0; k < 2; k++) {
        for (let j = 0; j < nLoop; j++) {
          const [mx, my] = loops[k][Math.floor((j * 720) / nLoop)]
          place(k, mx, my, 1)
        }
      }
      for (let j = 0; j < nEdge; j++) {
        const [mx, my] = edge[Math.floor((j * 160) / nEdge)]
        place(2, mx, my, 0.7)
      }
      // a scatter inside the diamond's fill (bilinear over its corners, kept off the edge)
      const [Rx, Ry, Bx, By, Lx, Ly, Tx, Ty] = CORNERS
      for (let j = 0; j < nFill; j++) {
        const u = 0.06 + 0.88 * hash(j * 5 + 1), v = 0.06 + 0.88 * hash(j * 5 + 2)
        const ax = Tx + (Rx - Tx) * u, ay = Ty + (Ry - Ty) * u
        const bx = Lx + (Bx - Lx) * u, by = Ly + (By - Ly) * u
        place(2, ax + (bx - ax) * v, ay + (by - ay) * v, 0.2)
      }
      // each mote's own time: when it gathers (A, then B, then the diamond), when the gust takes it (left to right), its drift, its twinkle
      for (let i = 0; i < n; i++) {
        const H = (k: number) => hash(i * 31 + k)
        dX[i] = (H(3) - 0.5) * 28
        dY[i] = (H(4) - 0.5) * 28
        gAt[i] = GATHER_AT + 0.45 * kind[i] + 0.6 * H(5)
        rAt[i] = RELEASE_AT + 0.8 * clamp01((hx[i] - (cx - size * 0.5)) / size) + 0.3 * H(6)
        f1[i] = 1.2 + 2 * H(7)
        p1[i] = TAU * H(8)
        f2[i] = 0.8 + 1.6 * H(9)
        p2[i] = TAU * H(10)
        white[i] = H(11) < 0.1 ? 1 : 0
        dim[i] = 0.17 + 0.16 * H(12)
      }
      // the dust along a loop: packed tighter than a grain is wide, the strokes add up and the loop's
      // colour would clip to white under the bloom, so they go fainter by how many grains cover a point
      const spacing = (markLength(0) * s) / nLoop
      alphaK = Math.max(0.25, Math.min(1, 0.9 / Math.max(1, (2 * r) / spacing)))
      // the air
      const L = Math.max(w, h)
      const V = 26 + size * 0.07
      const angles = [0.4, 2.1, 3.9, 1.2], lams = [0.6, 0.33, 0.18, 0.07], speeds = [0.55, 0.3, 0.2, 0.35]
      for (let j = 0; j < 4; j++) {
        wux[j] = Math.cos(angles[j])
        wuy[j] = Math.sin(angles[j])
        wk[j] = TAU / (lams[j] * L)
        wv[j] = V * speeds[j] * 2
      }
      fresh = true
    },

    frame(pen, w, h, pointer, dt, t) {
      const { ctx, glow } = pen
      const tc = (t + PHASE0) % CYCLE
      const inside = pointer.inside
      const px = pointer.x, py = pointer.y
      const pushF = pointer.down ? 1.7 : 1
      ph[0] = 0.21 * t
      ph[1] = -0.17 * t + 1.7
      ph[2] = 0.29 * t + 4.1
      ph[3] = 0.9 * t + 2.3
      const slot = Math.floor(t * 5) * 7919
      const sharp: Path2D[] = []
      const bloom: Path2D[] = []
      for (let i = 0; i < 4 * TIERS; i++) sharp.push(new Path2D())
      for (let i = 0; i < 3 * TIERS; i++) bloom.push(new Path2D())
      lit[0] = lit[1] = lit[2] = 0
      const tail = 0.022, tailMax = 26
      const fast2 = (tailMax / tail) * (tailMax / tail)

      for (let i = 0; i < n; i++) {
        const k = kind[i]
        const sprung = tc >= gAt[i] && tc < rAt[i]
        if (fresh) {
          // a new box: the settled ones at home, the rest in the air
          if (sprung && tc - gAt[i] > 1.2) {
            x[i] = hx[i]
            y[i] = hy[i]
          } else {
            x[i] = hash(i * 31 + 1) * w
            y[i] = hash(i * 31 + 2) * h
          }
          vx[i] = vy[i] = 0
          was[i] = sprung ? 1 : 0
        }
        let X = x[i], Y = y[i], VX = vx[i], VY = vy[i]
        // the hand
        let q = 0, ux = 0, uy = 0
        if (inside) {
          const ddx = X - px, ddy = Y - py
          const d2 = ddx * ddx + ddy * ddy
          if (d2 < pushR * pushR && d2 > 0.01) {
            const d = Math.sqrt(d2)
            q = 1 - d / pushR
            ux = ddx / d
            uy = ddy / d
          }
        }
        if (sprung) {
          // sprung home: underdamped while it gathers (the overshoot), near-critical while it holds
          const age = tc - gAt[i]
          const om = age < 2.4 ? 5.2 : 7.5
          const ze = age < 2.4 ? 0.74 : 0.95
          const kk = om * om, cc = 2 * ze * om
          const push = 5000 * q * pushF
          VX += (-kk * (X - hx[i]) - cc * VX + push * ux) * dt
          VY += (-kk * (Y - hy[i]) - cc * VY + push * uy) * dt
        } else {
          if (was[i]) {
            // the gust: it lifts off the glass, up and a little outward
            const ox = hx[i] - cx, oy = hy[i] - cy
            const d = Math.hypot(ox, oy) || 1
            VX += (hash(i * 7 + 1) - 0.5) * 110 + (ox / d) * 24
            VY += -(20 + 70 * hash(i * 7 + 2)) + (oy / d) * 24
          }
          // the air: the curl field, its own drift, the hand's push
          let fx = dX[i] + 3, fy = dY[i] - 2
          for (let j = 0; j < 4; j++) {
            const c = Math.cos(wk[j] * (wux[j] * X + wuy[j] * Y) + ph[j])
            fx += wv[j] * wuy[j] * c
            fy -= wv[j] * wux[j] * c
          }
          fx += ux * q * 170 * pushF
          fy += uy * q * 170 * pushF
          const kR = Math.min(1, (q > 0 ? 4 : 1.4) * dt)
          VX += (fx - VX) * kR
          VY += (fy - VY) * kR
        }
        was[i] = sprung ? 1 : 0
        X += VX * dt
        Y += VY * dt
        if (!sprung) {
          // loose dust stays in the box (it comes back in from the other side)
          if (X < -24) X += w + 48
          else if (X > w + 24) X -= w + 48
          if (Y < -24) Y += h + 48
          else if (Y > h + 24) Y -= h + 48
        }
        x[i] = X
        y[i] = Y
        vx[i] = VX
        vy[i] = VY

        // how lit: it brightens as it lands, stays lit while held (even pushed aside), fades as it lifts off
        const ddx = X - hx[i], ddy = Y - hy[i]
        const dh = Math.sqrt(ddx * ddx + ddy * ddy)
        let near = clamp01(1 - dh / litR)
        if (sprung) near = Math.max(near, clamp01((tc - gAt[i] - 0.7) / 0.5))
        else near *= clamp01(1 - (((tc - rAt[i] + CYCLE) % CYCLE) / 1.5))
        lit[k] += near
        const twinkle = 0.78 + 0.22 * Math.sin(t * f2[i] + p2[i])
        let b = dim[i] + (1 - dim[i]) * near * twinkle
        if (q > 0) b += 0.5 * q
        b *= wgt[i]
        // on a loop the dust packs tight and its strokes add up, so it goes fainter there; a lone mote keeps
        // its light, and so does the white-hot tenth (its own tier, from the untamed mote)
        const hotTier = Math.min(TIERS - 1, Math.floor(b * HOTK * TIERS))
        if (dh < 6 && k < 2) b *= alphaK
        if (b < 0.03) continue
        const tier = Math.min(TIERS - 1, Math.floor(b * TIERS))
        const hotW = near > 0.5 && (white[i] === 1 || hash(i * 13 + slot) > 0.985)
        // the held mote's tiny jitter
        let X1 = X, Y1 = Y
        if (near > 0) {
          const a = J * near
          X1 += a * Math.sin(t * f1[i] * 2.2 + p1[i])
          Y1 += a * Math.cos(t * f1[i] * 1.7 + p1[i] * 1.3)
        }
        // the stroke: from where it was a moment ago (a streak in flight, a dot at rest)
        const v2 = VX * VX + VY * VY
        let tx: number, ty: number
        if (v2 < 20) {
          tx = X1 + 0.05
          ty = Y1
        } else {
          const f = v2 > fast2 ? tailMax / (Math.sqrt(v2) * tail) : 1
          tx = X1 - VX * tail * f
          ty = Y1 - VY * tail * f
        }
        const sp = hotW ? sharp[3 * TIERS + hotTier] : sharp[k * TIERS + tier]
        sp.moveTo(tx, ty)
        sp.lineTo(X1, Y1)
        const bp = bloom[k * TIERS + tier]
        bp.moveTo(tx, ty)
        bp.lineTo(X1, Y1)
      }
      fresh = false

      // the strokes: the sharp layer in each contour's light (white dust while loose), the bloom in the light itself
      for (let k = 0; k < 3; k++) {
        lit[k] = count[k] ? lit[k] / count[k] : 0
        const col = mix(WHITE, LIT[k], lit[k])
        for (let tier = 0; tier < TIERS; tier++) {
          const aT = (tier + 1) / TIERS
          ctx.lineWidth = 2 * r
          ctx.strokeStyle = rgba(col, aT * 0.8)
          ctx.stroke(sharp[k * TIERS + tier])
          glow.lineWidth = 2 * r * 2.8
          glow.strokeStyle = rgba(LIGHTS[k], aT * 0.8 * (0.3 + 0.7 * lit[k]))
          glow.stroke(bloom[k * TIERS + tier])
        }
      }
      ctx.lineWidth = 2.5 * r
      for (let tier = 0; tier < TIERS; tier++) {
        ctx.strokeStyle = rgba(WHITE, (tier + 1) / TIERS)
        ctx.stroke(sharp[3 * TIERS + tier])
      }
      // the room's light, from the lit mark
      const litAll = (lit[0] + lit[1] + lit[2]) / 3
      wash(pen, ROOM, cx, cy, size * 0.8, size * 0.7, 0.08 * litAll)
    },
  }
}
