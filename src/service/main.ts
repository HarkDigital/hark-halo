// Fonts: Schibsted Grotesk for everything (display, body, italics, and bold labels).
import '@fontsource-variable/schibsted-grotesk'
import '@fontsource-variable/schibsted-grotesk/wght-italic.css'
import '../styles/base.css'
import '../ui/ui.css'
import './service.css'

import { installPrintPolyfills } from '../ui/polyfills'
import { applyLightsCss } from '../kit/palette'
import { BRAND, CONTACT, CONTACT_FORM, SERVICES } from '../content'
import { createContactForm } from '../ui/contactForm'
import { mountNeonFrame } from './neonFrame'
import { logoSvg } from '../ui/mark'
import { bindServicesMenu, servicesMenuItem } from '../ui/servicesMenu'
import { SECTIONS, bindMenuSheet, menuButtonHtml, menuRowHtml, menuSheetHtml } from '../ui/menuSheet'
import { SERVICE_PAGES } from './data/pages'
import { SERVICE_CONTENT } from './data/content'
import type { SceneHandle } from './scenes/runner'
import { REDUCED_MOTION } from '../kit/motion'
import { rise } from '../core/rise'

/*
 * A SERVICE PAGE — one per service, at <base>services/<slug>/ (vite.config.ts
 * writes a copy of service.html per slug). The copy is the classic 2026
 * site's service page, verbatim (src/service/data), in Frost's language:
 * black, frosted glass panels, bold caps labels, the two neon tubes.
 *
 *   top       the brand tile (home) + Work · Services · Contact + Start a project;
 *             on phones the story's Menu pill and sheet (ui/menuSheet.ts)
 *   hero      the classic site's scene for the service, in glass and neon
 *             (src/service/scenes, 2D canvas), eyebrow, headline, lede, CTAs
 *   features  "What you get": four frosted panels
 *   stat      the service's number
 *   process   "How it works": four steps on a hairline that lights on hover
 *   article   "The longer version"
 *   faq       "Questions, answered"
 *   quote     a client, when the service has one
 *   next      the closing line + previous / next service
 *   contact   "Say hello." + the address; the services index; footer
 *
 * A plain, natively scrolling document: real headings, links and
 * <details>, readable without WebGL. Reveals come in on scroll (instantly
 * under reduced motion). "All services" returns to the story at this
 * service's plate (<base>#services/<slug>, src/main.ts).
 */

installPrintPolyfills()
applyLightsCss()

const BASE = import.meta.env.BASE_URL
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
const serviceHref = (slug: string) => `${BASE}services/${slug}/`

const slug = location.pathname.match(/\/services\/([a-z0-9-]+)\/?$/)?.[1] ?? ''
const index = SERVICE_PAGES.findIndex(p => p.slug === slug)

if (index < 0) {
  // an unknown service: back to the story's services
  location.replace(`${BASE}#services`)
} else render(index)

