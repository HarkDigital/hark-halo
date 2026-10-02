import { BRAND, PORTFOLIO_LEAD_IDS, PORTFOLIO_MORE, PORTFOLIO_ORDER, SECTIONS, WORK, type WorkItem } from '../content'

/*
 * WORK helpers without three.js: shared by the story's Work chapter
 * (chapters/work), the accessible copy (core/srContent.ts), the Portfolio
 * page (src/portfolio) and the build (vite.config.ts writes the Portfolio's
 * description and its lead image's preload from these). Imports nothing but
 * the copy, so none of them pulls in the 3D.
 */

/** counts in words ("Nine", "Twelve"); beyond Twelve, numerals */
export const WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve']
export const countWord = (n: number) => WORDS[n] ?? String(n)

/** a pre-launch build (City Line Capital on harktest.com): "Pre-launch build" under its button, never "live" */
export const isPreview = (url: string) => {
  try {
    return /(^|\.)harktest\.com$/i.test(new URL(url).hostname)
  } catch {
    return false
  }
}

/** the site's host as shown under its button (www. dropped) */
export const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/**
 * The Portfolio's sites, in page order (the story's Work chapter reads WORK alone): the ids
 * in content.ts PORTFOLIO_ORDER, looked up in WORK and the portfolio-only PORTFOLIO_MORE; a
 * site not listed there isn't on the page. A site's place here is its neon on the Portfolio
 * (marked pure: the story imports this file too, and never shows the portfolio-only sites. The
 * service pages count it for Web Design & Development's stat and copy, service/data/*.ts)
 */
export const PORTFOLIO_WORK: readonly WorkItem[] = /* @__PURE__ */ (() => {
  const all = new Map(WORK.concat(PORTFOLIO_MORE).map(w => [w.id, w] as const))
  return PORTFOLIO_ORDER.map(id => all.get(id)).filter((w): w is WorkItem => !!w)
})()

/** each site's neon, by its place in WORK (the Portfolio: PORTFOLIO_WORK): a, b, c, a, b, c… (the active lights' three tubes) */
export type NeonKey = 'a' | 'b' | 'c'
export const neonKey = (i: number): NeonKey => (['a', 'b', 'c'] as const)[((i % 3) + 3) % 3]

/** a tag as a URL slug (?tag=idx-search): lowercase, anything else between words a dash */
export const tagSlug = (t: string) =>
  t
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export interface TagChip {
  tag: string
  slug: string
  count: number
}

/**
 * The Portfolio's filter chips (after "All"): the tags at least `minTag` sites
 * share, leaving out any tag every site carries (it would filter nothing), by
 * count and then by first appearance. The Portfolio's (from PORTFOLIO_WORK), today: SEO,
 * Events, Ecommerce, Software, Booking, Online Ordering, Donations.
 */
export function tagChips(work: readonly WorkItem[], minTag: number): TagChip[] {
  const seen = new Map<string, TagChip>()
  for (const w of work)
    for (const t of w.tags) {
      const c = seen.get(t)
      if (c) c.count++
      else seen.set(t, { tag: t, slug: tagSlug(t), count: 1 })
    }
  // (a Map keeps first appearance; the sort is stable)
  return [...seen.values()].filter(c => c.count < work.length && c.count >= minTag).sort((a, b) => b.count - a.count)
}

/** "67 sites", "3 featured", "64 more" (a zero part is left out; one site is "1 site") */
export function countParts(o: { total: number; featured: number; more: number }): string[] {
  const parts = [`${o.total} ${o.total === 1 ? 'site' : 'sites'}`]
  if (o.featured) parts.push(`${o.featured} featured`)
  if (o.more) parts.push(`${o.more} more`)
  return parts
}

/**
 * The Portfolio's PROMINENT sites: content.ts PORTFOLIO_LEAD_IDS, in page order, each
 * hung on a row of its own with its placard beside it. Every other site
 * (PORTFOLIO_WORK) hangs in the grid below them ("More work"), in that order.
 * The story's Work chapter still shows every featured site: this split is the
 * Portfolio's alone (its page, its wall, its counts, its description and preload).
 * On the Portfolio, "featured" (the counts, the classes) means these.
 */
