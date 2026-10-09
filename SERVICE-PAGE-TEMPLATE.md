# Writing a new Hark service page

A brief for writing the copy for a new service on hark.digital (the Hark Halo site). It covers what a service page is made of, the house rules, how long each piece runs, a blank template to fill in and a finished example (Page Speed, as it is live today).

**How to use it:** fill in the template in the section "The template" for the service you have been building, and hand the filled-in file to the Hark Halo thread. That thread wires it into the site: the page itself, the home page, the menus, the contact form and the copy spreadsheet. You only write words; you never touch the site's code.

The site has twelve services today: Software Development, Web Design & Development, Ecommerce, SEO / GEO, Page Speed, AI Consulting, Company Knowledge AI, Aerial Photography & Video, Hack Remediation, Website & Data Security, ADA Accessibility and WordPress. Read two or three of their live pages (`https://harkdigital.github.io/hark-halo/services/<slug>/`, for example `/services/page-speed/`) before writing; matching their voice matters more than anything in this file.

---

## Where a service shows up

One service's words appear in more places than its own page:

| Place | What it uses |
|---|---|
| **Home page, "What we do"** (the stack of glowing plates) | Title, home page blurb, and an "Explore the service" button |
| **Its own page**, `/services/<slug>/` | Everything below |
| **Nav dropdown, phone menu, footer services list** | Title |
| **Contact form**, "What do you need?" menu | Title (picked for you on its own page) |
| **Read as a page** (the plain-text version of the home page) | Title and home page blurb |
| **Google, AI assistants, link previews** | Search description, plus the article and FAQs (they are written to be quoted) |

## The page, top to bottom

1. **Hero:** the service title as a small label, then the **headline** (big, two lines), the **lede** (a short paragraph), and two fixed buttons ("Start a project" and "All services"). Behind it, the service's own animated **hero scene**.
2. **What you get:** four frosted panels, each a **feature** (a title and a paragraph).
   - *Optional:* a **Connects with** logo wall of the tools the service works with (Company Knowledge AI has one): a label, one line, the tools (Simple Icons slugs) and any tools to name in text instead. Ask for it in the build notes.
3. **The number:** one big **stat** with a caps label under it.
4. **How it works:** the fixed heading "First we listen. Then we build." and four **process steps** (a short title and one sentence each).
5. **The longer version:** the **article**, two (sometimes three) short sections with a heading each.
6. **Questions, answered:** the heading "What people ask us about \<title in lower case\>." and six **FAQs**, opening and closing like an accordion.
7. **A client quote**, only when the service has a real one.
8. **The closing line**, a one-sentence nudge, then links to the previous and next service.
9. The shared "Say hello." contact card and footer (you write nothing here).

The section labels ("What you get", "How it works", "The longer version", "Questions, answered") and the buttons are the same on every page; don't write them.

---

## House rules (Mike's, all of them firm)

