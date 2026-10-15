import { NA, NB, NC, TAU, WHITE, mix, rgba, type RGB, type Scene } from '../../service/scenes/kit'
import { breath, clamp01, hash, hot, smooth } from '../../service/stat/pictures/lib'

/*
 * BOKEH: lights out of focus drifting in the dark. Forty-four lens discs,
 * each at a depth (far: small and dim; near: wide, brighter, quicker), half
 * in the lead light, a quarter in the second, the rest white and the third.
 * A disc is a light seen through a lens: a dim, even body and a bright rim
 * (the lens's own ring), with bloom spilling past the edge. Each is one unit
 * radial gradient per light, scaled into place: a pool on the glow layer
 * (body low, rim full) and a dimmer one on the sharp layer whose rim band
 * carries the light, under a crisp hairline edge batched per light. White
 * discs are glass: next to no body, a brighter rim. Every disc has its own
 * luminance, so a few burn and most sit back in the dark. They drift across
 * on their own slow headings with a sway, wrapping, breathe a little, and one
 * twinkles now and then. The cursor is the lens: discs within its reach
 * resolve, shrinking fast to a point as a crisp ring of their colour closes
 * on them and a white-hot bead comes up late at the centre; as it leaves
 * they blur back. Pressing pulls focus everywhere. The field leans with the
 * hand by depth. Every position is a pure function of t; the only state is
 * each disc's focus, the pull and the lean.
 */
interface Disc {
  d: number
  g: number
  x0: number
  y0: number
  vx: number
  vy: number
  /** the blurred radius, the focused radius */
  R: number
  rf: number
  /** the blurred alpha (its own luminance in) */
  a: number
  sway: number
  swT: number
  ph: number
  bT: number
  bPh: number
}
const N = 44
const LIGHTS: RGB[] = [NA, NB, WHITE, NC]
const HOTS: RGB[] = LIGHTS.map(hot)
const RIMS: RGB[] = LIGHTS.map(c => mix(c, WHITE, 0.3))
/** white blooms harder than colour on the glow layer, so its pool sits lower */
const POOL = [1, 1, 0.55, 1]
/** the body of the sharp disc against its rim: white is glass, near no body */
const BODY = [0.42, 0.42, 0.14, 0.42]

