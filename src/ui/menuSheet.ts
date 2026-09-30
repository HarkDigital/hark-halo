import { BRAND } from '../content'
import { logoSvg, markOutlineSvg } from './mark'
import { bindServicesSub, servicesMenuSub } from './servicesMenu'
import { holdInert, releaseInert } from './inert'

/*
 * The phone MENU SHEET (≤ 720px), shared by the story (ui/chrome.ts) and every
 * service page (service/main.ts). A "Menu" pill opens a full-screen black
 * frosted sheet, a real modal dialog (focus trap, Escape, the layers behind
 * it inert with a fallback, focus back to Menu on close): the sections as big
 * plain names (Services opens the eleven service pages beneath it; the
 * section you are in is lit, italic with a glass bead), 'Start a project'
 * (and the host's own extra button), the address, and the mark drawn as a
 * hairline behind it all.
 */

/** the sections, in the story's order, by their plain business names */
export const SECTIONS: readonly { id: string; name: string }[] = [
  { id: 'hero', name: 'Home' },
  { id: 'services', name: 'Services' },
  { id: 'process', name: 'Process' },
  { id: 'work', name: 'Work' },
  { id: 'voices', name: 'Clients' },
  { id: 'shield', name: 'Security' },
  { id: 'contact', name: 'Contact' },
]
export const sectionName = (id: string, fallback = '') => SECTIONS.find(s => s.id === id)?.name ?? fallback

export interface MenuRow {
  id: string
  name: string
  href: string
  /** the story moves itself (data-go, ui/chrome.ts); elsewhere the link is simply followed */
  go?: boolean
  /** lit as the section you are in */
  now?: boolean
}

const MENU_QUERY = '(max-width: 720px)'
const MENU_IC = `<svg class="ch-ic" viewBox="0 0 18 12" aria-hidden="true" focusable="false"><path d="M2 3.5h14M5 8.5h11"/></svg>`
const CLOSE_IC = `<svg class="ch-ic" viewBox="0 0 18 12" aria-hidden="true" focusable="false"><path d="M4.5 1.5l9 9M13.5 1.5l-9 9"/></svg>`
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

/** the "Menu" pill (shown ≤ 720px by the host's CSS) */
export function menuButtonHtml(sheetId: string): string {
  return `<button class="ch-menu-btn ch-chip" type="button" aria-expanded="false" aria-controls="${sheetId}" aria-haspopup="dialog"><span class="ch-menu-t">Menu</span>${MENU_IC}</button>`
}

/** one section row (`now`: the section you are in; `current`: this service page, in the sub-list) */
export function menuRowHtml(r: MenuRow, i: number, current?: string): string {
  const more = r.id === 'services'
  const now = r.now ? ' is-now' : ''
  // as the story's update() marks the chapter you are on (ui/chrome.ts)
  const cur = r.now ? ' aria-current="location"' : ''
  const go = r.go ? ` data-go="${r.id}"` : ''
  return `<li style="--i:${i}"${more ? ' class="ch-ml-li--more"' : ''}><a class="ch-ml${now}" href="${r.href}"${go}${cur}><span class="ch-ml-name">${esc(r.name)}</span></a>${more ? servicesMenuSub(current) : ''}</li>`
}

/** the sheet itself (hidden until opened); `rows` from menuRowHtml, `foot` its buttons */
export function menuSheetHtml(o: { id: string; rows: string; foot: string }): string {
  return `
    <div class="ch-menu" id="${o.id}" role="dialog" aria-modal="true" aria-labelledby="${o.id}-title" data-lenis-prevent hidden>
      <div class="ch-menu-mark" aria-hidden="true">${markOutlineSvg('ch-menu-mark-svg', 5)}</div>
      <div class="ch-menu-top">
        <span class="ch-brand ch-menu-brand" aria-hidden="true"><span class="ch-logo">${logoSvg('ch-logo-svg')}</span></span>
        <button class="ch-menu-btn ch-menu-close ch-chip" type="button">
          <span class="ch-menu-t">Close</span>${CLOSE_IC}
        </button>
      </div>
      <div class="ch-menu-body">
        <p class="hud-eyebrow ch-menu-eyebrow" id="${o.id}-title">Menu</p>
        <nav class="ch-menu-nav" aria-label="Chapters"><ol class="ch-menu-list">${o.rows}</ol></nav>
        <div class="ch-menu-foot">${o.foot}</div>
        <p class="ch-menu-mail"><a href="mailto:${BRAND.email}">${BRAND.email}</a></p>
      </div>
    </div>`
}

