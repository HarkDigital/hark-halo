import type { ServicePageData } from '../data/pages'
import { REDUCED_MOTION } from '../../kit/motion'
import { draw, easeOut, type Picture } from './viz'

/*
 * THE STAT BAND ("By the numbers"): the service's number and its words in
 * the left third, a picture of that number (viz.ts) across the rest; on a
 * tablet the number and words sit side by side over the picture, on a phone
 * they stack (stat.css).
 *
 * It lights once, when most of it is in view, on one clock: the eyebrow and
 * words wipe in (service.css's wipe), the picture lights over ~1.9 s, and a
 * counted number ('28%', '65', '10 years') counts up from the same eased
 * progress as its lights, so the two always agree. A word ('Page 1', 'Now')
 * strikes on when its picture's key light does; a counted one at once. One
 * rAF loop, only while it plays. Under reduced motion (kit/motion.ts) it
 * rests lit from the start.
 *
 * The number stays real text: a screen-reader-only copy of the final value
 * beside the aria-hidden counter (stacked over an invisible copy, so counting
 * never shifts the layout). The picture is aria-hidden; the section is named
 * by its h2.
 *
 * Dev only: ?settled shows the resting state at once, and
 * window.__statSeek(seconds) draws the band at that time after its trigger
 * (deterministic frames for screenshots).
 */

type Stat = ServicePageData['stat']

const DELAY = 250 // ms from the trigger to the picture's first light
const DUR = 1900 // the picture's default length (ms)
const STRIKE = 100 // a counted number strikes at once
const SETTLED = import.meta.env.DEV && /[?&]settled\b/.test(location.search)

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)

/** a value the band counts up to: '28%', '65', '10 years' (not '$1M+', '24/7', '1 in 4' or words) */
function countOf(v: string) {
  const m = /^(\d+)(%|\s+years)?$/.exec(v)
  return m ? { to: Number(m[1]), fmt: (n: number) => `${n}${m[2] ?? ''}` } : null
}

/** the band's markup (section.svc-stat); mountStat() brings it to life */
export function statHtml(stat: Stat): string {
  const v = esc(stat.value)
  const start = esc(countOf(stat.value)?.fmt(0) ?? stat.value)
  return `
    <section class="svc-stat" aria-labelledby="svc-stat-h">
      <div class="svc-stat-in">
        <div class="svc-stat-copy">
          <h2 class="svc-eyebrow hud-eyebrow svc-stat-eye svc-stat-wipe" id="svc-stat-h">By the numbers</h2>
          <p class="svc-stat-fig">
            <span class="svc-stat-v"><span class="sr-only">${v}</span><span class="svc-stat-ghost" aria-hidden="true">${v}</span><span class="svc-stat-n" aria-hidden="true">${start}</span></span>
            <span class="svc-stat-l hud-label svc-stat-wipe" style="--d:6">${esc(stat.label)}</span>
          </p>
        </div>
        <div class="vz vz--${stat.viz.kind}" aria-hidden="true"></div>
      </div>
    </section>`
}

/** the active lights (kit/palette.ts sets them on <html>) as 'r, g, b' along a run: 0 = a, 0.5 = b, 1 = c */
function lights(el: Element): (t: number) => string {
  const cs = getComputedStyle(el)
  const rgb = (['a', 'b', 'c'] as const).map(k => {
    const v = cs.getPropertyValue(`--neon-${k}-rgb`).split(',').map(Number)
    return v.length === 3 && v.every(Number.isFinite) ? v : [255, 255, 255]
  })
  return t => {
    t = clamp01(t)
    const [p, q, k] = t < 0.5 ? [rgb[0], rgb[1], t * 2] : [rgb[1], rgb[2], (t - 0.5) * 2]
    return p.map((v, i) => Math.round(v + (q[i] - v) * k)).join(', ')
  }
}

