// Fonts: Schibsted Grotesk for everything (display, body and bold labels). Upright only: no italics anywhere.
import '@fontsource-variable/schibsted-grotesk'
import '../styles/base.css'
import '../ui/ui.css'
import '../service/service.css'
import '../service/stat/stat.css'
import '../portfolio/portfolio.css'
import './industry.css'

import { installPrintPolyfills } from '../ui/polyfills'
import { applyLightsCss } from '../kit/palette'
import { INDUSTRIES, INDUSTRIES_PAGE, PROCESS, SERVICES, SERVICE_CTA, industriesUrl, industryUrl, serviceUrl, type WorkItem } from '../content'
import { bindReveals, bindSpots, contactHtml, footerHtml, mountContact, mountTop, type Current } from '../page/shell'
import { articleHtml, esc, faqHtml, featuresHtml, heroHtml, inSentence, nextHtml, processHtml, quoteHtml } from '../page/sections'
import { fitHeroCopy, heroHold } from '../page/hero'
import { INDUSTRY_PAGES } from './data'
import { PORTFOLIO_WORK, portfolioSplit } from '../kit/work'
import { itemHtml } from '../portfolio/items'
import { drawGlyph } from '../chapters/services/icons'
import { REDUCED_MOTION } from '../kit/motion'
import { mountStat, statHtml } from '../service/stat/band'

/*
 * AN INDUSTRY PAGE — one per line of work, at <base>industries/<slug>/, and the INDEX of
 * them at <base>industries/ (vite.config.ts writes a copy of industry.html per path).
 * The words: src/industry/data (the pages), content.ts INDUSTRIES / INDUSTRIES_PAGE (the
 * index). The anatomy is the service page's (src/page/sections.ts, service.css), with two
 * sections of its own after "How it works":
 *
 *   clients   "The clients": the Portfolio's own tiles (src/portfolio) for the sites built
 *             in this line of work, hung on a stage of their own (the wall is mounted after
 *             the page, src/portfolio/wall.ts, on this subset alone)
 *   fits      "Services that fit": the service pages that answer this industry, as frosted
 *             panels with their etched glyphs (src/chapters/services/icons.ts)
 *
 * The index: a hero without art, then every industry as a plate. Both are plain,
 * natively scrolling documents, as the service pages are.
 */

installPrintPolyfills()
applyLightsCss()

const BASE = import.meta.env.BASE_URL
const m = location.pathname.match(/\/industries(?:\/([a-z0-9-]+))?\/?$/)
const slug = m?.[1] ?? ''
const index = slug ? INDUSTRIES.findIndex(i => i.slug === slug) : -1

if (!slug) renderIndex()
else if (index < 0 || !INDUSTRY_PAGES[slug]) {
  // an unknown industry: the index
  location.replace(industriesUrl())
} else render(index)

function render(i: number) {
  const ind = INDUSTRIES[i]
  const page = INDUSTRY_PAGES[ind.slug]
  const prev = INDUSTRIES[(i - 1 + INDUSTRIES.length) % INDUSTRIES.length]
  const next = INDUSTRIES[(i + 1) % INDUSTRIES.length]
  const reduced = REDUCED_MOTION

  document.documentElement.classList.add('is-svc', 'is-ind')
  document.title = `${ind.title} · Hark Digital`

  // ---------------------------------------------------------------- top
  const current: Current = { kind: 'industry', slug: ind.slug }
  const hold = heroHold(reduced)
  const menu = mountTop({ current, ...hold.handlers })
  hold.bind(menu)

  // ---------------------------------------------------------------- the clients
  // (in the Portfolio's order, with its neon; the wall decides which hang prominent, portfolioSplit)
  const clients = PORTFOLIO_WORK.filter(w => page.clients.includes(w.id))
  const split = portfolioSplit(clients)
  const at = (w: WorkItem) => ({ w, i: clients.indexOf(w) })
  const clientsHtml = clients.length
    ? `
    <section class="svc-sec ind-clients-sec" aria-labelledby="ind-clients-h">
      <p class="hud-eyebrow svc-rv" data-rv="wipe">The clients</p>
      <h2 class="hud-h2 svc-h2 svc-rv" data-words id="ind-clients-h">Built for <em>${esc(inSentence(ind.title))}.</em></h2>
    </section>
    <div class="pf-stage ind-clients">
      ${
        split.lead.length
          ? `
      <section class="pf-room pf-room--feat" aria-label="Featured">
        <ul class="pf-wall pf-wall--feat">${split.lead.map(at).map(x => itemHtml(x.w, x.i, 'feat')).join('')}</ul>
      </section>`
          : ''
      }
      ${
        split.rest.length
          ? `
      <section class="pf-room pf-room--more" aria-label="More clients">
        <ul class="pf-wall pf-wall--more">${split.rest.map(at).map(x => itemHtml(x.w, x.i, 'more')).join('')}</ul>
      </section>`
          : ''
      }
    </div>`
    : ''

  // ---------------------------------------------------------------- the services that fit
  const fits = page.services.map(s => SERVICES.find(x => x.slug === s)).filter((s): s is (typeof SERVICES)[number] => !!s)
  const fitsHtml = fits.length
    ? `
    <section class="svc-sec ind-fits-sec" aria-labelledby="ind-fits-h">
      <p class="hud-eyebrow svc-rv" data-rv="wipe">Services that fit</p>
      <h2 class="hud-h2 svc-h2 svc-rv" data-words id="ind-fits-h">What we reach for <em>first.</em></h2>
      <ul class="ind-fit-grid">${fits
        .map(
          (s, k) => `
        <li class="ind-fit hud-panel svc-rv" data-rv="panel" style="--d:${k}; --c:var(--neon-${'abc'[k % 3]})">
          <span class="svc-trace svc-trace--halo" aria-hidden="true"></span><span class="svc-trace" aria-hidden="true"></span>
          <canvas class="ind-glyph" data-glyph="${esc(s.slug)}" aria-hidden="true"></canvas>
          <h3 class="svc-feature-t ind-fit-t"><a class="ind-fit-a" href="${serviceUrl(s.slug)}">${esc(s.title)}</a></h3>
          <p class="svc-feature-p">${esc(s.blurb)}</p>
          <span class="hud-label ind-fit-cta" aria-hidden="true">${esc(SERVICE_CTA)} <span class="ind-fit-arrow">→</span></span>
        </li>`,
        )
        .join('')}</ul>
    </section>`
    : ''

  // ---------------------------------------------------------------- the page
  document.getElementById('main')!.innerHTML = `
    ${heroHtml({ eyebrow: ind.title, headline: page.headline, headlineAccent: page.headlineAccent, lede: page.lede, backHref: industriesUrl(), backLabel: 'All industries' })}

    ${featuresHtml(page.features)}

    ${statHtml(page.stat)}

    ${processHtml(page.process ?? PROCESS)}
    ${clientsHtml}
    ${fitsHtml}
    ${articleHtml(page.article)}
    ${faqHtml(page.faqs, ind.title)}
    ${quoteHtml(page.quote)}

    ${nextHtml({ cta: page.cta, label: 'More industries', prev: { href: industryUrl(prev.slug), title: prev.title }, next: { href: industryUrl(next.slug), title: next.title } })}

    ${contactHtml()}
    ${footerHtml(current)}`

  // the contact card: the form (a fitting service preselected) and a neon edge that draws in on scroll
  mountContact({ service: page.formService })
  bindReveals()
  mountStat(document.querySelector<HTMLElement>('.svc-stat')!, page.stat)
  fitHeroCopy()
  bindSpots('.svc-feature, .svc-quote, .svc-step, .svc-block, .svc-q, .ind-fit')
  drawGlyphs()

  // the clients' wall (the Portfolio's, on this page's sites alone), once the page is up
  const stage = document.querySelector<HTMLElement>('.ind-clients')
  if (stage) {
    import('../portfolio/wall')
      .then(w => w.mountWall({ stage, work: clients, match: () => true }))
      .catch(err => console.error('[industry] clients wall failed', err))
  }

  // the hero art: this industry's scene in glass and neon (src/industry/scenes)
  import('./scenes')
    .then(s => s.mountIndustryScene(document.querySelector<HTMLElement>('.svc-art')!, page.scene, { reduced }))
    .then(a => hold.set(a))
    .catch(err => console.error('[industry] hero scene failed', err))
}