**Never on the site:**
- **The cost of any service.** No prices, ranges, "fixed price", "flat fee", retainers, "affordable", "cheaper than…", "a fraction of the cost", "pays for itself", per-seat or per-month talk, "free consultation". Nothing that prices our work or compares it on price. (A client's own words in a testimonial are fine as they are.)
- **Turnaround times.** No "in weeks, not months", "same day", "next day", "within 24 hours", "launch in four weeks", "results in three to six months". Describe *what* happens, never *how long* it takes us.
- **FAQs with an obvious "yes".** No "Will my website work on phones?", "Do I need SSL?", "Is it safe?", "Do you offer support?". Every question should be one a real customer is unsure about, and every answer should teach something.
- **A count of our services** ("eleven services", "our 12 offerings"). The number keeps changing.
- **Anything made up.** Stats must be true and sourceable (a public study, a law, a real count). Testimonials must be a real client's real words, quoted exactly; if there isn't one yet, leave the quote out. Don't invent credentials, client names, results or years.

**Voice:**
- **Plain English, confident, a little dry.** Short sentences. Concrete nouns: name the tools, the problems, the people ("the receptionist stops retyping intake forms").
- **Honest to a fault.** "We tell you honestly when you don't need us" is the brand. Say what the service is *not* for.
- **"Hark" means listen.** The process always starts by listening. It's fine to nod to it; don't overdo it.
- **"We"** is Hark Digital. **"Mike"** (Mike Harkins) is named only where it's personal, like the licensed drone pilot.
- **Local and findable.** Mention Philadelphia (and "small businesses") where it's natural, especially in the search description and the article; write definitional, quotable sentences ("Generative engine optimization (GEO) is the practice of…") so Google and AI assistants can lift them.

**Punctuation and style:**
- **No em dashes or en dashes in sentences.** Use commas, colons or full stops. ("Your website is your hardest-working employee, it never sleeps and never calls out.")
- **Curly quotes and apostrophes** (’ “ ”), the **serial comma**, American spelling.
- **No italics, no emphasis styling.** Headlines are plain white; the "headline ending" is just where the line breaks.
- **No exclamation marks**, no "#1", no "guaranteed", no buzzwords ("synergy", "solutions", "cutting-edge", "digital transformation").

---

## Each field: what it is and how long

Lengths are from the eleven live pages (characters, with spaces). Stay inside the range; aim for the middle.

| Field | Shows up | Length | Notes |
|---|---|---|---|
| **Title** | everywhere | 9–26 chars (avg 16) | The service's plain name, title case. It is also read in lower case in the FAQ heading ("What people ask us about page speed."), so make sure that sentence reads well. |
| **Slug** | the address | 1–3 words, lowercase, hyphens | e.g. `page-speed`, `ai-consulting`. |
| **Home page blurb** | home plate, Read as a page | 137–185 chars (avg 160) | One or two sentences: the problem, then what we do. Often opens with the customer's pain as a question ("Slow site dragging down your Google score and your sales?"). |
| **Keywords** | not shown (kept for later) | 4 short phrases | The four things people search for, e.g. "Core Web Vitals, PageSpeed Insights, GTmetrix, Load Time". |
| **Headline** + **ending** | hero | 14–44 chars together (3–9 words) | A punchy line in two parts; the ending is the last 1–2 words and lands the point. "Slow is the new / broken." · "AI without the / snake oil." · "Be the / answer." · "Every visitor. / No exceptions." |
| **Lede** | hero | 167–272 chars (26–46 words) | The pitch in 2–3 sentences: the stakes, what we do, the outcome. |
| **Features** (4) | "What you get" | title 9–28 chars; text 214–316 chars (32–53 words) | Four distinct things the client gets. Each paragraph: a claim, how we do it (specific), why it matters. Often ends on a short, quotable line ("so the improvement isn’t a feeling, it’s a receipt."). |
| **Stat** | "The number" | value 2–8 chars; label 55–89 chars | A real, checkable number or a short word in place of one. Live ones: "32%", "1 in 4", "43%", "24/7", "Part 107", "Page 1", "Hours", "Now", "10 years", "$1M+" (client store revenue, not our price). The label finishes the sentence and is shown in caps. |
| **Process** (4 steps) | "How it works" | title 3–21 chars; text 58–123 chars | Four steps, verbs first, the first one is usually "Listen", "Audit", "Measure" or "Assess". One sentence each. No timings. |
| **Article** (2 sections, sometimes 3) | "The longer version" | heading 29–67 chars; 1–2 paragraphs each, 201–590 chars (36–98 words) | The SEO and GEO workhorse. Section 1 usually defines the thing and why it matters to a business; section 2 how we do it or when it's worth it (and when it isn't). Facts, names, local detail. |
| **FAQs** (6) | "Questions, answered" | question 24–67 chars; answer 179–407 chars (26–70 words) | Questions phrased the way people type them into Google or ask ChatGPT ("What is…", "Why is my…", "Should I…", "How do I…", "What does … include?"). The answer's first sentence answers outright; the rest adds the useful detail. No cost, no timelines, no obvious yeses. |
| **Client quote** (optional) | after the FAQs | one or two sentences | Only a real client's exact words, with their name and company. |
| **Closing line** | end of the page | 35–97 chars | A nudge or a dare in the customer's voice. "Run your homepage through PageSpeed Insights. Not happy with the number? Let us fix it." · "Google yourself. If you didn’t like what you saw, talk to us." |
| **Search description** | Google, link previews | 162–187 chars | Says what the service is, for whom and where (Philadelphia / small businesses), with the main search terms. Plain, no hype. |

### Two picks that aren't words (suggest them; the Hark Halo thread makes them)

- **Hero scene:** every service page has its own small animation behind the hero, drawn in neon tubes and frosted glass, that reacts to the cursor. The live ones: a circuit grid of data packets (Software), a wireframe that sketches itself (Web Design), a live revenue line (Ecommerce), a radar sweep that finds you (SEO / GEO), a speed gauge (Page Speed), a sieve that filters hype into signal (AI Consulting), a drone over topographic contours (Aerial), a corrupted grid swept clean (Hack Remediation), a shielded core deflecting threats (Security), a keyboard focus ring tabbing through a page (ADA), content blocks snapping into a page (WordPress). Describe one for the new service in two sentences: what it shows, and what the cursor does.
- **Home page icon:** a simple line icon for the service's plate (the live ones are a `</>`, a browser window, a cart, a magnifier with a spark, a lightning bolt, a chip with a sparkle, a quadcopter, a repair cross, a shield with a check, the accessibility figure, a W in a ring). Name one.

