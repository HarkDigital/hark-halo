import type { WorkItem } from '../content'
import { countParts, moreTitleHtml, type TagChip } from '../kit/work'
import { REDUCED_MOTION } from '../kit/motion'
import { rise } from '../core/rise'
import type { Item, Wall } from './wall'

/*
 * THE RAIL: a clear glass tube as wide as the wall, under the headline. It is
 * the filter: lit gas (white-hot, ringed in the three neons) sits under the
 * chosen tag and slides to the next one. It sticks under the header as you
 * scroll the wall (an opaque band behind it, so no screenshot ever shows
 * through the chips or the logo) and leaves with the last room.
 *
 * filterTo(slug), ~750ms, interruptible:
 *   0ms       with the rail stuck, the page starts gliding back up to the result's
 *             start (just under the rail, still stuck) as the leavers go
 *   0–200ms   the sites that don't match frost over and step back
 *   200ms     they leave the wall; the rest take their new places (FLIP: one
 *             uniform scale per screen, every screen is 16:10; placards only
 *             translate), the counts, the More room's heading and the URL
 *             (?tag=, replaceState) update, the result is announced once
 *   220ms     the newcomers in view (where the page is headed) come in (the quick entrance)
 *   760ms     the stage lets go of its held height
 * A second click mid-swap finishes the first at once and starts from there.
 */

const EASE_OUT = 'cubic-bezier(.16,1,.3,1)'
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
const countHtml = (parts: string[]) => parts.map(s => `<span>${esc(s)}</span>`).join('<i aria-hidden="true"></i>')

