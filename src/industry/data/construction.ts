import type { IndustryPageData } from './index'

// Construction & Trades: contractors, builders, remodelers, HVAC, landscapers, and installers:
// sites that show the work, estimate requests, local SEO, aerial progress photography, scheduling and CRM
export const construction: IndustryPageData = {
  slug: 'construction',
  scene: 'crane',
  headline: 'The work is good. Now',
  headlineAccent: 'show it.',
  lede: 'Most contractors win the job by word of mouth and lose the next one when the homeowner Googles them and finds a site from 2014. We build sites for builders, remodelers, HVAC, landscapers, and installers that show the work and win the estimate request.',
  features: [
    {
      title: 'A portfolio that sells',
      text: 'Before-and-after galleries, project pages by type and town, and photos big enough to see the joinery. We shoot the work when you don’t have photos, including aerials of the site for the builders and landscapers, and we organize it so a homeowner in Haddonfield finds the kitchen you did two streets over.',
    },
    {
      title: 'Estimates that arrive whole',
      text: 'A request form that asks for the address, the photos, and the rough scope, then lands in your CRM or on your phone instead of in a shared inbox nobody owns. The homeowner gets a reply that says you got it, you get the details before the first call, and nothing falls between the truck and the office.',
    },
    {
      title: 'Found on Google Maps',
      text: 'Most trade searches are local: “HVAC repair near me,” “generator installer South Jersey.” We set up and tune your Google Business Profile, build service-area pages that are honest about where you work, and help you earn the reviews that put you in the map pack, which is where the calls actually come from.',
    },
    {
      title: 'The office in one place',
      text: 'Scheduling, crews, quotes, invoices, and follow-ups in a system built around how your company runs instead of a whiteboard and three apps. We build custom CRMs and job trackers for the trades, connected to QuickBooks and your calendar, so the estimate becomes the job becomes the invoice without anyone retyping it.',
    },
  ],
  // BrightLocal, Local Consumer Review Survey 2025 (January 2025, 1,026 US consumers): just 4 percent of
  // consumers say they “never” read online business reviews
  stat: { value: '4%', label: 'Of consumers never read online reviews of a local business. The other 96 read yours.', viz: { kind: 'ledger', share: 4, of: 100 } },
  process: [
    { title: 'Listen', text: 'How a lead comes in, who quotes it, who schedules it, and where the photos of the finished job end up.' },
    { title: 'Shoot & gather', text: 'Your best projects, photographed properly, plus the licenses, reviews, and credentials you already have.' },
    { title: 'Build', text: 'A fast site that shows the work by type and town, with an estimate form that reaches the right person.' },
    { title: 'Keep it fed', text: 'Your team learns to add a project from a phone, and we watch the rankings and the reviews after launch.' },
  ],
  clients: ['ogren', 'fabbri', 'tricity', 'mahs', 'djwagner', 'coreproperty', 'terraverde', 'nefloors', 'midatlantic', 'reliablepower', 'dnssolutions'],
  services: ['web-design', 'seo-geo', 'aerial-media', 'custom-crm', 'software-development'],
  article: [
    {
      heading: 'Why a contractor’s website is the second estimate',
      paragraphs: [
        'A contractor’s website is the reference check a homeowner runs before they ask for a reference. The referral gets you the search; the site decides whether it becomes a call. BrightLocal’s 2025 survey found only 4 percent of consumers never read online reviews of local businesses, and the first place they read them is Google, right beside your hours, your photos, and a link to a website that should look as good as the trucks do. For a builder like Fabbri, in business since 1968, the work is the proof; the website’s only job is to show it and make the next step obvious.',
        'The trades also have a problem most industries don’t: the people who do the work are in the field. Leads come in while nobody is at a desk, estimate requests land in a shared inbox, and the photos that would sell the next job live on a foreman’s phone. The business runs on a whiteboard, a calendar, and memory. That is not a marketing problem, it is a software problem, and we build for both.',
      ],
    },
    {
      heading: 'What we build for the trades, and when less is enough',
      paragraphs: [
        'For most contractors the site is the first job: project galleries by type and town, service pages that say what you do and where, the license stated, reviews from Google, and an estimate form that asks for the address and photos. Mike flies the aerials himself, as an FAA Part 107 licensed pilot, for builders’ progress photography and landscapers like Terra Verde whose work only makes sense from above. Then local SEO: a Google Business Profile kept complete, honest service-area pages, and the structured data that gets you into the map pack in Philadelphia and South Jersey.',
        'The second job is the office. We build custom CRMs and schedulers for the trades: the estimate becomes the job, the job gets a crew and a date, the invoice goes out when the job closes, and the request for a review fires on its own. It connects to QuickBooks and the calendar you already use. And we will say when you don’t need it: a two-person remodeler with a full calendar from referrals needs a clean site, a tuned Google profile, and a reliable way to answer the phone, not a portal. We tell you which one you are.',
      ],
    },
  ],
  faqs: [
    {
      q: 'What should a contractor website include?',
      a: 'Photos of real work, organized by type and town; the services you offer and the areas you serve; your license and insurance stated plainly; reviews, ideally pulled live from Google; the people behind the company; and a way to request an estimate that works from a phone on a job site. If a homeowner cannot tell in ten seconds what you do, where, and how to reach you, the page has failed.',
    },
    {
      q: 'How do contractors get more leads from Google?',
      a: 'Mostly through the map pack: the three local businesses Google shows above the regular results. Getting there takes a complete Google Business Profile with the right categories, real photos, and steady reviews; a website with a page for each service and each area you serve; and consistent name, address, and phone details everywhere online. The map listing is where the steady calls come from.',
    },
    {
      q: 'Do I need a separate page for every town I serve?',
      a: 'Only for the towns where you actually work and can say something true about them: projects there, the permit office, the housing stock. A page for every town in New Jersey with the name swapped in is thin content, and Google treats it that way. Three honest service-area pages beat thirty hollow ones, and they read better to a homeowner, too.',
    },
    {
      q: 'Should a contractor use a CRM, or is a spreadsheet fine?',
      a: 'A spreadsheet is fine until two people need it at once, a lead is missed because nobody owned it, or you cannot say how many estimates turned into jobs last quarter. That is usually the sign. A CRM built around your flow, lead to estimate to job to invoice to review, gives the office and the field one picture, and it can be as simple as the stages you already use on the whiteboard.',
    },
    {
      q: 'How do builders use drone photography on a job site?',
      a: 'For progress photography that owners and lenders can follow, for marketing the finished project, and for the record when a question comes up later about what was where. Landscapers and roofers use aerials because the work is invisible from the street. Mike Harkins is an FAA Part 107 licensed and insured remote pilot, so flights near Philadelphia’s controlled airspace are authorized before takeoff.',
    },
    {
      q: 'Why doesn’t my contractor website show up on Google?',
      a: 'Usually some mix of: no Google Business Profile or an unclaimed one, a site with one page that tries to cover every service, no mention of the towns you serve, slow load times on a phone, and few recent reviews. Sometimes it is a technical block, like a site that was never submitted to Google or a redesign that broke the old addresses. We audit first and tell you which it is.',
    },
  ],
  quote: {
    text: 'Mike has exceptional technical ability but at his core he is an artist. He brilliantly created a clean, concise and modern website that has significantly bolstered our business.',
    name: 'Andrew Fabbri',
    company: 'Fabbri Builders',
  },
  cta: 'Google your trade and your town. If a competitor’s site looks better than their work, call us.',
  metaDescription: 'Websites, local SEO, drone photography, and job-tracking software for contractors, builders, remodelers, HVAC, and landscapers in Philadelphia and South Jersey. Hark Digital, est. 2016.',
  formService: 'Web Design & Development',
}