---

## The template

Copy everything between the lines, fill it in, and hand it back. Leave a field as `(none)` if it doesn't apply (only the client quote and the logo wall are optional).

---

```markdown
# Service: <Title>

## 1. Basics
- **Title:** 
- **Slug:** 
- **Home page blurb:** 
- **Keywords (internal, not shown):** <four phrases>

## 2. Hero
- **Headline:** 
- **Headline ending:** 
- **Lede:** 

## 3. What you get (four features)
1. **<Feature title>**: <paragraph>
2. **<Feature title>**: <paragraph>
3. **<Feature title>**: <paragraph>
4. **<Feature title>**: <paragraph>

## 4. The number
- **Value:** 
- **Label:** 
- **Source:** <where the number comes from; not shown, but needed>

## 5. How it works (four steps)
1. **<Step>**: <one sentence>
2. **<Step>**: <one sentence>
3. **<Step>**: <one sentence>
4. **<Step>**: <one sentence>

## 6. The longer version (article)
**<Section heading>**

<paragraph>

<paragraph>

**<Section heading>**

<paragraph>

<paragraph>

## 7. Questions, answered (six FAQs)
1. **Q:** 
   **A:** 
2. **Q:** 
   **A:** 
3. **Q:** 
   **A:** 
4. **Q:** 
   **A:** 
5. **Q:** 
   **A:** 
6. **Q:** 
   **A:** 

## 8. Client quote (optional)
<“exact words” (Name, Company)> or (none)

## 9. Closing line


## 10. Search description


## 11. Hero scene and home icon
- **Hero scene:** <two sentences: what it shows, what the cursor does>
- **Home icon:** 

## 12. Notes for the build (optional)
<anything the Hark Halo thread should know: where it should sit in the services order, which portfolio sites show this work, a link to the product or demo, words to avoid, facts to double-check>
```

---

## Before you hand it back

- [ ] Every field filled, inside its length range.
- [ ] Nothing about price, cost, fees or savings on our work; no turnaround times; no count of services.
- [ ] No FAQ whose answer is an obvious "yes"; each answer's first sentence answers the question.
- [ ] The stat is true, and its source is noted.
- [ ] The quote (if any) is a real client's exact words.
- [ ] No em dashes in sentences; curly quotes; serial comma; no exclamation marks.
- [ ] "What people ask us about \<title in lower case\>." reads naturally.
- [ ] Philadelphia or "small business" appears in the search description or article where it fits.
- [ ] Read it aloud next to a live service page: same voice?

---

## A finished example: Page Speed (as live on the site)

Every word below is on the site today, copied from the code.

#### 1. Basics

- **Title:** Page Speed
- **Slug:** page-speed
- **Home page blurb:** Slow site dragging down your Google score and your sales? We fix Core Web Vitals, turn those red PageSpeed and GTmetrix numbers green, and make pages load in a blink.
- **Keywords (internal, not shown):** Core Web Vitals, PageSpeed Insights, GTmetrix, Load Time

#### 2. Hero

- **Headline:** Slow is the new
- **Headline ending:** broken.
- **Lede:** A slow site loses customers before it can say hello. We find what is dragging you down, fix it, and turn those red PageSpeed and GTmetrix scores green, with load times measured in milliseconds instead of seconds.

#### 3. What you get (four features)

1. **Core Web Vitals**: LCP, INP, and CLS are Google ranking factors. We get all three into the green so search rewards your site instead of burying it. That means measuring real field data, not just lab runs, and fixing the layout shifts and slow renders your actual visitors feel on actual connections.
2. **PageSpeed & GTmetrix**: We chase the exact issues those tools flag, oversized images, heavy scripts, render-blocking code, missing caching, until the numbers turn green and stay there. And you get the before-and-after scores in writing, so the improvement isn’t a feeling, it’s a receipt.
3. **Fast on real phones**: Lab scores are easy; a mid-range Android on cell data is the real test. We optimize for the visitor you are actually losing, not just your fast laptop. Images sized for the screen that loads them, scripts deferred until they matter, and a first paint that lands before patience runs out.
4. **Speed that lasts**: Sites rot as plugins and content pile up. We set up caching, compression, a CDN, and monitoring so it stays fast long after we leave. And we leave notes, so the next plugin someone installs doesn’t quietly undo three seconds of hard-won speed.

#### 4. The number

- **Value:** 32%
- **Label:** More likely a visitor bounces when mobile load time goes from one second to three
- **Source:** Google’s mobile page speed research (Think with Google, Google/SOASTA, 2017), also quoted in the article

