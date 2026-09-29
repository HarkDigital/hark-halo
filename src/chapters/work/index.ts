import * as THREE from 'three'
import type { CameraPose, Chapter, ChapterContext, Frame } from '../../core/types'
import { el, reveal, rise, setRise } from '../../core/dom'
import { clamp, ease, lerp, smoothstep } from '../../core/math'
import { nextFrame } from '../../core/yield'
import { SECTIONS, WORK, workImage, type WorkItem } from '../../content'
import { G } from '../../kit/glass'
import { loadScreenshot, whenRevealed } from '../../kit/images'
import {
  HALO_N,
  HALO_R,
  HALO_RING_Y,
  HALO_STEP,
  HALO_Y,
  LEAF_H,
  LEAF_W,
  LEAF_Y0,
  NEON_C,
  R,
  RING_R,
  RING_Y,
  STEP,
  TILE_H,
  averageColor,
  buildCarousel,
  isPreview,
  type CarouselSet,
} from './scene'
import './work.css'

/*
 * CAROUSEL (Selected work) — a revolving glass showroom.
 *
 * Six tall leaves of curved glass stand in a circle on the black mirror
 * floor like the drum of a revolving door, round a ring of neon arcs (cyan,
 * violet, magenta). Scrolling turns the drum: the leaf that comes round to
 * face you CLEARS (its site razor sharp and backlit, a thin neon line lit
 * along its foot) while the leaves turned away stay frosted, their sites
 * diffused into soft colour and their feet glowing with the neon behind
 * them. A frosted card names the leaf in front. After the sixth, the ring
 * lifts through the drum and opens above it into a HALO: nine smaller tiles
 * hang on it and turn, one step per row of "Nine more, all live."
 *
 *   0.000–0.100  intro: "Built to be heard." — a high three-quarter view, the
 *                drum turning (headline settled from ~0.035)
 *   0.074–0.118  the camera comes down to eye level; leaf 01 arrives and clears
 *   0.100–0.760  six items (0.11 each): turn 0–30% of an item, card 26–97%;
 *                nav lands at 0.12 on leaf 01 with its card settled
 *   0.758–0.800  the ring lifts and opens into the halo; the camera cranes up
 *   0.800–0.955  "Nine more, all live." — the halo steps round with the rows
 *   0.955–1.000  out: pull back, everything frosts
 *
 * Everything derives from `local`; frame.time only drives the neon's faint
 * breathing and a slow sway of the halo (both off with reduced motion or
 * Motion off).
 */

const FEATURED = WORK.filter(w => w.featured)
const REST = WORK.filter(w => !w.featured)
const NF = FEATURED.length
const NR = REST.length

/* ---- timeline */
const INTRO_OUT = 0.097
const DESC_A = 0.072
const DESC_B = 0.118
const F0 = 0.1
const F1 = 0.76
const SPAN = (F1 - F0) / NF
const TRAVEL = 0.3
const RISE_A = 0.756
const RISE_B = 0.8
const ROW0 = 0.806
const ROW1 = 0.946
const LIST_OUT = 0.955
const BAND = (ROW1 - ROW0) / NR

const itemStart = (k: number) => F0 + SPAN * k
const rowAt = (j: number) => ROW0 + (j + 0.5) * BAND

/* ---- drum */
/** how far the drum drifts through one item's hold (radians, + → -) */
const DRIFT = 0.07
/** the drum's angle during the intro (leaf 01 still round to the right) */
const A_INTRO0 = 1.5
const A_INTRO1 = 0.5
/** clarity: fully clear within ±CLEAR_A of the front, frosted beyond FROST_A */
const CLEAR_A = 0.06
const FROST_A = 0.4
/** tiles are narrower: their window is tighter */
const T_CLEAR_A = 0.045
const T_FROST_A = 0.3

/* ---- camera */
const FOV = 30
const DEG = Math.PI / 180
const UP = new THREE.Vector3(0, 1, 0)

const WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve']
const pad = (n: number) => String(n).padStart(2, '0')
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
const emLast = (s: string) => {
  const parts = s.split(' ')
  if (parts.length < 2) return `<em>${esc(s)}</em>`
  const last = parts.pop()!
  return `${esc(parts.join(' '))} <em>${esc(last)}</em>`
}
const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
/** wrap an angle to -π..π */
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

