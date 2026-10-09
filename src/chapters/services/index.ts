import * as THREE from 'three'
import type { CameraPose, Chapter, ChapterContext, Frame } from '../../core/types'
import { clamp, damp, lerp, smoothstep } from '../../core/math'
import { nextFrame } from '../../core/yield'
import { N, TILE_H, TILE_W, buildDeck, type Deck } from './deck'
import { Hud, type HudMetrics } from './hud'
import { G } from '../../kit/glass'
import { A, B, CARD_IN, CARD_OUT, INTRO_IN, LENGTH, LOUVRE_IN_AT, LOUVRE_IN_LEN, at } from './timeline'
import { SERVICES, serviceUrl } from '../../content'
import './services.css'

/*
 * SERVICES — "Etched".
 *
 * Eleven thick sandblasted glass plates hang as a column of louvres in a
 * black gallery; each carries its service in REVERSE ETCHING (the icon, the
 * number and the name are clear lines in the frosted face, backlit, razor
 * sharp). Scroll runs the column slowly upward: the plate in view slides
 * forward out of the louvres and turns to face you, its frost thaws a touch
 * and its backlight swells; its neighbours part, the rest fade into black.
 *
 * The timeline lives in ./timeline.ts (in vh of scroll; chapters/index.ts
 * reads the chapter's length and landing from it too):
 *
 *   0.000–0.205  intro (0.9 vh): the hero's segue clears (src/core/post.ts);
 *                the louvres open out of hairlines, the whole column hangs in
 *                its backlight, the camera drifts in. "Whatever it takes."
 *                rises at 0.068 and holds to 0.217 (landing 0.15)
 *   0.205–0.930  the plates (~0.066 each with eleven): part → turn → settle → hold
 *   0.930–1.000  the last plate returns; the louvres close to hairlines of
 *                light and the camera pulls back into black
 *
 * While the segue plays, update() reports where the column sits on screen
 * (post.aim), so the blinds' hairlines and the neon line can hand over to it.
 *
 * Everything derives from `local`; frame.time only drives idle sway and a
 * slow drift of the studio light. Two things are damped over time so fast
 * scrolling can't strobe: the backlight swell and the light sweep.
 */

const SPAN = (B - A) / N
/** half-width (in beats) of each turn, centred on the boundary between two plates */
const TURN = 0.3
const ANCHORS = Array.from({ length: N }, (_, i) => A + SPAN * (i + 0.55))
/** local progress that was `l` in the old 3.8 vh chapter, measured from plate 1 (A) */
const fromA = (l: number) => A + ((l - 0.08) * 3.8) / LENGTH
/** …and from the last plate (B) */
const fromB = (l: number) => B + ((l - 0.92) * 3.8) / LENGTH

/** louvre spacing, extra parting around the plate in view, how far it slides forward */
const SP = 0.5
const PART = 0.56
const FWD = 0.62
/** louvre tilt at rest (radians from facing the camera); hairline = π/2 */
const LOUVRE = 1.3
const HAIR = Math.PI / 2 - 0.02
/** the column's three-quarter yaw */
const YAW = -0.34
const ENV_REST = 1.8

/** a long, front-loaded glide with a soft start and a settled finish */
const glide = (t: number) => {
  const x = Math.pow(clamp(t), 0.72)
  return x * x * (3 - 2 * x)
}
/** 0 → 1 → 0 bump over x ∈ [-1, 1] */
const bump = (x: number) => {
  const a = clamp(1 - x * x)
  return a * a
}

/** Continuous plate index (0..N-1): holds mid-beat, turns across the boundaries. */
function plateAt(local: number) {
  const u = (local - A) / SPAN
  let f = 0
  let turning = 0
  for (let j = 1; j < N; j++) {
    f += glide((u - (j - TURN)) / (2 * TURN))
    turning = Math.max(turning, bump((u - j) / TURN))
  }
  return { f, u, turning }
}