export function mountRail(o: { wall: Wall; stage: HTMLElement; work: readonly WorkItem[]; chips: TagChip[]; initial: string }) {
  const { wall, stage } = o
  const bar = stage.querySelector<HTMLElement>('.pf-bar')
  const rail = stage.querySelector<HTMLElement>('.pf-rail')
  const gas = stage.querySelector<HTMLElement>('.pf-gas')
  const live = document.getElementById('pf-live')
  const counts = [...document.querySelectorAll<HTMLElement>('.pf-count')]
  const feat = stage.querySelector<HTMLElement>('.pf-room--feat')
  const more = stage.querySelector<HTMLElement>('.pf-room--more')
  const moreEye = more?.querySelector<HTMLElement>('.hud-eyebrow')
  const moreH = more?.querySelector<HTMLElement>('.pf-more-h')
  const chips = [...stage.querySelectorAll<HTMLButtonElement>('.pf-chip')]
  let slug = o.initial
  const matches = (w: WorkItem) => !slug || w.tags.some(t => o.chips.find(c => c.slug === slug)?.tag === t)

  // ------------------------------------------------------------ counts, rooms
  function writeState(announce: boolean) {
    const vis = wall.visible()
    const f = vis.filter(it => it.feat).length
    const parts = countParts({ total: vis.length, featured: f, more: vis.length - f })
    counts.forEach(c => (c.innerHTML = countHtml(parts)))
    if (announce && live) live.textContent = parts.join(', ')
    const rest = vis.filter(it => !it.feat)
    if (feat) feat.hidden = !f
    if (more && moreEye && moreH) {
      more.hidden = !rest.length
      // no featured site: the room follows the rail straight on, unheaded
      const solo = !f
      moreEye.hidden = solo
      moreH.hidden = solo || rest.length < 2
      if (moreH.hidden) {
        more.removeAttribute('aria-labelledby')
        more.setAttribute('aria-label', 'More work')
      } else {
        more.removeAttribute('aria-label')
        more.setAttribute('aria-labelledby', 'pf-more-h')
        const html = moreTitleHtml(rest.map(it => it.w))
        if (moreH.dataset.html !== html) {
          moreH.dataset.html = html
          // on load it is written plain (the page's reveals bring it in); after a filter, at once
          if (announce) {
            rise(moreH, html)
            moreH.classList.add('is-in')
          } else moreH.innerHTML = html
        }
      }
    }
  }

  // ------------------------------------------------------------ the gas
  const placeGas = (slide: boolean) => {
    if (!rail || !gas) return
    const on = chips.find(c => c.getAttribute('aria-pressed') === 'true') ?? chips[0]
    if (!on) return
    if (slide && !REDUCED_MOTION) {
      gas.style.willChange = 'transform'
      gas.addEventListener('transitionend', () => (gas.style.willChange = ''), { once: true })
    }
    gas.style.setProperty('--gx', `${on.offsetLeft}px`)
    gas.style.setProperty('--gw', `${on.offsetWidth}px`)
  }
  const press = () => chips.forEach(c => c.setAttribute('aria-pressed', String((c.dataset.tag ?? '') === slug)))

  // tight: the count leaves the tube for the hero when chips + count don't fit
  const tight = () => {
    if (!rail) return
    const railCount = rail.querySelector<HTMLElement>('.pf-count--rail')
    const chipsEl = rail.querySelector<HTMLElement>('.pf-chips')
    if (!railCount || !chipsEl) return
    document.body.classList.remove('pf-tight')
    const need = chipsEl.offsetWidth + railCount.offsetWidth + 40
    document.body.classList.toggle('pf-tight', need > rail.clientWidth)
  }
  if (rail) {
    new ResizeObserver(() => {
      tight()
      placeGas(false)
    }).observe(rail)
    void document.fonts?.ready.then(() => {
      tight()
      placeGas(false)
    })
  } else document.body.classList.add('pf-norail')

  // ------------------------------------------------------------ stuck
  const sentinel = stage.querySelector<HTMLElement>('.pf-sentinel')
  if (bar && sentinel) {
    let sio: IntersectionObserver | null = null
    let lastTop = -1
    const watchStuck = () => {
      const top = Math.round(parseFloat(getComputedStyle(bar).top) || 0)
      if (top === lastTop) return
      lastTop = top
      sio?.disconnect()
      sio = new IntersectionObserver(
        ([e]) => bar.classList.toggle('is-stuck', !e.isIntersecting && e.boundingClientRect.top < top + 1),
        { rootMargin: `-${top + 1}px 0px 0px 0px` },
      )
      sio.observe(sentinel)
    }
    watchStuck()
    addEventListener('resize', watchStuck, { passive: true })
  }
  // focus never lands under the stuck rail (scroll-margin does this; this is the backstop)
  stage.addEventListener('focusin', e => {
    if (!bar?.classList.contains('is-stuck')) return
    const t = e.target as HTMLElement
    if (!t.closest('.pf-wall')) return
    const floor = bar.getBoundingClientRect().bottom + 8
    const r = t.getBoundingClientRect()
    if (r.top < floor) scrollBy({ top: r.top - floor - 16 })
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

  /**
   * Where the result starts with the rail stuck: the first room's top under the
   * rail (its scroll-margin), and never above the line where the bar sticks. The
   * featured room begins right at the rail, so its scroll-margin alone lands 24px
   * short of that line: the bar would come unstuck and the page settle with the
   * headline under the header.
   */
  const resultTop = () => {
    const room = [feat, more].find(r => r && !r.hidden)
    const barTop = parseFloat(getComputedStyle(bar!).top) || 0
    const stick = sentinel ? Math.ceil(sentinel.getBoundingClientRect().top + scrollY - barTop) + 1 : 0
    const at = room ? room.getBoundingClientRect().top + scrollY - (parseFloat(getComputedStyle(room).scrollMarginTop) || 0) : stick
    return Math.max(stick, Math.round(at))
  }
  /** the page glides back to the result's start (only ever up to it: the rail stays stuck) */
  const glideTo = (top: number) => {
    if (Math.abs(top - scrollY) > 1) scrollTo({ top, behavior: 'smooth' })
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

    const s: Swap = { timers: [], anims: [], steps: [] }
    swap = s
    wall.finishAll()
    const vis = wall.visible()
    const y0 = scrollY
    // the rail is stuck: the page heads back up to the result's start as the leavers go (the
    // featured room stays where it is when it keeps a site; otherwise the relayout aims it)
    const stuck = !REDUCED_MOTION && !!bar?.classList.contains('is-stuck')
    const keepsFeat = !!feat && !feat.hidden && o.work.some(w => w.featured && matches(w))
    let land: number | null = stuck && keepsFeat ? resultTop() : null
    if (land !== null) glideTo(land)
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
          // place, as does a phone tile's (moved, it would hold its stretched pill to the placard)
          if (Math.abs(a.plac.width - pb.width) < 1 && !wall.isTile(it))
            s.anims.push(it.plac.animate([{ transform: `translate(${a.plac.left - pb.left}px, ${a.plac.top - pb.top - dy0}px)` }, { transform: 'none' }], t))
          else s.anims.push(it.plac.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, delay: 240, easing: 'ease', fill: 'backwards' }))
        })
      wall.refresh()
      // the rail is stuck: bring the result's start back up under it
      if (animate && stuck) {
        const top = resultTop()
        if (land === null || Math.abs(top - land) > 1) glideTo(top)
        land = top
      }
    }
    // the newcomers in view come in (quick, 40ms apart), in view where the page is headed; the
    // rest as they are scrolled to. Any part in view counts: a row whose stayers are already
    // lit never shows a hole waiting for the entrance line
    const arrive = () => {
      const vh = innerHeight
      const dy = land === null ? 0 : scrollY - land
      const inView = newcomers.filter(it => {
        const r = it.li.getBoundingClientRect()
        return r.top + dy < vh && r.bottom + dy > 0
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
  placeGas(false)
  requestAnimationFrame(() => requestAnimationFrame(() => gas?.classList.add('is-placed')))

  return { filterTo }
}
