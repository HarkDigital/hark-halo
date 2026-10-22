import type { IndustryPageData } from './index'

// Restaurants & Bars: online ordering that is theirs, menus they update themselves, reservations,
// events, gift cards, and local SEO, for seafood houses, sports bars, pizzerias, a bakery, a bagel shop,
// a wine region, and a golf course venue
export const restaurants: IndustryPageData = {
  slug: 'restaurants',
  scene: 'floorplan',
  headline: 'Their app takes a cut.',
  headlineAccent: 'Yours doesn’t.',
  lede: 'Every order through a delivery app pays a commission, and every menu on a third-party site is one you don’t control. We build restaurant and bar websites with online ordering that is yours, menus you update from your phone, reservations, events, and gift cards.',
  features: [
    {
      title: 'Online ordering you own',
      text: 'Pickup and delivery ordering on your own site, with your menu, your modifiers, and your customers’ names and emails staying with you. Orders reach the kitchen the way you want them, printed or on a tablet, and payment runs through Stripe or Square. The apps can stay on as advertising; the regulars order from you.',
    },
    {
      title: 'A menu you change yourself',
      text: 'The catch changes, the special runs out by eight, the wing night moves. Your menu is a page you edit from a phone, not a PDF someone has to re-upload, and it is marked up so Google shows your dishes and hours in search. Photos, allergens, and the Tuesday deal, all in your hands and all in one place.',
    },
    {
      title: 'Reservations and events',
      text: 'Bookings that go into the system you already use, whether that is OpenTable, Resy, Tock, or a calendar, with a live music schedule that updates itself and sells tickets when there are tickets. For Eastlyn in Vineland, that meant online tee times and wedding inquiries on the same site as the restaurant.',
    },
    {
      title: 'Gift cards and December',
      text: 'Digital gift cards sold from your site, delivered by email, redeemed at the register, with the December spike handled without a phone call. Add merch or a sauce for shipping if you have one. Dominick’s, Double Eagle, and Villa Fazzolari take orders on their own sites; the card is the next thing to sell.',
    },
  ],
  // TouchBistro, 2022 Diner Trends Report (September 2022; 521 US adults who dine out at least weekly):
  // 84 percent always or often look up a restaurant’s menu ahead of time, and 79 percent its website
  stat: { value: '84%', label: 'Of diners look up the menu online before they go. The menu page is your host stand.', viz: { kind: 'halo', share: 84, of: 100 } },
  process: [
    { title: 'Listen', text: 'What you serve, who comes in, where the orders come from today, and what the apps are taking.' },
    { title: 'Plan the menu', text: 'Menu, ordering, reservations, and events structured so one update shows up everywhere at once.' },
    { title: 'Build & connect', text: 'Site, ordering, payments, and your POS or booking system, tested on a phone at the bar.' },
    { title: 'Hand over', text: 'Your manager learns to change the menu and post the band, and we stay through the busy season.' },
  ],
  clients: ['crabtrap', 'sharkys', 'crabbyjacks', 'doubleeagle', 'villafazzolari', 'dominicks', 'semilla', 'bageluniversity', 'outercoastal', 'eastlyn'],
  services: ['web-design', 'ecommerce', 'seo-geo', 'page-speed', 'wordpress'],
  article: [
    {
      heading: 'Why a restaurant’s website is the menu in the window',
      paragraphs: [
        'A restaurant’s website is the menu taped in the window, the chalkboard, and the host stand, for everyone who hasn’t walked in yet. TouchBistro’s 2022 survey of regular diners found 84 percent look up the menu before they go, and nearly as many check the website. They are deciding between you and the place down the block from a phone in a parking lot, and they will decide against a PDF that won’t load, hours that are wrong, and a “call for reservations” line at nine on a Friday.',
        'The second problem is who owns the order. Third-party delivery apps take a commission on every ticket and keep the customer’s name, and a Google listing that points to the app sends your regulars through it. For a seafood landmark like the Crab Trap in Somers Point, a Vineland pizzeria like Dominick’s, or a bagel shop that lives on morning pickup, the difference between an order on your site and one through an app is the margin on the order, every order, forever.',
      ],
    },
    {
      heading: 'What we build for restaurants and bars, and what we leave alone',
      paragraphs: [
        'Online ordering on your own domain, tied to Stripe or Square and to the kitchen; a menu you edit from your phone, marked up so Google shows dishes and hours in search; reservations through whatever system you already use; an events calendar for the bands, the trivia, and the wine dinners; digital gift cards; and a Google Business Profile that is complete and watched. We have built this for seafood houses, sports bars, pizzerias, a sourdough bakery in Wilmington, a bagel shop, a wine region’s trade association, and a golf course that books tee times and weddings on the same site.',
        'And we leave alone what works. If your POS vendor’s ordering is solid and its terms are fair, we connect to it rather than replace it. If the apps bring you new customers, keep them as advertising and move the regulars to your site. A neighborhood bar with a chalkboard menu and a packed room may need a one-page site, correct hours, and good photos, and we say so. The site should be as simple as the service lets it be, and no simpler.',
      ],
    },
  ],
  faqs: [
    {
      q: 'Should a restaurant have its own online ordering?',
      a: 'If you do steady pickup or delivery, yes: an order on your own site keeps the whole ticket and the customer’s contact details, and an order through a delivery app does not. Keep the apps for reach if they bring you new faces, and point your Google listing, your Instagram, and your regulars to your own ordering. Many of our clients run both; the difference shows up in the margin.',
    },
    {
      q: 'How do I update my restaurant menu online without a developer?',
      a: 'By building the menu as content you edit, not as a PDF you upload. On the sites we build, a manager changes an item, a description, or a photo from a phone, and the change appears on the site, in the ordering system, and in the structured data Google reads, all at once. Keep one source of truth; the printed menu, if you still want one, is generated from it.',
    },
    {
      q: 'Why does Google show the wrong hours for my restaurant?',
      a: 'Because your Google Business Profile is the source, not your website, and it has not been updated, or someone else edited it; Google lets the public suggest changes. Claim the profile, set regular and special hours yourself, and check it after every change of season. We also mark up hours on your site so the two agree, and we watch the profile after launch.',
    },
    {
      q: 'Do I need reservations software, or is the phone enough?',
      a: 'The phone is enough until it rings during service and nobody answers it. Online reservations take the booking at nine on a Friday, send the reminder, and cut no-shows. If you already have OpenTable, Resy, or Tock, we build the site around it; if you do not, a simple booking form into your calendar handles a small room fine. Weddings and parties usually want an inquiry form, not a widget.',
    },
    {
      q: 'What is the best website platform for a restaurant?',
      a: 'The one your staff will actually update. For most independent restaurants that is WordPress with a menu system and an ordering integration, because it is editable from a phone and does not lock your menu inside a vendor. Platforms built by POS companies are fine for ordering but weak as websites. We recommend the lightest setup that fits how you run service.',
    },
    {
      q: 'How do gift cards work on a restaurant website?',
      a: 'A customer buys a card on your site, it arrives by email with a code, and the recipient redeems it at the register or at checkout online. The cards can run through your POS, Square and Toast both support them, or through a standalone system we connect. Set it up before December, the month gift cards are bought as presents, and the season will tell you whether the site is doing its job.',
    },
  ],
  cta: 'Pull up your menu on a phone in the parking lot. If you wouldn’t order from it, we should talk.',
  metaDescription: 'Restaurant websites in Philadelphia and South Jersey: online ordering without the app commission, menus you edit yourself, reservations, events, gift cards. Hark Digital, est. 2016.',
  formService: 'Web Design & Development',
}
