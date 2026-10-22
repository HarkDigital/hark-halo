import type { IndustryPageData } from './index'

// Senior Living: communities, senior housing, and transition services; families as the real audience,
// honest tours, floor plans, accessibility (large type, contrast), aerial photography of the campus
export const seniorLiving: IndustryPageData = {
  slug: 'senior-living',
  scene: 'campus',
  headline: 'Families look long before',
  headlineAccent: 'they visit.',
  lede: 'The person choosing a senior community is usually a daughter at a kitchen table at eleven at night, the resident reading over her shoulder. We build sites that answer them honestly, show the place as it is, and make the first call easy, in type they can read.',
  features: [
    {
      title: 'Honest tours, from the air',
      text: 'Photos and video of the actual apartments, the dining room on a Tuesday, the people, and the grounds, with aerials of the campus so a family sees where it sits. Floor plans with dimensions. Mike flies the drone himself, FAA licensed and insured. Nothing staged, nothing borrowed from a stock library.',
    },
    {
      title: 'Answers before the call',
      text: 'Levels of care, what is included, waitlists, eligibility for affordable communities, pets, parking, visiting, and what happens when needs change. We write down the FAQ the admissions office answers all day, so the call that comes is a tour request, not a quiz, and the family arrives already knowing the place.',
    },
    {
      title: 'For older eyes and hands',
      text: 'Large type, strong contrast, generous buttons, no flashing, no tiny menus, and every page usable with a keyboard or a screen reader. That is accessibility law under the ADA, and it is also simply who the audience is: 90 percent of Americans over 65 are online now, and they are reading your site themselves.',
    },
    {
      title: 'Inquiries reach a person',
      text: 'Tour requests, waitlist applications, and job applications routed to the right desk and logged, so a family that reaches out hears back from someone who knows their name. For affordable communities, the application form and the income guidelines live online, clearly, without the stigma of a door to knock on first.',
    },
  ],
  // Pew Research Center, “Internet use by age” (pooled surveys, 2024): 90 percent of US adults 65 and older
  // use the internet (88 percent in 2023, 90 percent in 2025)
  stat: { value: '90%', label: 'Of Americans 65 and older are online. The resident is reading too, not just the family.', viz: { kind: 'ledger', share: 90, of: 100 } },
  process: [
    { title: 'Listen', text: 'We talk to admissions, the director, and if we can, a resident and a family, about what gets asked and what gets missed.' },
    { title: 'Show the place', text: 'Photography, video, aerials, and floor plans of the real community, scheduled around the residents’ day.' },
    { title: 'Build for everyone', text: 'Large, clear, accessible pages with the answers up front and a tour request that reaches a person.' },
    { title: 'Keep it true', text: 'Your staff learns to update availability, events, and the newsletter, and we check that the site stays accessible.' },
  ],
  clients: ['newcomb', 'salemsenior', 'buenagardens', 'fairacres', 'missiontransitions', 'epac'],
  services: ['web-design', 'ada-accessibility', 'seo-geo', 'aerial-media', 'wordpress'],
  article: [
    {
      heading: 'Why a senior living website has two readers',
      paragraphs: [
        'A senior living website is read twice: by the adult child doing the research and by the parent who will live there. The child wants the facts, levels of care, what is included, what happens when needs change, and she wants them without a phone call that turns into a sales pitch. The parent wants to see the apartment, the dining room, and the people, and to read about them in type that doesn’t require the glasses she can’t find. Pew Research puts 90 percent of Americans 65 and older online; the brochure site for the family, with nothing for the resident, is over.',
        'The communities we build for are mostly affordable and independent: Newcomb in Vineland, Salem Senior Village, and Buena Gardens in Sicklerville, all apartments for seniors 55 and older, and Fair Acres, a county-owned skilled nursing and rehab center that has served Delaware County for more than two hundred years. Their visitors are not browsing luxury. They are trying to find out whether they qualify, what is included, and whether there is a room, and a site that hides those answers behind a form loses them to one that doesn’t.',
      ],
    },
    {
      heading: 'What we build for senior communities, and how we keep it honest',
      paragraphs: [
        'Photography and video of the real place, scheduled around the residents’ day, and aerials of the campus flown by Mike as an FAA Part 107 licensed pilot, so a family sees the grounds, the parking, and the neighborhood as they are. Floor plans with dimensions. A page per level of care or community that says plainly what is included and what is not. The FAQ the admissions office answers every day, written down. Eligibility and application information for affordable communities stated clearly. And a tour request, a waitlist form, and a careers page that reach a named person.',
        'Under it, the things a family never notices and a resident always does: large type, strong contrast, big buttons, pages that work with a keyboard or a screen reader, fast loading on an older phone, and no autoplaying anything. That is WCAG 2.2 AA, the standard the ADA is measured against, and the difference between a site a 78-year-old can use alone and one she has to ask about. For Mission Transitions, which helps Philadelphia-area families with aging in place and relocation, the same principles applied to a service rather than a building.',
      ],
    },
  ],
  faqs: [
    {
      q: 'What should a senior living website include?',
      a: 'The facts a family wants before calling: the type of community or levels of care, what is included, eligibility and how to apply, availability or the waitlist, and what happens when needs change; real photos, video, and floor plans; reviews and licensing; a tour request that reaches a person; and a careers page. All of it in large, readable type, because the resident is reading too.',
    },
    {
      q: 'How do families research senior living communities online?',
      a: 'They start with a search, usually “senior apartments near” a town or “assisted living” plus a place, read the Google reviews, then compare two or three websites. They look for photos of actual apartments, a clear statement of what is included, and a way to check availability without being sold to. Sites that answer those questions get the tour request; the rest get skipped.',
    },
    {
      q: 'Should affordable senior housing post income limits online?',
      a: 'Yes, plainly. Families searching for affordable senior apartments want to know whether they qualify before making a call they find embarrassing, and a site that states the age requirement, the income guidelines, and the application steps up front saves them that call and saves the office the ones that go nowhere. Keep the figures current when the HUD limits change, and link the application.',
    },
    {
      q: 'How do you make a website usable for older adults?',
      a: 'Large base type that scales, high contrast, big click targets, simple menus that don’t vanish on hover, no autoplay, no motion that can’t be paused, and every page usable with a keyboard and a screen reader. Plain language and short pages help as much as any of it. These are the WCAG guidelines the ADA points to, and they make the site better for the 45-year-old daughter reading on a phone, too.',
    },
    {
      q: 'Why does a senior community need drone photography?',
      a: 'Because the questions a family asks about a place, how big is it, is it near the hospital, is there parking, are all answered from above. Aerials show the campus in its neighborhood in one frame, and a short flight over the grounds does more than a page of text. Mike Harkins is an FAA Part 107 licensed and insured remote pilot, so flights over a community are planned and legal.',
    },
    {
      q: 'How often should a senior living website be updated?',
      a: 'Whenever something a family would rely on changes: availability, the waitlist, staff, events, the newsletter, and the rates for communities that publish them. A site that still lists last year’s director reads as neglect. We build sites your office updates from a browser without a developer, and we check after launch that the updates keep the site fast and accessible.',
    },
  ],
  cta: 'Read your site the way a daughter would at eleven at night. Does it answer her? We can help.',
  metaDescription: 'Senior living and senior housing websites in Philadelphia and South Jersey: honest tours, floor plans, accessible large-type design, and aerial photography. Hark Digital, est. 2016.',
  formService: 'Web Design & Development',
}
