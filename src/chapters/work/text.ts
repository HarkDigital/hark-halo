import * as THREE from 'three'

/*
 * Etched text for the Carousel: each leaf's lower glass carries its lot
 * number and name, sandblasted into the glass. Canvas textures (white glyphs,
 * alpha) sampled by the leaf's face shader; repainted once Schibsted Grotesk
 * has actually loaded so the glyphs are the real faces.
 */

export const SANS = "'Schibsted Grotesk Variable', 'Schibsted Grotesk', system-ui, sans-serif"

let fontsPromise: Promise<void> | null = null

/** Resolves once the faces are loaded (or after 5s, whichever is first). */
export function fontsReady(): Promise<void> {
  if (fontsPromise) return fontsPromise
  const f = typeof document !== 'undefined' ? document.fonts : undefined
  if (!f || typeof f.load !== 'function') return (fontsPromise = Promise.resolve())
  fontsPromise = Promise.race([
    Promise.all([f.load(`700 48px ${SANS}`), f.load(`400 48px ${SANS}`)]).then(() => undefined),
    new Promise<void>(r => window.setTimeout(r, 5000)),
  ]).catch(() => undefined)
  return fontsPromise
}

/** Draw `text` with manual tracking (canvas letterSpacing is missing in Safari 15). Returns the drawn width. */
export function spaced(g: CanvasRenderingContext2D, text: string, x: number, y: number, tracking: number, measureOnly = false): number {
  let cx = x
  const chars = Array.from(text)
  chars.forEach((ch, i) => {
    if (!measureOnly) g.fillText(ch, cx, y)
    cx += g.measureText(ch).width + (i < chars.length - 1 ? tracking : 0)
  })
  return cx - x
}

/** A transparent canvas texture repainted when the fonts arrive. */
export function paintedTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void): THREE.CanvasTexture {
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  const g = cv.getContext('2d')!
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  const paint = () => {
    g.clearRect(0, 0, w, h)
    g.fillStyle = '#ffffff'
    g.textBaseline = 'alphabetic'
    draw(g, w, h)
    tex.needsUpdate = true
  }
  paint()
  fontsReady().then(paint)
  return tex
}

/** Aspect (w / h) of the lot label canvas. */
export const LABEL_PX = { w: 1024, h: 300 }

/**
 * A leaf's etched lot label: a big light numeral, then the name (and a
 * PREVIEW mark for a pre-launch build) with the industry beneath it.
 */
export function lotLabel(num: string, name: string, industry: string, preview: boolean): THREE.CanvasTexture {
  return paintedTexture(LABEL_PX.w, LABEL_PX.h, (g, w, h) => {
    // the numeral: tall, light, tight
    g.font = `300 250px ${SANS}`
    g.globalAlpha = 0.92
    const nw = spaced(g, num, 4, h - 26, -8)
    // a hairline between numeral and name
    const x = nw + 44
    g.globalAlpha = 0.5
    g.fillRect(x, h - 196, 2, 150)
    const tx = x + 30
    g.globalAlpha = 1
    g.font = `700 40px ${SANS}`
    const room = w - tx - 8
    const title = name.toUpperCase()
    const tw = spaced(g, title, 0, 0, 5, true)
    if (tw > room) {
      g.save()
      g.translate(tx, h - 128)
      g.scale(room / tw, 1)
      spaced(g, title, 0, 0, 5)
      g.restore()
    } else spaced(g, title, tx, h - 128, 5)
    g.font = `500 28px ${SANS}`
    g.globalAlpha = 0.72
    const sub = preview ? `${industry.toUpperCase()}  ·  PREVIEW` : industry.toUpperCase()
    const sw = spaced(g, sub, 0, 0, 4, true)
    if (sw > room) {
      g.save()
      g.translate(tx, h - 70)
      g.scale(room / sw, 1)
      spaced(g, sub, 0, 0, 4)
      g.restore()
    } else spaced(g, sub, tx, h - 70, 4)
  })
}
