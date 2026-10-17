import { NA, NB, NC, P, WHITE, rgba, strike, type RGB, type Scene } from './kit'

interface Card {
  /** its place in the feed (unscrolled px) */
  y: number
  /** lit (arriving, tapped, the hand), cools to glass */
  heat: number
  col: RGB
  /** 0 a post of text, 1 a picture with a caption */
  kind: number
  /** a slide in from the side (a tab change), easing home */
  shift: number
  seed: number
}
interface Tap {
  x: number
  y: number
  age: number
  col: RGB
}
interface Note {
  age: number
  seed: number
}

const hash = (n: number) => {
  const x = Math.sin(n * 12.9898) * 43758.5453
  return x - Math.floor(x)
}
const easeOut = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3)

/*
 * APP DEVELOPMENT — a phone in the hand. A handset of glass standing right of
 * centre with an app alive on its screen: a feed of cards scrolling up, each
 * arriving lit and cooling to clear glass; a tab bar whose lit tab moves as
 * the app is tapped through (the feed slides in afresh); notifications that
 * drop in at the top in the third colour and slide away. The cursor is the
 * thumb: over the screen the feed runs with it (low on the screen it hurries,
 * high up it eases back), the card under it warms, and a press is a tap, a
 * ring of light where it lands. Off the screen the phone leans toward the
 * hand, its sheen sliding on the glass.
 */