export default function bokeh(): Scene {
  let discs: Disc[] = []
  let n = N
  let focus = new Float32Array(N)
  // where each disc landed this frame, for the focused pass
  let X = new Float32Array(N)
  let Y = new Float32Array(N)
  let RR = new Float32Array(N)
  let k = 1
  let reach = 180
  let pull = 0
  let lean = 0
  // one unit gradient per light per layer, built on first use (init drops them)
  let poolCtx: CanvasRenderingContext2D | null = null
  let pools: CanvasGradient[] = []
  let bodyCtx: CanvasRenderingContext2D | null = null
  let bodies: CanvasGradient[] = []
  let flares: CanvasGradient[] = []
  const poolsOn = (glow: CanvasRenderingContext2D) => {
    if (poolCtx === glow) return pools
    poolCtx = glow
    // the pool: a low body, the rim full, then nothing (the blur spills it past the edge)
    pools = LIGHTS.map(c => {
      const g = glow.createRadialGradient(0, 0, 0, 0, 0, 1)
      g.addColorStop(0, rgba(c, 0.25))
      g.addColorStop(0.7, rgba(c, 0.32))
      g.addColorStop(0.9, rgba(c, 1))
      g.addColorStop(1, rgba(c, 0))
      return g
    })
    return pools
  }
  const bodiesOn = (ctx: CanvasRenderingContext2D) => {
    if (bodyCtx === ctx) return bodies
    bodyCtx = ctx
    // the disc: an even dim body, a bright rim band a tenth of the radius wide, a soft edge
    bodies = LIGHTS.map((c, g) => {
      const b = BODY[g]
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
      grad.addColorStop(0, rgba(c, b * 0.9))
      grad.addColorStop(0.82, rgba(c, b))
      grad.addColorStop(0.92, rgba(RIMS[g], 1))
      grad.addColorStop(0.97, rgba(RIMS[g], 0.8))
      grad.addColorStop(1, rgba(RIMS[g], 0))
      return grad
    })
    // the twinkle: a white-hot wash over the whole disc, brightest toward the rim
    flares = LIGHTS.map(c => {
      const hc = hot(c)
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
      grad.addColorStop(0, rgba(hc, 0.35))
      grad.addColorStop(0.8, rgba(hc, 0.5))
      grad.addColorStop(0.93, rgba(WHITE, 0.9))
      grad.addColorStop(1, rgba(WHITE, 0))
      return grad
    })
    return bodies
  }

  return {
    init(w, h) {
      k = Math.max(0.55, Math.min(1.6, Math.sqrt(w * h) / 520))
      reach = 180 * Math.max(0.6, Math.min(1.2, k))
      // a small box takes fewer discs, so there is dark air between them
      n = Math.round(N * Math.max(0.6, Math.min(1, Math.sqrt(w * h) / 520)))
      pull = 0
      lean = 0
      focus = new Float32Array(N)
      X = new Float32Array(N)
      Y = new Float32Array(N)
      RR = new Float32Array(N)
      poolCtx = null
      bodyCtx = null
      discs = []
      for (let i = 0; i < n; i++) {
        const r = (j: number) => hash(i * 29 + j * 7.3 + 0.5)
        const d = r(1)
        // half the lead light, a quarter the second, the rest white and the third
        const g = i % 2 === 0 ? 0 : i % 4 === 1 ? 1 : i % 8 === 3 ? 2 : 3
        const R = Math.min((10 + 60 * d) * k, 0.42 * h)
        const speed = (5 + 16 * d) * k
        const heading = -0.25 + (r(2) - 0.5) * 0.9 // mostly leftward, each its own
        // its own luminance: most sit back, a few burn
        const lum = 0.55 + 1.3 * Math.pow(r(9), 1.8)
        discs.push({
          d,
          g,
          x0: r(3) * (w + 2 * R),
          y0: r(4) * (h + 2 * R),
          vx: -Math.cos(heading) * speed,
          vy: Math.sin(heading) * speed * 0.5,
          R,
          rf: (3 + 3 * d) * Math.max(0.8, Math.min(1.3, k)),
          a: (0.05 + 0.1 * d) * lum,
          sway: (4 + 10 * d) * k,
          swT: 7 + r(5) * 8,
          ph: r(6) * TAU,
          bT: 3.5 + r(7) * 5,
          bPh: r(8) * TAU,
        })
      }
      discs.sort((p, q) => p.d - q.d)
    },
    frame(pen, w, h, pointer, dt, t) {
      const { ctx, glow } = pen
      const live = pointer.inside
      const px = pointer.x, py = pointer.y
      // pressing pulls focus everywhere, quick in, slow out
      const wantPull = live && pointer.down ? 1 : 0
      pull += (wantPull - pull) * Math.min(1, (wantPull > pull ? 10 : 2.5) * dt)
      // the field leans with the hand, by depth
      const wantLean = live ? -(px - w / 2) * 0.03 : 0
      lean += (wantLean - lean) * Math.min(1, 3 * dt)
      // one disc twinkles now and then
      const slot = Math.floor(t / 1.9)
      const age = t - slot * 1.9
      const twI = hash(slot + 0.37) < 0.6 ? Math.floor(hash(slot + 0.71) * n) : -1
      const twE = age < 0.6 ? Math.sin((Math.PI * age) / 0.6) ** 2 : 0

      const pool = poolsOn(glow)
      const body = bodiesOn(ctx)
      const bg = glow.getTransform()
      const bc = ctx.getTransform()
      const rims = LIGHTS.map(() => new Path2D())
      let twX = 0, twY = 0, twR = 0
      for (let i = 0; i < n; i++) {
        const m = discs[i]
        // where it is: its heading and sway, wrapped a disc beyond the box
        const W = w + 2 * m.R, H = h + 2 * m.R
        let x = m.x0 + m.vx * t + m.sway * Math.sin((TAU * t) / m.swT + m.ph)
        let y = m.y0 + m.vy * t + 0.5 * m.sway * Math.cos((TAU * t) / (m.swT * 1.3) + m.ph)
        x = (((x % W) + W) % W) - m.R + lean * m.d
        y = (((y % H) + H) % H) - m.R
        // the lens: sharp over most of its reach, softening at its edge
        let want = 0
        if (live) {
          const dist = Math.hypot(x - px, y - py)
          want = smooth(clamp01((reach - dist) / (reach * 0.4)))
        }
        want = Math.max(want, pull)
        const f0 = focus[i]
        const f = f0 + (want - f0) * Math.min(1, (want > f0 ? 8 : 3) * dt)
        focus[i] = f
        const tw = i === twI ? twE : 0
        const br = breath(t, m.bT, 0.1, m.bPh) * (1 + 3 * tw)
        const R = m.R * breath(t, m.bT * 1.7, 0.04, m.bPh)
        // the disc tightens fast to a point; its bloom stays a little wider than the point
        const fr = 1 - (1 - f) * (1 - f)
        const r = R + (m.rf - R) * fr
        const rg = R + (m.rf * 1.8 - R) * fr
        const aBlur = m.a * br
        // the pool of light on the glow layer: alpha rises to 0.9 as it resolves
        glow.setTransform(bg.a * rg, 0, 0, bg.d * rg, bg.a * x + bg.e, bg.d * y + bg.f)
        glow.globalAlpha = Math.min(1, (aBlur * 2 + (0.9 - aBlur * 2) * f) * POOL[m.g])
        glow.fillStyle = pool[m.g]
        glow.fillRect(-1, -1, 2, 2)
        // the disc on the sharp layer: the body and its rim band in one fill
        ctx.setTransform(bc.a * r, 0, 0, bc.d * r, bc.a * x + bc.e, bc.d * y + bc.f)
        ctx.globalAlpha = Math.min(1, aBlur * (1 - f) + 0.9 * f)
        ctx.fillStyle = body[m.g]
        ctx.fillRect(-1, -1, 2, 2)
        if (tw > 0.02) {
          // the flare: white-hot over the disc for the length of the twinkle
          ctx.globalAlpha = Math.min(1, (0.25 + aBlur) * tw)
          ctx.fillStyle = flares[m.g]
          ctx.fillRect(-1, -1, 2, 2)
          twX = x
          twY = y
          twR = (1.4 + 2 * m.d) * k * tw
        }
        rims[m.g].moveTo(x + r, y)
        rims[m.g].arc(x, y, r, 0, TAU)
        X[i] = x
        Y[i] = y
        RR[i] = r
      }
      glow.setTransform(bg)
      glow.globalAlpha = 1
      ctx.setTransform(bc)
      ctx.globalAlpha = 1
      // the twinkle's white pinprick
      if (twR > 0) {
        ctx.fillStyle = rgba(WHITE, 0.9 * twE)
        ctx.beginPath()
        ctx.arc(twX, twY, twR, 0, TAU)
        ctx.fill()
      }
      // the crisp hairline edges, one stroke per light
      ctx.lineWidth = 1
      for (let g = 0; g < LIGHTS.length; g++) {
        ctx.strokeStyle = rgba(RIMS[g], 0.15)
        ctx.stroke(rims[g])
      }
      // the resolved lights: a crisp ring of their colour closes on the tightening
      // disc, and a white-hot bead comes up late at the centre, once it is nearly a point
      const kb = Math.max(0.8, Math.min(1.3, k))
      for (let i = 0; i < n; i++) {
        const f = focus[i]
        if (f <= 0.05) continue
        const m = discs[i]
        const x = X[i], y = Y[i], r = RR[i]
        const f2 = f * f
        const f3 = f2 * f
        ctx.strokeStyle = rgba(LIGHTS[m.g], 0.9 * f2)
        ctx.beginPath()
        ctx.arc(x, y, r + 0.8 * f, 0, TAU)
        ctx.stroke()
        ctx.fillStyle = rgba(HOTS[m.g], 0.95 * f3)
        ctx.beginPath()
        ctx.arc(x, y, (1.2 + 1.4 * m.d) * kb * f, 0, TAU)
        ctx.fill()
        ctx.fillStyle = rgba(WHITE, 0.85 * f3)
        ctx.beginPath()
        ctx.arc(x, y, (0.6 + 0.6 * m.d) * f, 0, TAU)
        ctx.fill()
      }
    },
  }
}
