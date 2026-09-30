import { defineConfig, type Plugin } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import { SERVICE_PAGES } from './src/service/data/pages'
import { SERVICE_CONTENT } from './src/service/data/content'
import { WORK } from './src/content'
import { featuredSlot, portfolioDescription, screenSizes } from './src/kit/work'

/** where the concept is served (og:url etc.); the path part comes from --base */
const ORIGIN = 'https://harkdigital.github.io'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

/**
 * The service pages: ONE html entry (service.html, src/service/main.ts)
 * served at <base>services/<slug>/.
 *   dev / shots  /services/<slug>/ is rewritten to /service.html
 *   build        dist/services/<slug>/index.html per service, each with its
 *                own title, description and og tags; dist/service.html goes
 */
function servicePages(): Plugin {
  let outDir = 'dist'
  let base = '/'
  let build = false
  const rewrite = (req: { url?: string }, _res: unknown, next: () => void) => {
    const m = (req.url ?? '').match(/^\/services\/([a-z0-9-]+)\/?(\?.*)?$/)
    if (m) req.url = `/service.html${m[2] ?? ''}`
    next()
  }
  return {
    name: 'hark-service-pages',
    configResolved(c) {
      outDir = path.resolve(c.root, c.build.outDir)
      base = c.base
      build = c.command === 'build'
    },
    configureServer(server) {
      server.middlewares.use(rewrite)
    },
    closeBundle() {
      if (!build) return
      const src = path.join(outDir, 'service.html')
      if (!fs.existsSync(src)) return
      const html = fs.readFileSync(src, 'utf8')
      for (const p of SERVICE_PAGES) {
        const title = `${p.title} · Hark Digital`
        const desc = SERVICE_CONTENT[p.slug]?.metaDescription ?? p.lede
        const url = `${ORIGIN}${base}services/${p.slug}/`
        // (replacer functions, not strings: copy like "$1M" must go in as written, not as a $1 backreference)
        const page = html
          .replace(/<title>[^<]*<\/title>/, () => `<title>${esc(title)}</title>`)
          .replace(/(<meta\s+name="description"\s+content=")[^"]*"/, (_, open) => `${open}${esc(desc)}"`)
          .replace(/(<meta\s+property="og:url"\s+content=")[^"]*"/, (_, open) => `${open}${esc(url)}"`)
          .replace(/(<meta\s+property="og:title"\s+content=")[^"]*"/, (_, open) => `${open}${esc(title)}"`)
          .replace(/(<meta\s+property="og:description"\s+content=")[^"]*"/, (_, open) => `${open}${esc(desc)}"`)
        const dir = path.join(outDir, 'services', p.slug)
        fs.mkdirSync(dir, { recursive: true })
        fs.writeFileSync(path.join(dir, 'index.html'), page)
      }
      fs.rmSync(src)
    },
  }
}

/**
 * The Portfolio page: portfolio.html (src/portfolio/main.ts) served at <base>portfolio/.
 *   dev / shots  /portfolio/ (and /portfolio, with any query) is rewritten to /portfolio.html
 *   virtual:work-thumbs  the ids with a half-size screenshot (public/work/640/<id>.webp)
 *   build        dist/portfolio/index.html, its description generated from WORK, og:url
 *                for --base, and the lead screenshot preloaded; dist/portfolio.html goes
 * A WORK id without its screenshots is a build warning (the page shows its name card).
 */
function portfolioPage(): Plugin {
  const VIRTUAL = 'virtual:work-thumbs'
  let root = process.cwd()
  let outDir = 'dist'
  let base = '/'
  let build = false
  const pub = (...p: string[]) => path.join(root, 'public', 'work', ...p)
  const thumbs = () => {
    try {
      return fs
        .readdirSync(pub('640'))
        .filter(f => f.endsWith('.webp'))
        .map(f => f.slice(0, -5))
    } catch {
      return []
    }
  }
  /** the lead screenshot (the first featured site), asked for at high priority before any script runs */
  const preload = () => {
    const featured = WORK.filter(w => w.featured)
    const lead = featured[0]
    if (!lead) return ''
    const full = `${base}work/${lead.id}.webp`
    const set = fs.existsSync(pub('640', `${lead.id}.webp`))
      ? ` imagesrcset="${esc(`${base}work/640/${lead.id}.webp 640w, ${full} 1280w`)}" imagesizes="${esc(screenSizes({ featured: true, ...featuredSlot(0, featured.length) }))}"`
      : ''
    return `<link rel="preload" as="image" href="${esc(full)}"${set} fetchpriority="high">`
  }
  const rewrite = (req: { url?: string }, _res: unknown, next: () => void) => {
    const m = (req.url ?? '').match(/^\/portfolio\/?(\?.*)?$/)
    if (m) req.url = `/portfolio.html${m[1] ?? ''}`
    next()
  }
  return {
    name: 'hark-portfolio-page',
    configResolved(c) {
      root = c.root
      outDir = path.resolve(c.root, c.build.outDir)
      base = c.base
      build = c.command === 'build'
    },
    configureServer(server) {
      server.middlewares.use(rewrite)
    },
    resolveId(id) {
      if (id === VIRTUAL) return `\0${VIRTUAL}`
    },
    load(id) {
      if (id === `\0${VIRTUAL}`) return `export const THUMBS = ${JSON.stringify(thumbs())}`
    },
    buildStart() {
      const have = new Set(thumbs())
      for (const w of WORK) {
        if (!fs.existsSync(pub(`${w.id}.webp`))) this.warn(`[portfolio] ${w.id}: no public/work/${w.id}.webp (it shows its name card)`)
        if (!have.has(w.id)) this.warn(`[portfolio] ${w.id}: no public/work/640/${w.id}.webp (npm run thumbs)`)
      }
    },
    // dev: the same preload the build writes, so the lead screen arrives the same way
    transformIndexHtml(html, ctx) {
      if (build || !ctx.filename.endsWith('portfolio.html')) return
      const tag = preload()
      return tag ? html.replace('</head>', () => `    ${tag}\n  </head>`) : html
    },
    closeBundle() {
      if (!build) return
      const src = path.join(outDir, 'portfolio.html')
      if (!fs.existsSync(src)) return
      const desc = portfolioDescription()
      const url = `${ORIGIN}${base}portfolio/`
      const tag = preload()
      // (replacer functions, not strings: copy like "$1M" must go in as written, not as a $1 backreference)
      const page = fs
        .readFileSync(src, 'utf8')
        .replace(/(<meta\s+name="description"\s+content=")[^"]*"/, (_, open) => `${open}${esc(desc)}"`)
        .replace(/(<meta\s+property="og:url"\s+content=")[^"]*"/, (_, open) => `${open}${esc(url)}"`)
        .replace(/(<meta\s+property="og:description"\s+content=")[^"]*"/, (_, open) => `${open}${esc(desc)}"`)
        .replace('</head>', () => (tag ? `  ${tag}\n  </head>` : '</head>'))
      const dir = path.join(outDir, 'portfolio')
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(path.join(dir, 'index.html'), page)
      fs.rmSync(src)
    },
  }
}

// GitHub Pages serves from /<repo>/ — CI passes --base=/<repo>/.
export default defineConfig({
  server: { host: true },
  plugins: [servicePages(), portfolioPage()],
  build: {
    // Safari 15/16.3 can't parse class static blocks (three r186) — lower them
    target: ['es2020', 'safari15', 'chrome100', 'firefox100'],
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      input: { main: 'index.html', service: 'service.html', portfolio: 'portfolio.html' },
    },
  },
})
