// Fonts: Schibsted Grotesk for everything (display, body and bold labels). Upright only: no italics anywhere.
import '@fontsource-variable/schibsted-grotesk'
import '../styles/base.css'
import '../ui/ui.css'
import './service.css'
import './stat/stat.css'

import { installPrintPolyfills } from '../ui/polyfills'
import { applyLightsCss } from '../kit/palette'
import { CONTACT_FORM } from '../content'
import { bindReveals, bindSpots, contactHtml, footerHtml, mountContact, mountTop, type Current } from '../page/shell'
import { articleHtml, esc, faqHtml, featuresHtml, heroHtml, listOf, nextHtml, processHtml, quoteHtml } from '../page/sections'
import { fitHeroCopy, heroHold } from '../page/hero'
import { SERVICE_PAGES } from './data/pages'
import { SERVICE_CONTENT } from './data/content'
import { REDUCED_MOTION } from '../kit/motion'
import { mountStat, statHtml } from './stat/band'

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
 *   stat      "By the numbers": the service's number, and a picture of it in
 *             glass and neon that lights once (src/service/stat)
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
  const prev = SERVICE_PAGES[(i - 1 + SERVICE_PAGES.length) % SERVICE_PAGES.length]
  const next = SERVICE_PAGES[(i + 1) % SERVICE_PAGES.length]
  const back = `${BASE}#services/${page.slug}`
  const reduced = REDUCED_MOTION

  document.documentElement.classList.add('is-svc')
  document.title = `${page.title} · Hark Digital`

  // ---------------------------------------------------------------- top
  const current: Current = { kind: 'service', slug: page.slug, back }
  // the hero scene (mounted last, below) holds still once the sheet is up (page/hero.ts)
  const hold = heroHold(reduced)
  const menu = mountTop({ current, ...hold.handlers })
  hold.bind(menu)

  // ---------------------------------------------------------------- body
  const ints = page.integrations
  // (the tools with no logo of their own on the wall are named in the line under it, before the byName ones)
  const also = ints ? [...ints.logos.filter(l => !l.logo).map(l => l.name), ...(ints.byName ?? [])] : []
  const integrations = ints
    ? `
    <section class="svc-sec svc-ints" aria-labelledby="svc-ints-h">
      <h2 class="svc-eyebrow hud-eyebrow svc-ints-h svc-rv" data-rv="wipe" id="svc-ints-h">${esc(ints.label)}</h2>
      ${ints.line ? `<p class="hud-body svc-ints-line svc-rv" data-rv="wipe" style="--d:1">${esc(ints.line)}</p>` : ''}
      <ul class="svc-ints-grid" role="list">${ints.logos
        .filter(l => l.logo)
        // (always in alphabetical order, whatever order the data lists them in)
        .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }))
        .map((l, k) => {
          // optical sizing: wide wordmarks a little shorter, compact ones a little taller (30 at 3.2:1;
          // a stacked logo, mark over name, may stand taller still). A family sharing a typeface (Google's
          // six) gives its own heights instead, so its names all set at one letter size
          const r = l.ratio ?? 3.2
          const h = l.h ?? Math.min(r < 1.6 ? 46 : 34, 30 * Math.pow(3.2 / r, 0.4))
          // (the reveal ripples along each row of four, as on laptops)
          return `
        <li class="svc-int svc-rv" style="--d:${((k % 4) + Math.min(Math.floor(k / 4), 3)) * 0.5}; --c:var(--neon-${'abc'[k % 3]}); --c-rgb:var(--neon-${'abc'[k % 3]}-rgb)">
          <span class="svc-int-logo" role="img" aria-label="${esc(l.name)}" style="--logo:url('${BASE}logos/${esc(l.logo!)}'); --w:${(h * r).toFixed(1)}; --h:${h.toFixed(1)}"></span>
        </li>`
        })
        .join('')}</ul>
      ${ints.more ? `<p class="svc-ints-more svc-rv" data-rv="wipe">${esc(ints.more)}</p>` : ''}
      ${also.length ? `<p class="svc-ints-also svc-rv" data-rv="wipe">Also ${esc(listOf(also))}.</p>` : ''}
    </section>`
    : ''

  document.getElementById('main')!.innerHTML = `
    ${heroHtml({ eyebrow: page.title, headline: page.headline, headlineAccent: page.headlineAccent, lede: page.lede, backHref: back, backLabel: 'All services' })}

    ${featuresHtml(page.features)}
    ${integrations}

    ${statHtml(page.stat)}

    ${processHtml(page.process)}

    ${articleHtml(content?.article)}
    ${faqHtml(content?.faqs, page.title)}
    ${quoteHtml(page.quote)}

    ${nextHtml({ cta: page.cta, label: 'More services', prev: { href: serviceHref(prev.slug), title: prev.title }, next: { href: serviceHref(next.slug), title: next.title } })}

    ${contactHtml()}
    ${footerHtml(current)}`

  // the contact card: the form (this service preselected) and a neon edge that draws in on scroll
  mountContact({ service: CONTACT_FORM.services.find(s => s === page.title) })

  // entrances (service pages only; the story has its own): headlines come into focus word by
  // word (the story's rise), everything else by its data-rv kind (service.css), in on scroll
  bindReveals()

  // the stat band lights on its own clock, once most of it is in view (not a .svc-rv)
  mountStat(document.querySelector<HTMLElement>('.svc-stat')!, page.stat)

  // desktop: the hero copy is centred in the left half by the width you see (service.css)
  fitHeroCopy()

  // hover: frosted panels carry a soft light in the neon that follows the cursor
  bindSpots('.svc-feature, .svc-quote, .svc-step, .svc-block, .svc-q')

  // the hero art: the classic site's scene for this service, redrawn in glass and neon (src/service/scenes)
  import('./scenes')
    .then(m => hold.set(m.mountScene(document.querySelector<HTMLElement>('.svc-art')!, page.scene, { reduced })))
    .catch(err => console.error('[service] hero scene failed', err))
}
