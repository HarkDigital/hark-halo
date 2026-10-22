import { defineConfig, type Plugin } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import { SERVICE_PAGES } from './src/service/data/pages'
import { SERVICE_CONTENT } from './src/service/data/content'
import { PORTFOLIO_WORK, portfolioDescription, portfolioSplit, screenSizes } from './src/kit/work'
import { CONTACT_FORM, INDUSTRIES, INDUSTRIES_PAGE, TERMS } from './src/content'
import { INDUSTRY_PAGES } from './src/industry/data/index'
import { termsStaticHtml } from './src/terms/render'

/** where the concept is served (og:url etc.); the path part comes from --base */
const ORIGIN = 'https://harkdigital.github.io'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

interface StaticPage {
  /** the path under <base>, no slashes around it: 'services/page-speed', 'industries', 'lab' */
  dir: string
  /** replaced in the shell's head when given (og:url always: <ORIGIN><base><dir>/) */
  title?: string
  description?: string
}

/**
 * Pages served from ONE html shell: the service pages (service.html, src/service/main.ts, at
 * <base>services/<slug>/), the industry pages and their index (industry.html,
 * src/industry/main.ts, at <base>industries/ and <base>industries/<slug>/) and the lab
 * (lab.html, <base>lab/, linked from nowhere, noindex in its own head).
 *   dev / shots  a path `isPage` accepts (query stripped) is rewritten to /<shell>
 *   build        dist/<dir>/index.html per page, each with its own title, description and
 *                og tags where given, and og:url always; dist/<shell> goes
 */
