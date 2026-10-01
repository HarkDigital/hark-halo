// Add a client site to the Portfolio in one go.
//
//   npm run add-site -- <url> --industry="Seafood Restaurant" [--name="The Crab Trap"]
//                       [--blurb="One factual sentence, ~64–79 characters."] [--tags="Ecommerce,Events"]
//                       [--id=crabtrap] [--hide=".promo-modal"] [--archive=<snapshot url>]
//                       [--no-video] [--dry] [--force]
//
// 1. captures the homepage at 1280×800 (third-party overlays hidden, lib/capture.mjs,
//    plus --hide; nothing is clicked) → public/work/<id>.webp and public/work/640/<id>.webp
// 2. records its hover video → public/work/video/<id>.mp4 (scripts/work-video.mjs)
// 3. appends it to PORTFOLIO_MORE in src/content.ts (portfolio only: the story's Work
//    chapter reads WORK)
//
// --industry is required. --name and --blurb are drafted from the page (og:site_name /
// <title>, the meta description) when left out, and --tags from what the page carries
// (a cart → Ecommerce, "order online" → Online Ordering, …); drafts are flagged in the
// output and with a comment in content.ts, so read them before committing. The house
// style for a blurb: one factual sentence, 64–79 characters, serial comma, curly
// apostrophes, no state abbreviations, no exclamation marks.
// --archive: capture from a snapshot (a site that's down) while the entry links the real url.
// --dry: capture to /private/tmp/claude-501/add-site/ only and print the entry.
// --force: replace an existing id's images and video (its content.ts entry is left alone).
import puppeteer from 'puppeteer-core'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { LAUNCH, UA, hideCss } from './lib/capture.mjs'

