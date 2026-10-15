import type { ServicePageData } from '../data/pages'
import { mountCanvas } from './canvas'
import { build } from './pictures'

/*
 * THE STAT BAND ("By the numbers"): a second hero. A full-width strip with
 * the service's number and its words over its left part, and a picture of
 * that number (./picture.ts, ./pictures) drawn in glass and neon across the
 * whole band on the hero's bloom canvases (./canvas.ts). On a tablet the
 * copy is centred over the picture, on a phone it stacks over it (stat.css).
 *
 * It lights once, when most of it is in view, on one clock (canvas.ts): the
 * eyebrow and words wipe in (service.css's wipe), the picture strikes over
 * its length, and a counted number ('28%', '65', '10 years') counts up from
 * the same eased progress as its lights, so the two always agree. A word
 * ('Page 1', 'Now') strikes on when its picture's key light does; a counted
 * one at once. Afterwards the picture stays alive while it is on screen.
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

const STRIKE = 100 // ms: a counted number strikes at once
const SETTLED = import.meta.env.DEV && /[?&]settled\b/.test(location.search)

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)

/** a value the band counts up to: '28%', '65', '10 years' (not '$1M+', '1 in 4' or words) */
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
      <div class="vz vz--${stat.viz.kind}" aria-hidden="true"></div>
      <div class="svc-stat-scrim" aria-hidden="true"></div>
      <div class="svc-stat-in">
        <div class="svc-stat-copy">
          <h2 class="svc-eyebrow hud-eyebrow svc-stat-eye svc-stat-wipe" id="svc-stat-h">By the numbers</h2>
          <p class="svc-stat-fig">
            <span class="svc-stat-v"><span class="sr-only">${v}</span><span class="svc-stat-ghost" aria-hidden="true">${v}</span><span class="svc-stat-n" aria-hidden="true">${start}</span></span>
            <span class="svc-stat-l hud-label svc-stat-wipe" style="--d:6">${esc(stat.label)}</span>
          </p>
        </div>
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
  const copy = sec.querySelector<HTMLElement>('.svc-stat-copy')!
  const num = sec.querySelector<HTMLElement>('.svc-stat-n')!
  const count = countOf(stat.value)
  const pic = build(stat.viz, stat.value)
  const neon = lights(sec)
  sec.style.setProperty('--lead-rgb', neon(pic.lead[0]))
  sec.style.setProperty('--tail-rgb', neon(pic.lead[1]))

  let struck = false
  let done = false
  const art = mountCanvas(vz, pic, copy, (p, e, t) => {
    if (count) num.textContent = count.fmt(Math.floor(p * count.to + 1e-6))
    const on = t > 0 && (pic.key ? pic.key(p, e) : t * 1000 >= STRIKE)
    if (on !== struck) {
      struck = on
      num.classList.toggle('is-lit', on)
      sec.classList.toggle('is-struck', on)
    }
    if (e >= 1 !== done) {
      done = e >= 1
      sec.classList.toggle('is-done', done)
    }
  })

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
  fit()
  // (measured again once the face is in: the fallback's widths differ)
  document.fonts?.ready.then(fit)
  addEventListener('resize', fit, { passive: true })

  const play = () => {
    sec.classList.add('is-in')
    art.play()
  }

  if (SETTLED) {
    sec.classList.add('is-in', 'is-still')
    art.settle()
  } else {
    // it lights once most of it is in view (or it fills half the screen, if taller)
    const io = new IntersectionObserver(
      es => {
        for (const en of es) {
          const vh = en.rootBounds?.height ?? innerHeight
          if (en.isIntersecting && (en.intersectionRatio >= 0.4 || en.intersectionRect.height >= vh * 0.5)) {
            play()
            io.disconnect()
          }
        }
      },
      { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5] },
    )
    io.observe(sec)
  }

  if (import.meta.env.DEV) {
    // draw the band `s` seconds after its trigger, its CSS motion held at rest (stat.css .is-seek)
    ;(window as unknown as { __statSeek: (s: number) => void }).__statSeek = s => {
      sec.classList.add('is-in', 'is-seek')
      art.seek(s * 1000)
    }
  }
}
