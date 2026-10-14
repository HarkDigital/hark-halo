import { NA, NB, P, WHITE, mix, rgba, strike, type RGB } from '../../scenes/kit'
import type { Builder } from '../picture'
import { TAU, breath, clamp01, hash, moteAt, motes, smooth, wash, type Mote } from './lib'

/*
 * 65: LIGHTS FROM THE HILL (../PICTURES.md). A long exposure of a valley town
 * at night seen from a hill: one lamp per live site, nothing else. The count
 * is the value itself (PORTFOLIO_WORK.length), so a new site adds a lamp and
 * moves none: the plan positions come from a fixed-seed sequence. The town
 * lights in a loose sweep as the number counts, one lamp mid-strike at any
 * frame, the last and nearest landing the crescendo. Afterwards the lamps
 * breathe out of phase, one wavers at a time, the sky dome breathes, dust
 * drifts above the horizon, and the field leans with the hand.
 */
interface Lamp {
  u: number
  v: number
  x: number
  y: number
  r: number
  b: number
  c: RGB
  order: number
}
export const lamps: Builder<{ kind: 'lamps' }> = (_o, value) => {
  const n = Math.max(1, Math.round(Number(value)) || 1)
  let town: Lamp[] = []
  let byOrder: Lamp[] = []
  let wide = false, narrow = false, framed = false
  let horizon: [number, number, number] = [0, 0, 0]
  let dome: [number, number, number, number] = [0, 0, 1, 1]
  let dust: Mote[] = []
  let box: [number, number, number, number] = [0, 0, 1, 1]
  let lean = 0
  let W = 1, H = 1
  const far = (v: number) => mix(NA, NB, 0.3 * (1 - smooth(v / 0.6)))

  // the plan: n points in a unit square from one fixed sequence, each at least `gap` from the rest
  const plan = (): [number, number][] => {
    const pts: [number, number][] = []
    let seed = 65
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296
      return seed / 4294967296
    }
    let gap = 0.07
    let tries = 0
    while (pts.length < n && tries < 20000) {
      const u = rnd(), v = rnd()
      tries++
      if (tries % 3000 === 0) gap *= 0.8
      if (pts.every(([a, b]) => Math.hypot(a - u, b - v) >= gap)) pts.push([u, v])
    }
    return pts
  }
  const PLAN = plan()

  return {
    lead: [0, 0.15],
    dur: 2600,
    init(w, h, env) {
      W = w
      H = h
      wide = env.mode === 'wide'
      narrow = env.narrow
      framed = env.framed
      // the field: far edge (v = 0) to near edge (v = 1), rows compressing toward the horizon
      const geo = wide
        ? { fy: 0.43 * h, fx: [0.52 * w, 0.93 * w], ny: 0.9 * h, nx: [0.44 * w, 0.97 * w], k: 1.6, r0: 1.6, r1: 2.2 }
        : framed
          ? { fy: 0.33 * h, fx: [0.22 * w, 0.78 * w], ny: 0.9 * h, nx: [0.1 * w, 0.9 * w], k: 1.35, r0: 1.4, r1: 1.9 }
          : { fy: 0.14 * h, fx: [0.14 * w, 0.86 * w], ny: 0.86 * h, nx: [0.05 * w, 0.95 * w], k: 1.25, r0: 1.1, r1: 1.5 }
      town = PLAN.map(([u, v], i) => {
        const y = geo.fy + (geo.ny - geo.fy) * Math.pow(v, geo.k)
        const x = geo.fx[0] + (geo.fx[1] - geo.fx[0]) * u + ((geo.nx[0] + (geo.nx[1] - geo.nx[0]) * u) - (geo.fx[0] + (geo.fx[1] - geo.fx[0]) * u)) * v
        return { u, v, x, y, r: geo.r0 + geo.r1 * v, b: 0.6 + 0.4 * v, c: far(v), order: 0.72 * u + 0.28 * v + 0.12 * hash(i + 1) }
      })
      byOrder = [...town].sort((a, b) => a.order - b.order)
      byOrder.forEach((l, i) => (l.order = i))
      horizon = wide ? [0.26 * w, w, 0.4 * h] : framed ? [0.06 * w, 0.94 * w, 0.3 * h] : [0, 0, 0]
      dome = wide ? [0.71 * w, 0.45 * h, 0.3 * w, 0.11 * h] : framed ? [0.5 * w, 0.34 * h, 0.34 * w, 0.12 * h] : [0.5 * w, 0.12 * h, 0.4 * w, 0.14 * h]
      box = wide ? [0.5 * w, 0.18 * h, 0.95 * w, 0.4 * h] : [0.1 * w, 0.1 * h, 0.9 * w, 0.3 * h]
      dust = narrow ? [] : motes(wide ? 12 : 8, 65, box, [4, 9], [-3, 1])
      lean = 0
    },
    frame(pen, w, h, p, e, t, pointer, dt) {
      const { ctx, glow } = pen
      const k = Math.floor(p * n + 1e-6)
      // the horizon: one glass hairline from under the scrim off the right edge (none on a phone)
      if (horizon[1] > 0) {
        const [hx0, hx1, hy] = horizon
        const g = ctx.createLinearGradient(hx0, 0, hx1, 0)
        const a = 0.08 * breath(t, 7, 0.12)
        g.addColorStop(0, rgba(WHITE, 0))
        g.addColorStop(framed ? 0.12 : 0.12 * (w / (hx1 - hx0)), rgba(WHITE, a))
        g.addColorStop(framed ? 0.88 : 1, rgba(WHITE, a))
        g.addColorStop(1, rgba(WHITE, framed ? 0 : a))
        ctx.strokeStyle = g
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(hx0, hy)
        ctx.lineTo(hx1, hy)
        ctx.stroke()
      }
      // the field leans a little with the hand, by depth (near lamps most)
      const want = pointer.inside && !narrow ? -((pointer.x - 0.7 * w) / w) * 10 * (framed ? 0.5 : 1) : 0
      lean += (want - lean) * Math.min(1, 4 * dt)
      // one lamp wavers at a time, about once a second
      const slot = Math.floor(t / 1.2)
      const wav = e >= 1 && k > 0 ? Math.floor(hash(slot) * k) : -1
      const wavOn = t - slot * 1.2 < 0.08 || (t - slot * 1.2 > 0.14 && t - slot * 1.2 < 0.2)
      // the unlit lamps: glass beads, batched
      const rings = new Path2D()
      let litMass = 0
      for (const l of byOrder) {
        const i = l.order
        const x = l.x + lean * (l.v - 0.35), y = l.y
        let near = 0
        if (pointer.inside) {
          const d = Math.hypot(pointer.x - x, pointer.y - y)
          if (d < 160) near = 1 - d / 160
        }
        if (i > k || (i === k && p * n - i <= 0)) {
          rings.moveTo(x + l.r + 0.6, y)
          rings.arc(x, y, l.r + 0.6, 0, TAU)
          if (near > 0) {
            ctx.strokeStyle = rgba(WHITE, 0.25 * near)
            ctx.lineWidth = 0.8
            ctx.beginPath()
            ctx.arc(x, y, l.r + 0.6, 0, TAU)
            ctx.stroke()
          }
          continue
        }
        let b = l.b, r = l.r
        if (i === k) {
          // mid-strike: the stutter, its glass ring fading as the gas comes up
          const u = p * n - i
          b *= strike(u * 0.42, i + 1)
          r *= 1 + 0.4 * (1 - u)
        } else {
          // lit: a flare on completing, then breath
          const ei = 1 - Math.pow(1 - (i + 1) / n, 1 / 3)
          const age = Math.max(0, (e - ei) * 2.6 + (e >= 1 ? Math.max(0, t - 2.85) : 0))
          b *= 1 + 0.9 * Math.exp(-age / 0.18)
          r *= 1 + 0.5 * Math.exp(-age / 0.12)
          b *= breath(t, 3 + 3 * hash(i + 7), 0.06, hash(i + 9) * TAU)
          if (i === wav && wavOn) b *= 0.5
        }
        b *= 1 + 0.6 * near
        r *= 1 + 0.5 * near
        litMass += b
        pen.fill(P.circle(x, y, r), l.c, Math.min(1, b))
        if (l.v > (narrow ? 0.6 : 0.45)) {
          glow.fillStyle = rgba(l.c, 0.3 * Math.min(1, b))
          glow.beginPath()
          glow.arc(x, y, 3 * r, 0, TAU)
          glow.fill()
        }
      }
      ctx.lineWidth = 0.8
      ctx.strokeStyle = rgba(WHITE, 0.14)
      ctx.stroke(rings)
      // the sky dome: the town's own light on the air above it
      const litFrac = k / n
      wash(pen, NA, dome[0], dome[1], dome[2], dome[3], (narrow ? 0.06 : 0.09) * litFrac * breath(t, 7, 0.08))
      // dust above the horizon, catching the town's light
      if (dust.length && e >= 1) {
        const fade = clamp01((t - 2.85) / 1)
        ctx.beginPath()
        for (const m of dust) {
          const [x, y] = moteAt(m, t, box, 5)
          ctx.moveTo(x + 0.6, y)
          ctx.arc(x, y, 0.6, 0, TAU)
        }
        ctx.fillStyle = rgba(WHITE, 0.16 * fade * litFrac)
        ctx.fill()
      }
      void litMass, void W, void H
    },
  }
}
