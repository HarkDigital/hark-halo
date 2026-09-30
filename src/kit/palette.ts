/*
 * The LIGHTS: the neon palette (the only saturated light in the room). Six
 * options, all kept so they can be compared (there is no switch on the page;
 * add ?lights=N to a URL to preview one):
 *
 *   Option 1  the original Halo: electric cyan / electric violet / hot magenta
 *   Option 2  Ember: amber / neon red / hot pink
 *   Option 3  Aurora: neon green / electric blue / electric purple (the site's)
 *   Option 4  White: white neon only (a whisper of cool and warm between the three)
 *   Option 5  Bar: turquoise / orange drifting to deep red / yellow (tubes shift between
 *             lighter and darker stretches along their length)
 *   Option 6  blue / lime / hot pink (a subtler light-to-dark drift)
 *
 * a = loop A (and the first neon of a set), b = loop B, c = the diamond (a third accent).
 * Chosen once at boot (every neon material is built with its colour): ?lights=N
 * for that page only, else DEFAULT_LIGHTS. Nothing is remembered.
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

/** an option from the URL (?name=N), this page only */
function fromUrl<T extends { id: number }>(name: string, list: T[]): T | undefined {
  try {
    const q = Number(new URLSearchParams(location.search).get(name))
    return list.find(l => l.id === q)
  } catch {
    return undefined
  }
}
// (the page used to remember a switched option; the switches are gone, so forget it)
try {
  for (const k of ['hark-halo:lights', 'hark-halo:logo']) localStorage.removeItem(k)
} catch {
  /* storage blocked */
}

function pick(): Lights {
  return fromUrl('lights', LIGHTS) ?? LIGHTS.find(l => l.id === DEFAULT_LIGHTS)!
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

/*
 * The LOGO: how the story's mark (hero, process, contact) is made. Option 2 is
 * the site's; ?logo=1 previews the frosted one on that page.
 *
 *   Option 1  Frosted: the mark in frosted glass, the neon mark behind it
 *   Option 2  Tube: the mark IS the neon, a tube down the middle of each band,
 *             encased in a clear glass tube as wide as the band (the site's)
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
export const DEFAULT_LOGO = 2

/** the mark this page was built with */
export const LOGO: LogoStyle =
  (typeof window === 'undefined' ? undefined : fromUrl('logo', LOGO_STYLES)) ?? LOGO_STYLES.find(l => l.id === DEFAULT_LOGO)!
