# Hark Halo — concept site

A Hark Digital concept direction, built from Hark Frost (see
`HARK-CONCEPT-PLAYBOOK.md`): the frosted glass mark, halo-lit by a neon tube
bent into the Hark mark itself.

**Live:** https://harkdigital.github.io/hark-halo/

```bash
npm install
npm run dev
npm run build
```

## Adding a portfolio site

```bash
npm run add-site -- example.com --industry="Law Firm" --name="Example Law" --blurb="One factual sentence, 64–79 characters." --tags="Booking"
```

Captures the homepage still (and its 640 copy), records the hover video, and
appends the site to `PORTFOLIO_MORE` in `src/content.ts`. Name, description
and tags are drafted from the page when left out (and flagged). Options:
`--hide=".popup"` (a site's own overlays), `--archive=<snapshot url>` (a site
that's down), `--dry`, `--force`. Then look at the still and `npm run build`.

