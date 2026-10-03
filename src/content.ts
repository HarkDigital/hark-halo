// All copy is pulled verbatim from the 2026 site build (site-v2/src/data/*),
// so every concept stays in sync with the real voice of Hark Digital.

/**
 * This concept. scripts/new-site.sh rewrites these two values.
 *   name: shown in the chrome's "Concept · <name>" tag and the page title
 *   slug: the GitHub repo / Pages path (https://harkdigital.github.io/<slug>/)
 */
export const SITE = {
  name: 'Halo',
  slug: 'hark-halo',
}

/**
 * Every Hark concept site, for "see the other concepts" links. Add each new
 * concept here once it ships (the current one is filtered out by slug).
 */
export const CONCEPTS = [
  { name: 'Classic 2026 site', slug: 'hark-digital-2026' },
  { name: 'Orbit', slug: 'hark-igloo' },
  { name: 'Resonance', slug: 'hark-resonance' },
  { name: 'Press', slug: 'hark-press' },
  { name: 'Town', slug: 'hark-town' },
  { name: 'Arcade', slug: 'hark-arcade' },
  { name: 'Glass', slug: 'hark-glass' },
  { name: 'Tower', slug: 'hark-tower' },
  { name: 'Silicon', slug: 'hark-silicon' },
  { name: 'Plexus', slug: 'hark-plexus' },
  { name: 'Frost', slug: 'hark-frost' },
  { name: 'Contour', slug: 'hark-contour' },
  { name: 'Primetime', slug: 'hark-primetime' },
  { name: 'Noir', slug: 'hark-noir' },
  { name: 'Neon', slug: 'hark-neon' },
  { name: 'Opal', slug: 'hark-opal' },
  { name: 'Halo', slug: 'hark-halo' },
].map(c => ({ ...c, url: `https://harkdigital.github.io/${c.slug}/` }))

/** The other concepts (everything except this one). */
export const OTHER_CONCEPTS = CONCEPTS.filter(c => c.slug !== SITE.slug)

export const BRAND = {
  name: 'Hark Digital Design',
  short: 'Hark.Digital',
  email: 'info@hark.digital',
  tagline: 'Make the internet listen.',
  locale: 'Philadelphia · Everywhere · est. 2016',
  manifesto:
    'Software, web design, ecommerce, SEO/GEO, security, and aerial media. From publicly traded companies to mom-and-pop pizza shops.',
  classicSite: 'https://harkdigital.github.io/hark-digital-2026/',
}

/** The service's own page on this site (src/service/*, one per slug: <base>services/<slug>/). */
export const serviceUrl = (slug: string) => `${import.meta.env.BASE_URL}services/${slug}/`
/** the classic site's own call to action on each service card, verbatim */
export const SERVICE_CTA = 'Explore the service'

export interface Service {
  num: string
  slug: string
  title: string
  blurb: string
  tags: string[]
}

export const SERVICES: Service[] = [
  {
    num: '01',
    slug: 'software-development',
    title: 'Software Development',
    blurb:
      'Custom CRMs, client portals, and dashboards built around how your business actually runs. Every lead, job, and customer in one system that fits like it was made for you, because it was.',
    tags: ['Custom CRMs', 'Client Portals', 'Dashboards', 'Integrations'],
  },
  {
    num: '02',
    slug: 'web-design',
    title: 'Web Design & Development',
    blurb:
      'Beautiful, functional websites that promote your business and are easy to update. Modern frameworks, responsive on every device, built to convert visitors into customers.',
    tags: ['UI/UX', 'Responsive', 'CMS', 'Branding'],
  },
  {
    num: '03',
    slug: 'ecommerce',
    title: 'Ecommerce',
    blurb:
      'From thousands of products to a single payment portal, secure, flexible online stores with the analytics to track sales, spot trends, and grow.',
    tags: ['Online Stores', 'Payment Portals', 'Analytics', 'Conversion'],
  },
  {
    num: '04',
    slug: 'seo-geo',
    title: 'SEO / GEO',
    blurb:
      'Search engine optimization for how people find you today, and generative engine optimization for how AI answers about you tomorrow. Stay visible in both worlds.',
    tags: ['Search Ranking', 'AI Discoverability', 'Local SEO', 'Content Strategy'],
  },
  {
    num: '05',
    slug: 'page-speed',
    title: 'Page Speed',
    blurb:
      'Slow site dragging down your Google score and your sales? We fix Core Web Vitals, turn those red PageSpeed and GTmetrix numbers green, and make pages load in a blink.',
    tags: ['Core Web Vitals', 'PageSpeed Insights', 'GTmetrix', 'Load Time'],
  },
  {
    num: '06',
    slug: 'ai-consulting',
    title: 'AI Consulting',
    blurb:
      'Cut through the hype. We find where AI genuinely saves your business time and money, build it into your workflow, and skip the snake oil.',
    tags: ['Opportunity Audit', 'Custom AI Tools', 'Automation', 'Team Training'],
  },
  {
    num: '07',
    slug: 'aerial-media',
    title: 'Aerial Photography & Video',
    blurb:
      'Professional, insured drone piloting for cinematic productions, real estate, construction progress, inspections, and imagery that makes your site impossible to scroll past.',
    tags: ['Drone Video', 'Real Estate', 'Inspections', 'Cinematic'],
  },
  {
    num: '08',
    slug: 'hack-remediation',
    title: 'Hack Remediation',
    blurb:
      'Site compromised? We find the breach, clean the infection, restore your site, and close the door behind us, then harden everything so it stays closed.',
    tags: ['Malware Removal', 'Breach Response', 'Recovery', 'Blocklist Removal'],
  },
  {
    num: '09',
    slug: 'security',
    title: 'Website & Data Security',
    blurb:
      'Proactive protection for your website and the data behind it, hardening, monitoring, backups, and updates handled before problems become headlines.',
    tags: ['Hardening', 'Monitoring', 'Backups', 'SSL & Compliance'],
  },
  {
    num: '10',
    slug: 'ada-accessibility',
    title: 'ADA Accessibility',
    blurb:
      'One in four American adults lives with a disability. We audit and fix your site to WCAG standards, so every visitor can use it and ADA demand letters have nothing to find.',
    tags: ['WCAG Audits', 'Remediation', 'Screen Reader Testing', 'ADA Compliance'],
  },
  {
    num: '11',
    slug: 'wordpress',
    title: 'WordPress',
    blurb:
      'Powering over forty percent of the web, and most of its headaches. We build, rescue, speed up, and secure WordPress sites, and we’ve seen every way they break.',
    tags: ['Custom Builds', 'Plugin Rescue', 'Speed & Security', 'Care Plans'],
  },
]

