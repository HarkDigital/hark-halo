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


## Adding a service

Write the copy first with `SERVICE-PAGE-TEMPLATE.md`: what a service page is
made of, the house rules (no pricing, no turnaround times, no obvious-yes
FAQs), the length of every field, a blank template and a finished example.
A filled-in template is all a build needs: the entries in `SERVICES`
(`src/content.ts`), `SERVICE_PAGES` (`src/service/data/pages.ts`),
`SERVICE_CONTENT` (`src/service/data/content.ts`) and `CONTACT_FORM.services`,
a home plate icon (`src/chapters/services/icons.ts`) and a hero scene
(`src/service/scenes/`). The page, menus, footer and Read as a page follow.
