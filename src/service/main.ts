// Fonts: Schibsted Grotesk for everything (display, body and bold labels). Upright only: no italics anywhere.
import '@fontsource-variable/schibsted-grotesk'
import '../styles/base.css'
import '../ui/ui.css'
import './service.css'

import { installPrintPolyfills } from '../ui/polyfills'
import { applyLightsCss } from '../kit/palette'
import { CONTACT_FORM, SERVICES } from '../content'
import { bindReveals, bindSpots, contactHtml, footerHtml, mountContact, mountTop, type Current } from '../page/shell'
import { SERVICE_PAGES } from './data/pages'
import { SERVICE_CONTENT } from './data/content'
import type { SceneHandle } from './scenes/runner'
import { REDUCED_MOTION } from '../kit/motion'

/*
 * A SERVICE PAGE — one per service, at <base>services/<slug>/ (vite.config.ts
 * writes a copy of service.html per slug). The copy is the classic 2026
 * site's service page, verbatim (src/service/data), in Frost's language:
 * black, frosted glass panels, bold caps labels, the two neon tubes.
 *
 *   top       the brand tile (home) + Services · Work · Contact + Start a project;
 *             on phones the story's Menu pill and sheet (the shared shell,
 *             src/page/shell.ts, as are the contact card, footer and reveals)
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
  const current: Current = { kind: 'service', slug: page.slug, back }
  // the hero scene (mounted last, below) holds still once the sheet is up: it frosts a still
  // image, as on the story (a live canvas under backdrop-filter is costly on a phone)
  let art: SceneHandle | undefined
  let stillTimer = 0
  const menu = mountTop({
    current,
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

    ${contactHtml()}
    ${footerHtml(current)}`

  // the contact card: the form (this service preselected) and a neon edge that draws in on scroll
  mountContact({ service: CONTACT_FORM.services.find(s => s === page.title) })

  // entrances (service pages only; the story has its own): headlines come into focus word by
  // word (the story's rise), everything else by its data-rv kind (service.css), in on scroll
  bindReveals()

  // hover: frosted panels carry a soft light in the neon that follows the cursor
  bindSpots('.svc-feature, .svc-quote, .svc-step, .svc-block, .svc-q')

  // the hero art: the classic site's scene for this service, redrawn in glass and neon (src/service/scenes)
  import('./scenes')
    .then(m => {
      art = m.mountScene(document.querySelector<HTMLElement>('.svc-art')!, page.scene, { reduced })
      if (menu.isOpen) art.hold(true)
    })
    .catch(err => console.error('[service] hero scene failed', err))
}
