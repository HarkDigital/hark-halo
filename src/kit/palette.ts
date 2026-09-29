/*
 * The LIGHTS: the neon palette (the only saturated light in the room). Three
 * options, all kept so they can be compared and switched back:
 *
 *   Option 1  the original Halo: electric cyan / electric violet / hot magenta
 *   Option 2  Ember: amber / neon red / hot pink (the default)
 *   Option 3  Aurora: neon green / electric blue / acid lime
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
}

export const LIGHTS: Lights[] = [
  { id: 1, name: 'Option 1', a: '#00e1ff', b: '#a32cff', c: '#ff2bd1' },
  { id: 2, name: 'Option 2', a: '#ffa51f', b: '#ff3326', c: '#ff2f8f' },
  { id: 3, name: 'Option 3', a: '#27ff86', b: '#2f78ff', c: '#d9ff30' },
]
export const DEFAULT_LIGHTS = 2

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
}

/** switch to another option: remember it and reload, resuming at `progress` (0..1 through the story) */
export function switchLights(id: number, progress?: number) {
  try {
    localStorage.setItem(KEY, String(id))
    if (progress !== undefined) sessionStorage.setItem(RESUME_KEY, String(progress))
  } catch {
    /* storage blocked: the URL still carries it */
  }
  const url = new URL(location.href)
  url.searchParams.set('lights', String(id))
  location.replace(url.toString())
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