export interface WorkItem {
  id: string
  name: string
  url: string
  industry: string
  blurb: string
  tags: string[]
  featured: boolean
}

/** Screenshot for a work item: public/work/<id>.webp (1280×800). */
export const workImage = (id: string) => `${import.meta.env.BASE_URL}work/${id}.webp`
/** Its half-size copy: public/work/640/<id>.webp (640×400, made by npm run thumbs). */
export const workThumb = (id: string) => `${import.meta.env.BASE_URL}work/640/${id}.webp`
/**
 * Its preview video on the Portfolio: public/work/video/<id>.mp4 (800×500, ~7s, muted, a scroll
 * down the homepage; made by scripts/work-video.mjs). Optional: the build lists which exist
 * (virtual:work-videos), and a site without one keeps its still screenshot.
 */
export const workVideo = (id: string) => `${import.meta.env.BASE_URL}work/video/${id}.mp4`

/** The Portfolio page (src/portfolio): every site, at <base>portfolio/. */
export const portfolioUrl = () => `${import.meta.env.BASE_URL}portfolio/`

/** The Portfolio page's own words (everything else on it is the copy above, verbatim). */
export const PORTFOLIO = {
  eyebrow: 'Portfolio',
  title: 'Portfolio · Hark Digital',
  all: 'All',
  filterLabel: 'Filter by tag',
  allWork: 'All work',
  /** the grid's name for screen readers (it has no visible heading: it follows the prominent rows straight on) */
  moreLabel: 'More work',
  shotAlt: (name: string) => `Screenshot of the ${name} website`,
  /** a tag gets a filter chip once this many sites on the page share it */
  minTag: 2,
  /** the tag filter (the glass rail of chips over the wall). Off for now: true brings it back as it was */
  filters: false,
}

/*
 * THE HOME PAGE'S 15: the story's Work chapter (its carousel, the accessible copy
 * and the Read-as-a-page fallback), in the order they run there. Kept as the first
 * 15 of PORTFOLIO_ORDER below; the first six are featured (the carousel's leaves),
 * the other nine its halo tiles. A site that moves in here needs its scrub clips:
 * scripts/work-video.mjs --scrub --scrub-only --travel=700 for the six, --scrub=tile
 * for the nine (875 at --w=1600). A quarter of the hover video's travel, so each
 * screen scrolls its site slowly under the page's scroll.
 */