export function mountStat(sec: HTMLElement, stat: Stat) {
  const vz = sec.querySelector<HTMLElement>('.vz')!
  const num = sec.querySelector<HTMLElement>('.svc-stat-n')!
  const count = countOf(stat.value)
  const still = REDUCED_MOTION || SETTLED
  let pic: Picture = { frame() {}, lead: [0, 1] }
  let state: 'idle' | 'playing' | 'done' = 'idle'
  let t = 0 // ms since the trigger
  let raf = 0
  let w = 0
  let u = 0
  let struck = false
  let minute = 0

  const end = () => DELAY + (pic.dur ?? DUR)

  /** the band at time t: the picture, the count, the strike */
  const render = () => {
    const e = state === 'done' ? 1 : clamp01((t - DELAY) / (pic.dur ?? DUR))
    const p = easeOut(e)
    pic.frame(p, e)
    if (count) num.textContent = count.fmt(Math.floor(p * count.to + 1e-6))
    const on = state !== 'idle' && (pic.key ? pic.key(p, e) : t >= STRIKE)
    if (on !== struck) {
      struck = on
      num.classList.toggle('is-lit', on)
      sec.classList.toggle('is-struck', on)
    }
  }

  /** (re)draw the picture for its width; after it has lit, straight to rest (nothing replays) */
  const build = () => {
    w = vz.clientWidth
    if (w < 40) return
    // the picture's unit: its gap is 18 hud-px (stat.css)
    u = parseFloat(getComputedStyle(vz).rowGap) / 18 || 1
    const neon = lights(sec)
    vz.classList.toggle('vz-settled', state === 'done')
    pic = draw(vz, stat.viz, { w, narrow: w < 600, u, neon }, stat.value)
    sec.style.setProperty('--lead-rgb', neon(pic.lead[0]))
    sec.style.setProperty('--tail-rgb', neon(pic.lead[1]))
    minute = Math.floor(Date.now() / 60e3)
    render()
  }

  const finish = () => {
    cancelAnimationFrame(raf)
    state = 'done'
    t = end()
    render()
    sec.classList.add('is-in', 'is-done')
    if (still) {
      sec.classList.add('is-still')
      vz.classList.add('vz-settled')
    }
  }

  const play = () => {
    if (state !== 'idle') return
    sec.classList.add('is-in')
    if (still) return finish()
    state = 'playing'
    const t0 = performance.now()
    const step = (now: number) => {
      t = now - t0
      if (t >= end()) return finish()
      render()
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
  }

  /** the number's room: its width at 100px, so stat.css can size it to fill its column at most */
  const fit = () => {
    const probe = document.createElement('span')
    probe.className = 'svc-stat-v svc-stat-probe'
    probe.textContent = stat.value
    sec.append(probe)
    const width = probe.getBoundingClientRect().width
    probe.remove()
    if (width) sec.style.setProperty('--fit', (96 / width).toFixed(4))
  }

  build()
  fit()
  // (measured again once the face is in: the fallback's widths differ)
  document.fonts?.ready.then(fit)

  // a new width (or a new hud-px), rebuilt once the resize settles
  let rt = 0
  new ResizeObserver(() => {
    clearTimeout(rt)
    rt = window.setTimeout(() => {
      fit()
      const nu = parseFloat(getComputedStyle(vz).rowGap) / 18 || 1
      if (Math.abs(vz.clientWidth - w) > 1 || Math.abs(nu - u) > 0.01) build()
    }, 120)
  }).observe(vz)

  // the clock (Now): redrawn on the minute, only while the band is on screen and the tab is shown
  let onScreen = false
  let liveT = 0
  const tick = () => {
    clearTimeout(liveT)
    if (!pic.live || !onScreen || document.hidden) return
    if (Math.floor(Date.now() / 60e3) !== minute) build()
    liveT = window.setTimeout(tick, 60e3 - (Date.now() % 60e3) + 50)
  }
  document.addEventListener('visibilitychange', tick)

  // it lights once most of it is in view (or it fills half the screen, if taller)
  const io = new IntersectionObserver(
    es => {
      for (const en of es) {
        onScreen = en.isIntersecting
        tick()
        const vh = en.rootBounds?.height ?? innerHeight
        if (state === 'idle' && en.isIntersecting && (en.intersectionRatio >= 0.4 || en.intersectionRect.height >= vh * 0.5)) play()
        if (state !== 'idle' && !pic.live) io.disconnect()
      }
    },
    { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5] },
  )
  io.observe(sec)
  // (at rest from the start: nothing to wait for)
  if (still) play()

  if (import.meta.env.DEV) {
    // draw the band `s` seconds after its trigger, its CSS motion held at rest (stat.css .is-seek)
    ;(window as unknown as { __statSeek: (s: number) => void }).__statSeek = s => {
      cancelAnimationFrame(raf)
      io.disconnect()
      sec.classList.add('is-in', 'is-seek')
      t = Math.max(0, s * 1000)
      if (t >= end()) return finish()
      state = 'playing'
      sec.classList.remove('is-done')
      vz.classList.remove('vz-settled')
      render()
    }
  }
}
