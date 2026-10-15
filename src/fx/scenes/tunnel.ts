import { NA, NB, P, rgba, type RGB, type Scene } from '../../service/scenes/kit'
import { breath, clamp01, smooth, span, wash } from '../../service/stat/pictures/lib'

/*
 * TUNNEL: a grid of light rushing toward you. A rectangular tunnel the shape
 * of the box: a vanishing point V and 22 rings at depths z (1 at the viewer,
 * 0.02 far away), each a rectangle around V scaled by z, in NA (every fourth
 * in NB, a little brighter), faint and thin far off, bright and wide as they
 * arrive. They hang on eight glass rails from V to the box's corners and edge
 * midpoints. The rings run toward you geometrically (z grows by a ratio each
 * frame, the perspective of constant speed), respawning far when past; a soft
 * NA wash sits at V, the light at the end.
 *
 * V is not one point but a chain of eased points: the far end follows the
 * cursor first and the near end last, so steering bends the tunnel (the rails
 * curve through the rings' corners) instead of pivoting it stiffly. With no
 * pointer V drifts on a slow figure, so the tunnel sways on its own. Pressing
 * runs it at speed: each ring drags a soft trail back toward where it just
 * was (the band between the two, fading toward the tail) and the light at
 * the end flares.
 */

const RINGS = 22
const Z_MIN = 0.02
const Z_MAX = 1.18
/** the chain of eased vanishing points, far end first */
const STAGES = 8
/** where the rails are sampled in depth */
const RAIL_SAMPLES = 16