/** The drum's turn at local l (leaf k faces you at -k·STEP). */
function drumAngle(l: number): number {
  const hold = (k: number, q: number) => -k * STEP + DRIFT * (0.5 - q)
  if (l < DESC_A) return lerp(A_INTRO0, A_INTRO1, ease.outQuad(clamp(l / DESC_A)))
  if (l < DESC_B) return lerp(A_INTRO1, hold(0, 0), ease.inOutCubic((l - DESC_A) / (DESC_B - DESC_A)))
  if (l < F1) {
    const k = Math.min(NF - 1, Math.floor((l - F0) / SPAN))
    const p = clamp((l - itemStart(k)) / SPAN)
    if (k === 0) return hold(0, clamp((l - DESC_B) / (itemStart(1) - DESC_B)))
    if (p < TRAVEL) return lerp(hold(k - 1, 1), hold(k, 0), ease.inOutCubic(p / TRAVEL))
    return hold(k, (p - TRAVEL) / (1 - TRAVEL))
  }
  // past the sixth the drum keeps turning, slowly, under the halo
  return hold(NF - 1, 1) - (l - F1) * 1.6
}

/**
 * The halo's turn: tile j faces you through row j's band, and it steps to
 * the next between bands (a carousel indexing). Before the rows it eases in
 * from further round as it rises; after them it drifts on.
 */
function haloAngle(l: number): number {
  const u = (l - ROW0) / BAND - 0.5
  let s: number
  if (u < 0) s = -2.2 * smoothstep(0, 2.2, -u)
  else if (u > NR - 1) s = NR - 1 + (u - (NR - 1)) * 0.25
  else {
    const f = Math.floor(u)
    s = f + ease.inOutCubic(smoothstep(0.28, 0.72, u - f))
  }
  return -s * HALO_STEP
}

/** How far the ring has lifted into the halo (0 = on the floor, 1 = the halo). */
const riseOf = (l: number) => smoothstep(RISE_A, RISE_B, l)

type PhaseKind = 'intro' | 'item' | 'list' | 'out'
interface Phase {
  kind: PhaseKind
  k: number
  p: number
}
function phaseOf(l: number): Phase {
  if (l < F0) return { kind: 'intro', k: 0, p: clamp(l / F0) }
  if (l < F1) {
    const k = Math.min(NF - 1, Math.floor((l - F0) / SPAN))
    return { kind: 'item', k, p: clamp((l - itemStart(k)) / SPAN) }
  }
  if (l < LIST_OUT) return { kind: 'list', k: NF, p: clamp((l - F1) / (LIST_OUT - F1)) }
  return { kind: 'out', k: NF, p: clamp((l - LIST_OUT) / (1 - LIST_OUT)) }
}

interface Region {
  x0: number
  y0: number
  x1: number
  y1: number
}
interface Shot {
  pos: THREE.Vector3
  tgt: THREE.Vector3
  fov: number
  /** subject centre in NDC */
  cx: number
  cy: number
  /** subject half-height in screen units (screen half-height = 1) */
  hh: number
}
const shot = (): Shot => ({ pos: new THREE.Vector3(), tgt: new THREE.Vector3(), fov: FOV, cx: 0, cy: 0, hh: 0.5 })

interface Layout {
  key: string
  W: number
  H: number
  portrait: boolean
  safe: Region
  dockR: number
  cardTop: number[]
  listR: number
  listTop: number
  introB: number
  /** right edge of the headline's text (not its box) */
  introR: number
}

interface CardEl {
  root: HTMLElement
  name: HTMLElement
}

const _d = new THREE.Vector3()
const _r = new THREE.Vector3()
const _u = new THREE.Vector3()
const _c = new THREE.Vector3()
const _col = new THREE.Color()

/**
 * Aim a camera (yaw, pitch) so a w×h subject centred at C fills the screen
 * region `reg` (CSS px).
 */
function frameTo(out: Shot, C: THREE.Vector3, w: number, h: number, yaw: number, pitch: number, fov: number, reg: Region, W: number, H: number) {
  _d.set(-Math.sin(yaw) * Math.cos(pitch), -Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch))
  const aspect = W / Math.max(1, H)
  const tanH = Math.tan((fov * DEG) / 2)
  const fw = Math.max(0.08, (reg.x1 - reg.x0) / Math.max(1, W))
  const fh = Math.max(0.08, (reg.y1 - reg.y0) / Math.max(1, H))
  const cx = ((reg.x0 + reg.x1) / 2 / Math.max(1, W)) * 2 - 1
  const cy = 1 - ((reg.y0 + reg.y1) / 2 / Math.max(1, H)) * 2
  const dist = Math.max(w / 2 / (fw * tanH * aspect), h / 2 / (fh * tanH))
  const hh = dist * tanH
  const hwid = hh * aspect
  _r.crossVectors(_d, UP).normalize()
  _u.crossVectors(_r, _d).normalize()
  out.pos.copy(C).addScaledVector(_d, -dist).addScaledVector(_r, -cx * hwid).addScaledVector(_u, -cy * hh)
  out.tgt.copy(out.pos).addScaledVector(_d, dist)
  out.fov = fov
  out.cx = cx
  out.cy = cy
  out.hh = h / 2 / hh
  return out
}

