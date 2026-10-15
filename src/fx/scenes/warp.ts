import { NA, NB, WHITE, mix, rgba, type RGB, type Scene } from '../../service/scenes/kit'
import { TAU, clamp01, hash, smooth, wash } from '../../service/stat/pictures/lib'

/*
 * WARP: stars rushing past at speed. 420 stars sit in a cube about the viewer
 * (x, y across, z deep) and fall toward the eye each frame, projected from a
 * vanishing point V; each is a streak from where it was a moment ago to where
 * it is, so the near ones stretch and the far ones stay points. They are
 * white, one in eight in the first light, one in twelve in the second; the
 * nearest are wide and white-hot with a bead at the head. A faint wash of
 * light sits at V and brightens with speed. The field breathes on a slow sine
 * and surges every eleven seconds; V sways a little on its own.
 * The cursor steers: V eases toward it and the field sweeps the other way,
 * leaning into the turn (a sideways drift that near stars feel most, and a
 * small roll). Holding (or a finger down) eases the speed to 3.2x; letting go
 * eases it back.
 * Everything per frame is batched: one Path2D per depth bin per colour for
 * the whole streak, one for its front half and one for its head, stroked
 * thin and faint, wider, then full and white-hot, so each streak is a comet
 * (dark at the tail, lit to a hot head, the way the kit's streak reads) with
 * the three strokes adding up under 'lighter'. The heads are one fill per
 * bin. Positions live in Float32Arrays; the only randomness is a seeded
 * xorshift for the respawns.
 */
const N = 420
const HEADS = 40
/** depth bins, far to near: bin k holds z in (EDGES[k], EDGES[k-1]] */
const EDGES = [0.9, 0.75, 0.6, 0.45, 0.32, 0.2]
const ZMID = [0.95, 0.825, 0.675, 0.525, 0.385, 0.26, 0.1]
const BINS = ZMID.length
const ALPHA = ZMID.map(z => 0.06 + 0.9 * Math.pow(1 - z, 1.6))
const WIDTH = ZMID.map(z => 0.8 + 2.0 * Math.pow(1 - z, 1.6))
const COLS: RGB[] = [WHITE, NA, NB]
const HOTS: RGB[] = COLS.map(c => mix(c, WHITE, 0.62))
const WASH: RGB = mix(NA, WHITE, 0.55)