export function portfolioSplit<T extends WorkItem>(work: readonly T[]): { lead: T[]; rest: T[] } {
  const lead = work.filter(w => PORTFOLIO_LEAD_IDS.includes(w.id))
  return { lead, rest: work.filter(w => !lead.includes(w)) }
}

/**
 * The Portfolio's meta description (and og:description), from its client sites
 * (PORTFOLIO_WORK): "Built to be heard. Websites and software by Hark Digital
 * Design: City Line Capital, ComTec Systems, Atlas Real Estate, and 64 more."
 */
export function portfolioDescription(work: readonly WorkItem[] = PORTFOLIO_WORK): string {
  const { lead, rest } = portfolioSplit(work)
  const names = lead.map(w => w.name)
  const intro = `${SECTIONS.work.title} Websites and software by ${BRAND.name}`
  if (!names.length) return `${intro}.`
  return rest.length ? `${intro}: ${names.join(', ')}, and ${countWord(rest.length).toLowerCase()} more.` : `${intro}: ${names.join(', ')}.`
}

/*
 * The Portfolio's hang (src/portfolio/wall.ts places the screens by these; the
 * build's preload asks for the lead screenshot at the same `sizes`).
 *   prominent  one site per row: the screen (7/12 of the row on desktop, 58% on
 *              tablets) beside its placard, vertically centred; the screen's side
 *              alternates by visible index (L, R, L…: CSS grid placement only, the
 *              DOM stays screen then placard). Phones stack it: screen, then placard
 *   more       desktop three to a row; tablets two (an odd count leads with one
 *              alone on its row, centred at a half's width); phones 2-up tiles (an
 *              odd count leads with one full-width tile)
 */
/** the side a prominent site's screen hangs on (desktop and tablet) */
export type LeadSide = 'L' | 'R'
export type PhoneSlot = 'full' | 'half'

/** prominent item k of those visible: screen left, then right, then left… */
export const featuredSlot = (k: number): LeadSide => (k % 2 ? 'R' : 'L')

/** other item k of n visible: an odd count leads with one alone on its row (full width on phones, a centred half on tablets) */
export const moreSlot = (k: number, n: number): PhoneSlot => (k === 0 && n % 2 === 1 ? 'full' : 'half')

/*
 * The screenshot's rendered width (the glass: the pane less its bezel), from
 * portfolio.css. Content = 100vw less two gutters (3.4vw up to 1412px, then 48px;
 * the page tops out at 1560px).
 *   prominent, desktop  (content − gap 5vw) × 7/12 − 14px: 51.5vw − 14px at
 *                       1000px, 728px at 1440, ~795px at most
 *   prominent, tablet   (content − 28px) × .58 − 14px: ~54vw − 30px
 *   prominent, phone    content − 10px
 *   more                desktop a third of the row, tablet always half, phone half (or all)
 */
const SZ = {
  lead: { desk: 'min(51vw, 795px)', tab: 'calc(54vw - 30px)', phone: 'calc(100vw - 32px)' },
  more: { desk: 'min(29vw, 480px)', tab: 'calc(50vw - 36px)', phoneFull: 'calc(100vw - 32px)', phoneHalf: 'calc(50vw - 22px)' },
}

/** an <img sizes> for a screen: a prominent one's, or another's from its slot */
export function screenSizes(s: { featured: true } | { featured: false; p: PhoneSlot }): string {
  if (s.featured) return `(max-width: 720px) ${SZ.lead.phone}, (max-width: 999px) ${SZ.lead.tab}, ${SZ.lead.desk}`
  return `(max-width: 720px) ${s.p === 'full' ? SZ.more.phoneFull : SZ.more.phoneHalf}, (max-width: 999px) ${SZ.more.tab}, ${SZ.more.desk}`
}
