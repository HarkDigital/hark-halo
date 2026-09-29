import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import type { Frame } from '../core/types'
import { World } from '../world/World'
import { G, closedOutline, neonPath, type NeonPath } from '../kit/glass'
import { buildDeck, TILE_H, TILE_W } from '../chapters/services/deck'

/*
 * The service page's hero art: the service's own etched plate from the
 * Services chapter (the same glass, the same etching), alone in the black
 * studio, backlit by its softbox and HALO-LIT: two neon loops the shape of
 * the plate hang behind it — the inner one in the service's own light, a
 * larger, deeper one in the next — with sparks running round them. It
 * answers the pointer: the plate turns toward it, the loops slide behind it
 * (depth), and the sparks quicken and brighten while the pointer is over the
 * hero. The etched lines catch one light sweep as the page opens.
 *
 * A small standalone renderer (no scroll engine): scene → bloom → output,
 * drawn only while the hero is on screen and the tab is visible. Reduced
 * motion: no sway, no sweep, the neon fades up instead of striking.
 */

export interface HeroHandle {
  dispose(): void
}

/** where the plate sits: centre (NDC) and how much of the frame it may fill */
const FIT = {
  // (the halo's outer loop reaches ~1.45x the plate: leave it room, clear of the copy)
  land: { sx: 0.5, sy: 0.04, hf: 0.4, wf: 0.28 },
  port: { sx: 0, sy: 0.38, hf: 0.24, wf: 0.54 },
}
const FOV = 30
const TAN = Math.tan(THREE.MathUtils.degToRad(FOV / 2))
/** the studio's rest angle (the Services chapter's) */
const ENV_REST = 1.8

