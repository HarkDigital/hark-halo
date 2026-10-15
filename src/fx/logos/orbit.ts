import { NA, NB, NC, P, TAU, WHITE, mix, rgba, strike, type RGB, type Scene } from '../../service/scenes/kit'
import { MARK, markBounds, markFrame, markOutline } from '../logo'
import { clamp01, easeInOut, easeOut, smooth, span } from '../../service/stat/pictures/lib'

/*
 * ORBIT: the mark holds lit, then the two loops let go of the diamond and
 * swing apart into rings. Each turns about its own centroid while that
 * centroid circles the diamond, the two going opposite ways on one orbit (a
 * hairline of glass), so they pass each other twice: the orbit swings like a
 * pendulum, slow where the loops stand opposite (the mark opened out, then
 * the mark swapped) and quick through the passes, where one rides in front of
 * the other and the light doubles. Each drags a trail of its last positions,
 * dimmer the older. The diamond stays as the pivot, pulsing. After the second
 * pass the loops spiral in, gathering speed, and land with a flash and a
 * shudder; the mark is whole again and holds. The cycle is on t.
 *
 * The hand: the orbit's centre leans toward the cursor; the cursor's speed
 * spins the loops faster; when the hand leaves they settle, and the spin
 * unwinds to a whole turn through the fall so they still land true.
 * Pressing pulls the loops in tight around the diamond (and, while the mark
 * is whole, lets the loops go now).
 */
const HOLD = 3.2 // s whole and lit
const APART = 5.8 // s swing out, orbit, fall
const SETTLE = 1.0 // s the landing's flash and shudder
const CYCLE = HOLD + APART + SETTLE
const OUT = 0.22 // of APART: the swing out
const FALL = 0.87 // of APART: from here they fall (after the second pass)
const TURNS = 1 // orbits per cycle
// turns about its own centroid per cycle, against the orbit. A whole number: it must land true. An odd one: the
// mark's loops are each other's half turn, so at a pass the two rings share one shape and one orientation (a
// double ring, one in front) instead of crossing, and at the far pole they are the mark turned over
const SPIN = -1
const RING = 0.6 // the loops' size while out, of the mark's: rings
const SWING = 0.6 // the orbit's rhythm: 1 - SWING at the poles, 1 + SWING through the passes
const NEAR = 0.14 // at a pass the ring in front is this much bigger (and hotter), the one behind as much smaller
const NGHOST = 10
const GHOST_DT = 1 / 16

interface Loop {
  path: Path2D
  c: RGB
  dir: number
  seed: number
  /** the centroid, mark units */
  cx: number
  cy: number
  /** the centroid from the mark's centre, polar, mark units */
  homeR: number
  homeA: number
  /** this frame's place: screen px, the turn, the frame's scale (mark units to px) */
  x: number
  y: number
  psi: number
  sc: number
  /** this frame's depth on the orbit: 1 near (in front), -1 far */
  z: number
  /** the trail: NGHOST of (x, y, psi, sc), a ring */
  ghosts: Float32Array
}