export const WORK: WorkItem[] = [
  {
    id: 'nefloors',
    name: 'NorthEastern Services',
    url: 'https://nefloors.com/',
    industry: 'Athletic & Commercial Flooring',
    blurb: 'Athletic and commercial flooring since 1995, with 24/7 emergency response.',
    tags: ['Web Design/Development', 'Software Development', 'AI Consulting'],
    featured: true,
  },
  {
    id: 'scribewise',
    name: 'Scribewise',
    url: 'https://scribewise.com/',
    industry: 'Marketing & PR',
    blurb: 'Thought leadership marketing and GEO for professional services firms.',
    tags: ['Web Design/Development', 'Software Development'],
    featured: true,
  },
  {
    id: 'clc',
    name: 'City Line Capital',
    url: 'https://clc.harktest.com/',
    industry: 'Real Estate Investment',
    blurb: 'National real estate platform, 345+ properties across 32 states, $2B+ deployed.',
    tags: ['Web Design/Development', 'SEO/GEO', 'Software Development'],
    featured: true,
  },
  {
    id: 'atlas',
    name: 'Atlas Real Estate',
    url: 'https://soldbyatlas.com/',
    industry: 'Real Estate',
    blurb: 'Full IDX-powered listing search for a brokerage that rethinks real estate.',
    tags: ['Web Design/Development'],
    featured: true,
  },
  {
    id: 'acctrans',
    name: 'Accelerated Transport',
    url: 'https://acctrans.net/',
    industry: 'Trucking & Logistics',
    blurb: 'Long-haul freight, fleet showcase, and CDL-A driver recruiting.',
    tags: ['Web Design/Development', 'SEO/GEO'],
    featured: true,
  },
  {
    id: 'phade',
    name: 'Phade',
    url: 'https://phade.app/',
    industry: 'Sports Pools App',
    blurb: 'Free sports pick’em and bankroll contests for friends, played on real lines.',
    tags: ['Web Design/Development', 'Software Development'],
    featured: true,
  },
  {
    id: 'dnssolutions',
    name: 'DNS Solutions',
    url: 'https://dnssolutionsnj.com/',
    industry: 'Security Systems',
    blurb: 'Security, fire, and camera systems for both homes and businesses.',
    tags: ['Web Design/Development'],
    featured: false,
  },
  {
    id: 'jomar',
    name: 'Jomar Corporation',
    url: 'https://jomarcorp.com/',
    industry: 'Industrial Manufacturing',
    blurb: 'Global leader in injection blow molding machines, selling worldwide.',
    tags: ['Web Design/Development', 'SEO/GEO'],
    featured: false,
  },
  {
    id: 'tricity',
    name: 'TriCity Kitchens',
    url: 'https://tricitykitchen.com/',
    industry: 'Kitchen & Bath',
    blurb: 'Cabinetry, countertops, and two showrooms serving the Mid-Atlantic.',
    tags: ['Web Design/Development', 'SEO/GEO'],
    featured: false,
  },
  {
    id: 'shrivers',
    name: 'Shriver’s',
    url: 'https://shrivers.com/',
    industry: 'Candy & Confections',
    blurb: 'Salt water taffy and fudge, on the Ocean City boardwalk since 1898.',
    tags: ['Web Design/Development', 'Ecommerce', 'AI Consulting', 'Software Development'],
    featured: false,
  },
  {
    id: 'fourx',
    name: 'FourX Ventures',
    url: 'https://fourx.ventures/',
    industry: 'Growth Advisory / Investment',
    blurb: 'Strategic investor helping founder-led companies scale, raise capital, or exit.',
    tags: ['Web Design/Development'],
    featured: false,
  },
  {
    id: 'semilla',
    name: 'Semilla Bread',
    url: 'https://semillabreadusa.com/',
    industry: 'Bakery',
    blurb: 'Sourdough bakery in Wilmington, Delaware, with roots in Bogotá, Colombia.',
    tags: ['Web Design/Development', 'Online Ordering'],
    featured: false,
  },
  {
    id: 'bageluniversity',
    name: 'Bagel University',
    url: 'https://bageluniversity.net/',
    industry: 'Bagel Shop',
    blurb: 'Vineland bagel shop, with online ordering and DoorDash delivery.',
    tags: ['Web Design/Development', 'Online Ordering'],
    featured: false,
  },
  {
    id: 'tixforgood',
    name: 'Tix For Good',
    url: 'https://tixforgood.org/',
    industry: 'Nonprofit Platform',
    blurb: 'Donor appreciation network connecting brands, nonprofits, and donors.',
    tags: ['Web Design/Development', 'Software'],
    featured: false,
  },
  {
    id: 'reliablepower',
    name: 'Reliable Power Plus',
    url: 'https://reliablepowerplus.com/',
    industry: 'Generators',
    blurb: 'Standby generator installation and service across the Philadelphia region.',
    tags: ['Web Design/Development', 'SEO/GEO'],
    featured: false,
  },
]

/*
 * PORTFOLIO ONLY: every other client site, on the Portfolio page alone (src/portfolio;
 * the story never reads them). In page order, then the sites kept off the page.
 * Add one with `npm run add-site -- <url> --industry="…"` (scripts/add-site.mjs: the still,
 * its 640 copy, the hover video, the entry here and its place at the end of
 * PORTFOLIO_ORDER); ids are unique across both lists. Never featured.
 */
