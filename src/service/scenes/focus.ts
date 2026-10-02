import { NA, P, type Scene } from './kit'

interface Box {
  x: number
  y: number
  w: number
  h: number
  /** the brand diamond instead of a rect */
  diamond?: boolean
}
interface Ripple {
  box: Box
  age: number
}

const ease = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2)
const lerp = (a: number, b: number, p: number) => a + (b - a) * p

/*
 * ADA ACCESSIBILITY — a keyboard focus ring tabbing through a page wireframe
 * of clear glass. The ring is a neon tube that eases from element to element,
 * each one washing with light and announcing itself in a ripple as it takes
 * focus. Point at an element to send focus there.
 */
export function focus(): Scene {
  let boxes: Box[] = []
  let ripples: Ripple[] = []
  let cur = 0
  let target = 0
  let progress = 1
  let dwell = 0

  const shape = (b: Box, grow = 0) => (b.diamond ? P.diamond(b.x + b.w / 2, b.y + b.h / 2, b.w * 0.72 + grow) : P.rect(b.x - grow / 2, b.y - grow / 2, b.w + grow, b.h + grow))

  return {
    init(w, h, framed) {
      // a page wireframe, centred and sized to the art (framed: inside the band too, its
      // height at most 0.7 of it, so the faded edges leave the focus ring clear)
      const pw = Math.min(w * 0.76, 560, framed ? (h * 0.7) / 0.66 : Infinity)
      const u = pw / 100
      const ph = 66 * u
      const px = (w - pw) / 2
      const py = (h - ph) / 2
      const cardW = 30 * u
      const cardY = py + 48 * u
      boxes = [
        { x: px, y: py, w: 7 * u, h: 7 * u, diamond: true },
        { x: px + pw - 32 * u, y: py + 1.5 * u, w: 14 * u, h: 4.5 * u },
        { x: px + pw - 15 * u, y: py + 1.5 * u, w: 15 * u, h: 4.5 * u },
        { x: px, y: py + 17 * u, w: 54 * u, h: 8 * u },
        { x: px, y: py + 28.5 * u, w: 42 * u, h: 4.5 * u },
        { x: px, y: py + 37.5 * u, w: 20 * u, h: 6.5 * u },
        { x: px, y: cardY, w: cardW, h: 18 * u },
        { x: px + 35 * u, y: cardY, w: cardW, h: 18 * u },
        { x: px + 70 * u, y: cardY, w: cardW, h: 18 * u },
      ]
      ripples = []
      cur = 0
      target = 1
      progress = 0
      dwell = 0
    },

    frame(pen, w, h, pointer, dt, t) {
      // the cursor pulls focus to whatever element it is nearest
      let nearest = -1
      if (pointer.inside) {
        let best = Math.min(w, h) * 0.3
        for (let i = 0; i < boxes.length; i++) {
          const b = boxes[i]
          const d = Math.hypot(pointer.x - (b.x + b.w / 2), pointer.y - (b.y + b.h / 2))
          if (d < best) {
            best = d
            nearest = i
          }
        }
      }

      if (progress < 1) {
        progress = Math.min(1, progress + dt / 0.4)
        if (progress >= 1) {
          dwell = 0
          ripples.push({ box: boxes[target], age: 0 })
        }
      } else {
        dwell += dt
        if (nearest >= 0 && nearest !== target) {
          cur = target
          target = nearest
          progress = 0
        } else if (nearest === target) {
          dwell = 0 // focus holds while the cursor rests on an element
        } else if (dwell > 1.05) {
          cur = target
          target = (target + 1) % boxes.length
          progress = 0
        }
      }

      // the page, in clear glass (the focused element washes with light)
      const glass = new Path2D()
      for (let i = 0; i < boxes.length; i++) {
        const b = boxes[i]
        const s = shape(b)
        glass.addPath(s)
        if (progress >= 1 && i === target) pen.wash(s, NA, 0.1)
        // faint text lines in the cards
        if (i >= boxes.length - 3) {
          glass.moveTo(b.x + b.w * 0.12, b.y + b.h * 0.62)
          glass.lineTo(b.x + b.w * 0.88, b.y + b.h * 0.62)
          glass.moveTo(b.x + b.w * 0.12, b.y + b.h * 0.78)
          glass.lineTo(b.x + b.w * 0.62, b.y + b.h * 0.78)
        }
      }
      pen.glass(glass, 0.32, 4)

      // announcement ripples where focus lands
      ripples = ripples.filter(r => r.age < 0.65)
      for (const r of ripples) {
        r.age += dt
        const q = r.age / 0.65
        const g = q * 26
        const b = r.box
        pen.neon(P.rrect(b.x - 5 - g, b.y - 5 - g, b.w + (5 + g) * 2, b.h + (5 + g) * 2, 8), NA, (1 - q) * 0.6, 1.4)
      }

      // the focus ring, easing between elements
      const a = boxes[cur]
      const b = boxes[target]
      const p = ease(progress)
      const pad = 6 + Math.sin(t * 3) * 1.2
      pen.tube(P.rrect(lerp(a.x, b.x, p) - pad, lerp(a.y, b.y, p) - pad, lerp(a.w, b.w, p) + pad * 2, lerp(a.h, b.h, p) + pad * 2, 8), NA, 1, 2.4)
    },
  }
}
