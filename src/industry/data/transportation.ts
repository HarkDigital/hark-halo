import type { IndustryPageData } from './index'

// Transportation & Logistics: carriers, brokers, and fleets: customer portals, load tracking, quotes,
// driver tools, integrations, and recruiting drivers through the site
export const transportation: IndustryPageData = {
  slug: 'transportation',
  scene: 'routes',
  headline: 'Keep it moving, on the road',
  headlineAccent: 'and online.',
  lede: 'Carriers, brokers, and fleets run on phone calls, PDFs, and a dispatch board that lives in one person’s head. We build the websites and software that take the load off: customer portals, load tracking, and recruiting that works from a phone at a truck stop.',
  features: [
    {
      title: 'Portals and load tracking',
      text: 'Shippers log in to see where the load is, download the BOL and the POD, and check an invoice without calling dispatch. We pull status from your ELD or TMS and show it plainly, on a phone. Fewer “where’s my truck” calls, and a customer who feels looked after without anyone on your side picking up the phone.',
    },
    {
      title: 'Quotes that don’t sit',
      text: 'A quote request that captures the lanes, the freight, the dates, and the equipment, routed to the right person and logged against the customer. Repeat shippers get rates from a portal; new ones get a reply that proves someone read it. Rate confirmations and tenders can follow the same path.',
    },
    {
      title: 'Driver tools and recruiting',
      text: 'The driver shortage is won online. We build recruiting pages that show the trucks, the pay, the home time, and the routes honestly, with an application a driver can finish on a phone, sent straight to your recruiter. For Accelerated Transport, that meant a fleet showcase and CDL-A hiring on one site.',
    },
    {
      title: 'Wired to the stack you have',
      text: 'TMS, ELD, accounting, fuel cards, load boards, and factoring speak different languages. We connect them, so a load entered once appears in dispatch, on the customer portal, on the driver’s phone, and in the invoice. Where a vendor has no API, we build the bridge. The code and the data are yours, nothing rented.',
    },
  ],
  // American Trucking Associations with S&P Global Market Intelligence, Freight Transportation Forecast 2024 to 2035
  // (2024): trucks moved 72.7 percent of US freight tonnage in 2024 (shown rounded, 73 percent)
  stat: { value: '73%', label: 'Of US freight tonnage moves by truck. Shippers and drivers size a carrier up online.', viz: { kind: 'reeds', share: 73, of: 100 } },
  process: [
    { title: 'Listen', text: 'We sit in dispatch: how a load comes in, who quotes it, how the customer learns where it is, and what the drivers hate.' },
    { title: 'Prototype', text: 'A clickable model of the portal or the tool, tried by a dispatcher and a driver before we build the real thing.' },
    { title: 'Build & connect', text: 'Short cycles, working software at every step, wired to your TMS, ELD, and accounting system.' },
    { title: 'Roll out', text: 'Drivers and customers brought on in groups, with the old way still running until the new one is trusted.' },
  ],
  clients: ['acctrans'],
  services: ['software-development', 'custom-crm', 'web-design', 'app-development', 'seo-geo'],
  article: [
    {
      heading: 'Why trucking runs on software now, not just trucks',
      paragraphs: [
        'Trucks move 72.7 percent of the freight tonnage in the United States, according to the American Trucking Associations’ forecast with S&P Global, and almost every ton of it is arranged by phone, email, and a dispatch board. A carrier’s website is where a shipper decides whether to ask for a rate, where a driver decides whether to apply, and, more and more, where a customer expects to see the load without calling. A fleet page with stock photos and a contact form answers none of those.',
        'The pressure comes from both ends. Shippers have been trained by parcel tracking to expect visibility, and brokers with portals win the lane from carriers without them. Drivers have been trained by every other job search to apply from a phone, and a carrier whose application is a PDF loses them at the first field. Meanwhile the office runs on a TMS, an ELD, an accounting system, a factoring company, and a load board that do not talk to each other, so one load gets typed five times. That is where the week goes, and it is fixable.',
      ],
    },
    {
      heading: 'What we build for carriers, brokers, and fleets',
      paragraphs: [
        'Websites first, because they are the front door: a fleet and lanes page that says what you haul and where, a quote request that captures the real details, a driver recruiting section with an application that works on a phone, and the local search setup that puts a regional carrier in front of regional shippers. For Accelerated Transport, a long-haul carrier, that meant a fleet showcase, SEO, and CDL-A recruiting on one site.',
        'Then the software behind it: customer portals with load status, documents, and invoices; driver tools for check calls, PODs, and settlements; quoting tools with your lane history in them; dashboards over revenue per mile and on-time performance; and the integrations that make a load entered once show up everywhere. We build around your TMS, not instead of it, and we will say when you do not need us: a five-truck fleet with three steady shippers needs a clean site, a working phone, and maybe a shared tracking link, not a portal. The software earns its place when the retyping does.',
      ],
    },
  ],
  faqs: [
    {
      q: 'What should a trucking company website include?',
      a: 'What you haul, the equipment you run, the lanes you cover, your authority and insurance stated plainly, a quote request that asks for the real details, and a driver recruiting section with an application that works on a phone. Add photos of your actual trucks and people; shippers and drivers notice stock photos. Behind it, the structure that lets Google and AI assistants describe you correctly.',
    },
    {
      q: 'How do I recruit truck drivers through my website?',
      a: 'Show the job honestly, on a page a driver can read on a phone: pay structure, home time, equipment, routes, and the people they would work with. Then make applying short: name, contact, CDL class, experience, and a button, with the full application after a recruiter calls back. Keep the page current; drivers compare carriers the way shippers do, and a stale page reads like a stale fleet.',
    },
    {
      q: 'What is a customer portal for a carrier or broker?',
      a: 'A login on your website where shippers see their loads, status, documents like the BOL and POD, and invoices, without calling dispatch. It pulls from your TMS and ELD, so the status is the real one. Brokers use the same idea for carriers: available loads, rate confirmations, and payment status. The point is fewer check calls and a customer who stays.',
    },
    {
      q: 'Can a website connect to our TMS or ELD?',
      a: 'Usually, yes. Most modern TMS and ELD platforms have APIs, and where a vendor does not, there is nearly always an export we can schedule. We connect websites and portals to dispatch, accounting, fuel cards, and factoring systems, so a load is entered once and appears on the portal, the driver’s phone, and the invoice. We start by listing every system you run and how each one gets its data today.',
    },
    {
      q: 'Do small carriers need custom software, or is off-the-shelf enough?',
      a: 'Off-the-shelf is enough until it isn’t, and the sign is retyping: the same load entered in the TMS, the spreadsheet, and the customer email. A small fleet with a good TMS and a few steady shippers rarely needs more than a clean site and a shared tracking link. Custom software earns its place when the gaps between your systems are where the week goes, and we tell you which side you are on.',
    },
    {
      q: 'How do freight brokers get more shippers from their website?',
      a: 'By being specific. A shipper searching for a broker wants to know you handle their freight, their lanes, and their equipment type, so pages that say so plainly outrank a general promise of logistics excellence. Add a quote request that captures the lane and the commodity, proof like your authority, insurance, and real customers, and a Google Business Profile for your actual location.',
    },
  ],
  cta: 'Count how many times one load gets typed before the invoice goes out. That number is our job.',
  metaDescription: 'Websites and software for carriers, freight brokers, and fleets in Philadelphia and South Jersey: customer portals, load tracking, quotes, driver recruiting. Hark Digital, est. 2016.',
  formService: 'Software Development',
}
