import * as THREE from 'three'
import type { CameraPose, Chapter, ChapterContext, Frame } from '../../core/types'
import { el, reveal, rise, setRise } from '../../core/dom'
import { BRAND, MICROCOPY } from '../../content'
import { clamp, damp, lerp, segment, smoothstep } from '../../core/math'
import { nextFrame } from '../../core/yield'
import { LOGO } from '../../kit/palette'
import { FLOOR_MIRROR, FLOOR_Y, FROST, MARK_S, THAW_A, THAW_B, buildCard, buildFloor, buildMark, buildNeonMark, buildReflection, refineMark, type HeroSet } from './scene'
import { buildTubeMark, buildTubeNeon, nearestOnTubes, pointerOnMark, setTubeHover } from '../../kit/tube'
import './hero.css'

/*
 * HERO — "Frost". One object in a black gallery: the Hark mark in fully
 * frosted glass, lit from behind by a light card and two neon tubes,
 * floating over a black mirror floor.
 *
 *   0.00–0.10  INTRO   the headline first: "Make the internet listen.", the
 *                      manifesto, the two CTAs and the scroll hint on the
 *                      left; the mark right of centre (upper half on
 *                      portrait), front-on-ish, a slow turntable sway (±5°)
 *                      and a soft sheen along the bevels every ~8 s. After the loader (time-based,
 *                      ~1.8 s): the backlight fades up from black, the frost
 *                      lights from the centre outward, the two neon tubes
 *                      strike one after the other (a single stutter each; a
 *                      plain fade under reduced motion) and wash the frost
 *                      with cyan and violet.
 *   0.10–0.56  MACRO   the camera travels in close: along the frosted bevel,
 *                      across the smooth frosted face (the backlight drifts
 *                      behind it, so the frost gradient shifts), then a clear THAW window glides over the face
 *                      along a light strip behind the glass: razor sharp in
 *                      the window, a soft frosted bar outside it, a
 *                      crystalline melt front at its edge.
 *   0.56–0.86  SETTLE  pull back; the mark alone, centred and square to you.
 *   0.86–1.00  SEGUE   the neon surges and the camera eases in while the
 *                      engine's segue to services plays (chapters/index.ts
 *                      `segue`, drawn in src/core/post.ts: by default the
 *                      glass pane, the frosted neon swelling into soft light).
 *
 * HOVER (tube mark, a mouse, while not scrolling, at the headline and the
 * settle): the mark leans toward the pointer, the neon and the glass light up
 * where it passes, and a click on a tube sends a spark racing along it.
 *
 * Every pose derives from `local`; frame.time only drives the sway and the
 * light sweep (none under reduced motion; frozen with Motion off); the reveal
 * runs on its own clock.
 */

/** the hero logo option (kit/palette): the frosted mark, or the neon in glass tubes (./tube) */
const TUBE = LOGO.kind === 'tube'

/** smootherstep on a segment */
const sm = (x: number, a: number, b: number) => {
  const t = segment(x, a, b)
  return t * t * t * (t * (t * 6 - 15) + 10)
}
const outQuart = (t: number) => 1 - Math.pow(1 - clamp(t), 4)

/** One camera key: target (world), orbit (az/el/dist), lens, screen offset, and the mark's turn. */
interface Key {
  at: number
  /** zero velocity here (the camera settles) */
  hold: boolean
  /** [tx, ty, tz, az, el, ln(dist), fov, sx, sy, rot, tilt] */
  v: number[]
}
const TX = 0
const TY = 1
const TZ = 2
const AZ = 3
const EL = 4
const LD = 5
const FOV = 6
const SX = 7
const SY = 8
const ROT = 9
const TILT = 10
const NV = 11


/** mark-unit point (1u tall mark) → world */
const U = (x: number) => x * MARK_S

/** Framing for the rest poses: where the mark centre sits (NDC), and how much of the frame it fills. */
interface Fit {
  sx: number
  sy: number
  /** mark height as a fraction of the viewport height */
  hf: number
  /** mark width as a fraction of the viewport width */
  wf: number
}
const FIT: Record<'land' | 'port', Record<'intro' | 'end', Fit>> = {
  land: {
    // beside the headline block
    intro: { sx: 0.42, sy: 0.05, hf: 0.5, wf: 0.34 },
    // alone, centred: the picture the segue carries into services
    end: { sx: 0, sy: 0.02, hf: 0.6, wf: 0.6 },
  },
  port: {
    intro: { sx: 0, sy: 0.42, hf: 0.3, wf: 0.66 },
    end: { sx: 0, sy: 0.05, hf: 0.42, wf: 0.84 },
  },
}

