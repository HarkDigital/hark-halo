import { BRAND, SECTIONS, WORK, type WorkItem } from '../content'

/*
 * WORK helpers without three.js: shared by the story's Work chapter
 * (chapters/work), the accessible copy (core/srContent.ts), the Portfolio
 * page (src/portfolio) and the build (vite.config.ts writes the Portfolio's
 * description and its lead image's preload from these). Imports nothing but
 * the copy, so none of them pulls in the 3D.
 */

/** counts in words, as the chapter says them ("Nine more, all live."); beyond Twelve, numerals */
export const WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve']
export const countWord = (n: number) => WORDS[n] ?? String(n)

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

/** a pre-launch build (City Line Capital on harktest.com): always "Preview", never live */
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


/** each site's neon, by its place in WORK: a, b, c, a, b, c… (the active lights' three tubes) */
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
 * count and then by first appearance. Today: SEO, Software.
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

/** "15 sites", "3 featured", "12 more" (a zero part is left out; one site is "1 site") */
export function countParts(o: { total: number; featured: number; more: number }): string[] {
  const parts = [`${o.total} ${o.total === 1 ? 'site' : 'sites'}`]
  if (o.featured) parts.push(`${o.featured} featured`)
  if (o.more) parts.push(`${o.more} more`)
  return parts
}

/** the other sites' heading: "Twelve more, <em>all live.</em>", or "{Word} <em>more.</em>" if one is a preview */
export function moreTitleHtml(items: readonly WorkItem[]): string {
  const word = esc(countWord(items.length))
  return items.every(w => !isPreview(w.url)) ? `${word} more, <em>all live.</em>` : `${word} <em>more.</em>`
}

/**
 * The Portfolio's PROMINENT sites: the first PORTFOLIO_LEAD featured ones, in WORK
 * order, each hung on a row of its own with its placard beside it. Every other site
 * hangs in the "More work" grid below, in WORK order.
 * The story's Work chapter still shows every featured site: this split is the
 * Portfolio's alone (its page, its wall, its counts, its description and preload).
 * On the Portfolio, "featured" (the counts, the classes) means these.
 */
export const PORTFOLIO_LEAD = 3

export function portfolioSplit<T extends WorkItem>(work: readonly T[]): { lead: T[]; rest: T[] } {
  const lead = work.filter(w => w.featured).slice(0, PORTFOLIO_LEAD)
  return { lead, rest: work.filter(w => !lead.includes(w)) }
}

/**
 * The Portfolio's meta description (and og:description), from WORK:
 * "Built to be heard. Selected work by Hark Digital Design: City Line Capital,
 * ComTec Systems, Atlas Real Estate, and twelve more."
 */
export function portfolioDescription(work: readonly WorkItem[] = WORK): string {
  const { lead, rest } = portfolioSplit(work)
  const names = lead.map(w => w.name)
  const intro = `${SECTIONS.work.title} ${SECTIONS.work.eyebrow} by ${BRAND.name}`
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
