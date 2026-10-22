import { BRAND, CONTACT, INDUSTRIES, industriesUrl, industryUrl, portfolioUrl, termsUrl } from '../content'
import { directHtml } from '../kit/contact'
import { createContactForm } from '../ui/contactForm'
import { mountNeonFrame } from '../service/neonFrame'
import { logoSvg } from '../ui/mark'
import { bindServicesMenu, industriesMenuItem, industriesMenuSub, servicesMenuItem, servicesMenuSub } from '../ui/servicesMenu'
import { SECTIONS, bindMenuSheet, menuButtonHtml, menuRowHtml, menuSheetHtml, type MenuRow, type MenuSheet } from '../ui/menuSheet'
import { SERVICE_PAGES } from '../service/data/pages'
import { REDUCED_MOTION } from '../kit/motion'
import { rise } from '../core/rise'

/*
 * THE PAGE SHELL: the chrome every plain page shares (the service pages,
 * src/service/main.ts, the industry pages, src/industry/main.ts, the Portfolio,
 * src/portfolio/main.ts, and the terms, src/terms/main.ts). None of it touches three.js.
 *
 *   top       the brand tile (home) + Services (with its dropdown) · Industries
 *             (its dropdown; the link is the index) · Work · Contact + Start a
 *             project; on phones the story's Menu pill and sheet (ui/menuSheet.ts)
 *   contact   "Say hello." + the form (a service preselected on its own page)
 *             inside a card whose neon edge draws in on scroll
 *   footer    every service, every industry, the site's own pages (Terms & Privacy last), the logo, colophon
 *   reveals   the service pages' entrances (service.css .svc-rv kinds)
 *   spots     the frosted panels' cursor glow (service pages)
 *
 * Off the story, "Work" means the Portfolio page (portfolioUrl()); inside
 * the story (ui/chrome.ts) it stays the chapter. The page you are on is lit:
 * a service page lights Services (and returns to that service's plate), the
 * Portfolio lights Work (aria-current="page"), an industry page and the index light
 * Industries; the terms light nothing up top (their footer link carries aria-current).
 */

export type Current =
  | { kind: 'service'; slug: string; back: string }
  | { kind: 'industry'; slug: string }
  | { kind: 'industries' }
  | { kind: 'portfolio' }
  | { kind: 'terms' }
  | { kind: 'lab' }

const BASE = import.meta.env.BASE_URL
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
const serviceHref = (slug: string) => `${BASE}services/${slug}/`

