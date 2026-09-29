import * as THREE from 'three'
import type { CameraPose, Chapter, ChapterContext, Frame } from '../../core/types'
import { el, reveal, rise, setRise } from '../../core/dom'
import { PROCESS } from '../../content'
import { clamp, ease, lerp, segment, smoothstep, window01 } from '../../core/math'
import { nextFrame } from '../../core/yield'
import { G } from '../../kit/glass'
import {
  DEPTH,
  FLOOR_MIRROR,
  HALO_SCALE,
  HALO_Z,
  MARK_S,
  buildCard,
  buildFloor,
  buildGlass,
  buildHead,
  buildNeon,
  buildReflection,
  buildSketch,
  buildSpark,
  FLOOR_Y,
  type Neon,
  type PrintedMark,
  type Spark,
} from './scene'
import './process.css'

/*
 * ASSEMBLY — "We listen first. Then we build."
 *
 * The process literally builds the Hark mark, one step at a time, front-on
 * and centred in the black room over the mirror floor:
 *
 *   0.00–0.10  intro (the breath cut clears): darkness, one faint point of
 *              light where the mark's centre will be; the headline
 *   0.10–0.27  01 LISTEN     only the mark's DIAMOND exists: a small neon
 *                            diamond draws itself from the point, and rings
 *                            ripple slowly out of it — its own outline,
 *                            rounding into circles as they spread (hark:
 *                            listen)
 *   0.27–0.44  02 PROTOTYPE  a construction drawing spreads over the room —
 *                            fine grid, axes, the circles every curl is drawn
 *                            from, the tangents the bars run along — and the
 *                            two LOOPS sketch themselves over it in neon (the
 *                            tubes draw in like pen strokes, a hot head at the
 *                            nib): the full neon outline, a working model
 *   0.44–0.61  03 BUILD      the drawing clears; the outline glides back and
 *                            grows into the halo, and the frosted GLASS mark
 *                            is printed inside it from the floor up — a line
 *                            of light rides the print front, each fresh layer
 *                            glows and cools
 *   0.61–0.78  04 SUPPORT    it stays alive: the finished mark turns slowly,
 *                            sparks of light travel round the neon now and
 *                            then, a steady glow
 *   0.78–0.95  finale: pull back to the finished mark alone, glowing
 *   0.95–1.00  out-beat
 *
 * Everything derives from `local`; frame.time only drives idle motion (the
 * rings' slow drift, the sparks, a gentle sway; held under Motion off, gone
 * under reduced motion, where the rings and sparks follow the scroll alone).
 */

// ---------------------------------------------------------------- timeline

const A = 0.1
const S = 0.17
const B = A + 4 * S
const ANCHORS = [0.19, 0.365, 0.535, 0.7]
const HEAD = [0.045, 0.29] as const
const CARD = [0.13, 0.785] as const

const DIAMOND = [0.068, 0.118] as const
const RINGS = [0.085, 0.315] as const
const GUIDES = [0.262, 0.478] as const
const LOOP_A = [0.298, 0.392] as const
const LOOP_B = [0.312, 0.406] as const
const RECEDE = [0.446, 0.5] as const
const PRINT = [0.468, 0.592] as const
const TURN = [0.6, 0.835] as const


/** smootherstep on a segment */
const sm = (x: number, a: number, b: number) => {
  const t = segment(x, a, b)
  return t * t * t * (t * (t * 6 - 15) + 10)
}
const fract = (x: number) => x - Math.floor(x)
/** a stable 0..1 hash of an integer */
const hash = (n: number) => fract(Math.sin(n * 127.1 + 311.7) * 43758.5453)

// ---------------------------------------------------------------- camera

