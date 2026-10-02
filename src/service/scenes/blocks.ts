import { NA, NC, P, type Scene } from './kit'

interface Block {
  sx: number
  sy: number
  w: number
  h: number
  x: number
  y: number
  vx: number
  vy: number
  state: 'flying' | 'set' | 'loose'
  age: number
}
interface Pulse {
  x: number
  y: number
  w: number
  h: number
  age: number
}

/*
 * WORDPRESS — content blocks assembling into a page. A block flies in lit,
 * snaps home in a flash and cools to clear glass; every so often one pops
 * loose (in the third colour) and gets snapped back. Move the cursor to
 * shove blocks around; they always find their way home.
 */
export function blocks(): Scene {
  let list: Block[] = []
  let pulses: Pulse[] = []
  let popAcc = 0

  const fling = (b: Block, w: number, h: number) => {
    // respawn just outside a random edge, flying back to its slot
    const edge = Math.floor(Math.random() * 4)
    b.x = edge === 0 ? -b.w - 20 : edge === 1 ? w + 20 : Math.random() * w
    b.y = edge === 2 ? -b.h - 20 : edge === 3 ? h + 20 : Math.random() * h
    b.vx = 0
    b.vy = 0
    b.state = 'flying'
    b.age = 0
  }

  return {
    init(w, h, framed) {
      // a page layout: header, hero, text bars, three cards, footer (framed: inside the
      // band too, its height at most 0.7 of it)
      const pw = Math.min(w * 0.76, 560, framed ? (h * 0.7) / 0.68 : Infinity)
      const u = pw / 100
      const ph = 68 * u
      const px = (w - pw) / 2
      const py = (h - ph) / 2
      const cardW = 30 * u
      const cardY = py + 42 * u
      const slots: [number, number, number, number][] = [
        [px, py, 8 * u, 8 * u],
        [px + 12 * u, py + 2 * u, 44 * u, 4 * u],
        [px + pw - 24 * u, py + 1.5 * u, 24 * u, 5 * u],
        [px, py + 14 * u, 58 * u, 9 * u],
        [px, py + 26 * u, 44 * u, 4.5 * u],
        [px, py + 33 * u, 24 * u, 5 * u],
        [px, cardY, cardW, 17 * u],
        [px + 35 * u, cardY, cardW, 17 * u],
        [px + 70 * u, cardY, cardW, 17 * u],
        [px, py + 63 * u, pw, 5 * u],
      ]
      list = slots.map(([sx, sy, bw, bh]) => {
        const b: Block = { sx, sy, w: bw, h: bh, x: sx, y: sy, vx: 0, vy: 0, state: 'flying', age: 0 }
        fling(b, w, h)
        return b
      })
      pulses = []
      popAcc = -1.5 // let the first assembly finish before popping blocks
    },

    frame(pen, w, h, pointer, dt) {
      // every few seconds a settled block pops loose
      popAcc += dt
      if (popAcc > 2.4) {
        popAcc = 0
        const set = list.filter(b => b.state === 'set')
        if (set.length > list.length - 2) {
          const b = set[Math.floor(Math.random() * set.length)]
          const a = Math.random() * Math.PI * 2
          b.state = 'loose'
          b.age = 0
          b.vx = Math.cos(a) * 260
          b.vy = Math.sin(a) * 260 - 120
        }
      }

      for (const b of list) {
        b.age += dt
        if (b.state === 'flying') {
          // ease home, snap when close
          const k = Math.min(1, dt * 3.2)
          b.x += (b.sx - b.x) * k
          b.y += (b.sy - b.y) * k
          if (Math.hypot(b.sx - b.x, b.sy - b.y) < 1.2) {
            b.x = b.sx
            b.y = b.sy
            b.state = 'set'
            b.age = 0
            pulses.push({ x: b.sx, y: b.sy, w: b.w, h: b.h, age: 0 })
          }
        } else if (b.state === 'loose') {
          b.vy += 300 * dt // a little gravity, like a dropped part
          b.x += b.vx * dt
          b.y += b.vy * dt
          if (b.age > 0.75) fling(b, w, h)
        }

        // the cursor shoves settled blocks; they spring back home
        let ox = 0
        let oy = 0
        if (b.state === 'set' && pointer.inside) {
          const cx = b.x + b.w / 2
          const cy = b.y + b.h / 2
          const d = Math.hypot(cx - pointer.x, cy - pointer.y)
          const R = 130
          if (d < R && d > 0.001) {
            const f = ((R - d) / R) * 26
            ox = ((cx - pointer.x) / d) * f
            oy = ((cy - pointer.y) / d) * f
          }
        }

        const x = b.x + ox
        const y = b.y + oy
        const shape = P.rect(x, y, b.w, b.h)
        if (b.state === 'loose') pen.neon(shape, NC, Math.max(0, 0.9 - b.age * 1.1), 1.8)
        else if (b.state === 'flying') pen.neon(shape, NA, 0.9, 1.8)
        else {
          // set: the light cools into clear glass
          const cool = Math.min(1, b.age / 0.6)
          pen.neon(shape, NA, 0.9 * (1 - cool) + 0.24, 1.8)
          pen.glass(shape, 0.12 + cool * 0.2, 4)
        }
        // faint content lines in the larger blocks
        if (b.h > 20 && b.w > 40) {
          const lines = new Path2D()
          lines.moveTo(x + b.w * 0.12, y + b.h * 0.62)
          lines.lineTo(x + b.w * 0.88, y + b.h * 0.62)
          lines.moveTo(x + b.w * 0.12, y + b.h * 0.78)
          lines.lineTo(x + b.w * 0.6, y + b.h * 0.78)
          pen.glass(lines, 0.16, 3)
        }
      }

      // snap flashes
      pulses = pulses.filter(p => p.age < 0.55)
      for (const p of pulses) {
        p.age += dt
        const q = p.age / 0.55
        const g = 4 + q * 18
        pen.neon(P.rect(p.x - g, p.y - g, p.w + g * 2, p.h + g * 2), NA, (1 - q) * 0.75, 1.5)
      }
    },
  }
}