export function mountHero(canvas: HTMLCanvasElement, index: number, o: { reduced: boolean; mobile: boolean }): HeroHandle {
  const { reduced, mobile } = o
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' })
  renderer.setClearColor(0x000000, 1)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NeutralToneMapping
  renderer.toneMappingExposure = 1
  const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.75 : 2)
  renderer.setPixelRatio(dpr)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 2000)
  const world = new World(scene, mobile, renderer)
  scene.add(world.object)

  // ---- the plate (the Services chapter's deck; only this service's plate joins the scene)
  const deck = buildDeck(mobile, world.envMap)
  const plate = deck.plates[index]
  const holder = new THREE.Group()
  holder.add(plate.holder)
  plate.holder.position.set(0, 0, 0)
  plate.holder.rotation.set(0, 0, 0)
  scene.add(holder, deck.back)
  plate.caps.roughness = 0.36
  plate.caps.envMapIntensity = 0.85
  plate.sides.envMapIntensity = 4.2
  plate.glowMat.uniforms.uBright.value = 0.24
  const bu = deck.backMat.uniforms
  ;(bu.uHalf.value as THREE.Vector2).set(TILE_W * 0.44, TILE_H * 0.4)
  bu.uSoft.value = 0.2
  bu.uTail.value = 1.3
  bu.uTailAmt.value = 0.05
  ;(bu.uHot.value as THREE.Vector2).set(0.35, 0.45)
  deck.back.position.set(0, 0, -0.95)

  // ---- post: the frame renders into a multisampled HDR target, then bloom + output
  const size = new THREE.Vector2(1, 1)
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: dpr >= 2 ? 2 : 4 })
  const composer = new EffectComposer(renderer, target)
  composer.addPass(new RenderPass(scene, camera))
  const bloom = new UnrealBloomPass(size, 0.26, 0.3, 1.05)
  composer.addPass(bloom)
  composer.addPass(new OutputPass())
  const isFrame = (rt: THREE.WebGLRenderTarget | null) => rt === null || rt === composer.renderTarget1 || rt === composer.renderTarget2

  // ---- the halo: two neon loops the plate's shape, behind it (inner: the service's light)
  const lights = [G.neonA, G.neonB, G.neonC]
  const loopPts = (w: number, h: number, r: number, z: number) => {
    const sh = new THREE.Shape()
    const x = -w / 2
    const y = -h / 2
    sh.moveTo(x + r, y)
    sh.lineTo(x + w - r, y)
    sh.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false)
    sh.lineTo(x + w, y + h - r)
    sh.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false)
    sh.lineTo(x + r, y + h)
    sh.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false)
    sh.lineTo(x, y + r)
    sh.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false)
    return closedOutline(sh, 0.012).map(p => new THREE.Vector3(p.x, p.y, z))
  }
  const halo = new THREE.Group()
  scene.add(halo)
  const loops: { t: NeonPath; z: number; dir: number }[] = [
    { w: TILE_W * 1.16, h: TILE_H * 1.26, r: 0.2, z: -0.34, color: lights[index % 3], dir: 1 },
    { w: TILE_W * 1.42, h: TILE_H * 1.62, r: 0.3, z: -0.78, color: lights[(index + 1) % 3], dir: -1 },
  ].map(l => {
    const pts = loopPts(l.w, l.h, l.r, 0)
    const t = neonPath({ points: pts, closed: true, color: l.color, radius: 0.011, glowRadius: 0.07, segments: pts.length * 2, isFrameTarget: isFrame })
    t.root.position.z = l.z
    t.on.value = 0
    halo.add(t.root)
    return { t, z: l.z, dir: l.dir }
  })

  // ---- framing
  let W = 1
  let H = 1
  const fit = { sx: 0, sy: 0, d: 5 }
  const resize = () => {
    const r = canvas.getBoundingClientRect()
    W = Math.max(1, Math.round(r.width))
    H = Math.max(1, Math.round(r.height))
    renderer.setSize(W, H, false)
    composer.setSize(W, H)
    size.set(W, H)
    camera.aspect = W / H
    camera.updateProjectionMatrix()
    const f = W > H * 1.05 ? FIT.land : FIT.port
    fit.sx = f.sx
    fit.sy = f.sy
    fit.d = Math.max(TILE_H / (f.hf * 2 * TAN), TILE_W / (f.wf * 2 * TAN * camera.aspect))
    wake()
  }

  // ---- clocks + pointer
  const start = performance.now()
  let last = start
  let time = 0
  const pointer = new THREE.Vector2()
  const pointerTo = new THREE.Vector2()
  let hovering = false
  let hoverK = 0
  const spark = [0.1, 0.6]
  const onPointer = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect()
    hovering = e.pointerType === 'mouse' && e.clientY >= r.top && e.clientY <= r.bottom && e.clientX >= r.left && e.clientX <= r.right
    // relative to the plate's side of the hero when hovering; a gentle whole-window drift otherwise
    const cx = r.left + r.width * (0.5 + fit.sx / 2)
    const cy = r.top + r.height * (0.5 - fit.sy / 2)
    const nx = (e.clientX - cx) / (r.width * 0.35)
    const ny = -(e.clientY - cy) / (r.height * 0.45)
    const k = hovering ? 1 : 0.35
    pointerTo.set(Math.max(-1, Math.min(1, nx)) * k, Math.max(-1, Math.min(1, ny)) * k)
    wake()
  }
  const onLeave = () => {
    hovering = false
    pointerTo.set(0, 0)
    wake()
  }
  document.addEventListener('pointerleave', onLeave)
  if (!reduced) window.addEventListener('pointermove', onPointer, { passive: true })

  const frame: Frame = {
    time: 0,
    dt: 0,
    progress: 0,
    velocity: 0,
    pointer,
    pointerRaw: pointerTo,
    width: 1,
    height: 1,
    mobile,
    reducedMotion: reduced,
    still: reduced,
  }

  /** a neon tube strikes: one stutter, then it holds (a fade under reduced motion) */
  const strike = (since: number, t0: number) => {
    const x = since - t0
    if (x <= 0) return 0
    if (reduced) return Math.min(1, x / 0.6)
    if (x < 0.06) return 0.75
    if (x < 0.15) return 0.22
    return 0.55 + 0.45 * Math.min(1, (x - 0.15) / 0.4)
  }

  const pos = new THREE.Vector3()
  const tgt = new THREE.Vector3()
  const tmp = new THREE.Vector3()
  let raf = 0
  let visible = true
  let settled = false

  const draw = () => {
    raf = 0
    const now = performance.now()
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    const since = (now - start) / 1000
    if (!reduced) time += dt
    pointer.lerp(pointerTo, 1 - Math.exp(-3 * dt))

    // camera: straight on, shifted so the plate sits where the copy leaves room
    const d = fit.d
    const shiftX = -fit.sx * d * TAN * camera.aspect
    const shiftY = -fit.sy * d * TAN
    const px = reduced ? 0 : pointer.x * 0.05
    const py = reduced ? 0 : pointer.y * 0.03
    pos.set(shiftX + px, shiftY + py, d)
    tgt.set(shiftX, shiftY, 0)
    camera.position.copy(pos)
    camera.lookAt(tgt)

    // the plate: a slight three-quarter, turning a little in the light — and toward the pointer
    const sway = reduced ? 0 : Math.sin(time * 0.35) * 0.07 * (1 - hoverK)
    const tiltX = reduced ? 0 : -pointer.y * 0.22
    const tiltY = reduced ? 0 : pointer.x * 0.32
    holder.rotation.set(0.05 + (reduced ? 0 : Math.sin(time * 0.23) * 0.015) + tiltX, -0.2 + sway + tiltY, 0)
    halo.position.copy(holder.position)
    holder.position.y = reduced ? 0 : Math.sin(time * 0.5) * 0.012
    deck.back.lookAt(camera.position)

    // the page opens: the softbox fades up, the neon strikes, one light sweep crosses the etching
    const up = Math.min(1, since / 0.9)
    const lit = up * up * (3 - 2 * up)
    bu.uStrength.value = 0.3 * lit * (1 + (reduced ? 0 : 0.035 * Math.sin(time * 0.55)))
    plate.faceMat.uniforms.uBright.value = (mobile ? 1.35 : 1.6) * lit
    const s = Math.min(1, Math.max(0, (since - 0.5) / 1.4))
    plate.faceMat.uniforms.uSweep.value = -1.6 + 3.2 * s
    plate.faceMat.uniforms.uSweepAmt.value = reduced || s >= 1 ? 0 : 1.1
    // the halo strikes (inner, then outer); sparks run round it, quicker and brighter on hover
    hoverK += ((hovering ? 1 : 0) - hoverK) * (1 - Math.exp(-4 * dt))
    loops.forEach((l, k) => {
      const t = l.t
      t.on.value = strike(since, 0.35 + 0.3 * k) * (0.85 + 0.25 * hoverK)
      t.k.main.tube = 3.2
      t.k.main.glow = 0.45 + 0.25 * hoverK
      t.k.trans.tube = 3.2
      t.k.trans.glow = 1.0
      spark[k] = (spark[k] + dt * (0.05 + 0.2 * hoverK) * l.dir + 1) % 1
      t.pulse.value.set(reduced ? 0 : spark[k], reduced ? 0 : 1.6 + 2.4 * hoverK)
      // the loops slide behind the plate as it turns (depth)
      t.root.position.x = -pointer.x * 0.12 * (k + 1)
      t.root.position.y = -pointer.y * 0.08 * (k + 1)
    })

    // the studio: black, a halo behind the plate, reflections at the Services rest angle
    const wp = world.params
    world.resetParams()
    wp.top = '#030304'
    wp.bottom = '#000000'
    wp.haloColor = '#e6eeff'
    wp.halo = 0.7 * lit
    wp.haloSize = Math.min(1.6, (TILE_H / (d * TAN * 2)) * 2.2)
    wp.focus.set(fit.sx * camera.aspect, fit.sy)
    wp.slits = 0
    wp.env = 1
    const envTurn = ENV_REST + (reduced ? 0 : 0.05 * Math.sin(time * 0.17))
    wp.envTurn = envTurn
    wp.key = 0
    wp.fill = 0.05
    plate.caps.envMapRotation.y = envTurn
    plate.sides.envMapRotation.y = envTurn
    frame.time = time
    frame.dt = dt
    frame.width = W
    frame.height = H
    world.update(frame, camera)

    composer.render(dt)

    // keep drawing while anything moves; a reduced-motion page settles and stops
    settled = reduced && since > 2.2 && pointer.distanceTo(pointerTo) < 1e-3 && Math.abs(hoverK - (hovering ? 1 : 0)) < 1e-3
    if (visible && !settled) raf = requestAnimationFrame(draw)
  }
  function wake() {
    settled = false
    if (!raf && visible) raf = requestAnimationFrame(draw)
  }

  const io = new IntersectionObserver(es => {
    visible = es.some(e => e.isIntersecting) && document.visibilityState === 'visible'
    if (visible) {
      last = performance.now()
      wake()
    }
  })
  io.observe(canvas)
  const onVis = () => {
    visible = document.visibilityState === 'visible'
    if (visible) {
      last = performance.now()
      wake()
    }
  }
  document.addEventListener('visibilitychange', onVis)
  const ro = new ResizeObserver(resize)
  ro.observe(canvas)
  resize()
  // redraw once the plate's etching has its font
  document.fonts?.ready.then(wake, () => {})

  canvas.addEventListener('webglcontextlost', e => {
    e.preventDefault()
    canvas.classList.add('is-lost')
  })

  return {
    dispose() {
      cancelAnimationFrame(raf)
      io.disconnect()
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('pointermove', onPointer)
      document.removeEventListener('pointerleave', onLeave)
      composer.dispose()
      renderer.dispose()
    },
  }
}
