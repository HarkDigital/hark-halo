import { SERVICES, serviceUrl } from '../content'

/*
 * The header's SERVICES DROPDOWN (the story's chrome and every service page):
 * the Services link stays what it was (the chapter, or back to it); a small
 * chevron beside it opens a frosted list of the eleven service pages.
 *
 * Opens on hover for a mouse, and on the chevron (click / Enter / Space) for
 * everyone; Escape closes it and returns focus to the chevron, as does a click
 * or focus anywhere else. The chevron carries aria-expanded / aria-controls;
 * the list's entries are plain links (the current page marked aria-current).
 */

let uid = 0
const CHEVRON = `<svg viewBox="0 0 10 6" aria-hidden="true" focusable="false"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

/** The nav item: `link` (the Services link's own markup) + the chevron + the list. */
export function servicesMenuItem(link: string, current?: string): string {
  const id = `ch-dd-${++uid}`
  const items = SERVICES.map(
    s =>
      `<li><a class="ch-dd-a" href="${serviceUrl(s.slug)}"${s.slug === current ? ' aria-current="page"' : ''}>${esc(s.title)}</a></li>`,
  ).join('')
  return `<li class="ch-dd">${link}<button class="ch-dd-btn" type="button" aria-expanded="false" aria-controls="${id}" aria-label="Service pages">${CHEVRON}</button><div class="ch-dd-panel" id="${id}"><ul class="ch-dd-list">${items}</ul></div></li>`
}

/** Wire every dropdown under `root`. */
export function bindServicesMenu(root: ParentNode) {
  for (const li of root.querySelectorAll<HTMLElement>('.ch-dd')) {
    const btn = li.querySelector<HTMLButtonElement>('.ch-dd-btn')
    if (!btn) continue
    let closeT = 0
    // opened by the mouse hovering: a click on the chevron then keeps it open instead of toggling it shut
    let byHover = false
    const isOpen = () => li.classList.contains('is-open')
    const set = (open: boolean) => {
      window.clearTimeout(closeT)
      if (!open) byHover = false
      li.classList.toggle('is-open', open)
      btn.setAttribute('aria-expanded', String(open))
    }
    btn.addEventListener('click', e => {
      e.stopPropagation()
      if (byHover && isOpen()) byHover = false
      else set(!isOpen())
    })
    // Escape closes it wherever focus is (focus returns to the chevron if it was inside)
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape' || !isOpen()) return
      const inside = li.contains(document.activeElement)
      set(false)
      if (inside) btn.focus()
    })
    li.addEventListener('focusout', e => {
      if (!li.contains(e.relatedTarget as Node | null)) set(false)
    })
    document.addEventListener('click', e => {
      if (!li.contains(e.target as Node)) set(false)
    })
    // a mouse opens it by hovering (a short grace period to cross the gap to the list)
    li.addEventListener('pointerenter', e => {
      if (e.pointerType !== 'mouse') return
      if (!isOpen()) byHover = true
      set(true)
    })
    li.addEventListener('pointerleave', e => {
      if (e.pointerType !== 'mouse') return
      window.clearTimeout(closeT)
      closeT = window.setTimeout(() => {
        if (!li.contains(document.activeElement)) set(false)
      }, 200)
    })
  }
}
