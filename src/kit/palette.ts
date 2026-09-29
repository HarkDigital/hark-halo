/*
 * The LIGHTS: the neon palette (the only saturated light in the room). Six
 * options, all kept so they can be compared and switched back:
 *
 *   Option 1  the original Halo: electric cyan / electric violet / hot magenta
 *   Option 2  Ember: amber / neon red / hot pink
 *   Option 3  Aurora: neon green / electric blue / electric purple (the default)
 *   Option 4  White: white neon only (a whisper of cool and warm between the three)
 *   Option 5  Bar: turquoise / orange drifting to deep red / yellow (tubes shift between
 *             lighter and darker stretches along their length)
 *   Option 6  blue / lime / hot pink (a subtler light-to-dark drift)
 *
 * a = loop A (and the first neon of a set), b = loop B, c = the diamond (a third accent).
 * Chosen once at boot: ?lights=N (remembered), else the remembered choice,
 * else DEFAULT_LIGHTS. Switching reloads the page (every neon material is
 * built with its colour), resuming where the visitor was.
 */

export interface Lights {
  id: number
  name: string
  a: string
  b: string
  c: string
  /**
   * optional darker tones: a tube drifts between its light and its tone along
   * its length (lighter and darker stretches, like real flex neon)
   */
  aTone?: string
  bTone?: string
  cTone?: string
  /** how far the tubes drift to their tones, 0..1 (default 1) */
  drift?: number
}

export const LIGHTS: Lights[] = [
  { id: 1, name: 'Option 1', a: '#00e1ff', b: '#a32cff', c: '#ff2bd1' },
  { id: 2, name: 'Option 2', a: '#ffa51f', b: '#ff3326', c: '#ff2f8f' },
  { id: 3, name: 'Option 3', a: '#27ff86', b: '#2f78ff', c: '#b24bff' },
  { id: 4, name: 'Option 4', a: '#ffffff', b: '#f3f7ff', c: '#fff8f0' },
  { id: 5, name: 'Option 5', a: '#35d3f2', aTone: '#1f96ff', b: '#ffa42a', bTone: '#ff2f1c', c: '#ffd62e', cTone: '#ff8d1a' },
  { id: 6, name: 'Option 6', a: '#0080ff', aTone: '#0048ff', b: '#80ff00', bTone: '#2fd400', c: '#ff0080', cTone: '#e0004a', drift: 0.55 },
]
export const DEFAULT_LIGHTS = 3

const KEY = 'hark-halo:lights'
const RESUME_KEY = 'hark-halo:resume'

function pick(): Lights {
  const byId = (id: number) => LIGHTS.find(l => l.id === id)
  try {
    const q = new URLSearchParams(location.search).get('lights')
    if (q && byId(Number(q))) {
      localStorage.setItem(KEY, q)
      return byId(Number(q))!
    }
    const saved = Number(localStorage.getItem(KEY))
    if (byId(saved)) return byId(saved)!
  } catch {
    /* storage blocked: the default */
  }
  return byId(DEFAULT_LIGHTS)!
}

/** the palette this page was built with */
export const ACTIVE: Lights = typeof window === 'undefined' ? LIGHTS[DEFAULT_LIGHTS - 1] : pick()

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
}

/** CSS tokens for the DOM: --neon-a/b/c and their rgb triplets (for rgba(var(--neon-a-rgb), α)) */
export function applyLightsCss(root: HTMLElement = document.documentElement) {
  for (const k of ['a', 'b', 'c'] as const) {
    root.style.setProperty(`--neon-${k}`, ACTIVE[k])
    root.style.setProperty(`--neon-${k}-rgb`, rgb(ACTIVE[k]))
  }
  root.dataset.lights = String(ACTIVE.id)
  root.dataset.logo = LOGO.kind
}

/** switch to another option: remember it and reload, resuming at `progress` (0..1 through the story) */
export function switchLights(id: number, progress?: number) {
  reloadWith('lights', KEY, id, progress)
}

/** remember an option (and where the visitor is), then reload with it in the URL */
function reloadWith(param: string, key: string, id: number, progress?: number) {
  try {
    localStorage.setItem(key, String(id))
    if (progress !== undefined) sessionStorage.setItem(RESUME_KEY, String(progress))
  } catch {
    /* storage blocked: the URL still carries it */
  }
  const url = new URL(location.href)
  url.searchParams.set(param, String(id))
  location.replace(url.toString())
}

/*
 * The HERO LOGO: how the mark in the hero is made. Chosen like the lights
 * (?logo=N, remembered; switching reloads where the visitor was).
 *
 *   Option 1  Frosted: the mark in frosted glass, the neon mark behind it (the default)
 *   Option 2  Tube: the mark IS the neon, a tube down the middle of each band,
 *             encased in a clear glass tube as wide as the band
 */
export interface LogoStyle {
  id: number
  kind: 'frost' | 'tube'
  name: string
}
export const LOGO_STYLES: LogoStyle[] = [
  { id: 1, kind: 'frost', name: 'Frost' },
  { id: 2, kind: 'tube', name: 'Tube' },
]
const LOGO_KEY = 'hark-halo:logo'

function pickLogo(): LogoStyle {
  const byId = (id: number) => LOGO_STYLES.find(l => l.id === id)
  try {
    const q = new URLSearchParams(location.search).get('logo')
    if (q && byId(Number(q))) {
      localStorage.setItem(LOGO_KEY, q)
      return byId(Number(q))!
    }
    const saved = Number(localStorage.getItem(LOGO_KEY))
    if (byId(saved)) return byId(saved)!
  } catch {
    /* storage blocked: the default */
  }
  return LOGO_STYLES[0]
}

/** the hero logo this page was built with */
export const LOGO: LogoStyle = typeof window === 'undefined' ? LOGO_STYLES[0] : pickLogo()

export function switchLogo(id: number, progress?: number) {
  reloadWith('logo', LOGO_KEY, id, progress)
}

/** where to resume after a lights switch (read once) */
export function takeResume(): number | null {
  try {
    const v = sessionStorage.getItem(RESUME_KEY)
    if (v === null) return null
    sessionStorage.removeItem(RESUME_KEY)
    const p = parseFloat(v)
    return Number.isFinite(p) ? p : null
  } catch {
    return null
  }
}
