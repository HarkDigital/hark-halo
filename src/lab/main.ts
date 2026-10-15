// Fonts: Schibsted Grotesk for everything (display, body and bold labels). Upright only: no italics anywhere.
import '@fontsource-variable/schibsted-grotesk'
import '../styles/base.css'
import '../ui/ui.css'
import '../service/service.css'
import './lab.css'

import { installPrintPolyfills } from '../ui/polyfills'
import { applyLightsCss } from '../kit/palette'
import { bindReveals, footerHtml, mountTop, type Current } from '../page/shell'
import { FX_LIST, mountFx } from '../fx'
import type { SceneHandle } from '../service/scenes/runner'

/*
 * THE LAB: <base>lab/ (lab.html), linked from nowhere, noindex. Every drawing
 * in src/fx, live: the mark ten ways, then ten scenes, each in a card with its
 * name, what it is, how to play with it, and the one line that puts it on any
 * page. The drawings mount as their cards near the viewport and run only while
 * on screen (the runner's own rule).
 *
 * Dev: ?only=<name> shows one card (scripts/fx-shot.mjs); ?autopilot drives a
 * synthetic cursor in every drawing (the runner reads it).
 */

installPrintPolyfills()
applyLightsCss()

document.documentElement.classList.add('is-svc', 'is-lab')
document.title = 'Lab · Hark Digital'

const current: Current = { kind: 'lab' }
mountTop({ current })

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
const only = import.meta.env.DEV ? new URLSearchParams(location.search).get('only') : null
const list = only ? FX_LIST.filter(f => f.name === only) : FX_LIST

const card = (f: (typeof FX_LIST)[number], k: number) => `
    <article class="lab-card svc-rv" data-rv="panel" style="--d:${k % 2}" id="fx-${f.name}">
      <div class="lab-fx" data-fx="${f.name}" aria-label="${esc(f.title)}: ${esc(f.blurb)}" role="img"></div>
      <div class="lab-meta">
        <h3 class="lab-t">${esc(f.title)}</h3>
        <p class="lab-p">${esc(f.blurb)}</p>
        <p class="hud-label lab-hint">${esc(f.hint)}</p>
        <code class="lab-code">mountFx(el, '${esc(f.name)}')</code>
      </div>
    </article>`

const section = (kind: 'logo' | 'scene', eyebrow: string, title: string, lede: string) => {
  const items = list.filter(f => f.kind === kind)
  if (!items.length) return ''
  return `
    <section class="svc-sec lab-sec" aria-labelledby="lab-${kind}-h">
      <p class="hud-eyebrow svc-rv" data-rv="wipe">${esc(eyebrow)}</p>
      <h2 class="hud-h2 svc-h2 svc-rv" data-words id="lab-${kind}-h">${title}</h2>
      <p class="hud-body lab-lede svc-rv" data-rv="wipe" style="--d:2">${esc(lede)}</p>
      <div class="lab-grid">${items.map(card).join('')}</div>
    </section>`
}

document.getElementById('main')!.innerHTML = `
    <header class="lab-hero">
      <p class="hud-eyebrow svc-rv" data-rv="wipe">The lab</p>
      <h1 class="hud-title lab-h1 svc-rv" data-words id="lab-h1">Light, in <em>glass.</em></h1>
      <p class="hud-body lab-lede svc-rv" data-rv="wipe" style="--d:2">Live drawings in the site's own language, every one answering the hand. Each can go in any box on any page with one line.</p>
    </header>
    ${section('logo', 'The mark', 'Ten ways to <em>light it.</em>', 'The Hark mark drawn ten ways: struck, scattered, scanned, swung apart, filled, broken, echoed, pulsed, lit and pinged.')}
    ${section('scene', 'Scenes', 'Ten rooms of <em>light.</em>', 'Atmosphere for a hero, a band, a card: each a scene in glass and neon that moves on its own and moves more for you.')}
    ${footerHtml(current)}`

bindReveals()

// the drawings mount as their cards come near, and run only while on screen (the runner's rule)
const handles = new Map<string, SceneHandle>()
const io = new IntersectionObserver(
  es => {
    for (const en of es) {
      if (!en.isIntersecting) continue
      const host = en.target as HTMLElement
      const name = host.dataset.fx!
      io.unobserve(host)
      mountFx(host, name)
        .then(h => handles.set(name, h))
        .catch(err => console.error(`[lab] ${name} failed`, err))
    }
  },
  { rootMargin: '240px 0px' },
)
document.querySelectorAll<HTMLElement>('.lab-fx').forEach(el => io.observe(el))