export interface MenuSheet {
  readonly isOpen: boolean
  open(): void
  close(restoreFocus?: boolean): void
}

/**
 * Wire a sheet and its Menu pill. `behind`: the layers made inert while it is
 * up; `focus`: where focus goes on open (default the lit row, else the first);
 * onOpen / onClose: the host's own holds (the story stills its scene).
 */
export function bindMenuSheet(o: {
  sheet: HTMLElement
  button: HTMLButtonElement
  behind: () => Iterable<HTMLElement | null | undefined>
  reduced: boolean
  focus?: () => HTMLElement | null | undefined
  onOpen?: () => void
  onClose?: () => void
}): MenuSheet {
  const { sheet, button } = o
  const close = sheet.querySelector<HTMLButtonElement>('.ch-menu-close')!
  bindServicesSub(sheet)
  let isOpen = false
  let hideTimer = 0
  const focusables = () =>
    [...sheet.querySelectorAll<HTMLElement>('a[href], button')].filter(el => !el.hidden && el.getClientRects().length > 0)

  const open = () => {
    if (isOpen) return
    isOpen = true
    clearTimeout(hideTimer)
    sheet.hidden = false
    // flush the closed state so the entrance runs
    void sheet.offsetWidth
    sheet.classList.add('is-open')
    document.documentElement.classList.add('menu-open')
    button.setAttribute('aria-expanded', 'true')
    holdInert('menu', o.behind())
    o.onOpen?.()
    sheet.scrollTop = 0
    const first = o.focus?.() ?? sheet.querySelector<HTMLElement>('.ch-ml.is-now') ?? sheet.querySelector<HTMLElement>('.ch-ml')
    first?.focus({ preventScroll: true })
  }
  const hide = (restoreFocus = true) => {
    if (!isOpen) return
    isOpen = false
    clearTimeout(hideTimer)
    sheet.classList.remove('is-open')
    document.documentElement.classList.remove('menu-open')
    button.setAttribute('aria-expanded', 'false')
    releaseInert('menu')
    o.onClose?.()
    hideTimer = window.setTimeout(
      () => {
        if (!isOpen) sheet.hidden = true
      },
      o.reduced ? 20 : 360,
    )
    if (restoreFocus) button.focus({ preventScroll: true })
  }

  button.addEventListener('click', () => (isOpen ? hide() : open()))
  close.addEventListener('click', () => hide())
  // capture: the dialog's own trap runs ahead of the no-`inert` fallback in inert.ts
  window.addEventListener(
    'keydown',
    e => {
      if (!isOpen) return
      if (e.key === 'Escape') {
        e.preventDefault()
        hide()
      } else if (e.key === 'Tab') {
        const f = focusables()
        if (!f.length) return
        const i = f.indexOf(document.activeElement as HTMLElement)
        const next = e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : i < 0 || i === f.length - 1 ? 0 : i + 1
        e.preventDefault()
        f[next].focus()
      }
    },
    true,
  )
  // wider than a phone: the sheet has no place (the full nav is back)
  const narrow = matchMedia(MENU_QUERY)
  const onNarrow = (e: MediaQueryListEvent) => {
    if (!e.matches) hide(false)
  }
  if (typeof narrow.addEventListener === 'function') narrow.addEventListener('change', onNarrow)
  else narrow.addListener?.(onNarrow)
  // a row that leaves the page (a service page, the story, 'Read as a page') would keep the
  // sheet up in the back/forward cache: shut it at once, so the way back lands on the page
  const shut = () => {
    if (!isOpen) return
    hide(sheet.contains(document.activeElement))
    clearTimeout(hideTimer)
    sheet.hidden = true
  }
  window.addEventListener('pagehide', shut)
  window.addEventListener('pageshow', e => {
    if (e.persisted) shut()
  })

  return {
    get isOpen() {
      return isOpen
    },
    open,
    close: hide,
  }
}