export default function tunnel(): Scene {
  let W = 0
  let H = 0
  let z = new Float64Array(RINGS)
  /** the box's anchors: four corners, then the four edge midpoints */
  let ax: number[] = []
  let ay: number[] = []
  let sx = new Float64Array(STAGES)
  let sy = new Float64Array(STAGES)
  let railZ: number[] = []
  let spd = 0.6
  let pull = 0
  /** a small box blooms wider in proportion (the blur is in CSS px): thinner, dimmer tubes there */
  let fit = 1
  const v: [number, number] = [0, 0]

  /** the vanishing point seen from depth zz (far rings see the leader, near rings the tail) */
  const vAt = (zz: number) => {
    const f = clamp01((zz - Z_MIN) / (1 - Z_MIN)) * (STAGES - 1)
    const i = Math.min(STAGES - 2, Math.floor(f))
    const k = f - i
    v[0] = sx[i] + (sx[i + 1] - sx[i]) * k
    v[1] = sy[i] + (sy[i + 1] - sy[i]) * k
    return v
  }

  /** the ring at depth zz about V: the box's corners drawn in toward V by (1 - zz) */
  const ringAt = (vx: number, vy: number, zz: number) => {
    const ring = new Path2D()
    ring.rect(vx * (1 - zz), vy * (1 - zz), W * zz, H * zz)
    return ring
  }

  /**
   * a ring's trail: the band between the rings at za and zb (za > zb) about
   * V, filled flat on `k` (the two rectangles are concentric, so even-odd
   * leaves exactly the band). Drawn on the contexts' own paths: no allocation.
   */
  const band = (k: CanvasRenderingContext2D, vx: number, vy: number, za: number, zb: number, c: RGB, a: number) => {
    if (a <= 0.004) return
    k.beginPath()
    k.rect(vx * (1 - za), vy * (1 - za), W * za, H * za)
    k.rect(vx * (1 - zb), vy * (1 - zb), W * zb, H * zb)
    k.fillStyle = rgba(c, a)
    k.fill('evenodd')
  }

  return {
    init(w, h) {
      W = w
      H = h
      ax = [0, w, w, 0, w / 2, w, w / 2, 0]
      ay = [0, 0, h, h, 0, h / 2, h, h / 2]
      const r = Math.pow(Z_MAX / Z_MIN, 1 / RINGS)
      z = new Float64Array(RINGS)
      for (let i = 0; i < RINGS; i++) z[i] = Z_MIN * Math.pow(r, i)
      sx = new Float64Array(STAGES).fill(w / 2)
      sy = new Float64Array(STAGES).fill(h / 2)
      const rr = Math.pow(1 / Z_MIN, 1 / (RAIL_SAMPLES - 1))
      railZ = []
      for (let i = 0; i < RAIL_SAMPLES; i++) railZ.push(Math.min(1, Z_MIN * Math.pow(rr, i)))
      spd = 0.6
      pull = 0
      fit = Math.max(0.66, Math.min(1, Math.min(w, h) / 400))
    },

    frame(pen, w, h, pointer, dt, t) {
      // ---- where the tunnel is headed: the cursor (within 35% of the box), else a slow drift
      pull += ((pointer.inside ? 1 : 0) - pull) * Math.min(1, 3 * dt)
      const cx = w / 2
      const cy = h / 2
      const dx = cx + 0.06 * w * Math.sin(t * 0.31) + 0.025 * w * Math.sin(t * 0.83 + 1.2)
      const dy = cy + 0.06 * h * Math.sin(t * 0.47 + 2.1) + 0.02 * h * Math.sin(t * 1.1)
      const px = cx + Math.max(-0.35 * w, Math.min(0.35 * w, pointer.x - cx))
      const py = cy + Math.max(-0.35 * h, Math.min(0.35 * h, pointer.y - cy))
      const tx = dx + (px - dx) * pull
      const ty = dy + (py - dy) * pull
      // the chain: the far end follows, each nearer stage follows the one before
      sx[0] += (tx - sx[0]) * Math.min(1, 5 * dt)
      sy[0] += (ty - sy[0]) * Math.min(1, 5 * dt)
      for (let i = 1; i < STAGES; i++) {
        sx[i] += (sx[i - 1] - sx[i]) * Math.min(1, 11 * dt)
        sy[i] += (sy[i - 1] - sy[i]) * Math.min(1, 11 * dt)
      }

      // ---- speed: a breath at rest, a surge while pressed
      const want = pointer.inside && pointer.down ? 2.2 : 0.6 * breath(t, 11, 0.12)
      spd += (want - spd) * Math.min(1, 2.5 * dt)
      const grow = 1 + spd * dt
      for (let i = 0; i < RINGS; i++) {
        z[i] *= grow
        if (z[i] > Z_MAX) z[i] *= Z_MIN / Z_MAX
      }
      // how hard it is rushing (0 at the resting pace, 1 at full press): the rings smear
      const rush = span(0.75, 2.2, spd)

      // ---- the rails: eight glass lines from V out to the box, bent with the chain
      const rails = new Path2D()
      for (let a = 0; a < 8; a++) {
        for (let s = 0; s < RAIL_SAMPLES; s++) {
          const zz = railZ[s]
          const vv = vAt(zz)
          const x = vv[0] + (ax[a] - vv[0]) * zz
          const y = vv[1] + (ay[a] - vv[1]) * zz
          if (s === 0) rails.moveTo(x, y)
          else rails.lineTo(x, y)
        }
      }
      pen.glass(rails, 0.14, 3)

      // ---- the rings
      // how far back a ring's trail reaches at this pace, as a share of its scale
      const tail = 0.11 * rush
      for (let i = 0; i < RINGS; i++) {
        const zz = z[i]
        if (zz > 1.06) continue
        const blue = i % 4 === 0
        const c: RGB = blue ? NB : NA
        // dark far off, bright only as it arrives, let go as it passes the box's edge
        let on = (0.02 + 0.8 * Math.pow(zz, 2)) * (1 - smooth(span(0.88, 1.06, zz))) * Math.sqrt(fit)
        if (blue) on *= 1.3
        if (on < 0.01) continue
        const lw = (1 + 2.2 * zz) * fit
        const vv = vAt(zz)
        const vx = vv[0]
        const vy = vv[1]
        pen.neon(ringAt(vx, vy, zz), c, on, lw)
        // at speed each ring drags a soft trail back toward where it just was:
        // the band between the two, in two steps so it fades toward the tail,
        // most of it bloom (the sharp layer keeps only a breath of colour)
        if (tail > 0.003 && on > 0.05) {
          const zb = zz / (1 + tail)
          const zm = zz / (1 + tail * 0.45)
          band(pen.glow, vx, vy, zz, zb, c, on * 0.07 * rush)
          band(pen.glow, vx, vy, zz, zm, c, on * 0.1 * rush)
          band(pen.ctx, vx, vy, zz, zb, c, on * 0.022 * rush)
          band(pen.ctx, vx, vy, zz, zm, c, on * 0.035 * rush)
        }
      }

      // ---- the light at the end: a soft NA wash at V, and a hot point
      const fx = sx[0]
      const fy = sy[0]
      wash(pen, NA, fx, fy, 0.17 * W, 0.17 * H, (0.17 + 0.16 * rush) * breath(t, 5, 0.2))
      pen.fill(P.circle(fx, fy, Math.max(1.2, 0.004 * Math.min(W, H)) * (1 + 0.6 * rush)), NA, 0.5 + 0.2 * Math.sin(t * 1.7) + 0.3 * rush)
    },
  }
}