/** The neon colour behind a point at `angle` on a ring of n arcs turned by `rot` (arc k on k·2π/n, colours in thirds). */
function arcColor(angle: number, rot: number, n: number, out: THREE.Color) {
  const step = (Math.PI * 2) / n
  const t = (angle - rot) / step
  const k = Math.round(t)
  const idx = (((k % 3) + 3) % 3) as 0 | 1 | 2
  const gap = 1 - smoothstep(0.34, 0.5, Math.abs(t - k))
  return out.copy(NEON_C[idx]).multiplyScalar(0.35 + 0.65 * gap)
}

class Work implements Chapter {
  id = 'work'
  group = new THREE.Group()
  anchors = [...FEATURED.map((_, k) => (k === 0 ? 0.125 : itemStart(k) + SPAN * 0.62)), ...REST.map((_, j) => rowAt(j))]

  private ctx!: ChapterContext
  private set!: CarouselSet
  private mobile = false
  private reduced = false

  // DOM
  private safe!: HTMLElement
  private intro!: HTMLElement
  private introTitle!: HTMLElement
  private dock!: HTMLElement
  private cards: CardEl[] = []
  private listDock!: HTMLElement
  private list!: HTMLElement
  private listTitle!: HTMLElement
  /** the rows' scroll box (landscape, when nine rows can't fit above 'Say hello') */
  private rowsEl!: HTMLElement
  private rows: HTMLAnchorElement[] = []
  private curRow = -2

  // layout / camera
  private lay: Layout | null = null
  private layDirty = true
  private cur = shot()
  private sa = shot()
  private sb = shot()
  private tmp = new THREE.Vector3()

