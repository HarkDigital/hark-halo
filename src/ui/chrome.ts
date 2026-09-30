import type { Engine, EngineState } from '../core/Engine'
import type { Frame } from '../core/types'
import type { Sound } from './sound'
import { BRAND } from '../content'
import { logoSvg } from './mark'
import { bindServicesMenu, servicesMenuItem } from './servicesMenu'
import { bindMenuSheet, menuButtonHtml, menuRowHtml, menuSheetHtml, sectionName } from './menuSheet'
import { mountRotateGate } from './rotate'
import { bindScene, holdScene, releaseScene } from './scene'
import { noteChapter } from './fallback'
import { REDUCED_MOTION } from '../kit/motion'

/*
 * Persistent chrome: black, and frosted glass. Minimal, cold, precise — the
 * placards in a black gallery.
 *
 *   top-left      the real Hark Digital logo (the mark, HARK, DIGITAL
 *                 DESIGN), white (→ the start)
 *   top-right     a frosted capsule: Work · Services · Contact (a hairline
 *                 comes into focus under the chapter you are in) and the
 *                 white "Start a project" pill. ≤ 720px: a "Menu" pill opens
 *                 the Menu sheet (ui/menuSheet.ts, shared with the service
 *                 pages; here with 'Read as a page' too). While it is up the
 *                 chapter layer underneath is hidden and the scene holds
 *                 still behind the frost.
 *   bottom-right  seven hairline pips (each a ≥ 24px button named for its
 *                 chapter; the current one a white bar). No readout text,
 *                 no switches: sound stays off (ui/sound.ts) and motion is
 *                 always on (kit/motion.ts).
 *   Read as a page  the static page (?read), opened at the chapter you are
 *                 on (?read#<id>, kept in step by update()). The last chrome
 *                 Tab stop, hidden until focused like a skip link; the Menu
 *                 sheet carries it too.
 *
 * Contrast: every text sits on a frosted fill dense enough (or a black scrim
 * band) for ≥ 4.5:1 over the brightest glass the scene can put behind it.
 * The always-visible chrome has no backdrop-filter (it would make the
 * compositor wait on every WebGL frame); only the menu sheet frosts for
 * real, and not under html.lowfx.
 *
 * API used by main.ts: createChrome(root, engine, sound) → { update(frame, state) }.
 * Navigation always uses engine.land(id) (lands on settled copy; long jumps cut).
 */

const NAV = ['services', 'work', 'contact']
const READ_LABEL = 'Read as a page'
/** the static page (main.ts renders the fallback for ?read; it scrolls to the #chapter) */
const readHref = (id: string) => `?read#${id}`

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