/** [ln distance factor, azimuth (deg), elevation (deg), results framing 0..1] */
interface Key {
  at: number
  hold: boolean
  v: number[]
}
const NV = 4
const k = (at: number, hold: boolean, f: number, az: number, el: number, res = 0): Key => ({ at, hold, v: [Math.log(f), az, el, res] })
const KEYS: Key[] = [
  // the point of light, close
  k(0.0, true, 0.6, 0, 1.2),
  k(0.075, false, 0.62, 0, 1.2),
  // listen: the diamond and its rings; the camera eases back as they spread
  k(0.19, false, 0.68, 0, 1.4),
  k(0.265, false, 0.8, 0, 1.4),
  // prototype: square to the drawing board
  k(0.345, false, 1.0, 0, 1.0),
  k(0.43, true, 1.0, 0, 1.0),
  // build: a little from the side and above, the print front's cut face in view
  k(0.525, false, 0.97, -8, 5.5),
  k(0.6, false, 0.99, -3, 3.5),
  // support: front-on again, the mark turns itself
  k(0.7, false, 0.98, 0, 2.5),
  // finale: pull back to the finished mark
  k(0.865, true, 1.0, 0, 2.0, 1),
  k(0.945, true, 1.0, 0, 2.0, 1),
  k(1.0, false, 0.95, 0, 1.8, 1),
]
const TANG: number[][] = KEYS.map((key, i) => {
  const t = new Array<number>(NV).fill(0)
  if (!key.hold && i > 0 && i < KEYS.length - 1) {
    const a = KEYS[i - 1]
    const b = KEYS[i + 1]
    for (let j = 0; j < NV; j++) t[j] = (b.v[j] - a.v[j]) / (b.at - a.at)
  }
  return t
})
{
  // the last key keeps drifting through the cut
  const n = KEYS.length - 1
  for (let j = 0; j < NV; j++) TANG[n][j] = (KEYS[n].v[j] - KEYS[n - 1].v[j]) / (KEYS[n].at - KEYS[n - 1].at)
}
const val = new Array<number>(NV).fill(0)
function sampleKeys(local: number) {
  let i = 0
  while (i < KEYS.length - 2 && local > KEYS[i + 1].at) i++
  const a = KEYS[i]
  const b = KEYS[i + 1]
  const h = b.at - a.at
  const t = clamp((local - a.at) / h)
  const t2 = t * t
  const t3 = t2 * t
  const h00 = 2 * t3 - 3 * t2 + 1
  const h10 = t3 - 2 * t2 + t
  const h01 = -2 * t3 + 3 * t2
  const h11 = t3 - t2
  for (let j = 0; j < NV; j++) val[j] = h00 * a.v[j] + h10 * h * TANG[i][j] + h01 * b.v[j] + h11 * h * TANG[i + 1][j]
}

/** where the mark sits on screen: centre (px) and height (px) */
interface Fit {
  cx: number
  cy: number
  hpx: number
}

// ---------------------------------------------------------------- chapter

