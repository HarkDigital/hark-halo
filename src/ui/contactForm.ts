import { BRAND, CONTACT_FORM } from '../content'
import './contactForm.css'

/*
 * The contact form (the service pages' "Say hello." card, and the dialog the
 * story's contact chapter opens). Fields and messages are the classic site's.
 *
 *   endpoint set   POST JSON {name, email, company, service, message, website}
 *                  → "Message sent." (or the endpoint's error + the address)
 *   no endpoint    the message is composed in the visitor's email app (mailto),
 *                  addressed to BRAND.email — works on a static host
 *
 * A honeypot field (`website`) catches bots. Validation mirrors the classic
 * endpoint's own. Errors are announced (role=alert); fields carry
 * aria-invalid / aria-describedby while they are wrong.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/* Cloudflare Turnstile (only with a site key): loaded once, rendered per form */
interface Turnstile {
  render(el: HTMLElement, o: Record<string, unknown>): string
  getResponse(id: string): string | undefined
  reset(id: string): void
}
declare global {
  interface Window {
    turnstile?: Turnstile
  }
}
let turnstileLoad: Promise<Turnstile | null> | null = null
function loadTurnstile(): Promise<Turnstile | null> {
  if (turnstileLoad) return turnstileLoad
  turnstileLoad = new Promise(resolve => {
    if (window.turnstile) return resolve(window.turnstile)
    const s = document.createElement('script')
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    s.async = true
    s.onload = () => resolve(window.turnstile ?? null)
    s.onerror = () => resolve(null)
    document.head.append(s)
  })
  return turnstileLoad
}

let uid = 0

export interface ContactFormOpts {
  /** preselect "What do you need?" (a service page's own service) */
  service?: string
  /** called once the message is sent (or handed to the email app) */
  onDone?: () => void
}

