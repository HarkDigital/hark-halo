import type { IndustryPageData } from './index'

// Real Estate: brokerages, investors, and developers: listings and property search, aerial photography,
// lead capture, investor portals, and affordable housing development
export const realEstate: IndustryPageData = {
  slug: 'real-estate',
  scene: 'street',
  headline: 'The search starts before',
  headlineAccent: 'the showing.',
  lede: 'Nearly half of home buyers start their search online, and seven in ten use a phone along the way. We build sites for brokerages, investors, and developers: search that works, aerials that sell the lot, leads that reach an agent, and portals investors open.',
  features: [
    {
      title: 'Listings and property search',
      text: 'IDX search fed by the MLS, fast on a phone, with filters that match how people actually look and listing pages Google can index. For Atlas Real Estate, that meant a full IDX-powered search inside a site that still feels like the brokerage, not a template with a logo swapped in.',
    },
    {
      title: 'Aerials that sell the lot',
      text: 'A listing from the air shows the lot lines, the water, the roof, and the neighborhood in one frame; a developer’s site shows the parcel before anything is built. Mike flies the shoots himself, FAA Part 107 licensed and insured, and we deliver stills and video cut for the listing, the website, and social.',
    },
    {
      title: 'Leads that reach an agent',
      text: 'Showing requests, valuation requests, and “tell me about this one” messages routed to the right agent, logged in the CRM, and followed up, not left in an office inbox over a weekend. Connected to Follow Up Boss, kvCORE, HubSpot, or the system your office already uses.',
    },
    {
      title: 'Investor portals',
      text: 'A password-protected portal with offerings, documents, distributions, and reports, so investors see their position without calling. City Line Capital’s platform spans 345-plus properties across 32 states, and its site has to carry that scale to an institution and a first-time investor alike.',
    },
  ],
  // National Association of Realtors, 2025 Profile of Home Buyers and Sellers (November 2025; buyers who closed
  // July 2024 to June 2025): 46 percent of buyers started their home search online, 20 percent by contacting an
  // agent, and 70 percent used a mobile device or tablet along the way (the 2024 Profile: 43 percent started online)
  stat: { value: '46%', label: 'Of home buyers started their search online. Twenty percent started by calling an agent.', viz: { kind: 'reeds', share: 46, of: 100 } },
  process: [
    { title: 'Listen', text: 'Brokerage, investor, or developer: how a lead or an inquiry arrives today, and who it should reach.' },
    { title: 'Plan the search', text: 'Listings, parcels, or offerings structured so the site, the CRM, and the MLS feed agree.' },
    { title: 'Build & shoot', text: 'The site, the search, the portal, and the aerial photography, scheduled around the light.' },
    { title: 'Launch & follow', text: 'Agents and staff trained, leads watched after launch, and the next listing added without us.' },
  ],
  clients: ['clc', 'atlas', 'epac'],
  services: ['web-design', 'aerial-media', 'seo-geo', 'software-development', 'custom-crm'],
  article: [
    {
      heading: 'Why the real estate website is the first showing',
      paragraphs: [
        'A real estate website is the first showing, and it happens without the agent in the room. The National Association of Realtors’ 2025 Profile of Home Buyers and Sellers found 46 percent of buyers started their search online and 70 percent used a phone or tablet along the way, while 20 percent started by contacting an agent. The buyer has seen the listing, the photos, the map, and the neighborhood before anyone picks up a phone, and the brokerage whose site is slow, whose search is clumsy, or whose listings live only on a national portal has already lost the introduction.',
        'Investors and developers have the same problem at a different scale. A firm raising capital for its next acquisition is researched online by the family office before the first call; a developer proposing affordable senior housing is researched by the township, the neighbors, and the lender. The website is the offering memorandum everyone reads first. For City Line Capital, a national platform with 345-plus properties across 32 states and more than two billion dollars deployed, the site has to carry that scale and still be clear to someone investing for the first time.',
      ],
    },
    {
      heading: 'What we build for brokerages, investors, and developers',
      paragraphs: [
        'For brokerages: a site that feels like the firm, IDX search fed by the MLS with listing pages Google can index, agent pages, neighborhood guides written by people who live there, and lead capture that lands in the CRM and reaches a human. Aerial photography and video for listings and land, flown by Mike as an FAA Part 107 licensed pilot, with Philadelphia’s controlled airspace cleared before takeoff. Local SEO so a search for a town and “homes for sale” finds you and not only the national portals.',
        'For investors and developers: investor portals with offerings, documents, and distributions; property and portfolio pages with the facts an underwriter wants; and for projects like Eastern Pacific Development’s affordable senior housing, a public site that explains the project plainly to the community it is built for. And when you don’t need us: a solo agent with a good brokerage site and a strong Instagram may need a one-page personal site and a tuned Google Business Profile, not a custom build. We would rather tell you that than build you something you won’t use.',
      ],
    },
  ],
  faqs: [
    {
      q: 'What is IDX, and does my brokerage website need it?',
      a: 'IDX, Internet Data Exchange, lets a brokerage display the MLS’s listings on its own website, not just its own. A brokerage site without it sends buyers to Zillow to search and hopes they come back. With it, the search, the saved homes, and the showing request happen on your site, with your agents. Solo agents can often use their brokerage’s IDX; a firm with its own brand generally wants its own.',
    },
    {
      q: 'Why does my real estate website get no leads?',
      a: 'Usually because the buyer can search elsewhere faster. Common causes: a slow site on phones, a search that is a plugin dropped onto a template, listing pages the search engines cannot index, no neighborhood content, and a contact form that goes to an inbox nobody owns. Fixing speed, search, and routing usually changes the number; we audit first and tell you which problem is yours.',
    },
    {
      q: 'How do real estate agents use drone photography?',
      a: 'For listings with land, water, a view, or a roof worth showing; for commercial property, where the parking, the access, and the loading docks are the story; and for developments, where the parcel is sold before the building exists. Mike Harkins is FAA Part 107 licensed and insured, so flights are planned, authorized, and legal, including near Philadelphia’s airports.',
    },
    {
      q: 'What is an investor portal, and when does a firm need one?',
      a: 'A password-protected part of your website where investors see the offerings, the documents, their distributions, and the reports without calling. A firm needs one when the same questions go out by email to dozens of investors every quarter, or when raising capital means sending a deal room link that looks like the firm. With a handful of investors, a well-kept document system may be enough.',
    },
    {
      q: 'How should website leads get to my agents?',
      a: 'Straight into the CRM, routed, with context. A lead that lands in Follow Up Boss, kvCORE, HubSpot, or a custom CRM with the listing it came from, the time, and the source is one an agent can act on. We route by agent, listing, or office, log everything, and set up the follow-up so a Sunday-night inquiry is not discovered on Tuesday. If your CRM has no good connection, we build the bridge.',
    },
    {
      q: 'How does a developer explain an affordable housing project online?',
      a: 'Plainly and early. A project page that says who it is for, how many units, how to apply, and the timeline the township approved, with renderings and aerials, answers what neighbors and applicants would otherwise bring to a meeting. Eastern Pacific Development builds affordable senior housing; its site has to serve the township, the lender, and a 70-year-old looking for an apartment.',
    },
  ],
  cta: 'Search your town and “homes for sale.” If the portals outrank your brokerage, talk to us.',
  metaDescription: 'Real estate websites in Philadelphia and South Jersey for brokerages, investors, and developers: IDX search, aerials, lead capture, investor portals. Hark Digital, est. 2016.',
  formService: 'Web Design & Development',
}