#### 5. How it works (four steps)

1. **Measure**: A real audit across PageSpeed, GTmetrix, and field data, so we fix what actually hurts you, not what merely looks scary.
2. **Fix the heavy hitters**: Bloated images, oversized scripts, render-blocking CSS, and slow hosting, tackled in order of impact.
3. **Tune & cache**: Compression, lazy-loading, a CDN, and smart caching so repeat visits feel instant.
4. **Verify**: We re-test on real devices and hand you the before-and-after scores in writing.

#### 6. The longer version (article)

**Why page speed is a business problem, not a tech one**

Page speed is how long your site takes to become useful to a visitor, and it quietly decides whether they stay or bounce. Google’s own research is blunt about it: as mobile load time goes from one second to three, the chance a visitor leaves jumps by around 32 percent; by five seconds it roughly doubles. A slow site is not a technical footnote, it is lost customers and lower rankings, every single day.

Since 2021 speed is also a direct Google ranking factor through Core Web Vitals, so a slow site competes with one hand tied behind its back. The good news is that page speed is one of the most fixable problems on the web, and the fixes show up where it counts: recovered traffic and conversions.

**What actually makes a website slow**

The usual suspects are boringly consistent: enormous unoptimized images, a pile of plugins each loading their own scripts, render-blocking CSS and JavaScript, no caching, no compression, and underpowered shared hosting that buckles under load. Heavy page builders like Elementor, Divi, and WPBakery are common culprits, they trade speed for drag-and-drop convenience, and the bill comes due in load time.

Fixing it is detective work, not guesswork. We read the actual waterfall in GTmetrix and the flagged opportunities in PageSpeed Insights, then attack them in order of impact: compress and lazy-load images, defer and trim scripts, inline the critical CSS, add a CDN and proper caching, and upgrade hosting when the server itself is the bottleneck. Most sites get their biggest jump from the first two or three fixes alone.

#### 7. Questions, answered (six FAQs)

1. **Q:** Why is my website so slow?
   **A:** Almost always some mix of oversized images, too many plugins and scripts, render-blocking code, missing caching and compression, and slow hosting. A quick audit in PageSpeed Insights and GTmetrix pinpoints exactly which of these is hurting you the most, and most sites have two or three big offenders doing the bulk of the damage.

2. **Q:** What is a good PageSpeed Insights score?
   **A:** PageSpeed scores run 0 to 100: 90+ is green (good), 50 to 89 is amber (needs work), and under 50 is red (poor). Aim for 90+ on both mobile and desktop, but the real target is passing Core Web Vitals on real-world field data, since that is what Google actually ranks on.

3. **Q:** What are Core Web Vitals?
   **A:** Three metrics Google uses to measure real experience: LCP (Largest Contentful Paint, how fast the main content loads, target under 2.5 seconds), INP (Interaction to Next Paint, how responsive the page feels, target under 200 milliseconds), and CLS (Cumulative Layout Shift, how much the page jumps around, target under 0.1). Passing all three is a ranking advantage.

4. **Q:** How do you prove the speed actually improved?
   **A:** With before-and-after numbers in writing: PageSpeed Insights and GTmetrix scores, Core Web Vitals from real-world field data, and load times measured on real phones. We re-test after every round of fixes, so the improvement isn’t a feeling, it’s a receipt.

5. **Q:** Do I need to rebuild my site to make it fast?
   **A:** Usually not. Most slow sites have two or three big offenders, oversized images, too many scripts, missing caching, and fixing those delivers most of the gain without touching the design. When the foundation itself is the problem, like a heavy page builder or an abandoned theme, we show you the numbers and tell you honestly whether a rebuild is worth it.

6. **Q:** Will faster pages actually help my Google ranking?
   **A:** Speed alone will not vault a weak page to the top, but slowness is a real handicap it removes. Core Web Vitals are a confirmed ranking factor, and faster pages also cut bounce rates and lift conversions, which send their own positive signals. Fast is table stakes now, not a bonus.

#### 8. Client quote

(none: Page Speed has no client quote yet, so the section is left out)

#### 9. Closing line

Run your homepage through PageSpeed Insights. Not happy with the number? Let us fix it.

#### 10. Search description

Website speed optimization in Philadelphia. We fix slow PageSpeed Insights and GTmetrix scores, pass Core Web Vitals, and make pages load fast. Hark Digital, est. 2016.

#### 11. Hero scene and home icon

- **Hero scene:** velocity (a performance gauge that sweeps up to a fast score, with speed streaks; move the cursor to rev it)
- **Home icon:** a lightning bolt

