# Writing a new Hark industry page

A brief for writing the copy for an industry page on hark.digital (the Hark Halo site): a page for one line of work (manufacturing, restaurants, healthcare…) that says what we build for it, shows the clients we built it for, and points at the services that fit. It follows `SERVICE-PAGE-TEMPLATE.md` almost field for field; read that first for the house rules, the voice and the lengths. This file covers only what is different.

**How to use it:** fill in the template below and hand it to the Hark Halo thread. That thread wires it in (`src/industry/data/<slug>.ts`, the `INDUSTRIES` entry in `src/content.ts`, the hero scene). You only write words.

The live pages are at `https://harkdigital.github.io/hark-halo/industries/<slug>/`; read two before writing.

---

## Where an industry shows up

| Place | What it uses |
|---|---|
| **Header dropdown, phone menu, footer "Industries" column** | Title |
| **The index**, `/industries/` | Title and index blurb, as a plate |
| **Its own page**, `/industries/<slug>/` | Everything below |
| **Google, AI assistants, link previews** | Search description, plus the article and FAQs |

## The page, top to bottom

1. **Hero:** the title as a small label, the **headline** (two lines) and the **lede**; buttons "Start a project" and "All industries". Behind it, the industry's own animated **hero scene**.
2. **What you get:** four frosted panels, each a **feature**: what we build for this trade and why it matters to it.
3. **The number:** one big **stat** about this industry's customers online, with its label in caps.
4. **How it works:** "First we listen. Then we build." and four **process steps**, flavoured for the trade (or the site's standard four, if the trade has nothing to add).
5. **The clients:** "Built for <industry>." and the Portfolio tiles of the sites we built in it. You name the clients; the tiles come from the Portfolio.
6. **Services that fit:** the four to six service pages that answer this industry first, as panels. You name them, in order.
7. **The longer version:** the **article**, two short sections.
8. **Questions, answered:** six **FAQs**, "What people ask us about <industry in lower case>."
9. **A client quote**, only a real one from a client in this industry.
10. **The closing line**, then previous / next industry.
11. The shared contact card (a fitting service preselected in the form) and footer.

## What is different from a service page

- **The angle:** a service page says what the service is; an industry page says what this trade's customers do online, what goes wrong on the trade's typical website or software, and what we build about it. Name the trade's things (the spec sheet, the estimate request, the menu, the intake form).
- **The stat** is about the trade's customers, not about us ("share of diners who read a menu online before choosing"), from a named public study, association, government source or platform report. Note the source.
- **The clients** and **the services** are lists of names: the clients from the Portfolio (by their site), the services by their page title.
- **The index blurb** (137–185 characters) stands on the `/industries/` plate: the trade's pain as a question, then what we build.
- Lengths are the service page's (`SERVICE-PAGE-TEMPLATE.md`, "Each field").

---

## The template

```markdown
# Industry: <Title>

## 1. Basics
- **Title:**
- **Slug:**
- **Index blurb:**

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

## 5. How it works (four steps, or "standard")
1. **<Step>**: <one sentence>
2. **<Step>**: <one sentence>
3. **<Step>**: <one sentence>
4. **<Step>**: <one sentence>

## 6. The clients
<the Portfolio sites in this industry, by name>

## 7. Services that fit (four to six, in order)
<service page titles>

## 8. The longer version (article)
**<Section heading>**

<paragraph>

**<Section heading>**

<paragraph>

## 9. Questions, answered (six FAQs)
1. **Q:**
   **A:**
…

## 10. Client quote (optional)
<“exact words” (Name, Company)> or (none)

## 11. Closing line

## 12. Search description

## 13. Hero scene
<two sentences: what it shows, what the cursor does>

## 14. Form preselect
<the service the contact form should start on>
```

## Before you hand it back

The service brief's checklist, plus: every client named is on the Portfolio; every service named has a page; the stat is about the trade's customers and its source is noted; "What people ask us about <industry in lower case>." reads naturally.
