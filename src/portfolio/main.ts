// Fonts: Schibsted Grotesk for everything (display, body and bold labels). Upright only: no italics anywhere.
import '@fontsource-variable/schibsted-grotesk'
import '../styles/base.css'
import '../ui/ui.css'
import '../service/service.css'
import './portfolio.css'

import { installPrintPolyfills } from '../ui/polyfills'
import { applyLightsCss } from '../kit/palette'
import { PORTFOLIO, SECTIONS, WORK } from '../content'
import { countParts, moreTitleHtml, portfolioSplit, tagChips, tagSlug } from '../kit/work'
import { bindReveals, contactHtml, footerHtml, mountContact, mountTop, type Current } from '../page/shell'
import { itemHtml } from './items'
import { mountWall } from './wall'
import { mountRail } from './rail'

/*
 * THE PORTFOLIO — every site, at <base>portfolio/ (portfolio.html; the build
 * writes dist/portfolio/index.html with its description generated from WORK
 * and the lead screenshot preloaded, vite.config.ts).
 *
 * "The Glass Wall": the sites hang as lit panes of glass on the black wall
 * (wall.ts), under a glass tube that filters them by tag (rail.ts). No
 * three.js and no hero canvas: DOM, CSS, one small SVG and one tiny 2D canvas
 * per pane. The header, Menu sheet, contact card and footer are the service
 * pages' own (page/shell.ts), with Work lit.
 *
 *   hero       "Portfolio", "Built to be heard." (the Work chapter's own title),
 *              the count (on phones, or when the tube can't hold it)
 *   stage      the rail (it scrolls with the page), the three prominent sites (the
 *              first three featured, kit/work.ts portfolioSplit: one to a row, the
 *              screen beside its placard, sides alternating), then "More work": every
 *              other site, three to a band (2-up tiles on phones)
 *   contact    "Say hello." and the form (no service chosen), the footer
 *
 * Every word is the site's own copy (content.ts WORK, SECTIONS.work, CONTACT)
 * but for the page's few new strings (content.ts PORTFOLIO). ?tag=<slug>
 * opens it filtered (and is kept up to date as the filter changes).
 */

installPrintPolyfills()
applyLightsCss()

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

document.documentElement.classList.add('is-svc', 'is-pf')
document.title = PORTFOLIO.title

const current: Current = { kind: 'portfolio' }
mountTop({ current })

// ---------------------------------------------------------------- the filter this page opens with
const chips = tagChips(WORK, PORTFOLIO.minTag)
const params = new URLSearchParams(location.search)
const asked = params.has('tag') ? tagSlug(params.get('tag') ?? '') : ''
const initial = chips.some(c => c.slug === asked) ? asked : ''
if (params.has('tag') && !initial) {
  // an unknown tag: off the URL
  const u = new URL(location.href)
  u.searchParams.delete('tag')
  history.replaceState(history.state, '', u)
}
const initialTag = chips.find(c => c.slug === initial)?.tag
const match = (w: (typeof WORK)[number]) => !initialTag || w.tags.includes(initialTag)

// ---------------------------------------------------------------- the page
// (on this page "featured" is the prominent few; the story's Work chapter shows every featured site)
const split = portfolioSplit(WORK)
const featured = split.lead.map(w => ({ w, i: WORK.indexOf(w) }))
const rest = split.rest.map(w => ({ w, i: WORK.indexOf(w) }))
const title = SECTIONS.work.title
const cut = title.lastIndexOf(' ')
const h1 = cut > 0 ? `${esc(title.slice(0, cut))} <em>${esc(title.slice(cut + 1))}</em>` : `<em>${esc(title)}</em>`
const count = `<span>${countParts({ total: WORK.length, featured: featured.length, more: rest.length }).map(esc).join('</span><i aria-hidden="true"></i><span>')}</span>`
const chipsHtml = [{ tag: PORTFOLIO.all, slug: '' }, ...chips]
  .map(c => `<button class="pf-chip" type="button" data-tag="${esc(c.slug)}" aria-pressed="${c.slug === initial}">${esc(c.tag)}</button>`)
  .join('')

document.getElementById('main')!.innerHTML = `
    <section class="pf-hero" aria-labelledby="pf-h1">
      <p class="hud-eyebrow svc-rv" data-rv="wipe">${esc(PORTFOLIO.eyebrow)}</p>
      <h1 class="hud-title pf-h1 svc-rv" data-words id="pf-h1">${h1}</h1>
      ${WORK.length ? `<p class="pf-count pf-count--hero svc-rv" data-rv="wipe" style="--d:2">${count}</p>` : ''}
    </section>
    ${
      WORK.length
        ? `
    <div class="pf-stage">
      ${
        chips.length
          ? `
      <div class="pf-bar">
        <div class="pf-rail svc-rv" style="--d:3">
          <i class="pf-gas" aria-hidden="true"></i>
          <div class="pf-chips" role="group" aria-label="${esc(PORTFOLIO.filterLabel)}">${chipsHtml}</div>
          <p class="pf-count pf-count--rail">${count}</p>
        </div>
        <p class="sr-only" aria-live="polite" id="pf-live"></p>
      </div>`
          : ''
      }
      ${
        featured.length
          ? `
      <section class="pf-room pf-room--feat" aria-label="${esc(SECTIONS.work.eyebrow)}">
        <ul class="pf-wall pf-wall--feat">${featured.map(x => itemHtml(x.w, x.i, 'feat')).join('')}</ul>
      </section>`
          : ''
      }
      ${
        rest.length
          ? `
      <section class="pf-room pf-room--more" aria-labelledby="pf-more-h">
        <i class="pf-sweep" aria-hidden="true"><i></i></i>
        <p class="hud-eyebrow svc-rv" data-rv="wipe">More work</p>
        <h2 class="hud-h2 pf-more-h svc-rv" data-words id="pf-more-h">${moreTitleHtml(rest.map(x => x.w))}</h2>
        <ul class="pf-wall pf-wall--more">${rest.map(x => itemHtml(x.w, x.i, 'more')).join('')}</ul>
      </section>`
          : ''
      }
    </div>`
        : ''
    }
    ${contactHtml()}
    ${footerHtml(current)}`

// the contact card: the form with no service chosen ("Choose one…"), its neon edge
mountContact()

const stage = document.querySelector<HTMLElement>('.pf-stage')
if (stage) {
  const wall = mountWall({ stage, work: WORK, match })
  mountRail({ wall, stage, work: WORK, chips, initial })
}
bindReveals()