export const PORTFOLIO_MORE: WorkItem[] = [
  {
    id: 'crabtrap',
    name: 'The Crab Trap',
    url: 'https://thecrabtrap.com/',
    industry: 'Seafood Restaurant',
    blurb: 'Jersey Shore seafood landmark in Somers Point, with live entertainment.',
    tags: ['Web Design/Development', 'Ecommerce', 'Events'],
    featured: false,
  },
  {
    id: 'tasteofearth',
    name: 'Taste of Earth Dispensary',
    url: 'https://tasteofearth.co/',
    industry: 'Cannabis Dispensary',
    blurb: 'Cannabis dispensary in Buena, with online pre-orders and a rewards program.',
    tags: ['Web Design/Development', 'Ecommerce'],
    featured: false,
  },
  {
    id: 'sharkys',
    name: 'Sharky’s Sports Bar & Grill',
    url: 'https://sharkyssportsbarngrill.com/',
    industry: 'Sports Bar & Grill',
    blurb: 'Williamstown’s neighborhood bar and grill, with pool tables and a rooftop deck.',
    tags: ['Web Design/Development'],
    featured: false,
  },
  {
    id: 'eaglepallet',
    name: 'Eagle Pallet Co.',
    url: 'https://eaglepalletco.com/',
    industry: 'Pallet Manufacturing',
    blurb: 'New, recycled, and heat-treated pallets from Millville and Vineland since 2003.',
    tags: ['Web Design/Development'],
    featured: false,
  },
  {
    id: 'terraverde',
    name: 'Terra Verde Garden Design',
    url: 'https://terraverdegardens.com/',
    industry: 'Landscape Design',
    blurb: 'Coastal and native garden design and care, from Ocean City to Philadelphia.',
    tags: ['Web Design/Development'],
    featured: false,
  },
  {
    id: 'abilitynetwork',
    name: 'Ability Network of Delaware',
    url: 'https://abilitynetworkde.org/',
    industry: 'Disability Services Association',
    blurb: 'Statewide membership association for Delaware’s disability service providers.',
    tags: ['Web Design/Development'],
    featured: false,
  },
  {
    id: 'ogren',
    name: 'Ogren Construction',
    url: 'http://ogrenconstruction.com/',
    industry: 'Construction',
    blurb: 'Enthusiasm and passion down to the last detail, in commercial construction.',
    tags: ['Web Design/Development', 'Photography'],
    featured: false,
  },
  {
    id: 'outercoastal',
    name: 'Outer Coastal Plain',
    url: 'https://outercoastalplain.com/',
    industry: 'Wine & Viticulture',
    blurb: "Trade association for one of America's most surprising wine regions.",
    tags: ['Web Design/Development'],
    featured: false,
  },
  {
    id: 'knightsinsurance',
    name: 'Knights of Columbus Virtus Agency',
    url: 'https://knightsinsurance.org/',
    industry: 'Insurance',
    blurb: 'Catholic life insurance, long-term care, and annuities from a Virginia agency.',
    tags: ['Web Design/Development', 'Events'],
    featured: false,
  },
  {
    id: 'founderspay',
    name: 'FoundersPay',
    url: 'https://founderspay.com/',
    industry: 'Payments / Merchant Services',
    blurb: 'Merchant services and Clover point of sale for retail and restaurants.',
    tags: ['Web Design/Development', 'Software'],
    featured: false,
  },
  {
    id: 'cynthiaroberts',
    name: 'Cynthia Roberts Salon',
    url: 'https://cynthiarobertssalon.com/',
    industry: 'Salon & Spa',
    blurb: 'Full-service hair and nail salon in Vineland since 1996, with eGift cards.',
    tags: ['Web Design/Development', 'Booking'],
    featured: false,
  },
  {
    id: 'mahs',
    name: 'Mid-Atlantic Hurricane Shutters',
    url: 'https://mahsnj.com/',
    industry: 'Garage Doors & Shutters',
    blurb: 'Garage doors, hurricane shutters, and screens for the Jersey Shore since 2017.',
    tags: ['Web Design/Development'],
    featured: false,
  },
  {
    id: 'midatlantic',
    name: 'MidAtlantic',
    url: 'https://midatlanticeng.com/',
    industry: 'Engineering',
    blurb: 'Civil, environmental, and marine engineering, plus architecture and surveying.',
    tags: ['Web Design/Development'],
    featured: false,
  },
  {
    id: 'amplifier',
    name: 'Amplifier Fundraising',
    url: 'https://amplifierfundraising.org/',
    industry: 'Nonprofit Fundraising',
    blurb: 'Professional fundraising that encourages good: auctions, ambassadors, and more.',
    tags: ['Web Design/Development', 'Branding'],
    featured: false,
  },
  {
    id: 'renati',
    name: 'Renati Solutions',
    url: 'https://renatisolutions.com/',
    industry: 'Communications & PR',
    blurb: 'Business development, community relations, and PR in the Philadelphia region.',
    tags: ['Web Design/Development'],
    featured: false,
  },
  {
    id: 'schwing',
    name: 'SCHWING Technologies',
    url: 'https://schwing.tech/',
    industry: 'Industrial Manufacturing',
    blurb: 'High-temperature thermal cleaning systems for global manufacturers.',
    tags: ['Web Design/Development', 'SEO/GEO'],
    featured: false,
  },
  {
    id: 'cumberland',
    name: 'Cumberland Internal Medicine',
    url: 'https://cumberlandinternalmedicine.com/',
    industry: 'Healthcare',
    blurb: '30 years of primary care and infectious disease expertise in the Philadelphia region.',
    tags: ['Web Design/Development', 'SEO/GEO'],
    featured: false,
  },
  {
    id: 'haines',
    name: 'Haines Family Dental',
    url: 'https://hainesfamilydental.com/',
    industry: 'Dentistry',
    blurb: 'Creating healthy smiles with a modern, welcoming practice site.',
    tags: ['Web Design/Development', 'SEO/GEO'],
    featured: false,
  },
  {
    id: 'djwagner',
    name: 'DJ Wagner',
    url: 'https://djwagner.com/',
    industry: 'Commercial HVAC',
    blurb: 'Commercial HVAC design-build and sheet metal fabrication since 1989.',
    tags: ['Web Design/Development'],
    featured: false,
  },
  {
    id: 'guidancecenter',
    name: 'The Guidance Center',
    url: 'https://ccgcnj.org/',
    industry: 'Mental Health Nonprofit',
    blurb: 'Community mental health agency serving Cumberland County for over 60 years.',
    tags: ['Web Design/Development', 'Donations', 'Events'],
    featured: false,
  },
  {
    id: 'coreproperty',
    name: 'Core Property Service',
    url: 'https://corepropertyservice.com/',
    industry: 'Landscaping',
    blurb: 'Landscape design, lawn maintenance, and seasonal cleanup across South Jersey.',
    tags: ['Web Design/Development'],
    featured: false,
  },
  {
    id: 'crabbyjacks',
    name: 'Crabby Jack’s',
    url: 'https://crabbyjacksnj.com/',
    industry: 'Restaurant & Bar',
    blurb: 'Bayside bar behind the Crab Trap, with live music seven nights a week.',
    tags: ['Web Design/Development', 'Events'],
    featured: false,
  },
  {
    id: 'doubleeagle',
    name: 'Double Eagle Saloon',
    url: 'https://doubleeaglesaloon.com/',
    industry: 'Restaurant & Bar',
    blurb: 'Vineland saloon serving slow-smoked barbecue and burgers, with online ordering.',
    tags: ['Web Design/Development', 'Online Ordering'],
    featured: false,
  },
  {
    id: 'providersoft',
    name: 'ProviderSoft',
    url: 'https://www.providersoftllc.com/',
    industry: 'Healthcare Software',
    blurb: 'Case management and billing software for early childhood service providers.',
    tags: ['Web Design/Development'],
    featured: false,
  },
  {
    id: 'eastlyn',
    name: 'Eastlyn & The Greenview Inn',
    url: 'https://eastlyngolf.com/',
    industry: 'Golf Course & Event Venue',
    blurb: 'Nine-hole golf course and wedding venue in Vineland, with online tee times.',
    tags: ['Web Design/Development', 'Ecommerce', 'Booking'],
    featured: false,
  },
  {
    id: 'fairacres',
    name: 'Fair Acres Geriatric Center',
    url: 'https://www.fairacres.org/',
    industry: 'Skilled Nursing / Senior Care',
    blurb: 'County-owned skilled nursing and rehab, serving Delaware County for 200+ years.',
    tags: ['Web Design/Development', 'Drone Video'],
    featured: false,
  },
  {
    id: 'fabbri',
    name: 'Fabbri Builders',
    url: 'https://fabbribuilders.com/',
    industry: 'Construction / Design-Build',
    blurb: 'Design-build and general contracting since 1968, and a Varco-Pruden dealer.',
    tags: ['Web Design/Development'],
    featured: false,
  },
  {
    id: 'epac',
    name: 'Eastern Pacific Development',
    url: 'https://epacdevco.com/',
    industry: 'Affordable Housing Development',
    blurb: 'Affordable senior housing and community redevelopment, built in-house.',
    tags: ['Web Design/Development'],
    featured: false,
  },
  {
    id: 'grassngravel',
    name: 'Grass’n Gravel',
    url: 'https://grassngravel.com/',
    industry: 'Musician / Band',
    blurb: 'South Jersey alt-country, roots rock, and folk band, with a self-titled album.',
    tags: ['Web Design/Development'],
    featured: false,
  },
  {
    id: 'hotys',
    name: 'Hang On To Your Shorts',
    url: 'https://hangontoyourshorts.com/',
    industry: 'Film Festival',
    blurb: 'Annual short film festival in Red Bank, plus a screenplay competition.',
    tags: ['Web Design/Development'],
    featured: false,
  },
  {
    id: 'gregjones',
    name: 'Greg Jones Project',
    url: 'https://gregjonesproject.com/',
    industry: 'Musician / Band',
    blurb: 'South Jersey singer-songwriter and his band, with the album Volume One.',
    tags: ['Web Design/Development'],
    featured: false,
  },
  // (public/work/libertypoint.webp is from a Wayback Machine snapshot: the live site was
  // temporarily down, Sep 2026. Retake it from the live site once it's back up)
  {
    id: 'libertypoint',
    name: 'Liberty Point Solutions',
    url: 'https://libertypointsolutions.com/',
    industry: 'Wealth Management',
    blurb: 'Multigenerational wealth management and family governance, based in Vineland.',
    tags: ['Web Design/Development'],
    featured: false,
  },
  {
    id: 'mmk9',
    name: 'Manners Matter K9 Training',
    url: 'https://mmk9training.com/',
    industry: 'Dog Training',
    blurb: 'Reward-based balanced dog training and boot camps in Egg Harbor Township.',
    tags: ['Web Design/Development'],
    featured: false,
  },
  {
    id: 'missiontransitions',
    name: 'Mission Transitions',
    url: 'https://missiontransitions.com/',
    industry: 'Senior Transition Services',
    blurb: 'Aging-in-place, relocation, and care management for the Philadelphia region.',
    tags: ['Web Design/Development'],
    featured: false,
  },
  {
    id: 'dominicks',
    name: 'Dominick’s Pizza',
    url: 'https://mydominicks.com/',
    industry: 'Pizzeria',
    blurb: 'Family-owned Vineland pizzeria since 1989, with online ordering.',
    tags: ['Web Design/Development', 'Online Ordering'],
    featured: false,
  },
  {
    id: 'newcomb',
    name: 'Newcomb Senior Housing',
    url: 'https://newcombseniorapartments.com/',
    industry: 'Senior Living',
    blurb: 'Affordable independent apartments for seniors 55 and older in Vineland.',
    tags: ['Web Design/Development'],
    featured: false,
  },
  {
    id: 'northeastenergy',
    name: 'Northeast Energy Center',
    url: 'https://northeastenergycenter.com/',
    industry: 'Energy',
    blurb: 'Liquefied natural gas project in Charlton, Massachusetts, serving New England.',
    tags: ['Web Design/Development'],
    featured: false,
  },
  {
    id: 'onepartsocial',
    name: 'One Part Social',
    url: 'https://onepartsocial.com/',
    industry: 'Social Media Marketing',
    blurb: 'Woman-owned social media agency serving Philadelphia and the Jersey Shore.',
    tags: ['Web Design/Development'],
    featured: false,
  },
  {
    id: 'paddockpulse',
    name: 'Paddock Pulse',
    url: 'https://paddockpulse.org/',
    industry: 'Horse Racing Game',
    blurb: 'Browser horse racing game where players breed, train, and race a stable.',
    tags: ['Web Design/Development', 'Software'],
    featured: false,
  },
  {
    id: 'perotti',
    name: 'Perotti Farms',
    url: 'https://perottifarms.com/',
    industry: 'Herb & Microgreen Farm',
    blurb: 'Herbs and microgreens from a Cumberland County farm, by order or subscription.',
    tags: ['Web Design/Development', 'Ecommerce'],
    featured: false,
  },
  {
    id: 'pier4',
    name: 'Pier 4 Hotel',
    url: 'https://pier4hotel.com/',
    industry: 'Hotel',
    blurb: 'Family-run bayfront hotel in Somers Point, minutes from Ocean City’s boardwalk.',
    tags: ['Web Design/Development'],
    featured: false,
  },
  {
    id: 'ridgeroller',
    name: 'Ridge Roller Customs',
    url: 'https://ridgeroller.com/',
    industry: 'Disc Golf Equipment',
    blurb: 'Modular disc golf carts and backpacks, designed and handmade in the USA.',
    tags: ['Web Design/Development', 'Ecommerce'],
    featured: false,
  },
  {
    id: 'andujar',
    name: 'Law Office of Carlos Andujar',
    url: 'https://andujarlaw.com/',
    industry: 'Law Firm',
    blurb: 'Bilingual South Jersey attorney for criminal defense, traffic, and family law.',
    tags: ['Web Design/Development'],
    featured: false,
  },
  {
    id: 'salemsenior',
    name: 'Salem Senior Village',
    url: 'https://salemseniorvillage.com/',
    industry: 'Senior Living',
    blurb: 'Affordable apartments for independent seniors 55 and older in Salem.',
    tags: ['Web Design/Development'],
    featured: false,
  },
  {
    id: 'buenagardens',
    name: 'Buena Gardens',
    url: 'https://buenagardens.com/',
    industry: 'Senior Living',
    blurb: 'Affordable independent apartments for seniors 55 and older in Sicklerville.',
    tags: ['Web Design/Development'],
    featured: false,
  },
  {
    id: 'breastfeeding',
    name: 'Solutions for Breastfeeding',
    url: 'https://solutionsforbreastfeeding.com/',
    industry: 'Lactation Consulting',
    blurb: 'Lactation consults and breastfeeding classes in Sewell, booked and paid online.',
    tags: ['Web Design/Development', 'Ecommerce', 'Booking'],
    featured: false,
  },
  {
    id: 'tikvah',
    name: 'Tikvah AJMI',
    url: 'https://tikvahajmi.org/',
    industry: 'Mental Health Nonprofit',
    blurb: 'Philadelphia Jewish nonprofit hosting events for adults with mental illness.',
    tags: ['Web Design/Development', 'Donations', 'Events'],
    featured: false,
  },
  {
    id: 'zingmini',
    name: 'Zing Mini Discs',
    url: 'https://zingmini.com/',
    industry: 'Disc Golf Equipment',
    blurb: 'Custom hot-stamped disc golf mini discs, sold in bulk from 100 pieces.',
    tags: ['Web Design/Development', 'Ecommerce'],
    featured: false,
  },
  {
    id: 'villafazzolari',
    name: 'Villa Fazzolari',
    url: 'https://villafazzolari.com/',
    industry: 'Italian Restaurant',
    blurb: 'Family-owned Italian restaurant and sports bar in Buena Vista, with take-out.',
    tags: ['Web Design/Development', 'Online Ordering', 'Booking'],
    featured: false,
  },
  {
    id: 'comtec',
    name: 'ComTec Systems',
    url: 'https://comtecsystems.net/',
    industry: 'Telecom / UCaaS',
    blurb: 'Cloud voice and unified communications, with customer and partner portals.',
    tags: ['Web Design/Development', 'Software', 'SEO/GEO'],
    featured: false,
  },
  {
    id: 'mosaic',
    name: 'Mosaic',
    url: 'https://mosaicgiving.org/',
    industry: 'Nonprofit',
    blurb: 'Giving and events that support South Jersey seniors and dementia caregivers.',
    tags: ['Web Design/Development', 'Donations', 'Events'],
    featured: false,
  },
  {
    id: 'njroadtests',
    name: 'NJ Road Tests',
    url: 'https://njroadtests.com/',
    industry: 'Driving School',
    blurb: 'Rental cars for MVC road tests in Delanco, booked online by time slot.',
    tags: ['Web Design/Development', 'Booking'],
    featured: false,
  },
]

