import { el, rise, setRise } from '../../core/dom'
import { SECTIONS, SERVICE_CTA, SERVICES, serviceUrl } from '../../content'

/*
 * DOM for Etched. Scroll decides WHAT is on screen (the intro or which
 * plate); CSS decides HOW it arrives (words come into focus, long
 * ease-outs), so wherever the scroll rests the copy is settled and exact.
 *
 *   intro   eyebrow + "Whatever it takes."
 *   card    frosted glass: title · blurb · the service’s own
 *           page ("Explore the service →", src/service/*)
 *
 * All the items share one grid cell, so the card never changes size.
 * metrics() reports the live layout so the camera frames the column into
 * the space the copy leaves free (re-measured only when something resizes).
 */

const pad = (n: number) => String(n).padStart(2, '0')
const setOn = (node: HTMLElement, on: boolean, cls = 'is-on') => {
  if (node.classList.contains(cls) !== on) node.classList.toggle(cls, on)
}

export interface HudMetrics {
  /** right edge of the copy column (landscape) */
  colRight: number
  /** top of the card (portrait: the column lives above it) */
  cardTop: number
  /** top of the intro block (portrait) */
  introTop: number
  safeTop: number
  safeBottom: number
  gutter: number
  valid: boolean
}

export class Hud {
  private intro: HTMLElement
  private introTitle: HTMLElement
  private col: HTMLElement
  private card: HTMLElement
  private items: { root: HTMLElement; title: HTMLElement }[] = []
  private keys: HTMLButtonElement[] = []
  private probeTop: HTMLElement
  private probeBottom: HTMLElement
  private shown = -2
  private key = -2
  private dirty = true
  private m: HudMetrics = { colRight: 0, cardTop: 0, introTop: 0, safeTop: 0, safeBottom: 0, gutter: 16, valid: false }

  constructor(
    private stage: HTMLElement,
    onKey: (k: number) => void,
  ) {
    /* intro */
    this.intro = el('div', 'et-intro', undefined, stage)
    el('p', 'hud-eyebrow et-intro-eyebrow', SECTIONS.services.eyebrow, this.intro)
    this.introTitle = rise(el('h2', 'hud-title et-intro-title', undefined, this.intro), SECTIONS.services.title)

    /* the card */
    this.col = el('div', 'et-col', undefined, stage)
    this.card = el('div', 'et-card hud-panel hud-panel--strong', undefined, this.col)
    const stack = el('div', 'et-stack', undefined, this.card)
    for (const s of SERVICES) {
      const root = el('div', 'et-item', undefined, stack)
      const title = rise(el('h3', 'hud-h2 et-title', undefined, root), s.title)
      el('p', 'hud-body et-blurb', s.blurb, root)
      const more = el('a', 'hud-btn et-more', undefined, root)
      more.href = serviceUrl(s.slug)
      el('span', '', SERVICE_CTA, more)
      el('span', 'et-more-arrow', '→', more).setAttribute('aria-hidden', 'true')
      this.items.push({ root, title })
    }
    const keys = el('div', 'et-keys', undefined, this.card)
    // (one column per service: services.css --et-n)
    keys.style.setProperty('--et-n', String(SERVICES.length))
    // one dot per service (no numbers): named for assistive tech and on hover
    SERVICES.forEach((s, k) => {
      const b = el('button', 'et-key', undefined, keys)
      b.type = 'button'
      b.title = s.title
      b.setAttribute('aria-label', s.title)
      b.addEventListener('click', () => onKey(k))
      this.keys.push(b)
    })

    /* layout probes on the safe bands (for the camera fit) */
    this.probeTop = el('div', 'et-probe et-probe--top', undefined, stage)
    this.probeBottom = el('div', 'et-probe et-probe--bottom', undefined, stage)
    const ro = new ResizeObserver(() => (this.dirty = true))
    for (const n of [stage, this.col, this.card, this.intro, this.probeTop, this.probeBottom]) ro.observe(n)
    window.addEventListener('resize', () => (this.dirty = true))
  }

  /** Where the copy sits right now (stage pixels; offset* ignore transforms). */
  metrics(): HudMetrics {
    if (this.dirty) {
      const m = this.m
      const h = this.stage.offsetHeight
      if (!h) return m
      this.dirty = false
      m.colRight = this.col.offsetLeft + this.card.offsetLeft + this.card.offsetWidth
      m.cardTop = this.col.offsetTop + this.card.offsetTop
      m.introTop = this.intro.offsetTop
      m.safeTop = this.probeTop.offsetTop
      m.safeBottom = h - (this.probeBottom.offsetTop + this.probeBottom.offsetHeight)
      // (the gutter itself: on desktop the column is centred in the left half, so its own left is not it)
      m.gutter = this.probeTop.offsetLeft
      m.valid = m.colRight > 0 && m.cardTop > 0
    }
    return this.m
  }

  update(introOn: boolean, shown: number, key: number) {
    setOn(this.intro, introOn)
    setRise(this.introTitle, introOn)
    const cardOn = shown >= 0
    setOn(this.col, cardOn)
    if (shown !== this.shown) {
      this.shown = shown
      this.items.forEach((it, k) => {
        const on = k === shown
        setOn(it.root, on)
        setRise(it.title, on)
      })
    }
    if (key !== this.key) {
      this.key = key
      this.keys.forEach((b, k) => setOn(b, k === key))
    }
  }
}
