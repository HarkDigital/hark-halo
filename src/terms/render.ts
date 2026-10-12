import { BRAND, TERMS } from '../content'

/*
 * The terms as HTML, from content.ts TERMS: the page itself (src/terms/main.ts, with its
 * reveals) and the static copy the build puts in terms.html's <noscript> (vite.config.ts
 * termsPage), so the text is there without JavaScript, in reader modes and in archives.
 * Each section's id is its title as a slug (/terms/#privacy); the studio's address is a
 * mailto link.
 */

export const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
/** a paragraph's text, the studio's address as a mailto link */
const para = (t: string) => esc(t).split(esc(BRAND.email)).join(`<a href="mailto:${BRAND.email}">${esc(BRAND.email)}</a>`)

/** the intro and every section; `reveal`: the page's entrance classes (service.css .svc-rv) */
export function termsBodyHtml(o: { reveal: boolean }): string {
  const rv = o.reveal ? ' svc-rv' : ''
  return `
      <p class="tm-intro${rv}"${o.reveal ? ' data-rv="wipe"' : ''}>${para(TERMS.intro)}</p>
      ${TERMS.sections
        .map(
          s => `
      <section class="tm-sec${rv}">
        <h2 class="tm-h2" id="${slug(s.title)}">${esc(s.title)}</h2>
        ${s.text.map(t => `<p>${para(t)}</p>`).join('')}
      </section>`,
        )
        .join('')}`
}

/** the page without JavaScript: the heading, the date, the terms */
export function termsStaticHtml(): string {
  return `<h1>${esc(TERMS.heading)}</h1>
      <p>${esc(TERMS.updated)}</p>${termsBodyHtml({ reveal: false })}`
}
