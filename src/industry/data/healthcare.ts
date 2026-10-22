import type { IndustryPageData } from './index'

// Healthcare: practices, dental, mental health nonprofits, senior care, and a healthcare software company:
// appointment booking, HIPAA-aware design (never a certification claim), ADA accessibility, patient forms,
// reviews and local search
export const healthcare: IndustryPageData = {
  slug: 'healthcare',
  scene: 'pulse',
  headline: 'Patients search before',
  headlineAccent: 'they call.',
  lede: 'Seven in ten patients start the search for a new doctor with online reviews, and the website is the next stop. We build practice sites that book the appointment, keep patient data private, meet the accessibility law, and show up when patients nearby search.',
  features: [
    {
      title: 'Booking without phone tag',
      text: 'Scheduling that fits the practice: a request form your front desk confirms, or a live calendar through your EHR or a system like NexHealth or Zocdoc. New patients book at ten at night; the receptionist stops playing phone tag. Intake forms travel with the appointment, so the clipboard retires too.',
    },
    {
      title: 'HIPAA-aware by design',
      text: 'A website isn’t usually a covered system, but its forms and messages can be. We keep protected health information out of plain email, use encrypted intake tools and a business associate agreement where needed, and say plainly what the site touches. No badge claiming a certification that doesn’t exist.',
    },
    {
      title: 'Accessible, by law',
      text: 'Medical practices are public accommodations under the ADA, and their websites get sued. We build to WCAG 2.2 AA in the code: contrast, keyboard navigation, labeled forms, captions, and text that scales. No overlay widget. One in four American adults lives with a disability, and many are your patients.',
    },
    {
      title: 'Found by patients nearby',
      text: 'Most care is chosen locally and on a phone. We tune your Google Business Profile, build pages per service and location that say what you treat and which plans you accept, mark up providers and hours so search can read them, and help happy patients leave the reviews that bring the next one.',
    },
  ],
  // Software Advice, “How Patients Use Online Reviews” (patient survey, 2020): 71 percent of patients use
  // online reviews as the very first step to finding a new doctor
  stat: { value: '71%', label: 'Of patients start the search for a new doctor with online reviews. Your site is step two.', viz: { kind: 'ream', share: 0.71 } },
  process: [
    { title: 'Listen', text: 'How a patient finds you, books, fills out forms, and pays today, and what the front desk repeats all day.' },
    { title: 'Design for patients', text: 'Concepts built around the three things they came for: is this the right practice, do you take my plan, how do I book.' },
    { title: 'Build to the law', text: 'Accessible markup, private forms, fast pages, and the booking and EHR connections tested end to end.' },
    { title: 'Launch & train', text: 'Your office learns to update providers, hours, and services, and we watch search and reviews after launch.' },
  ],
  clients: ['cumberland', 'haines', 'providersoft', 'breastfeeding', 'fairacres', 'guidancecenter', 'tikvah'],
  services: ['web-design', 'ada-accessibility', 'security', 'seo-geo', 'software-development'],
  article: [
    {
      heading: 'Why a medical practice website is the first visit',
      paragraphs: [
        'A practice’s website is the first visit, and the patient arrives with questions: do you treat what I have, do you take my insurance, can I get in, and will the office treat me well. Software Advice found 71 percent of patients start the search for a new doctor with online reviews, and the website is where they go to confirm what the reviews suggested. If the site is slow, the provider list is old, and booking means a phone number and a voicemail, the patient keeps scrolling to the next practice on the map.',
        'Healthcare also carries duties other businesses don’t. The ADA applies to a practice’s website the way it applies to its ramp, and medical practices are among the most frequent targets of accessibility lawsuits. HIPAA governs any protected health information a form or message collects, which a surprising number of “contact us” forms do by accident. And a family dental office or an internal medicine practice serving the Philadelphia region competes with hospital systems that have whole departments for this. The site has to be right, not just pretty.',
      ],
    },
    {
      heading: 'What we build for practices and healthcare companies',
      paragraphs: [
        'For a practice: a site that answers the four questions above the fold, a page per clinician and per thing you treat, the plans you accept, online booking, and intake forms that keep PHI out of plain email. Accessibility is built into the code, and pages are fast on a phone. Local SEO follows: Google Business Profile, location and service pages, and structured data that search and AI assistants can read. We have done this for primary care, dentistry, a lactation practice that books and takes payment online, community mental health agencies, and a county geriatric center.',
        'For healthcare companies, it goes further. ProviderSoft, which makes case management and billing software for early childhood service providers, needed a site that explained a complex product to administrators. We also build the software side when a practice has outgrown its tools: patient portals, referral tracking, custom intake, and EHR and billing integrations. And we say when you don’t need it. A solo practice with a full panel may need a clean site, a working booking link, and an accessible form, nothing more. Honest scope is part of the care.',
      ],
    },
  ],
  faqs: [
    {
      q: 'Does my medical practice website need to be HIPAA compliant?',
      a: 'The site usually isn’t a covered system, but anything on it that collects or transmits protected health information is: intake forms, appointment requests with symptoms, and analytics or chat tools that see that data. Those need encryption, access controls, and a business associate agreement. There is no official HIPAA certification for a website; anyone selling you a badge is selling a badge.',
    },
    {
      q: 'What should a doctor’s website include?',
      a: 'Who the providers are and what they treat; the insurance you accept; the location, hours, and parking; how to book, ideally online; new patient forms and what to bring; and reviews from real patients. Make the phone number tappable and the booking button visible on every page. Behind it, accessible code and local search structure, so people nearby find you and everyone can use what they find.',
    },
    {
      q: 'How does online appointment booking work for a medical practice?',
      a: 'Either through a scheduling system built for healthcare, one that integrates with your EHR or signs a business associate agreement, so appointment data stays protected; or through a plain request form that asks only for name, contact, and a preferred time, with no clinical detail, a sound option for a smaller office. A generic calendar widget that stores symptoms is the one to avoid.',
    },
    {
      q: 'Why do medical practices get sued over website accessibility?',
      a: 'Because the ADA treats a practice’s website as part of a public accommodation, and healthcare sites often fail basic tests: unlabeled forms, PDFs screen readers can’t read, and booking widgets a keyboard can’t use. Plaintiffs’ firms run automated scans and send demand letters. Fixing the code to WCAG 2.2 AA, with documentation, removes the target and serves the patients who needed it anyway.',
    },
    {
      q: 'How do I get my practice to show up on Google Maps?',
      a: 'Claim and complete your Google Business Profile with the right categories, each provider listed, accurate hours, real photos, and your services; then keep it current and ask happy patients for reviews. On the site, give each location and service its own page with a consistent name, address, and phone, and mark up providers and hours so Google can read them. Local ranking is mostly consistency and proof.',
    },
    {
      q: 'When does a practice need custom software instead of its EHR?',
      a: 'When the EHR does the chart well but the work around it badly: referral tracking, custom intake that feeds the chart, a portal for a specific program, dashboards over scheduling and billing data, or integrations between systems that don’t talk. We prototype before we build and keep PHI inside systems designed to hold it. If your EHR already does the job, we say so and wire the website to it.',
    },
  ],
  quote: {
    text: 'Hark Digital was able to update our brand and transform our website into something we are really proud of. Their creativity, responsiveness and professionalism made the whole process easy.',
    name: 'Alicyn Harkness',
    company: 'ProviderSoft',
  },
  cta: 'Search your specialty and your town. Not on the map, or can’t book online? Let’s talk.',
  metaDescription: 'Practice websites in Philadelphia and South Jersey: online booking, HIPAA-aware forms, ADA accessibility, local SEO for doctors, dentists, and clinics. Hark Digital, est. 2016.',
  formService: 'Web Design & Development',
}
