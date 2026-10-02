import { CONTACT, HACK_FORM } from '../content'
import { createContactForm } from './contactForm'
import { holdInert, releaseInert } from './inert'
import { holdScene, releaseScene } from './scene'
import './formDialog.css'
import { REDUCED_MOTION } from '../kit/motion'

/*
 * The contact form as a frosted dialog over the story (the contact chapter's
 * "Contact Us", and the copy layer's). Opened by any
 * [data-contact-form] element (main.ts delegates the click);
 * [data-contact-form="hack"] opens the hack-help version (HACK_FORM: its own
 * heading and the form's 'hack' fields), a separate dialog of the same kind.
 *
 * Modal: the page layers behind go inert (ui/inert, with its no-`inert`
 * fallback), the story's smooth scroll stops, the WebGL frame holds still
 * once the sheet is up (it frosts a still image), Tab stays inside, Escape or
 * the scrim closes, and focus returns to what opened it.
 */

export type DialogKind = 'project' | 'hack'
const roots: Partial<Record<DialogKind, HTMLElement>> = {}
let root: HTMLElement | null = null
let kind: DialogKind = 'project'
let isOpen = false
let opener: HTMLElement | null = null
let holdTimer = 0

const reduced = () => REDUCED_MOTION

let keysBound = false

function build(k: DialogKind) {
  const copy = k === 'hack' ? HACK_FORM : CONTACT
  const el = document.createElement('div')
  el.className = `fd fd--${k}`
  el.setAttribute('role', 'dialog')
  el.setAttribute('aria-modal', 'true')
  el.setAttribute('aria-labelledby', `fd-title-${k}`)
  el.setAttribute('data-lenis-prevent', '')
  el.hidden = true
  el.innerHTML = `
    <div class="fd-scrim" data-fd-close></div>
    <div class="fd-sheet hud-panel hud-panel--strong">
      <button class="fd-close" type="button" data-fd-close aria-label="Close"><span aria-hidden="true"></span></button>
      <p class="hud-eyebrow">${copy.eyebrow}</p>
      <h2 class="hud-h2 fd-title" id="fd-title-${k}">${copy.title}</h2>
      <p class="hud-body fd-body">${copy.body}</p>
      <div class="fd-form"></div>
    </div>`
  el.querySelector('.fd-form')!.append(createContactForm({ kind: k }))
  el.addEventListener('click', e => {
    if ((e.target as HTMLElement).closest('[data-fd-close]')) closeContactDialog()
  })
  document.body.append(el)
  if (keysBound) return el
  keysBound = true
  // capture: the dialog's own Tab trap runs ahead of inert.ts's fallback
  window.addEventListener(
    'keydown',
    e => {
      if (!isOpen || !root) return
      if (e.key === 'Escape') {
        e.preventDefault()
        closeContactDialog()
      } else if (e.key === 'Tab') {
        const f = [...root.querySelectorAll<HTMLElement>('button, input:not(.cf-hp), select, textarea, a[href]')].filter(n => !n.hasAttribute('disabled') && n.offsetParent !== null)
        if (!f.length) return
        const i = f.indexOf(document.activeElement as HTMLElement)
        const next = e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : i < 0 || i === f.length - 1 ? 0 : i + 1
        e.preventDefault()
        f[next].focus()
      }
    },
    true,
  )
  return el
}

export function openContactDialog(from?: HTMLElement | null, k: DialogKind = 'project') {
  if (isOpen) return
  kind = k
  root = roots[k] ??= build(k)
  isOpen = true
  opener = from ?? (document.activeElement as HTMLElement | null)
  clearTimeout(holdTimer)
  root.hidden = false
  void root.offsetWidth
  root.classList.add('is-open')
  document.documentElement.classList.add('form-open')
  holdInert('form', [
    document.getElementById('stages'),
    document.getElementById('track'),
    document.getElementById('chrome'),
    document.querySelector<HTMLElement>('.skip-link'),
  ])
  window.__hark?.engine?.lenis?.stop()
  holdTimer = window.setTimeout(() => isOpen && holdScene('form'), reduced() ? 0 : 420)
  // a fresh form each time it's reopened after sending
  const done = root.querySelector<HTMLElement>('.cf-done')
  if (done && !done.hidden) {
    const slot = root.querySelector('.fd-form')!
    slot.replaceChildren(createContactForm({ kind }))
  }
  root.querySelector<HTMLElement>('.cf-input')?.focus({ preventScroll: true })
}

export function closeContactDialog() {
  if (!isOpen || !root) return
  isOpen = false
  clearTimeout(holdTimer)
  root.classList.remove('is-open')
  document.documentElement.classList.remove('form-open')
  releaseInert('form')
  releaseScene('form')
  window.__hark?.engine?.lenis?.start()
  const el = root
  holdTimer = window.setTimeout(() => !isOpen && (el.hidden = true), reduced() ? 0 : 320)
  opener?.focus?.({ preventScroll: true })
}
