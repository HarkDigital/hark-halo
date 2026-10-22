import type { StatViz, SceneName } from '../../service/data/pages'
import type { ArticleBlock, Faq } from '../../service/data/content'
import { manufacturing } from './manufacturing'
import { construction } from './construction'
import { restaurants } from './restaurants'
import { retail } from './retail'
import { transportation } from './transportation'
import { healthcare } from './healthcare'
import { seniorLiving } from './senior-living'
import { nonprofits } from './nonprofits'
import { realEstate } from './real-estate'
import { professionalServices } from './professional-services'

/*
 * THE INDUSTRY PAGES' words (src/industry/main.ts renders them): one file per industry,
 * in the shape of a service page (src/service/data) with two sections of its own, the
 * clients built for that line of work and the services that fit it. The nav-weight list
 * (title, blurb, order) is INDUSTRIES in src/content.ts; a slug here must match one there
 * (vite.config.ts checks at build). Copy follows INDUSTRY-PAGE-TEMPLATE.md: no prices,
 * no turnaround times, no obvious-yes FAQs, every stat true and sourced in a comment.
 */

/** the hero scene: an industry's own (src/industry/scenes) or, until it has one, a service's */
export type IndustryScene = 'pressline' | 'crane' | 'floorplan' | 'shelves' | 'routes' | 'pulse' | 'campus' | 'giving' | 'street' | 'calendar' | SceneName

export interface IndustryPageData {
  slug: string
  scene: IndustryScene
  headline: string
  /** part of the headline rendered in the signal color */
  headlineAccent?: string
  lede: string
  /** "What you get": four */
  features: { title: string; text: string }[]
  /** the band's number, its words (verbatim) and the picture drawn of it (service/stat) */
  stat: { value: string; label: string; viz: StatViz }
  /** "How it works": four steps; left out, the page shows the shared PROCESS (content.ts) */
  process?: { title: string; text: string }[]
  /** "The clients": WorkItem ids (content.ts WORK / PORTFOLIO_MORE); shown in the Portfolio's order */
  clients: string[]
  /** "Services that fit": service slugs (SERVICE_PAGES), in order, four to six */
  services: string[]
  article: ArticleBlock[]
  faqs: Faq[]
  /** a real client's exact words, only where there is one */
  quote?: { text: string; name: string; company: string }
  /** the closing line */
  cta: string
  metaDescription: string
  /** a CONTACT_FORM.services title the contact form preselects; none: "Choose one…" */
  formService?: string
}

export const INDUSTRY_PAGES: Record<string, IndustryPageData> = Object.fromEntries(
  [manufacturing, construction, restaurants, retail, transportation, healthcare, seniorLiving, nonprofits, realEstate, professionalServices].map(p => [p.slug, p]),
)
