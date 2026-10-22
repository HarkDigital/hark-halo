import type { ArticleBlock, Faq } from '../service/data/content'

/*
 * THE PLAIN PAGES' SECTIONS, as HTML strings: the service pages (src/service/main.ts) and
 * the industry pages (src/industry/main.ts) are the same anatomy in service.css's
 * classes, so each builds its page from these and adds only its own parts. Pure
 * functions of their copy: no DOM, nothing mounted (the entrances, bindReveals, and the
 * cursor glow, bindSpots, are the shell's: src/page/shell.ts).
 */

export const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
/** "a, b, and c" */
export const listOf = (xs: string[]) => (xs.length < 3 ? xs.join(' and ') : `${xs.slice(0, -1).join(', ')}, and ${xs[xs.length - 1]}`)
/** a title in a sentence ("…about page speed."): title-case words go lower case; AI, SEO, WordPress keep theirs */
export const inSentence = (t: string) => t.replace(/\b[A-Z][a-z]+\b/g, w => w.toLowerCase())

export interface HeroCopy {
  eyebrow: string
  headline: string
  /** part of the headline rendered in the signal color */
  headlineAccent?: string
  lede: string
  /** the ghost button beside "Start a project": where it goes and what it says */
  backHref: string
  backLabel: string
}

/** The hero: the art's box, the scrim, eyebrow, headline, lede and the two buttons. */
export function heroHtml(o: HeroCopy): string {
  const headline = `${esc(o.headline)}${o.headlineAccent ? ` <em>${esc(o.headlineAccent)}</em>` : ''}`
  const long = `${o.headline} ${o.headlineAccent ?? ''}`.trim().length
  return `<section class="svc-hero" aria-labelledby="svc-h1">
      <div class="svc-art" aria-hidden="true"></div>
      <div class="svc-hero-scrim" aria-hidden="true"></div>
      <div class="svc-hero-copy">
        <p class="hud-eyebrow svc-rv" data-rv="wipe">${esc(o.eyebrow)}</p>
        <h1 class="hud-title svc-h1 svc-rv${long > 30 ? ' is-long' : ''}" data-words id="svc-h1">${headline}</h1>
        <p class="hud-body svc-lede svc-rv" data-rv="wipe" style="--d:3">${esc(o.lede)}</p>
        <div class="svc-ctas svc-rv" style="--d:5">
          <a class="hud-btn" href="#svc-contact">Start a project</a>
          <a class="hud-btn hud-btn--ghost" href="${o.backHref}"><span aria-hidden="true">←</span> ${o.backLabel}</a>
        </div>
      </div>
    </section>`
}

/** "What you get": four frosted panels. */
export function featuresHtml(items: { title: string; text: string }[], heading = 'What you get'): string {
  const features = items
    .map(
      (f, k) => `
        <li class="svc-feature hud-panel svc-rv" data-rv="panel" style="--d:${k}">
          <span class="svc-trace svc-trace--halo" aria-hidden="true"></span><span class="svc-trace" aria-hidden="true"></span>
          <h3 class="svc-feature-t">${esc(f.title)}</h3>
          <p class="svc-feature-p">${esc(f.text)}</p>
        </li>`,
    )
    .join('')
  return `<section class="svc-sec svc-features" aria-labelledby="svc-features-h">
      <h2 class="svc-eyebrow hud-eyebrow svc-rv" data-rv="wipe" id="svc-features-h">${esc(heading)}</h2>
      <ul class="svc-feature-grid">${features}</ul>
    </section>`
}

/** "How it works": the fixed heading and four steps on a hairline. */
export function processHtml(items: { title: string; text: string }[]): string {
  const steps = items
    .map(
      (s, k) => `
        <li class="svc-step svc-rv" data-rv="step" style="--d:${k}">
          <span class="svc-wire" aria-hidden="true"></span><span class="svc-node" aria-hidden="true"></span>
          <h3 class="svc-step-t">${esc(s.title)}</h3>
          <p class="svc-step-p">${esc(s.text)}</p>
        </li>`,
    )
    .join('')
  return `<section class="svc-sec svc-process" aria-labelledby="svc-process-h">
      <p class="hud-eyebrow svc-rv" data-rv="wipe">How it works</p>
      <h2 class="hud-h2 svc-h2 svc-rv" data-words id="svc-process-h">First we listen. Then we <em>build.</em></h2>
      <ol class="svc-steps">${steps}</ol>
    </section>`
}

/** "The longer version": the article's sections (a third goes wide); '' with none. */
export function articleHtml(blocks: ArticleBlock[] | undefined): string {
  return blocks
    ? `
    <section class="svc-sec svc-article" aria-labelledby="svc-article-h">
      <h2 class="svc-eyebrow hud-eyebrow svc-rv" data-rv="wipe" id="svc-article-h">The longer version</h2>
      <div class="svc-article-grid">
        ${blocks
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
}

/** "Questions, answered": the accordion, headed "What people ask us about <title in a sentence>."; '' with none. */
export function faqHtml(faqs: Faq[] | undefined, title: string): string {
  return faqs
    ? `
    <section class="svc-sec svc-faq" aria-labelledby="svc-faq-h">
      <p class="hud-eyebrow svc-rv" data-rv="wipe">Questions, answered</p>
      <h2 class="hud-h2 svc-h2 svc-rv" data-words id="svc-faq-h">What people ask us about ${esc(inSentence(title))}.</h2>
      <div class="svc-faq-list">
        ${faqs
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
}

/** A client's words, when the page has some; '' without. */
export function quoteHtml(q: { text: string; name: string; company: string } | undefined): string {
  return q
    ? `
    <section class="svc-sec svc-quote-sec" aria-label="A client">
      <figure class="svc-quote hud-panel svc-rv" data-rv="panel">
        <span class="svc-trace svc-trace--halo" aria-hidden="true"></span><span class="svc-trace" aria-hidden="true"></span>
        <span class="svc-quote-mark" aria-hidden="true">“</span>
        <blockquote class="hud-quote svc-rv" data-words>${esc(q.text)}</blockquote>
        <figcaption class="hud-label">${esc(q.name)} · ${esc(q.company)}</figcaption>
      </figure>
    </section>`
    : ''
}

/** The closing line, then the previous and next page of the ring. */
export function nextHtml(o: { cta: string; label: string; prev: { href: string; title: string }; next: { href: string; title: string } }): string {
  return `<section class="svc-sec svc-next" aria-label="Next">
      <p class="svc-cta-line svc-rv" data-words>${esc(o.cta)}</p>
      <nav class="svc-pn svc-rv" data-rv="side" aria-label="${esc(o.label)}">
        <a class="svc-pn-a" href="${o.prev.href}" rel="prev"><span class="hud-label">Previous</span><span class="svc-pn-t"><span aria-hidden="true">←</span> ${esc(o.prev.title)}</span></a>
        <a class="svc-pn-a svc-pn-a--next" href="${o.next.href}" rel="next"><span class="hud-label">Next</span><span class="svc-pn-t">${esc(o.next.title)} <span aria-hidden="true">→</span></span></a>
      </nav>
    </section>`
}