export default function create(): Chapter {
  const group = new THREE.Group()
  let set: HeroSet | null = null
  // the pointer (tube mark): where it is on the mark's plane, how near (the light), the lean, a clicked spark
  let neonCurves: THREE.Curve<THREE.Vector3>[] = []
  const hoverP = new THREE.Vector2(99, 99)
  const markNdc = new THREE.Vector3()
  let hoverAmt = 0
  let hoverLive = false
  let leanX = 0
  let leanY = 0
  /** a mouse is in the window (the mark follows it); how much the follow has taken over from the sway */
  let pointerIn = false
  let engaged = 0
  let spark: { part: number; u0: number; dir: number; at: number } | null = null
  const fine = typeof matchMedia === 'function' && matchMedia('(hover: hover) and (pointer: fine)').matches
  let reduced = false
  let mobile = false

  // DOM
  let payoff: HTMLElement
  let title: HTMLElement

  // reveal clock (performance time, seconds)
  let revealAt = -1
  let initAt = 0
  const now = () => performance.now() / 1000

  // pose (computed in update, written in camera)
  const pos = new THREE.Vector3()
  const tgt = new THREE.Vector3()
  let fov = 30
  let parallax = 0.2
  const tmpF = new THREE.Vector3()
  const tmpR = new THREE.Vector3()
  const tmpU = new THREE.Vector3()
  const tmpW = new THREE.Vector3()
  const tmpC = new THREE.Vector3()
  const tmpP = new THREE.Vector3()
  const tmpQ = new THREE.Vector3()
  const cardX = new THREE.Vector3()
  const cardY = new THREE.Vector3()
  const cardN = new THREE.Vector3()
  const lineA = new THREE.Vector2()
  const lineB = new THREE.Vector2()
  const focus = new THREE.Vector2()
  const focusW = new THREE.Vector3()
  const UP = new THREE.Vector3(0, 1, 0)
  const tmpM = new THREE.Matrix4()
  const val = new Array<number>(NV).fill(0)
  const keys: Key[] = []
  const tang: number[][] = []

  const fitDist = (f: Fit, fovDeg: number, aspect: number, markAspect: number) => {
    const tanV = Math.tan(THREE.MathUtils.degToRad(fovDeg / 2))
    return Math.max(MARK_S / (f.hf * 2 * tanV), (MARK_S * markAspect) / (f.wf * 2 * tanV * aspect))
  }

  /** the story's camera keys for this viewport */
  const buildKeys = (portrait: boolean, aspect: number, markAspect: number) => {
    const F = portrait ? FIT.port : FIT.land
    const dIntro = Math.log(fitDist(F.intro, 30, aspect, markAspect))
    const dEnd = Math.log(fitDist(F.end, 30, aspect, markAspect))
    // close-ups back off a little on narrow screens
    const m = portrait ? Math.log(1.35) : 0
    const k = (at: number, hold: boolean, v: number[]) => ({ at, hold, v })
    keys.length = 0
    keys.push(
      // intro: beside the headline, front-on-ish, a touch below eye level
      k(0.0, true, [0, 0, 0, 0.0, 0.065, dIntro, 30, F.intro.sx, F.intro.sy, -0.2, 0]),
      k(0.075, true, [0, 0, 0, 0.0, 0.065, dIntro, 30, F.intro.sx, F.intro.sy, -0.2, 0]),
      // 01 polished edge: grazing along the upper loop's bevel from above-left
      k(0.2, false, [U(-0.12), U(0.3), U(0.06), -0.7, 0.26, Math.log(2.6) + m, 26, 0, 0, -0.12, 0.02]),
      // …gliding along the top of the mark to the right
      k(0.31, false, [U(0.2), U(0.24), U(0.06), 0.5, 0.2, Math.log(2.4) + m, 26, 0, 0, 0.12, 0.0]),
      // 02 sandblasted face: nearly front-on, close on the right loop (the light drifts behind)
      k(0.42, false, [U(0.22), U(-0.04), U(0.06), 0.16, 0.04, Math.log(2.6) + m, 28, 0, 0, 0.04, 0]),
      // 03 thaw: the centre of the face, a clear window gliding over it
      k(0.52, false, [U(0.14), U(-0.13), U(0.06), -0.06, 0.02, Math.log(2.3) + m, 28, 0, 0, -0.04, 0]),
      // settle: pulled back, the mark alone, centred and square to you
      k(0.65, true, [0, 0, 0, 0.0, 0.04, dEnd, 30, F.end.sx, F.end.sy, 0, 0]),
      k(0.86, true, [0, 0, 0, 0.0, 0.04, dEnd, 30, F.end.sx, F.end.sy, 0, 0]),
      // segue: easing in as the picture gives way to services
      k(1.0, false, [0, 0, 0, 0.0, 0.03, dEnd + Math.log(0.84), 30, F.end.sx, F.end.sy, 0, 0]),
    )
    // Catmull-Rom tangents (per unit local); zero at holds and at the ends
    tang.length = 0
    for (let i = 0; i < keys.length; i++) {
      const t = new Array<number>(NV).fill(0)
      if (!keys[i].hold && i > 0 && i < keys.length - 1) {
        const a = keys[i - 1]
        const b = keys[i + 1]
        for (let j = 0; j < NV; j++) t[j] = (b.v[j] - a.v[j]) / (b.at - a.at)
      }
      tang.push(t)
    }
    // the last key keeps drifting: carry the approach speed through the cut
    const n = keys.length - 1
    for (let j = 0; j < NV; j++) tang[n][j] = (keys[n].v[j] - keys[n - 1].v[j]) / (keys[n].at - keys[n - 1].at)
  }
  let keyW = -1
  let keyH = -1

  /** a world point seen from the camera, projected onto the card plane (card coords) */
  const onCardWorld = (s: HeroSet, world: THREE.Vector3, out: THREE.Vector2) => {
    const d = tmpP.copy(world).sub(pos)
    const den = d.dot(cardN)
    const t = tmpQ.copy(s.card.position).sub(pos).dot(cardN) / (Math.abs(den) > 1e-6 ? den : 1e-6)
    const x = d.multiplyScalar(t).add(pos).sub(s.card.position)
    out.set(x.dot(cardX), x.dot(cardY))
  }
  /** a point on the mark (mark units), projected onto the card plane */
  const onCard = (s: HeroSet, markPt: THREE.Vector3, out: THREE.Vector2) =>
    onCardWorld(s, tmpW.copy(markPt).applyMatrix4(s.logo.root.matrixWorld), out)

  /** Hermite-interpolate the keys at `local` into val[] */
  const sample = (local: number) => {
    let i = 0
    while (i < keys.length - 2 && local > keys[i + 1].at) i++
    const a = keys[i]
    const b = keys[i + 1]
    const h = b.at - a.at
    const t = clamp((local - a.at) / h)
    const t2 = t * t
    const t3 = t2 * t
    const h00 = 2 * t3 - 3 * t2 + 1
    const h10 = t3 - 2 * t2 + t
    const h01 = -2 * t3 + 3 * t2
    const h11 = t3 - t2
    const ma = tang[i]
    const mb = tang[i + 1]
    for (let j = 0; j < NV; j++) val[j] = h00 * a.v[j] + h10 * h * ma[j] + h01 * b.v[j] + h11 * h * mb[j]
  }

  return {
    id: 'hero',
    group,
    anchors: [0.8],

    async init(ctx: ChapterContext) {
      reduced = ctx.reducedMotion
      mobile = ctx.mobile
      initAt = now()

      // the frame renders into the post chain's own targets; three's glass buffer is anything else
      const isFT = (rt: THREE.WebGLRenderTarget | null) => ctx.post.isFrameTarget(rt)
      let mark: Pick<HeroSet, 'pivot' | 'logo' | 'caps' | 'sides' | 'capsU' | 'rim' | 'markAspect'>
      let walls: THREE.ShaderMaterial[] = []
      if (TUBE) {
        // the neon in clear glass tubes (no frost, so no thaw: its uniforms idle)
        const tm = buildTubeMark(mobile, ctx.world.envMap, MARK_S)
        walls = tm.walls
        const capsU = { uThaw: { value: new THREE.Vector3() }, uThawR: { value: 0 }, uFront: { value: 0 } }
        mark = { pivot: tm.pivot, logo: tm.logo, caps: tm.glass, sides: tm.glass, capsU, rim: tm.rim, markAspect: tm.markAspect }
        await nextFrame()
      } else {
        mark = buildMark(mobile, ctx.world.envMap)
        await nextFrame()
        refineMark(mark.logo.mark.geometry)
        await nextFrame()
      }
      const card = buildCard(isFT)
      const floor = buildFloor()
      const reflection = buildReflection(mark.logo.mark.geometry)
      // the halo: the mark in neon, mounted behind the glass (it turns with it); in the
      // tube option, the neon inside the glass tubes
      const halo = TUBE ? buildTubeNeon(isFT) : buildNeonMark(isFT)
      mark.logo.root.add(halo.root)
      // …and its reflection in the black mirror floor (placed each frame like the mark's)
      const haloRefl = TUBE ? buildTubeNeon(isFT, { floorY: FLOOR_Y, fade: 1.3 }) : buildNeonMark(isFT, { floorY: FLOOR_Y, fade: 1.3 })
      haloRefl.root.matrixAutoUpdate = false
      set = { ...mark, ...card, floor, reflection, neon: halo.parts, neonRefl: haloRefl, walls }
      if (TUBE) neonCurves = (halo as ReturnType<typeof buildTubeNeon>).curves
      // the mark follows a mouse anywhere in the window, and rests when it leaves
      if (TUBE && fine) {
        window.addEventListener('pointermove', e => (pointerIn = e.pointerType === 'mouse'), { passive: true })
        document.addEventListener('pointerout', e => !e.relatedTarget && (pointerIn = false), { passive: true })
        window.addEventListener('blur', () => (pointerIn = false))
      }
      // a click on a tube sends a spark racing along it (from where it was clicked)
      if (TUBE)
        ctx.renderer.domElement.addEventListener('click', () => {
          if (!hoverLive || !set) return
          const hit = nearestOnTubes(neonCurves, hoverP)
          if (hit.part < 0 || hit.d > 0.09) return
          spark = { part: hit.part, u0: hit.u, dir: hit.u < 0.5 ? 1 : -1, at: performance.now() / 1000 }
          window.__hark?.engine?.wake()
        })
      group.add(set.card, set.floor, set.pivot, set.reflection, haloRefl.root)

      // ---- DOM
      // the headline first, the manifesto, the CTAs and the scroll hint under it
      payoff = el('div', 'hf-payoff', undefined, ctx.stage)
      const inner = el('div', 'hf-payoff-inner', undefined, payoff)
      title = rise(el('h1', 'hud-title hf-title', undefined, inner), 'Make the internet <em>listen.</em>')
      el('p', 'hud-body hf-manifesto', BRAND.manifesto, inner)
      const ctas = el('div', 'hf-ctas', undefined, inner)
      const see = el('button', 'hud-btn', 'See the work', ctas)
      see.type = 'button'
      see.addEventListener('click', () => window.__hark?.land('work'))
      const start = el('a', 'hud-btn hud-btn--ghost', 'Start a project', ctas)
      start.href = '#contact'
      start.addEventListener('click', e => {
        if (!window.__hark) return
        e.preventDefault()
        window.__hark.land('contact')
      })
      const hint = el('p', 'hud-label hf-hint', undefined, inner)
      el('span', 'hf-hint-line', undefined, hint).setAttribute('aria-hidden', 'true')
      el('span', '', MICROCOPY.scrollHint, hint)

      const onReveal = () => {
        if (revealAt < 0) revealAt = now()
      }
      if (document.documentElement.dataset.ready === '1') onReveal()
      else window.addEventListener('hark:reveal', onReveal, { once: true })
    },

    update(local: number, frame: Frame, ctx: ChapterContext) {
      if (!set) return
      const s = set
      const t = frame.time
      const portrait = frame.width <= frame.height
      const aspect = frame.width / Math.max(1, frame.height)
      // reduced motion: no sway, no sweep. Motion off: frame.time holds, so they hold too
      const calm = reduced ? 0 : 1
      // calm out-beat: no dive into the glass; the camera holds the payoff pose under the fade
      const still = reduced || !!frame.still

      // ---- reveal (time-based): backlight up from black, frost lights centre-out, one sweep
      const clock = now()
      if (revealAt < 0 && (document.documentElement.dataset.ready === '1' || clock - initAt > 20)) revealAt = clock
      const since = revealAt < 0 ? 0 : clock - revealAt
      const rk = reduced ? 3 : 1
      const rLight = sm(since * rk, 0.0, 1.25)
      const rSpread = sm(since * rk, 0.1, 1.6)
      const rHalo = sm(since * rk, 0.2, 1.8)
      // the neon mark strikes part by part: loop A, loop B, then the diamond (one stutter each,
      // well under 3 flashes a second)
      const strike = (t0: number) => {
        const x = since - t0
        if (x <= 0 || revealAt < 0) return 0
        if (reduced) return sm(x, 0, 0.6)
        if (x < 0.06) return 0.75
        if (x < 0.15) return 0.22
        return 0.55 + 0.45 * sm(x, 0.15, 0.55)
      }
      const rNeon = [strike(0.5), strike(0.85), strike(1.2)]
      const rSweep = reduced ? 0 : 1.1 * (1 - outQuart(segment(since, 0.8, 2.4))) * smoothstep(0.6, 0.9, since)

      // ---- camera keys
      if (frame.width !== keyW || frame.height !== keyH) {
        keyW = frame.width
        keyH = frame.height
        buildKeys(portrait, aspect, s.markAspect)
      }
      sample(still ? Math.min(local, 0.86) : local)
      const macro = smoothstep(0.08, 0.2, local) * (1 - smoothstep(0.52, 0.64, local))
      const payW = smoothstep(0.56, 0.66, local)
      const outW = smoothstep(0.86, 1, local)
      // the segue: the neon surges as the picture gives way
      const surge = smoothstep(0.84, 0.96, local)
      const dist = Math.exp(val[LD])
      fov = val[FOV]
      const tanV = Math.tan(THREE.MathUtils.degToRad(fov / 2))
      tgt.set(val[TX], val[TY], val[TZ])
      const ce = Math.cos(val[EL])
      pos.set(Math.sin(val[AZ]) * ce, Math.sin(val[EL]), Math.cos(val[AZ]) * ce).multiplyScalar(dist).add(tgt)
      tmpF.subVectors(tgt, pos).normalize()
      tmpR.crossVectors(tmpF, UP).normalize()
      tmpU.crossVectors(tmpR, tmpF)
      const shiftR = -val[SX] * dist * tanV * aspect
      const shiftU = -val[SY] * dist * tanV
      pos.addScaledVector(tmpR, shiftR).addScaledVector(tmpU, shiftU)
      tgt.addScaledVector(tmpR, shiftR).addScaledVector(tmpU, shiftU)
      parallax = lerp(0.22, 0.03, macro) * (1 - outW)

      // ---- the pointer (tube mark, a mouse): wherever it is in the window the mark turns toward
      // it (aimed from the mark's own place on screen, so the turn can't feed back into the aim),
      // and the nearer it comes the more the neon and the glass light up where it points. The
      // follow eases in and out with the headline and the settle (the close-ups hold still) and
      // only lets go when the mouse leaves the window: no hard edges, no snapping back.
      const followW = TUBE && fine ? 1 - smoothstep(0.07, 0.14, local) + smoothstep(0.56, 0.64, local) * (1 - smoothstep(0.84, 0.9, local)) : 0
      const follow = pointerIn ? followW : 0
      engaged = damp(engaged, follow, 3, frame.dt)
      const soft = (v: number) => v / Math.sqrt(1 + v * v)
      markNdc.setFromMatrixPosition(s.logo.root.matrixWorld).project(ctx.camera)
      // (before the first real frame the projection isn't finite: aim nowhere rather than NaN)
      const aim = follow > 0 && Number.isFinite(markNdc.x + markNdc.y)
      leanX = damp(leanX, aim ? follow * soft(((frame.pointerRaw.x - markNdc.x) * aspect) / 0.55) : 0, 3.5, frame.dt)
      leanY = damp(leanY, aim ? follow * soft((frame.pointerRaw.y - markNdc.y) / 0.55) : 0, 3.5, frame.dt)
      const onPlane = followW > 0 && pointerOnMark(ctx.camera, frame.pointerRaw, s.logo.root, hoverP)
      const near = onPlane ? 1 - smoothstep(0.5, 1.2, hoverP.length()) : 0
      hoverLive = pointerIn && onPlane && hoverP.length() < 0.85
      hoverAmt = damp(hoverAmt, follow * near, 4, frame.dt)

      // ---- the mark: a slow turntable sway (±12° at rest, quieter in the payoff, still in macro);
      // a mouse in the window all but stills it, so the mark holds and turns toward the pointer
      const swayAmp = THREE.MathUtils.degToRad(lerp(12, 5, payW)) * (1 - macro) * (1 - outW) * calm * (1 - 0.85 * engaged)
      const sway = swayAmp * Math.sin(t * 0.36)
      s.pivot.rotation.set(
        val[TILT] + 0.015 * Math.sin(t * 0.23) * calm * (1 - macro) - 0.3 * leanY,
        val[ROT] + sway + 0.45 * leanX,
        0,
      )
      s.pivot.updateMatrixWorld(true)
      s.reflection.matrix.multiplyMatrices(FLOOR_MIRROR, s.logo.root.matrixWorld)
      s.neonRefl.root.matrix.multiplyMatrices(FLOOR_MIRROR, s.logo.root.matrixWorld)

      // ---- light sweep along the bevels every ~8 s: glide across, rest, glide back
      let sweep = 0
      if (!reduced) {
        const cyc = t / 8
        const ph = cyc - Math.floor(cyc)
        const dir = Math.floor(cyc) % 2 === 0 ? 1 : -1
        sweep = 0.5 * dir * (sm(ph, 0.0, 0.32) * 2 - 1)
      }
      // in the macro shots the studio turns slowly instead (highlights crawl along the bevel)
      const turn = lerp(sweep, 0.9 * Math.sin(Math.PI * segment(local, 0.1, 0.56)) - 0.3, macro) + rSweep
      s.caps.envMapRotation.set(0, turn, 0)
      s.sides.envMapRotation.set(0, turn, 0)
      // the FROST does the lighting: the sandblasted faces keep only a faint sheen of the
      // studio (strong strip reflections read as brushed metal); the polished bevels keep it all
      if (TUBE) {
        // clear glass tubes: the studio's strips run along them (caps and sides are one glass)
        s.caps.envMapIntensity = lerp(0.3, 1.15, rLight) * lerp(1, 0.8, macro)
        s.rim.uniforms.uStrength.value = 0.14 * rLight
      } else {
        s.caps.envMapIntensity = lerp(0.04, 0.16, rLight) * lerp(1, 0.6, macro)
        s.sides.envMapIntensity = lerp(0.35, 1.6, rLight)
        // a faint lift at the silhouette (light caught in the glass); the dark polished rims stay
        s.rim.uniforms.uStrength.value = 0.08 * rLight * (1 - 0.5 * macro)
      }

      // ---- the thaw: a clear window glides across the face in beat 03
      // it runs down the centre of the lower diagonal band, from the right loop toward the bottom one
      const thawP = segment(local, 0.44, 0.55)
      // …and it's gone before the pull-back shows the whole mark (the light strip behind goes with it)
      const thawK = smoothstep(0.43, 0.46, local) * (1 - smoothstep(0.515, 0.545, local))
      s.capsU.uThaw.value.set(lerp(THAW_A.x, THAW_B.x, thawP), lerp(THAW_A.y, THAW_B.y, thawP), thawK)
      s.capsU.uThawR.value = 0.066
      s.capsU.uFront.value = 0.4
      if (!TUBE) s.caps.roughness = FROST

      // ---- the backlight card: camera-facing, behind the mark; it drifts in macro
      const camToMark = tmpC.copy(pos).negate().normalize() // the mark's centre is the origin
      const back = 1.7
      const drift = Math.sin(Math.PI * segment(local, 0.1, 0.56))
      const driftX = 0.9 * drift * Math.sin(Math.PI * 2 * segment(local, 0.1, 0.56) + 0.4)
      const driftY = -0.35 * drift
      s.card.position.set(0, 0, 0).addScaledVector(camToMark, back).addScaledVector(tmpR, driftX).addScaledVector(tmpU, driftY)
      tmpM.lookAt(pos, s.card.position, UP)
      s.card.quaternion.setFromRotationMatrix(tmpM)
      tmpM.extractBasis(cardX, cardY, cardN)
      const cardSize = MARK_S * 5.2
      s.card.scale.set(cardSize, cardSize, 1)
      const cu = s.card.material.uniforms
      cu.uHalf.value = cardSize / 2
      // the frost lights from the centre outward: a hot core, then a broad light box
      // behind every loop (glass buffer only; the room stays black)
      cu.uCore.value = lerp(0.08, 0.62, rSpread) * lerp(1, 1.15, macro)
      cu.uWideR.value = lerp(0.2, 1.6, rSpread)
      cu.uBarW.value = 0.1
      // in the macro shots the light sits behind whatever the camera studies, drifting
      // across it (so the face in view glows through and its frost gradient shifts);
      // in the thaw it slides off, so the razor line reads through the clear window
      const lineK = TUBE ? 0 : smoothstep(0.405, 0.44, local) * (1 - smoothstep(0.53, 0.56, local))
      const focusK = macro * (1 - 0.75 * lineK)
      if (focusK > 0) onCardWorld(s, focusW.set(val[TX], val[TY], val[TZ]), focus)
      const sweepX = -0.35 + 0.7 * sm(local, 0.14, 0.43)
      cu.uHot.value.set(lerp(0.12 + 0.3 * drift, focus.x + sweepX, focusK), lerp(0.06, focus.y + 0.12, focusK))
      // (the card's slits stay off: the neon tubes stand where they were)
      cu.uRings.value = 1.6
      // close up the card fills the view: dim it there, or the faces clip to flat white
      // (and a little more behind the thaw, so its razor line reads through the clear glass)
      s.cardK.trans.glow = 0.18 * rLight * lerp(1, 0.55, macro) * (1 - 0.45 * lineK)
      s.cardK.trans.wide = 0.05 * rLight * lerp(1, 0.4, macro) * (1 - 0.45 * lineK)
      s.cardK.trans.slit = 0
      s.cardK.trans.bar = 0
      // the thaw's light strip, straight behind the thaw path (from the camera): the window
      // glides along it, so inside the window it's a razor line, outside a frosted bar
      if (lineK > 0) {
        onCard(s, THAW_A, lineA)
        onCard(s, THAW_B, lineB)
        lineB.sub(lineA)
        const len = Math.max(lineB.length(), 1e-4)
        const nx = -lineB.y / len
        const ny = lineB.x / len
        cu.uLine.value.set(nx, ny, -(nx * lineA.x + ny * lineA.y))
      }
      s.cardK.trans.line = 6.5 * lineK
      s.cardK.trans.lineWidth = 0.0045
      // no rings: the polished bevels bend hairline rings into dashed 'tread' across
      // the macro shots; the thaw shows the clean light (and a slit) instead
      s.cardK.trans.rings = 0
      s.cardK.main.glow = 0.035 * rLight * (1 - 0.5 * macro)
      s.cardK.main.slit = 0
      if (TUBE) {
        // clear glass shows what's behind it as it is: only a whisper of the card
        s.cardK.trans.glow = 0.05 * rLight * lerp(1, 0.6, macro)
        s.cardK.trans.wide = 0.012 * rLight
        s.cardK.main.glow = 0.025 * rLight * (1 - 0.5 * macro)
      }

      // ---- the halo: the neon mark — tubes + halo sleeves in the room, a stronger halo in the
      // glass buffer (the frost turns it into the mark's shape in coloured light)
      // (tube option: the neon inside the glass reaches the eye only through it, so the glass
      // buffer carries the tube and its glow; the room sees the halo spilling past the glass.
      // A spark runs down each tube: through beat 03, and every few seconds at rest)
      const curP = segment(local, 0.445, 0.55)
      const current = TUBE ? Math.sin(Math.PI * curP) : 0
      for (let i = 0; i < s.neon.length; i++) {
        for (const n of s.neon[i]) {
          n.on.value = rNeon[i] * (1 + 0.6 * surge)
          if (TUBE) {
            n.k.main.tube = 3.2
            n.k.main.glow = 0.2
            n.k.trans.tube = 3.0
            n.k.trans.glow = 0.34 * lerp(1, 0.8, macro)
            let px = curP
            let py = current > 0.001 ? 2.4 * current : 0
            if (py === 0 && !reduced && revealAt >= 0 && since > 3) {
              const ph = (t + i * 0.45) / 7
              const f = (ph - Math.floor(ph)) * 7 / 1.9
              if (f < 1) {
                px = f
                py = 1.5 * Math.sin(Math.PI * f)
              }
            }
            // a clicked spark races from where it was clicked toward the far end
            if (spark && spark.part === i) {
              const e = performance.now() / 1000 - spark.at
              if (e < 1.5) {
                px = spark.u0 + spark.dir * e * 0.7
                // (the diamond is a closed loop: the spark goes round)
                if (i === 2) px -= Math.floor(px)
                py = Math.max(py, 4.8 * (1 - e / 1.5))
                n.on.value *= 1 + 0.35 * Math.exp(-e * 5)
              } else spark = null
            }
            n.pulse.value.set(px, py)
          } else {
            n.k.main.tube = 3.0
            n.k.main.glow = 0.55
            n.k.trans.tube = 3.0
            n.k.trans.glow = 0.78 * lerp(1, 0.6, macro)
          }
        }
        const w = s.walls[i]
        if (w) {
          w.uniforms.uOn.value = rNeon[i] * (1 + 0.6 * surge)
          w.uniforms.uK.value = 0.42 * lerp(1, 0.8, macro)
        }
      }
      if (TUBE) setTubeHover(s.neon, s.walls, hoverP, hoverAmt)
      // (a still page drops to a slow heartbeat: keep drawing while the lean, the light or a spark moves)
      if (spark || hoverAmt > 0.004 || engaged > 0.004 || Math.abs(leanX) + Math.abs(leanY) > 0.004) window.__hark?.engine?.wake()
      // the reflection: the room's view only (the glass never sees it), dimmer
      for (let i = 0; i < s.neonRefl.parts.length; i++) {
        for (const n of s.neonRefl.parts[i]) {
          n.on.value = rNeon[i] * (portrait ? (TUBE ? 0.05 : 0.12) : 1)
          n.k.main.tube = 0.9
          n.k.main.glow = 0.3
          n.k.trans.tube = 0
          n.k.trans.glow = 0
        }
      }

      // ---- floor pool + reflection
      const fu = s.floor.material.uniforms
      fu.uK.value = 0.045 * rHalo * (1 - 0.4 * macro)
      // portrait: the copy sits under the mark, so the reflection is only a faint top sliver
      const ru = s.reflection.material.uniforms
      ru.uStrength.value = (TUBE ? 0.1 : 0.2) * rLight * (portrait ? 0.3 : 1)
      ru.uFade.value = portrait ? 6 : 1.6

      // ---- world: black, the halo behind the mark, two hairline slits
      const wp = ctx.world.params
      wp.top = '#020203'
      wp.bottom = '#000000'
      // the halo sits exactly behind the mark's centre on screen (the field's heading drift cancelled)
      const w = tmpW.set(0, 0, 0).sub(pos)
      const depth = Math.max(0.1, w.dot(tmpF))
      const ndcX = w.dot(tmpR) / (depth * tanV * aspect)
      const ndcY = w.dot(tmpU) / (depth * tanV)
      const yaw = Math.atan2(tmpF.x, -tmpF.z)
      const pitch = Math.asin(clamp(tmpF.y, -1, 1))
      wp.focus.set(ndcX * aspect + Math.sin(yaw) * 0.25, ndcY + pitch * 0.2)
      // the halo scales with the mark on screen
      const markH = MARK_S / (depth * tanV * 2) // fraction of the viewport height
      wp.halo = lerp(0.02, 0.75, rHalo) * (1 - 0.35 * macro)
      wp.haloSize = clamp(markH * 1.15, 0.45, 2)
      wp.haloColor = '#e6eeff'
      wp.slits = 0 // the card draws this chapter's slits (they must line up with the glass)
      wp.slitAngle = 0
      wp.envTurn = turn
      wp.env = 1
      wp.key = lerp(0.1, 0.6, rLight)
      wp.keyDir.set(-0.45, 0.8, 0.5)
      wp.fill = 0.04

      // ---- post: bloom only on true highlights (never the frost), deep vignette
      const pp = ctx.post.params
      pp.bloomStrength = 0.22
      pp.bloomRadius = 0.25
      pp.bloomThreshold = 1.6
      pp.vignette = 0.62
      pp.grain = 0.016
      pp.frost = 0

      // ---- DOM
      // the headline block: in with the reveal, out as the camera travels in
      reveal(payoff, 1 - smoothstep(0.06, 0.1, local), 0)
      payoff.classList.toggle('is-in', revealAt >= 0 && since > (reduced ? 0 : 0.5))
      setRise(title, revealAt >= 0 && since > (reduced ? 0 : 0.2) && local < 0.1)
    },

    camera(_local: number, _frame: Frame, out: CameraPose) {
      out.position.copy(pos)
      out.target.copy(tgt)
      out.fov = fov
      out.roll = 0
      out.parallax = parallax
    },
  }
}
