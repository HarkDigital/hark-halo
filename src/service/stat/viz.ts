import type { StatViz } from '../data/pages'

/*
 * THE PICTURES in the stat band (band.ts): one builder per StatViz kind
 * (data/pages.ts), each drawing the stat's own number in glass and neon.
 *
 * A builder draws into the band's picture box for its real width (band.ts
 * rebuilds it when that changes; under 600 wide is a phone) and returns
 * frame(p, e): p = the eased progress the number counts with, so what is
 * lit always equals the number; e = linear time 0..1, for pictures with
 * phases. Frames are pure (any p and e in any order: a rebuild, or the dev
 * seek, can run them backwards) and cheap: class toggles and a few style
 * writes, no layout reads. Dense grids (24/7, the tiles) paint their lit
 * layer once and reveal it with a clip. Colours come from the active lights
 * (--neon-a/b/c, kit/palette.ts), by position only, never data: no legend
 * leans on hue. All of it is aria-hidden; the band's text says it all.
 */

export interface Env {
  /** the picture's width (px) */
  w: number
  /** under 600 wide: a phone */
  narrow: boolean
  /** the page's --hud-px (px): 1, growing to 1.5 on wide desktops */
  u: number
  /** 'r, g, b' along the lights: 0 = a, 0.5 = b, 1 = c */
  neon: (t: number) => string
}

export interface Picture {
  /** draw the state at p (eased, the count's) and e (linear time), both 0..1 */
  frame(p: number, e: number): void
  /** the band glow's two tints (left, right), as places along the lights */
  lead: [number, number]
  /** its length (ms), when not the band's default */
  dur?: number
  /** a word stat's key light: true once it is on (the word strikes with it) */
  key?(p: number, e: number): boolean
  /** redrawn on the minute (the clock) */
  live?: boolean
}

type Kind = StatViz['kind']
type Builder<K extends Kind> = (el: HTMLElement, o: Extract<StatViz, { kind: K }>, env: Env, value: string) => Picture

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
export const easeOut = (e: number) => 1 - Math.pow(1 - e, 3)
const easeInOut = (e: number) => (e < 0.5 ? 4 * e * e * e : 1 - Math.pow(-2 * e + 2, 3) / 2)
const span = (a: number, b: number, e: number) => clamp01((e - a) / (b - a))
/** whole lights and tenths round down: a readout never runs ahead of its lights */
const whole = (n: number) => Math.floor(n + 1e-6)
const tenths = (n: number) => (Math.floor(n * 10 + 1e-6) / 10).toFixed(1)
const f = (n: number) => n.toFixed(1)
const px = (n: number) => `${+n.toFixed(2)}px`
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
let uid = 0

/** the picture's caption (faint caps) and its live readout */
const head = (cap: string, read = '') => `<div class="vz-head"><span>${cap}</span>${read ? `<span class="vz-read">${read}</span>` : ''}</div>`

/** an svg neon tube along d: a wide soft halo, a bloom, the coloured tube, a white-hot core */
const tube = (d: string, stroke: string, cls = '') =>
  `<g class="tb ${cls}">${['halo', 'bloom', 'tube'].map(k => `<path class="tb-${k}" d="${d}" stroke="${stroke}"/>`).join('')}<path class="tb-core" d="${d}"/></g>`

/** the lights' run from x1 to x2 (svg user space) */
const runGrad = (id: string, x1: number, x2: number) =>
  `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${f(x1)}" y1="0" x2="${f(x2)}" y2="0"><stop offset="0" style="stop-color:var(--neon-a)"/><stop offset="0.5" style="stop-color:var(--neon-b)"/><stop offset="1" style="stop-color:var(--neon-c)"/></linearGradient>`