function staticPages(o: { name: string; shell: string; isPage: (path: string) => boolean; pages: () => StaticPage[]; check?: (warn: (msg: string) => void) => void }): Plugin {
  let outDir = 'dist'
  let base = '/'
  let build = false
  const rewrite = (req: { url?: string }, _res: unknown, next: () => void) => {
    const m = (req.url ?? '').match(/^([^?]*)(\?.*)?$/)
    if (m && o.isPage(m[1])) req.url = `/${o.shell}${m[2] ?? ''}`
    next()
  }
  return {
    name: o.name,
    configResolved(c) {
      outDir = path.resolve(c.root, c.build.outDir)
      base = c.base
      build = c.command === 'build'
    },
    configureServer(server) {
      server.middlewares.use(rewrite)
    },
    buildStart() {
      o.check?.(msg => this.warn(msg))
    },
    closeBundle() {
      if (!build) return
      const src = path.join(outDir, o.shell)
      if (!fs.existsSync(src)) return
      const html = fs.readFileSync(src, 'utf8')
      for (const p of o.pages()) {
        const url = `${ORIGIN}${base}${p.dir}/`
        // (replacer functions, not strings: copy like "$1M" must go in as written, not as a $1 backreference)
        let page = html.replace(/(<meta\s+property="og:url"\s+content=")[^"]*"/, (_, open) => `${open}${esc(url)}"`)
        if (p.title !== undefined) {
          const title = p.title
          page = page
            .replace(/<title>[^<]*<\/title>/, () => `<title>${esc(title)}</title>`)
            .replace(/(<meta\s+property="og:title"\s+content=")[^"]*"/, (_, open) => `${open}${esc(title)}"`)
        }
        if (p.description !== undefined) {
          const desc = p.description
          page = page
            .replace(/(<meta\s+name="description"\s+content=")[^"]*"/, (_, open) => `${open}${esc(desc)}"`)
            .replace(/(<meta\s+property="og:description"\s+content=")[^"]*"/, (_, open) => `${open}${esc(desc)}"`)
        }
        const dir = path.join(outDir, ...p.dir.split('/'))
        fs.mkdirSync(dir, { recursive: true })
        fs.writeFileSync(path.join(dir, 'index.html'), page)
      }
      fs.rmSync(src)
    },
  }
}

const servicePages = () =>
  staticPages({
    name: 'hark-service-pages',
    shell: 'service.html',
    isPage: p => /^\/services\/[a-z0-9-]+\/?$/.test(p),
    pages: () =>
      SERVICE_PAGES.map(p => ({ dir: `services/${p.slug}`, title: `${p.title} · Hark Digital`, description: SERVICE_CONTENT[p.slug]?.metaDescription ?? p.lede })),
  })

const industryPages = () =>
  staticPages({
    name: 'hark-industry-pages',
    shell: 'industry.html',
    isPage: p => /^\/industries(\/[a-z0-9-]+)?\/?$/.test(p),
    pages: () => [
      { dir: 'industries', title: 'Industries · Hark Digital', description: INDUSTRIES_PAGE.description },
      ...INDUSTRIES.map(i => ({ dir: `industries/${i.slug}`, title: `${i.title} · Hark Digital`, description: INDUSTRY_PAGES[i.slug]?.metaDescription })),
    ],
    // the data's cross-references: a page per industry, and every id it names is real
    check: warn => {
      const sites = new Set(PORTFOLIO_WORK.map(w => w.id))
      const services = new Set(SERVICE_PAGES.map(p => p.slug))
      for (const i of INDUSTRIES) {
        const page = INDUSTRY_PAGES[i.slug]
        if (!page) {
          warn(`[industries] ${i.slug}: no page in src/industry/data (it is in INDUSTRIES)`)
          continue
        }
        for (const id of page.clients) if (!sites.has(id)) warn(`[industries] ${i.slug}: client "${id}" is not on the Portfolio (PORTFOLIO_WORK)`)
        for (const s of page.services) if (!services.has(s)) warn(`[industries] ${i.slug}: service "${s}" is not a service page`)
        if (page.formService && !CONTACT_FORM.services.includes(page.formService)) warn(`[industries] ${i.slug}: formService "${page.formService}" is not in CONTACT_FORM.services`)
      }
      for (const slug of Object.keys(INDUSTRY_PAGES)) if (!INDUSTRIES.some(i => i.slug === slug)) warn(`[industries] ${slug}: a page with no INDUSTRIES entry (content.ts)`)
    },
  })

const labPage = () => staticPages({ name: 'hark-lab-page', shell: 'lab.html', isPage: p => /^\/lab\/?$/.test(p), pages: () => [{ dir: 'lab' }] })

/**
 * The Portfolio page: portfolio.html (src/portfolio/main.ts) served at <base>portfolio/.
 *   dev / shots  /portfolio/ (and /portfolio, with any query) is rewritten to /portfolio.html
 *   virtual:work-thumbs  the ids with a half-size screenshot (public/work/640/<id>.webp)
 *   virtual:work-videos  the ids with a preview video (public/work/video/<id>.mp4, made by
 *                scripts/work-video.mjs): only those tiles ever make a <video> (portfolio/preview.ts);
 *                in dev it follows videos added or removed (the next page load sees them)
 *   build        dist/portfolio/index.html, its description generated from its client
 *                sites (kit/work.ts portfolioDescription), og:url for --base, and the lead
 *                screenshot preloaded; dist/portfolio.html goes
 * Any site on the page (WORK, PORTFOLIO_MORE: kit/work.ts PORTFOLIO_WORK) without its
 * screenshots is a build warning (the page shows its name card), as is one without its
 * preview video (its tile keeps its still screenshot).
 */
function portfolioPage(): Plugin {
  const VIRTUAL = 'virtual:work-thumbs'
  const VIDEOS = 'virtual:work-videos'
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
  /** ids with a preview video (an empty file, one still being written, is left out) */
  const videos = () => {
    try {
      return fs
        .readdirSync(pub('video'))
        .filter(f => f.endsWith('.mp4') && fs.statSync(pub('video', f)).size > 0)
        .map(f => f.slice(0, -4))
    } catch {
      return []
    }
  }
  /** the lead screenshot (the first prominent site), asked for at high priority before any script runs */
  const preload = () => {
    const lead = portfolioSplit(PORTFOLIO_WORK).lead[0]
    if (!lead) return ''
    const full = `${base}work/${lead.id}.webp`
    const set = fs.existsSync(pub('640', `${lead.id}.webp`))
      ? ` imagesrcset="${esc(`${base}work/640/${lead.id}.webp 640w, ${full} 1280w`)}" imagesizes="${esc(screenSizes({ featured: true }))}"`
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
      // a video added (or removed) while the server runs: the list is made again on the next load
      // (no reload of its own: a page open in the browser carries on with the list it has)
      const dir = pub('video')
      const stale = (file: string) => {
        if (path.dirname(file) !== dir || !file.endsWith('.mp4')) return
        const mod = server.moduleGraph.getModuleById(`\0${VIDEOS}`)
        if (mod) server.moduleGraph.invalidateModule(mod)
      }
      server.watcher.add(dir)
      server.watcher.on('add', stale)
      server.watcher.on('change', stale)
      server.watcher.on('unlink', stale)
    },
    resolveId(id) {
      if (id === VIRTUAL) return `\0${VIRTUAL}`
      if (id === VIDEOS) return `\0${VIDEOS}`
    },
    load(id) {
      if (id === `\0${VIRTUAL}`) return `export const THUMBS = ${JSON.stringify(thumbs())}`
      if (id === `\0${VIDEOS}`) return `export const VIDEOS = ${JSON.stringify(videos())}`
    },
    buildStart() {
      const have = new Set(thumbs())
      const clips = new Set(videos())
      for (const w of PORTFOLIO_WORK) {
        if (!fs.existsSync(pub(`${w.id}.webp`))) this.warn(`[portfolio] ${w.id}: no public/work/${w.id}.webp (it shows its name card)`)
        if (!have.has(w.id)) this.warn(`[portfolio] ${w.id}: no public/work/640/${w.id}.webp (npm run thumbs)`)
        if (!clips.has(w.id)) this.warn(`[portfolio] ${w.id}: no public/work/video/${w.id}.mp4 (it keeps its still screenshot; node scripts/work-video.mjs --id=${w.id} --url=${w.url})`)
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

/**
 * The terms page: terms.html (src/terms/main.ts) served at <base>terms/.
 *   dev / shots  /terms/ (and /terms, with any query) is rewritten to /terms.html
 *   both         its title and description from content.ts TERMS, and the whole of the
 *                terms as static HTML in its <noscript> (src/terms/render.ts)
 *   build        dist/terms/index.html with og:url for --base; dist/terms.html goes
 */
function termsPage(): Plugin {
  let outDir = 'dist'
  let base = '/'
  let build = false
  const rewrite = (req: { url?: string }, _res: unknown, next: () => void) => {
    const m = (req.url ?? '').match(/^\/terms\/?(\?.*)?$/)
    if (m) req.url = `/terms.html${m[1] ?? ''}`
    next()
  }
  return {
    name: 'hark-terms-page',
    configResolved(c) {
      outDir = path.resolve(c.root, c.build.outDir)
      base = c.base
      build = c.command === 'build'
    },
    configureServer(server) {
      server.middlewares.use(rewrite)
    },
    transformIndexHtml(html, ctx) {
      if (!ctx.filename.endsWith('terms.html')) return
      // (replacer functions, not strings: copy like "$1M" must go in as written, not as a $1 backreference)
      return html
        .replace(/<title>[^<]*<\/title>/, () => `<title>${esc(TERMS.title)}</title>`)
        .replace(/(<meta\s+name="description"\s+content=")[^"]*"/, (_, open) => `${open}${esc(TERMS.description)}"`)
        .replace(/(<meta\s+property="og:title"\s+content=")[^"]*"/, (_, open) => `${open}${esc(TERMS.title)}"`)
        .replace(/(<meta\s+property="og:description"\s+content=")[^"]*"/, (_, open) => `${open}${esc(TERMS.description)}"`)
        .replace(/<noscript>[\s\S]*?<\/noscript>/, () => `<noscript>\n      <div style="max-width:42rem;padding:2rem;font-family:sans-serif;line-height:1.6">${termsStaticHtml()}</div>\n    </noscript>`)
    },
    closeBundle() {
      if (!build) return
      const src = path.join(outDir, 'terms.html')
      if (!fs.existsSync(src)) return
      const url = `${ORIGIN}${base}terms/`
      const page = fs.readFileSync(src, 'utf8').replace(/(<meta\s+property="og:url"\s+content=")[^"]*"/, (_, open) => `${open}${esc(url)}"`)
      const dir = path.join(outDir, 'terms')
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(path.join(dir, 'index.html'), page)
      fs.rmSync(src)
    },
  }
}

// GitHub Pages serves from /<repo>/ — CI passes --base=/<repo>/.
export default defineConfig({
  server: { host: true },
  plugins: [servicePages(), industryPages(), portfolioPage(), termsPage(), labPage()],
  build: {
    // Safari 15/16.3 can't parse class static blocks (three r186) — lower them
    target: ['es2020', 'safari15', 'chrome100', 'firefox100'],
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      input: { main: 'index.html', service: 'service.html', industry: 'industry.html', portfolio: 'portfolio.html', terms: 'terms.html', lab: 'lab.html' },
      // three.js (~180 KB gzipped, most of the story's JS) in a file of its own:
      // it only changes when three is upgraded, so a deploy doesn't make every
      // returning visitor download it again
      output: {
        codeSplitting: { groups: [{ name: 'three', test: /node_modules[\\/]three[\\/]/ }] },
      },
    },
  },
})
