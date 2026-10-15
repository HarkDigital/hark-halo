import { Pen } from '../scenes/kit'
import type { Env, Input, Label, StatPicture } from './picture'

/*
 * Runs a stat picture (picture.ts) in the band's picture box (.vz, stat.css):
 * three stacked canvases, the sharp one (device pixels) over two bloom
 * layers (the glow, drawn at half size, and a haze copied from it at a
 * quarter), which CSS blurs and screens together, as the hero's
 * scenes/runner.ts does. The labels the picture asks for are set in the DOM
 * over the canvases.
 *
 * The band's clock lives here: play() starts it (once); each frame adds the
 * time since the last, only while the box is on screen and the tab shown, so
 * the strike never plays unseen and the idle life stops off screen. Nothing
 * replays. The scene draws in laptop px and the canvases scale them by
 * --hud-px on wide screens (k), like the hero. The pointer is tracked across
 * the window (local to the box; a touch counts while the finger is down).
 *
 * Dev: seek(ms) draws the band that long after its trigger and freezes it;
 * settle() rests it at the end (deterministic frames for screenshots).
 */

const GLOW = 0.5
const HAZE = 0.25
/** ms from the trigger to the picture's first light */
export const DELAY = 250
/** the strike's default length (ms) */
export const DUR = 2200
export const easeOut = (e: number) => 1 - Math.pow(1 - e, 3)
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

export interface CanvasHandle {
  /** start the band's clock (once) */
  play(): void
  /** dev: draw the band `ms` after its trigger, frozen */
  seek(ms: number): void
  /** dev: rest at the end, frozen */
  settle(): void
  dispose(): void
}

