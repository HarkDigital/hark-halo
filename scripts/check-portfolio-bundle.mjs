// The Portfolio must not pull in three.js (spec: no WebGL on that page).
// From the scripts and modulepreloads in <dist>/portfolio/index.html, follow
// every static and dynamic import recursively; no reached file may contain
// WebGLRenderer or three.module.
//   node scripts/check-portfolio-bundle.mjs [distDir]   (default: dist)
import fs from 'node:fs'
import path from 'node:path'

const dist = path.resolve(process.argv[2] ?? 'dist')
const html = fs.readFileSync(path.join(dist, 'portfolio', 'index.html'), 'utf8')
// a URL in the page is <base>assets/x.js: find it under dist by its assets/… tail
const local = url => {
  const m = url.match(/(assets\/[^"'?#]+\.js)/)
  return m ? path.join(dist, m[1]) : null
}
const queue = [...html.matchAll(/<script[^>]+src="([^"]+)"|<link[^>]+rel="modulepreload"[^>]+href="([^"]+)"/g)].map(m => local(m[1] ?? m[2])).filter(Boolean)
const seen = new Set()
const bad = []
while (queue.length) {
  const file = queue.shift()
  if (seen.has(file)) continue
  seen.add(file)
  const src = fs.readFileSync(file, 'utf8')
  if (/WebGLRenderer|three\.module/.test(src)) bad.push(path.relative(dist, file))
  const dir = path.dirname(file)
  // static imports, re-exports, dynamic import("…"), and Vite's preload dependency lists
  const specs = [
    ...src.matchAll(/(?:import|export)\s*(?:[\w*{}\s,$]+from\s*)?["']([^"']+\.js)["']/g),
    ...src.matchAll(/import\(\s*["']([^"']+\.js)["']\s*\)/g),
  ].map(m => m[1])
  for (const s of specs) queue.push(s.startsWith('.') ? path.resolve(dir, s) : local(s))
  for (const m of src.matchAll(/["'](assets\/[^"']+\.js)["']/g)) queue.push(path.join(dist, m[1]))
}
const files = [...seen].map(f => path.relative(dist, f))
console.log(`portfolio reaches ${files.length} files:\n  ${files.join('\n  ')}`)
if (bad.length) {
  console.error(`FAIL: three.js reached from the portfolio via ${bad.join(', ')}`)
  process.exit(1)
}
console.log('OK: no three.js')
