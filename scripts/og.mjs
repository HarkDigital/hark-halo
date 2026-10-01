// The share image (og:image for the story, every service page and the
// portfolio): public/og.jpg, 1200×630, shot from the hero at rest.
//
//   npm run og
//
// Starts its own dev server, shoots hero:0 with scripts/shot.mjs, saves it as
// a quality-60 JPEG (~70 KB) with sips (macOS), and stops the server. Re-run
// whenever the hero's look or copy changes, look at the result, then commit
// public/og.jpg; CI never runs this.
import { createServer } from 'vite'
import { execFile, execFileSync } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const png = path.join(root, 'shots', 'og-hero-0.00.png')
const jpg = path.join(root, 'public', 'og.jpg')

const server = await createServer({ root, logLevel: 'error', server: { port: 5199, strictPort: false, host: 'localhost' } })
await server.listen()
const port = server.httpServer.address().port
try {
  fs.rmSync(png, { force: true })
  // async: the dev server lives in this process and must keep answering.
  // (shot.mjs exits 1 on page console errors: that fails this run too)
  const shot = await promisify(execFile)(
    process.execPath,
    ['scripts/shot.mjs', '--frames=hero:0', '--w=1200', '--h=630', `--port=${port}`, '--out=shots', '--tag=og'],
    { cwd: root },
  )
  process.stdout.write(shot.stdout)
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '60', png, '--out', jpg], { stdio: 'ignore' })
  console.log(`og     public/og.jpg (${Math.round(fs.statSync(jpg).size / 1024)} KB) — look at it before committing`)
} finally {
  await server.close()
}