/*
 * The Portfolio page's running order (Mike's "Updated Client order", 2026-10-02):
 * ids top to bottom. The first two (PORTFOLIO_LEAD_IDS) hang as prominent rows, each
 * on a row of its own; every other listed site hangs in the grid below, in this
 * order. A site in WORK / PORTFOLIO_MORE that isn't listed here isn't on the page
 * (its data is kept: mosaic, njroadtests). The home page shows the first 15 (WORK).
 */
export const PORTFOLIO_ORDER: readonly string[] = [
  'nefloors',
  'scribewise',
  'clc',
  'atlas',
  'acctrans',
  'phade',
  'dnssolutions',
  'jomar',
  'tricity',
  'shrivers',
  'fourx',
  'semilla',
  'bageluniversity',
  'tixforgood',
  'reliablepower',
  'crabtrap',
  'tasteofearth',
  'sharkys',
  'eaglepallet',
  'terraverde',
  'abilitynetwork',
  'ogren',
  'outercoastal',
  'knightsinsurance',
  'founderspay',
  'cynthiaroberts',
  'mahs',
  'midatlantic',
  'amplifier',
  'renati',
  'schwing',
  'cumberland',
  'haines',
  'djwagner',
  'guidancecenter',
  'coreproperty',
  'crabbyjacks',
  'doubleeagle',
  'providersoft',
  'eastlyn',
  'fairacres',
  'fabbri',
  'epac',
  'grassngravel',
  'hotys',
  'gregjones',
  'libertypoint',
  'mmk9',
  'missiontransitions',
  'dominicks',
  'newcomb',
  'northeastenergy',
  'onepartsocial',
  'paddockpulse',
  'perotti',
  'pier4',
  'ridgeroller',
  'andujar',
  'salemsenior',
  'buenagardens',
  'breastfeeding',
  'tikvah',
  'zingmini',
  'villafazzolari',
  'comtec',
]
export const PORTFOLIO_LEAD_IDS: readonly string[] = PORTFOLIO_ORDER.slice(0, 2)

