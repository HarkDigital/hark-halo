import { PORTFOLIO, type WorkItem } from '../content'
import { hostOf, isPreview, neonKey } from '../kit/work'

/*
 * ONE SITE on the wall: a lit pane of glass (the screenshot behind it) standing
 * on a neon foot, and its placard: beside it for a prominent site (desktop and
 * tablet; the CSS grid picks the side, the DOM is always screen then placard),
 * beneath it otherwise and on phones. The markup only; wall.ts brings it
 * to life. Every piece of decoration is aria-hidden: the placard's words and
 * its one real link (the pill) carry the site. The screen's own link (.pf-hit)
 * is the pill's mouse / touch twin, out of the tab order and the tree.
 *
 *   li.pf-item                 --n / --n-rgb: the site's neon (its place on the page, kit/work.ts PORTFOLIO_WORK: a, b, c…)
 *     article.pf-art
 *       .pf-hang               the entrance and the filter's FLIP move this
 *         .pf-screen           tilt / lift (--rx, --ry, --lift)
 *           .pf-bezel          the frame; .pf-glass (16:10) holds, back to front:
 *                              frost canvas · fog · the screenshot · (its preview
 *                              video, added on first play: preview.ts) · name card ·
 *                              clearing edge · sheen · glare · dim · press ring
 *             svg.pf-tube      the neon frame (wall.ts writes its paths)
 *           a.pf-hit           the whole screen opens the site
 *         .pf-foot > .pf-pool  the lit tube it stands on, and its light on the wall
 *       .pf-plac               industry, name, blurb, the pill + host (no tag pills: the
 *                              tags stay in content.ts and drive the filter chips)
 *
 * `kind`: 'feat', a prominent site, or 'more' (a tile in the grid). Every name is an h2: the grid
 * has no heading of its own (its section is named "More work" by aria-label alone), so its sites
 * are the prominent ones' peers, never sections of the last of them. Names are always plain,
 * never an accent word.
 *
 * The pill's name is its aria-label, "Visit site, ComTec Systems (opens in a new
 * tab)": it starts with the words on it (WCAG 2.5.3). Visually hidden spans for
 * the rest would read "Visit site , ComTec…" (an absolutely placed span is a
 * block to the name computation, so it gets a space of its own).
 */

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

/** the tube: four layers (halo, glow, tube, white core), each the frame's two halves */
const TUBE = ['halo', 'glow', 'tube', 'core'].map(l => `<g class="pf-t-${l}"><path pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1"/><path pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1"/></g>`).join('')

export function itemHtml(w: WorkItem, workIndex: number, kind: 'feat' | 'more'): string {
  const k = neonKey(workIndex)
  const pre = isPreview(w.url)
  const id = esc(w.id)
  const name = esc(w.name)
  const url = esc(w.url)
  const host = pre ? 'Pre-launch build' : esc(hostOf(w.url))
  const label = 'Visit site'
  const note = pre ? ' (pre-launch build) (opens in a new tab)' : ' (opens in a new tab)'
  return `
    <li class="pf-item pf-item--${kind}" data-id="${id}" style="--k:${workIndex}; --n:var(--neon-${k}); --n-rgb:var(--neon-${k}-rgb)">
      <article class="pf-art" aria-labelledby="pf-h-${id}">
        <div class="pf-hang">
          <div class="pf-screen">
            <div class="pf-bezel">
              <div class="pf-glass">
                <canvas class="pf-frost" width="64" height="40" aria-hidden="true"></canvas>
                <i class="pf-fog" aria-hidden="true"></i>
                <img class="pf-img" alt="${esc(PORTFOLIO.shotAlt(w.name))}" width="1280" height="800" decoding="async">
                <span class="pf-card" aria-hidden="true"><b>${name}</b><small class="hud-label">${host}</small></span>
                <i class="pf-edge" aria-hidden="true"><i></i></i>
                <i class="pf-sheen" aria-hidden="true"></i>
                <i class="pf-glare" aria-hidden="true"></i>
                <i class="pf-dim" aria-hidden="true"></i>
                <i class="pf-ring" aria-hidden="true"></i>
              </div>
              <svg class="pf-tube" aria-hidden="true" focusable="false">${TUBE}</svg>
            </div>
            <a class="pf-hit" href="${url}" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true"></a>
          </div>
          <i class="pf-foot" aria-hidden="true"><i class="pf-pool"></i></i>
        </div>
        <div class="pf-plac">
          <p class="pf-meta"><span class="hud-label">${esc(w.industry)}</span></p>
          <h2 class="pf-name" id="pf-h-${id}">${name}</h2>
          <p class="pf-blurb">${esc(w.blurb)}</p>
          <p class="pf-go">
            <a class="hud-btn hud-btn--ghost pf-cta" href="${url}" target="_blank" rel="noopener" aria-label="${label}, ${name}${note}"><span>${label} <span aria-hidden="true">↗</span></span></a>
            <span class="hud-label pf-host">${host}</span>
          </p>
        </div>
      </article>
    </li>`
}
