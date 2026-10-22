import type { IndustryPageData } from './index'

// Nonprofits: giving that is simple, events and ticketing, volunteer sign-up, storytelling, accessibility,
// and donor data, for a ticketing platform, a disability services association, a fundraising organization,
// mental health organizations, and a film festival
export const nonprofits: IndustryPageData = {
  slug: 'nonprofits',
  scene: 'giving',
  headline: 'Make giving the',
  headlineAccent: 'easy part.',
  lede: 'Half the people who visit a nonprofit’s website arrive on a phone, and fewer than a third of the donations come from one. The form is the gap. We build nonprofit sites with simple giving, events that sell themselves, volunteer sign-up, and stories that move people to act.',
  features: [
    {
      title: 'A form donors finish',
      text: 'One page, the amounts that matter, monthly as an option, Apple Pay and Google Pay on phones, a receipt at once, and no account to create. We connect it to the processor and donor database you already use, so a gift on Tuesday is a thank-you on Tuesday, and a record you can find next year.',
    },
    {
      title: 'Tickets and auctions',
      text: 'Galas, film festivals, walks, and workshops with ticketing on your own site, seat or table selection where it matters, sponsor logos where promised, and check-in from a phone at the door. For Hang On To Your Shorts, an annual short film festival in Red Bank, the site carries the screenplay competition too.',
    },
    {
      title: 'Volunteers and members',
      text: 'Sign-up forms that ask for the right things and land on a coordinator’s list, shifts people can pick, and for associations, the directory, the documents, and the renewals in one place. Ability Network of Delaware is a statewide association of disability service providers; its site is the front door for its members.',
    },
    {
      title: 'Accessibility as mission',
      text: 'A nonprofit that serves people with disabilities, older adults, or anyone should have a site all of them can use. We build to WCAG 2.2 AA in the code: contrast, keyboard access, labeled forms, captions, readable type. It is the law for many, a condition of some funding, and the mission in practice.',
    },
  ],
  // M+R Benchmarks 2026 (2025 data from participating US nonprofits): mobile users were 52 percent of nonprofit
  // website visits, while desktop users accounted for 72 percent of online revenue (the 2024 edition: 52 and 78)
  stat: { value: '52%', label: 'Of nonprofit site visits come from a phone, but under a third of the giving does.', viz: { kind: 'halo', share: 52, of: 100 } },
  process: [
    { title: 'Listen', text: 'The mission, the people you serve, how a gift arrives today, and what the development director does by hand.' },
    { title: 'Tell it straight', text: 'The story structured so a stranger gets it at a glance and a funder gets the whole picture.' },
    { title: 'Build', text: 'Giving, events, volunteers, and the donor system connected, accessible to everyone, fast on a phone.' },
    { title: 'Hand over', text: 'Your staff learns to post the event and change the appeal, and we stay for the year-end push.' },
  ],
  clients: ['tixforgood', 'abilitynetwork', 'amplifier', 'guidancecenter', 'tikvah', 'hotys'],
  services: ['web-design', 'ecommerce', 'ada-accessibility', 'seo-geo', 'wordpress'],
  article: [
    {
      heading: 'Why a nonprofit’s website is the development office',
      paragraphs: [
        'A nonprofit’s website is the development office, the box office, the volunteer desk, and the annual report, open to anyone who heard the name and typed it in. M+R’s Benchmarks study, which pools data from hundreds of nonprofits each year, found that 52 percent of visits to nonprofit websites come from mobile devices while desktop users still give the large majority of online revenue. The gap is not generosity. It is a donation form that was designed for a desk and is being filled in on a bus.',
        'Small and mid-sized organizations feel it most. A community mental health agency in Cumberland County, a Philadelphia nonprofit running events for adults with mental illness, a statewide association of disability service providers, a short film festival in Red Bank: each has a development staff of one or two, a database that is a spreadsheet, and a site that was donated years ago. The ask is clear. Make giving simple, make events sell themselves, make volunteering easy to say yes to, and make the story good enough that a stranger acts.',
      ],
    },
    {
      heading: 'What we build for nonprofits, and what to leave alone',
      paragraphs: [
        'A giving page that is one screen: suggested amounts, monthly as an option, Apple Pay and Google Pay, no account, a receipt that arrives at once, and a connection to your processor and your donor database. Event pages with ticketing, sponsor placement, and door check-in. Volunteer forms that reach a coordinator. A story told in the words of the people you serve, with photos that are yours. All of it accessible, because a nonprofit that serves people with disabilities, or anyone, should not have a site some of them cannot use.',
        'Where to stop: a volunteer-run organization with a working donation link through a giving platform may need a clean site and a clear story, not a custom giving system, and we will say so. Tix For Good, a donor appreciation network connecting brands, nonprofits, and donors, needed real software; a Cumberland County agency needed a site its staff could update and a form that didn’t lose gifts. We build to the size of the organization, and we tell you which size you are. The board will ask what the site did; it should be able to answer in gifts.',
      ],
    },
  ],
  faqs: [
    {
      q: 'What should a nonprofit website include?',
      a: 'The mission in one sentence a stranger understands; who you serve and what changes because of you; a donate button on every page and a one-screen giving page; upcoming events with tickets; how to volunteer; the staff and board; financials or a link to them, because donors check; and contact details that reach a person. Keep it accessible and fast on a phone, where half your visitors are.',
    },
    {
      q: 'How do I get more people to donate online?',
      a: 'Remove the friction first: a one-screen form, suggested amounts, monthly as an option, Apple Pay and Google Pay, no account, and a thank-you at once. Then make the case on the page itself, what a specific gift does, in the words of someone it helped. Finally, ask: email and social posts that link to the form, not the homepage. Most organizations lose more gifts to a bad form than to a weak appeal.',
    },
    {
      q: 'Should we use a donation platform or our own giving page?',
      a: 'A platform is fine when you are small and its terms suit you; your own giving page is better when you want the donor’s data, your own branding, monthly giving that you control, and no third-party page between the appeal and the gift. Many organizations use both: a platform for peer-to-peer campaigns, their own page for everything else. We connect either to your donor database.',
    },
    {
      q: 'How do nonprofits sell event tickets online?',
      a: 'Through ticketing on your own site or a service like Eventbrite embedded in it, with the event page, sponsors, and registration together. Your own ticketing keeps the attendee list and data; a service brings its audience and tools. For galas and festivals with seating, tables, or multiple screenings, a proper ticketing system with phone check-in is worth it; for a workshop, a simple form may be enough.',
    },
    {
      q: 'Does a nonprofit website have to be ADA accessible?',
      a: 'In practice, yes. Nonprofits that serve the public are covered by the ADA like any organization, publicly funded ones often fall under Section 508 or state rules too, and funders increasingly ask. Beyond the law, a site a blind donor cannot use or a volunteer with a motor impairment cannot navigate fails the mission at the door. We build to WCAG 2.2 AA in the code, not with an overlay widget.',
    },
    {
      q: 'What donor data should our website collect and keep?',
      a: 'What you need to thank, receipt, and ask again: name, email, gift amount, date, designation, and whether it is recurring, plus the mailing address if you send receipts by post. Not more. Card numbers never touch your site; the processor holds them. Keep the data in one donor database rather than the site and a spreadsheet, keep access to it limited, and write down who can export it. Trust is the asset.',
    },
  ],
  cta: 'Open your donation page on a phone and give yourself five dollars. If it was a chore, call us.',
  metaDescription: 'Nonprofit websites in Philadelphia, South Jersey, and Delaware: simple giving, event tickets, volunteer sign-up, accessible design, donor data that stays yours. Hark Digital, est. 2016.',
  formService: 'Web Design & Development',
}