const lengths = new WeakMap<SVGGeometryElement, number>()
const lengthOf = (el: SVGGeometryElement) => {
  let L = lengths.get(el)
  if (L === undefined) lengths.set(el, (L = el.getTotalLength()))
  return L
}
/** a tube drawn to p (0..1) along its length */
function drawTo(g: Element, p: number) {
  for (const el of g.querySelectorAll<SVGPathElement>('path')) {
    const L = lengthOf(el)
    el.style.strokeDasharray = `${L} ${L}`
    el.style.strokeDashoffset = String(L * (1 - p))
  }
}
/** a smooth curve through the points (Catmull-Rom as cubic Béziers) */
function smooth(pts: [number, number][]) {
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`
  }
  return d
}
/** light the first k of `els`, unlight the rest (touching only the ones that change) */
function lightFirst(els: Element[], k: number, cls = 'on') {
  els.forEach((el, i) => {
    const on = i < k
    if (el.classList.contains(cls) !== on) el.classList.toggle(cls, on)
  })
}
/** phones: the gap between lights `pitch` apart: 22% of it, at most 5px, none once they pack under 4px */
const denseGap = (pitch: number) => (pitch < 4 ? 0 : Math.min(5, pitch * 0.22))
/**
 * A clip showing the first r of n cells along a row ('across') or down a
 * column, with `reach` px around them for their glow: a lit layer painted
 * once, revealed a cell at a time (the cut falls mid-gap).
 */
function reveal(r: number, n: number, gap: number, reach: number, dir: 'across' | 'down') {
  if (r <= 0) return 'inset(50%)'
  const o = px(-reach)
  if (r >= n) return `inset(${o})`
  const cut = `calc(100% - ${r} * (100% + ${px(gap)}) / ${n} + ${px(gap / 2)})`
  return dir === 'down' ? `inset(${o} ${o} ${cut} ${o})` : `inset(${o} ${cut} ${o} ${o})`
}

type Tick = { x: number; text: string; hi?: boolean }
/**
 * Scale labels across `w` px, thinned evenly until none collide: every
 * label, else every other, every third… An end label (x = 1) always stays,
 * dropping the one before it if they would touch.
 */
function axis(ticks: Tick[], w: number, env: Env, cls = '') {
  const gap = 10 * env.u
  const ext = (t: Tick): [number, number] => {
    const tw = t.text.length * 10.5 * env.u * 0.8
    const x = t.x * w
    return t.x <= 0 ? [x, x + tw] : t.x >= 1 ? [x - tw, x] : [x - tw / 2, x + tw / 2]
  }
  const fits = (ts: Tick[]) => ts.every((t, i) => !i || ext(t)[0] - ext(ts[i - 1])[1] >= gap)
  const last = ticks[ticks.length - 1]
  let keep = ticks
  for (let step = 1; step < ticks.length; step++) {
    keep = ticks.filter((_, i) => i % step === 0)
    if (last.x >= 1 && keep[keep.length - 1] !== last) {
      keep.push(last)
      if (!fits(keep)) keep.splice(-2, 1)
    }
    if (fits(keep)) break
  }
  const label = (t: Tick) =>
    `<span class="${t.x <= 0 ? 'is-start' : t.x >= 1 ? 'is-end' : ''}${t.hi ? ' is-hi' : ''}" style="left:${(t.x * 100).toFixed(3)}%">${t.text}</span>`
  return `<div class="vz-axis ${cls}">${keep.map(label).join('')}</div>`
}

/* ---------------------------------------------------------------- 10 years
   A glass pane per year from `from`; one lit wash fills them month by month
   behind a white-hot head, and a neon post strikes at each new year. */
const years: Builder<'years'> = (el, o, env) => {
  const n = Math.max(1, o.to - o.from)
  el.innerHTML = `
    ${head(`Since ${o.from}`, `<b class="vz-num">${o.from}</b>`)}
    <div class="vy${env.narrow ? ' is-narrow' : ''}" style="--months:${n * 12}">
      ${'<i class="vy-pane"></i>'.repeat(n)}
      <div class="vy-lit"><b class="vy-wash"></b><b class="vy-ticks"></b><b class="vy-base"></b></div>
      ${Array.from({ length: n + 1 }, (_, k) => `<i class="vy-post" style="left:${((k / n) * 100).toFixed(3)}%;--c:${env.neon(k / n)}"></i>`).join('')}
      <i class="vy-head"></i>
    </div>
    ${axis(Array.from({ length: n + 1 }, (_, k) => ({ x: k / n, text: String(o.from + k), hi: k === n })), env.w, env)}`
  const vy = el.querySelector<HTMLElement>('.vy')!
  const posts = [...el.querySelectorAll('.vy-post')]
  const num = el.querySelector('.vz-num')!
  return {
    lead: [0, 1],
    frame(p) {
      const x = p * n
      vy.style.setProperty('--p', p.toFixed(4))
      vy.classList.toggle('is-moving', p > 0 && p < 1)
      lightFirst(posts, p > 0 ? whole(x) + 1 : 0)
      num.textContent = String(o.from + whole(x))
    },
  }
}

/* ---------------------------------------------------------------- 28% / 19%
   A 40-hour week: five rows of eight glass hours, each day's share lit as one
   neon block, growing behind a white-hot head. The readout is plain arithmetic
   (the share of 40 hours); no per-day figure, which would assume an even split. */
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const week: Builder<'week'> = (el, o, env) => {
  const hours = o.share * 40
  const c = env.neon(o.hue ?? 0)
  // (the day labels' column and its gap, as in stat.css)
  const rule = env.w - (env.narrow ? 34 + 10 : 40 + 14) * env.u
  el.innerHTML = `
    ${head('A 40-hour week', `<b class="vz-num">0.0</b> of 40 hours`)}
    <div class="vw${env.narrow ? ' is-narrow' : ''}" style="--share:${o.share};--c:${c}">
      <div class="vw-ruler"><span></span>${axis([0, 2, 4, 6, 8].map(h => ({ x: h / 8, text: `${h}h` })), rule, env)}</div>
      ${DAYS.map(d => `<div class="vw-row"><span class="vz-lab">${d}</span><div class="vw-track">${'<i></i>'.repeat(8)}<b class="vw-lit"></b></div></div>`).join('')}
    </div>
    <div class="vz-foot"><span class="vz-key"><i class="vz-chip" style="--c:${c}"></i>${esc(o.lit)}</span>${o.rest ? `<span class="vz-key"><i class="vz-chip is-dim"></i>${esc(o.rest)}</span>` : ''}</div>`
  const vw = el.querySelector<HTMLElement>('.vw')!
  const num = el.querySelector('.vz-num')!
  const h = o.hue ?? 0
  return {
    lead: [h, h],
    frame(p) {
      vw.style.setProperty('--p', p.toFixed(4))
      vw.classList.toggle('is-moving', p > 0 && p < 1)
      num.textContent = tenths(p * hours)
    },
  }
}

/* ---------------------------------------------------------------- tiles
   A field of `of` small site tiles, five deep, `share` of them lit column by
   column (so the lit block's width reads as the share). The lit tiles are
   painted once, a column each, and revealed down their column by a clip. */
function field(el: HTMLElement, env: Env, share: number, of: number, cap: string, read: string): Picture {
  const rows = 5
  const cols = Math.ceil(of / rows)
  const small = env.w < 640
  const g = small ? denseGap(env.w / cols) : 8 * env.u
  const lit = Array.from({ length: Math.ceil(share / rows) }, (_, c) => {
    const tiles = Array.from({ length: Math.min(rows, share - c * rows) }, (_, r) => `<i style="--c:${env.neon(share > 1 ? (c * rows + r) / (share - 1) : 0)}"></i>`)
    return `<b class="vt-col">${tiles.join('')}</b>`
  })
  el.innerHTML = `${head(cap, read)}<div class="vt${small ? ' is-small' : ''}" style="--cols:${cols};--g:${px(g)}">${'<i></i>'.repeat(of)}<div class="vt-lit">${lit.join('')}</div></div>`
  const colEls = [...el.querySelectorAll<HTMLElement>('.vt-col')]
  const shown = colEls.map(() => -1)
  const reach = 26 * env.u
  const num = el.querySelector('.vz-num')!
  return {
    lead: [0, 1],
    frame(p) {
      const k = whole(p * share)
      colEls.forEach((col, c) => {
        const r = Math.max(0, Math.min(rows, k - c * rows))
        if (r !== shown[c]) col.style.clipPath = reveal((shown[c] = r), rows, g, reach, 'down')
      })
      num.textContent = String(k)
    },
  }
}
const tiles: Builder<'tiles'> = (el, o, env) =>
  field(el, env, o.share, o.of, o.of === 100 ? 'A hundred websites' : `${o.of} websites`, `<b class="vz-num">0</b> of ${o.of} run it`)

/* ---------------------------------------------------------------- 65
   One small browser window per live site; the count is the value itself
   (PORTFOLIO_WORK.length), so a new site adds a pane. They light like windows
   across a city at night: a loose sweep, left to right. A portfolio past
   about 90 sites, or panes under 16px on a phone, falls back to the tiles. */
const panes: Builder<'panes'> = (el, o, env, value) => {
  const n = Math.max(1, Math.round(Number(value)) || 1)
  const rows = 5
  const cols = Math.ceil(n / rows)
  const small = env.w < 640
  const g = small ? denseGap(env.w / cols) : 10 * env.u
  if (n > 90 || (env.w - (cols - 1) * g) / cols < 16) return field(el, env, n, n, 'One tile per live site', `<b class="vz-num">0</b> live`)
  const r = rng(65)
  const html = Array.from({ length: n }, (_, i) => {
    const look = `--hw:${(42 + r() * 40).toFixed(0)}%;--hh:${(18 + r() * 18).toFixed(0)}%;--t:${(68 + r() * 6).toFixed(0)}%;--w:${(30 + r() * 44).toFixed(0)}%`
    return `<div class="vp" style="--c:${env.neon((i % cols) / Math.max(1, cols - 1))};${look}"><i class="b"></i><i class="h"></i><i class="l"></i></div>`
  })
  el.innerHTML = `${head('One pane per live site', `<b class="vz-num">0</b> live`)}<div class="vp-grid${small ? ' is-small' : ''}" style="--cols:${cols};gap:${px(g)}">${html.join('')}</div>`
  const order = [...el.querySelectorAll('.vp')]
    .map((p, i) => [p, (i % cols) + r() * 4.5] as const)
    .sort((a, b) => a[1] - b[1])
    .map(x => x[0])
  const num = el.querySelector('.vz-num')!
  return {
    lead: [0, 1],
    frame(p) {
      const k = whole(p * n)
      lightFirst(order, k)
      num.textContent = String(k)
    },
  }
}

/* ---------------------------------------------------------------- $1M+
   A year through client stores, from $0 in January to the dashed $1M line at
   December, the arrow past it the '+'. Only $0, $1M, Jan and Dec are marked:
   no months or amounts in between (retail is seasonal; we claim none). */
const flow: Builder<'flow'> = (el, o, env) => {
  const u = env.u
  const W = env.w
  const H = Math.round((env.narrow ? 180 : 244) * u)
  const L = (env.narrow ? 40 : 52) * u, R = (env.narrow ? 30 : 44) * u, T = 24 * u, B = 26 * u
  const pw = W - L - R, ph = H - T - B, TOP = 1.14
  const X = (v: number) => L + v * pw
  const Y = (v: number) => T + (1 - v / TOP) * ph
  const id = `vz${++uid}`
  const x0 = X(0), y0 = Y(0), x1 = X(1), y1 = Y(1)
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len
  const ax = x1 + ux * 30 * u, ay = y1 + uy * 30 * u, ah = 8 * u, nx = -uy, ny = ux
  const barb = (s: number) => `${f(ax - ux * ah + s * nx * ah * 0.7)} ${f(ay - uy * ah + s * ny * ah * 0.7)}`
  el.innerHTML = `
    ${head('One year, running total', '<b>$1M+</b>')}
    <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <defs>
        ${runGrad(id, x0, ax)}
        <linearGradient id="${id}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgb(${env.neon(0.6)})" stop-opacity="0.32"/><stop offset="1" stop-color="rgb(${env.neon(0)})" stop-opacity="0"/></linearGradient>
        <clipPath id="${id}c"><rect class="vfl-clip" x="${f(x0)}" y="0" width="0" height="${H}"/></clipPath>
      </defs>
      <line class="vz-grid" x1="${f(L)}" x2="${f(L + pw)}" y1="${f(y0)}" y2="${f(y0)}"/>
      <line class="vz-grid is-goal" x1="${f(L)}" x2="${f(L + pw)}" y1="${f(y1)}" y2="${f(y1)}"/>
      <text class="vz-st" x="${f(L - 12 * u)}" y="${f(y0)}" text-anchor="end" dominant-baseline="middle">$0</text>
      <text class="vz-st is-hi" x="${f(L - 12 * u)}" y="${f(y1)}" text-anchor="end" dominant-baseline="middle">$1M</text>
      <text class="vz-st" x="${f(x0)}" y="${f(H - 4 * u)}">Jan</text>
      <text class="vz-st" x="${f(x1)}" y="${f(H - 4 * u)}" text-anchor="end">Dec</text>
      <path d="M${f(x0)} ${f(y0)} L${f(x1)} ${f(y1)} L${f(x1)} ${f(y0)} Z" fill="url(#${id}w)" clip-path="url(#${id}c)"/>
      ${tube(`M${f(x0)} ${f(y0)} L${f(x1)} ${f(y1)}`, `url(#${id})`, 'vfl-line')}
      <g class="vfl-plus">${tube(`M${f(x1)} ${f(y1)} L${f(ax)} ${f(ay)} M${barb(1)} L${f(ax)} ${f(ay)} L${barb(-1)}`, `rgb(${env.neon(1)})`)}</g>
      <circle class="vz-dot" r="${f(4 * u)}"/>
    </svg>`
  const line = el.querySelector('.vfl-line')!
  const plus = el.querySelector('.vfl-plus')!
  const dot = el.querySelector('.vz-dot')!
  const clip = el.querySelector('.vfl-clip')!
  return {
    lead: [0.5, 1],
    frame(p) {
      drawTo(line, p)
      clip.setAttribute('width', f(dx * p))
      dot.setAttribute('cx', f(x0 + dx * p))
      dot.setAttribute('cy', f(y0 + dy * p))
      dot.classList.toggle('on', p > 0 && p < 0.995)
      plus.classList.toggle('on', p >= 0.995)
    },
  }
}

/* ---------------------------------------------------------------- Page 1
   Pages of results side by side; page one strikes on, its titles top to
   bottom, and the rest come up as fading ghosts. */
const serp: Builder<'serp'> = (el, o, env) => {
  const n = env.narrow ? Math.max(2, o.pages - 1) : o.pages
  const rows = 10
  const r = rng(11)
  const ghost = [1, 0.5, 0.34, 0.22, 0.13]
  const page = (k: number) =>
    `<div class="vs-page${k ? ' is-off' : ' is-first'}" style="--o:${ghost[k] ?? 0.1}"><span class="vz-lab">Page ${k + 1}</span>${Array.from(
      { length: rows },
      () => `<div class="vs-r"><i class="t" style="--w:${(56 + r() * 40).toFixed(0)}%"></i><i class="s" style="--w:${(30 + r() * 30).toFixed(0)}%"></i></div>`,
    ).join('')}</div>`
  el.innerHTML = `${head('Search results')}<div class="vs${env.narrow ? ' is-narrow' : ''}" style="--pages:${n};--c:${env.neon(0.5)}">${Array.from({ length: n }, (_, k) => page(k)).join('')}</div>`
  const first = el.querySelector('.is-first')!
  const res = [...first.querySelectorAll('.vs-r')]
  const rest = [...el.querySelectorAll('.vs-page:not(.is-first)')]
  return {
    lead: [0.5, 0.5],
    frame(p, e) {
      first.classList.toggle('on', e > 0)
      lightFirst(res, Math.round(span(0.05, 0.75, e) * rows))
      rest.forEach(pg => pg.classList.toggle('is-off', e < 0.35))
    },
    // the word strikes as page one's outline lights
    key: (p, e) => e > 0,
  }
}

/* ---------------------------------------------------------------- 32%
   Two bars, `from` and `to` seconds of load; the second runs `rise` past the
   first (exactly 1 : 1.32, a relative rise: no bounce rate is invented). On a
   laptop each row has a small meter, a segment a second; phones give the bars
   that room instead. */
const bounce: Builder<'bounce'> = (el, o, env) => {
  const ratio = 1 + o.rise
  const reach = env.narrow ? 0.74 : 0.86 // the longer bar's end, as a share of the track (room for its tag)
  const secs = Math.round(o.to)
  const meter = (lit: number) =>
    env.narrow ? '' : `<span class="vb-meter">${Array.from({ length: secs }, (_, i) => `<i class="${i < lit ? 'on' : ''}" style="--c:${env.neon(secs > 1 ? i / (secs - 1) : 0)}"></i>`).join('')}</span>`
  el.innerHTML = `
    ${head('Chance a visitor bounces', `Load <b class="vz-num">${o.from.toFixed(1)}</b> s`)}
    <div class="vb${env.narrow ? ' is-narrow' : ''}" style="--base:${((reach / ratio) * 100).toFixed(3)}%;--rise:${o.rise};--c:${env.neon(1)}">
      <div class="vb-row">
        <span class="vb-meta"><span class="vz-lab"><b>${o.from}s</b> load</span>${meter(o.from)}</span>
        <div class="vb-track"><i class="vb-base"></i><span class="vz-lab vb-v">Baseline</span></div>
      </div>
      <div class="vb-row">
        <span class="vb-meta"><span class="vz-lab"><b>${o.to}s</b> load</span>${meter(0)}</span>
        <div class="vb-track"><i class="vb-base"></i><i class="vb-up"></i><span class="vz-lab vb-v vb-pct">+0%</span></div>
      </div>
    </div>`
  const vb = el.querySelector<HTMLElement>('.vb')!
  const pct = el.querySelector('.vb-pct')!
  const num = el.querySelector('.vz-num')!
  const segs = [...el.querySelectorAll('.vb-row:last-child .vb-meter i')]
  return {
    lead: [0, 1],
    frame(p) {
      const t = o.from + (o.to - o.from) * p
      vb.style.setProperty('--p', p.toFixed(4))
      pct.textContent = `+${whole(p * Math.round(o.rise * 100))}%`
      num.textContent = tenths(t)
      lightFirst(segs, p > 0 ? Math.min(secs, whole(t)) : 0)
    },
  }
}

/* ---------------------------------------------------------------- Hours
   Busywork lifting off into your own lane as a scan crosses the week.
   Illustrative, not a measurement: the value has no number, so neither does
   the picture (stretches of varying length, no hours, ticks or days to count). */
const RETURNED: [number, number][] = [
  [0.03, 0.06],
  [0.15, 0.1],
  [0.33, 0.035],
  [0.46, 0.08],
  [0.63, 0.05],
  [0.79, 0.11],
]
const returned: Builder<'returned'> = (el, o, env) => {
  const at = (a: number, l: number) => `left:${(a * 100).toFixed(2)}%;width:${(l * 100).toFixed(2)}%`
  el.innerHTML = `
    ${head('Your week', `<span class="vz-key"><i class="vz-chip" style="--c:${env.neon(0.25)}"></i>Back to you</span>`)}
    <div class="vr${env.narrow ? ' is-narrow' : ''}">
      <div class="vr-labs vz-lab"><span>Yours</span><span>Busywork</span></div>
      <div class="vr-lanes">
        <div class="vr-lane vr-up">${RETURNED.map(([a, l]) => `<i class="vr-seg" style="${at(a, l)};--c:${env.neon(a + l / 2)}"></i>`).join('')}</div>
        <div class="vr-lane vr-dn">${RETURNED.map(([a, l]) => `<i class="vr-gone" style="${at(a, l)}"></i>`).join('')}</div>
        <i class="vr-scan"></i>
      </div>
    </div>`
  const up = [...el.querySelectorAll('.vr-seg')]
  const gone = [...el.querySelectorAll('.vr-gone')]
  const scan = el.querySelector<HTMLElement>('.vr-scan')!
  const sweep = (e: number) => span(0.02, 0.85, e)
  const back = (x: number) => RETURNED.filter(([a, l]) => a + l / 2 <= x + 1e-6).length
  return {
    lead: [0.25, 0.85],
    frame(p, e) {
      const x = sweep(e)
      const k = back(x)
      lightFirst(up, k)
      lightFirst(gone, k)
      scan.style.left = `${(x * 100).toFixed(2)}%`
      scan.style.opacity = e > 0 && e < 0.9 ? String(Math.min(1, (0.9 - e) * 8)) : '0'
    },
    // the word strikes as the first stretch comes back
    key: (p, e) => back(sweep(e)) > 0,
  }
}

/* ---------------------------------------------------------------- Part 107
   Plan, fly, land: the waypoints and a dashed route go down first, then the
   flight draws through them behind a small quad. A profile, not a flight log:
   heights are shares of the frame, with no altitudes and no ceiling. */
const flight: Builder<'flight'> = (el, o, env) => {
  const u = env.u
  const W = env.w
  const H = Math.round((env.narrow ? 168 : 220) * u)
  const L = 16 * u, R = 20 * u, T = 20 * u, B = 26 * u
  const pw = W - L - R, ph = H - T - B
  const X = (v: number) => L + v * pw
  const Y = (h: number) => T + (1 - h) * ph
  const wp: [number, number][] = [[0.02, 0], [0.07, 0.46], [0.16, 0.8], [0.28, 0.7], [0.4, 0.92], [0.52, 0.62], [0.64, 0.86], [0.76, 0.74], [0.87, 0.48], [0.95, 0.12], [0.98, 0]]
  const pts = wp.map(([x, h]) => [X(x), Y(h)] as [number, number])
  const d = smooth(pts)
  const id = `vz${++uid}`
  const a = 7 * u
  const quad = `<g class="vfx-quad"><g class="vfx-glow">
      <path d="M${f(-a)} ${f(-a)} L${f(a)} ${f(a)} M${f(a)} ${f(-a)} L${f(-a)} ${f(a)}" stroke-width="${f(1.6 * u)}"/>
      ${[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([i, j]) => `<circle cx="${f(i * a)}" cy="${f(j * a)}" r="${f(3.6 * u)}" stroke-width="${f(1.2 * u)}"/>`).join('')}
      <circle class="vfx-hub" r="${f(2.4 * u)}"/></g></g>`
  el.innerHTML = `
    ${head('Flight profile', `<span class="vfx-steps">${['Plan', 'Fly', 'Land'].map((s, i) => `<span style="--c:${env.neon(i / 2)}">${s}</span>`).join(' · ')}</span>`)}
    <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <defs>${runGrad(id, X(0), X(1))}</defs>
      ${[1 / 3, 2 / 3, 1].map(h => `<line class="vz-grid" x1="${f(L)}" x2="${f(L + pw)}" y1="${f(Y(h))}" y2="${f(Y(h))}"/>`).join('')}
      <line class="vz-ground" x1="${f(L)}" x2="${f(L + pw)}" y1="${f(Y(0))}" y2="${f(Y(0))}"/>
      <text class="vz-st" x="${f(X(0.02))}" y="${f(H - 4 * u)}">Takeoff</text>
      <text class="vz-st" x="${f(X(0.98))}" y="${f(H - 4 * u)}" text-anchor="end">Landed</text>
      <path class="vfx-plan" d="${d}"/>
      ${pts
        .slice(1, -1)
        .map(([x, y]) => `<circle class="vfx-wp" cx="${f(x)}" cy="${f(y)}" r="${f(4.5 * u)}" stroke-width="${f(1.2 * u)}"/>`)
        .join('')}
      ${tube(d, `url(#${id})`, 'vfx-path')}
      ${quad}
    </svg>`
  const plan = el.querySelector<SVGPathElement>('.vfx-plan')!
  const wps = [...el.querySelectorAll('.vfx-wp')]
  const path = el.querySelector('.vfx-path')!
  const core = path.querySelector<SVGPathElement>('.tb-core')!
  const drone = el.querySelector('.vfx-quad')!
  const steps = [...el.querySelectorAll('.vfx-steps span')]
  // the route sampled once, so a frame never asks the path for a point
  const N = 160
  const len = lengthOf(core)
  const route = Array.from({ length: N + 1 }, (_, i) => core.getPointAtLength((len * i) / N)).map(q => [q.x, q.y])
  const fly = (e: number) => easeInOut(span(0.28, 1, e))
  return {
    lead: [0.5, 1],
    dur: 2900,
    frame(p, e) {
      const shown = span(0, 0.3, e)
      const t = fly(e)
      plan.style.opacity = shown.toFixed(3)
      lightFirst(wps, Math.round(shown * wps.length))
      drawTo(path, t)
      const i = Math.min(N - 1, Math.floor(t * N))
      const k = t * N - i
      const [qx, qy] = [route[i][0] + (route[i + 1][0] - route[i][0]) * k, route[i][1] + (route[i + 1][1] - route[i][1]) * k]
      drone.setAttribute('transform', `translate(${f(qx)} ${f(qy)})`)
      drone.classList.toggle('on', t > 0 && e < 1)
      lightFirst(steps, e >= 1 ? 3 : t > 0 ? 2 : e > 0 ? 1 : 0)
    },
    // the word strikes at takeoff
    key: (p, e) => fly(e) > 0,
  }
}

/* ---------------------------------------------------------------- Now
   A 24-hour ribbon in the viewer's own time: six past hours as flat glass, this
   hour filled to this minute, the next ones neon, dimming with distance. A
   marker runs in to this minute and lands (the word strikes with it). Redrawn on
   the minute (band.ts pauses that off-screen and in a hidden tab). */
const now: Builder<'now'> = (el, o, env) => {
  const at = new Date()
  const back = 6
  const N = 24
  const start = new Date(at)
  start.setMinutes(0, 0, 0)
  start.setHours(start.getHours() - back)
  const hour = new Intl.DateTimeFormat(undefined, { hour: 'numeric' })
  const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })
  const m = at.getMinutes() / 60
  const g = env.narrow ? denseGap(env.w / N) : 3 * env.u
  const cells = Array.from({ length: N }, (_, i) => {
    const kind = i < back ? 'past' : i === back ? 'cur' : 'fut'
    const a = i - back
    const k = kind === 'fut' ? (1 - ((a - 1) / (N - back)) * 0.55).toFixed(3) : '1'
    // (the +1h… labels only where a cell can hold one)
    const lab = kind === 'fut' && env.w / N >= 32 && (a <= 3 || a % 3 === 0) ? `<span class="vz-lab">+${a}h</span>` : ''
    const fill = kind === 'cur' ? `<b style="width:${(m * 100).toFixed(1)}%"></b>` : ''
    return `<div class="vn-h ${kind}" style="--c:${env.neon(0.05 + (Math.max(0, a - 1) / (N - back - 1)) * 0.95)};--k:${k}">${fill}${lab}</div>`
  })
  // this minute: `back` whole cells and the gaps after them, then m of a cell
  const markAt = (s: number) => `calc(${(s * (back + m)).toFixed(4)} * (100% + ${px(g)}) / ${N} - ${px(s * m * g)})`
  const ticks = Array.from({ length: N / 3 }, (_, j) => ({ x: (j * 3) / N, text: hour.format(new Date(start.getTime() + j * 3 * 3600e3)) }))
  el.innerHTML = `
    ${head('Today, from this minute', `<b>${time.format(at)}</b>`)}
    <div class="vn${env.narrow ? ' is-narrow' : ''}">
      <span class="vz-lab vn-ahead" style="left:calc(${((back + 1) / N) * 100}% + 4px)">Every hour online</span>
      <div class="vn-rib" style="gap:${px(g)}">${cells.join('')}<b class="vn-mark"><span class="vz-lab vn-tag">Now</span></b></div>
      ${axis(ticks, env.w, env, 'vn-axis')}
    </div>`
  const vn = el.querySelector('.vn')!
  const fut = [...el.querySelectorAll('.vn-h.fut')]
  const mark = el.querySelector<HTMLElement>('.vn-mark')!
  const land = (e: number) => easeOut(span(0, 0.22, e))
  return {
    lead: [0, 1],
    frame(p, e) {
      const s = land(e)
      mark.style.left = markAt(s)
      mark.classList.toggle('on', e > 0)
      mark.classList.toggle('is-down', s >= 1)
      lightFirst(fut, Math.round(span(0.24, 0.95, e) * fut.length))
      vn.classList.toggle('lit', e > 0.35)
    },
    key: (p, e) => land(e) >= 1,
    live: true,
  }
}

/* ---------------------------------------------------------------- 24/7
   Seven days by twenty-four hours, every one lit by one pass of a scan: hour by
   hour, each day a beat behind the one above. Each day's lit row is painted
   once and revealed by a clip. The viewer's own weekday and hour is ringed. */
const always: Builder<'always'> = (el, o, env) => {
  const days = env.narrow ? ['M', 'T', 'W', 'T', 'F', 'S', 'S'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const at = new Date()
  const today = (at.getDay() + 6) % 7
  const hr = at.getHours()
  const BEAT = 0.14
  // (the day labels' column and its gap, as in stat.css)
  const grid = env.w - (env.narrow ? 18 + 8 : 34 + 12) * env.u
  const g = env.narrow ? denseGap(grid / 24) : 3 * env.u
  const rows = days.map(
    (_, r) =>
      `<div class="va-row">${'<i></i>'.repeat(24)}<div class="va-lit">${Array.from({ length: 24 }, (_, h) => `<i${r === today && h === hr ? ' class="is-now"' : ''} style="--c:${env.neon(h / 23)}"></i>`).join('')}</div></div>`,
  )
  const hours = [0, 6, 12, 18, 24].map(h => ({ x: h / 24, text: `${String(h).padStart(2, '0')}:00` }))
  el.innerHTML = `
    ${head('Every hour of every day', `<b class="vz-num">0</b> of 168 hours`)}
    <div class="va${env.narrow ? ' is-narrow' : ''}" style="--g:${px(g)}">
      <span></span>${axis(hours, grid, env)}
      <div class="va-days vz-lab">${days.map(d => `<span>${d}</span>`).join('')}</div>
      <div class="va-rows">${rows.join('')}<i class="va-scan"></i></div>
    </div>
    <div class="vz-foot"><span class="vz-key"><i class="vz-chip is-ring"></i>This hour, where you are</span></div>`
  const lits = [...el.querySelectorAll<HTMLElement>('.va-lit')]
  const shown = lits.map(() => -1)
  const reach = 14 * env.u
  const scan = el.querySelector<HTMLElement>('.va-scan')!
  const num = el.querySelector('.vz-num')!
  const sweep = (p: number) => p * (24 + (days.length - 1) * BEAT)
  const litIn = (x: number, r: number) => Math.max(0, Math.min(24, whole(x - r * BEAT + 0.5)))
  return {
    lead: [1, 0.5],
    frame(p) {
      const x = sweep(p)
      let total = 0
      lits.forEach((row, r) => {
        const k = litIn(x, r)
        total += k
        if (k !== shown[r]) row.style.clipPath = reveal((shown[r] = k), 24, g, reach, 'across')
      })
      num.textContent = String(total)
      scan.style.left = `${Math.min(100, (x / 24) * 100).toFixed(2)}%`
      scan.style.opacity = p > 0 && p < 0.985 ? '1' : '0'
    },
    // the word strikes as the sweep completes Monday
    key: p => litIn(sweep(p), 0) >= 24,
  }
}

/* ---------------------------------------------------------------- 1 in 4
   Figures in groups of `every`, all the same simple shape (no disability
   icon); one in each group strikes on as a neon figure. A phone draws one
   large group instead of three small ones. */
const people: Builder<'people'> = (el, o, env) => {
  const G = o.every
  const groups = env.narrow ? 1 : 3
  const where = [1, 3, 0, 2] // which figure in each group is lit (it varies)
  const body = 'M4 98 V60 C4 46 11 38 22 38 C33 38 40 46 40 60 V98'
  const shape = (cls: string) => `<circle class="${cls}" cx="22" cy="17" r="11"/><path class="${cls}" d="${body}"/>`
  const fig = (lit: boolean, c: string) =>
    `<div class="vf-fig${lit ? ' is-lit' : ''}" style="--c:${c}"><svg viewBox="0 0 44 100" preserveAspectRatio="xMidYMax meet"><g class="base">${shape('')}</g>${
      lit ? `<g class="lit"><circle class="fill" cx="22" cy="17" r="11"/><path class="fill" d="${body} Z"/>${['halo', 'bloom', 'tube', 'core'].map(k => shape(`tb-${k}`)).join('')}</g>` : ''
    }</svg></div>`
  const html = Array.from(
    { length: groups },
    (_, gi) => `<div class="vf-g">${Array.from({ length: G }, (_, i) => fig(i === where[gi % where.length] % G, env.neon(groups > 1 ? gi / (groups - 1) : 0))).join('')}</div>`,
  )
  el.innerHTML = `${head('American adults', `<span class="vf-read"><b class="vz-num">1</b> in every ${G}</span>`)}<div class="vf${env.narrow ? ' is-narrow' : ''}">${html.join('')}</div>`
  const figs = [...el.querySelectorAll('.vf-fig')]
  const lit = figs.filter(x => x.classList.contains('is-lit'))
  const read = el.querySelector('.vf-read')!
  const on = (e: number) => lit.filter((_, i) => e >= 0.42 + i * 0.2).length
  return {
    lead: [0, 1],
    frame(p, e) {
      lightFirst(figs, Math.round(span(0, 0.4, e) * figs.length), 'in')
      const k = on(e)
      lightFirst(lit, k)
      read.classList.toggle('is-dim', k === 0)
    },
    // the words strike with the first lit figure
    key: (p, e) => on(e) > 0,
  }
}

const PICTURES: { [K in Kind]: Builder<K> } = { years, week, panes, flow, serp, bounce, returned, flight, now, always, people, tiles }

/** draw `viz` into `el` for env.w (replacing whatever was there) */
export function draw(el: HTMLElement, viz: StatViz, env: Env, value: string): Picture {
  return (PICTURES[viz.kind] as (el: HTMLElement, o: StatViz, env: Env, value: string) => Picture)(el, viz, env, value)
}