  async init(ctx: ChapterContext) {
    this.ctx = ctx
    this.mobile = ctx.mobile
    this.reduced = ctx.reducedMotion
    this.buildDom(ctx.stage)
    await nextFrame()
    this.set = buildCarousel(FEATURED, REST, this.mobile, rt => ctx.post.isFrameTarget(rt))
    this.group.add(this.set.root)
    await nextFrame()
    window.addEventListener('resize', () => (this.layDirty = true))
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => (this.layDirty = true))
      for (const c of this.cards) ro.observe(c.root)
      ro.observe(this.list)
      ro.observe(this.intro)
      ro.observe(this.safe)
    }
    document.fonts?.ready.then(() => (this.layDirty = true))

    // screenshots: leaf 01 now, the rest once the site is revealed
    const upload = (tex: THREE.Texture) => {
      tex.anisotropy = 8
      try {
        this.ctx.renderer.initTexture(tex)
      } catch {
        /* uploads on first use instead */
      }
    }
    const wide = this.mobile ? 800 : 1280
    const load = (k: number) =>
      loadScreenshot(workImage(FEATURED[k].id), { width: wide })
        .then(tex => {
          upload(tex)
          const leaf = this.set.leaves[k]
          const old = leaf.u.uShot.value
          leaf.u.uShot.value = tex
          averageColor(tex, leaf.tint)
          old.dispose()
        })
        .catch(err => console.warn(`[work] missing screenshot for ${FEATURED[k].id}`, err))
    const loadTile = (j: number) =>
      loadScreenshot(workImage(REST[j].id), { width: this.mobile ? 480 : 720 })
        .then(tex => {
          upload(tex)
          const tile = this.set.tiles[j]
          const old = tile.u.uShot.value
          tile.u.uShot.value = tex
          old.dispose()
        })
        .catch(err => console.warn(`[work] missing screenshot for ${REST[j].id}`, err))
    load(0)
    whenRevealed().then(async () => {
      for (let k = 1; k < NF; k++) {
        await load(k)
        await nextFrame()
      }
      for (let j = 0; j < NR; j++) {
        await loadTile(j)
        await nextFrame()
      }
    })
  }

  // ------------------------------------------------------------------ DOM

  private buildDom(stage: HTMLElement) {
    this.safe = el('div', 'wk-safe', undefined, stage)

    // intro
    this.intro = el('div', 'wk-intro', undefined, stage)
    el('p', 'hud-eyebrow', SECTIONS.work.eyebrow, this.intro)
    const title = SECTIONS.work.title
    const cut = title.lastIndexOf(' ')
    this.introTitle = rise(
      el('h2', 'hud-h2 wk-title', undefined, this.intro),
      cut > 0 ? `${esc(title.slice(0, cut))} <em>${esc(title.slice(cut + 1))}</em>` : `<em>${esc(title)}</em>`,
    )
    const count = el('p', 'wk-count', undefined, this.intro)
    count.innerHTML = [`${WORK.length} sites`, `${NF} featured`, `${NR} more`].map(s => `<span>${esc(s)}</span>`).join('<i aria-hidden="true"></i>')

    // one frosted card per leaf, docked left (bottom on portrait)
    this.dock = el('div', 'wk-dock', undefined, stage)
    FEATURED.forEach((w, k) => this.cards.push(this.buildCard(this.dock, w, k)))

    // the other nine
    this.listDock = el('div', 'wk-dock wk-dock--list', undefined, stage)
    this.list = el('section', 'wk-list hud-panel hud-panel--strong', undefined, this.listDock)
    const meta = el('div', 'wk-meta', undefined, this.list)
    el('span', 'wk-num', `${pad(NF + 1)}–${pad(NF + NR)} / ${pad(WORK.length)}`, meta)
    el('span', 'hud-label wk-ind', 'More work', meta)
    const allLive = REST.every(w => !isPreview(w.url))
    const count9 = WORDS[NR] ?? String(NR)
    this.listTitle = rise(
      el('h3', 'hud-h2 wk-list-title', undefined, this.list),
      allLive ? `${esc(count9)} more, <em>all live.</em>` : `${esc(count9)} <em>more.</em>`,
    )
    const ol = el('ol', 'wk-rows', undefined, this.list)
    this.rowsEl = ol
    ol.addEventListener('scroll', () => this.rowsEdges(), { passive: true })
    REST.forEach((w, j) => {
      const li = el('li', '', undefined, ol)
      const a = el('a', 'wk-row', undefined, li)
      a.href = w.url
      a.target = '_blank'
      a.rel = 'noopener'
      const pre = isPreview(w.url)
      a.innerHTML = `<span class="wk-no">${pad(NF + j + 1)}</span><span class="wk-rname">${esc(w.name)}${
        pre ? ' <small class="wk-pre">Preview</small>' : ''
      }</span><span class="wk-rind">${esc(w.industry)}</span><span class="wk-arrow" aria-hidden="true">↗</span>`
      this.rows.push(a)
    })
    const cta = el('div', 'wk-cta', undefined, this.list)
    const hello = el('button', 'hud-btn', 'Say hello', cta)
    hello.type = 'button'
    hello.addEventListener('click', () => window.__hark?.land('contact'))
  }

  /** A tiny top-down map of the drum: the leaf in front sits at the bottom. */
  private dial(k: number) {
    const r = 6.2
    const dots = FEATURED.map((_, i) => {
      const a = (i - k) * STEP
      const x = 9 + r * Math.sin(a)
      const y = 9 + r * Math.cos(a)
      return i === k ? `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="2.3" class="on"/>` : `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="1.5"/>`
    }).join('')
    return `<svg class="wk-dial" viewBox="0 0 18 18" width="18" height="18" aria-hidden="true"><circle cx="9" cy="9" r="${r}" class="ring"/>${dots}</svg>`
  }

  private buildCard(parent: HTMLElement, w: WorkItem, k: number): CardEl {
    const root = el('article', 'wk-card hud-panel hud-panel--strong', undefined, parent)
    const pre = isPreview(w.url)
    const meta = el('div', 'wk-meta', undefined, root)
    const num = el('span', 'wk-num', undefined, meta)
    num.innerHTML = `${this.dial(k)}<span>${pad(k + 1)} / ${pad(NF)}</span>`
    el('span', 'hud-label wk-ind', w.industry, meta)
    if (pre) el('span', 'wk-badge', 'Preview', meta)
    const name = rise(el('h3', 'hud-h2 wk-name', undefined, root), emLast(w.name))
    el('p', 'hud-body wk-blurb', w.blurb, root)
    const tags = el('ul', 'hud-tags wk-tags', undefined, root)
    for (const t of w.tags) el('li', 'hud-tag', t, tags)
    const cta = el('div', 'wk-cta', undefined, root)
    const a = el('a', 'hud-btn wk-visit', pre ? 'Preview site ↗' : 'Visit site ↗', cta)
    a.href = w.url
    a.target = '_blank'
    a.rel = 'noopener'
    el('span', 'hud-label wk-host', pre ? 'Pre-launch build' : hostOf(w.url), cta)
    return { root, name }
  }

  // ------------------------------------------------------------------ layout

  private ensureLayout(f: Frame): Layout {
    const key = `${f.width}x${f.height}`
    if (this.lay && this.lay.key === key && !this.layDirty) return this.lay
    this.layDirty = false
    const W = f.width
    const H = f.height
    const portrait = typeof matchMedia === 'function' ? matchMedia('(max-aspect-ratio: 10/9)').matches : W / H < 1.1
    const s = this.safe.getBoundingClientRect()
    const safe = s.width > 0 ? { x0: s.left, y0: s.top, x1: s.right, y1: s.bottom } : { x0: 24, y0: 90, x1: W - 24, y1: H - 90 }
    // offset* metrics ignore the reveal() translate on hidden cards / the list
    const dock = this.dock
    const ld = this.listDock
    const list = this.list
    const measured = dock.offsetWidth > 0
    this.lay = {
      key,
      W,
      H,
      portrait,
      safe,
      dockR: measured ? dock.offsetLeft + dock.offsetWidth : W * 0.38,
      cardTop: this.cards.map(c => (measured && c.root.offsetHeight > 0 ? dock.offsetTop + c.root.offsetTop : H * 0.55)),
      listR: list.offsetWidth > 0 ? ld.offsetLeft + list.offsetLeft + list.offsetWidth : W * 0.4,
      listTop: list.offsetHeight > 0 ? ld.offsetTop + list.offsetTop : H * 0.45,
      introB: this.intro.offsetHeight > 0 ? this.intro.offsetTop + this.intro.offsetHeight : H * 0.35,
      introR: this.introTextRight(W),
    }
    this.rowsEdges()
    return this.lay
  }

  /** The headline's widest line (its words, not its box): the drum stands clear of it. */
  private introTextRight(W: number) {
    let r = 0
    this.intro.querySelectorAll<HTMLElement>('.wk-title .rise-w, .wk-count').forEach(n => {
      const b = n.getBoundingClientRect()
      if (b.width > 0 && n.classList.contains('rise-w')) r = Math.max(r, b.right)
      else if (b.width > 0) r = Math.max(r, b.left + Math.min(b.width, 320))
    })
    return r > 0 ? r : W * 0.45
  }

  private region(kind: 'item' | 'list' | 'intro', k: number): Region {
    const L = this.lay!
    const s = L.safe
    if (kind === 'intro') {
      if (L.portrait) return { x0: 0, x1: L.W, y0: Math.min(L.introB + 16, L.H * 0.6), y1: s.y1 + L.H * 0.02 }
      // beside the headline when it is narrow; under it when it runs long
      if (L.introR < L.W * 0.56) return { x0: Math.max(L.introR + L.W * 0.015, L.W * 0.36), x1: L.W + L.W * 0.02, y0: s.y0 + L.H * 0.02, y1: s.y1 + L.H * 0.05 }
      return { x0: L.W * 0.3, x1: L.W + L.W * 0.02, y0: L.introB + 8, y1: s.y1 + L.H * 0.05 }
    }
    if (L.portrait) {
      const top = kind === 'item' ? L.cardTop[k] : L.listTop
      return { x0: 4, x1: L.W - 4, y0: s.y0 - 10, y1: Math.max(s.y0 + 90, top - 10) }
    }
    const right = kind === 'item' ? L.dockR : L.listR
    return { x0: right + L.W * 0.035, x1: s.x1 + L.W * 0.01, y0: s.y0 - L.H * 0.03, y1: s.y1 + L.H * 0.035 }
  }

  // ------------------------------------------------------------------ shots

  /** leaf k in front of the drum: its print high, its neon foot and the ring beneath in frame */
  private itemShot(k: number, drift: number, out: Shot) {
    const L = this.lay!
    const port = L.portrait
    // the subject: the leaf from just under its foot to its top, a touch of drum either side
    const y0 = LEAF_Y0 - (port ? 0.16 : 0.22)
    const y1 = LEAF_Y0 + LEAF_H + 0.06
    _c.set(0, (y0 + y1) / 2, R + 0.05)
    const yaw = (port ? 0.05 : 0.09) - drift * 0.03
    frameTo(out, _c, LEAF_W + (port ? 0.18 : 0.5), y1 - y0, yaw, port ? 0.07 : 0.06, FOV, this.region('item', k), L.W, L.H)
    // a slow push in through the hold
    out.pos.lerp(out.tgt, drift * 0.035)
    return out
  }

  /** high three-quarter view of the whole drum */
  private introShot(u: number, out: Shot) {
    const L = this.lay!
    const port = L.portrait
    _c.set(0, 1.05, 0.2)
    const yaw = port ? lerp(-0.22, -0.18, u) : lerp(-0.34, -0.28, u)
    const pitch = port ? lerp(0.36, 0.33, u) : lerp(0.4, 0.36, u)
    frameTo(out, _c, 2 * R + (port ? 1.7 : 1.1), LEAF_H + (port ? 1.6 : 1.9), yaw, pitch, FOV, this.region('intro', 0), L.W, L.H)
    return out
  }

  /** the halo from above: the front tile large, the ring round it, the drum beneath */
  private listShot(drift: number, out: Shot) {
    const L = this.lay!
    const port = L.portrait
    _c.set(0, HALO_Y - (port ? 0.3 : 0.45), HALO_R * (port ? 0.62 : 0.34))
    const yaw = -0.06 + drift * 0.12
    const pitch = lerp(0.3, 0.33, drift)
    frameTo(out, _c, 2 * HALO_R * (port ? 0.64 : 0.8), TILE_H + (port ? 1.5 : 2.2), yaw, pitch, FOV, this.region('list', 0), L.W, L.H)
    out.pos.lerp(out.tgt, drift * 0.03)
    return out
  }

  private outShot(out: Shot) {
    this.listShot(1, out)
    this.tmp.subVectors(out.pos, out.tgt)
    out.pos.copy(out.tgt).addScaledVector(this.tmp, 1.3)
    out.pos.y += 0.6
    out.hh *= 0.77
    return out
  }

  private travel(a: Shot, b: Shot, t: number, pull: number, out: Shot) {
    const e = ease.inOutCubic(clamp(t))
    out.pos.lerpVectors(a.pos, b.pos, e)
    out.tgt.lerpVectors(a.tgt, b.tgt, e)
    out.fov = lerp(a.fov, b.fov, e)
    out.cx = lerp(a.cx, b.cx, e)
    out.cy = lerp(a.cy, b.cy, e)
    out.hh = lerp(a.hh, b.hh, e)
    // a dolly out and back in as the drum turns
    const bump = Math.sin(Math.PI * clamp(t)) * pull
    this.tmp.subVectors(out.pos, out.tgt).normalize()
    out.pos.addScaledVector(this.tmp, bump)
    out.pos.y += bump * 0.1
    return out
  }

  private shotAt(l: number, out: Shot) {
    if (l < DESC_A) return this.introShot(l / DESC_A, out)
    if (l < DESC_B) return this.travel(this.introShot(1, this.sa), this.itemShot(0, 0, this.sb), (l - DESC_A) / (DESC_B - DESC_A), 0, out)
    const ph = phaseOf(l)
    if (ph.kind === 'item') {
      const k = ph.k
      if (k > 0 && ph.p < TRAVEL) return this.travel(this.itemShot(k - 1, 1, this.sa), this.itemShot(k, 0, this.sb), ph.p / TRAVEL, 0.55, out)
      const h0 = k === 0 ? (DESC_B - F0) / SPAN : TRAVEL
      return this.itemShot(k, clamp((ph.p - h0) / (1 - h0)), out)
    }
    const drift = smoothstep(ROW0, ROW1, l)
    if (l < RISE_B) return this.travel(this.itemShot(NF - 1, 1, this.sa), this.listShot(0, this.sb), (l - F1) / (RISE_B - F1), 0.4, out)
    if (l < LIST_OUT) return this.listShot(drift, out)
    return this.travel(this.listShot(1, this.sa), this.outShot(this.sb), (l - LIST_OUT) / (1 - LIST_OUT), 0, out)
  }

  // ------------------------------------------------------------------ frame

  update(local: number, frame: Frame, ctx: ChapterContext) {
    const l = clamp(local)
    const time = frame.time
    const reduced = this.reduced || frame.reducedMotion
    const still = reduced || !!frame.still
    this.ensureLayout(frame)
    const ph = phaseOf(l)
    const set = this.set
    if (!set) return

    // ---- camera shot (camera() copies it)
    this.shotAt(l, this.cur)
    const s = this.cur

    // ---- the drum
    const A = drumAngle(l)
    set.drum.rotation.y = A
    const rise = riseOf(l)
    // eye level: leaves only clear once the camera is down with them, and not under the halo
    const eye = smoothstep(DESC_A + 0.012, DESC_B - 0.004, l) * (1 - smoothstep(F1 - 0.004, RISE_A + 0.014, l))
    const hum = still ? 1 : 1 + Math.sin(time * 1.3) * 0.025 + Math.sin(time * 3.1) * 0.012
    // the ring: on the floor inside the drum, then up through it and open into the halo
    const up = smoothstep(0, 0.62, rise)
    const open = smoothstep(0.5, 1, rise)
    const ringY = lerp(RING_Y, HALO_RING_Y, up * 0.93 + open * 0.07)
    const ringR = lerp(RING_R, HALO_R, ease.inOutCubic(open))
    set.ring.position.y = ringY
    const rs = ringR / RING_R
    set.ring.scale.set(rs, 1, rs)
    // the six floor arcs hand over to the halo's nine as it opens
    // (once the ring has reached the halo's radius, so the re-segmenting happens in place)
    const handover = smoothstep(0.86, 0.99, rise)
    for (const a of set.ringArcs) a.on.value = (1 - handover) * hum
    set.ring.visible = handover < 0.998

    const H = haloAngle(l)
    const sway = still ? 0 : Math.sin(time * 0.35) * 0.012
    set.halo.rotation.y = H + sway

    let frontK = -1
    let frontC = 0
    for (let k = 0; k < NF; k++) {
      const leaf = set.leaves[k]
      const phi = wrap(k * STEP + A)
      const face = 1 - smoothstep(CLEAR_A, FROST_A, Math.abs(phi))
      const c = face * eye
      if (c > frontC) {
        frontC = c
        frontK = k
      }
      const e = c * c * (3 - 2 * c)
      const u = leaf.u
      u.uFrost.value = 1 - e
      // the drum dims under the halo so the nine lead
      const dim = lerp(1, 0.42, smoothstep(F1, RISE_B, l))
      u.uLit.value = lerp(0.5, 0.95, e) * dim
      u.uEtch.value = dim * dim
      u.uMilk.value = 0.82
      u.uRingY.value = ringY
      // the neon behind this leaf: its own arc on the floor; the halo's once it has opened
      if (handover < 0.5) arcColor(k * STEP, 0, 6, _col)
      else arcColor(k * STEP + A, set.halo.rotation.y, HALO_N, _col)
      const lift = 1 - 0.4 * up
      u.uSpill.value.copy(_col).multiplyScalar(1.15 * lift * hum)
      leaf.mirror.uSpill.value.copy(u.uSpill.value)
      leaf.mirror.uK.value = lerp(0.16, 0.24, e) * (1 - 0.5 * up)
      // the neon edge along the foot lights as the leaf faces you
      const ign = smoothstep(0.55, 0.95, c)
      leaf.edge.on.value = ign * hum
      leaf.edgeRefl.on.value = ign * hum
      // an unlit tube would draw as a dark line: only lit ones render
      leaf.edge.root.visible = ign > 0.002
      leaf.edgeRefl.root.visible = ign > 0.002
    }

    // ---- the halo and its nine tiles
    const haloOn = rise > 0.001
    set.halo.visible = haloOn
    const tilesIn = smoothstep(0.62, 1, rise)
    const listing = 1 - smoothstep(LIST_OUT, LIST_OUT + 0.02, l)
    const haloArcOn = handover * hum
    for (const a of set.haloArcs) {
      a.on.value = haloArcOn
      a.root.visible = haloArcOn > 0.002
    }
    set.tileRim.opacity = tilesIn
    set.tileRim.depthWrite = tilesIn > 0.98
    if (haloOn) {
      set.halo.position.y = lerp(-0.25, 0, ease.outCubic(tilesIn))
      for (let j = 0; j < NR; j++) {
        const t = set.tiles[j]
        const phi = wrap(j * HALO_STEP + H)
        const face = 1 - smoothstep(T_CLEAR_A, T_FROST_A, Math.abs(phi))
        const c = face * smoothstep(RISE_B - 0.01, ROW0, l) * listing
        const e = c * c * (3 - 2 * c)
        t.u.uFrost.value = 1 - e
        t.u.uLit.value = lerp(0.46, 0.95, e)
        t.u.uFade.value = tilesIn
        t.u.uMilk.value = 0.84
        t.u.uRingY.value = HALO_RING_Y + set.halo.position.y
        t.u.uSpill.value.copy(t.color).multiplyScalar(1.1 * haloArcOn)
      }
    }

    // ---- the floor: the ring's light (fading as it lifts), the lit screen's colour in front
    const fl = set.floor
    fl.uRingR.value = ringR
    fl.uRingRot.value = A
    fl.uRingK.value = (1 - up) * (1 - handover) * hum
    fl.uArcs.value = 6
    if (frontK >= 0) {
      fl.uPoolC.value.copy(set.leaves[frontK].tint).lerp(set.leaves[frontK].color, 0.35)
      fl.uPoolK.value = 0.16 * frontC
    } else fl.uPoolK.value = 0
    fl.uInner.value = 0.035 * (1 - up) + 0.02 * open

    // ---- world: a black studio; a faint coloured backlight behind the subject
    const wp = ctx.world.params
    _d.subVectors(s.tgt, s.pos).normalize()
    const yawW = Math.atan2(_d.x, -_d.z)
    const pitchW = Math.asin(clamp(_d.y, -1, 1))
    const aspect = frame.width / Math.max(1, frame.height)
    wp.focus.set(s.cx * aspect + Math.sin(yawW) * 0.25, s.cy + pitchW * 0.2)
    wp.halo = 0.22
    wp.haloColor = G.ice
    wp.haloSize = clamp(s.hh * 1.2, 0.5, 1.6)
    wp.slits = 0
    wp.top = '#020203'
    wp.bottom = '#000000'
    wp.env = 1
    wp.envTurn = 0
    // (a hard key would lay a specular line down every curved leaf: the studio strips do the glints)
    wp.key = 0.1
    wp.keyDir.set(-0.4, 0.8, 0.45)
    wp.fill = 0.05

    // ---- post: bloom on the neon only (threshold above any lit print)
    const pp = ctx.post.params
    pp.bloomStrength = 0.62
    pp.bloomRadius = 0.55
    pp.bloomThreshold = 1.02
    pp.vignette = 0.62

    // ---- DOM
    const introV = 1 - smoothstep(INTRO_OUT - 0.006, INTRO_OUT + 0.002, l)
    reveal(this.intro, introV, 0)
    setRise(this.introTitle, l > 0.012 && l < INTRO_OUT)
    for (let k = 0; k < NF; k++) {
      let v = 0
      if (ph.kind === 'item' && ph.k === k) {
        const a = k === 0 ? smoothstep(0.1, 0.108, l) : smoothstep(0.26, 0.34, ph.p)
        v = a * (1 - smoothstep(0.93, 0.99, ph.p))
      }
      reveal(this.cards[k].root, v, 10)
      setRise(this.cards[k].name, v > 0.3)
    }
    const listV = smoothstep(RISE_A + 0.03, RISE_B + 0.002, l) * (1 - smoothstep(LIST_OUT - 0.002, LIST_OUT + 0.008, l))
    reveal(this.listDock, listV, 10)
    setRise(this.listTitle, listV > 0.35)
    const inRows = l >= ROW0 - 0.004 && l <= LIST_OUT
    const selIdx = inRows ? clamp(Math.floor((l - ROW0) / BAND), 0, NR - 1) : -1
    if (selIdx !== this.curRow) {
      this.rows.forEach((r, j) => r.classList.toggle('is-cur', j === selIdx))
      this.curRow = selIdx
      if (selIdx >= 0) this.showRow(selIdx, still)
    }
  }

  /** Mark whether the rows box overflows and which ends are scrolled away (CSS fades them). */
  private rowsEdges() {
    const box = this.rowsEl
    const over = box.scrollHeight > box.clientHeight + 1
    box.classList.toggle('is-over', over)
    // only while the rows overflow: a wheel over them scrolls the rows, not the story
    box.toggleAttribute('data-lenis-prevent', over)
    box.classList.toggle('at-top', box.scrollTop <= 1)
    box.classList.toggle('at-end', box.scrollTop + box.clientHeight >= box.scrollHeight - 1)
  }

  /** Scroll the rows box (only when it overflows) so row j sits inside it. */
  private showRow(j: number, instant: boolean) {
    const box = this.rowsEl
    if (!box || box.scrollHeight <= box.clientHeight + 1) return
    const b = box.getBoundingClientRect()
    const r = this.rows[j].getBoundingClientRect()
    const pad = 6
    let top = box.scrollTop
    if (r.top < b.top + pad) top += r.top - b.top - pad
    else if (r.bottom > b.bottom - pad) top += r.bottom - b.bottom + pad
    else return
    box.scrollTo({ top, behavior: instant ? 'auto' : 'smooth' })
  }

  camera(_local: number, _frame: Frame, out: CameraPose) {
    out.position.copy(this.cur.pos)
    out.target.copy(this.cur.tgt)
    out.fov = this.cur.fov
    out.parallax = this.reduced ? 0 : 0.08
  }
}

export default function create(): Chapter {
  return new Work()
}
