import { NA, NB, NC, P, TAU, WHITE, rgba, strike, type Scene } from './kit'

/** the vessel's profile, base to lip: [radius, height], both of the model's height */
const PROFILE: [number, number][] = [
  [0.3, 0],
  [0.37, 0.05],
  [0.47, 0.15],
  [0.52, 0.28],
  [0.5, 0.41],
  [0.4, 0.55],
  [0.26, 0.67],
  [0.2, 0.77],
  [0.21, 0.88],
  [0.28, 1],
]
/** meridians round the vessel */
const M = 20
/** the render's cycle (s): wire, a render pass climbing from the base, a hold, the render melting back */
const CYCLE = 10
const clamp = (x: number, a = -1, b = 1) => (x < a ? a : x > b ? b : x)
const smooth = (x: number) => {
  x = clamp(x, 0, 1)
  return x * x * (3 - 2 * x)
}

/*
 * 3D MODELING — a model on a turntable. A lathe-turned vessel in glass wire
 * stands on a glass turntable right of centre and turns: its rings and
 * meridians are clear glass, the edges facing you lit a faint green, the far
 * side dim through the near. Every few seconds a render climbs it from the
 * base, a ring of light at the line: below it the wire fills with lit,
 * shaded facets (a key light from the upper left), above it the bare mesh;
 * the render holds, then melts back to wire. The cursor is the camera: the
 * view orbits toward the hand (the model turns and tips to meet it), a drag
 * or a flick spins the turntable, and the vertices under the hand light as
 * picked handles in the second colour, with the edge loop nearest it.
 */