export default function create(): Chapter {
  const group = new THREE.Group()
  const pivot = new THREE.Group()
  let glass: PrintedMark
  let neon: Neon
  let neonRefl: Neon
  let sketch: ReturnType<typeof buildSketch>
  let head: ReturnType<typeof buildHead>
  let card: ReturnType<typeof buildCard>
  let floor: ReturnType<typeof buildFloor>
  let reflection: ReturnType<typeof buildReflection>
  const sparks: Spark[] = []
  const sparkP = new THREE.Vector3()
  let ready = false

  // DOM
  let headEl: HTMLElement
  let headline: HTMLElement
  let cardEl: HTMLElement
  const stepEls: HTMLElement[] = []
  const stepTitles: HTMLElement[] = []
  const fills: HTMLElement[] = []
  const segs: HTMLElement[] = []
  let shown = -2
  const fillCache = [-1, -1, -1, -1]

  // layout (px), measured on resize
  const fitSteps: Fit = { cx: 0, cy: 0, hpx: 0 }
  const fitRes: Fit = { cx: 0, cy: 0, hpx: 0 }
  let measured = false

  // pose (computed in update, written in camera)
  const pos = new THREE.Vector3()
  const tgt = new THREE.Vector3()
  let fov = 30
  const tmpF = new THREE.Vector3()
  const tmpR = new THREE.Vector3()
  const tmpU = new THREE.Vector3()
  const tmpC = new THREE.Vector3()
  const tmpM = new THREE.Matrix4()
  const UP = new THREE.Vector3(0, 1, 0)
  const haloCol = new THREE.Color()
  const ICE = new THREE.Color(G.ice)
  const NEON_C = new THREE.Color(G.neonC)

  /** fall-back framing before the DOM has laid out */
  const fallbackFit = (W: number, H: number, results: boolean, out: Fit) => {
    const portrait = W < H
    out.cx = W / 2
    out.cy = H * (portrait ? 0.36 : results ? 0.36 : 0.42)
    out.hpx = Math.min(H * (portrait ? 0.4 : results ? 0.46 : 0.56), W * 0.8)
  }

  return {
    id: 'process',
    group,
    // the four steps
    anchors: ANCHORS,

    async init(ctx: ChapterContext) {
      const isFrame = (rt: THREE.WebGLRenderTarget | null) => ctx.post.isFrameTarget(rt)

      // ---- the glass mark (printed in step 03) with the neon, the drawing and the print head in its space
      glass = buildGlass(ctx.world.envMap)
      pivot.add(glass.logo.root)
      await nextFrame()
      neon = buildNeon(isFrame)
      glass.logo.root.add(neon.root)
      ;[G.neonA, G.neonB, G.neonC].forEach((c, i) => {
        const sp = buildSpark(c, isFrame, i < 2 ? 0.28 : 0.12)
        neon.root.add(sp.mesh)
        sparks.push(sp)
      })
      sketch = buildSketch()
      glass.logo.root.add(sketch.mesh)
      head = buildHead()
      glass.logo.root.add(head.mesh)
      await nextFrame()

      // ---- the room: backlight, floor, and everything mirrored in it
      card = buildCard(isFrame)
      floor = buildFloor()
      reflection = buildReflection(glass.logo.mark.geometry, glass.print)
      neonRefl = buildNeon(isFrame, { floorY: FLOOR_Y, fade: 2.2 })
      neonRefl.root.matrixAutoUpdate = false
      group.add(card.mesh, floor, pivot, reflection, neonRefl.root, sketch.mirror)
      await nextFrame()

      // ---- DOM
      const stage = ctx.stage
      headEl = el('div', 'pr-head', undefined, stage)
      el('p', 'hud-eyebrow', 'How it works', headEl)
      headline = rise(el('h2', 'hud-h2 pr-headline', undefined, headEl), 'We listen first. <em>Then we build.</em>')

      cardEl = el('div', 'pr-card hud-panel hud-panel--strong', undefined, stage)
      const steps = el('div', 'pr-steps', undefined, cardEl)
      PROCESS.forEach((p, i) => {
        const s = el('div', 'pr-step', undefined, steps)
        const lead = el('div', 'pr-lead', undefined, s)
        const idx = el('p', 'pr-idx', undefined, lead)
        el('span', 'pr-idx-n', String(i + 1).padStart(2, '0'), idx)
        el('span', 'pr-idx-of', ` / ${String(PROCESS.length).padStart(2, '0')}`, idx)
        stepTitles.push(rise(el('h3', 'pr-title', undefined, lead), p.title))
        el('p', 'hud-body pr-text', p.text, s)
        stepEls.push(s)
      })
      const track = el('ol', 'pr-track', undefined, cardEl)
      PROCESS.forEach((p, i) => {
        const li = el('li', 'pr-seg', undefined, track)
        const bar = el('span', 'pr-bar', undefined, li)
        fills.push(el('span', 'pr-fill', undefined, bar))
        const name = el('span', 'pr-name', undefined, li)
        el('span', 'pr-name-n', String(i + 1).padStart(2, '0'), name)
        el('span', 'pr-name-t', p.title, name)
        segs.push(li)
      })

      reveal(headEl, 0, 0)
      reveal(cardEl, 0, 0)

      // ---- where the mark goes: the biggest square clear of the copy (layout only;
      // opacity / visibility don't affect it)
      const measure = () => {
        const W = stage.clientWidth
        const H = stage.clientHeight
        if (W < 10 || H < 10) return
        const top = headEl.offsetTop
        const gut = headEl.offsetLeft
        // the copy band's bottom: the step card's (the finale shows no card)
        const bandBottom = cardEl.offsetTop + cardEl.offsetHeight
        const pad = Math.max(14, H * 0.025)
        const cTop = cardEl.offsetTop
        const cRight = cardEl.offsetLeft + cardEl.offsetWidth
        // above the card (the card spans the bottom) or beside it (a short landscape)
        const aboveW = W - 2 * gut
        const aboveH = cTop - pad - top
        const sideW = W - gut - (cRight + pad)
        const sideH = bandBottom - top
        const above = Math.min(aboveW, aboveH)
        const side = Math.min(sideW, sideH)
        // (the halo reaches 1.16x the mark, its glow a little further: keep it off the edges)
        const wk = W < H ? 0.68 : 0.8
        if (above >= side) {
          fitSteps.cx = W / 2
          fitSteps.cy = top + aboveH / 2
          fitSteps.hpx = Math.min(aboveH * 0.84, aboveW * wk)
        } else {
          fitSteps.cx = cRight + pad + sideW / 2
          fitSteps.cy = top + sideH / 2
          fitSteps.hpx = Math.min(sideH * 0.8, sideW * 0.8)
        }
        const rTop = bandBottom
        fitRes.cx = W / 2
        fitRes.cy = top + (rTop - top) / 2
        fitRes.hpx = Math.min((rTop - top) * (W < H ? 0.76 : 0.84), aboveW * wk)
        measured = fitSteps.hpx > 20 && fitRes.hpx > 20
      }
      if (typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(measure)
        ro.observe(stage)
        ro.observe(cardEl)
      } else window.addEventListener('resize', measure)
      document.fonts?.ready.then(measure)
      measure()
      ready = true
    },

    update(local: number, frame: Frame, ctx: ChapterContext) {
      if (!ready) return
      const W = frame.width
      const H = frame.height
      const aspect = W / Math.max(1, H)
      const portrait = W < H
      const t = frame.time
      // reduced motion: rings and sparks follow the scroll alone, no sway;
      // Motion off: frame.time holds, so the idle drift holds with it
      const rm = ctx.reducedMotion || frame.reducedMotion
      const idle = rm ? 0 : 1

      // ================= camera
      sampleKeys(local)
      const fs = measured ? fitSteps : null
      const fr = measured ? fitRes : null
      const fitA = fs ?? { cx: 0, cy: 0, hpx: 0 }
      const fitB = fr ?? { cx: 0, cy: 0, hpx: 0 }
      if (!fs) fallbackFit(W, H, false, fitA)
      if (!fr) fallbackFit(W, H, true, fitB)
      const res = clamp(val[3])
      fov = portrait ? 34 : 30
      const tanV = Math.tan(THREE.MathUtils.degToRad(fov / 2))
      const dFor = (f: Fit) => MARK_S / (Math.max(0.05, f.hpx / H) * 2 * tanV)
      const baseD = Math.exp(lerp(Math.log(dFor(fitA)), Math.log(dFor(fitB)), res))
      const sx = lerp((fitA.cx / W) * 2 - 1, (fitB.cx / W) * 2 - 1, res)
      const sy = lerp(1 - (fitA.cy / H) * 2, 1 - (fitB.cy / H) * 2, res)
      const dist = baseD * Math.exp(val[0])
      const az = THREE.MathUtils.degToRad(val[1])
      const elv = THREE.MathUtils.degToRad(val[2])
      tgt.set(0, 0, 0)
      const ce = Math.cos(elv)
      pos.set(Math.sin(az) * ce, Math.sin(elv), Math.cos(az) * ce).multiplyScalar(dist)
      // a slow breath in the pose (idle only)
      pos.y += 0.025 * Math.sin(t * 0.35) * idle
      tmpF.subVectors(tgt, pos).normalize()
      tmpR.crossVectors(tmpF, UP).normalize()
      tmpU.crossVectors(tmpR, tmpF)
      const shiftR = -sx * dist * tanV * aspect
      const shiftU = -sy * dist * tanV
      pos.addScaledVector(tmpR, shiftR).addScaledVector(tmpU, shiftU)
      tgt.addScaledVector(tmpR, shiftR).addScaledVector(tmpU, shiftU)

      // ================= beats
      const proto = smoothstep(0.27, 0.34, local)
      const lit = smoothstep(PRINT[0], PRINT[0] + 0.09, local) // the glass is there to light
      const alive = smoothstep(0.6, 0.66, local) * (1 - smoothstep(0.955, 0.995, local))

      // ================= the mark: square to the camera; in support it turns slowly
      const turnE = ease.inOutQuad(segment(local, TURN[0], TURN[1]))
      const yaw = 0.3 * Math.sin(Math.PI * turnE) + 0.05 * Math.sin(t * 0.31) * alive * idle
      const tilt = -0.025 * Math.sin(Math.PI * turnE) + 0.012 * Math.sin(t * 0.23) * alive * idle
      // the mark faces the camera even where it sits off-centre on screen (a short
      // landscape, the results pose): cancel the view angle the screen offset adds
      const faceYaw = Math.atan2(pos.x, pos.z) - az
      const facePitch = Math.atan2(pos.y, Math.hypot(pos.x, pos.z)) - elv
      pivot.rotation.set(tilt - facePitch, yaw + faceYaw, 0, 'YXZ')

      // ================= 03 BUILD: the outline glides back into the halo; the glass is printed
      const recede = ease.inOutCubic(segment(local, RECEDE[0], RECEDE[1]))
      neon.root.position.z = lerp(0, HALO_Z, recede)
      neon.root.scale.setScalar(lerp(1, HALO_SCALE, recede))

      const pr = segment(local, PRINT[0], PRINT[1])
      const front = lerp(-0.535, 0.535, 0.5 - 0.5 * Math.cos(Math.PI * pr))
      glass.print.uPrint.value = front
      glass.print.uHot.value = 0.9 * window01(local, PRINT[0], PRINT[1] + 0.03, 0.02)
      glass.logo.mark.visible = local > PRINT[0]
      reflection.visible = local > PRINT[0]
      const headK = window01(local, PRINT[0] - 0.004, PRINT[1] + 0.01, 0.014) * (1 - smoothstep(0.44, 0.53, front)) * smoothstep(-0.53, -0.46, front)
      head.u.uK.value = headK
      head.mesh.visible = headK > 0.001
      head.mesh.position.set(0, front, DEPTH / 2 + 0.006)
      glass.logo.caps.envMapIntensity = 0.13
      glass.logo.sides.envMapIntensity = lerp(0.3, 1.5, lit)

      pivot.updateMatrixWorld(true)
      reflection.matrix.multiplyMatrices(FLOOR_MIRROR, glass.logo.root.matrixWorld)
      neonRefl.root.matrix.multiplyMatrices(FLOOR_MIRROR, neon.root.matrixWorld)
      sketch.mirror.matrix.multiplyMatrices(FLOOR_MIRROR, sketch.mesh.matrixWorld)

      // ================= the neon: the diamond (01), the loops (02), the halo + sparks (04)
      const dDraw = sm(local, DIAMOND[0], DIAMOND[1])
      const aDraw = sm(local, LOOP_A[0], LOOP_A[1])
      const bDraw = sm(local, LOOP_B[0], LOOP_B[1])
      const draws = [aDraw, bDraw, dDraw]
      const starts = [LOOP_A[0], LOOP_B[0], DIAMOND[0]]
      // sparks: one per tube, now and then (idle); on the scroll alone under reduced motion
      const periods = [4.8, 5.6, 2.6]
      const offs = [0.0, 0.47, 0.23]
      const reflK = portrait ? 0.15 : 1
      for (let i = 0; i < 3; i++) {
        let px = 0
        let py = 0
        if (alive > 0) {
          if (rm) {
            px = fract(local * 3.2 + offs[i])
            py = 2.6 * Math.sqrt(Math.sin(Math.PI * px))
          } else {
            const ph = t / periods[i] + offs[i] + local * 2
            const lap = Math.floor(ph)
            px = ph - lap
            // the loops always carry a spark; the diamond's comes now and then
            const gate = i < 2 || hash(lap * 7 + i * 31) < 0.6 ? 1 : 0
            py = 3.6 * gate * Math.sqrt(Math.sin(Math.PI * px))
          }
          py *= alive
        }
        const on = local > starts[i] ? 1 : 0
        const sp = sparks[i]
        sp.k.value = py / 3.6
        sp.mesh.visible = py > 0.01
        if (sp.mesh.visible) sp.mesh.position.copy(neon.curves[i].getPointAt(px, sparkP))
        for (const n of neon.parts[i]) {
          n.root.visible = on > 0 && draws[i] > 0
          n.on.value = on
          n.draw.value = draws[i]
          n.pulse.value.set(px, py)
          n.k.main.tube = 3.0
          n.k.main.glow = 0.55
          n.k.trans.tube = 3.0
          n.k.trans.glow = 0.78
        }
        for (const n of neonRefl.parts[i]) {
          n.root.visible = on > 0 && draws[i] > 0
          n.on.value = on * reflK
          n.draw.value = draws[i]
          n.pulse.value.set(px, py * 0.6)
          n.k.main.tube = 0.9
          n.k.main.glow = 0.3
          n.k.trans.tube = 0
          n.k.trans.glow = 0
        }
      }

      // ================= the sketch plane: the point, the listen rings, the construction drawing
      const su = sketch.u
      const breath = 1 + 0.12 * Math.sin(t * 1.1) * idle
      su.uDot.value = lerp(0.45, 1, smoothstep(0.0, 0.07, local)) * (1 - smoothstep(0.08, 0.118, local)) * breath
      su.uRings.value = window01(local, RINGS[0], RINGS[1], 0.035)
      su.uRingPhase.value = local * 2.4 + t * 0.1 * idle
      su.uRingMax.value = 0.95
      const g = window01(local, GUIDES[0], GUIDES[1], 0.032)
      su.uGrid.value = g
      su.uGridR.value = lerp(0.05, 1.0, ease.outCubic(segment(local, 0.268, 0.345)))
      su.uAxes.value.set(g, sm(local, 0.27, 0.33))
      su.uFrame.value.set(g, sm(local, 0.278, 0.33))
      su.uCircles.value.set(g, sm(local, 0.284, 0.35))
      su.uTangents.value.set(g, sm(local, 0.294, 0.36))
      su.uK.value = 1
      const sketchOn = local < GUIDES[1] + 0.005
      sketch.mesh.visible = sketchOn
      sketch.mirror.visible = sketchOn
      sketch.mirror.material.uniforms.uK.value = 0.4 * reflK

      // ================= the room
      // the backlight: bright in the glass buffer (the frost glows), faint in the frame
      const camToMark = tmpC.copy(pos).negate().normalize()
      card.mesh.position.copy(camToMark).multiplyScalar(1.7)
      tmpM.lookAt(pos, card.mesh.position, UP)
      card.mesh.quaternion.setFromRotationMatrix(tmpM)
      const cardSize = MARK_S * 5.2
      card.mesh.scale.set(cardSize, cardSize, 1)
      const cu = card.mesh.material.uniforms
      cu.uHalf.value = cardSize / 2
      cu.uCore.value = 0.62
      cu.uWideR.value = 1.6
      card.k.trans.glow = 0.19 * lit
      card.k.trans.wide = 0.055 * lit
      card.k.main.glow = 0.035 * lit
      card.k.main.wide = 0
      card.mesh.visible = lit > 0.001

      floor.material.uniforms.uK.value = 0.012 + 0.012 * proto + 0.028 * lit
      reflection.material.uniforms.uStrength.value = 0.2 * lit * (portrait ? 0.35 : 1)
      reflection.material.uniforms.uFade.value = portrait ? 4 : 1.6

      // ---- world: black; a backlight halo behind the mark — faint and warm while only
      // the diamond exists, the frost's broad white-cool glow once the glass is there
      const wp = ctx.world.params
      wp.top = '#020203'
      wp.bottom = '#000000'
      const w = tmpC.set(0, 0, 0).sub(pos)
      const depth = Math.max(0.1, w.dot(tmpF))
      const ndcX = w.dot(tmpR) / (depth * tanV * aspect)
      const ndcY = w.dot(tmpU) / (depth * tanV)
      wp.focus.set(ndcX * aspect, ndcY)
      const markH = MARK_S / (depth * tanV * 2)
      wp.halo = lerp(0.1, 0.22, proto) + 0.5 * lit
      wp.haloSize = clamp(markH * lerp(0.7, 1.15, Math.max(proto * 0.6, lit)), 0.35, 2)
      haloCol.copy(NEON_C).lerp(ICE, lerp(0.55, 1, Math.max(proto, lit)))
      wp.haloColor = haloCol
      wp.slits = 0
      wp.slitAngle = 0
      wp.env = 1
      wp.envTurn = -0.3 + 0.6 * turnE + 0.25 * sm(local, 0.44, 0.6)
      wp.key = lerp(0.1, 0.6, lit)
      wp.keyDir.set(-0.45, 0.8, 0.5)
      wp.fill = 0.04

      // ---- post: bloom only on true highlights (the tubes, the print head)
      const pp = ctx.post.params
      pp.bloomStrength = 0.24
      pp.bloomRadius = 0.28
      pp.bloomThreshold = 1.5
      pp.vignette = 0.62
      pp.grain = 0.016

      // ================= DOM
      reveal(headEl, window01(local, HEAD[0], HEAD[1], 0.03), 0)
      setRise(headline, local > HEAD[0] + 0.005 && local < HEAD[1] - 0.01)
      const cardV = window01(local, CARD[0], CARD[1], 0.018)
      reveal(cardEl, cardV, 0)
      const inSteps = local >= A && local <= B
      const idx = clamp(Math.floor((local - A) / S), 0, 3)
      const phase = clamp((local - A - idx * S) / S)
      const cur = local > CARD[0] && local < CARD[1] ? idx : -1
      if (cur !== shown) {
        shown = cur
        stepEls.forEach((s, i) => s.classList.toggle('is-on', i === cur))
        segs.forEach((s, i) => {
          s.classList.toggle('is-on', i === cur)
          s.classList.toggle('is-done', cur >= 0 && i < cur)
        })
      }
      for (let i = 0; i < stepTitles.length; i++) setRise(stepTitles[i], i === cur && cardV > 0.05)
      for (let i = 0; i < 4; i++) {
        const f = i < idx ? 1 : i === idx ? (inSteps ? ease.outCubic(clamp(phase / 0.7)) : local > B ? 1 : 0) : 0
        const q = Math.round(f * 1000)
        if (fillCache[i] !== q) {
          fillCache[i] = q
          fills[i].style.transform = `scaleX(${(q / 1000).toFixed(3)})`
        }
      }
    },

    camera(_local: number, frame: Frame, out: CameraPose) {
      out.position.copy(pos)
      out.target.copy(tgt)
      out.fov = fov
      out.roll = 0
      out.parallax = frame.reducedMotion ? 0 : 0.14
    },
  }
}
