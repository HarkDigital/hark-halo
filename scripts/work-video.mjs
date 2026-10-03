// A portfolio site's preview video: a smooth scroll down its homepage.
//
//   node scripts/work-video.mjs --id=jomar --url=https://jomarcorp.com/ [--hide=".cookie,#popup"]
//                               [--w=1600] [--travel=3500] [--scrub[=tile]] [--scrub-only] [--keep]
//
// Records --w × 0.625·w frames (default 1280×800) while scrolling the real page (fixed headers stay
// put, vh units stay true): a 0.8 s hold on the hero, an eased scroll of up to
// --travel px over 5.4 s, a 0.8 s hold. Frames are taken at exact scroll
// positions, so the motion is even however long each capture takes. Encodes
// public/work/video/<id>.mp4 (800×500, 24 fps, H.264 CRF 31, no audio,
// faststart: ~500 KB). Common third-party overlays (lib/capture.mjs: cookie banners,
// chat, reCAPTCHA badges, accessibility toolbars, Popup Maker) are hidden by default;
// --hide adds CSS selectors for a site's own. Nothing on the page is ever
// clicked. --keep leaves the frames in /private/tmp/claude-501/work-video/<id>/.
import puppeteer from 'puppeteer-core'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { COLOR, LAUNCH, UA, hideCss } from './lib/capture.mjs'

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, ...v] = a.replace(/^--/, '').split('=')
    return [k, v.length ? v.join('=') : true]
  }),
)
if (!args.id || !args.url) throw new Error('usage: --id=<id> --url=<url>')
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const tmp = path.join('/private/tmp/claude-501/work-video', args.id)
const out = path.join(root, 'public', 'work', 'video', `${args.id}.mp4`)
const FPS = 24
const HOLD = 0.8
const MOVE = 5.4
// --w: viewport width (height 0.625 of it), to match how the site's still was shot
// (the first 15 stills were taken at 1600×1000, later ones at 1280×800)
const W = parseInt(args.w ?? '1280', 10)
const H = Math.round(W * 0.625)
const TRAVEL = parseInt(args.travel ?? String(Math.round((2800 * W) / 1280)), 10)
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

fs.rmSync(tmp, { recursive: true, force: true })
fs.mkdirSync(tmp, { recursive: true })
fs.mkdirSync(path.dirname(out), { recursive: true })

const browser = await puppeteer.launch(LAUNCH)
try {
  const page = await browser.newPage()
  await page.setUserAgent(UA)
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 })
  await page.goto(String(args.url), { waitUntil: 'networkidle2', timeout: 90000 }).catch(() => {})
  await new Promise(r => setTimeout(r, 2500))
  const hide = hideCss(typeof args.hide === 'string' ? args.hide : '')
  // instant scrolling (no smooth-scroll libraries or CSS easing in the way), no scrollbars, overlays gone
  await page.addStyleTag({ content: `html,body{scroll-behavior:auto!important}::-webkit-scrollbar{display:none}${hide}` })
  const height = await page.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight ?? 0))
  // walk the page once so lazy images and scroll-reveal animations have run, then back to the top
  for (let y = 0; y < Math.min(height, TRAVEL + 1600); y += 400) {
    await page.evaluate(v => window.scrollTo({ top: v, behavior: 'instant' }), y)
    await new Promise(r => setTimeout(r, 180))
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await new Promise(r => setTimeout(r, 1500))
  await page.addStyleTag({ content: hide })

  const travel = Math.max(0, Math.min(TRAVEL, height - H))
  const total = (HOLD * 2 + MOVE) * FPS
  for (let f = 0; f < total; f++) {
    const t = Math.min(1, Math.max(0, (f / FPS - HOLD) / MOVE))
    const y = Math.round(ease(t) * travel)
    await page.evaluate(v => window.scrollTo({ top: v, behavior: 'instant' }), y)
    await page.screenshot({ path: path.join(tmp, `f${String(f).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 92 })
  }
  console.log(`[${args.id}] page ${height}px, travel ${travel}px, ${total} frames`)
} finally {
  await Promise.race([browser.close(), new Promise(r => setTimeout(r, 3000))])
}

// (--scrub-only: the scrub copies alone, the portfolio's hover video left as it is)
if (!args['scrub-only']) {
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(tmp, 'f%04d.jpg'),
    '-vf', `scale=800:500:flags=lanczos:${COLOR}`, '-c:v', 'libx264', '-preset', 'slower', '-crf', '31',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', out,
  ])
  console.log(`[${args.id}] ${path.relative(root, out)} (${Math.round(fs.statSync(out).size / 1024)} KB)`)
}
// --scrub[=leaf|tile]: also copies for scroll-scrubbing (the story's Work carousel sets
// currentTime from the scroll), at the widths its still is drawn at: a featured leaf
// (default) 1280 on desktop and 800 on phones (scrub/m/), a halo tile 720 and 480. A
// keyframe every 12 frames (half a second): a seek decodes at most 11 frames, and at
// CRF 25 the scroll stays sharp (~2.5–4 MB for a desktop leaf). The home page's are
// recorded at less travel (--scrub-only; leaves --travel=1400, tiles 700; 1750 / 875 at
// --w=1600): the page's scroll plays the whole clip, so less travel is a slower screen.
if (args.scrub || args['scrub-only']) {
  const tile = args.scrub === 'tile'
  for (const [dir, sw] of [['scrub', tile ? 720 : 1280], ['scrub/m', tile ? 480 : 800]]) {
    const sh = Math.round(sw * 0.625)
    const scrub = path.join(root, 'public', 'work', 'video', dir, `${args.id}.mp4`)
    fs.mkdirSync(path.dirname(scrub), { recursive: true })
    execFileSync('ffmpeg', [
      '-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(tmp, 'f%04d.jpg'),
      '-vf', `scale=${sw}:${sh}:flags=lanczos:${COLOR}`, '-c:v', 'libx264', '-preset', 'slower', '-crf', '25',
      '-g', '12', '-keyint_min', '12', '-bf', '0', '-level', '3.2',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', scrub,
    ])
    console.log(`[${args.id}] ${path.relative(root, scrub)} (${Math.round(fs.statSync(scrub).size / 1024)} KB)`)
  }
}
if (!args.keep) fs.rmSync(tmp, { recursive: true, force: true })