function render(i: number) {
  const page = SERVICE_PAGES[i]
  const content = SERVICE_CONTENT[page.slug]
  const svc = SERVICES.find(s => s.slug === page.slug)
  const prev = SERVICE_PAGES[(i - 1 + SERVICE_PAGES.length) % SERVICE_PAGES.length]
  const next = SERVICE_PAGES[(i + 1) % SERVICE_PAGES.length]
  const back = `${BASE}#services/${page.slug}`
  const reduced = REDUCED_MOTION

  document.documentElement.classList.add('is-svc')
  document.title = `${page.title} · Hark Digital`

  // ---------------------------------------------------------------- top
  // the Menu sheet's sections lead back into the story (Services to this service's plate)
  const menuRows = SECTIONS.map((sec, k) =>
    menuRowHtml(
      {
        id: sec.id,
        name: sec.name,
        href: sec.id === 'hero' ? BASE : sec.id === 'services' ? back : `${BASE}#${sec.id}`,
        now: sec.id === 'services',
      },
      k,
      page.slug,
    ),
  ).join('')
  const top = document.getElementById('svc-top')!
  top.innerHTML = `
    <header class="svc-top">
      <a class="ch-brand" href="${BASE}" aria-label="${esc(BRAND.name)}, home">
        <span class="ch-logo" aria-hidden="true">${logoSvg('ch-logo-svg')}</span>
      </a>
      <nav class="svc-nav ch-chip" aria-label="Primary">
        <ul class="ch-links">
          ${servicesMenuItem(`<a class="ch-link is-active" href="${back}">Services</a>`, page.slug)}
          <li><a class="ch-link" href="${BASE}#work">Work</a></li>
          <li><a class="ch-link" href="${BASE}#contact">Contact</a></li>
        </ul>
        <a class="hud-btn ch-cta" href="#svc-contact">Start a project</a>
      </nav>
      ${menuButtonHtml('svc-menu')}
    </header>
    ${menuSheetHtml({ id: 'svc-menu', rows: menuRows, foot: `<a class="hud-btn ch-menu-cta" href="#svc-contact">Start a project</a>` })}`

  bindServicesMenu(top)
  const menuEl = document.getElementById('svc-menu')!
  // the hero scene (mounted last, below) holds still once the sheet is up: it frosts a still
  // image, as on the story (a live canvas under backdrop-filter is costly on a phone)
  let art: SceneHandle | undefined
  let stillTimer = 0
  const menu = bindMenuSheet({
    sheet: menuEl,
    button: top.querySelector<HTMLButtonElement>('.svc-top .ch-menu-btn')!,
    reduced,
    behind: () => [top.querySelector<HTMLElement>('.svc-top'), document.getElementById('main'), document.querySelector<HTMLElement>('.skip-link')],
    onOpen: () => {
      clearTimeout(stillTimer)
      stillTimer = window.setTimeout(() => {
        if (menu.isOpen) art?.hold(true)
      }, reduced ? 0 : 420)
    },
    onClose: () => {
      clearTimeout(stillTimer)
      art?.hold(false)
    },
  })
  // a link to this page (Start a project) closes the sheet so the page can scroll to it
  menuEl.addEventListener('click', e => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#"]')
    if (a) menu.close(false)
  })

  // ---------------------------------------------------------------- body
  const headline = `${esc(page.headline)}${page.headlineAccent ? ` <em>${esc(page.headlineAccent)}</em>` : ''}`
  const long = `${page.headline} ${page.headlineAccent ?? ''}`.trim().length
  const features = page.features
    .map(
      (f, k) => `
        <li class="svc-feature hud-panel svc-rv" data-rv="panel" style="--d:${k}">
          <span class="svc-trace svc-trace--halo" aria-hidden="true"></span><span class="svc-trace" aria-hidden="true"></span>
          <h3 class="svc-feature-t">${esc(f.title)}</h3>
          <p class="svc-feature-p">${esc(f.text)}</p>
        </li>`,
    )
    .join('')
  const steps = page.process
    .map(
      (s, k) => `
        <li class="svc-step svc-rv" data-rv="step" style="--d:${k}">
          <span class="svc-wire" aria-hidden="true"></span><span class="svc-node" aria-hidden="true"></span>
          <h3 class="svc-step-t">${esc(s.title)}</h3>
          <p class="svc-step-p">${esc(s.text)}</p>
        </li>`,
    )
    .join('')
  const article = content
    ? `
    <section class="svc-sec svc-article" aria-labelledby="svc-article-h">
      <h2 class="svc-eyebrow hud-eyebrow svc-rv" data-rv="wipe" id="svc-article-h">The longer version</h2>
      <div class="svc-article-grid">
        ${content.article
          .map(
            (b, k) => `
          <article class="svc-block${k === 2 ? ' svc-block--wide' : ''}">
            <h3 class="svc-block-t svc-rv" data-words>${esc(b.heading)}</h3>
            ${b.paragraphs.map((p, j) => `<p class="svc-rv" data-rv="wipe" style="--d:${j + 1}">${esc(p)}</p>`).join('')}
          </article>`,
          )
          .join('')}
      </div>
    </section>`
    : ''
  const faq = content
    ? `
    <section class="svc-sec svc-faq" aria-labelledby="svc-faq-h">
      <p class="hud-eyebrow svc-rv" data-rv="wipe">Questions, answered</p>
      <h2 class="hud-h2 svc-h2 svc-rv" data-words id="svc-faq-h">What people ask us about ${esc(page.title.toLowerCase())}.</h2>
      <div class="svc-faq-list">
        ${content.faqs
          .map(
            (f, k) => `
          <details class="svc-q svc-rv" data-rv="row" style="--d:${k}">
            <summary><span>${esc(f.q)}</span><i aria-hidden="true"></i></summary>
            <p>${esc(f.a)}</p>
          </details>`,
          )
          .join('')}
      </div>
    </section>`
    : ''
  const quote = page.quote
    ? `
    <section class="svc-sec svc-quote-sec" aria-label="A client">
      <figure class="svc-quote hud-panel svc-rv" data-rv="panel">
        <span class="svc-trace svc-trace--halo" aria-hidden="true"></span><span class="svc-trace" aria-hidden="true"></span>
        <span class="svc-quote-mark" aria-hidden="true">“</span>
        <blockquote class="hud-quote svc-rv" data-words>${esc(page.quote.text)}</blockquote>
        <figcaption class="hud-label">${esc(page.quote.name)} · ${esc(page.quote.company)}</figcaption>
      </figure>
    </section>`
    : ''
  const index11 = SERVICE_PAGES.map(
    p =>
      `<li><a href="${serviceHref(p.slug)}"${p.slug === page.slug ? ' aria-current="page"' : ''}>${esc(p.title)}</a></li>`,
  ).join('')
  const year = new Date().getFullYear()

  document.getElementById('main')!.innerHTML = `
    <section class="svc-hero" aria-labelledby="svc-h1">
      <div class="svc-art" aria-hidden="true"></div>
      <div class="svc-hero-scrim" aria-hidden="true"></div>
      <div class="svc-hero-copy">
        <p class="hud-eyebrow svc-rv" data-rv="wipe">${esc(page.title)}</p>
        <h1 class="hud-title svc-h1 svc-rv${long > 30 ? ' is-long' : ''}" data-words id="svc-h1">${headline}</h1>
        <p class="hud-body svc-lede svc-rv" data-rv="wipe" style="--d:3">${esc(page.lede)}</p>
        ${svc ? `<ul class="hud-tags svc-tags svc-rv" data-rv="pop" style="--d:5" aria-label="Includes">${svc.tags.map((t, k) => `<li class="hud-tag" style="--k:${k}">${esc(t)}</li>`).join('')}</ul>` : ''}
        <div class="svc-ctas svc-rv" style="--d:7">
          <a class="hud-btn" href="#svc-contact">Start a project</a>
          <a class="hud-btn hud-btn--ghost" href="${back}"><span aria-hidden="true">←</span> All services</a>
        </div>
      </div>
    </section>

    <section class="svc-sec svc-features" aria-labelledby="svc-features-h">
      <h2 class="svc-eyebrow hud-eyebrow svc-rv" data-rv="wipe" id="svc-features-h">What you get</h2>
      <ul class="svc-feature-grid">${features}</ul>
    </section>

    <section class="svc-stat" aria-label="By the numbers">
      <p class="svc-stat-in svc-rv" data-rv="stat">
        <span class="svc-stat-v">${esc(page.stat.value)}</span>
        <span class="svc-stat-l hud-label">${esc(page.stat.label)}</span>
      </p>
    </section>

    <section class="svc-sec svc-process" aria-labelledby="svc-process-h">
      <p class="hud-eyebrow svc-rv" data-rv="wipe">How it works</p>
      <h2 class="hud-h2 svc-h2 svc-rv" data-words id="svc-process-h">First we listen. Then we <em>build.</em></h2>
      <ol class="svc-steps">${steps}</ol>
    </section>

    ${article}
    ${faq}
    ${quote}

    <section class="svc-sec svc-next" aria-label="Next">
      <p class="svc-cta-line svc-rv" data-words>${esc(page.cta)}</p>
      <nav class="svc-pn svc-rv" data-rv="side" aria-label="More services">
        <a class="svc-pn-a" href="${serviceHref(prev.slug)}" rel="prev"><span class="hud-label">Previous</span><span class="svc-pn-t"><span aria-hidden="true">←</span> ${esc(prev.title)}</span></a>
        <a class="svc-pn-a svc-pn-a--next" href="${serviceHref(next.slug)}" rel="next"><span class="hud-label">Next</span><span class="svc-pn-t">${esc(next.title)} <span aria-hidden="true">→</span></span></a>
      </nav>
    </section>

    <section class="svc-contact" id="svc-contact" aria-labelledby="svc-contact-h" tabindex="-1">
      <div class="svc-contact-card hud-panel hud-panel--strong">
        <div class="svc-contact-grid">
          <div class="svc-contact-copy">
            <p class="hud-eyebrow svc-rv" data-rv="wipe">${esc(CONTACT.eyebrow)}</p>
            <h2 class="hud-title svc-contact-t svc-rv" data-words id="svc-contact-h">Say <em>hello.</em></h2>
            <p class="hud-body svc-rv" data-rv="wipe" style="--d:2">${esc(CONTACT.body)}</p>
          </div>
          <div class="svc-contact-form"></div>
        </div>
      </div>
    </section>

    <footer class="svc-foot">
      <div class="svc-foot-cols">
        <nav class="svc-foot-col svc-foot-svc svc-rv" data-rv="list" aria-labelledby="svc-foot-svc-h">
          <p class="hud-label svc-foot-h" id="svc-foot-svc-h">Services</p>
          <ul>${index11}</ul>
        </nav>
        <nav class="svc-foot-col svc-rv" data-rv="list" aria-labelledby="svc-foot-nav-h">
          <p class="hud-label svc-foot-h" id="svc-foot-nav-h">Explore</p>
          <ul>
            <li><a href="${BASE}">Home</a></li>
            <li><a href="${BASE}#services">Services</a></li>
            <li><a href="${BASE}#process">Process</a></li>
            <li><a href="${BASE}#work">Work</a></li>
            <li><a href="${BASE}#voices">Clients</a></li>
            <li><a href="${BASE}#contact">Contact</a></li>
          </ul>
        </nav>
      </div>
      <div class="svc-foot-bar">
        <a class="svc-foot-logo" href="${BASE}" aria-label="${esc(BRAND.name)}, home">${logoSvg('svc-foot-logo-svg')}</a>
        <p class="hud-label">© ${year} ${esc(BRAND.name)} · ${BRAND.locale.split(' · ').map(esc).join(' · ')}</p>
      </div>
    </footer>`

  // the contact card: the form (this service preselected) and a neon edge that draws in on scroll
  const cardEl = document.querySelector<HTMLElement>('.svc-contact-card')!
  document.querySelector('.svc-contact-form')!.append(createContactForm({ service: CONTACT_FORM.services.find(s => s === page.title) }))
  mountNeonFrame(cardEl)

  // entrances (service pages only; the story has its own): headlines come into focus word by
  // word (the story's rise), everything else by its data-rv kind (service.css)
  for (const h of document.querySelectorAll<HTMLElement>('.svc-rv[data-words]')) rise(h, h.innerHTML)
  document.querySelectorAll<HTMLElement>('.svc-foot-col').forEach(col => col.querySelectorAll<HTMLElement>('li').forEach((li, k) => li.style.setProperty('--k', String(k))))

  // reveals: in on scroll, once (instantly under reduced motion)
  const rv = [...document.querySelectorAll<HTMLElement>('.svc-rv')]
  if (reduced || !('IntersectionObserver' in window)) rv.forEach(n => n.classList.add('is-in'))
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

  // hover: frosted panels carry a soft light in the neon that follows the cursor
  const spots = [...document.querySelectorAll<HTMLElement>('.svc-feature, .svc-quote, .svc-step, .svc-block, .svc-q')]
  spots.forEach((n, k) => {
    n.classList.add('svc-spot')
    n.style.setProperty('--spot-rgb', `var(--neon-${'abc'[k % 3]}-rgb)`)
    const glow = document.createElement('span')
    glow.className = 'svc-glow'
    glow.setAttribute('aria-hidden', 'true')
    n.prepend(glow)
  })
  if (!reduced && matchMedia('(hover: hover)').matches) {
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

  // the hero art: the classic site's scene for this service, redrawn in glass and neon (src/service/scenes)
  import('./scenes')
    .then(m => {
      art = m.mountScene(document.querySelector<HTMLElement>('.svc-art')!, page.scene, { reduced })
      if (menu.isOpen) art.hold(true)
    })
    .catch(err => console.error('[service] hero scene failed', err))
}
