import type { IndustryPageData } from './index'

// Manufacturing: manufacturer sites, searchable catalogs and spec sheets, dealer portals,
// quote requests, 3D models and configurators, and the software behind the plant
export const manufacturing: IndustryPageData = {
  slug: 'manufacturing',
  scene: 'pressline',
  headline: 'Buyers find the part before',
  headlineAccent: 'they find you.',
  lede: 'An engineer with a spec in hand is not going to call. They search, compare, and move on when the data sheet is a scanned PDF from 2009. We build manufacturer websites, searchable catalogs, dealer portals, and the software behind the plant, so the buyer finds the part.',
  features: [
    {
      title: 'Searchable product catalogs',
      text: 'Every product, every variant, every spec, on its own page with the numbers an engineer filters by: bore, capacity, temperature, material. Spec sheets and CAD files download in a click, or behind a short form when sales wants the name. Google indexes each page, so a part number search lands on yours.',
    },
    {
      title: 'Dealer & distributor portals',
      text: 'Reps and distributors log in to current literature, stock, order status, and their own terms instead of emailing the office for a PDF. Orders and warranty claims land in the system that runs the plant, not in an inbox. The portal is yours, built around your territories and your rules, nothing rented.',
    },
    {
      title: 'Quote requests that land',
      text: 'A request for quote should take a buyer less effort than a phone call, and arrive with everything your estimator needs: the part, the quantity, the drawing, the ship-to. We build RFQ forms that attach files, route by product line, and drop into your CRM, so the quote goes out while the buyer is still interested.',
    },
    {
      title: '3D models & configurators',
      text: 'A machine the buyer can turn, open, and configure in the browser says more than trade show photos. We model your products in 3D for the product page and build configurators that assemble the options and the quote. Shopify’s figure: stores that add 3D content see a 94 percent average conversion lift.',
    },
  ],
  // Gartner, “The New B2B Buying Journey” (2019, Brent Adamson): B2B buyers spend only 17 percent of their
  // purchase time meeting with potential suppliers; the rest goes to independent research, most of it online
  stat: { value: '17%', label: 'Of a B2B buyer’s time goes to meeting suppliers. The rest is research you can’t attend.', viz: { kind: 'ledger', share: 17, of: 100 } },
  process: [
    { title: 'Listen', text: 'We walk the plant and the sales floor: how a quote starts, who touches it, and where the spec sheets actually live.' },
    { title: 'Map the catalog', text: 'Products, variants, and specs structured once, so the site, the portal, and the ERP read the same data.' },
    { title: 'Build & connect', text: 'Site, catalog, portal, and quote forms, wired to the systems your office already runs.' },
    { title: 'Hand over', text: 'Your team learns to add a product and update a spec without calling us, and we stay for what comes next.' },
  ],
  clients: ['jomar', 'schwing', 'eaglepallet', 'nefloors', 'ridgeroller', 'zingmini'],
  services: ['web-design', 'software-development', 'custom-crm', '3d-modeling', 'seo-geo', 'aerial-media'],
  article: [
    {
      heading: 'Why a manufacturer’s website is a sales engineer',
      paragraphs: [
        'A manufacturer’s website is the first sales call, and in most B2B purchases it is the only one the buyer schedules themselves. Gartner found that B2B buyers spend about 17 percent of their buying time meeting with any potential supplier; the rest goes to research the supplier never sees, most of it online. For an industrial company that means the engineer specifying a blow molding machine, a thermal cleaning system, or a truckload of heat-treated pallets has usually decided who to call before the phone rings. If your specs are locked in a PDF nobody indexed, you are not on that list.',
        'The buyers also changed. Procurement teams are younger, they search the way they shop, and they expect a part number typed into Google to land on a page with the dimensions, the materials, the drawing, and a button that asks for a quote. We have built sites for Jomar Corporation, whose injection blow molding machines sell worldwide, for SCHWING Technologies, whose thermal cleaning systems serve global manufacturers, and for regional makers like Eagle Pallet in Millville. The problem is the same at every scale: the knowledge is in the building, and the website does not have it yet.',
      ],
    },
    {
      heading: 'What we build for manufacturers, and what we don’t',
      paragraphs: [
        'Start with the catalog, because everything else hangs off it. We structure products, variants, and specifications as data, not as pages, so the same record feeds the public site, a dealer portal, a configurator, and a search that filters by the numbers engineers care about. Spec sheets and CAD files are attached to the product, downloadable in a click or gated behind a short form when sales wants the name. Quote requests arrive with the part, the quantity, and the drawing already attached, routed to the right desk and logged in the CRM.',
        'Behind the public site sits the software a plant runs on: dealer portals, warranty and service tracking, inventory and order status, and integrations with the ERP and accounting so a number is typed once. NorthEastern Services came to us for a website and stayed for software and AI consulting. And we tell you honestly when a manufacturer doesn’t need us: a two-product shop selling through one distributor may need a clean brochure site and a Google Business Profile, not a portal. We build the small thing well and leave the big thing until it earns its place.',
      ],
    },
  ],
  faqs: [
    {
      q: 'What should a manufacturing website include?',
      a: 'Products as searchable pages with specs, drawings, and downloads; a clear request for quote on every product; proof, like the industries you serve, the certifications you hold, and case studies; the people and the plant; and contact details that reach a human. Behind it, structure Google and AI assistants can read, so a part number search lands on you, not on a distributor’s copy of your PDF.',
    },
    {
      q: 'How do I get engineers to find my products on Google?',
      a: 'Give each product its own page with the words an engineer types: the part number, the standard it meets, the material, the capacity, the application. Google reads a scanned PDF badly and AI assistants cannot quote it at all, so the spec lives in the page as text and the PDF is a download, not the source. Keep the pages current; a catalog last touched in 2019 ranks like one.',
    },
    {
      q: 'What is a dealer portal, and when does a manufacturer need one?',
      a: 'A dealer portal is a login on your website where distributors and reps get what they email the office for today: literature, stock, order status, warranty forms, and their own terms. You need one when the same questions arrive from the same partners every week and someone on your staff is the answer. With a handful of dealers, a shared folder and a phone call may do, and we will say so.',
    },
    {
      q: 'Can our website connect to our ERP or inventory system?',
      a: 'Usually, yes, and that is where the value is. We integrate websites and portals with ERPs, inventory, accounting, and CRMs through their APIs or, for older systems, scheduled exports, so a stock level on the site is the one in the building. When a system has no door, we build one. We start by listing every system you run and how each one gets its data today.',
    },
    {
      q: 'Is 3D product modeling worth it for industrial equipment?',
      a: 'For equipment a buyer cannot easily see in person, usually yes. A 3D model on the product page lets an engineer turn the machine, open the guard, and check a clearance from their desk, which trade show photos cannot do. Shopify reports a 94 percent average conversion lift for stores that add 3D content. For commodity parts a buyer already knows, a clean spec table and a fast quote beat a render.',
    },
    {
      q: 'What software do manufacturers usually need beyond the website?',
      a: 'The tools around the plant that no vendor sells off the shelf: quoting and estimating tools, job and service tracking, dealer portals, dashboards over production and sales data, and integrations between the systems you already own. We map how a job moves through your building, prototype something you can click, then build in short cycles so you see working software at every step.',
    },
  ],
  cta: 'Type one of your part numbers into Google. If a distributor’s PDF outranks you, talk to us.',
  metaDescription: 'Manufacturer websites and software in Philadelphia and South Jersey: searchable product catalogs, spec sheets, dealer portals, quote requests, 3D configurators. Hark Digital, est. 2016.',
  formService: 'Web Design & Development',
}
