import { INDUSTRIES, SERVICES, industryUrl, serviceUrl } from '../content'

/*
 * The header's DROPDOWNS (the story's chrome and every plain page): Services
 * and Industries. The link stays what it was (the chapter, or back to it; the
 * industries index); a small chevron beside it opens a frosted list of the
 * pages (dropdownItem, for any list; servicesMenuItem / industriesMenuItem).
 *
 * On phones: the Menu sheet (ui/menuSheet.ts, the story's and every plain
 * page's) opens the same list under the row (servicesMenuSub / industriesMenuSub).
 *
 * Opens on hover for a mouse, and on the chevron (click / Enter / Space) for
 * everyone; Escape closes it and returns focus to the chevron, as does a click
 * or focus anywhere else. The chevron carries aria-expanded / aria-controls;
 * the list's entries are plain links (the current page marked aria-current).
 */

let uid = 0
const CHEVRON = `<svg viewBox="0 0 10 6" aria-hidden="true" focusable="false"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
export interface DropEntry {
  slug: string
  title: string
  href: string
}
const entries = (cls: string, list: DropEntry[], current?: string) =>
  list.map(e => `<li><a class="${cls}" href="${e.href}"${e.slug === current ? ' aria-current="page"' : ''}>${esc(e.title)}</a></li>`).join('')

/** the service pages, and the industry pages, as a dropdown's entries */
export const serviceEntries = (): DropEntry[] => SERVICES.map(s => ({ slug: s.slug, title: s.title, href: serviceUrl(s.slug) }))
export const industryEntries = (): DropEntry[] => INDUSTRIES.map(i => ({ slug: i.slug, title: i.title, href: industryUrl(i.slug) }))

/** The nav item: `link` (the link's own markup) + the chevron (named `label`) + the list (`current` marked). */
export function dropdownItem(o: { link: string; label: string; entries: DropEntry[]; current?: string }): string {
  const id = `ch-dd-${++uid}`
  return `<li class="ch-dd">${o.link}<button class="ch-dd-btn" type="button" data-dd-toggle aria-expanded="false" aria-controls="${id}" aria-label="${esc(o.label)}">${CHEVRON}</button><div class="ch-dd-panel" id="${id}"><ul class="ch-dd-list">${entries('ch-dd-a', o.entries, o.current)}</ul></div></li>`
}

/** The Menu sheet: a chevron on a row that opens the list beneath it (`current`: this page). */
export function dropdownSub(o: { label: string; entries: DropEntry[]; current?: string }): string {
  const id = `ch-ml-sub-${++uid}`
  return `<button class="ch-ml-more" type="button" aria-expanded="false" aria-controls="${id}" aria-label="${esc(o.label)}">${CHEVRON}</button><ul class="ch-ml-sub" id="${id}" hidden>${entries('ch-ml-sa', o.entries, o.current)}</ul>`
}

export const servicesMenuItem = (link: string, current?: string) => dropdownItem({ link, label: 'Service pages', entries: serviceEntries(), current })
export const servicesMenuSub = (current?: string) => dropdownSub({ label: 'Service pages', entries: serviceEntries(), current })
export const industriesMenuItem = (link: string, current?: string) => dropdownItem({ link, label: 'Industry pages', entries: industryEntries(), current })
export const industriesMenuSub = (current?: string) => dropdownSub({ label: 'Industry pages', entries: industryEntries(), current })

/** Wire the Menu sheet's sub-lists (plain disclosures). */
export function bindServicesSub(root: ParentNode) {
  for (const btn of root.querySelectorAll<HTMLButtonElement>('.ch-ml-more')) {
    const list = document.getElementById(btn.getAttribute('aria-controls') ?? '')
    if (!list) continue
    btn.addEventListener('click', e => {
      e.stopPropagation()
      const open = btn.getAttribute('aria-expanded') !== 'true'
      btn.setAttribute('aria-expanded', String(open))
      list.hidden = !open
    })
  }
}

/** Wire every dropdown under `root`. */
export function bindServicesMenu(root: ParentNode) {
  for (const li of root.querySelectorAll<HTMLElement>('.ch-dd')) {
    const btn = li.querySelector<HTMLButtonElement>('[data-dd-toggle]')
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