export default function warp(): Scene {
  // the stars: world position, colour (0 white, 1 NA, 2 NB), and this frame's head, tail and bin
  const X = new Float32Array(N)
  const Y = new Float32Array(N)
  const Z = new Float32Array(N)
  const HX = new Float32Array(N)
  const HY = new Float32Array(N)
  const C = new Uint8Array(N)
  const BIN = new Uint8Array(N)
  const zsort = new Float32Array(N)
  let F = 1 // the focal length: a star at depth z sits at V + (x, y) * F / z
  let M = 0 // the cull margin beyond the box
  let sx = 1 // the far plane's extent, in world units, that lands inside the box
  let sy = 1
  let q = 1 // stroke scale for the box
  let vx = 0 // V, and its velocity (px/s, smoothed)
  let vy = 0
  let pvx = 0
  let pvy = 0
  let mult = 1 // the speed multiplier: 1 at rest, 3.2 held
  let roll = 0
  let latx = 0 // the camera's sideways drift, world units/s
  let laty = 0
  let seed = 0x9e3779b9
  const rnd = () => {
    seed ^= seed << 13
    seed ^= seed >>> 17
    seed ^= seed << 5
    return (seed >>> 0) / 4294967296
  }
  const far = (i: number) => {
    Z[i] = 1
    X[i] = (rnd() * 2 - 1) * sx
    Y[i] = (rnd() * 2 - 1) * sy
  }

  return {
    init(w, h) {
      const big = Math.max(w, h)
      F = 0.28 * big
      M = 0.1 * big
      sx = Math.min(1, (0.5 * w) / F)
      sy = Math.min(1, (0.5 * h) / F)
      q = Math.max(0.75, Math.min(1.4, Math.min(w, h) / 412))
      seed = (0x9e3779b9 ^ (w * 7919 + h * 104729)) | 1
      vx = w / 2
      vy = h / 2
      pvx = pvy = 0
      mult = 1
      roll = 0
      latx = laty = 0
      for (let i = 0; i < N; i++) {
        const r = hash(i + 0.37)
        C[i] = r < 1 / 8 ? 1 : r < 1 / 8 + 1 / 12 ? 2 : 0
        // a full field from the first frame: every depth, inside the frustum at that depth
        const z = 0.06 + rnd() * 0.94
        Z[i] = z
        X[i] = (rnd() * 2 - 1) * Math.min(sx, (z * 0.5 * w) / F)
        Y[i] = (rnd() * 2 - 1) * Math.min(sy, (z * 0.5 * h) / F)
        BIN[i] = 255
        zsort[i] = 1
      }
    },
    frame(pen, w, h, pointer, dt, t) {
      const { ctx, glow } = pen
      const big = Math.max(w, h)
      // the speed: a slow breath, a surge every eleven seconds, and the hold
      const surge = smooth(clamp01(1 - Math.abs((t % 11) - 7.5) / 1.5))
      const want = pointer.inside && pointer.down ? 3.2 : 1 + 0.7 * surge
      mult += (want - mult) * Math.min(1, (want > mult ? 2.4 : 1.5) * dt)
      const sp = 0.42 * (1 + 0.16 * Math.sin((TAU * t) / 7.3)) * mult
      const trail = 0.085 * (0.55 + 0.45 * mult)
      // V eases to the hand, or sways on its own
      let tx: number, ty: number
      if (pointer.inside) {
        tx = Math.max(0.08 * w, Math.min(0.92 * w, pointer.x))
        ty = Math.max(0.1 * h, Math.min(0.9 * h, pointer.y))
      } else {
        tx = w / 2 + 0.04 * w * Math.sin(0.23 * t)
        ty = h / 2 + 0.035 * h * Math.sin(0.17 * t + 1.3)
      }
      const kv = Math.min(1, 3 * dt)
      const nvx = vx + (tx - vx) * kv
      const nvy = vy + (ty - vy) * kv
      if (dt > 1e-4) {
        const ks = Math.min(1, 10 * dt)
        pvx += ((nvx - vx) / dt - pvx) * ks
        pvy += ((nvy - vy) / dt - pvy) * ks
      }
      vx = nvx
      vy = nvy
      // steering: the field sweeps the other way and the view rolls into the turn
      const ox = (vx - w / 2) / (w / 2)
      const oy = (vy - h / 2) / (h / 2)
      const kl = Math.min(1, 2 * dt)
      latx += (-ox * 0.5 - latx) * kl
      laty += (-oy * 0.35 - laty) * kl
      roll += (-ox * 0.11 - roll) * kl

      // the room's light at V, brighter with speed (before the roll: it is radial anyway)
      const spd = clamp01((mult - 1) / 2.2)
      wash(pen, WASH, vx, vy, 0.42 * big, 0.42 * big, 0.04 + 0.06 * spd)
      wash(pen, WHITE, vx, vy, 0.12 * big, 0.12 * big, 0.03 + 0.05 * spd)

      // the stars: fall, cull, project head and tail, batch by bin and colour
      // (the whole streak; from bin 2 on, its front half and its head too, for the comet)
      const full: (Path2D | undefined)[] = new Array(BINS * 3)
      const mid: (Path2D | undefined)[] = new Array(BINS * 3)
      const front: (Path2D | undefined)[] = new Array(BINS * 3)
      const zt = sp * trail
      const tvx = vx - pvx * trail
      const tvy = vy - pvy * trail
      const lx = latx * trail
      const ly = laty * trail
      for (let i = 0; i < N; i++) {
        const z = Z[i] - sp * dt
        const x = X[i] + latx * dt
        const y = Y[i] + laty * dt
        // the tail: where the star was `trail` seconds ago (V and the drift included)
        const zb = z + zt
        const ax = tvx + ((x - lx) / zb) * F
        const ay = tvy + ((y - ly) / zb) * F
        if (z < 0.02 || ax < -M || ax > w + M || ay < -M || ay > h + M) {
          far(i)
          BIN[i] = 255
          zsort[i] = 1
          continue
        }
        X[i] = x
        Y[i] = y
        Z[i] = z
        const hx = vx + (x / z) * F
        const hy = vy + (y / z) * F
        HX[i] = hx
        HY[i] = hy
        let b = 0
        while (b < BINS - 1 && z <= EDGES[b]) b++
        BIN[i] = b
        zsort[i] = z
        const j = b * 3 + C[i]
        let p = full[j]
        if (!p) p = full[j] = new Path2D()
        p.moveTo(ax, ay)
        p.lineTo(hx, hy)
        if (b >= 2) {
          const dx = hx - ax
          const dy = hy - ay
          let m = mid[j]
          if (!m) m = mid[j] = new Path2D()
          m.moveTo(ax + dx * 0.45, ay + dy * 0.45)
          m.lineTo(hx, hy)
          let f = front[j]
          if (!f) f = front[j] = new Path2D()
          f.moveTo(ax + dx * 0.74, ay + dy * 0.74)
          f.lineTo(hx, hy)
        }
      }
      // the nearest 40 get a white-hot bead at the head, the streak's own width (the kit's streak
      // does the same), as bright as their streak; the near ones a halo in their colour
      zsort.sort()
      const zh = zsort[Math.min(HEADS, N) - 1]
      const heads: (Path2D | undefined)[] = new Array(BINS)
      const gheads: (Path2D | undefined)[] = new Array(BINS * 3)
      for (let i = 0; i < N; i++) {
        const b = BIN[i]
        if (b === 255 || Z[i] > zh) continue
        const r = WIDTH[b] * q * 0.62
        let p = heads[b]
        if (!p) p = heads[b] = new Path2D()
        p.moveTo(HX[i] + r, HY[i])
        p.arc(HX[i], HY[i], r, 0, TAU)
        if (b >= 4) {
          const j = b * 3 + C[i]
          let g = gheads[j]
          if (!g) g = gheads[j] = new Path2D()
          g.moveTo(HX[i] + r * 2.2, HY[i])
          g.arc(HX[i], HY[i], r * 2.2, 0, TAU)
        }
      }

      ctx.save()
      glow.save()
      ctx.translate(vx, vy)
      ctx.rotate(roll)
      ctx.translate(-vx, -vy)
      glow.translate(vx, vy)
      glow.rotate(roll)
      glow.translate(-vx, -vy)
      for (let b = 0; b < BINS; b++) {
        const a = ALPHA[b]
        const wd = WIDTH[b] * q
        const comet = b >= 2
        for (let c = 0; c < 3; c++) {
          const j = b * 3 + c
          const p = full[j]
          if (!p) continue
          const col = COLS[c]
          if (!comet) {
            // the far ones are points: one stroke each layer
            glow.lineWidth = wd * 2.6
            glow.strokeStyle = rgba(col, a)
            glow.stroke(p)
            ctx.lineWidth = wd
            ctx.strokeStyle = rgba(col, c === 0 ? a : a * 0.8)
            ctx.stroke(p)
            continue
          }
          const m = mid[j]!
          const f = front[j]!
          // the bloom: faint along the whole streak, full over its front half
          glow.lineWidth = wd * 2.6
          glow.strokeStyle = rgba(col, a * 0.45)
          glow.stroke(p)
          glow.strokeStyle = rgba(col, a * 0.55)
          glow.stroke(m)
          // the tube: a thin faint tail, wider and brighter through the middle, full at the head
          ctx.lineWidth = wd * 0.5
          ctx.strokeStyle = rgba(col, a * 0.28)
          ctx.stroke(p)
          ctx.lineWidth = wd * 0.8
          ctx.strokeStyle = rgba(col, a * 0.42)
          ctx.stroke(m)
          ctx.lineWidth = wd
          ctx.strokeStyle = rgba(col, a * 0.5)
          ctx.stroke(f)
          // the white-hot core at the head
          ctx.lineWidth = Math.max(0.7, wd * 0.45)
          ctx.strokeStyle = rgba(HOTS[c], a)
          ctx.stroke(f)
        }
      }
      for (let b = 0; b < BINS; b++) {
        const p = heads[b]
        if (p) {
          ctx.fillStyle = rgba(WHITE, Math.min(1, ALPHA[b] * 1.15))
          ctx.fill(p)
        }
        for (let c = 0; c < 3; c++) {
          const g = gheads[b * 3 + c]
          if (!g) continue
          glow.fillStyle = rgba(COLS[c], ALPHA[b] * 0.8)
          glow.fill(g)
        }
      }
      ctx.restore()
      glow.restore()
    },
  }
}