export interface Testimonial {
  quote: string
  name: string
  company: string
}

// Real client reviews of Hark Digital Design.
export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      'Hark Digital delivers what you want in every partner – technical expertise, a collegial approach to work and a commitment to our success.',
    name: 'John Miller',
    company: 'Scribewise',
  },
  {
    quote:
      'Mike has exceptional technical ability but at his core he is an artist. He brilliantly created a clean, concise and modern website that has significantly bolstered our business.',
    name: 'Andrew Fabbri',
    company: 'Fabbri Builders',
  },
  {
    quote:
      'His ideas were fresh and unique to our company. Mike helped launch a successful holiday season campaign that brought us record number sales.',
    name: 'Holly Kisby',
    company: "Shriver's Salt Water Taffy",
  },
  {
    quote:
      'Very excited to have worked with Mike to get our website totally fixed after a disaster experience with TWO other developers. In one month, he turned around a website that fits our needs, suits our vibe, and looks awesome.',
    name: 'Barbara Barber',
    company: 'CrossFit Off The Grid',
  },
  {
    quote:
      'They deliver a quality product with great support at a fraction of the cost of other media companies. Any time we have a question they are quick to respond.',
    name: 'Scott Quarella',
    company: 'Bellview Winery',
  },
  {
    // an excerpt of Alicia's review (the full text is longer than the card holds)
    quote:
      'From the very first interaction I had with Mike, he was attentive, professional, and full of creative ideas that truly brought our vision to life. … It’s clear that he puts pride in his work, and it shows.',
    name: 'Alicia Fichera',
    company: 'DNS Solutions',
  },
  {
    quote:
      'Mike built the website on time, on budget, trained us, and followed up to make sure everything was running smooth throughout the entire project.',
    name: 'Pete Rose',
    company: 'The Home Hero',
  },
  {
    quote:
      'Mike was able to update our brand and transform our website into something we are really proud of. His creativity, responsiveness and professionalism made the whole process easy.',
    name: 'Alicyn Harkness',
    company: 'ProviderSoft',
  },
]