/** Write #svc-top (header capsule + Menu pill + sheet) and wire it; `onOpen`/`onClose`: the host's holds. */
export function mountTop(o: { current: Current; onOpen?: () => void; onClose?: () => void }): MenuSheet {
  const cur = o.current
  const svc = cur.kind === 'service' ? cur : null
  const ind = cur.kind === 'industry' ? cur.slug : cur.kind === 'industries' ? '' : null
  const pf = cur.kind === 'portfolio'
  const work = portfolioUrl()

  // the Menu sheet's sections lead back into the story (Services to this service's plate);
  // Work is the Portfolio page; Industries (after Services, no chapter of its own) the index
  const rows: MenuRow[] = []
  for (const sec of SECTIONS) {
    rows.push({
      id: sec.id,
      name: sec.name,
      href: sec.id === 'hero' ? BASE : sec.id === 'services' && svc ? svc.back : sec.id === 'work' ? work : `${BASE}#${sec.id}`,
      now: svc ? sec.id === 'services' : pf && sec.id === 'work',
      ...(pf ? { current: 'page' as const } : {}),
      ...(sec.id === 'services' ? { sub: servicesMenuSub(svc?.slug) } : {}),
    })
    if (sec.id === 'services')
      rows.push({
        id: 'industries',
        name: 'Industries',
        href: industriesUrl(),
        now: ind !== null,
        ...(ind === '' ? { current: 'page' as const } : {}),
        sub: industriesMenuSub(ind ?? undefined),
      })
  }
  const menuRows = rows.map((r, k) => menuRowHtml(r, k)).join('')
  const services = svc
    ? `<a class="ch-link is-active" href="${svc.back}">Services</a>`
    : `<a class="ch-link" href="${BASE}#services">Services</a>`
  const industries =
    ind === ''
      ? `<a class="ch-link is-active" href="${industriesUrl()}" aria-current="page">Industries</a>`
      : `<a class="ch-link${ind ? ' is-active' : ''}" href="${industriesUrl()}">Industries</a>`
  const workLink = pf
    ? `<a class="ch-link is-active" href="${work}" aria-current="page">Work</a>`
    : `<a class="ch-link" href="${work}">Work</a>`
  const top = document.getElementById('svc-top')!
  top.innerHTML = `
    <header class="svc-top">
      <a class="ch-brand" href="${BASE}" aria-label="${esc(BRAND.name)}, home">
        <span class="ch-logo" aria-hidden="true">${logoSvg('ch-logo-svg')}</span>
      </a>
      <nav class="svc-nav ch-chip" aria-label="Primary">
        <ul class="ch-links">
          ${servicesMenuItem(services, svc?.slug)}
          ${industriesMenuItem(industries, ind ?? undefined)}
          <li>${workLink}</li>
          <li><a class="ch-link" href="${BASE}#contact">Contact</a></li>
        </ul>
        <a class="hud-btn ch-cta" href="#svc-contact">Start a project</a>
      </nav>
      ${menuButtonHtml('svc-menu')}
    </header>
    ${menuSheetHtml({ id: 'svc-menu', rows: menuRows, foot: `<a class="hud-btn ch-menu-cta" href="#svc-contact">Start a project</a>` })}`

  bindServicesMenu(top)
  const menuEl = document.getElementById('svc-menu')!
  const menu = bindMenuSheet({
    sheet: menuEl,
    button: top.querySelector<HTMLButtonElement>('.svc-top .ch-menu-btn')!,
    reduced: REDUCED_MOTION,
    behind: () => [top.querySelector<HTMLElement>('.svc-top'), document.getElementById('main'), document.querySelector<HTMLElement>('.skip-link')],
    onOpen: o.onOpen,
    onClose: o.onClose,
  })
  // a link to this page (Start a project) closes the sheet so the page can scroll to it
  menuEl.addEventListener('click', e => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#"]')
    if (a) menu.close(false)
  })
  return menu
}

/** The contact section (section.svc-contact#svc-contact): the card, "Say hello." and a slot for the form. */
export function contactHtml(): string {
  return `
    <section class="svc-contact" id="svc-contact" aria-labelledby="svc-contact-h" tabindex="-1">
      <div class="svc-contact-card hud-panel hud-panel--strong">
        <div class="svc-contact-grid">
          <div class="svc-contact-copy">
            <p class="hud-eyebrow svc-rv" data-rv="wipe">${esc(CONTACT.eyebrow)}</p>
            <h2 class="hud-title svc-contact-t svc-rv" data-words id="svc-contact-h">Say <em>hello.</em></h2>
            <p class="hud-body svc-rv" data-rv="wipe" style="--d:2">${esc(CONTACT.body)}</p>
            <p class="svc-direct svc-rv" data-rv="wipe" style="--d:3">${directHtml('svc-direct-a')}</p>
          </div>
          <div class="svc-contact-form"></div>
        </div>
      </div>
    </section>`
}

/** The contact card, once contactHtml() is in: the form (`service` preselected, else "Choose one…") and its neon edge. */
export function mountContact(o: { service?: string } = {}) {
  const cardEl = document.querySelector<HTMLElement>('.svc-contact-card')!
  document.querySelector('.svc-contact-form')!.append(createContactForm({ service: o.service }))
  mountNeonFrame(cardEl)
}

