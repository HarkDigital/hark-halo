// Fonts: Schibsted Grotesk for everything (display, body and bold labels). Upright only: no italics anywhere.
import '@fontsource-variable/schibsted-grotesk'
import '../styles/base.css'
import '../ui/ui.css'
import '../service/service.css'
import './terms.css'

import { installPrintPolyfills } from '../ui/polyfills'
import { applyLightsCss } from '../kit/palette'
import { TERMS } from '../content'
import { bindReveals, contactHtml, footerHtml, mountContact, mountTop, type Current } from '../page/shell'
import { esc, termsBodyHtml } from './render'

/*
 * THE TERMS: the site's terms and conditions, its privacy section included, at <base>terms/
 * (terms.html; the build writes dist/terms/index.html with its title, description and a
 * static copy of the terms in <noscript>, vite.config.ts). The words are content.ts TERMS,
 * put together by render.ts. The header, Menu sheet, contact card and footer are the plain
 * pages' own (page/shell.ts), with nothing lit up top and Terms & Privacy marked in the footer.
 *
 *   hero      "Legal", "Terms and conditions.", the date they last changed
 *   terms     the intro, then each section (a heading, its id a slug: /terms/#privacy, and
 *             its paragraphs) in one readable column
 *   contact   "Say hello." and the form (no service chosen), the footer
 *
 * Printing: every section is shown at once, without the chrome (terms.css @media print).
 */

installPrintPolyfills()
applyLightsCss()

document.documentElement.classList.add('is-svc', 'is-tm')
document.title = TERMS.title

const current: Current = { kind: 'terms' }
mountTop({ current })

const cut = TERMS.heading.lastIndexOf(' ')
const h1 = `${esc(TERMS.heading.slice(0, cut))} <em>${esc(TERMS.heading.slice(cut + 1))}</em>`

document.getElementById('main')!.innerHTML = `
    <header class="tm-hero">
      <p class="hud-eyebrow svc-rv" data-rv="wipe">${esc(TERMS.eyebrow)}</p>
      <h1 class="hud-title tm-h1 svc-rv" data-words id="tm-h1">${h1}</h1>
      <p class="tm-updated svc-rv" data-rv="wipe" style="--d:2">${esc(TERMS.updated)}</p>
    </header>
    <article class="tm-body" aria-labelledby="tm-h1">${termsBodyHtml({ reveal: true })}
    </article>
    ${contactHtml()}
    ${footerHtml(current)}`

// the contact card: the form with no service chosen ("Choose one…"), its neon edge
mountContact()
bindReveals()
// a link to one section (/terms/#privacy): the page is built now, so go there
if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView()
// (printing shows every section, scrolled to or not)
addEventListener('beforeprint', () => document.querySelectorAll('.svc-rv').forEach(n => n.classList.add('is-in')))
