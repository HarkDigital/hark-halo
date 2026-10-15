// Headless screenshots of one fx drawing on the lab page (src/fx, src/lab).
//
//   node scripts/fx-shot.mjs --name=tube-draw [--t=3] [--port=5179] [--out=shots/fx]
//                            [--w=1440] [--h=900] [--mobile] [--mouse=0.6,0.4] [--down]
//
// Opens /lab/?only=<name> (one card), waits --t seconds, and captures the drawing's box.
// --mouse=x,y puts the pointer at that fraction of the box (else ?autopilot drives a
// synthetic cursor); --down holds the button. Console errors are printed and exit 1.
// Requires the no-HMR server: npx vite --config vite.shots.config.ts --port 5179 --strictPort
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, ...v] = a.replace(/^--/, '').split('=')
    return [k, v.length ? v.join('=') : true]
  }),
)
const name = args.name
if (!name) {
  console.error('--name=<fx name> is required')
  process.exit(2)
}
const port = args.port ?? 5179
const out = args.out ?? 'shots/fx'
const mobile = !!args.mobile
const W = parseInt(args.w ?? (mobile ? 390 : 1440), 10)
const H = parseInt(args.h ?? (mobile ? 844 : 900), 10)
const T = parseFloat(args.t ?? 3)
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
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 })
  }
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
  const q = new URLSearchParams({ only: String(name) })
  if (!args.mouse) q.set('autopilot', '1')
  await page.goto(`http://localhost:${port}/lab/?${q}`, { waitUntil: 'load', timeout: 90000 })
  await page.waitForSelector('.lab-fx', { timeout: 30000 })
  await page.evaluate(() => document.querySelector('.lab-fx').scrollIntoView({ block: 'center', behavior: 'instant' }))
  await page.waitForSelector('.lab-fx canvas', { timeout: 30000 })
  if (args.mouse) {
    const [fx, fy] = String(args.mouse).split(',').map(Number)
    const box = await (await page.$('.lab-fx')).boundingBox()
    await page.mouse.move(box.x + box.width * fx, box.y + box.height * fy, { steps: 6 })
    if (args.down) await page.mouse.down()
  }
  await new Promise(r => setTimeout(r, T * 1000))
  const el = await page.$('.lab-fx')
  const file = path.join(out, `${name}${mobile ? '-m' : ''}-${T}s${args.mouse ? '-mouse' : ''}${args.down ? '-down' : ''}.png`)
  await el.screenshot({ path: file })
  const fps = await page.evaluate(async () => {
    const times = []
    let last = performance.now()
    await new Promise(res => {
      let k = 0
      const step = now => {
        times.push(now - last)
        last = now
        if (++k < 60) requestAnimationFrame(step)
        else res()
      }
      requestAnimationFrame(step)
    })
    times.sort((a, b) => a - b)
    return { p50: +times[30].toFixed(1), p95: +times[57].toFixed(1) }
  })
  console.log(`saved ${file}  (frame ms p50 ${fps.p50}, p95 ${fps.p95})`)
} finally {
  await Promise.race([browser.close(), new Promise(r => setTimeout(r, 3000))])
}
if (errors.length) console.log(`\n${errors.length} console error(s)`)
process.exit(errors.length ? 1 : 0)
