import { Pen, type Pointer, type Scene } from './kit'

/*
 * Runs a hero scene in `host` (the .svc-art box beside the copy): three
 * stacked canvases, the sharp one (device pixels) over two bloom layers (the
 * glow, drawn at half size, and a haze copied from it at a quarter), which
 * CSS blurs and screens together (service.css).
 *
 * The pointer is tracked across the window (like the classic site) but only
 * counts as `inside` over the art; a touch counts while the finger is down.
 * Drawn only while the hero is on screen, the tab visible and the scene not
 * held (the phone Menu sheet holds it still behind its frost). Under reduced
 * motion the scene settles off screen and one still frame is drawn.
 * `?autopilot` drives a synthetic cursor (for headless screenshots).
 */

export interface SceneHandle {
  /** hold the scene on its last frame (the Menu sheet frosts a still image), or let it run */
  hold(on: boolean): void
  dispose(): void
}

const GLOW = 0.5
const HAZE = 0.25

export function runScene(host: HTMLElement, scene: Scene, o: { reduced: boolean }): SceneHandle {
  const layer = (cls: string) => {
    const c = document.createElement('canvas')
    c.className = cls
    host.append(c)
    return c
  }
  const hazeC = layer('svc-art-haze')
  const glowC = layer('svc-art-glow')
  const coreC = layer('svc-art-core')
  const ctx = coreC.getContext('2d')!
  const glow = glowC.getContext('2d')!
  const haze = hazeC.getContext('2d')!
  const pen = new Pen(ctx, glow)
  const pointer: Pointer = { x: -9999, y: -9999, inside: false, down: false }

  let dpr = 1
  let w = 0
  let h = 0
  let raf = 0
  let running = false
  let onScreen = false
  let disposed = false
  let held = false
  let lit = false
  const start = performance.now()
  let last = start
  const autopilot = /[?&]autopilot\b/.test(location.search)

  const draw = (dt: number, t: number) => {
    for (const [c, k] of [
      [ctx, dpr],
      [glow, GLOW],
    ] as const) {
      c.setTransform(1, 0, 0, 1, 0, 0)
      c.globalCompositeOperation = 'source-over'
      c.clearRect(0, 0, c.canvas.width, c.canvas.height)
      c.setTransform(k, 0, 0, k, 0, 0)
      c.globalCompositeOperation = 'lighter'
      c.lineCap = 'round'
      c.lineJoin = 'round'
      c.setLineDash([])
    }
    scene.frame(pen, w, h, pointer, dt, t)
    haze.clearRect(0, 0, hazeC.width, hazeC.height)
    haze.drawImage(glowC, 0, 0, hazeC.width, hazeC.height)
    if (!lit) {
      lit = true
      requestAnimationFrame(() => host.classList.add('is-on'))
    }
  }

  const loop = (now: number) => {
    raf = 0
    if (!running) return
    const dt = Math.min((now - last) / 1000, 1 / 20)
    last = now
    const t = (now - start) / 1000
    if (autopilot) {
      pointer.inside = true
      pointer.x = w / 2 + Math.cos(t * 1.4) * w * 0.2
      pointer.y = h / 2 + Math.sin(t * 1.9) * h * 0.22
    }
    draw(dt, t)
    raf = requestAnimationFrame(loop)
  }

  const sync = () => {
    const want = onScreen && !document.hidden && !disposed && !held && !o.reduced
    if (want && !running) {
      running = true
      last = performance.now()
      raf = requestAnimationFrame(loop)
    } else if (!want && running) {
      running = false
      cancelAnimationFrame(raf)
      raf = 0
    }
  }

  const resize = () => {
    const r = host.getBoundingClientRect()
    const nw = Math.max(1, Math.round(r.width))
    const nh = Math.max(1, Math.round(r.height))
    const nd = Math.min(window.devicePixelRatio || 1, 2)
    if (nw === w && nh === h && nd === dpr) return
    w = nw
    h = nh
    dpr = nd
    coreC.width = Math.round(w * dpr)
    coreC.height = Math.round(h * dpr)
    glowC.width = Math.max(1, Math.round(w * GLOW))
    glowC.height = Math.max(1, Math.round(h * GLOW))
    hazeC.width = Math.max(1, Math.round(w * HAZE))
    hazeC.height = Math.max(1, Math.round(h * HAZE))
    scene.init(w, h)
    if (o.reduced) {
      // settle the simulation, then one still frame
      for (let i = 0; i <= 180; i++) draw(1 / 60, i / 60)
    }
  }

  // ---- pointer (window-wide, local to the art)
  let cx = -9999
  let cy = -9999
  let touching = false
  const locate = () => {
    const r = host.getBoundingClientRect()
    pointer.x = cx - r.left
    pointer.y = cy - r.top
    pointer.inside = pointer.x >= 0 && pointer.x <= r.width && pointer.y >= 0 && pointer.y <= r.height
  }
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' && !touching) return
    cx = e.clientX
    cy = e.clientY
    locate()
  }
  const onDown = (e: PointerEvent) => {
    touching = e.pointerType !== 'mouse'
    cx = e.clientX
    cy = e.clientY
    locate()
    pointer.down = true
  }
  const onUp = (e: PointerEvent) => {
    pointer.down = false
    if (e.pointerType !== 'mouse') {
      touching = false
      pointer.inside = false
    }
  }
  const onOut = (e: PointerEvent) => {
    if (!e.relatedTarget) pointer.inside = false
  }
  const onScroll = () => {
    if (pointer.inside || cx > -9999) locate()
  }
  window.addEventListener('pointermove', onMove, { passive: true })
  window.addEventListener('pointerdown', onDown, { passive: true })
  window.addEventListener('pointerup', onUp, { passive: true })
  window.addEventListener('pointercancel', onUp, { passive: true })
  document.addEventListener('pointerout', onOut, { passive: true })
  window.addEventListener('scroll', onScroll, { passive: true })

  const ro = new ResizeObserver(() => resize())
  ro.observe(host)
  const io = new IntersectionObserver(
    es => {
      onScreen = !!es[es.length - 1]?.isIntersecting
      sync()
    },
    { threshold: 0.01 },
  )
  io.observe(host)
  document.addEventListener('visibilitychange', sync)
  resize()

  return {
    hold(on: boolean) {
      held = on
      sync()
    },
    dispose() {
      disposed = true
      sync()
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', sync)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      document.removeEventListener('pointerout', onOut)
      window.removeEventListener('scroll', onScroll)
      hazeC.remove()
      glowC.remove()
      coreC.remove()
    },
  }
}
