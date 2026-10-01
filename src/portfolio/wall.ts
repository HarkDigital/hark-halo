import { workImage, workThumb, type WorkItem } from '../content'
import { featuredSlot, moreSlot, neonKey, portfolioSplit, screenSizes, type NeonKey } from '../kit/work'
import { ACTIVE } from '../kit/palette'
import { REDUCED_MOTION } from '../kit/motion'
import { rise } from '../core/rise'
import { framePaths } from '../service/neonFrame'
import { THUMBS } from 'virtual:work-thumbs'

/*
 * THE GLASS WALL: the sites hang as lit panes of glass on the black wall.
 *
 * Each pane arrives FROSTED (a 64×40 copy of its screenshot, blurred, under
 * grain). A neon tube traces its frame from the top centre down to a lit foot
 * under the pane, the foot swells, then a neon CLEARING EDGE rises from the
 * foot and leaves the site sharp behind it: the Work chapter's drum ("a leaf
 * clears when it faces you") told as a moment in time.
 *
 *   hang     .pf-hang comes forward out of a slight lean (700ms)
 *   trace    the frame's two halves run top centre → bottom centre (100–800ms)
 *   foot     the tube it stands on swells from the middle (640–1240ms), its pool fades up
 *   clear    from max(760ms, the frost drawn): the screenshot is revealed from the
 *            foot upward, the edge riding the seam (700ms); the frame ebbs to a hairline
 *   placard  its lines fade and rise in turn (+250 … +580ms)
 *
 * The QUICK entrance (filter newcomers, arrivals past the cap of four full
 * ones, the phone tiles) skips the trace and runs everything in ~420ms.
 * Everything moves by WAAPI with fill 'backwards': the final state is
 * committed as classes up front, so nothing is left filling once it ends.
 *
 *   pointer  (hover + fine pointer) the pane under the pointer tilts toward it,
 *            lifts, catches a glare and is lit (frame, glow, foot, pool); the rest
 *            dim; a soft lamp in that site's own colour follows the pointer; one
 *            rAF loop, asleep once every value has settled
 *   touch    the pane nearest the middle of the screen is lit, and panes lean a
 *            little as they pass (a passive scroll listener, in-view panes only)
 *   keyboard a focused pill lights its pane (tilt 0, lifted)
 *
 * Screenshots: the first two prominent are asked for at once (the lead at high
 * priority, as the page's own preload), the rest as they come within 150% of
 * the view. A 640w copy rides in srcset where one exists (virtual:work-thumbs).
 * A screenshot that fails, or hasn't decoded 8s after its pane came in, shows
 * the site's name card instead (and still clears if it turns up later).
 */

export interface Item {
  w: WorkItem
  /** place in WORK (its neon, the feet's breathing phase) */
  index: number
  /** one of the prominent sites (kit/work.ts portfolioSplit): a row of its own, its placard beside it */
  feat: boolean
  key: NeonKey
  li: HTMLLIElement
  hang: HTMLElement
  screen: HTMLElement
  bezel: HTMLElement
  glass: HTMLElement
  img: HTMLImageElement
  frost: HTMLCanvasElement
  fog: HTMLElement
  edge: HTMLElement
  ring: HTMLElement
  glare: HTMLElement
  tube: SVGSVGElement
  paths: SVGPathElement[]
  foot: HTMLElement
  pool: HTMLElement
  plac: HTMLElement
  lines: HTMLElement[]
  name: HTMLElement
  cta: HTMLAnchorElement
  hit: HTMLAnchorElement
  /** "r, g, b" of the lamp and pool: the site's neon, tinted by its screenshot once decoded */
  tint: string
  // state
  entered: boolean
  /** the next entrance is the quick one (it has been on the wall before) */
  quick: boolean
  /** held by a filter swap (the rail enters it itself) */
  held: boolean
  loading: boolean
  decoded: boolean
  nofile: boolean
  cleared: boolean
  full: boolean
  /** when its entrance (re)started (performance.now) */
  t0: number
  anims: Animation[]
  timers: { id: number; fn: () => void }[]
  nofileTimer: number
}

export interface Wall {
  items: Item[]
  visible(): Item[]
  /** a phone tile (its pill stretched over it: nothing around the pill may take a transform) */
  isTile(it: Item): boolean
  layout(): void
  enter(list: Item[], mode: 'quick' | 'auto', stagger?: number): void
  exit(list: Item[]): Animation[]
  retire(list: Item[]): void
  finishAll(): void
  /** re-read the touch light / hot state after the wall moved */
  refresh(): void
}

