import type { WorkItem } from '../content'
import { countParts, type TagChip } from '../kit/work'
import { REDUCED_MOTION } from '../kit/motion'
import type { Item, Wall } from './wall'

/*
 * THE RAIL: a clear glass tube as wide as the wall, under the headline. It is
 * the filter: lit gas (white-hot, ringed in the three neons) sits under the
 * chosen tag and slides to the next one. It is never pinned: it sits above the
 * wall and scrolls away with the page like the rest of the content. Where the
 * chips don't fit (phones) they scroll sideways inside the tube (.is-scroll; the
 * gas rides with them, the tube's ends fade where there is more to see), and the
 * chosen one is brought into view.
 *
 * filterTo(slug), ~750ms, interruptible. The page never scrolls: the chips are
 * where the visitor left them (above the wall, which changes below them).
 *   0–200ms   the sites that don't match frost over and step back
 *   200ms     they leave the wall; the rest take their new places (FLIP: one
 *             uniform scale per screen, every screen is 16:10; placards only
 *             translate, or fade in where a prominent row changed sides), the rooms
 *             (a room the filter empties goes; with no prominent site left the grid
 *             follows the rail straight on, .is-solo) and the URL (?tag=,
 *             replaceState) update, the result ("7 sites, 1 featured, 6 more")
 *             is announced once to screen readers (no count is shown)
 *   220ms     the newcomers in view come in (the quick entrance)
 *   760ms     the stage lets go of its held height
 * A second click mid-swap finishes the first at once and starts from there.
 */

const EASE_OUT = 'cubic-bezier(.16,1,.3,1)'