export function handset(): Scene {
  // the phone, its screen, and the feed inside it
  let px = 0, py = 0, PW = 0, PH = 0
  let sx = 0, sy = 0, SW = 0, SH = 0
  let feedTop = 0, feedBot = 0, ch = 0, gap = 0
  let cards: Card[] = []
  let taps: Tap[] = []
  let notes: Note[] = []
  let scroll = 0
  let vel = 14
  let tab = 0
  let dir = 1
  let tabT = 0, tapT = 0, noteT = 0
  let lean = 0, leanY = 0
  let wasDown = false
  let lastY = 0
  let serial = 0

  const card = (y: number, lit: boolean): Card => {
    const seed = serial++
    return { y, heat: lit ? 1 : 0, col: NA, kind: hash(seed + 0.7) < 0.35 ? 1 : 0, shift: 0, seed }
  }
  const tap = (x: number, y: number, col: RGB) => {
    taps.push({ x, y, age: 0, col })
    for (const c of cards) {
      const cy = c.y - scroll
      if (y >= cy && y <= cy + ch) {
        c.heat = 1
        c.col = col
      }
    }
  }

  return {
    init(w, h, framed) {
      // beside the copy on a laptop the hero's scrim darkens the art's left edge: the phone stands a
      // little right of centre there; centred in a band on a tablet; above the copy on a phone it
      // keeps clear of the header over the box's top and the copy over its foot
      const side = !framed && w > 600
      PH = Math.min(h * (framed ? 0.9 : side ? 0.8 : 0.62), (side ? 0.5 : 0.62) * w * 2.05)
      PW = PH / 2.05
      px = w / 2 + (side ? w * 0.08 : 0) - PW / 2
      py = (h - PH) / 2
      const b = PW * 0.045
      sx = px + b
      sy = py + b
      SW = PW - 2 * b
      SH = PH - 2 * b
      feedTop = sy + SH * 0.165
      feedBot = sy + SH * 0.905
      ch = SH * 0.135
      gap = SH * 0.028
      cards = []
      serial = 0
      const n = Math.ceil((feedBot - feedTop) / (ch + gap)) + 2
      for (let k = 0; k < n; k++) cards.push(card(feedTop + k * (ch + gap), false))
      scroll = 0
      vel = 14
      taps = []
      notes = []
      tab = 0
      dir = 1
      tabT = 3.2
      tapT = 1.4
      noteT = 2.2
      lean = leanY = 0
      wasDown = false
    },

    frame(pen, w, h, pointer, dt, t) {
      const { ctx, glow } = pen
      const inScreen = pointer.inside && pointer.x > sx && pointer.x < sx + SW && pointer.y > sy && pointer.y < sy + SH
      const r = PW * 0.16

      // ---- the hand off the screen: the phone leans toward it (a parallax, eased)
      const off = pointer.inside && !inScreen
      const wantX = off ? Math.max(-1, Math.min(1, (pointer.x - (px + PW / 2)) / (w * 0.5))) * 10 : 0
      const wantY = off ? Math.max(-1, Math.min(1, (pointer.y - (py + PH / 2)) / (h * 0.5))) * 6 : 0
      lean += (wantX - lean) * Math.min(1, dt * 4)
      leanY += (wantY - leanY) * Math.min(1, dt * 4)
      ctx.save()
      glow.save()
      ctx.translate(lean, leanY)
      glow.translate(lean, leanY)

      // ---- the body: a slab of glass with a sheen that slides as it leans
      const body = P.rrect(px, py, PW, PH, r)
      ctx.fillStyle = rgba(WHITE, 0.022)
      ctx.fill(body)
      ctx.save()
      ctx.clip(body)
      const sh = lean * 3
      ctx.beginPath()
      ctx.moveTo(px + PW * 0.12 + sh, py)
      ctx.lineTo(px + PW * 0.4 + sh, py)
      ctx.lineTo(px + PW * 0.02 + sh, py + PH)
      ctx.lineTo(px - PW * 0.26 + sh, py + PH)
      ctx.closePath()
      ctx.fillStyle = rgba(WHITE, 0.028)
      ctx.fill()
      ctx.restore()
      pen.glass(body, 0.3, 4)
      // the buttons on its edges
      const side = new Path2D()
      side.moveTo(px - 2, py + PH * 0.2)
      side.lineTo(px - 2, py + PH * 0.235)
      side.moveTo(px - 2, py + PH * 0.27)
      side.lineTo(px - 2, py + PH * 0.325)
      side.moveTo(px - 2, py + PH * 0.345)
      side.lineTo(px - 2, py + PH * 0.4)
      side.moveTo(px + PW + 2, py + PH * 0.27)
      side.lineTo(px + PW + 2, py + PH * 0.35)
      pen.glass(side, 0.3, 2)

      // ---- the screen, and everything on it
      const screen = P.rrect(sx, sy, SW, SH, r * 0.75)
      pen.glass(screen, 0.12, 2)
      ctx.save()
      glow.save()
      ctx.clip(screen)
      glow.clip(screen)

      // the island at the top, and a header: a title and an avatar
      pen.glass(P.rrect(sx + SW * 0.36, sy + SH * 0.012, SW * 0.28, SH * 0.024, 99), 0.22, 2)
      ctx.fillStyle = rgba(WHITE, 0.3)
      ctx.fillRect(sx + SW * 0.07, sy + SH * 0.085, SW * 0.36, Math.max(1.5, SH * 0.02))
      pen.glass(P.circle(sx + SW * 0.885, sy + SH * 0.095, SH * 0.022), 0.3, 2)
      pen.glass(P.line(sx + SW * 0.07, feedTop - gap * 1.2, sx + SW * 0.93, feedTop - gap * 1.2), 0.1, 2)

      // ---- the thumb on the feed: a drag follows the finger, a press taps; a hover runs the feed
      let drag = false
      if (inScreen && pointer.down) {
        if (wasDown) {
          const dy = pointer.y - lastY
          scroll -= dy
          vel = -dy / Math.max(dt, 1e-3)
        } else tap(pointer.x, pointer.y, NB)
        drag = true
      } else if (inScreen) {
        const k = (pointer.y - (sy + SH * 0.55)) / (SH * 0.45)
        vel += (14 + k * 70 - vel) * Math.min(1, dt * 3)
      } else vel += (14 - vel) * Math.min(1, dt * 1.5)
      wasDown = inScreen && pointer.down
      lastY = pointer.y
      if (!drag) scroll += vel * dt

      // ---- the app on its own: a tap on a card now and then, a tab change that brings a fresh feed
      if (!inScreen) {
        tapT -= dt
        if (tapT <= 0) {
          const seen = cards.filter(c => c.y - scroll > feedTop && c.y - scroll + ch < feedBot)
          if (seen.length) {
            const c = seen[Math.floor(Math.random() * seen.length)]
            tap(sx + SW * (0.2 + Math.random() * 0.6), c.y - scroll + ch * (0.3 + Math.random() * 0.4), NB)
          }
          tapT = 1.8 + Math.random() * 1.6
        }
      }
      tabT -= dt
      if (tabT <= 0) {
        tab = (tab + 1 + Math.floor(Math.random() * 3)) % 4
        tap(sx + SW * (0.2 + 0.2 * tab), sy + SH * 0.95, NA)
        for (const c of cards) {
          c.shift = SW * 0.6 * dir
          c.heat = Math.max(c.heat, 0.7)
          c.col = NA
        }
        dir = -dir
        tabT = 5 + Math.random() * 3
      }

      // ---- the feed: cards recycle past either end (arriving lit), then cool to glass
      let top = Infinity
      let bot = -Infinity
      for (const c of cards) {
        top = Math.min(top, c.y)
        bot = Math.max(bot, c.y)
      }
      const cw = SW * 0.86
      const cx0 = sx + SW * 0.07
      const rr = Math.min(10, ch * 0.16)
      for (const c of cards) {
        if (c.y - scroll + ch < feedTop - gap * 2) {
          Object.assign(c, card(bot + ch + gap, true))
          bot = c.y
        } else if (c.y - scroll > feedBot + gap * 2) {
          Object.assign(c, card(top - ch - gap, true))
          top = c.y
        }
        c.shift *= Math.exp(-dt * 7)
        const x = cx0 + c.shift
        const y = c.y - scroll
        // the card under the thumb warms
        if (inScreen && !pointer.down && pointer.y >= y && pointer.y <= y + ch) c.heat = Math.max(c.heat, 0.45)
        const shape = P.rrect(x, y, cw, ch, rr)
        ctx.fillStyle = rgba(WHITE, 0.03)
        ctx.fill(shape)
        pen.glass(shape, 0.24, 2.4)
        if (c.heat > 0.02) {
          pen.neon(shape, c.col, c.heat * 0.9, 1.5)
          pen.wash(shape, c.col, 0.05 * c.heat)
        }
        // its content: a post (a face and lines) or a picture with a caption
        const pad = ch * 0.2
        const lw = Math.max(1.5, ch * 0.075)
        if (c.kind === 0) {
          pen.fill(P.circle(x + pad + ch * 0.13, y + ch * 0.33, ch * 0.12), c.col, 0.3 + 0.7 * c.heat)
          ctx.fillStyle = rgba(WHITE, 0.24)
          ctx.fillRect(x + pad + ch * 0.4, y + ch * 0.28, cw * 0.4, lw)
          ctx.fillStyle = rgba(WHITE, 0.12)
          ctx.fillRect(x + pad, y + ch * 0.6, cw * 0.72, lw)
          ctx.fillRect(x + pad, y + ch * 0.76, cw * 0.5, lw)
        } else {
          const iw = cw * 0.36
          const pic = P.rrect(x + pad * 0.6, y + pad * 0.6, iw, ch - pad * 1.2, rr * 0.6)
          ctx.fillStyle = rgba(WHITE, 0.035)
          ctx.fill(pic)
          pen.glass(pic, 0.2, 2)
          // a sun and a hill in the picture
          pen.fill(P.circle(x + pad * 0.6 + iw * 0.72, y + pad * 0.6 + ch * 0.28, ch * 0.07), c.col, 0.35 + 0.65 * c.heat)
          const hill = new Path2D()
          hill.moveTo(x + pad * 0.6 + iw * 0.08, y + ch - pad * 0.6)
          hill.quadraticCurveTo(x + pad * 0.6 + iw * 0.45, y + ch * 0.38, x + pad * 0.6 + iw * 0.92, y + ch - pad * 0.6)
          pen.glass(hill, 0.26, 2)
          ctx.fillStyle = rgba(WHITE, 0.24)
          ctx.fillRect(x + pad * 0.6 + iw + pad * 0.7, y + ch * 0.3, cw * 0.34, lw)
          ctx.fillStyle = rgba(WHITE, 0.12)
          ctx.fillRect(x + pad * 0.6 + iw + pad * 0.7, y + ch * 0.52, cw * 0.4, lw)
          ctx.fillRect(x + pad * 0.6 + iw + pad * 0.7, y + ch * 0.7, cw * 0.26, lw)
        }
        c.heat = Math.max(0, c.heat - dt * 0.9)
      }

      // ---- the tab bar: four marks on a hairline, the current one lit
      const ty = sy + SH * 0.95
      pen.glass(P.line(sx, sy + SH * 0.905, sx + SW, sy + SH * 0.905), 0.12, 2)
      // (the bar's own frost over the feed, so cards cool behind it)
      ctx.fillStyle = rgba(WHITE, 0.02)
      ctx.fillRect(sx, sy + SH * 0.905, SW, SH * 0.1)
      for (let k = 0; k < 4; k++) {
        const tx = sx + SW * (0.2 + 0.2 * k)
        const rad = Math.max(2, SH * 0.012)
        if (k === tab) {
          const on = 0.85 + 0.15 * Math.sin(t * 2.1)
          pen.fill(P.circle(tx, ty, rad * 1.15), NA, on)
          pen.neon(P.circle(tx, ty, rad * 2.4), NA, 0.3 * on, 1.2)
        } else pen.glass(P.circle(tx, ty, rad), 0.26, 2)
      }

      // ---- notifications: a banner drops in at the top, holds, and slides away
      noteT -= dt
      if (noteT <= 0) {
        notes.push({ age: 0, seed: Math.floor(Math.random() * 1000) })
        noteT = 4.5 + Math.random() * 3
      }
      notes = notes.filter(n => n.age < 2.35)
      const nh = SH * 0.078
      for (const n of notes) {
        n.age += dt
        const slide = n.age < 0.35 ? 1 - easeOut(n.age / 0.35) : n.age < 2 ? 0 : Math.pow((n.age - 2) / 0.35, 2)
        const y = sy + SH * 0.04 - slide * (nh + SH * 0.06)
        const on = Math.max(0.4, strike(n.age, n.seed))
        const shape = P.rrect(cx0, y, cw, nh, nh * 0.32)
        ctx.fillStyle = rgba(WHITE, 0.06)
        ctx.fill(shape)
        pen.glass(shape, 0.3, 2.4)
        pen.neon(shape, NC, 0.8 * on, 1.4)
        pen.wash(shape, NC, 0.07 * on)
        pen.fill(P.circle(cx0 + nh * 0.5, y + nh * 0.5, nh * 0.17), NC, on)
        ctx.fillStyle = rgba(WHITE, 0.3)
        ctx.fillRect(cx0 + nh * 0.95, y + nh * 0.3, cw * 0.4, Math.max(1.5, nh * 0.1))
        ctx.fillStyle = rgba(WHITE, 0.14)
        ctx.fillRect(cx0 + nh * 0.95, y + nh * 0.58, cw * 0.55, Math.max(1.5, nh * 0.1))
      }

      // ---- taps: a ring of light where a finger landed
      taps = taps.filter(tp => tp.age < 0.55)
      for (const tp of taps) {
        tp.age += dt
        const q = tp.age / 0.55
        pen.neon(P.circle(tp.x, tp.y, 4 + q * SW * 0.16), tp.col, (1 - q) * 0.8, 1.6)
        if (q < 0.3) pen.fill(P.circle(tp.x, tp.y, 3.5 * (1 - q / 0.3)), WHITE, 1 - q / 0.3)
      }

      // the thumb itself: a soft print on the glass
      if (inScreen) {
        ctx.fillStyle = rgba(WHITE, 0.04)
        ctx.fill(P.circle(pointer.x, pointer.y, 18))
        pen.glass(P.circle(pointer.x, pointer.y, 7), 0.3, 2)
      }

      ctx.restore()
      glow.restore()

      // ---- the screen's light into the room
      const gx = sx + SW / 2
      const gy = sy + SH / 2
      const g = glow.createRadialGradient(gx, gy, 0, gx, gy, PH * 0.72)
      g.addColorStop(0, rgba(NA, 0.11 + 0.02 * Math.sin(t * 0.9)))
      g.addColorStop(1, rgba(NA, 0))
      glow.fillStyle = g
      glow.fillRect(gx - PH, gy - PH, PH * 2, PH * 2)

      ctx.restore()
      glow.restore()
    },
  }
}