const EASE_OUT = 'cubic-bezier(.16,1,.3,1)'
const EASE_TRACE = 'cubic-bezier(.45,.05,.25,1)'
const EASE_CLEAR = 'cubic-bezier(.3,.1,.2,1)'
const PHONE = '(max-width: 720px)'
const HAS_THUMB = new Set(THUMBS)
const MAX_FULL = 4
/**
 * Touch: the panes lean as they pass by a scroll-driven CSS animation where there is one
 * (portfolio.css .pf-touch: on the compositor, so a phone never restyles a pane per scroll
 * frame); elsewhere the scroll listener writes the lean itself.
 */
const SCROLL_LEAN = typeof CSS !== 'undefined' && CSS.supports?.('animation-timeline: view()') && !REDUCED_MOTION

const hex = (h: string) => {
  const n = parseInt(h.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function mountWall(o: { stage: HTMLElement; work: readonly WorkItem[]; match: (w: WorkItem) => boolean }): Wall {
  const { stage } = o
  const lamp = document.querySelector<HTMLElement>('.pf-lamp')
  const phone = matchMedia(PHONE)
  const q = <T extends Element>(root: Element, s: string) => root.querySelector<T>(s)!

  const lead = new Set(portfolioSplit(o.work).lead)
  const items: Item[] = []
  for (const li of stage.querySelectorAll<HTMLLIElement>('.pf-item')) {
    const index = o.work.findIndex(w => w.id === li.dataset.id)
    const w = o.work[index]
    const plac = q<HTMLElement>(li, '.pf-plac')
    const name = q<HTMLElement>(li, '.pf-name')
    rise(name, name.innerHTML)
    const it: Item = {
      w,
      index,
      feat: lead.has(w),
      key: neonKey(index),
      li,
      hang: q(li, '.pf-hang'),
      screen: q(li, '.pf-screen'),
      bezel: q(li, '.pf-bezel'),
      glass: q(li, '.pf-glass'),
      img: q(li, '.pf-img'),
      frost: q(li, '.pf-frost'),
      fog: q(li, '.pf-fog'),
      edge: q(li, '.pf-edge'),
      ring: q(li, '.pf-ring'),
      glare: q(li, '.pf-glare'),
      tube: q(li, '.pf-tube'),
      paths: [...li.querySelectorAll<SVGPathElement>('.pf-tube path')],
      foot: q(li, '.pf-foot'),
      pool: q(li, '.pf-pool'),
      plac,
      lines: [...plac.children] as HTMLElement[],
      name,
      cta: q(li, '.pf-cta'),
      hit: q(li, '.pf-hit'),
      tint: `var(--neon-${neonKey(index)}-rgb)`,
      entered: false,
      quick: false,
      held: false,
      loading: false,
      decoded: false,
      nofile: false,
      cleared: false,
      full: false,
      t0: 0,
      anims: [],
      timers: [],
      nofileTimer: 0,
    }
    li.hidden = !o.match(w)
    items.push(it)
  }
  const byLi = new Map(items.map(it => [it.li, it]))
  const itemOf = (n: EventTarget | null) => {
    const li = (n as Element | null)?.closest?.<HTMLLIElement>('.pf-item')
    return li ? byLi.get(li) : undefined
  }
  const visible = () => items.filter(it => !it.li.hidden)
  const isTile = (it: Item) => !it.feat && phone.matches

  // ------------------------------------------------------------ slots + sizes
  // (the prominent rows alternate their screen's side by visible index, so a filter that hides
  // one re-sides those after it; the rail FLIPs them there)
  const sizesOf = (it: Item) => (it.feat ? screenSizes({ featured: true }) : screenSizes({ featured: false, p: (it.li.dataset.p as never) ?? 'half' }))
  function layout() {
    const vis = visible()
    const feat = vis.filter(it => it.feat)
    const more = vis.filter(it => !it.feat)
    feat.forEach((it, k) => (it.li.dataset.d = featuredSlot(k)))
    more.forEach((it, k) => (it.li.dataset.p = moreSlot(k, more.length)))
    for (const it of vis) if (it.img.hasAttribute('srcset')) it.img.sizes = sizesOf(it)
  }
  layout()

  // ------------------------------------------------------------ the neon frames (one ResizeObserver)
  const sizeTube = (it: Item) => {
    const w = it.bezel.offsetWidth
    const h = it.bezel.offsetHeight
    if (!w || !h) return
    const r = parseFloat(getComputedStyle(it.bezel).borderTopLeftRadius) || 16
    const { right, left } = framePaths(w, h, Math.min(r, w / 2, h / 2), 0.75)
    it.tube.setAttribute('viewBox', `0 0 ${w} ${h}`)
    it.tube.setAttribute('width', String(w))
    it.tube.setAttribute('height', String(h))
    it.paths.forEach((p, k) => p.setAttribute('d', k % 2 ? left : right))
  }
  const bezelOf = new Map(items.map(it => [it.bezel as Element, it]))
  const ro = new ResizeObserver(es => es.forEach(e => sizeTube(bezelOf.get(e.target)!)))
  items.forEach(it => ro.observe(it.bezel))

  // ------------------------------------------------------------ screenshots: load, decode, frost, tint
  const neonRgb = (k: NeonKey) => hex(ACTIVE[k])
  const settle = (img: HTMLImageElement, fresh: boolean) =>
    new Promise<boolean>(res => {
      if (!fresh && img.complete) return res(img.naturalWidth > 0)
      const done = (ok: boolean) => () => {
        img.removeEventListener('load', yes)
        img.removeEventListener('error', no)
        res(ok)
      }
      const yes = done(true)
      const no = done(false)
      img.addEventListener('load', yes)
      img.addEventListener('error', no)
    })

  /**
   * The frost's 64×40 copy of a screenshot, decoded and scaled off the main thread: from the file
   * itself (the browser's cache already holds it). Drawn from the <img>, the canvas would decode
   * the whole 1280px screenshot again on the main thread (7–30ms on a phone, mid-scroll).
   */
  const smallCopy = async (img: HTMLImageElement): Promise<ImageBitmap | null> => {
    if (typeof createImageBitmap !== 'function') return null
    const opt: ImageBitmapOptions = { resizeWidth: 64, resizeHeight: 40, resizeQuality: 'medium' }
    try {
      const file = await fetch(img.currentSrc || img.src)
      if (file.ok) return await createImageBitmap(await file.blob(), opt)
    } catch {
      /* no file to hand: from the image */
    }
    return createImageBitmap(img, opt).catch(() => null)
  }

  function load(it: Item, high = false) {
    if (it.loading) return
    it.loading = true
    const img = it.img
    if (high) img.setAttribute('fetchpriority', 'high')
    if (HAS_THUMB.has(it.w.id)) {
      img.sizes = sizesOf(it)
      img.srcset = `${workThumb(it.w.id)} 640w, ${workImage(it.w.id)} 1280w`
    }
    img.src = workImage(it.w.id)
    void watch(it, false)
  }

  async function watch(it: Item, fresh: boolean): Promise<void> {
    const img = it.img
    const ok = await settle(img, fresh)
    if (!ok) {
      // a half-size copy that failed: once more with the full screenshot alone
      if (img.hasAttribute('srcset')) {
        img.removeAttribute('srcset')
        img.removeAttribute('sizes')
        img.src = workImage(it.w.id)
        return watch(it, true)
      }
      return noFile(it)
    }
    try {
      await img.decode()
    } catch {
      /* painted anyway once loaded */
    }
    try {
      // (read once, so not willReadFrequently: that canvas mode costs ~40ms to set up on its first
      // draw, a long task on a phone just as the lead screen clears)
      const ctx = it.frost.getContext('2d')
      if (ctx) {
        const small = await smallCopy(img)
        ctx.drawImage(small ?? img, 0, 0, 64, 40)
        small?.close()
        const d = ctx.getImageData(0, 0, 64, 40).data
        let r = 0
        let g = 0
        let b = 0
        for (let i = 0; i < d.length; i += 4) {
          r += d[i]
          g += d[i + 1]
          b += d[i + 2]
        }
        const n = d.length / 4
        const [nr, ng, nb] = neonRgb(it.key)
        it.tint = [nr * 0.6 + (r / n) * 0.4, ng * 0.6 + (g / n) * 0.4, nb * 0.6 + (b / n) * 0.4].map(Math.round).join(', ')
        it.li.style.setProperty('--tint-rgb', it.tint)
        if (hot === it) lampTo(it)
      }
    } catch {
      /* a tainted canvas: no tint, no frost (the placeholder glass stays) */
    }
    it.frost.classList.add('is-drawn')
    it.decoded = true
    clearTimeout(it.nofileTimer)
    if (it.nofile) {
      // it turned up after all: upgrade the name card and clear
      it.nofile = false
      it.li.classList.remove('is-nofile')
      if (it.entered) clear(it, 0, true)
    } else if (it.entered && !it.cleared) clear(it, Math.max(0, it.t0 + (it.full ? 760 : 120) - performance.now()), !it.full)
  }

  function noFile(it: Item) {
    if (it.decoded || it.nofile) return
    it.nofile = true
    it.li.classList.add('is-nofile')
    if (it.entered) ebb(it, Math.max(0, it.t0 + 800 - performance.now()))
  }

  // the lead screenshot at once (at high priority, as the page's preload), the next with it
  const featVis = visible().filter(it => it.feat)
  if (featVis[0]) load(featVis[0], true)
  if (featVis[1]) load(featVis[1])
  // the rest as they come within 150% of the view
  const imgIo = new IntersectionObserver(
    es => {
      for (const e of es) {
        if (!e.isIntersecting) continue
        imgIo.unobserve(e.target)
        const it = byLi.get(e.target as HTMLLIElement)
        if (it) load(it)
      }
    },
    { rootMargin: '150% 0px' },
  )
  items.forEach(it => it.loading || imgIo.observe(it.li))
  // printing: ask for every screenshot (best effort; one still loading prints as its name card)
  addEventListener('beforeprint', () => items.forEach(it => load(it)))

  // ------------------------------------------------------------ entrances
  let fullRunning = 0
  const later = (it: Item, ms: number, fn: () => void) => {
    const t = { id: 0, fn }
    t.id = window.setTimeout(() => {
      it.timers = it.timers.filter(x => x !== t)
      fn()
    }, ms)
    it.timers.push(t)
  }
  const anim = (it: Item, el: Element, kf: Keyframe[], opt: KeyframeAnimationOptions) => {
    const a = el.animate(kf, { fill: 'backwards', ...opt })
    it.anims.push(a)
    const drop = () => (it.anims = it.anims.filter(x => x !== a))
    // (a leaver's fade holds its end until retire() cancels it)
    if (opt.fill !== 'forwards') a.addEventListener('finish', drop)
    a.addEventListener('cancel', drop)
    return a
  }

  /** the frame ebbs back to a hairline (and the pane is fully in) */
  function ebb(it: Item, delay: number) {
    later(it, delay, () => {
      it.li.classList.remove('is-trace')
      it.li.classList.add('is-ebb', 'is-hung')
      if (it.full) {
        it.full = false
        fullRunning = Math.max(0, fullRunning - 1)
      }
      later(it, 800, () => it.li.classList.remove('is-ebb'))
    })
  }

  /** the clearing edge rises from the foot and leaves the site sharp behind it */
  function clear(it: Item, delay: number, quick: boolean) {
    if (it.cleared) return
    it.cleared = true
    it.li.classList.add('is-clear')
    if (REDUCED_MOTION) {
      it.li.classList.add('is-thawed')
      return ebb(it, 0)
    }
    const duration = quick ? 420 : 700
    const t = { duration, delay, easing: EASE_CLEAR }
    anim(it, it.img, [{ clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], t)
    anim(it, it.edge, [{ transform: 'translateY(100%)', opacity: 0 }, { opacity: 1, offset: 0.08 }, { opacity: 1, offset: 0.88 }, { transform: 'translateY(0)', opacity: 0 }], t)
    const fade = { duration: 320, delay: delay + duration * 0.55, easing: 'ease' }
    const kf = [
      { opacity: 1 },
      { opacity: 0 },
    ]
    anim(it, it.frost, kf, fade)
    anim(it, it.fog, kf, fade)
    // the frost gone for good once faded (visibility, off the animation: it stays on the compositor)
    later(it, fade.delay + fade.duration, () => it.li.classList.add('is-thawed'))
    ebb(it, delay + duration)
  }

  /** one pane's entrance (`delay` from now) */
  function run(it: Item, delay: number, quick: boolean) {
    if (it.entered) return
    it.entered = true
    it.held = false
    entryIo.unobserve(it.li)
    load(it)
    const li = it.li
    it.t0 = performance.now() + delay
    // the final state, committed now: the animations below only hold the start until they run
    li.classList.add('is-up', 'is-plac')
    it.paths.forEach(p => p.setAttribute('stroke-dashoffset', '0'))
    if (REDUCED_MOTION) {
      it.name.classList.add('is-in')
      if (it.decoded) clear(it, 0, true)
      else if (it.nofile) ebb(it, 0)
      return
    }
    it.full = !quick
    if (it.full) fullRunning++
    // a phone tile shows only its industry and name (the rest is there for screen readers), so only
    // they rise: every tile × three unseen lines would be main-thread work for nothing mid-scroll.
    // And the pill's line must never rise there: a transform would make it the containing block of
    // the pill stretched over the tile, shrinking the tile's one link to nothing until it ended
    // (untappable, and focus would scroll to an empty box)
    const lines = isTile(it) ? it.lines.filter(n => n === it.name || n.classList.contains('pf-meta')) : it.lines
    const rises = (dy: number) => [{ opacity: 0, transform: `translateY(${dy}px)` }, { opacity: 1, transform: 'none' }]
    if (quick) {
      anim(it, it.hang, [{ transform: 'translate3d(0,16px,0) scale(.97)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, delay, easing: EASE_OUT })
      anim(it, it.tube, [{ opacity: 0 }, { opacity: 0.2 }], { duration: 300, delay, easing: 'ease' })
      anim(it, it.foot, [{ transform: 'scaleX(.2)', opacity: 0 }, { transform: 'scaleX(1)', opacity: 1 }], { duration: 300, delay: delay + 120, easing: EASE_OUT })
      anim(it, it.pool, [{ opacity: 0 }, { opacity: 0.6 }], { duration: 300, delay: delay + 180, easing: 'ease' })
      lines.forEach((n, k) => anim(it, n, rises(8), { duration: 300, delay: delay + 100 + k * 40, easing: EASE_OUT }))
      later(it, delay + 140, () => it.name.classList.add('is-in'))
    } else {
      li.classList.add('is-trace')
      anim(it, it.hang, [{ transform: 'perspective(1400px) translate3d(0,22px,0) rotateX(8deg) scale(.97)' }, { transform: 'none' }], { duration: 700, delay, easing: EASE_OUT })
      anim(it, it.hang, [{ opacity: 0 }, { opacity: 1 }], { duration: 420, delay, easing: 'ease' })
      it.paths.forEach(p => anim(it, p, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 700, delay: delay + 100, easing: EASE_TRACE }))
      anim(it, it.foot, [{ transform: 'scaleX(.2)' }, { transform: 'scaleX(1)' }], { duration: 600, delay: delay + 640, easing: EASE_OUT })
      anim(it, it.foot, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: delay + 640, easing: 'linear' })
      anim(it, it.pool, [{ opacity: 0 }, { opacity: 0.6 }], { duration: 700, delay: delay + 700, easing: 'ease' })
      const at = [250, 330, 420, 500, 580]
      lines.forEach((n, k) => anim(it, n, rises(12), { duration: 700, delay: delay + (at[k] ?? 580), easing: EASE_OUT }))
      later(it, delay + 330, () => it.name.classList.add('is-in'))
    }
    if (it.decoded) clear(it, delay + (quick ? 120 : 760), quick)
    else if (it.nofile) ebb(it, delay + (quick ? 300 : 800))
    else {
      // a screenshot still on its way: its name card after 8s (upgraded if it turns up later)
      clearTimeout(it.nofileTimer)
      it.nofileTimer = window.setTimeout(() => noFile(it), delay + 8000)
    }
  }

  /** a batch arriving together: top to bottom, left to right; 90ms apart (phone tiles 110ms per column) */
  function enter(list: Item[], mode: 'quick' | 'auto', stagger = 90) {
    const rects = new Map(list.map(it => [it, it.li.getBoundingClientRect()]))
    const sorted = list.filter(it => !it.entered && !it.li.hidden).sort((a, b) => rects.get(a)!.top - rects.get(b)!.top || rects.get(a)!.left - rects.get(b)!.left)
    let prev: Item | undefined
    let prevDelay = 0
    sorted.forEach((it, d) => {
      let delay = d * stagger
      if (prev && isTile(it) && isTile(prev) && Math.abs(rects.get(it)!.top - rects.get(prev)!.top) < 2) delay = prevDelay + 110
      const quick = mode === 'quick' || it.quick || isTile(it) || fullRunning >= MAX_FULL
      run(it, delay, quick)
      prev = it
      prevDelay = delay
    })
  }

  const entryIo = new IntersectionObserver(
    es => {
      const arrived: Item[] = []
      for (const e of es) {
        if (!e.isIntersecting) continue
        const it = byLi.get(e.target as HTMLLIElement)
        if (it && !it.entered && !it.held) arrived.push(it)
      }
      if (arrived.length) enter(arrived, 'auto')
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
  )
  // the wall starts coming in 150ms after the first render (the headline has begun)
  window.setTimeout(() => items.forEach(it => it.entered || entryIo.observe(it.li)), REDUCED_MOTION ? 0 : 150)

  /** the filter's leavers: the site frosts over, the pane steps back, the placard goes (200ms) */
  function exit(list: Item[]): Animation[] {
    const out: Animation[] = []
    for (const it of list) {
      it.li.classList.add('is-leaving')
      if (!it.entered) continue
      out.push(
        anim(it, it.img, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'ease-in', fill: 'forwards' }),
        anim(it, it.hang, [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.96)' }], { duration: 200, easing: 'ease-in', fill: 'forwards' }),
        anim(it, it.plac, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'ease-in', fill: 'forwards' }),
      )
    }
    return out
  }

  /** off the wall (hidden), back to its waiting state: it comes back with the quick entrance */
  function retire(list: Item[]) {
    for (const it of list) {
      it.li.hidden = true
      flush(it, false)
      it.anims.splice(0).forEach(a => a.cancel())
      // (and anything else still on it: a FLIP, a press ring; never the feet's breathing)
      it.li.getAnimations({ subtree: true }).forEach(a => a instanceof CSSAnimation || a.cancel())
      clearTimeout(it.nofileTimer)
      it.li.classList.remove('is-up', 'is-plac', 'is-clear', 'is-thawed', 'is-hung', 'is-trace', 'is-ebb', 'is-leaving', 'is-hot', 'is-lit', 'is-vis', 'is-press')
      it.name.classList.remove('is-in')
      it.paths.forEach(p => p.setAttribute('stroke-dashoffset', '1'))
      if (it.full) fullRunning = Math.max(0, fullRunning - 1)
      it.full = false
      it.entered = false
      it.cleared = false
      it.quick = true
      if (it.nofile) it.li.classList.add('is-nofile')
      if (hot === it) unhot(it)
      entryIo.observe(it.li)
    }
  }

  /** run (or drop) an item's pending steps now */
  const flush = (it: Item, run = true) => {
    const ts = it.timers
    it.timers = []
    ts.forEach(t => {
      clearTimeout(t.id)
      if (run) t.fn()
    })
  }

  /** every entrance to its end state, now (a filter swap measures a still wall) */
  function finishAll() {
    for (const it of items) {
      // (never a cancelled one: finishing it would bring its end state back)
      it.anims.slice().forEach(a => a.playState === 'idle' || a.finish())
      // (finishing can schedule the ebb: flush twice)
      flush(it)
      flush(it)
    }
  }

  // ------------------------------------------------------------ light: hot (pointer / focus) and lit (touch)
  let hot: Item | null = null
  let mode: 'pointer' | 'touch' = 'touch'
  let modeSet = false
  let ac = new AbortController()
  const fine = matchMedia('(hover: hover) and (pointer: fine)')

  interface Tilt {
    rx: number
    ry: number
    lift: number
    trx: number
    try: number
    tlift: number
  }
  const tilts = new Map<Item, Tilt>()
  let raf = 0
  let px = 0
  let py = 0
  let lx = 0
  let ly = 0
  let lampOn = false
  let lampMoving = false

  const lampTo = (it: Item) => lamp?.style.setProperty('--lamp-rgb', it.tint)
  const tiltOf = (it: Item) => {
    let s = tilts.get(it)
    if (!s) {
      s = { rx: 0, ry: 0, lift: 0, trx: 0, try: 0, tlift: 0 }
      tilts.set(it, s)
      it.li.classList.add('is-tilt')
    }
    return s
  }

  const tick = () => {
    raf = 0
    let busy = false
    if (lamp && lampMoving) {
      lx += (px - lx) * 0.12
      ly += (py - ly) * 0.12
      if (Math.abs(px - lx) < 0.5 && Math.abs(py - ly) < 0.5) {
        lx = px
        ly = py
        lampMoving = false
      } else busy = true
      lamp.style.transform = `translate3d(${lx.toFixed(1)}px, ${ly.toFixed(1)}px, 0)`
    }
    for (const [it, s] of tilts) {
      s.rx += (s.trx - s.rx) * 0.14
      s.ry += (s.try - s.ry) * 0.14
      s.lift += (s.tlift - s.lift) * 0.14
      if (Math.abs(s.trx - s.rx) < 0.01 && Math.abs(s.try - s.ry) < 0.01 && Math.abs(s.tlift - s.lift) < 0.01) {
        s.rx = s.trx
        s.ry = s.try
        s.lift = s.tlift
        if (it !== hot && !s.trx && !s.try && !s.tlift) {
          tilts.delete(it)
          it.li.classList.remove('is-tilt')
          it.screen.style.willChange = ''
        }
      } else busy = true
      it.screen.style.setProperty('--rx', s.rx.toFixed(3))
      it.screen.style.setProperty('--ry', s.ry.toFixed(3))
      it.screen.style.setProperty('--lift', s.lift.toFixed(3))
    }
    if (busy) raf = requestAnimationFrame(tick)
  }
  const kick = () => {
    if (!raf && !REDUCED_MOTION) raf = requestAnimationFrame(tick)
  }

  function setHot(it: Item, how: 'screen' | 'cta' | 'focus', ox = 50) {
    if (hot && hot !== it) unhot(hot)
    if (!it.entered) run(it, 0, true)
    hot = it
    it.li.classList.add('is-hot')
    it.foot.style.setProperty('--ox', `${ox.toFixed(1)}%`)
    if (mode !== 'pointer') return
    stage.classList.add('has-hot')
    lampTo(it)
    const s = tiltOf(it)
    s.tlift = 1
    if (how !== 'screen') {
      s.trx = 0
      s.try = 0
    }
    if (how === 'focus') {
      it.screen.style.setProperty('--gx', '50%')
      it.screen.style.setProperty('--gy', '20%')
    }
    it.screen.style.willChange = 'transform'
    kick()
  }
  function unhot(it: Item) {
    it.li.classList.remove('is-hot')
    if (hot === it) hot = null
    if (!hot) stage.classList.remove('has-hot')
    const s = tilts.get(it)
    if (s) {
      s.trx = 0
      s.try = 0
      s.tlift = 0
      kick()
    }
  }
  /** the pointer over a hot screen: its face turns toward it, the glare follows */
  function aim(it: Item, x: number, y: number) {
    const r = it.hang.getBoundingClientRect()
    const u = Math.min(1, Math.max(0, (x - r.left) / (r.width || 1)))
    const v = Math.min(1, Math.max(0, (y - r.top) / (it.screen.offsetHeight || 1)))
    const max = it.feat ? 5 : 7
    const s = tiltOf(it)
    s.trx = (0.5 - v) * 2 * max
    s.try = (u - 0.5) * 2 * max
    it.screen.style.setProperty('--gx', `${(u * 100).toFixed(1)}%`)
    it.screen.style.setProperty('--gy', `${(v * 100).toFixed(1)}%`)
    it.screen.style.setProperty('--sx', `${(110 - u * 80).toFixed(1)}%`)
  }

  function pointerMode(signal: AbortSignal) {
    const opt = { signal, passive: true } as const
    document.addEventListener(
      'pointermove',
      e => {
        if (e.pointerType !== 'mouse') return
        px = e.clientX
        py = e.clientY
        if (lampOn) lampMoving = true
        if (hot && e.target === hot.hit) aim(hot, px, py)
        kick()
      },
      opt,
    )
    for (const it of items) {
      it.hit.addEventListener(
        'pointerenter',
        e => {
          if (e.pointerType !== 'mouse') return
          const f = it.foot.getBoundingClientRect()
          setHot(it, 'screen', ((e.clientX - f.left) / (f.width || 1)) * 100)
          aim(it, e.clientX, e.clientY)
        },
        opt,
      )
      it.hit.addEventListener(
        'pointerleave',
        e => {
          if (e.pointerType === 'mouse' && hot === it && document.activeElement !== it.cta) unhot(it)
          it.screen.classList.remove('is-press')
        },
        opt,
      )
      it.cta.addEventListener('pointerenter', e => e.pointerType === 'mouse' && setHot(it, 'cta'), opt)
      it.cta.addEventListener('pointerleave', e => e.pointerType === 'mouse' && hot === it && document.activeElement !== it.cta && unhot(it), opt)
      // press: the glass gives, a ring of light spreads from the click (the link itself navigates)
      it.hit.addEventListener(
        'pointerdown',
        e => {
          if (e.pointerType !== 'mouse' || e.button !== 0) return
          it.screen.classList.add('is-press')
          const g = it.glass.getBoundingClientRect()
          it.glass.style.setProperty('--px', `${(e.clientX - g.left).toFixed(0)}px`)
          it.glass.style.setProperty('--py', `${(e.clientY - g.top).toFixed(0)}px`)
          if (!REDUCED_MOTION)
            it.ring.animate(
              [
                { transform: 'scale(1)', opacity: 0.6 },
                { transform: 'scale(28)', opacity: 0 },
              ],
              { duration: 600, easing: 'ease-out' },
            )
        },
        opt,
      )
      it.hit.addEventListener('pointerup', () => it.screen.classList.remove('is-press'), opt)
    }
    // the lamp: on while the pointer is over the wall
    if (lamp && !REDUCED_MOTION) {
      stage.addEventListener(
        'pointerenter',
        e => {
          if (e.pointerType !== 'mouse') return
          if (!lampOn) {
            // (it starts where the pointer is, not flying in from a corner)
            lx = px = e.clientX
            ly = py = e.clientY
            lamp.style.transform = `translate3d(${lx}px, ${ly}px, 0)`
          }
          lampOn = true
          lamp.classList.add('is-on')
        },
        opt,
      )
      stage.addEventListener(
        'pointerleave',
        e => {
          if (e.pointerType !== 'mouse') return
          lampOn = false
          lamp.classList.remove('is-on')
        },
        opt,
      )
    }
  }

  // touch: the pane nearest the middle of the screen is lit; panes lean as they pass
  const inView = new Set<Item>()
  const visIo = new IntersectionObserver(es => {
    for (const e of es) {
      const it = byLi.get(e.target as HTMLLIElement)
      if (!it) continue
      it.li.classList.toggle('is-vis', e.isIntersecting)
      if (e.isIntersecting) inView.add(it)
      else inView.delete(it)
    }
    if (mode === 'touch') scrollLight()
  })
  items.forEach(it => visIo.observe(it.li))
  let lit: Item | null = null
  const lastRx = new Map<Item, number>()
  let sraf = 0
  /*
   * Where each screen's middle sits on the page, read once and kept: a scroll frame then reads no
   * layout at all (a rect read there forced a style pass in the middle of every frame, on top of
   * whatever the entrances had just changed). Dropped whenever the page's layout can have moved:
   * the page or the stage resizes (fonts, a filter, the viewport), or the wall is told it moved.
   */
  const mids = new Map<Item, number>()
  const midOf = (it: Item) => {
    let m = mids.get(it)
    if (m === undefined) {
      m = it.li.getBoundingClientRect().top + scrollY + it.screen.offsetHeight / 2
      mids.set(it, m)
    }
    return m
  }
  const moved = new ResizeObserver(() => mids.clear())
  moved.observe(document.body)
  moved.observe(stage)
  const scrollLight = () => {
    if (!sraf)
      sraf = requestAnimationFrame(() => {
        sraf = 0
        if (mode !== 'touch') return
        const vh = innerHeight || 1
        const mid = scrollY + vh / 2
        let best: Item | null = null
        let bestD = 0.42
        // read every pane first, then write (a write between reads would force a style pass each)
        const read: [Item, number][] = []
        for (const it of inView) {
          if (it.li.hidden) continue
          read.push([it, Math.min(1, Math.max(-1, (midOf(it) - mid) / (vh / 2)))])
        }
        for (const [it, v] of read) {
          const rx = REDUCED_MOTION ? 0 : v * 3
          if (!SCROLL_LEAN && Math.abs((lastRx.get(it) ?? 0) - rx) > 0.05) {
            lastRx.set(it, rx)
            // (the transform itself, and the glare's own position: a custom property on the
            // screen would restyle its whole subtree every scroll frame)
            it.screen.style.transform = `perspective(1400px) rotateX(${rx.toFixed(2)}deg)`
            it.glare.style.setProperty('--gy', `${(50 - v * 60).toFixed(1)}%`)
          }
          if (Math.abs(v) < bestD && it.entered) {
            bestD = Math.abs(v)
            best = it
          }
        }
        if (best !== lit) {
          lit?.li.classList.remove('is-lit')
          lit = best
          lit?.li.classList.add('is-lit')
        }
      })
  }
  function touchMode(signal: AbortSignal) {
    addEventListener('scroll', scrollLight, { signal, passive: true })
    addEventListener(
      'resize',
      () => {
        mids.clear()
        scrollLight()
      },
      { signal, passive: true },
    )
    scrollLight()
  }

  // keyboard: a focused pill lights its pane (tilt 0, lifted, the glare high)
  stage.addEventListener('focusin', e => {
    const it = itemOf(e.target)
    if (it && e.target === it.cta) setHot(it, 'focus')
  })
  stage.addEventListener('focusout', e => {
    const it = itemOf(e.target)
    if (it && e.target === it.cta && hot === it) unhot(it)
  })

  function setMode() {
    const next = fine.matches && !REDUCED_MOTION ? 'pointer' : 'touch'
    if (next === mode && modeSet) return
    modeSet = true
    ac.abort()
    ac = new AbortController()
    mode = next
    // leave the other mode's light behind
    if (hot) unhot(hot)
    lit?.li.classList.remove('is-lit')
    lit = null
    lastRx.clear()
    lampOn = false
    lamp?.classList.remove('is-on')
    for (const it of items) {
      ;['--rx', '--ry', '--lift', '--gy', 'transform'].forEach(p => it.screen.style.removeProperty(p))
      it.glare.style.removeProperty('--gy')
    }
    tilts.forEach((_, it) => it.li.classList.remove('is-tilt'))
    tilts.clear()
    stage.classList.toggle('pf-touch', mode === 'touch' && SCROLL_LEAN)
    if (mode === 'pointer') pointerMode(ac.signal)
    else touchMode(ac.signal)
  }
  setMode()
  const onMode = () => setMode()
  if (typeof fine.addEventListener === 'function') fine.addEventListener('change', onMode)
  else fine.addListener?.(onMode)

  // ------------------------------------------------------------ the "More work" threshold: a neon sweep, once
  const more = stage.querySelector<HTMLElement>('.pf-room--more')
  const sweep = more?.querySelector<HTMLElement>('.pf-sweep > i')
  if (more && sweep && !REDUCED_MOTION) {
    const sio = new IntersectionObserver(
      es => {
        if (!es.some(e => e.isIntersecting && e.intersectionRatio >= 0.2)) return
        sio.disconnect()
        sweep.animate(
          [
            { transform: 'translateX(-40%)', opacity: 0 },
            { opacity: 1, offset: 0.1 },
            { opacity: 1, offset: 0.85 },
            { transform: 'translateX(250%)', opacity: 0 },
          ],
          { duration: 1100, easing: 'cubic-bezier(.5,0,.25,1)' },
        )
      },
      { threshold: 0.2 },
    )
    sio.observe(more)
  }

  return {
    items,
    visible,
    isTile,
    layout,
    enter,
    exit,
    retire,
    finishAll,
    refresh: () => {
      if (mode === 'touch') {
        mids.clear()
        lastRx.clear()
        scrollLight()
      }
    },
  }
}