export function mountRail(o: { wall: Wall; stage: HTMLElement; work: readonly WorkItem[]; chips: TagChip[]; initial: string }) {
  const { wall, stage } = o
  const rail = stage.querySelector<HTMLElement>('.pf-rail')
  const gas = stage.querySelector<HTMLElement>('.pf-gas')
  const live = document.getElementById('pf-live')
  const scroller = stage.querySelector<HTMLElement>('.pf-scroll')
  const feat = stage.querySelector<HTMLElement>('.pf-room--feat')
  const more = stage.querySelector<HTMLElement>('.pf-room--more')
  const chips = [...stage.querySelectorAll<HTMLButtonElement>('.pf-chip')]
  let slug = o.initial
  const matches = (w: WorkItem) => !slug || w.tags.some(t => o.chips.find(c => c.slug === slug)?.tag === t)

  // ------------------------------------------------------------ rooms, the announcement
  function writeState(announce: boolean) {
    const vis = wall.visible()
    const f = vis.filter(it => it.feat).length
    if (announce && live) live.textContent = countParts({ total: vis.length, featured: f, more: vis.length - f }).join(', ')
    if (feat) feat.hidden = !f
    if (more) {
      more.hidden = f === vis.length
      // no prominent site left above it: the grid follows the rail straight on, as the rows would
      more.classList.toggle('is-solo', !f)
    }
  }

  // ------------------------------------------------------------ the gas, and the chips' sideways scroll
  const pressed = () => chips.find(c => c.getAttribute('aria-pressed') === 'true') ?? chips[0]
  const placeGas = (slide: boolean) => {
    if (!rail || !gas) return
    const on = pressed()
    if (!on) return
    if (slide && !REDUCED_MOTION) {
      gas.style.willChange = 'transform'
      gas.addEventListener('transitionend', () => (gas.style.willChange = ''), { once: true })
    }
    // (the chips' offsetParent is the scroller, the gas's containing block: one frame for both)
    gas.style.setProperty('--gx', `${on.offsetLeft}px`)
    gas.style.setProperty('--gw', `${on.offsetWidth}px`)
  }
  /** the tube's ends fade where the chips run on past them */
  const fades = () => {
    if (!rail || !scroller) return
    const x = scroller.scrollLeft
    rail.classList.toggle('is-l', x > 1)
    rail.classList.toggle('is-r', x + scroller.clientWidth < scroller.scrollWidth - 1)
  }
  /** chips wider than the tube: they scroll inside it (the class clips them to it) */
  const fit = () => {
    if (!rail || !scroller) return
    rail.classList.toggle('is-scroll', scroller.scrollWidth > scroller.clientWidth + 1)
    fades()
  }
  /** the chosen chip (or the one focused by keyboard) into view, inside the tube only (the page never scrolls) */
  const reveal = (smooth: boolean, on: HTMLElement | undefined = pressed()) => {
    if (!scroller || !on || !rail?.classList.contains('is-scroll')) return
    // (clear of the tube's faded end: portfolio.css --pf-spill-x + 40px)
    const pad = 56
    const l = on.offsetLeft - pad
    const r = on.offsetLeft + on.offsetWidth + pad
    const x = scroller.scrollLeft
    const to = l < x ? l : r > x + scroller.clientWidth ? r - scroller.clientWidth : x
    if (Math.abs(to - x) > 0.5) scroller.scrollTo({ left: Math.max(0, to), behavior: smooth && !REDUCED_MOTION ? 'smooth' : 'auto' })
  }
  /** focused by keyboard (Safari before 15.4 has no :focus-visible; it never focuses a clicked button) */
  const focusVisible = (el: Element) => {
    try {
      return el.matches(':focus-visible')
    } catch {
      return true
    }
  }
  const press = () => chips.forEach(c => c.setAttribute('aria-pressed', String((c.dataset.tag ?? '') === slug)))

  if (rail) {
    // (a resize can turn the sideways scroll on: a phone turned upright, a window narrowed. The
    // chosen chip is brought back into view; the tube's width changing is no scroll of the visitor's)
    new ResizeObserver(() => {
      fit()
      placeGas(false)
      reveal(false)
    }).observe(rail)
    void document.fonts?.ready.then(() => {
      fit()
      placeGas(false)
      reveal(false)
    })
  }
  scroller?.addEventListener('scroll', fades, { passive: true })
  // a chip focused by keyboard comes in clear of the faded ends. (The browser's own focus scroll
  // leaves a chip that is partly in view where it is, under the fade; scroll-margin can't help.)
  // After that scroll, a frame on; never for a click's focus (a chip moving under the pointer
  // between press and release would lose the click; a click reveals its chip anyway)
  scroller?.addEventListener('focusin', e => {
    const c = (e.target as Element | null)?.closest<HTMLElement>('.pf-chip')
    if (!c || !focusVisible(c)) return
    requestAnimationFrame(() => document.activeElement === c && reveal(true, c))
  })

  // ------------------------------------------------------------ filter
  interface Step {
    at: number
    /** on time */
    run: () => void
    /** at once (a second click mid-swap) */
    now: () => void
  }
  interface Swap {
    timers: number[]
    anims: Animation[]
    steps: Step[]
  }
  let swap: Swap | null = null
  const finishSwap = () => {
    const s = swap
    if (!s) return
    swap = null
    s.timers.forEach(clearTimeout)
    // its remaining steps, in order, at once
    s.steps.splice(0).forEach(p => p.now())
    // (a cancelled one stays cancelled: finishing it would bring its end back)
    s.anims.forEach(a => a.playState === 'idle' || a.finish())
    wall.finishAll()
  }

  function setUrl() {
    const u = new URL(location.href)
    if (slug) u.searchParams.set('tag', slug)
    else u.searchParams.delete('tag')
    history.replaceState(history.state, '', u)
  }

  function filterTo(next: string) {
    finishSwap()
    const tag = o.chips.find(c => c.slug === next)?.tag
    // (can't be empty: every chip matches minTag sites; a filter that would leave nothing is All)
    slug = tag && o.work.some(w => w.tags.includes(tag)) ? next : ''
    press()
    placeGas(true)
    reveal(true)

    const s: Swap = { timers: [], anims: [], steps: [] }
    swap = s
    // (a preview playing on a pane that is about to leave or move: frozen and faded first)
    wall.still()
    wall.finishAll()
    const vis = wall.visible()
    const y0 = scrollY
    const first = new Map<Item, { hang: DOMRect; plac: DOMRect }>()
    for (const it of vis) first.set(it, { hang: it.hang.getBoundingClientRect(), plac: it.plac.getBoundingClientRect() })
    stage.style.minHeight = `${stage.offsetHeight}px`
    const leavers = vis.filter(it => !matches(it.w))
    const stayers = vis.filter(it => matches(it.w))
    const newcomers = wall.items.filter(it => it.li.hidden && matches(it.w))
    s.anims.push(...wall.exit(leavers))

    const relayout = (animate: boolean) => {
      wall.retire(leavers)
      for (const it of newcomers) {
        it.li.hidden = false
        it.held = true
      }
      wall.layout()
      writeState(true)
      setUrl()
      // FLIP the stayers to their new places (page coordinates: a scroll meanwhile is no move)
      const dy0 = scrollY - y0
      if (animate)
        stayers.forEach((it, j) => {
          const a = first.get(it)!
          const hb = it.hang.getBoundingClientRect()
          const pb = it.plac.getBoundingClientRect()
          const dx = a.hang.left - hb.left
          const dy = a.hang.top - hb.top - dy0
          const sc = a.hang.width / (hb.width || 1)
          if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(sc - 1) < 0.002) return
          const t = { duration: 480, delay: j * 20, easing: EASE_OUT, fill: 'backwards' as const }
          s.anims.push(
            it.hang.animate(
              [
                { transformOrigin: '0 0', transform: `translate(${dx}px, ${dy}px) scale(${sc})` },
                { transformOrigin: '0 0', transform: 'none' },
              ],
              t,
            ),
          )
          // placards only move (text is never scaled); one that changed width fades in at its new
          // place, as does a phone tile's (moved, it would hold its stretched pill to the placard),
          // and a prominent site's that changed sides (moved, it would cross its own screen)
          const sided = it.feat && Math.abs(a.plac.left - pb.left) > 1
          if (Math.abs(a.plac.width - pb.width) < 1 && !wall.isTile(it) && !sided)
            s.anims.push(it.plac.animate([{ transform: `translate(${a.plac.left - pb.left}px, ${a.plac.top - pb.top - dy0}px)` }, { transform: 'none' }], t))
          else s.anims.push(it.plac.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, delay: 240, easing: 'ease', fill: 'backwards' }))
        })
      wall.refresh()
    }
    // the newcomers in view come in (quick, 40ms apart); the rest as they are scrolled to. Any
    // part in view counts: a row whose stayers are already lit never shows a hole waiting for
    // the entrance line
    const arrive = () => {
      const vh = innerHeight
      const inView = newcomers.filter(it => {
        const r = it.li.getBoundingClientRect()
        return r.top < vh && r.bottom > 0
      })
      newcomers.forEach(it => (it.held = false))
      wall.enter(inView, 'quick', 40)
    }
    const release = () => (stage.style.minHeight = '')

    const gap = leavers.length && !REDUCED_MOTION ? 200 : 0
    s.steps = [
      { at: gap, run: () => relayout(!REDUCED_MOTION), now: () => relayout(false) },
      { at: gap + 20, run: arrive, now: arrive },
      { at: REDUCED_MOTION ? 0 : 760, run: release, now: release },
    ]
    for (const p of s.steps)
      s.timers.push(
        window.setTimeout(() => {
          const k = s.steps.indexOf(p)
          if (k < 0) return
          s.steps.splice(k, 1)
          p.run()
          if (!s.steps.length && swap === s) swap = null
        }, p.at),
      )
  }

  chips.forEach(c => c.addEventListener('click', () => filterTo(c.dataset.tag ?? '')))

  // the page as it loads: the filter from ?tag= already applied (no animation, no announcement)
  press()
  writeState(false)
  fit()
  placeGas(false)
  reveal(false)
  requestAnimationFrame(() => requestAnimationFrame(() => gas?.classList.add('is-placed')))

  return { filterTo }
}
