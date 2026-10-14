// Headless screenshots of the service pages' "By the numbers" bands (src/service/stat).
//
//   node scripts/stat-shot.mjs [--slugs=all|custom-crm,seo-geo] [--port=5179] [--out=shots/stat]
//                              [--w=1440] [--h=900] [--mobile] [--tablet] [--seek=1.2]
//                              [--page] [--tag=name] [--lights=3]
//
// Each band is captured at rest (?settled) unless --seek=<seconds> draws it that long after
// its trigger (window.__statSeek, dev only). --page captures the whole viewport with the
// band scrolled to its centre instead of the band alone. Images land in
// <out>/<tag?><slug>[-m|-t][-s<seek>].png. Console errors are printed, and the process
// exits 1 if any were seen. Requires a dev server (the no-HMR one is best:
// npx vite --config vite.shots.config.ts --port 5179 --strictPort).
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const SLUGS = [
  'software-development',
  'custom-crm',
  'web-design',
  'ecommerce',
  'seo-geo',
  'page-speed',
  'ai-consulting',
  'company-knowledge-ai',
  'aerial-media',
  'hack-remediation',
  'security',
  'ada-accessibility',
  'wordpress',
]
const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, ...v] = a.replace(/^--/, '').split('=')
    return [k, v.length ? v.join('=') : true]
  }),
)
const port = args.port ?? 5179
const out = args.out ?? 'shots/stat'
const mobile = !!args.mobile
const tablet = !!args.tablet
const W = parseInt(args.w ?? (mobile ? 390 : tablet ? 768 : 1440), 10)
const H = parseInt(args.h ?? (mobile ? 844 : tablet ? 1024 : 900), 10)
const seek = args.seek !== undefined ? parseFloat(args.seek) : null
const slugs = !args.slugs || args.slugs === 'all' ? SLUGS : String(args.slugs).split(',')
const suffix = `${mobile ? '-m' : tablet ? '-t' : ''}${seek !== null ? `-s${seek}` : ''}`
const tag = args.tag ? `${args.tag}-` : ''
fs.mkdirSync(out, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--hide-scrollbars', '--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=metal', '--enable-gpu-rasterization'],
})
const errors = []
try {
  const page = await browser.newPage()
  if (mobile) {
    await page.emulate({
      viewport: { width: W, height: H, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    })
  } else {
    await page.setViewport({ width: W, height: H, deviceScaleFactor: tablet ? 2 : 1 })
  }
  // the clock picture reads a fixed instant (dev only), so its frames repeat
  await page.evaluateOnNewDocument(() => {
    window.__statClock = new Date(2026, 9, 14, 16, 52, 40).getTime()
  })
  page.on('console', m => {
    if (m.type() === 'error') {
      errors.push(m.text())
      console.log(`[page error] ${m.text()}`)
    }
  })
  page.on('pageerror', e => {
    errors.push(String(e))
    console.log(`[pageerror] ${e}`)
  })

  for (const slug of slugs) {
    const q = new URLSearchParams({ autopilot: '1' })
    if (seek === null) q.set('settled', '1')
    if (args.lights) q.set('lights', String(args.lights))
    await page.goto(`http://localhost:${port}/services/${slug}/?${q}`, { waitUntil: 'load', timeout: 90000 })
    await page.waitForSelector('.svc-stat .vz', { timeout: 30000 })
    await page.evaluate(() => document.fonts?.ready)
    // the band to the centre of the screen (its own trigger fires here; ?settled rests it)
    await page.evaluate(() => {
      const s = document.querySelector('.svc-stat')
      s.scrollIntoView({ block: 'center', behavior: 'instant' })
    })
    await new Promise(r => setTimeout(r, 600))
    if (seek !== null) {
      await page.evaluate(s => window.__statSeek(s), seek)
      await new Promise(r => setTimeout(r, 250))
    } else {
      await new Promise(r => setTimeout(r, 900))
    }
    const file = path.join(out, `${tag}${slug}${suffix}.png`)
    if (args.page) {
      await page.screenshot({ path: file })
    } else {
      const band = await page.$('.svc-stat')
      await band.screenshot({ path: file })
    }
    const r = await page.evaluate(() => {
      const b = document.querySelector('.svc-stat').getBoundingClientRect()
      const v = document.querySelector('.svc-stat .vz').getBoundingClientRect()
      return `band ${Math.round(b.width)}x${Math.round(b.height)}, picture ${Math.round(v.width)}x${Math.round(v.height)}, page scrollWidth ${document.documentElement.scrollWidth}`
    })
    console.log(`saved ${file}  (${r})`)
  }
} finally {
  await Promise.race([browser.close(), new Promise(r => setTimeout(r, 3000))])
}
if (errors.length) console.log(`\n${errors.length} console error(s)`)
process.exit(errors.length ? 1 : 0)
