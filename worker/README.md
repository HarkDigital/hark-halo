# hark-contact

The contact form's backend: a Cloudflare Worker that checks the visitor's
Turnstile token, then sends the inquiry through SendGrid (reply-to is the
visitor). The site is static, so the keys live here, never in the page.

## Go live (once)

```bash
cd worker
npx wrangler login
npx wrangler secret put TURNSTILE_SECRET     # Turnstile widget → Secret key
npx wrangler secret put SENDGRID_API_KEY     # SendGrid key with Mail Send access
npx wrangler deploy                          # prints the Worker URL
```

- Create the Turnstile widget in the Cloudflare dashboard (Turnstile → Add
  widget) with the site's hostnames (`harkdigital.github.io`, `hark.digital`).
- `CONTACT_FROM_EMAIL` in `wrangler.toml` must be a verified SendGrid sender
  (or on an authenticated domain).
- Then set `CONTACT_FORM.endpoint` (the Worker URL) and
  `CONTACT_FORM.turnstileSiteKey` (the widget's public Site key) in
  `src/content.ts`. With both empty the form falls back to the visitor's
  email app.

## Try it locally

```bash
cd worker
printf 'TURNSTILE_SECRET=1x0000000000000000000000000000000AA\nSENDGRID_API_KEY=not-a-real-key\n' > .dev.vars
npx wrangler dev   # http://127.0.0.1:8787
```

The `1x…AA` keys are Cloudflare's always-pass test keys (site key
`1x00000000000000000000AA`). `.dev.vars` is gitignored.