export function createChrome(root: HTMLElement, engine: Engine, sound: Sound) {
  const slots = engine.slots
  const total = slots.length
  const indexOf = (id: string) => slots.findIndex(s => s.def.id === id)
  const biz = sectionName
  const reduced = REDUCED_MOTION

  // the rotate card and the menu sheet both hold the scene still behind their
  // frost (ref-counted, so engine.paused = shown for either, and only wakes
  // once both have let go)
  bindScene(engine)
  mountRotateGate(shown => (shown ? holdScene('rotate') : releaseScene('rotate')))

  // ---------------------------------------------------------------- markup

  const brandInner = `<span class="ch-logo" aria-hidden="true">${logoSvg('ch-logo-svg')}</span>`

  // (Services carries the dropdown of the eleven service pages)
  const links = NAV.filter(id => indexOf(id) >= 0)
    .map(id => {
      const a = `<a class="ch-link" href="#${id}" data-go="${id}">${biz(id)}</a>`
      return id === 'services' ? servicesMenuItem(a) : `<li>${a}</li>`
    })
    .join('')

  const pips = slots
    .map(
      (s, i) =>
        `<li><button class="ch-pip" type="button" data-go="${s.def.id}" aria-label="${esc(biz(s.def.id, s.def.label))}: chapter ${i + 1} of ${total}, ${esc(s.def.label)}"><i aria-hidden="true"></i></button></li>`,
    )
    .join('')

  // the Menu sheet's rows: plain names, no numbers or chapter nicknames
  const menuItems = slots
    .map((s, i) => menuRowHtml({ id: s.def.id, name: biz(s.def.id, s.def.label), href: `#${s.def.id}`, go: true }, i))
    .join('')

  // motion follows the visitor's system setting (there is no switch)
  const motionOn = !reduced
  const first = slots[0]?.def.id ?? 'hero'

  root.innerHTML = `
  <div class="chr">
    <div class="ch-scrim ch-scrim--top" aria-hidden="true"></div>
    <div class="ch-scrim ch-scrim--bottom" aria-hidden="true"></div>
    <header class="ch-top">
      <a class="ch-brand" href="#hero" data-go="hero" aria-label="${esc(BRAND.name)}, back to the start">
        ${brandInner}
      </a>
      <nav class="ch-nav ch-chip" aria-label="Primary">
        <ul class="ch-links">${links}</ul>
        <a class="hud-btn ch-cta" href="#contact" data-go="contact" data-focus>Start a project</a>
      </nav>
      ${menuButtonHtml('ch-menu')}
    </header>

    <div class="ch-bottom">
      <div class="ch-prog">
        <nav class="ch-chapters" aria-label="Chapters"><ol class="ch-pips">${pips}</ol></nav>
      </div>
      <a class="ch-readpage" href="${readHref(first)}" data-read>${READ_LABEL}</a>
    </div>

    ${menuSheetHtml({
      id: 'ch-menu',
      rows: menuItems,
      foot: `<a class="hud-btn ch-menu-cta" href="#contact" data-go="contact">Start a project</a>
          <a class="hud-btn hud-btn--ghost ch-menu-read" href="${readHref(first)}" data-read>${READ_LABEL}</a>`,
    })}
  </div>`

  const $ = <T extends Element = HTMLElement>(s: string) => root.querySelector<T>(s)!
  const chr = $('.chr')
  bindServicesMenu(root)
  const top = $('.ch-top')
  const bottom = $('.ch-bottom')
  const menu = $('.ch-menu')
  const menuBtn = $<HTMLButtonElement>('.ch-top .ch-menu-btn')
  const navEls = [...root.querySelectorAll<HTMLAnchorElement>('.ch-link')]
  const pipEls = [...root.querySelectorAll<HTMLButtonElement>('.ch-pip')]
  const menuLinks = [...root.querySelectorAll<HTMLAnchorElement>('.ch-ml')]
  const readLinks = [...root.querySelectorAll<HTMLAnchorElement>('[data-read]')]

  // ---------------------------------------------------------------- navigation

  root.addEventListener('click', e => {
    const a = (e.target as Element).closest<HTMLElement>('[data-go]')
    if (!a || !root.contains(a)) return
    e.preventDefault()
    const id = a.dataset.go!
    const fromMenu = sheet.isOpen && menu.contains(a)
    if (sheet.isOpen) sheet.close(false)
    sound.blip(a.matches('.ch-cta, .ch-menu-cta') ? 5 : Math.max(0, indexOf(id)))
    if (indexOf(id) >= 0) engine.land(id)
    // keyboard activation (detail 0) hands focus on to the chapter's heading;
    // a tap in the sheet returns focus to Menu, the control that opened it
    // (no heading pill left floating over the scene for a pointer visitor)
    const keyboard = e.detail === 0
    if (keyboard && (fromMenu || a.matches('.ch-link, .ch-pip, .ch-brand') || a.hasAttribute('data-focus')))
      engine.focusChapter(id)
    else if (fromMenu) menuBtn.focus({ preventScroll: true })
  })

  let lastIndex = -1

  // -------------------------------------------------------------------- motion

  const syncMotion = () => {
    document.documentElement.classList.toggle('motion-off', !motionOn)
    engine.motion = motionOn
    chr.classList.toggle('is-still', !motionOn)
    window.dispatchEvent(new CustomEvent('hark:motion', { detail: { on: motionOn } }))
  }
  // --------------------------------------------------------------- menu sheet

  let stillTimer = 0
  const sheet = bindMenuSheet({
    sheet: menu,
    button: menuBtn,
    reduced: reduced || !motionOn,
    behind: () => [
      document.getElementById('stages'),
      document.getElementById('track'),
      document.querySelector<HTMLElement>('.skip-link'),
      top,
      bottom,
    ],
    // the chapter you are in
    focus: () => menuLinks[lastIndex] ?? menuLinks[0],
    onOpen: () => {
      // the chrome's own rows step aside (.chr.is-menu, ui.css; the chapter layer
      // underneath goes with html.menu-open, set by the sheet) and the frame is held
      // once the sheet is up (it frosts a still image)
      chr.classList.add('is-menu')
      engine.lenis.stop()
      clearTimeout(stillTimer)
      stillTimer = window.setTimeout(
        () => {
          if (sheet.isOpen) holdScene('menu')
        },
        reduced || !motionOn ? 0 : 420,
      )
    },
    onClose: () => {
      chr.classList.remove('is-menu')
      clearTimeout(stillTimer)
      releaseScene('menu')
      engine.lenis.start()
    },
  })

  syncMotion()

  // -------------------------------------------------------------------- update

  return {
    update(frame: Frame, state: EngineState) {
      const slot = state.slots[state.index]
      if (!slot) return

      if (state.index !== lastIndex) {
        lastIndex = state.index
        pipEls.forEach((p, i) => {
          p.classList.toggle('is-on', i === state.index)
          p.classList.toggle('is-past', i < state.index)
          if (i === state.index) p.setAttribute('aria-current', 'step')
          else p.removeAttribute('aria-current')
        })
        const activeId = slot.def.id
        navEls.forEach(a => {
          const on = a.dataset.go === activeId
          a.classList.toggle('is-active', on)
          if (on) a.setAttribute('aria-current', 'location')
          else a.removeAttribute('aria-current')
        })
        menuLinks.forEach((a, i) => {
          a.classList.toggle('is-now', i === state.index)
          if (i === state.index) a.setAttribute('aria-current', 'location')
          else a.removeAttribute('aria-current')
        })
        chr.dataset.chapter = activeId
        // Read as a page opens the static copy at the chapter you are on
        const href = readHref(activeId)
        for (const a of readLinks) a.setAttribute('href', href)
        noteChapter(activeId)
      }

    },
  }
}