/** the plates' colours: the three neon lights in turn */
const PLATE_HEX = [G.neonA, G.neonB, G.neonC]
const PLATE_COL = PLATE_HEX.map(h => new THREE.Color(h))
const WHITE = new THREE.Color(1, 1, 1)
const ICE = new THREE.Color(G.ice)

export default function create(): Chapter {
  const group = new THREE.Group()
  let deck: Deck
  let stageEl: HTMLElement
  let accentFor = -1
  const litCol = new THREE.Color()
  const haloCol = new THREE.Color()
  let hud: Hud
  let canvas: HTMLCanvasElement | null = null
  let active = false
  let mobile = false
  let lastLocal = 0
  let snap = true
  let calm = 1
  let swell = 0

  // the pose is computed in update() (so the world halo can sit behind the plate) and copied in camera()
  const pose = { pos: new THREE.Vector3(0, 0.4, 9), target: new THREE.Vector3(), fov: 30 }
  const probe = new THREE.PerspectiveCamera()
  const pv = new THREE.Vector3()
  const dir = new THREE.Vector3()
  const subject = new THREE.Vector3()
  const box: THREE.Vector3[] = Array.from({ length: 8 }, () => new THREE.Vector3())
  const raycaster = new THREE.Raycaster()
  const ndc = new THREE.Vector2()
  let lastHoverX = 9
  let lastHoverY = 9
  /** the plate under the pointer (desktop), and each plate's Learn More hover glow */
  let hoverPlate = -1
  const btnHover = new Float32Array(N)
  /** where the plate in view sits on screen (world-field units: x = ndc.x·aspect) */
  const slot = { x: 0.3, y: 0, ok: false }

  function aim(c: THREE.Vector3, d: number, elev: number, ax: number, ay: number, tv: number, th: number) {
    pose.pos.set(c.x, c.y + d * Math.sin(elev), c.z + d * Math.cos(elev))
    // aim off-centre so the subject c lands at (ax, ay) on screen
    const s = ax * th * d
    const v = ay * tv * d
    pose.target.set(c.x - s, c.y - v * Math.cos(elev), c.z + v * Math.sin(elev))
  }

  /**
   * Frame a box (centre c, half extents hw/hh/hd) into the space the copy
   * leaves free, then find where the plate slot and the backlight land.
   */
  function computePose(frame: Frame, m: HudMetrics, c: THREE.Vector3, hw: number, hh: number, hd: number, bias: number, push: number, lightY: number) {
    const W = Math.max(1, frame.width)
    const H = Math.max(1, frame.height)
    const aspect = W / H
    const portrait = H > W
    const fov = portrait ? 34 : 28
    const tv = Math.tan(THREE.MathUtils.degToRad(fov / 2))
    const th = tv * aspect
    const gutter = m.valid ? m.gutter : 24
    const safeTop = m.valid ? m.safeTop : H * 0.11
    const safeBottom = m.valid ? m.safeBottom : H * 0.11
    let x0: number, x1: number, y0: number, y1: number
    if (portrait) {
      x0 = gutter
      x1 = W - gutter
      y0 = safeTop + 2
      const copyTop = m.valid ? Math.min(m.cardTop, m.introTop || m.cardTop) : H * 0.55
      y1 = copyTop - 12
    } else {
      x0 = (m.valid ? m.colRight : W * 0.36) + 36
      x1 = W - gutter * 1.2
      y0 = safeTop + 4
      y1 = H - safeBottom - 4
    }
    const fill = portrait ? 0.98 : 0.92
    const cx = (x0 + x1) / W - 1
    const cyN = 1 - (y0 + y1) / H
    const hwN = Math.max(0.15, ((x1 - x0) / W) * fill)
    const hhN = Math.max(0.12, ((y1 - y0) / H) * fill)
    const elev = portrait ? 0.06 : 0.075

    // the box corners
    let k = 0
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) box[k++].set(c.x + sx * hw, c.y + sy * hh, c.z + sz * hd)

    let d = Math.max(hw / (th * hwN), hh / (tv * hhN)) + hd
    let ax = cx
    let ay = cyN + bias * hhN
    probe.fov = fov
    probe.aspect = aspect
    probe.updateProjectionMatrix()
    for (let it = 0; it < 3; it++) {
      aim(c, d, elev, ax, ay, tv, th)
      probe.position.copy(pose.pos)
      probe.lookAt(pose.target)
      probe.updateMatrixWorld()
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
      for (const b of box) {
        pv.copy(b).project(probe)
        if (pv.x < minX) minX = pv.x
        if (pv.x > maxX) maxX = pv.x
        if (pv.y < minY) minY = pv.y
        if (pv.y > maxY) maxY = pv.y
      }
      if (!Number.isFinite(minX + maxX + minY + maxY)) break
      const kk = Math.max((maxX - minX) / (2 * hwN), (maxY - minY) / (2 * hhN))
      ax -= (minX + maxX) / 2 - cx
      ay -= (minY + maxY) / 2 - (cyN + bias * hhN)
      d *= clamp(kk, 0.5, 2)
    }
    d *= push
    aim(c, d, elev, ax, ay, tv, th)
    pose.fov = fov

    probe.position.copy(pose.pos)
    probe.lookAt(pose.target)
    probe.updateMatrixWorld()
    pv.set(c.x, lightY, -0.9).project(probe)
    if (Number.isFinite(pv.x + pv.y)) {
      slot.x = pv.x * aspect
      slot.y = pv.y
      slot.ok = true
    }
  }

  return {
    id: 'services',
    group,
    anchors: ANCHORS,

    async init(ctx: ChapterContext) {
      mobile = ctx.mobile
      deck = buildDeck(ctx.mobile, ctx.world.envMap)
      group.add(deck.column, deck.back)
      // colour: each plate is lit by one of the three neon lights in turn — the light
      // bleeding into its frost takes the colour, its etched lines a tint of it
      stageEl = ctx.stage
      for (const p of deck.plates) {
        const c = PLATE_COL[p.index % 3]
        ;(p.glowMat.uniforms.uColor.value as THREE.Color).copy(c)
        ;(p.faceMat.uniforms.uColor.value as THREE.Color).copy(WHITE).lerp(c, 0.5)
      }
      await nextFrame()
      hud = new Hud(ctx.stage, k => window.__hark?.land('services', true, ANCHORS[k]))

      // click a plate to open its service page (click, not pointerdown: touch scrolls must not
      // jump); cmd / ctrl / middle-click opens it in a new tab
      canvas = ctx.renderer.domElement
      const open = (e: MouseEvent) => {
        if (!active || !canvas || lastLocal < A - at(0.076) || lastLocal > CARD_OUT) return
        const r = canvas.getBoundingClientRect()
        ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
        const k = pick(ctx)
        const svc = k >= 0 ? SERVICES[k] : undefined
        if (!svc) return
        const url = serviceUrl(svc.slug)
        if (e.metaKey || e.ctrlKey || e.button === 1) window.open(url, '_blank', 'noopener')
        else window.location.href = url
      }
      canvas.addEventListener('click', open)
      canvas.addEventListener('auxclick', e => e.button === 1 && open(e))
    },

    onEnter() {
      active = true
      snap = true
    },
    onLeave() {
      active = false
      hoverPlate = -1
      if (canvas) canvas.style.cursor = ''
    },

    update(local, frame, ctx) {
      const w = ctx.world.params
      const post = ctx.post.params
      const rm = frame.reducedMotion
      // calm: reduced motion or Motion off — no sway, no time-driven drift
      const still = rm || ctx.reducedMotion || !!frame.still
      const t = frame.time
      const dt = frame.dt
      if (Math.abs(local - lastLocal) > at(0.15)) snap = true
      lastLocal = local

      const { f, u, turning } = plateAt(local)
      // presenting: the plate in view is out of the louvres
      const open = glide(u / 0.32) * (1 - glide((u - 10.72) / 0.3))
      // the louvres: hairlines → open (intro, as the segue clears) … open → hairlines (out beat)
      const louvreIn = glide((local - LOUVRE_IN_AT) / LOUVRE_IN_LEN)
      const louvreOut = glide((local - fromB(0.915)) / at(0.266))
      const tilt = lerp(HAIR, LOUVRE, louvreIn * (1 - louvreOut))
      // camera: the whole column (intro / out) ↔ the plate in view
      const near = glide((local - fromA(0.064)) / at(0.198)) * (1 - glide((local - fromB(0.905)) / at(0.304)))
      // speed calm: 1 at reading pace, 0 when scrubbing fast
      const calmV = 1 - smoothstep(0.5, 1.2, Math.abs(frame.velocity))
      calm = snap ? calmV : damp(calm, calmV, calmV < calm ? 10 : 2.5, dt)

      // ---------- the column
      const idle = still ? 0 : 1
      // (the column turns a touch along the plates: the same yaw per plate as before the longer intro)
      const yaw = YAW + 0.1 * (0.08 + ((local - A) * LENGTH) / 3.8) + idle * 0.012 * Math.sin(t * 0.21)
      deck.column.rotation.y = yaw
      deck.column.position.y = idle * 0.012 * Math.sin(t * 0.37)
      const vis = mobile ? 3.3 : 4.6
      // how far the plate in view has slid out of the louvres (0..1)
      let lead = 0
      for (const p of deck.plates) {
        const i = p.index
        const d = i - f
        const ad = Math.abs(d)
        const sel = open * (1 - smoothstep(0, 1, ad))
        lead = Math.max(lead, sel)
        const sgn = d < 0 ? -1 : d > 0 ? 1 : 0
        const far = smoothstep(1.2, 4.4, ad)
        const y = -d * SP - PART * open * sgn * smoothstep(0, 1, ad)
        const z = FWD * sel - 0.9 * far * near
        p.holder.position.set(0, y, z)
        p.holder.rotation.x = -tilt * (1 - sel)
        p.holder.rotation.y = -yaw * sel
        // far plates are off-screen once the camera is in close: skip them (transmission is costly)
        p.holder.visible = near < 0.98 || ad < vis

        // the glass: frosted louvres, the plate in view thaws a touch; far ones fade into black
        const dim = 1 - 0.82 * far * near
        p.caps.roughness = lerp(0.52, 0.36, sel)
        p.caps.color.setScalar(dim)
        p.caps.envMapIntensity = lerp(0.5, 0.85, sel) * dim
        p.sides.envMapIntensity = lerp(2.2, 4.2, sel) * dim
        p.sides.color.setScalar(lerp(0.75, 1, sel) * dim)

        // the etching: razor lines on the face, light bleeding into the frost behind them
        const faceB = lerp(0.14 * louvreIn * (1 - louvreOut), mobile ? 1.35 : 1.6, sel * sel) * dim
        p.faceMat.uniforms.uBright.value = faceB
        // the Learn More pill: lit on the plate in view, brighter while the pointer is on the plate
        btnHover[i] = damp(btnHover[i], i === hoverPlate ? 1 : 0, 8, dt)
        ;(p.faceMat.uniforms.uBtn.value as THREE.Vector2).set(lerp(0.03 * louvreIn * (1 - louvreOut), mobile ? 0.8 : 0.72, sel * sel) * dim, btnHover[i])
        p.glowMat.uniforms.uBright.value = lerp(0.08, 0.24, sel) * dim
        // a light band crosses the etched lines once as the plate settles (gone by the anchor)
        const s = clamp((u - i - 0.1) / 0.38)
        p.faceMat.uniforms.uSweep.value = lerp(-1.6, 1.6, s)
        p.faceMat.uniforms.uSweepAmt.value = (rm ? 0.4 : 1.1) * sel * calm * (s > 0 && s < 1 ? 1 : 0)
      }

      // ---------- framing: the column (intro / out) ↔ the plate in view
      const m = hud.metrics()
      const colCY = -((N - 1) / 2 - f) * SP
      const cy = lerp(colCY, 0, near)
      // (portrait: frame the plate in view itself, its neighbours cropped at the edges, so it
      // fills the width above the card; landscape keeps a neighbour either side in frame)
      const tall = frame.height > frame.width
      const hw = lerp(TILE_W * 0.52, TILE_W * (tall ? 0.53 : 0.56), near)
      const hh = lerp(((N - 1) / 2) * SP + 0.3, tall ? TILE_H / 2 + 0.14 : TILE_H / 2 + SP + PART * 0.55, near)
      const hd = lerp(0.35, 0.45, near)
      // (portrait: the plate in view slides out along the column's yawed z, which carries it
      // sideways off the column's axis: centre the box on it, so it sits mid-screen)
      subject.set(tall ? FWD * lead * near * Math.sin(yaw) : 0, cy, 0)
      // at the ends of the column, frame the plate a little off-centre toward the empty end
      const bias = tall ? 0 : near * 0.16 * (1 - 2 * clamp(f / (N - 1)))
      // (the camera drifts in through the intro beat, in place before plate 1 parts)
      const push = 1 + 0.07 * (1 - glide(local / (A - at(0.08)))) - 0.05 * louvreOut
      computePose(frame, m, subject, hw, hh, hd, bias, push, lerp(colCY, 0, open))

      // ---------- the segue's hand-over (src/core/post.ts): while it plays, tell post where
      // the column sits on screen (uv, y up: its width, the bottom plate, the top plate's
      // hairline), so the blinds' hairlines and the neon line can land on it
      if (local < at(0.6)) {
        deck.column.updateMatrixWorld(true)
        let x0 = Infinity
        let x1 = -Infinity
        let yTop = 0
        let yBot = 0
        for (const k of [0, N - 1]) {
          for (const sx of [-1, 1]) {
            pv.set(sx * TILE_W * 0.5, 0, 0).applyMatrix4(deck.plates[k].holder.matrixWorld).project(probe)
            x0 = Math.min(x0, pv.x)
            x1 = Math.max(x1, pv.x)
            if (k === 0) yTop += pv.y / 2
            else yBot += pv.y / 2
          }
        }
        if (Number.isFinite(x0 + x1 + yTop + yBot)) ctx.post.aim.set(x0 * 0.5 + 0.5, yBot * 0.5 + 0.5, x1 * 0.5 + 0.5, yTop * 0.5 + 0.5)
      }

      // ---------- the backlight: tall behind the whole column → a softbox behind the plate in view
      const target = 1 - 0.3 * turning * calm
      swell = snap ? target : damp(swell, target, 3, dt)
      // the backlight breathes, very slowly (idle only)
      const breathe = 1 + idle * 0.035 * Math.sin(t * 0.55)
      const bu = deck.backMat.uniforms
      // the softbox takes the colour of the plate in view (blending as the next turns in);
      // the whole column's light slit (intro / out) stays mostly white
      const i0 = clamp(Math.floor(f), 0, N - 1)
      const i1 = clamp(i0 + 1, 0, N - 1)
      litCol.copy(PLATE_COL[i0 % 3]).lerp(PLATE_COL[i1 % 3], f - Math.floor(f))
      ;(bu.uColor.value as THREE.Color).copy(WHITE).lerp(litCol, 0.25 + 0.6 * open)
      const colHalf = ((N - 1) / 2) * SP + 0.3
      // a light slit behind the whole column → a plate-sized softbox behind the plate in view
      const lit = 0.3 * swell * breathe * (0.3 + 0.7 * louvreIn) * (1 - 0.7 * louvreOut)
      bu.uStrength.value = lit
      ;(bu.uHalf.value as THREE.Vector2).set(lerp(0.42, TILE_W * 0.44, open), lerp(colHalf, TILE_H * 0.4, open))
      bu.uSoft.value = lerp(0.4, 0.2, open)
      bu.uTail.value = lerp(2.2, 1.3, open)
      bu.uTailAmt.value = lerp(0.12, 0.05, open)
      ;(bu.uHot.value as THREE.Vector2).set(0.35 * open, 0.45 * open)
      // (behind the box's centre: in portrait that is the plate in view, off the column's axis)
      deck.back.position.set(subject.x, lerp(colCY, 0, open), -0.95)
      deck.back.lookAt(pose.pos.x, pose.pos.y, pose.pos.z)

      // ---------- world: the halo behind the plate, the light sweep on the bevels
      dir.copy(pose.target).sub(pose.pos).normalize()
      const cyaw = Math.atan2(dir.x, -dir.z)
      const pitch = Math.asin(clamp(dir.y, -1, 1))
      w.top = '#030304'
      w.bottom = '#000000'
      w.haloColor = haloCol.copy(ICE).lerp(litCol, 0.15 + 0.4 * open)
      if (slot.ok) w.focus.set(slot.x + Math.sin(cyaw) * 0.25, slot.y + pitch * 0.2)
      w.halo = (0.4 + 0.3 * open * swell) * (1 - 0.6 * louvreOut)
      w.haloSize = lerp(1.3, 1.0, open)
      // no vertical light slits on the back wall here (Mike, 2026-10-02)
      w.slits = 0
      // the light sweep: while a plate turns in, the studio swings away and back
      // (sin(π·frac) is 0 at every rest) so the strips run along its bevels
      const sweep = Math.sin(Math.PI * (f - Math.floor(f)))
      const envTurn = ENV_REST - 0.9 * sweep * calm + idle * 0.05 * Math.sin(t * 0.17) - 0.5 * louvreOut
      w.envTurn = envTurn
      w.env = 1
      w.keyDir.set(-0.45, 0.8, 0.5)
      // no key light: on a polish this smooth its highlight is a sub-pixel HDR
      // line that beads under bloom; the (prefiltered) studio strips carry the edges
      w.key = 0
      w.fill = 0.05
      for (const p of deck.plates) {
        p.caps.envMapRotation.y = envTurn
        p.sides.envMapRotation.y = envTurn
      }
      snap = false

      // ---------- post: deep vignette, bloom only on the brightest etched lines.
      // Measured: with a plate presented, bloom is the soft neon bleed around
      // the etched icon and the glint on the lit bevels (up to 137/255 on/off);
      // with the column at rest (intro, landing, out) nothing crosses the
      // threshold (max 1/255), so the pass is switched off there.
      post.bloomStrength = 0.26 * smoothstep(0.05, 0.5, open)
      post.bloomRadius = 0.3
      post.bloomThreshold = 1.05
      post.vignette = 0.58

      // ---------- copy
      const introOn = local >= INTRO_IN && local < CARD_IN
      const shown = local >= CARD_IN && local < CARD_OUT ? Math.max(0, Math.min(N - 1, Math.round(f))) : -1
      hud.update(introOn, shown, shown)
      // the card's accents (the lit key, the arrow) follow the plate's colour
      if (shown >= 0 && shown !== accentFor) {
        accentFor = shown
        stageEl.style.setProperty('--et-neon', PLATE_HEX[shown % 3])
      }

      // ---------- hover: a pointer over a plate (desktop)
      if (active && !mobile && canvas) {
        const px = frame.pointerRaw.x
        const py = frame.pointerRaw.y
        if (px !== lastHoverX || py !== lastHoverY) {
          lastHoverX = px
          lastHoverY = py
          ndc.set(px, py)
          const k = local > A - at(0.076) && local < CARD_OUT ? pick(ctx) : -1
          canvas.style.cursor = k >= 0 ? 'pointer' : ''
          hoverPlate = k
        }
      }
    },

    camera(_local, frame, out: CameraPose) {
      out.position.copy(pose.pos)
      out.target.copy(pose.target)
      out.fov = pose.fov
      out.roll = 0
      out.parallax = frame.mobile || frame.reducedMotion || frame.still ? 0 : 0.18
    },
  }

  /** plate under `ndc`, or -1 */
  function pick(ctx: ChapterContext): number {
    raycaster.setFromCamera(ndc, ctx.camera)
    const hits = raycaster.intersectObjects(
      deck.plates.filter(p => p.holder.visible).map(p => p.mesh),
      false,
    )
    if (!hits.length) return -1
    const k = hits[0].object.userData.plate
    return typeof k === 'number' ? k : -1
  }
}
