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

/** "15 sites", "6 featured", "9 more" (a zero part is left out; one site is "1 site") */
export function countParts(o: { total: number; featured: number; more: number }): string[] {
  const parts = [`${o.total} ${o.total === 1 ? 'site' : 'sites'}`]
  if (o.featured) parts.push(`${o.featured} featured`)
  if (o.more) parts.push(`${o.more} more`)
  return parts
}

/** the other sites' heading: "Nine more, <em>all live.</em>", or "{Word} <em>more.</em>" if one is a preview */
export function moreTitleHtml(items: readonly WorkItem[]): string {
  const word = esc(countWord(items.length))
  return items.every(w => !isPreview(w.url)) ? `${word} more, <em>all live.</em>` : `${word} <em>more.</em>`
}

/**
 * The Portfolio's meta description (and og:description), from WORK:
 * "Built to be heard. Selected work by Hark Digital Design: City Line Capital,
 * …, Amplifier Fundraising, and nine more."
 */
export function portfolioDescription(work: readonly WorkItem[] = WORK): string {
  const featured = work.filter(w => w.featured).map(w => w.name)
  const rest = work.length - featured.length
  const lead = `${SECTIONS.work.title} ${SECTIONS.work.eyebrow} by ${BRAND.name}`
  if (!featured.length) return `${lead}.`
  return rest ? `${lead}: ${featured.join(', ')}, and ${countWord(rest).toLowerCase()} more.` : `${lead}: ${featured.join(', ')}.`
}

/*
 * The Portfolio's hang (src/portfolio/wall.ts places the screens by these; the
 * build's preload asks for the lead screenshot at the same `sizes`).
 *   desktop  featured pairs zigzag 7 + 5, then 5 + 7; a lone last one centred at 8
 *   tablet   featured in threes: one wide, then a pair (a lone trailing half goes wide)
 *   phone    the nine as 2-up tiles; an odd count leads with one full-width tile (tablets too)
 */
export type DeskSlot = 'L7' | 'R5' | 'L5' | 'R7' | 'C8'
export type TabSlot = 'wide' | 'half'
export type PhoneSlot = 'full' | 'half'

/** featured item k of n visible */
export function featuredSlot(k: number, n: number): { d: DeskSlot; t: TabSlot } {
  const p = Math.floor(k / 2)
  const d: DeskSlot = k === n - 1 && k % 2 === 0 ? 'C8' : k % 2 === 0 ? (p % 2 === 0 ? 'L7' : 'L5') : p % 2 === 0 ? 'R5' : 'R7'
  const t: TabSlot = k % 3 === 0 || (k % 3 === 1 && k === n - 1) ? 'wide' : 'half'
  return { d, t }
}

/** other item k of n visible (phone tiles; on tablets too, an odd count leads with one wide) */
export const moreSlot = (k: number, n: number): PhoneSlot => (k === 0 && n % 2 === 1 ? 'full' : 'half')

const SZ_DESK: Record<DeskSlot | 'more', string> = {
  L7: 'min(52vw, 842px)',
  R7: 'min(52vw, 842px)',
  C8: 'min(60vw, 960px)',
  L5: 'min(37vw, 600px)',
  R5: 'min(37vw, 600px)',
  more: 'min(29vw, 480px)',
}

/** an <img sizes> for a screen from its three slots (phone, tablet, desktop) */
export function screenSizes(s: { featured: true; d: DeskSlot; t: TabSlot } | { featured: false; p: PhoneSlot }): string {
  const phone = s.featured || s.p === 'full' ? 'calc(100vw - 32px)' : 'calc(50vw - 22px)'
  const tablet = (s.featured ? s.t === 'wide' : s.p === 'full') ? 'calc(100vw - 52px)' : 'calc(50vw - 36px)'
  const desk = s.featured ? SZ_DESK[s.d] : SZ_DESK.more
  return `(max-width: 720px) ${phone}, (max-width: 999px) ${tablet}, ${desk}`
}