export function mountCanvas(host: HTMLElement, pic: StatPicture, copy: HTMLElement, onFrame: (p: number, e: number, t: number) => void): CanvasHandle {
  const layer = (cls: string) => {
    const c = document.createElement('canvas')
    c.className = cls
    host.append(c)
    return c
  }
  const hazeC = layer('vz-haze')
  const glowC = layer('vz-glow')
  const coreC = layer('vz-core')
  const labels = document.createElement('div')
  labels.className = 'vz-labels'
  host.append(labels)
  const ctx = coreC.getContext('2d')!
  const glow = glowC.getContext('2d')!
  const haze = hazeC.getContext('2d')!
  const pen = new Pen(ctx, glow)
  const coarse = !!(window.matchMedia?.('(hover: none)').matches || window.matchMedia?.('(pointer: coarse)').matches)
  const pointer: Input = { x: -9999, y: -9999, inside: false, down: false, scroll: 0, scrollV: 0, coarse }
  // dev: ?scroll=0.3 holds the band's scroll input (deterministic frames for screenshots)
  const heldScroll = import.meta.env.DEV ? Number(new URLSearchParams(location.search).get('scroll')) : NaN
  // reads --hud-px as a length (a custom property's value is not resolved for us)
  const probe = document.createElement('i')
  probe.style.cssText = 'position:absolute;left:0;top:0;width:calc(1000 * var(--hud-px, 1px));height:0;visibility:hidden;pointer-events:none'
  host.append(probe)

  let dpr = 1
  let k = 1
  let w = 0
  let h = 0
  let env: Env = { mode: 'wide', narrow: false, framed: false, copyX: 0 }
  let state: 'idle' | 'playing' | 'frozen' = 'idle'
  /** ms on the band's clock since play() */
  let lit = 0
  let raf = 0
  let running = false
  let onScreen = false
  let disposed = false
  let shown = false
  let last = 0
  let minute = 0
  let liveT = 0

  const dur = () => pic.dur ?? DUR
  const at = (ms: number): [number, number] => {
    const e = clamp01((ms - DELAY) / dur())
    const from = pic.countFrom ?? 0
    return [easeOut(from > 0 ? clamp01((e - from) / (1 - from)) : e), e]
  }

  const draw = (dt: number, ms: number) => {
    for (const [c, s] of [
      [ctx, dpr * k],
      [glow, GLOW * k],
    ] as const) {
      c.setTransform(1, 0, 0, 1, 0, 0)
      c.globalCompositeOperation = 'source-over'
      c.clearRect(0, 0, c.canvas.width, c.canvas.height)
      c.setTransform(s, 0, 0, s, 0, 0)
      c.globalCompositeOperation = 'lighter'
      c.lineCap = 'round'
      c.lineJoin = 'round'
      c.setLineDash([])
    }
    const [p, e] = at(ms)
    pic.frame(pen, w, h, p, e, ms / 1000, pointer, dt)
    haze.clearRect(0, 0, hazeC.width, hazeC.height)
    haze.drawImage(glowC, 0, 0, hazeC.width, hazeC.height)
    onFrame(p, e, ms / 1000)
    if (!shown) {
      shown = true
      requestAnimationFrame(() => host.classList.add('is-on'))
    }
  }

  // the band's place in the viewport (read on scroll and resize, never in a frame)
  let scrollRaw = 0
  const measureScroll = () => {
    if (Number.isFinite(heldScroll) && heldScroll >= 0) {
      scrollRaw = heldScroll
      return
    }
    const r = host.getBoundingClientRect()
    const vh = window.innerHeight || 1
    scrollRaw = clamp01((vh - r.top) / (vh + r.height))
  }

  const loop = (now: number) => {
    raf = 0
    if (!running) return
    const dt = Math.min((now - last) / 1000, 1 / 20)
    last = now
    lit += dt * 1000
    // the scroll's speed, smoothed, and its position
    const v = (scrollRaw - pointer.scroll) / Math.max(1e-3, dt)
    pointer.scrollV += (v - pointer.scrollV) * Math.min(1, 8 * dt)
    pointer.scroll = scrollRaw
    draw(dt, lit)
    raf = requestAnimationFrame(loop)
  }

  const sync = () => {
    const want = state === 'playing' && onScreen && !document.hidden && !disposed
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

  const place = (ls: Label[] | void) => {
    labels.innerHTML = (ls ?? [])
      .slice(0, 3)
      .map(
        l =>
          `<span class="vz-lab${l.hi ? ' is-hi' : ''} is-${l.align ?? 'left'}" style="left:${(l.x * k).toFixed(1)}px;top:${(l.y * k).toFixed(1)}px">${esc(l.text)}</span>`,
      )
      .join('')
  }

  /** the box's mode (stat.css says, --vz-mode) and, on a laptop, where the copy's column ends */
  const measure = (r: DOMRect, nk: number): Env => {
    const mode = getComputedStyle(host).getPropertyValue('--vz-mode').trim()
    const e: Env = {
      mode: mode === 'framed' ? 'framed' : mode === 'narrow' ? 'narrow' : 'wide',
      narrow: mode === 'narrow',
      framed: mode === 'framed',
      copyX: 0,
    }
    if (e.mode === 'wide') e.copyX = Math.max(0, Math.round((copy.getBoundingClientRect().right - r.left) / nk))
    return e
  }

  /** (re)build the picture for the box */
  const build = () => {
    minute = Math.floor(Date.now() / 60e3)
    place(pic.init(w, h, env))
    draw(1 / 60, state === 'idle' ? 0 : lit)
  }

  const resize = () => {
    const r = host.getBoundingClientRect()
    const nk = Math.max(1, Math.round(probe.getBoundingClientRect().width) / 1000)
    const nw = Math.max(1, Math.round(r.width / nk))
    const nh = Math.max(1, Math.round(r.height / nk))
    const nd = Math.min(window.devicePixelRatio || 1, 2)
    const ne = measure(r, nk)
    const same = nw === w && nh === h && nd === dpr && nk === k
    if (same && ne.mode === env.mode && ne.copyX === env.copyX) return
    env = ne
    if (!same) {
      w = nw
      h = nh
      dpr = nd
      k = nk
      coreC.width = Math.round(w * k * dpr)
      coreC.height = Math.round(h * k * dpr)
      glowC.width = Math.max(1, Math.round(w * k * GLOW))
      glowC.height = Math.max(1, Math.round(h * k * GLOW))
      hazeC.width = Math.max(1, Math.round(w * k * HAZE))
      hazeC.height = Math.max(1, Math.round(h * k * HAZE))
    }
    build()
  }

  // the clock (Now): rebuilt on the minute, only while on screen and the tab shown
  const tick = () => {
    clearTimeout(liveT)
    if (!pic.live || !onScreen || document.hidden || disposed) return
    if (Math.floor(Date.now() / 60e3) !== minute) build()
    liveT = window.setTimeout(tick, 60e3 - (Date.now() % 60e3) + 50)
  }

  // ---- pointer (window-wide, local to the box)
  let cx = -9999
  let cy = -9999
  let touching = false
  const locate = () => {
    const r = host.getBoundingClientRect()
    pointer.x = (cx - r.left) / k
    pointer.y = (cy - r.top) / k
    pointer.inside = pointer.x >= 0 && pointer.x <= w && pointer.y >= 0 && pointer.y <= h
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
    measureScroll()
    if (pointer.inside || cx > -9999) locate()
  }
  const onVis = () => {
    sync()
    tick()
  }
  window.addEventListener('pointermove', onMove, { passive: true })
  window.addEventListener('pointerdown', onDown, { passive: true })
  window.addEventListener('pointerup', onUp, { passive: true })
  window.addEventListener('pointercancel', onUp, { passive: true })
  document.addEventListener('pointerout', onOut, { passive: true })
  window.addEventListener('scroll', onScroll, { passive: true })

  const ro = new ResizeObserver(() => {
    measureScroll()
    resize()
  })
  ro.observe(host)
  const io = new IntersectionObserver(
    es => {
      onScreen = !!es[es.length - 1]?.isIntersecting
      sync()
      tick()
    },
    { threshold: 0.01 },
  )
  io.observe(host)
  document.addEventListener('visibilitychange', onVis)
  measureScroll()
  pointer.scroll = scrollRaw
  resize()

  return {
    play() {
      if (state !== 'idle') return
      state = 'playing'
      lit = 0
      sync()
    },
    seek(ms) {
      running = false
      cancelAnimationFrame(raf)
      raf = 0
      state = 'frozen'
      lit = Math.max(0, ms)
      measureScroll()
      pointer.scroll = scrollRaw
      pointer.scrollV = 0
      draw(1 / 60, lit)
    },
    settle() {
      this.seek(DELAY + dur() + 600)
    },
    dispose() {
      disposed = true
      sync()
      clearTimeout(liveT)
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      document.removeEventListener('pointerout', onOut)
      window.removeEventListener('scroll', onScroll)
      hazeC.remove()
      glowC.remove()
      coreC.remove()
      labels.remove()
      probe.remove()
    },
  }
}