export function turntable(): Scene {
  const NR = PROFILE.length
  // camera space, per vertex (ring j, meridian i at j * M + i)
  const X = new Float32Array(NR * M)
  const Y = new Float32Array(NR * M)
  const Z = new Float32Array(NR * M)
  // on screen
  const SX = new Float32Array(NR * M)
  const SY = new Float32Array(NR * M)
  let cx = 0, base = 0, H = 0, R = 0, F = 0, Rt = 0
  let yaw = 0, pitch = 0.36, spin = 0, spinV = 0
  let lastX = NaN
  let pick = 0
  let loopJ = -1, loopAge = 0

  return {
    init(w, h, framed) {
      // beside the copy on a laptop (the scrim darkens the art's left edge) the model stands right
      // of centre; centred in a band on a tablet; above the copy on a phone, clear of the header
      const side = !framed && w > 600
      H = Math.min(h * (framed ? 0.56 : side ? 0.5 : 0.44), w * (side ? 0.36 : 0.5))
      R = H * 0.9
      Rt = R * 0.66
      F = H * 4.2
      cx = w / 2 + (side ? w * 0.08 : 0)
      // the model's middle at the box's middle: the base sits half a height (seen from above) below it
      base = h / 2 + H * 0.46
      yaw = 0
      pitch = 0.36
      spin = spinV = 0
      lastX = NaN
      pick = 0
      loopJ = -1
      loopAge = 0
    },

    frame(pen, w, h, pointer, dt, t) {
      const { ctx, glow } = pen

      // ---- the camera: it orbits toward the hand; a drag or a flick spins the turntable
      const over = pointer.inside
      const wantYaw = over ? clamp((pointer.x - cx) / (w * 0.5)) * 0.6 : 0
      const wantPitch = 0.36 + (over ? clamp((pointer.y - (base - H / 2)) / (h * 0.5)) * 0.2 : 0)
      yaw += (wantYaw - yaw) * Math.min(1, dt * 3)
      pitch += (wantPitch - pitch) * Math.min(1, dt * 3)
      if (over && (pointer.down || !Number.isNaN(lastX))) {
        const dx = Number.isNaN(lastX) ? 0 : pointer.x - lastX
        if (pointer.down) spinV = (dx / Math.max(dt, 1e-3)) / (R * 1.2)
        else spinV += (dx / R) * 0.6
      }
      lastX = over ? pointer.x : NaN
      spinV *= Math.exp(-dt * 1.8)
      spin += (0.32 + spinV) * dt
      const psi = spin + yaw
      const cp = Math.cos(pitch), sp = Math.sin(pitch)
      const cs = Math.cos(psi), ss = Math.sin(psi)

      /** world (x right, y up, z toward you; the base's centre at 0) to camera space and screen */
      const toCam = (x: number, y: number, z: number): [number, number, number] => {
        const x1 = x * cs + z * ss
        const z1 = -x * ss + z * cs
        return [x1, y * cp - z1 * sp, y * sp + z1 * cp]
      }
      const toScreen = (x: number, y: number, z: number): [number, number] => {
        const s = F / (F - z)
        return [cx + x * s, base - y * s]
      }

      // ---- the vertices
      for (let j = 0; j < NR; j++) {
        const [pr, py] = PROFILE[j]
        for (let i = 0; i < M; i++) {
          const a = (TAU * i) / M
          const [x, y, z] = toCam(Math.cos(a) * pr * R, py * H, Math.sin(a) * pr * R)
          const k = j * M + i
          X[k] = x
          Y[k] = y
          Z[k] = z
          const [u, v] = toScreen(x, y, z)
          SX[k] = u
          SY[k] = v
        }
      }

      // ---- the turntable: a glass disc, its rim ticked, turning with the model; a marker bead on it
      const rim = (y: number, r: number) => {
        const q = new Path2D()
        for (let n = 0; n <= 64; n++) {
          const a = (TAU * n) / 64
          const [x, yy, z] = toCam(Math.cos(a) * r, y, Math.sin(a) * r)
          const [u, v] = toScreen(x, yy, z)
          if (n === 0) q.moveTo(u, v)
          else q.lineTo(u, v)
        }
        return q
      }
      const top = rim(0, Rt)
      ctx.fillStyle = rgba(WHITE, 0.02)
      ctx.fill(top)
      pen.glass(top, 0.3, 3)
      pen.glass(rim(-H * 0.05, Rt), 0.14, 2)
      pen.glass(rim(-H * 0.05, Rt * 0.82), 0.06, 2)
      const ticks = new Path2D()
      for (let n = 0; n < 36; n++) {
        const a = (TAU * n) / 36
        const [x0, y0, z0] = toCam(Math.cos(a) * Rt * 0.9, 0, Math.sin(a) * Rt * 0.9)
        const [x1, y1, z1] = toCam(Math.cos(a) * Rt * (n % 3 ? 0.95 : 0.98), 0, Math.sin(a) * Rt * (n % 3 ? 0.95 : 0.98))
        const [u0, v0] = toScreen(x0, y0, z0)
        const [u1, v1] = toScreen(x1, y1, z1)
        ticks.moveTo(u0, v0)
        ticks.lineTo(u1, v1)
      }
      pen.glass(ticks, 0.22, 1.5)
      {
        const [x, y, z] = toCam(Rt * 0.94, 0, 0)
        const [u, v] = toScreen(x, y, z)
        const on = 0.75 + 0.25 * Math.sin(t * 2.3)
        pen.fill(P.circle(u, v, Math.max(2, H * 0.012)), NC, on * (z > 0 ? 1 : 0.45))
      }
      // the model's light pooled on the disc
      const pool = glow.createRadialGradient(cx, base, 0, cx, base, Rt * 1.3)
      pool.addColorStop(0, rgba(NA, 0.1))
      pool.addColorStop(1, rgba(NA, 0))
      glow.fillStyle = pool
      glow.fillRect(cx - Rt * 1.4, base - Rt * 1.4, Rt * 2.8, Rt * 2.8)

      // ---- the render: a line climbs the vessel from the base; below it the facets light, then melt
      const ph = ((t + 3) % CYCLE) / CYCLE
      let scan = -1
      let fill = 0
      if (ph >= 0.45 && ph < 0.7) {
        scan = smooth((ph - 0.45) / 0.25)
        fill = 1
      } else if (ph >= 0.7 && ph < 0.88) {
        scan = 1.02
        fill = 1
      } else if (ph >= 0.88) {
        scan = 1.02
        fill = 1 - smooth((ph - 0.88) / 0.12)
      }
      const rendered = (y: number) => (scan < 0 ? 0 : fill * smooth((scan - y) / 0.04 + 0.5))
      // the facets facing you, shaded by a key light from the upper left (camera space)
      if (fill > 0.01) {
        const lx = -0.5, ly = 0.62, lz = 0.6
        for (let j = 0; j < NR - 1; j++) {
          const on = rendered((PROFILE[j][1] + PROFILE[j + 1][1]) / 2)
          if (on <= 0.01) continue
          for (let i = 0; i < M; i++) {
            const a = j * M + i
            const b = j * M + ((i + 1) % M)
            const c = (j + 1) * M + ((i + 1) % M)
            const d = (j + 1) * M + i
            // the facet's normal: the cross of its diagonals
            const ux = X[c] - X[a], uy = Y[c] - Y[a], uz = Z[c] - Z[a]
            const vx = X[d] - X[b], vy = Y[d] - Y[b], vz = Z[d] - Z[b]
            let nx = uy * vz - uz * vy
            let ny = uz * vx - ux * vz
            let nz = ux * vy - uy * vx
            const L = Math.hypot(nx, ny, nz) || 1
            nx /= L
            ny /= L
            nz /= L
            if (nz < 0) {
              nx = -nx
              ny = -ny
              nz = -nz
            }
            // only the side facing you (the vessel's outside toward the camera)
            const mz = (Z[a] + Z[b] + Z[c] + Z[d]) / 4
            if (mz < -R * 0.05) continue
            const lam = Math.max(0, nx * lx + ny * ly + nz * lz)
            const q = new Path2D()
            q.moveTo(SX[a], SY[a])
            q.lineTo(SX[b], SY[b])
            q.lineTo(SX[c], SY[c])
            q.lineTo(SX[d], SY[d])
            q.closePath()
            pen.wash(q, NA, on * (0.02 + 0.13 * lam * lam))
            if (lam > 0.8) {
              // the specular highlight: the brightest facets run white
              ctx.fillStyle = rgba(WHITE, on * 0.06 * (lam - 0.8) * 5)
              ctx.fill(q)
            }
          }
        }
      }

      // ---- the wire: rings and meridians, the far side dim behind the near, the near lit faintly
      const far = new Path2D()
      const near = new Path2D()
      const seg = (p0: number, p1: number) => {
        const into = (Z[p0] + Z[p1]) / 2 < 0 ? far : near
        into.moveTo(SX[p0], SY[p0])
        into.lineTo(SX[p1], SY[p1])
      }
      for (let j = 0; j < NR; j++) for (let i = 0; i < M; i++) seg(j * M + i, j * M + ((i + 1) % M))
      for (let j = 0; j < NR - 1; j++) for (let i = 0; i < M; i++) seg(j * M + i, (j + 1) * M + i)
      const wireOn = 1 - 0.55 * fill * (scan >= 1 ? 1 : 0.5)
      pen.glass(far, 0.08 * wireOn, 2)
      pen.glass(near, 0.22 * wireOn, 2.4)
      pen.neon(near, NA, (0.14 + 0.03 * Math.sin(t * 1.3)) * wireOn, 1)

      // the render's line: a ring of light round the vessel at the scan, white-hot as it climbs
      if (scan >= 0 && scan <= 1 && fill > 0.5) {
        let j = 0
        while (j < NR - 2 && PROFILE[j + 1][1] < scan) j++
        const [r0, y0] = PROFILE[j]
        const [r1, y1] = PROFILE[j + 1]
        const r = r0 + ((r1 - r0) * (scan - y0)) / Math.max(1e-3, y1 - y0)
        const ring = new Path2D()
        for (let n = 0; n <= 48; n++) {
          const a = (TAU * n) / 48
          const [x, y, z] = toCam(Math.cos(a) * r * R, scan * H, Math.sin(a) * r * R)
          const [u, v] = toScreen(x, y, z)
          if (n === 0) ring.moveTo(u, v)
          else ring.lineTo(u, v)
        }
        pen.neon(ring, NA, 0.9, 1.8)
        pen.neon(ring, WHITE, 0.25, 0.8)
      }

      // ---- the hand: the vertices under it light as picked handles, with the nearest edge loop
      const wantPick = over ? 1 : 0
      pick += (wantPick - pick) * Math.min(1, dt * 6)
      if (pick > 0.01) {
        let best = -1
        let bd = 1e9
        const reach = Math.max(70, H * 0.22)
        for (let k = 0; k < NR * M; k++) {
          if (Z[k] < -R * 0.08) continue
          const d = Math.hypot(pointer.x - SX[k], pointer.y - SY[k])
          if (d < bd) {
            bd = d
            best = k
          }
          if (d < reach) {
            const q = (1 - d / reach) * pick
            pen.fill(P.circle(SX[k], SY[k], 1.6 + 2.2 * q), NB, 0.35 + 0.65 * q)
          }
        }
        if (best >= 0 && bd < reach * 1.6) {
          const j = Math.floor(best / M)
          if (j !== loopJ) {
            loopJ = j
            loopAge = 0
          }
          loopAge += dt
          const loop = new Path2D()
          for (let i = 0; i <= M; i++) {
            const k = j * M + (i % M)
            if (i === 0) loop.moveTo(SX[k], SY[k])
            else loop.lineTo(SX[k], SY[k])
          }
          const on = pick * (1 - bd / (reach * 1.6)) * Math.max(0.3, strike(loopAge, j))
          pen.neon(loop, NB, 0.75 * on, 1.4)
          pen.fill(P.circle(SX[best], SY[best], 4.2), NB, on)
        }
      }

      // ---- the model's light in the room
      const gy = base - (H / 2) * cp
      const g = glow.createRadialGradient(cx, gy, 0, cx, gy, H * 0.9)
      g.addColorStop(0, rgba(NA, 0.06 + 0.06 * fill + 0.015 * Math.sin(t * 0.8)))
      g.addColorStop(1, rgba(NA, 0))
      glow.fillStyle = g
      glow.fillRect(cx - H, gy - H, H * 2, H * 2)
      void h
    },
  }
}
