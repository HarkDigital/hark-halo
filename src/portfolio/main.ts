// Fonts: Schibsted Grotesk for everything (display, body and bold labels). Upright only: no italics anywhere.
import '@fontsource-variable/schibsted-grotesk'
import '../styles/base.css'
import '../ui/ui.css'
import '../service/service.css'
import './portfolio.css'

import { installPrintPolyfills } from '../ui/polyfills'
import { applyLightsCss } from '../kit/palette'
import { PORTFOLIO, SECTIONS, type WorkItem } from '../content'
import { PORTFOLIO_WORK, portfolioSplit, tagChips, tagSlug } from '../kit/work'
import { bindReveals, contactHtml, footerHtml, mountContact, mountTop, type Current } from '../page/shell'
import { itemHtml } from './items'
import { mountWall } from './wall'
import { mountRail } from './rail'

/*
 * THE PORTFOLIO — every site, at <base>portfolio/ (portfolio.html; the build
 * writes dist/portfolio/index.html with its description generated from its
 * client sites and the lead screenshot preloaded, vite.config.ts). Every site,
 * in content.ts PORTFOLIO_ORDER (kit/work.ts PORTFOLIO_WORK; the home page's 15,
 * WORK, are its first 15).
 *
 * "The Glass Wall": the sites hang as lit panes of glass on the black wall
 * (wall.ts), under a glass tube that filters them by tag (rail.ts). No
 * three.js and no hero canvas: DOM, CSS, one small SVG and one tiny 2D canvas
 * per pane. The header, Menu sheet, contact card and footer are the service
 * pages' own (page/shell.ts), with Work lit.
 *
 *   hero       "Portfolio", "See for yourself." (the Work chapter's own title)
 *   stage      the rail (it scrolls with the page; off for now, PORTFOLIO.filters),
 *              the prominent sites (the first two in the order, kit/work.ts
 *              portfolioSplit: one to a row, the screen beside its placard, sides
 *              alternating), then the grid ("More work", named for screen readers
 *              only: no heading, it follows the rows straight on): every other site,
 *              in order, three to a band (2-up tiles on phones)
 *   contact    "Say hello." and the form (no service chosen), the footer
 *
 * Every word is the site's own copy (content.ts WORK, PORTFOLIO_MORE,
 * SECTIONS.work, CONTACT) but for the page's few new strings (content.ts
 * PORTFOLIO). The filter's chips are the tags its sites share (kit/work.ts tagChips). ?tag=<slug>
 * opens it filtered (and is kept up to date as the filter changes). The filter is off for now
 * (PORTFOLIO.filters): the hero goes straight to the prominent rows.
 */

installPrintPolyfills()
applyLightsCss()

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

document.documentElement.classList.add('is-svc', 'is-pf')
document.title = PORTFOLIO.title

const current: Current = { kind: 'portfolio' }
mountTop({ current })

// ---------------------------------------------------------------- the filter this page opens with
// (none while PORTFOLIO.filters is off: no rail, and a ?tag= link opens the whole wall)
const chips = PORTFOLIO.filters ? tagChips(PORTFOLIO_WORK, PORTFOLIO.minTag) : []
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
const match = (w: WorkItem) => !initialTag || w.tags.includes(initialTag)

// ---------------------------------------------------------------- the page
// (on this page "featured" is the prominent few; the story's Work chapter shows every featured site.
// Each site's place on the page is its neon)
const split = portfolioSplit(PORTFOLIO_WORK)
const at = (w: WorkItem) => ({ w, i: PORTFOLIO_WORK.indexOf(w) })
const featured = split.lead.map(at)
const rest = split.rest.map(at)
const title = SECTIONS.work.title
const cut = title.lastIndexOf(' ')
const h1 = cut > 0 ? `${esc(title.slice(0, cut))} <em>${esc(title.slice(cut + 1))}</em>` : `<em>${esc(title)}</em>`
const chipsHtml = [{ tag: PORTFOLIO.all, slug: '' }, ...chips]
  .map(c => `<button class="pf-chip" type="button" data-tag="${esc(c.slug)}" aria-pressed="${c.slug === initial}">${esc(c.tag)}</button>`)
  .join('')

document.getElementById('main')!.innerHTML = `
    <section class="pf-hero" aria-labelledby="pf-h1">
      <p class="hud-eyebrow svc-rv" data-rv="wipe">${esc(PORTFOLIO.eyebrow)}</p>
      <h1 class="hud-title pf-h1 svc-rv" data-words id="pf-h1">${h1}</h1>
    </section>
    ${
      PORTFOLIO_WORK.length
        ? `
    <div class="pf-stage">
      ${
        chips.length
          ? `
      <div class="pf-bar">
        <div class="pf-rail svc-rv" style="--d:3">
          <div class="pf-scroll">
            <i class="pf-gas" aria-hidden="true"></i>
            <div class="pf-chips" role="group" aria-label="${esc(PORTFOLIO.filterLabel)}">${chipsHtml}</div>
          </div>
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
      <section class="pf-room pf-room--more" aria-label="${esc(PORTFOLIO.moreLabel)}">
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
  const wall = mountWall({ stage, work: PORTFOLIO_WORK, match })
  if (chips.length) mountRail({ wall, stage, work: PORTFOLIO_WORK, chips, initial })
}
bindReveals()