export function createContactForm(o: ContactFormOpts = {}): HTMLElement {
  const id = `cf${++uid}`
  const root = document.createElement('div')
  root.className = 'cf'
  const opts = CONTACT_FORM.services.map(s => `<option value="${s}"${s === o.service ? ' selected' : ''}>${s}</option>`).join('')
  root.innerHTML = `
    <form class="cf-form" novalidate>
      <input class="cf-hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" />
      <div class="cf-row">
        <p class="cf-field">
          <label class="cf-label" for="${id}-name">Name *</label>
          <input class="cf-input" id="${id}-name" name="name" required autocomplete="name" placeholder="Jane Doe" />
        </p>
        <p class="cf-field">
          <label class="cf-label" for="${id}-email">Email *</label>
          <input class="cf-input" id="${id}-email" name="email" type="email" required autocomplete="email" placeholder="jane@company.com" />
        </p>
      </div>
      <div class="cf-row">
        <p class="cf-field">
          <label class="cf-label" for="${id}-company">Company</label>
          <input class="cf-input" id="${id}-company" name="company" autocomplete="organization" placeholder="Optional" />
        </p>
        <p class="cf-field">
          <label class="cf-label" for="${id}-service">What do you need?</label>
          <span class="cf-select">
            <select class="cf-input" id="${id}-service" name="service">
              <option value=""${o.service ? '' : ' selected'} disabled>Choose one…</option>${opts}
            </select>
          </span>
        </p>
      </div>
      <p class="cf-field">
        <label class="cf-label" for="${id}-message">Message *</label>
        <textarea class="cf-input cf-text" id="${id}-message" name="message" required rows="5" placeholder="Tell us about your project, timeline, and anything else that helps."></textarea>
      </p>
      ${CONTACT_FORM.turnstileSiteKey ? '<div class="cf-turnstile"></div>' : ''}
      <p class="cf-error" id="${id}-error" role="alert"></p>
      <button class="hud-btn cf-submit" type="submit"><span class="cf-submit-t">${CONTACT_FORM.submit}</span> <span aria-hidden="true">→</span></button>
      <p class="cf-note">${CONTACT_FORM.note}</p>
    </form>
    <div class="cf-done" role="status" hidden>
      <span class="cf-check" aria-hidden="true">✓</span>
      <p class="cf-done-t">${CONTACT_FORM.sentTitle}</p>
      <p class="cf-done-b">${CONTACT_FORM.sentBody}</p>
    </div>`

  const form = root.querySelector<HTMLFormElement>('form')!
  const err = root.querySelector<HTMLElement>('.cf-error')!
  const done = root.querySelector<HTMLElement>('.cf-done')!
  const submit = root.querySelector<HTMLButtonElement>('.cf-submit')!
  const submitT = root.querySelector<HTMLElement>('.cf-submit-t')!
  const field = (n: string) => form.elements.namedItem(n) as HTMLInputElement | HTMLTextAreaElement

  // Turnstile: rendered once the form is in the page (the dialog builds it detached)
  let ts: Turnstile | null = null
  let tsId = ''
  const tsSlot = root.querySelector<HTMLElement>('.cf-turnstile')
  if (tsSlot) {
    void loadTurnstile().then(t => {
      if (!t) return
      const mount = () => {
        if (!tsSlot.isConnected) return requestAnimationFrame(mount)
        ts = t
        tsId = t.render(tsSlot, { sitekey: CONTACT_FORM.turnstileSiteKey, theme: 'dark', size: 'flexible', appearance: 'interaction-only' })
      }
      mount()
    })
  }

  const mark = (els: (HTMLInputElement | HTMLTextAreaElement)[]) => {
    for (const n of ['name', 'email', 'message']) {
      const f = field(n)
      const bad = els.includes(f)
      f.toggleAttribute('aria-invalid', bad)
      if (bad) f.setAttribute('aria-describedby', err.id)
      else f.removeAttribute('aria-describedby')
    }
  }
  const fail = (msg: string, els: (HTMLInputElement | HTMLTextAreaElement)[] = []) => {
    err.textContent = `${msg}. You can also email us directly at ${BRAND.email}.`
    mark(els)
    els[0]?.focus()
  }
  const finish = () => {
    form.hidden = true
    done.hidden = false
    form.reset()
    o.onDone?.()
  }

  form.addEventListener('submit', async e => {
    e.preventDefault()
    const data = Object.fromEntries(new FormData(form).entries()) as Record<string, string>
    // honeypot: real people never fill it
    if (data.website) return finish()
    const name = (data.name ?? '').trim()
    const email = (data.email ?? '').trim()
    const message = (data.message ?? '').trim()
    const missing = [!name && field('name'), !email && field('email'), !message && field('message')].filter(Boolean) as HTMLInputElement[]
    if (missing.length) return fail(CONTACT_FORM.missing, missing)
    if (!EMAIL_RE.test(email)) return fail(CONTACT_FORM.badEmail, [field('email')])
    err.textContent = ''
    mark([])

    if (!CONTACT_FORM.endpoint) {
      // a static host: hand the message to the visitor's email app
      const lines = [`Name: ${name}`, `Email: ${email}`, data.company ? `Company: ${data.company}` : '', data.service ? `Service: ${data.service}` : '', '', message].filter(
        (l, i) => l !== '' || i === 4,
      )
      const subject = `New inquiry from ${name}${data.company ? ` · ${data.company}` : ''}`
      location.href = `mailto:${BRAND.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`
      return finish()
    }

    const turnstileToken = ts && tsId ? (ts.getResponse(tsId) ?? '') : ''
    if (tsSlot && !turnstileToken) return fail(CONTACT_FORM.unverified)
    submit.disabled = true
    submitT.textContent = CONTACT_FORM.sending
    try {
      const res = await fetch(CONTACT_FORM.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ name, email, company: data.company ?? '', service: data.service ?? '', message, website: '', turnstileToken }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error || `Request failed (${res.status})`)
      }
      finish()
    } catch (x) {
      fail(x instanceof Error ? x.message : 'Something went wrong')
      // a token is single-use: get a fresh one for the next try
      if (ts && tsId) ts.reset(tsId)
    } finally {
      submit.disabled = false
      submitT.textContent = CONTACT_FORM.submit
    }
  })
  return root
}