export default function orbit(): Scene {
  let cx = 0, cy = 0, size = 100, s = 1, Rx = 0, Ry = 0, wt = 2.6
  let leanMaxX = 0, leanMaxY = 0
  let dcx = 0, dcy = 0
  let passA = 0 // the orbit angle (from loop A's home, its way round) of the first pass
  let crossA = 0 // where on the clock the first pass is: both loops' depth is measured from it
  let loops: Loop[] = []
  let head = 0, acc = 0
  let leanX = 0, leanY = 0
  let pressK = 0, wasDown = false
  let vSm = 0, spinV = 0, extra = 0
  let lastX = 0, lastY = 0, lastIn = false
  let tOff = 0
  let dPhase = 0

  const place = (L: Loop, x: number, y: number, psi: number, sc: number, ctx: CanvasRenderingContext2D, glow: CanvasRenderingContext2D) => {
    for (const c of [ctx, glow]) {
      c.save()
      c.translate(x, y)
      c.scale(sc, sc)
      c.rotate(psi)
      c.translate(-L.cx, -L.cy)
    }
  }
  /** the orbit's progress with its swing: slow at the poles, quick through the passes; whole at 0 and 1 */
  const swung = (g: number) => {
    const ph = TAU * g
    return g + (SWING / 2 / TAU) * (Math.sin(2 * (ph - passA)) + Math.sin(2 * passA))
  }

  return {
    init(w, h) {
      size = Math.min(h * 0.72, w * 0.6)
      cx = w / 2
      cy = h / 2
      s = size / MARK.h
      wt = 2.6 * Math.max(0.9, Math.min(1.5, size / 300))
      const b = markBounds()
      const pts = markOutline(200)
      dcx = b[2].x + b[2].w / 2
      dcy = b[2].y + b[2].h / 2
      let reach = 0 // a loop's furthest point from its centroid, mark units
      loops = [NA, NB].map((c, i) => {
        const lx = b[i].x + b[i].w / 2, ly = b[i].y + b[i].h / 2
        for (const [x, y] of pts[i]) reach = Math.max(reach, Math.hypot(x - lx, y - ly))
        const hx = lx - MARK.cx, hy = ly - MARK.cy
        return { path: MARK.loops[i], c, dir: i === 0 ? 1 : -1, seed: 3 + 2 * i, cx: lx, cy: ly, homeR: Math.hypot(hx, hy), homeA: Math.atan2(hy, hx), x: cx, y: cy, psi: 0, sc: s, z: 0, ghosts: new Float32Array(NGHOST * 4) }
      })
      // the passes: where A (going its way) and B (going the other) meet
      let dA = loops[1].homeA - loops[0].homeA
      dA = ((dA % TAU) + TAU) % TAU
      passA = dA / 2
      crossA = loops[0].homeA + passA
      // the orbit: about 0.6 of the mark's height across, an ellipse, clamped so the rings (and their bloom)
      // stay in the box; what room is left lets the orbit lean toward the hand
      const m = Math.max(6, 0.03 * Math.min(w, h))
      const reachPx = reach * s * RING * (1 + NEAR) + wt * 1.7 + 0.04 * size
      const hR = loops[0].homeR * s
      Rx = Math.max(hR * 1.1, Math.min(0.58 * size, 0.5 * w - m - reachPx - 0.06 * size))
      Ry = Math.max(hR * 1.1, Math.min(0.44 * size, 0.5 * h - m - reachPx - 0.06 * size))
      leanMaxX = Math.min(0.22 * size, Math.max(0, 0.5 * w - m - Rx - reachPx))
      leanMaxY = Math.min(0.22 * size, Math.max(0, 0.5 * h - m - Ry - reachPx))
      head = 0
      acc = 0
      leanX = leanY = 0
      pressK = 0
      vSm = spinV = extra = 0
      lastIn = false
      dPhase = 0
      for (const L of loops) {
        for (let i = 0; i < NGHOST; i++) {
          L.ghosts[i * 4] = cx + L.homeR * s * Math.cos(L.homeA)
          L.ghosts[i * 4 + 1] = cy + L.homeR * s * Math.sin(L.homeA)
          L.ghosts[i * 4 + 2] = 0
          L.ghosts[i * 4 + 3] = s
        }
      }
    },
    frame(pen, w, h, pointer, dt, t) {
      const { ctx, glow } = pen
      // ---- the hand: its speed, the lean, the press
      const inside = pointer.inside
      let v = 0
      if (inside && lastIn) v = Math.hypot(pointer.x - lastX, pointer.y - lastY) / Math.max(1e-3, dt)
      lastX = pointer.x
      lastY = pointer.y
      lastIn = inside
      vSm += (Math.min(v, 2400) - vSm) * Math.min(1, (v > vSm ? 10 : 2) * dt)
      const spinWant = Math.min(1.5, vSm / 420) * 5
      spinV += (spinWant - spinV) * Math.min(1, (spinWant > spinV ? 7 : 1.5) * dt)
      const down = inside && pointer.down
      pressK += ((down ? 1 : 0) - pressK) * Math.min(1, (down ? 7 : 3) * dt)
      // ---- the clock (pressing while the mark is whole lets the loops go now: they are at rest, so it is seamless)
      let tc = (t + tOff) % CYCLE
      if (down && !wasDown && (tc < HOLD || tc > HOLD + APART + 0.7)) {
        tOff = (tOff + (tc < HOLD ? HOLD - tc : CYCLE - tc + HOLD)) % CYCLE
        tc = HOLD
      }
      wasDown = down
      const apart = tc >= HOLD && tc < HOLD + APART
      const u = clamp01((tc - HOLD) / APART)
      const tl = tc - (HOLD + APART) // since the landing (the settle)
      const td = tc - HOLD // since the release
      // k: how far out the loops are (0 home, 1 the orbit); the fall accelerates in
      let k = 0, fall = 0
      if (apart) {
        if (u < OUT) k = smooth(u / OUT)
        else if (u < FALL) k = 1
        else {
          fall = (u - FALL) / (1 - FALL)
          k = 1 - Math.pow(fall, 2.2)
        }
      }
      const g = swung(Math.pow(u, 1.3)) // the orbit's progress: from rest, then swinging
      const fallE = easeInOut(fall)
      // the orbit's centre leans toward the hand (eased), and lets go through the fall
      let lx = 0, ly = 0
      if (inside) {
        const dx = pointer.x - cx, dy = pointer.y - cy
        const d = Math.hypot(dx, dy) || 1
        const m = (Math.min(d, 160) / 160) * 0.22 * size
        lx = Math.max(-leanMaxX, Math.min(leanMaxX, (dx / d) * m))
        ly = Math.max(-leanMaxY, Math.min(leanMaxY, (dy / d) * m))
      }
      leanX += (lx - leanX) * Math.min(1, 3 * dt)
      leanY += (ly - leanY) * Math.min(1, 3 * dt)
      const hand = k * (1 - fallE)
      const ocx = cx + leanX * hand, ocy = cy + leanY * hand
      // the hand's extra spin, unwound to a whole turn through the fall so the loops land true
      if (apart && fall <= 0) extra += spinV * dt
      if (!apart) extra = 0
      const extraEff = extra + (Math.round(extra / TAU) * TAU - extra) * fallE
      // pressing pulls them in tight (and the rings tighten)
      const tight = 1 - 0.55 * pressK * k
      const ring = 1 - (1 - RING * (1 - 0.2 * pressK)) * k
      // the landing: a flash, a shudder; the release: a flare
      const wob = tl >= 0 ? 0.045 * Math.exp(-tl / 0.22) * Math.sin((tl * TAU) / 0.28) : 0
      const flash = tl >= 0 ? Math.exp(-tl / 0.2) : 0
      const release = td >= 0 && td < 1 ? Math.exp(-td / 0.15) : 0
      // ---- where the loops are
      for (const L of loops) {
        const th = L.homeA + L.dir * (TAU * TURNS * g + wob)
        const rx = (L.homeR * s + (Rx - L.homeR * s) * k) * tight
        const ry = (L.homeR * s + (Ry - L.homeR * s) * k) * tight
        L.x = ocx + rx * Math.cos(th)
        L.y = ocy + ry * Math.sin(th)
        L.psi = L.dir * (TAU * SPIN * g + extraEff + wob)
        // the depth: A rides in front at the first pass and behind at the second; B the other way
        L.z = L.dir * Math.cos(th - crossA) * k
        L.sc = s * ring * (1 + NEAR * L.z)
      }
      acc += dt
      if (acc >= GHOST_DT) {
        acc -= GHOST_DT
        head = (head + 1) % NGHOST
        for (const L of loops) {
          L.ghosts[head * 4] = L.x
          L.ghosts[head * 4 + 1] = L.y
          L.ghosts[head * 4 + 2] = L.psi
          L.ghosts[head * 4 + 3] = L.sc
        }
      }
      let trail = 0
      if (apart) trail = Math.min(1, (u * APART) / 0.5)
      else if (tl >= 0) trail = Math.max(0, 1 - tl / 0.45)
      // ---- the orbit: a hairline of glass the loops ride
      if (k > 0.01) {
        const hR = loops[0].homeR * s
        const path = new Path2D()
        path.ellipse(ocx, ocy, (hR + (Rx - hR) * k) * tight, (hR + (Ry - hR) * k) * tight, 0, 0, TAU)
        pen.glass(path, 0.11 * k, 2)
      }
      // ---- the trails: the loops' last positions, dimmer the older, mostly bloom
      if (trail > 0.01) {
        for (const L of loops) {
          for (let i = 1; i < NGHOST; i++) {
            const j = (head - i + NGHOST) % NGHOST
            const a = 0.2 * Math.pow(1 - i / NGHOST, 1.4) * trail
            const gs = L.ghosts[j * 4 + 3]
            place(L, L.ghosts[j * 4], L.ghosts[j * 4 + 1], L.ghosts[j * 4 + 2], gs, ctx, glow)
            glow.lineWidth = (wt * 2.4) / gs
            glow.strokeStyle = rgba(L.c, a)
            glow.stroke(L.path)
            ctx.lineWidth = 1 / gs
            ctx.strokeStyle = rgba(L.c, a * 0.3)
            ctx.stroke(L.path)
            ctx.restore()
            glow.restore()
          }
        }
      }
      // ---- the loops: neon in glass, breathing; a swell before they let go; hotter in front, dimmer behind;
      // the landing strikes them
      const tension = tc < HOLD ? 0.15 * smooth(span(HOLD - 0.45, HOLD, tc)) : 0
      const fast = 0.15 * Math.min(1, spinV / 5) * k
      for (const L of loops) {
        let on = (1 + 0.05 * Math.sin((TAU * t) / (4.2 + L.seed * 0.3) + L.seed) + tension + fast) * (1 + 0.38 * L.z)
        if (tl >= 0) on *= (1 + 0.8 * flash) * (tl < 0.42 ? 0.75 + 0.25 * strike(tl, L.seed) : 1)
        place(L, L.x, L.y, L.psi, L.sc, ctx, glow)
        pen.tube(L.path, L.c, Math.min(1.3, on), wt / L.sc)
        ctx.restore()
        glow.restore()
      }
      // ---- the diamond: the pivot, pulsing (faster while the loops are out), lit inside while it holds them
      dPhase = (dPhase + (dt * TAU) / (2.6 - 1.5 * k)) % TAU
      const pulse = 0.5 + 0.5 * Math.sin(dPhase)
      ctx.save()
      glow.save()
      markFrame(ctx, cx, cy, size)
      markFrame(glow, cx, cy, size)
      const kd = 1 + (0.03 + 0.09 * k) * pulse + 0.12 * flash + 0.08 * release
      for (const c of [ctx, glow]) {
        c.translate(dcx, dcy)
        c.scale(kd, kd)
        c.translate(-dcx, -dcy)
      }
      pen.tube(MARK.diamond, NC, Math.min(1.3, 0.95 + 0.25 * pulse * k + 0.5 * flash + 0.4 * release), wt / s)
      pen.fill(MARK.diamond, NC, (0.1 + 0.22 * pulse) * k)
      pen.fill(MARK.diamond, WHITE, 0.9 * flash + 0.5 * release)
      ctx.restore()
      glow.restore()
      // the flash at the join: a white ring leaving the diamond
      if (tl >= 0 && tl < 0.6) {
        const p = tl / 0.6
        pen.neon(P.circle(cx, cy, size * (0.08 + 0.5 * easeOut(p))), WHITE, (1 - p) * (1 - p) * 0.8, 1.6)
      }
      // ---- the room's light, from the lit sign (purple while the diamond holds the orbit)
      const col = mix(NA, NC, 0.6 * k)
      const rg = glow.createRadialGradient(ocx, ocy, 0, ocx, ocy, size * 0.9)
      rg.addColorStop(0, rgba(col, 0.08 * (1 + 0.8 * flash + 0.3 * pressK * k)))
      rg.addColorStop(1, rgba(col, 0))
      glow.fillStyle = rg
      glow.fillRect(0, 0, w, h)
    },
  }
}