/** Headline stats, verbatim from the service pages (site-v2/src/data/servicePages.ts); the portfolio's is counted (its client sites). */
export const STATS = [
  { value: '10 years', label: 'Of custom software for real businesses. Portals, dashboards, and integrations since 2016.' },
  { value: String(PORTFOLIO_ORDER.length), label: 'Live sites in the portfolio right now, from dentists to global manufacturers' },
  { value: '$1M+', label: 'Flows through client stores we built, every single year' },
]

/** The original site's section headers — they carry "listen" through the story. */
export const SECTIONS = {
  work: { eyebrow: 'Our work', title: 'See for yourself.' },
  services: { eyebrow: 'What we do', title: 'Whatever it takes.' },
  voices: { eyebrow: 'Client voices', title: 'They talk. We Listen.' },
}

/** How every engagement runs (Software Development process, servicePages.ts). */
export const PROCESS = [
  { title: 'Listen', text: 'We map how work actually flows through your business, not how the org chart says it does.' },
  { title: 'Prototype', text: 'A clickable model first. You react to something real before we build the real thing.' },
  { title: 'Build', text: 'Short cycles, working software at every step. No black box.' },
  { title: 'Support', text: 'We stay after launch, updates, tweaks, and the next idea when you’re ready.' },
]

/**
 * HUD microcopy in Hark's own "hark means listen" voice — deliberately not
 * borrowed from igloo.inc.
 */