const argv = process.argv.slice(2)
const args = Object.fromEntries(
  argv
    .filter(a => a.startsWith('--'))
    .map(a => {
      const [k, ...v] = a.replace(/^--/, '').split('=')
      return [k, v.length ? v.join('=') : true]
    }),
)
const fail = msg => {
  console.error(`✗ ${msg}`)
  process.exit(1)
}
const rawUrl = argv.find(a => !a.startsWith('--')) ?? args.url
if (!rawUrl) fail('usage: npm run add-site -- <url> --industry="…" [--name=… --blurb=… --tags=…]')
let url
try {
  url = new URL(/^https?:\/\//.test(rawUrl) ? rawUrl : `https://${rawUrl}`)
} catch {
  fail(`not a URL: ${rawUrl}`)
}
if (url.pathname === '') url.pathname = '/'
const industry = typeof args.industry === 'string' ? args.industry.trim() : ''
if (!industry && !args.dry) fail('--industry is required (e.g. --industry="Law Firm")')

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const contentPath = path.join(root, 'src', 'content.ts')
const content = fs.readFileSync(contentPath, 'utf8')
const host = url.hostname.replace(/^www\./, '')
const id = typeof args.id === 'string' ? args.id : host.split('.')[0].toLowerCase().replace(/[^a-z0-9]/g, '')
if (!/^[a-z0-9]+$/.test(id)) fail(`bad id "${id}" (lowercase letters and digits only; pass --id=…)`)
const ids = new Set([...content.matchAll(/^\s*id: '([^']+)',$/gm)].map(m => m[1]))
const known = ids.has(id)
if (known && !args.force) fail(`"${id}" is already in src/content.ts (pass --id=… for a different site, or --force to re-shoot this one)`)
const sameUrl = [...content.matchAll(/^\s*url: '([^']+)',$/gm)].find(m => new URL(m[1]).hostname.replace(/^www\./, '') === host)
if (sameUrl && !known && !args.force) fail(`${host} is already in src/content.ts (${sameUrl[1]})`)

const dry = !!args.dry
const out = dry ? path.join('/private/tmp/claude-501/add-site', id) : path.join(root, 'public', 'work')
const tmp = path.join('/private/tmp/claude-501/add-site', id)
fs.mkdirSync(path.join(out, '640'), { recursive: true })
fs.mkdirSync(tmp, { recursive: true })
for (const f of [path.join(out, `${id}.webp`), path.join(root, 'public', 'work', 'video', `${id}.mp4`)])
  if (!dry && !args.force && fs.existsSync(f)) fail(`${path.relative(root, f)} already exists (--force to replace)`)

// ------------------------------------------------------------------ capture + read the page
const capture = String(args.archive || url.href)
const extraHide = typeof args.hide === 'string' ? args.hide : ''
const browser = await puppeteer.launch(LAUNCH)
let page$
try {
  const page = await browser.newPage()
  await page.setUserAgent(UA)
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 })
  const res = await page.goto(capture, { waitUntil: 'networkidle2', timeout: 90000 }).catch(() => null)
  await new Promise(r => setTimeout(r, 2500))
  await page.addStyleTag({ content: `::-webkit-scrollbar{display:none}${hideCss(extraHide)}` })
  // walk the page so lazy images and reveal animations have run, then back to the hero
  const h = await page.evaluate(() => document.documentElement.scrollHeight)
  for (let y = 0; y < Math.min(h, 4000); y += 400) {
    await page.evaluate(v => window.scrollTo({ top: v, behavior: 'instant' }), y)
    await new Promise(r => setTimeout(r, 150))
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await new Promise(r => setTimeout(r, 1500))
  await page.screenshot({ path: path.join(tmp, 'shot.png') })
  page$ = await page.evaluate(() => {
    const meta = n => document.querySelector(`meta[name="${n}"], meta[property="${n}"]`)?.getAttribute('content')?.trim() ?? ''
    const html = document.documentElement.outerHTML
    return {
      status: 0,
      title: document.title.trim(),
      siteName: meta('og:site_name'),
      desc: meta('description') || meta('og:description'),
      text: document.body?.innerText.slice(0, 20000) ?? '',
      // where the page's own links go (a theme can load WooCommerce without a shop)
      links: [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href') ?? '').join(' '),
      html: html.length > 2e6 ? html.slice(0, 2e6) : html,
    }
  })
  page$.status = res?.status() ?? 0
} finally {
  await Promise.race([browser.close(), new Promise(r => setTimeout(r, 3000))])
}
if (page$.status >= 400) console.warn(`! ${capture} answered HTTP ${page$.status}: check the screenshot`)
if (/just a moment|attention required|access denied/i.test(page$.title)) fail(`${capture} served a bot check ("${page$.title}"); nothing written`)

const cwebp = fs.existsSync('/opt/homebrew/bin/cwebp') ? '/opt/homebrew/bin/cwebp' : 'cwebp'
execFileSync(cwebp, ['-quiet', '-q', '80', path.join(tmp, 'shot.png'), '-o', path.join(out, `${id}.webp`)])
execFileSync(cwebp, ['-quiet', '-q', '80', '-resize', '640', '0', path.join(out, `${id}.webp`), '-o', path.join(out, '640', `${id}.webp`)])

// ------------------------------------------------------------------ the entry
const curly = s => s.replace(/(\w)'(\w)/g, '$1’$2').replace(/'/g, '’')
const drafted = []
let name = typeof args.name === 'string' ? args.name.trim() : ''
if (!name) {
  name = page$.siteName || page$.title.split(/\s+[|–—·:-]\s+/)[0] || host
  drafted.push('name')
}
let blurb = typeof args.blurb === 'string' ? args.blurb.trim() : ''
if (!blurb) {
  const first = (page$.desc.match(/^.*?[.!?](\s|$)/)?.[0] ?? page$.desc).trim().replace(/!$/, '.')
  blurb = first.length > 20 ? first : ''
  drafted.push('blurb')
}
const VOCAB = ['Web Design', 'Ecommerce', 'Online Ordering', 'Booking', 'Donations', 'IDX Search', 'Software', 'Events']
let tags
if (typeof args.tags === 'string') {
  tags = ['Web Design', ...args.tags.split(',').map(t => t.trim()).filter(Boolean)]
} else {
  const h = page$.html
  const t = page$.text
  const seen = {
    Ecommerce: /add to cart|view cart|shop now/i.test(t) || /\/(cart|shop|checkout|products?|collections)(\/|\b)/i.test(page$.links),
    'Online Ordering': /order online|online ordering|toasttab\.com|chownow|pdqonlineordering|slicelife|clover\.com\/online/i.test(h + t),
    Booking: /book (now|online|an appointment|a table)|reservations|opentable|resy\.com|calendly\.com|acuityscheduling|tee times/i.test(h + t),
    Donations: /\bdonate\b|givebutter|zeffy\.com|paypal\.com\/donate/i.test(h + t),
    'IDX Search': /\bidx\b|ihomefinder|showcaseidx|mls search/i.test(h),
    Events: /tribe-events|hark-wp-events|eventbrite\.com|events calendar/i.test(h),
  }
  tags = ['Web Design', ...Object.keys(seen).filter(k => seen[k])]
  drafted.push('tags')
}
tags = [...new Set(tags)].sort((a, b) => (VOCAB.indexOf(a) + 99) % 99 - (VOCAB.indexOf(b) + 99) % 99)
const off = tags.filter(t => !VOCAB.includes(t))
if (off.length) console.warn(`! tags outside the usual vocabulary: ${off.join(', ')}`)
name = curly(name)
blurb = curly(blurb)
if (blurb && (blurb.length < 55 || blurb.length > 90)) console.warn(`! blurb is ${blurb.length} characters (house style ~64–79)`)
const q = s => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
const credit = /hark\.digital/i.test(page$.html)

const entry = [
  ...(drafted.length ? [`  // add-site drafted the ${drafted.join(', ')} from the page: check before committing`] : []),
  ...(args.archive ? [`  // the site was down when added: its still and video are from ${args.archive}`] : []),
  '  {',
  `    id: ${q(id)},`,
  `    name: ${q(name)},`,
  `    url: ${q(url.href)},`,
  `    industry: ${q(industry)},`,
  `    blurb: ${q(blurb || 'TODO: one factual sentence')},`,
  `    tags: [${tags.map(q).join(', ')}],`,
  '    featured: false,',
  '  },',
].join('\n')

// ------------------------------------------------------------------ video, then content.ts
if (!args['no-video']) {
  execFileSync(
    process.execPath,
    ['scripts/work-video.mjs', `--id=${id}`, `--url=${capture}`, ...(extraHide ? [`--hide=${extraHide}`] : [])],
    { cwd: root, stdio: 'inherit' },
  )
  if (dry) fs.renameSync(path.join(root, 'public', 'work', 'video', `${id}.mp4`), path.join(out, `${id}.mp4`))
}

if (!dry && !known) {
  const start = content.indexOf('export const PORTFOLIO_MORE')
  const end = start < 0 ? -1 : content.indexOf('\n]', start)
  if (end < 0) fail('could not find the end of PORTFOLIO_MORE in src/content.ts')
  fs.writeFileSync(contentPath, `${content.slice(0, end)}\n${entry}${content.slice(end)}`)
}

console.log(`
${dry ? 'DRY RUN: nothing in the repo changed' : `added ${id}${known ? ' (re-shot; its content.ts entry is unchanged)' : ''}`}
  still   ${dry ? path.join(out, `${id}.webp`) : `public/work/${id}.webp`} (+ 640 copy)${args['no-video'] ? '' : `\n  video   ${dry ? path.join(out, `${id}.mp4`) : `public/work/video/${id}.mp4`}`}
  Hark credit on the page: ${credit ? 'yes' : 'no'}

${entry}
${drafted.length ? `\n! drafted from the page: ${drafted.join(', ')}. Read them (and the screenshot) before committing.` : ''}${blurb ? '' : '\n! no description on the page: write the blurb in src/content.ts.'}
Next: look at the still, then npm run build.`)
