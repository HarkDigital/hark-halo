import type { IndustryPageData } from './index'

// Professional Services: law, wealth management, insurance, advisory, PR and marketing agencies, telecom:
// trust, credentials shown honestly, intake forms, scheduling, knowledge AI for firms, accessibility
export const professionalServices: IndustryPageData = {
  slug: 'professional-services',
  scene: 'calendar',
  headline: 'Your website is the first',
  headlineAccent: 'consultation.',
  lede: 'Eight in ten buyers of professional services check a firm’s website before they call, looking for a reason to trust you. We build sites for law firms, advisors, insurers, and agencies that show credentials honestly and make intake easy.',
  features: [
    {
      title: 'Credentials, shown honestly',
      text: 'Bar admissions, designations, the matters you actually handle, and the people, with real photographs. No stock handshake, no “award” from a site that sells plaques. For a bilingual criminal defense attorney in South Jersey or a wealth manager in Vineland, the site has to read the way the office feels.',
    },
    {
      title: 'Respectful client intake',
      text: 'Forms that ask what a first call needs and nothing more, routed to the right person, with nothing privileged traveling in plain email. Scheduling that books a consultation without three messages back and forth. The client feels handled; the staff stops retyping.',
    },
    {
      title: 'Knowledge AI for the firm',
      text: 'A private assistant trained on your own documents, matters, and policies that answers the associate’s question from your records, stays inside your systems, and cites what it used. For firms where the knowledge is in a partner’s head, this is the succession plan nobody wrote down.',
    },
    {
      title: 'Accessible and findable',
      text: 'WCAG 2.2 AA in the code, because professional firms get ADA demand letters too. Local SEO and GEO so a search for your practice area and county, or a question put to ChatGPT, returns you. Scribewise, whose site we built, does GEO for professional services firms.',
    },
  ],
  // Hinge Research Institute, professional services buyer study (2014; 1,028 buyers of professional services;
  // reported by MarketingProfs): 81 percent of buyers check out the seller’s website when evaluating a provider,
  // the most-used evaluation method, ahead of searching Google (63 percent) and talking to references (56 percent)
  stat: { value: '81%', label: 'Of buyers check a firm’s website when evaluating it. The site is the first consultation.', viz: { kind: 'ream', share: 0.81 } },
  process: [
    { title: 'Listen', text: 'What you practice, who hires you, how they find you now, and what the first call always covers.' },
    { title: 'Design for trust', text: 'Concepts that look like the firm: credentials, people, and plain language about what you do and don’t take on.' },
    { title: 'Build', text: 'Accessible, fast, with intake and scheduling wired to your calendar, CRM, or practice management system.' },
    { title: 'Launch & keep current', text: 'Your staff learns to add a professional, an insight, or a result, and we watch the search results after.' },
  ],
  clients: ['andujar', 'libertypoint', 'knightsinsurance', 'fourx', 'scribewise', 'renati', 'onepartsocial', 'comtec'],
  services: ['web-design', 'seo-geo', 'custom-crm', 'company-knowledge-ai', 'ada-accessibility', 'software-development'],
  article: [
    {
      heading: 'Why trust is built before the first meeting',
      paragraphs: [
        'In professional services the product is judgment, and a prospect cannot inspect judgment from a brochure. So they do the next best thing: they look you up. Hinge Research Institute found 81 percent of buyers of professional services check out a firm’s website when evaluating it, more than ask for references. They are reading for signs: does this firm handle my kind of problem, who exactly would I be working with, do they sound like people who listen, and how do I take the first step without committing to anything.',
        'Most firm websites fail that reading. They describe the firm in the firm’s own words, hide the people, bury the practice areas in a dropdown, and end in a contact form that asks for a message and sends it to an inbox. Law firms, wealth managers, insurance agencies, consultancies, PR and marketing agencies, and telecom providers in and around Philadelphia all make the same mistake, and the fix is the same: show the people, state the work plainly, prove the credentials, and make the first step small. Hark means listen; a firm’s website should sound like it does.',
      ],
    },
    {
      heading: 'What we build for firms, and when the website is not the problem',
      paragraphs: [
        'A site that reads like the firm: a page per practice area written in plain English, a page per professional with real credentials and a real photograph, intake and scheduling that respect the client’s time and privacy, and fast, accessible code. We have built sites for a bilingual criminal defense practice, a multigenerational wealth manager, an insurance agency, and agencies like Renati Solutions and One Part Social; for Scribewise and for ComTec Systems, a cloud voice provider with customer and partner portals, the work went further into software and search.',
        'Then the newer piece: company knowledge AI. A firm’s real asset is what its people know, and most of it sits in old matters, emails, and one partner’s memory. We build private assistants trained on your own documents that answer from your records, cite the source, and stay inside your systems, so the associate asks the firm instead of the internet. And when the website is not the problem, we say so. A referral-fed practice with a full calendar may need a clean site, an accurate Google Business Profile, and a scheduling link, not a rebuild.',
      ],
    },
  ],
  faqs: [
    {
      q: 'What should a law firm website include?',
      a: 'The practice areas you actually take, each on its own page in plain language; every attorney with bar admissions, education, and a real photograph; results where your bar rules allow; reviews; office locations; and a short intake form or a scheduling link, with the required disclaimers. Most visitors decide in the first screen whether you handle their kind of case, so say it there.',
    },
    {
      q: 'How do financial advisors and wealth managers build trust online?',
      a: 'By being specific and compliant at once: who you serve, how you are compensated, your registrations and designations with the registering body named, the people with real photographs, and content that teaches rather than sells. State your fiduciary status if it applies. Keep the site archived for compliance, and make the first step a conversation, not a form that asks for account balances.',
    },
    {
      q: 'Is a scheduling link better than a contact form?',
      a: 'For a first consultation, usually yes: a scheduling link puts the meeting on the calendar without three emails, and a prospect who books is further along than one who writes. Keep a short form for people who want to describe their situation first, and make both land in the system your staff actually watches. Neither should ask for anything privileged or sensitive; that comes after the engagement.',
    },
    {
      q: 'What is company knowledge AI for a law firm or agency?',
      a: 'A private AI assistant trained on your firm’s own documents, matters, templates, and policies that answers from those records rather than the open internet, and cites where the answer came from. It runs inside your systems, with your permissions, so what one partner knows becomes something the whole firm can ask. It is not a website chatbot; it is an institutional memory with a search box.',
    },
    {
      q: 'Does the ADA apply to a law firm’s or advisor’s website?',
      a: 'Courts have consistently treated the websites of businesses that serve the public as places of public accommodation, and professional firms receive the same demand letters restaurants and shops do. The measuring stick is WCAG 2.2 AA: contrast, keyboard access, labeled forms, readable PDFs, captions. We fix the code; we do not install overlays.',
    },
    {
      q: 'How do I get my firm to show up in ChatGPT and Google answers?',
      a: 'Write the answers. AI assistants and Google’s AI overviews quote pages that state plainly what a practice does, for whom, where, and how, with the firm named. Give each service its own page, earn reviews and mentions on sites the engines trust, and structure the markup so the firm is machine-readable. That is generative engine optimization, GEO, built on the same foundation as good SEO.',
    },
  ],
  quote: {
    text: 'Hark Digital delivers what you want in every partner – technical expertise, a collegial approach to work and a commitment to our success.',
    name: 'John Miller',
    company: 'Scribewise',
  },
  cta: 'Search your practice area and your county. If a directory outranks your firm, we should talk.',
  metaDescription: 'Websites for law firms, advisors, insurers, and agencies in Philadelphia and South Jersey: credentials shown honestly, client intake, scheduling, knowledge AI. Hark Digital, est. 2016.',
  formService: 'Web Design & Development',
}