function renderIndex() {
  document.documentElement.classList.add('is-svc', 'is-ind', 'is-ind-index')
  document.title = 'Industries · Hark Digital'
  const current: Current = { kind: 'industries' }
  mountTop({ current })

  const plates = INDUSTRIES.map(
    (ind, k) => `
        <li class="ind-plate hud-panel svc-rv" data-rv="panel" style="--d:${k % 2}; --c:var(--neon-${'abc'[k % 3]})">
          <span class="svc-trace svc-trace--halo" aria-hidden="true"></span><span class="svc-trace" aria-hidden="true"></span>
          <span class="hud-label ind-plate-n" aria-hidden="true">${esc(ind.num)}</span>
          <h2 class="svc-feature-t ind-plate-t"><a class="ind-fit-a" href="${industryUrl(ind.slug)}">${esc(ind.title)}</a></h2>
          <p class="svc-feature-p">${esc(ind.blurb)}</p>
          <span class="hud-label ind-fit-cta" aria-hidden="true">${esc(INDUSTRIES_PAGE.cta)} <span class="ind-fit-arrow">→</span></span>
        </li>`,
  ).join('')

  document.getElementById('main')!.innerHTML = `
    <section class="ind-hero" aria-labelledby="ind-h1">
      <p class="hud-eyebrow svc-rv" data-rv="wipe">${esc(INDUSTRIES_PAGE.eyebrow)}</p>
      <h1 class="hud-title ind-h1 svc-rv" data-words id="ind-h1">${esc(INDUSTRIES_PAGE.title)} <em>${esc(INDUSTRIES_PAGE.titleAccent)}</em></h1>
      <p class="hud-body ind-lede svc-rv" data-rv="wipe" style="--d:3">${esc(INDUSTRIES_PAGE.lede)}</p>
    </section>

    <section class="svc-sec ind-plates-sec" aria-label="${esc(INDUSTRIES_PAGE.eyebrow)}">
      <ol class="ind-plates">${plates}</ol>
    </section>

    ${contactHtml()}
    ${footerHtml(current)}`

  mountContact()
  bindReveals()
  bindSpots('.ind-plate')
}

/** the service panels' glyphs: each service's etched icon, drawn once in white over its neon's glow */
function drawGlyphs() {
  const cs = getComputedStyle(document.documentElement)
  for (const c of document.querySelectorAll<HTMLCanvasElement>('canvas.ind-glyph')) {
    const slug = c.dataset.glyph ?? ''
    const k = c.closest<HTMLElement>('.ind-fit')?.style.getPropertyValue('--c') ?? ''
    const name = k.match(/--neon-([abc])/)?.[1] ?? 'a'
    drawGlyph(c, slug, { size: 56, color: '#ffffff', glow: cs.getPropertyValue(`--neon-${name}`).trim() || undefined })
  }
}
