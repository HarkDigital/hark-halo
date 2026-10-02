/*
 * hark-contact — the contact form's backend (Cloudflare Worker).
 *
 * POST JSON {name, email, company, service, message, website, turnstileToken}
 *   (+ {phone, domain, platform} from the site's hack-help form: service "Hack
 *   Remediation", its message optional; the email is titled "Hacked site: …")
 * (the Halo form's payload; `website` is the honeypot) →
 *   1. CORS: only ALLOWED_ORIGINS may post
 *   2. honeypot: a filled `website` is a bot → a quiet 200
 *   3. validation (the classic site's messages)
 *   4. Turnstile: the token is checked with Cloudflare (TURNSTILE_SECRET)
 *   5. SendGrid: the message is emailed to CONTACT_TO_EMAIL, reply-to the visitor
 * → 200 {ok: true} or 4xx/5xx {error}
 *
 * Secrets (wrangler secret put): SENDGRID_API_KEY, TURNSTILE_SECRET.
 */

export interface Env {
  SENDGRID_API_KEY: string
  TURNSTILE_SECRET: string
  CONTACT_TO_EMAIL?: string
  CONTACT_FROM_EMAIL?: string
  ALLOWED_ORIGINS?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const esc = (s: string) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)
const clip = (s: unknown, n: number) => String(s ?? '').slice(0, n).trim()

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const origin = req.headers.get('Origin') ?? ''
    const allowed = (env.ALLOWED_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean)
    const ok = allowed.includes(origin)
    const cors: Record<string, string> = ok
      ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Accept', 'Access-Control-Max-Age': '86400', Vary: 'Origin' }
      : { Vary: 'Origin' }
    const json = (status: number, body: object) =>
      new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors } })

    if (req.method === 'OPTIONS') return new Response(null, { status: ok ? 204 : 403, headers: cors })
    if (req.method !== 'POST') return json(405, { error: 'Method not allowed' })
    if (!ok) return json(403, { error: 'Origin not allowed' })

    let body: Record<string, unknown>
    try {
      body = (await req.json()) as Record<string, unknown>
    } catch {
      return json(400, { error: 'Bad request' })
    }
    // honeypot: real people never fill it
    if (body.website) return json(200, { ok: true })

    const name = clip(body.name, 200)
    const email = clip(body.email, 200)
    const company = clip(body.company, 200)
    const service = clip(body.service, 120)
    const message = clip(body.message, 8000)
    const phone = clip(body.phone, 60)
    const domain = clip(body.domain, 253)
    const platform = clip(body.platform, 80)
    const hack = !!domain
    if (hack ? !name || !email || !platform : !name || !email || !message)
      return json(400, { error: hack ? 'Please fill in your name, email, website, and platform' : 'Please fill in your name, email, and message' })
    if (!EMAIL_RE.test(email)) return json(400, { error: 'That email address looks off' })

    // Turnstile: is this a person?
    if (!env.TURNSTILE_SECRET) return json(500, { error: 'Verification is not configured' })
    const form = new FormData()
    form.append('secret', env.TURNSTILE_SECRET)
    form.append('response', clip(body.turnstileToken, 4096))
    const ip = req.headers.get('CF-Connecting-IP')
    if (ip) form.append('remoteip', ip)
    const check = (await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form }).then(r => r.json()).catch(() => ({ success: false }))) as {
      success?: boolean
    }
    if (!check.success) return json(400, { error: 'Please complete the verification' })

    // SendGrid
    if (!env.SENDGRID_API_KEY) return json(500, { error: 'Email service is not configured' })
    const to = env.CONTACT_TO_EMAIL || 'info@hark.digital'
    const from = env.CONTACT_FROM_EMAIL || 'noreply@hark.digital'
    const lines = [
      `Name: ${name}`,
      `Email: ${email}`,
      phone ? `Phone: ${phone}` : '',
      company ? `Company: ${company}` : '',
      service ? `Service: ${service}` : '',
      domain ? `Website: ${domain}` : '',
      platform ? `Platform: ${platform}` : '',
      '',
      message || '(no details given)',
    ].filter((l, i, a) => l !== '' || i === a.length - 2)
    const html = `<p>${lines.slice(0, -1).filter(Boolean).map(esc).join('<br>')}</p><p>${esc(message).replace(/\n/g, '<br>')}</p><p style="color:#888">Sent from ${esc(origin)}</p>`
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.SENDGRID_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: from, name: 'Hark Digital website' },
        reply_to: { email, name },
        subject: hack ? `Hacked site: ${domain} (${platform})` : `New inquiry from ${name}${company ? ` · ${company}` : ''}`,
        content: [
          { type: 'text/plain', value: `${lines.join('\n')}\n\nSent from ${origin}` },
          { type: 'text/html', value: html },
        ],
      }),
    })
    if (!res.ok) return json(502, { error: 'Could not send right now' })
    return json(200, { ok: true })
  },
}
