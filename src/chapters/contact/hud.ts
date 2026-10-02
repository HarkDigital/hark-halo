import { el, rise } from '../../core/dom'
import { BRAND, CONTACT } from '../../content'
import { directHtml } from '../../kit/contact'

/*
 * The contact panel: one frosted glass card on black (left on landscape,
 * along the bottom on portrait): the headline, the body, "Contact Us", the email · phone
 * (the form), Back to top and the colophon. (No address or Copy pill, no
 * sister concepts: the owner's call, Sep 2026.)
 *
 * Layout is MEASURED (on resize / font load / size change, never per frame)
 * so the mark can sit in whatever space the card leaves: `art` is that free
 * rectangle in CSS px. Short screens step the card down through fit levels
 * until it leaves the mark enough room:
 *   fit-1..3  type and spacing step down
 *   fit-4     the colophon line drops (it is in the copy layer and ?read)
 */

export interface Rect {
  x0: number
  y0: number
  x1: number
  y1: number
}

export interface Hud {
  stage: HTMLElement
  probe: HTMLElement
  wrap: HTMLElement
  panel: HTMLElement
  title: HTMLElement
  dirty: boolean
  /** performance.now() of the last copy (none now: kept for the mark's glint, never fires) */
  copiedAt: number
  /** the pointer / focus is on "Contact Us" (the halo swells) */
  hover: boolean
}

export interface HudLayout {
  W: number
  H: number
  portrait: boolean
  /** free area for the mark, CSS px */
  art: Rect
  panel: Rect
  /** the band between the chrome's top and bottom safe areas, CSS px */
  band: Rect
}

/**
 * Portrait layout (card along the bottom, mark above). Short landscape phones
 * keep the side-by-side layout with a compact card. Keep in sync with
 * contact.css.
 */
export const PORTRAIT_QUERY = '(max-width: 767px) and (orientation: portrait), (max-width: 767px) and (min-height: 501px), (max-aspect-ratio: 9/10)'

export function buildHud(stage: HTMLElement): Hud {
  const probe = el('div', 'ct-probe', undefined, stage)
  probe.setAttribute('aria-hidden', 'true')
  const wrap = el('div', 'ct-wrap', undefined, stage)
  const panel = el('div', 'hud-panel hud-panel--strong ct-panel', undefined, wrap)

  el('p', 'hud-eyebrow ct-eyebrow', CONTACT.eyebrow, panel)
  const words = CONTACT.title.split(' ')
  const last = words.pop() ?? ''
  const title = rise(el('h2', 'hud-title ct-title', undefined, panel), `${words.join(' ')} <em>${last}</em>`)
  el('p', 'hud-body ct-body', CONTACT.body, panel)

  // the form (ui/formDialog): the one action
  const formBtn = el('button', 'hud-btn ct-form', undefined, panel)
  formBtn.type = 'button'
  formBtn.setAttribute('data-contact-form', '')
  formBtn.innerHTML = 'Contact Us <span class="ct-go" aria-hidden="true">→</span>'

  // or directly: the email and the phone
  const direct = el('p', 'ct-direct', undefined, panel)
  direct.innerHTML = directHtml('ct-link')

  el('hr', 'hud-rule ct-rule', undefined, panel)

  const foot = el('div', 'ct-foot', undefined, panel)
  const top = el('button', 'ct-top', undefined, foot)
  top.type = 'button'
  el('span', '', 'Back to top', top)
  el('span', 'ct-arr', '↑', top).setAttribute('aria-hidden', 'true')
  top.addEventListener('click', e => {
    const hark = window.__hark
    if (!hark) return
    hark.land('hero')
    // keyboard activation: move focus to the hero's heading too
    if (e.detail === 0) hark.engine?.focusChapter('hero')
  })
  const legal = el('p', 'ct-legal', undefined, foot)
  const parts = [`© ${new Date().getFullYear()} ${BRAND.name}`, ...BRAND.locale.split(' · ')]
  parts.forEach((p, i) => {
    if (i) legal.append(' · ')
    el('span', 'ct-nw', p, legal)
  })

  const hud: Hud = { stage, probe, wrap, panel, title, dirty: true, copiedAt: -1e9, hover: false }

  const on = () => (hud.hover = true)
  const off = () => (hud.hover = false)
  formBtn.addEventListener('pointerenter', on)
  formBtn.addEventListener('pointerleave', off)
  formBtn.addEventListener('focus', on)
  formBtn.addEventListener('blur', off)

  const dirty = () => (hud.dirty = true)
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(dirty)
    ro.observe(probe)
    ro.observe(panel)
  }
  window.addEventListener('resize', dirty)
  document.fonts?.ready.then(dirty).catch(() => {})
  return hud
}

const FIT = ['ct-fit-1', 'ct-fit-2', 'ct-fit-3', 'ct-fit-4'] as const

/** Bottom of the chrome's brand lockup (CSS px), or -1 when it isn't there. */
function brandBottom() {
  const b = document.querySelector<HTMLElement>('#chrome a.ch-brand') ?? document.querySelector<HTMLElement>('a.ch-brand')
  if (!b) return -1
  const r = b.getBoundingClientRect()
  return r.height > 0 ? r.bottom : -1
}

/** Measure the card and the free area beside / above it (resize-time only). */
export function measureHud(hud: Hud, W: number, H: number, allowFit = true): HudLayout {
  const stage = hud.stage
  const portrait = matchMedia(PORTRAIT_QUERY).matches
  stage.classList.remove(...FIT)
  const band = hud.probe.getBoundingClientRect()
  const bandH = Math.max(1, band.height)
  // portrait: the card takes the lower part of the band, the mark lives above
  // it (the payoff must stay big, so phones fold the card before it grows past this)
  const limit = portrait ? bandH * (H < 720 ? 0.6 : 0.62) : bandH
  if (allowFit) {
    for (let i = 0; i < FIT.length && hud.panel.offsetHeight > limit; i++) stage.classList.add(FIT[i])
  }

  // offset* ignore the reveal transform, so the measure is stable mid-reveal
  const w = hud.wrap.getBoundingClientRect()
  const x0 = w.left + hud.panel.offsetLeft
  const y0 = w.top + hud.panel.offsetTop
  const panel = { x0, y0, x1: x0 + hud.panel.offsetWidth, y1: y0 + hud.panel.offsetHeight }

  let art: Rect
  if (!portrait) {
    const gap = Math.max(24, W * 0.03)
    art = { x0: panel.x1 + gap, x1: band.right, y0: band.top, y1: band.bottom }
  } else {
    const gap = Math.max(14, H * 0.02)
    // on phones the mark may rise into the top band, but only to just under
    // the brand lockup (it is as wide as the mark's shoulders); tablets keep
    // it under the nav pill
    const bb = brandBottom()
    const top = W < 600 ? Math.max(bb > 0 ? bb + 6 : band.top * 0.8, 40) : Math.max(band.top * 0.92, 40)
    art = { x0: band.left, x1: band.right, y0: top, y1: Math.max(top + 90, panel.y0 - gap) }
  }
  return { W, H, portrait, art, panel, band: { x0: band.left, y0: band.top, x1: band.right, y1: band.bottom } }
}