/** THEME: give every concept its own microcopy (don't reuse another concept's). */
export const MICROCOPY = {
  signalEyebrow: 'Hark Digital Design',
  scrollHint: 'Scroll down to navigate',
  audio: 'Sound',
  motion: 'Motion',
  audioOn: 'On',
  audioOff: 'Off',
}

export const SECURITY = {
  eyebrow: 'Hack remediation · Website & data security',
  title: 'Hacked? Breathe.',
  body: 'It happens to careful businesses too, and it can be fixed. We handle the cleanup from start to finish, explain in plain English what happened, and keep watch afterward so it doesn’t happen again.',
  cta: 'Emergency cleanup →',
  href: 'mailto:info@hark.digital?subject=Emergency%3A%20my%20site%20was%20hacked',
  /** the fix, step by step (the sign does each as it's ticked off) */
  fixEyebrow: 'How we fix it',
  fixTitle: 'From hacked to <em>handled.</em>',
  steps: ['Find the breach', 'Clean the infection', 'Restore the site', 'Lock the door behind us'],
}

/**
 * The contact form: fields, options and messages verbatim from the classic
 * site's /contact page. Submissions POST JSON {name, email, company, service,
 * message, website (honeypot)} to `endpoint` — the classic site's own
 * /api/contact takes exactly this payload, as do form services such as
 * Formspree. With no endpoint (a static host), the form composes the message
 * in the visitor's email app instead, addressed to BRAND.email.
 *
 * endpoint          the hark-contact Worker (worker/: Turnstile + SendGrid)
 * turnstileSiteKey  Cloudflare Turnstile's PUBLIC site key; the form shows the
 *                   check and sends its token (the Worker verifies it)
 */
export const CONTACT_FORM = {
  endpoint: '',
  turnstileSiteKey: '',
  services: [
    'Web Design & Development',
    'Software Development',
    'Ecommerce',
    'SEO / GEO',
    'AI Consulting',
    'Aerial Photography & Video',
    'Hack Remediation',
    'Website & Data Security',
    'ADA Accessibility',
    'WordPress',
    'Something else',
  ],
  submit: 'Send message',
  sending: 'Sending…',
  note: 'We reply to every message. No spam, ever.',
  sentTitle: 'Message sent.',
  sentBody: 'Thanks for reaching out. We’ll be in touch.',
  missing: 'Please fill in your name, email, and message',
  badEmail: 'That email address looks off',
  unverified: 'Please complete the verification',
}

/**
 * The hack-help form: the contact form's 'hack' variant in its own dialog, opened
 * by the Shield chapter's "Emergency cleanup" ([data-contact-form="hack"]). It
 * asks where the site lives (domain) and what it runs on (platform); the message
 * is optional, so someone mid-crisis can send it in seconds.
 */
export const HACK_FORM = {
  eyebrow: 'Hack remediation',
  title: 'Hacked? We’re on it.',
  body: 'Tell us where it’s happening and what it runs on, and we’ll take it from there.',
  platforms: [
    'WordPress',
    'WooCommerce',
    'Shopify',
    'Squarespace',
    'Wix',
    'Webflow',
    'HTML / static site',
    'Joomla',
    'Drupal',
    'Custom-built',
    'Something else',
    'Not sure',
  ],
  domainPlaceholder: 'yourdomain.com',
  messagePlaceholder: 'What are you seeing? Redirects, a Google warning, strange pages, spam sent from your site…',
  submit: 'Get help now',
  missing: 'Please fill in your name, email, website, and platform',
  badDomain: 'That website address looks off',
  sentTitle: 'We’re on it.',
  sentBody: 'Thanks. We’ll look at your site and be in touch.',
}

export const CONTACT = {
  eyebrow: 'Start a project',
  title: 'Say hello.',
  body: 'Tell us what you are building, fixing, or dreaming up.',
  href: 'mailto:info@hark.digital?subject=New%20project',
  /** shown under the card's button (home, service pages, portfolio, copy layer) */
  email: 'info@hark.digital',
  phone: '(856) 818-HARK (4275)',
  /** the phone's digits, for tel: */
  tel: '+18568184275',
  /** spoken: the vanity letters as the digits a caller dials */
  phoneSpoken: '(856) 818-4275',
}
