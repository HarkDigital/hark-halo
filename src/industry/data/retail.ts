import type { IndustryPageData } from './index'

// Retail & Ecommerce: online stores, product pages, 3D models, checkout, shipping, analytics, speed,
// for a boardwalk candy shop, disc golf equipment makers, a dispensary, a farm, and a payments company
export const retail: IndustryPageData = {
  slug: 'retail',
  scene: 'shelves',
  headline: 'Good product. Now the',
  headlineAccent: 'checkout.',
  lede: 'Seven in ten online carts are abandoned, most at a checkout that asked too much or surprised the shopper late. We build stores that are fast, honest, and easy to run, from product pages with 3D models to a checkout that answers questions before they’re asked.',
  features: [
    {
      title: 'Product pages that sell',
      text: 'Photography that shows the thing, copy that answers the questions people ask before buying, variants laid out plainly, reviews where they help, and 3D models you can turn in the browser when the shape matters. For Ridge Roller’s modular disc golf carts, the page has to explain a system, not a SKU.',
    },
    {
      title: 'A checkout that doesn’t leak',
      text: 'Baymard’s research is blunt: the big reasons people abandon a cart are extra charges that appeared late, forced account creation, and a form that goes on forever. We show shipping and tax early, allow guest checkout, keep the form short, and offer Apple Pay and Google Pay so a phone purchase is a thumbprint.',
    },
    {
      title: 'Shipping, tax, back office',
      text: 'Carrier rates or flat rules that match how you actually ship, sales tax calculated for the states where you owe it, and orders flowing into inventory, accounting, and fulfillment without retyping. Perotti Farms sells herbs by order or subscription; Zing Mini sells minis by the hundred. The store fits the business.',
    },
    {
      title: 'Speed and the numbers',
      text: 'A store that loads in a blink on a mid-range phone, because every second of delay is a share of carts gone, and analytics set up so you can see what sold, where visitors came from, and which page lost them. We teach you to read the dashboard, so the next decision comes from data instead of a hunch.',
    },
  ],
  // Baymard Institute, “Cart Abandonment Rate Statistics” (a running average of about fifty studies, 2025): the
  // average documented online cart abandonment rate is just over 70 percent (70.19 to 70.22 by edition); extra costs
  // (shipping, tax, fees) are the top reason in Baymard’s own survey of shoppers who abandoned
  stat: { value: '70%', label: 'Of online carts are abandoned. The top reason: a total that grew at the end.', viz: { kind: 'orb', share: 0.7 } },
  process: [
    { title: 'Listen', text: 'What you sell, who buys it, how it ships, and where the current store loses people.' },
    { title: 'Plan the catalog', text: 'Products, variants, shipping, and tax structured right the first time, so the store stays easy to run.' },
    { title: 'Build & connect', text: 'Store, payments, shipping, and the back office, all talking, tested on real phones at checkout.' },
    { title: 'Grow', text: 'Conversion tuning, the seasonal push, and the reports that show what actually worked.' },
  ],
  clients: ['shrivers', 'ridgeroller', 'zingmini', 'tasteofearth', 'founderspay', 'perotti'],
  services: ['ecommerce', '3d-modeling', 'seo-geo', 'page-speed', 'web-design'],
  article: [
    {
      heading: 'Why most online stores lose the sale at the end',
      paragraphs: [
        'An online store is a shop, a register, a bookkeeper, and a salesperson, and most of them lose the customer in the last thirty seconds. Baymard Institute’s running average across fifty studies puts cart abandonment at just over 70 percent. Some of that is browsing. The rest is fixable: in Baymard’s survey of reasons, the leading ones are extra charges that appeared too late, being made to create an account, a checkout that dragged on, and not trusting the site with a card. None of those is a marketing problem. They are design and plumbing.',
        'The same is true of speed. Google’s research found the chance a mobile visitor bounces rises 32 percent as load time goes from one second to three, and a product page carrying a dozen scripts and uncompressed photos is usually past three. For a boardwalk candy shop like Shriver’s, whose online season peaks in December, or a dispensary in Buena taking pre-orders, the store has to work on a phone in a hurry or it does not work.',
      ],
    },
    {
      heading: 'What we build for retailers, and which platform fits',
      paragraphs: [
        'We build on WooCommerce and Shopify for most catalogs and on custom code when the product demands it: subscriptions for a microgreens farm, pre-orders for a dispensary, bulk ordering for a maker who sells by the hundred, or a payment portal for a business that only needs to take a deposit. Product pages get real photography, honest copy, and 3D models when the shape sells it. Checkout shows shipping and tax early, allows guests, and takes Apple Pay and Google Pay. Behind it: inventory, accounting, shipping labels, and email connected, so an order is typed once.',
        'More than three and a half million dollars a year flows through client sites we built, and the lesson is consistent: the right platform is the lightest one that fits how you actually sell. A maker with twelve products does not need an enterprise stack, and a shop with a thousand SKUs and a warehouse should not be on a page builder. We tell you which you are, and if your current store needs a tune-up rather than a rebuild, we say that too. Under all of it: SSL everywhere, card numbers that never touch your server, and updates applied before they are urgent.',
      ],
    },
  ],
  faqs: [
    {
      q: 'Why do people abandon their shopping carts?',
      a: 'Mostly because the checkout surprised or burdened them. Baymard’s survey of shoppers who abandoned found the top reasons were extra charges shown too late, forced account creation, a slow or complicated checkout, and not trusting the site with a card. Carts left by people only browsing can’t be fixed. The rest can, by showing the full total early, allowing guest checkout, and keeping the form short.',
    },
    {
      q: 'Should my small shop use Shopify or WooCommerce?',
      a: 'Shopify when you want hosting, payments, and updates handled for you and your catalog is conventional; WooCommerce when you want ownership of the whole stack, deeper customization, or a store that is part of a larger WordPress site. Both run serious businesses. We pick based on how you sell and who will run it, and we have built and rescued stores on each.',
    },
    {
      q: 'How do I make my product pages rank on Google?',
      a: 'Write each page for the search, not just the shelf: the product’s real name and the words people use for it, a description you wrote rather than the manufacturer’s, specifications as text, reviews, and structured data so Google can show availability and ratings in results. Fast pages and clean categories matter too, and a page that answers the question is the one an AI assistant quotes.',
    },
    {
      q: 'Is 3D worth it for a small online store?',
      a: 'When the shape, size, or build of the product is part of the decision, yes: furniture, equipment, anything configurable, anything a shopper would pick up and turn over in a store. Shopify reports a 94 percent average conversion lift for merchants who add 3D content. For a T-shirt or a jar of jam, good photography does the job, and we will say so.',
    },
    {
      q: 'What does an online store need to be secure?',
      a: 'Payments through an established processor like Stripe, Square, Shopify Payments, or PayPal, so card numbers never touch your server; SSL on every page; software kept updated; strong admin logins with two-factor authentication; and backups that are actually tested. Because we also do hack remediation, we build stores the way a locksmith builds a door, and we know what attackers look for.',
    },
    {
      q: 'How do I know what is selling and what isn’t?',
      a: 'From analytics set up properly: sales by product and category, traffic by source, conversion rate by page and device, and the path shoppers take before they leave. We configure Google Analytics and your platform’s own reports, strip out the noise, and teach you to read the dashboard, so you see a product page bleeding visitors before the quarter ends.',
    },
  ],
  quote: {
    text: 'Their ideas were fresh and unique to our company. Hark Digital helped launch a successful holiday season campaign that brought us record number sales.',
    name: 'Holly Kisby',
    company: 'Shriver’s Salt Water Taffy',
  },
  cta: 'Buy something from your own store on your phone. Count the taps. If it felt like work, call us.',
  metaDescription: 'Ecommerce and online store development in Philadelphia and South Jersey: WooCommerce and Shopify, product pages, 3D models, checkout, shipping, analytics. Hark Digital, est. 2016.',
  formService: 'Ecommerce',
}