/** The footer: every service and every industry (this one marked), the site's own pages (Work is the Portfolio). */
export function footerHtml(current: Current): string {
  const slug = current.kind === 'service' ? current.slug : ''
  const services = SERVICE_PAGES.map(
    p => `<li><a href="${serviceHref(p.slug)}"${p.slug === slug ? ' aria-current="page"' : ''}>${esc(p.title)}</a></li>`,
  ).join('')
  const ind = current.kind === 'industry' ? current.slug : ''
  const industries = INDUSTRIES.map(
    i => `<li><a href="${industryUrl(i.slug)}"${i.slug === ind ? ' aria-current="page"' : ''}>${esc(i.title)}</a></li>`,
  ).join('')
  const indexCur = current.kind === 'industries' ? ' aria-current="page"' : ''
  const workCur = current.kind === 'portfolio' ? ' aria-current="page"' : ''
  const termsCur = current.kind === 'terms' ? ' aria-current="page"' : ''
  const year = new Date().getFullYear()
  return `
    <footer class="svc-foot">
      <div class="svc-foot-cols">
        <nav class="svc-foot-col svc-foot-svc svc-rv" data-rv="list" aria-labelledby="svc-foot-svc-h">
          <p class="hud-label svc-foot-h" id="svc-foot-svc-h">Services</p>
          <ul style="--rows3:${Math.ceil(SERVICE_PAGES.length / 3)}; --rows2:${Math.ceil(SERVICE_PAGES.length / 2)}">${services}</ul>
        </nav>
        <nav class="svc-foot-col svc-foot-ind svc-rv" data-rv="list" aria-labelledby="svc-foot-ind-h">
          <p class="hud-label svc-foot-h" id="svc-foot-ind-h">Industries</p>
          <ul style="--rows2:${Math.ceil(INDUSTRIES.length / 2)}">${industries}</ul>
        </nav>
        <nav class="svc-foot-col svc-rv" data-rv="list" aria-labelledby="svc-foot-nav-h">
          <p class="hud-label svc-foot-h" id="svc-foot-nav-h">Explore</p>
          <ul style="--rows2:4">
            <li><a href="${BASE}">Home</a></li>
            <li><a href="${BASE}#services">Services</a></li>
            <li><a href="${industriesUrl()}"${indexCur}>Industries</a></li>
            <li><a href="${BASE}#process">Process</a></li>
            <li><a href="${portfolioUrl()}"${workCur}>Work</a></li>
            <li><a href="${BASE}#voices">Clients</a></li>
            <li><a href="${BASE}#contact">Contact</a></li>
            <li><a href="${termsUrl()}"${termsCur}>Terms &amp; Privacy</a></li>
          </ul>
        </nav>
      </div>
      <div class="svc-foot-bar">
        <a class="svc-foot-logo" href="${BASE}" aria-label="${esc(BRAND.name)}, home">${logoSvg('svc-foot-logo-svg')}</a>
        <p class="hud-label">© ${year} ${esc(BRAND.name)} · ${BRAND.locale.split(' · ').map(esc).join(' · ')}</p>
      </div>
    </footer>`
}

/**
 * Entrances (plain pages only; the story has its own): headlines come into
 * focus word by word (the story's rise), everything else by its data-rv kind
 * (service.css), in on scroll, once (instantly under reduced motion).
 */
export function bindReveals() {
  for (const h of document.querySelectorAll<HTMLElement>('.svc-rv[data-words]')) rise(h, h.innerHTML)
  document.querySelectorAll<HTMLElement>('.svc-foot-col').forEach(col => col.querySelectorAll<HTMLElement>('li').forEach((li, k) => li.style.setProperty('--k', String(k))))

  const rv = [...document.querySelectorAll<HTMLElement>('.svc-rv')]
  if (REDUCED_MOTION || !('IntersectionObserver' in window)) rv.forEach(n => n.classList.add('is-in'))
  else {
    const io = new IntersectionObserver(
      es => {
        for (const e of es) {
          if (!e.isIntersecting) continue
          e.target.classList.add('is-in')
          io.unobserve(e.target)
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    )
    rv.forEach(n => io.observe(n))
  }
}

/** Hover: the frosted panels matching `selector` carry a soft light in the neon that follows the cursor. */
export function bindSpots(selector: string) {
  const spots = [...document.querySelectorAll<HTMLElement>(selector)]
  spots.forEach((n, k) => {
    n.classList.add('svc-spot')
    n.style.setProperty('--spot-rgb', `var(--neon-${'abc'[k % 3]}-rgb)`)
    const glow = document.createElement('span')
    glow.className = 'svc-glow'
    glow.setAttribute('aria-hidden', 'true')
    n.prepend(glow)
  })
  if (!REDUCED_MOTION && matchMedia('(hover: hover)').matches) {
    let raf = 0
    let ev: PointerEvent | null = null
    document.addEventListener(
      'pointermove',
      e => {
        ev = e
        if (raf) return
        raf = requestAnimationFrame(() => {
          raf = 0
          const t = ev && (ev.target as HTMLElement | null)?.closest?.<HTMLElement>('.svc-spot')
          if (!t || !ev) return
          const r = t.getBoundingClientRect()
          t.style.setProperty('--mx', `${ev.clientX - r.left}px`)
          t.style.setProperty('--my', `${ev.clientY - r.top}px`)
        })
      },
      { passive: true },
    )
  }
}
