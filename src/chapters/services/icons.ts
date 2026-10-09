import { SERVICES } from '../../content'

/*
 * Etched — the service plates (one per service), drawn into ONE canvas atlas.
 *
 * Each cell is the face of a glass tile in reverse etching: the icon, the
 * plate number, the service name and four registration marks are the CLEAR
 * lines in a sandblasted face, so the backlight shows through them sharp.
 *
 *   R channel  the crisp etched lines (sampled by the face plate: razor sharp)
 *   G channel  the same icon, thick and blurred (sampled by the glow plate
 *              inside the glass: light bleeding into the frost around it)
 *   B channel  the words of the "Learn More" button, bottom right: "Learn More"
 *              and its arrow, solid. The face shader draws the lit pill itself
 *              (a capsule, from `pill`) and these words over it as an opaque
 *              STENCIL: they block the pill's light and the frost behind it, so
 *              they read as dark letters however bright the pill swells
 *              (the soft bloom of the pill in the frost is in G)
 *
 * The atlas is drawn opaque (black) with additive compositing, so the two
 * channels never premultiply into each other. Glyphs are designed in a
 * 100 x 100 box centred on 0,0 (y down): hairline strokes, round caps.
 */

type Ctx = CanvasRenderingContext2D
type Pt = [number, number]

function poly(g: Ctx, pts: Pt[], close = false) {
  g.beginPath()
  g.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1])
  if (close) g.closePath()
  g.stroke()
}

function circle(g: Ctx, x: number, y: number, r: number, fill = false) {
  g.beginPath()
  g.arc(x, y, r, 0, Math.PI * 2)
  if (fill) g.fill()
  else g.stroke()
}

function rrect(g: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2))
  g.beginPath()
  g.moveTo(x + rr, y)
  g.arcTo(x + w, y, x + w, y + h, rr)
  g.arcTo(x + w, y + h, x, y + h, rr)
  g.arcTo(x, y + h, x, y, rr)
  g.arcTo(x, y, x + w, y, rr)
  g.closePath()
  g.stroke()
}

/** a filled rounded rect */
function rrectFill(g: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2))
  g.beginPath()
  g.moveTo(x + rr, y)
  g.arcTo(x + w, y, x + w, y + h, rr)
  g.arcTo(x + w, y + h, x, y + h, rr)
  g.arcTo(x, y + h, x, y, rr)
  g.arcTo(x, y, x + w, y, rr)
  g.closePath()
  g.fill()
}

/** a four-point sparkle (concave star) centred at x,y with radius r */
function sparkle(g: Ctx, x: number, y: number, r: number) {
  const k = r * 0.16
  g.beginPath()
  g.moveTo(x, y - r)
  g.quadraticCurveTo(x + k, y - k, x + r, y)
  g.quadraticCurveTo(x + k, y + k, x, y + r)
  g.quadraticCurveTo(x - k, y + k, x - r, y)
  g.quadraticCurveTo(x - k, y - k, x, y - r)
  g.closePath()
  g.stroke()
}

/** One glyph per service slug (fallback: a diamond). */
const GLYPHS: Record<string, (g: Ctx) => void> = {
  // </> — code
  'software-development': g => {
    poly(g, [[-19, -23], [-42, 0], [-19, 23]])
    poly(g, [[19, -23], [42, 0], [19, 23]])
    poly(g, [[8, -33], [-8, 33]])
  },
  // a contact card: a person and their record
  'custom-crm': g => {
    rrect(g, -42, -29, 84, 58, 9)
    circle(g, -19, -7, 8)
    g.beginPath()
    g.arc(-19, 17, 15, Math.PI * 1.08, Math.PI * 1.92)
    g.stroke()
    poly(g, [[4, -12], [30, -12]])
    poly(g, [[4, 0], [30, 0]])
    poly(g, [[4, 12], [21, 12]])
  },
  // a browser window with a layout grid
  'web-design': g => {
    rrect(g, -45, -34, 90, 68, 5)
    poly(g, [[-45, -19], [45, -19]])
    circle(g, -37, -26.5, 1.4, true)
    circle(g, -31, -26.5, 1.4, true)
    circle(g, -25, -26.5, 1.4, true)
    poly(g, [[-12, -19], [-12, 34]])
    poly(g, [[-12, 6], [45, 6]])
    poly(g, [[-38, -9], [-20, -9]])
    poly(g, [[-38, -1], [-24, -1]])
  },
  // a cart
  ecommerce: g => {
    poly(g, [[-47, -31], [-36, -31], [-25, 13], [31, 13], [40, -19], [-32, -19]])
    poly(g, [[-29.5, -3], [36, -3]])
    circle(g, -17, 27, 5)
    circle(g, 24, 27, 5)
  },
  // a magnifier with a spark (search + generative answers)
  'seo-geo': g => {
    circle(g, -9, -9, 27)
    poly(g, [[10.5, 10.5], [40, 40]])
    sparkle(g, -9, -9, 13)
  },
  // a lightning bolt
  'page-speed': g => {
    poly(
      g,
      [
        [9, -47],
        [-25, 7],
        [-2, 7],
        [-10, 47],
        [25, -9],
        [2, -9],
      ],
      true,
    )
  },
  // a chip with a sparkle
  'ai-consulting': g => {
    rrect(g, -27, -27, 54, 54, 5)
    for (const o of [-14, 0, 14]) {
      poly(g, [[o, -27], [o, -39]])
      poly(g, [[o, 27], [o, 39]])
      poly(g, [[-27, o], [-39, o]])
      poly(g, [[27, o], [39, o]])
    }
    sparkle(g, 0, 0, 15)
  },
  // a speech bubble holding a folded page: ask, and the answer comes from your files
  'company-knowledge-ai': g => {
    const l = -40
    const t = -34
    const w = 80
    const h = 58
    const r = 13
    g.beginPath()
    g.moveTo(l + r, t)
    g.arcTo(l + w, t, l + w, t + h, r)
    g.arcTo(l + w, t + h, l, t + h, r)
    g.lineTo(-12, t + h)
    g.lineTo(-25, t + h + 15)
    g.lineTo(-23, t + h)
    g.arcTo(l, t + h, l, t, r)
    g.arcTo(l, t, l + w, t, r)
    g.closePath()
    g.stroke()
    // the page, its corner folded down
    poly(g, [[-13, -21], [5, -21], [13, -13], [13, 11], [-13, 11]], true)
    poly(g, [[5, -21], [5, -13], [13, -13]])
    poly(g, [[-7, -6], [7, -6]])
    poly(g, [[-7, 1], [4, 1]])
  },
  // a quadcopter, top-down
  'aerial-media': g => {
    rrect(g, -9, -9, 18, 18, 4)
    for (const [sx, sy] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ] as Pt[]) {
      poly(g, [[sx * 8, sy * 8], [sx * 22, sy * 22]])
      circle(g, sx * 30, sy * 30, 13)
      circle(g, sx * 30, sy * 30, 1.6, true)
    }
  },
  // a cross: repair
  'hack-remediation': g => {
    const a = 11
    const b = 38
    poly(
      g,
      [
        [-a, -b],
        [a, -b],
        [a, -a],
        [b, -a],
        [b, a],
        [a, a],
        [a, b],
        [-a, b],
        [-a, a],
        [-b, a],
        [-b, -a],
        [-a, -a],
      ],
      true,
    )
  },
  // a shield with a check
  security: g => {
    g.beginPath()
    g.moveTo(0, -45)
    g.bezierCurveTo(14, -35, 26, -33, 38, -32)
    g.lineTo(38, 0)
    g.bezierCurveTo(38, 22, 20, 37, 0, 47)
    g.bezierCurveTo(-20, 37, -38, 22, -38, 0)
    g.lineTo(-38, -32)
    g.bezierCurveTo(-26, -33, -14, -35, 0, -45)
    g.closePath()
    g.stroke()
    poly(g, [[-14, 2], [-4, 13], [16, -11]])
  },
  // the accessibility figure
  'ada-accessibility': g => {
    circle(g, 0, 0, 45)
    circle(g, 0, -24, 5.5)
    poly(g, [[-24, -11], [0, -7], [24, -11]])
    poly(g, [[0, -7], [0, 10]])
    poly(g, [[-14, 33], [0, 10], [14, 33]])
  },
  // W in a ring
  wordpress: g => {
    circle(g, 0, 0, 45)
    poly(g, [[-30, -17], [-16, 24], [0, -9], [16, 24], [30, -17]])
  },
}

const diamond = (g: Ctx) =>
  poly(
    g,
    [
      [0, -34],
      [34, 0],
      [0, 34],
      [-34, 0],
    ],
    true,
  )

/** letter-spaced text, drawn glyph by glyph (canvas letterSpacing is missing in Safari) */
function spaced(g: Ctx, text: string, x: number, y: number, track: number) {
  let cx = x
  for (const ch of text) {
    g.fillText(ch, cx, y)
    cx += g.measureText(ch).width + track
  }
}

/** the width `spaced` draws `text` at */
function spacedWidth(g: Ctx, text: string, track: number) {
  let w = -track
  for (const ch of text) w += g.measureText(ch).width + track
  return w
}

export const COLS = 3
export const ROWS = Math.ceil(SERVICES.length / COLS)

export interface Atlas {
  canvas: HTMLCanvasElement
  cellW: number
  cellH: number
  /** redraw (after the label web font loads) */
  draw: () => void
  /**
   * the Learn More pill, the same in every cell, as fractions of the cell
   * (y down): centre x, y and half extents w, h (a capsule: radius = h); `clear`
   * (in cell heights) is the frost left clear between it and the face's right and
   * bottom edges: its halo must fade out within that
   */
  pill: { x: number; y: number; w: number; h: number; clear: number }
  /** uv rectangle of cell i: [u0, v0, u1, v1] (v up, CanvasTexture flipY) */
  rect: (i: number) => [number, number, number, number]
}

/**
 * The atlas: COLS x ROWS cells, each cellW x cellH px (the face plate's
 * aspect). `weight` thickens the lines on phones, where the plate is small.
 */
export function buildAtlas(cellW: number, cellH: number, weight = 1): Atlas {
  const n = SERVICES.length
  const canvas = document.createElement('canvas')
  canvas.width = cellW * COLS
  canvas.height = cellH * ROWS
  const g = canvas.getContext('2d')!
  // the labels: the site grotesk, bold (no monospace anywhere)
  const label = "'Schibsted Grotesk Variable', 'Schibsted Grotesk', system-ui, sans-serif"
  const pill = { x: 0.8, y: 0.86, w: 0.15, h: 0.06, clear: 0.07 }

  const draw = () => {
    g.globalCompositeOperation = 'source-over'
    g.fillStyle = '#000000'
    g.fillRect(0, 0, canvas.width, canvas.height)
    g.globalCompositeOperation = 'lighter'
    for (let i = 0; i < n; i++) {
      const svc = SERVICES[i]
      const ox = (i % COLS) * cellW
      const oy = Math.floor(i / COLS) * cellH
      g.save()
      g.beginPath()
      g.rect(ox, oy, cellW, cellH)
      g.clip()
      g.translate(ox, oy)
      const u = cellH / 100 // layout unit: 1% of the cell height

      // ---- the bottom row: the name (left) and the button (right), level. The button
      // sits `clear` in from the face's right and bottom edges, the room its halo (deck.ts)
      // needs to fade out before an edge on every side; the row, and the bottom-left mark
      // the name is registered to, sit that much higher than the top marks
      const m = 6.5 * u
      const L = 5 * u
      const clear = 7.2 * u
      g.font = `700 ${Math.round(5.3 * u)}px ${label}`
      const words = 'Learn More'
      const tw = g.measureText(words).width
      const aw = 3.9 * u // the arrow
      const bh = 12.6 * u
      const bw = 5.4 * u + tw + 2.7 * u + aw + 5.0 * u
      const bx = cellW - clear - bw
      const cy = cellH - clear - bh / 2 // the row's middle
      const by = cy - bh / 2
      pill.x = (bx + bw / 2) / cellW
      pill.y = cy / cellH
      pill.w = bw / 2 / cellW
      pill.h = bh / 2 / cellH
      pill.clear = clear / cellH
      // the name: big tracked caps, cap height centred on the row
      const nameSize = Math.round(5 * u)
      g.font = `700 ${nameSize}px ${label}`
      const capH = g.measureText('H').actualBoundingBoxAscent || 0.7 * nameSize
      const nx = m + 3.2 * u
      const markY = cy + capH / 2 + 2.6 * u

      // ---- registration marks: hairline corners (R); the button takes the bottom right
      g.strokeStyle = 'rgb(150,0,0)'
      g.lineWidth = Math.max(1, 0.32 * u * weight)
      g.lineCap = 'butt'
      for (const [mx, my, sx, sy] of [
        [m, m, 1, 1],
        [cellW - m, m, -1, 1],
        [m, markY, 1, -1],
      ]) {
        poly(g, [[mx, my + sy * L], [mx, my], [mx + sx * L, my]])
      }

      // ---- the name, bottom left (R); no numbers on the plates. The longest names
      // shrink to end clear of the button and its halo; the rest are all one size
      g.textBaseline = 'alphabetic'
      g.textAlign = 'left'
      g.fillStyle = 'rgb(200,0,0)'
      const name = svc.title.toUpperCase()
      const room = bx - 8 * u - nx
      let size = nameSize
      const nw = spacedWidth(g, name, 0.09 * size)
      if (nw > room) {
        size = nameSize * (room / nw)
        g.font = `700 ${size.toFixed(2)}px ${label}`
      }
      spaced(g, name, nx, cy + (capH * size) / nameSize / 2, 0.09 * size)

      // ---- the button, like the site's white pill buttons: a soft bloom of the pill in
      // the frost (G), and its words and arrow (B), bold, as the stencil the face shader
      // lays over the lit pill it draws
      g.font = `700 ${Math.round(5.3 * u)}px ${label}`
      g.fillStyle = 'rgb(0,90,0)'
      g.shadowColor = 'rgb(0,200,0)'
      g.shadowBlur = 4 * u
      rrectFill(g, bx, by, bw, bh, bh / 2)
      g.shadowBlur = 0
      g.shadowColor = 'transparent'
      g.fillStyle = 'rgb(0,0,255)'
      g.strokeStyle = 'rgb(0,0,255)'
      g.textBaseline = 'middle'
      g.fillText(words, bx + 5.4 * u, cy + 0.2 * u)
      const ax = bx + 5.4 * u + tw + 2.7 * u
      g.lineWidth = 0.95 * u
      g.lineCap = 'round'
      g.lineJoin = 'round'
      g.beginPath()
      g.moveTo(ax, cy)
      g.lineTo(ax + aw, cy)
      g.moveTo(ax + aw - 1.7 * u, cy - 1.7 * u)
      g.lineTo(ax + aw, cy)
      g.lineTo(ax + aw - 1.7 * u, cy + 1.7 * u)
      g.stroke()

      // ---- the icon: a soft glow pass (G), then the crisp line (R)
      const gs = (cellH * 0.44) / 100 // icon box ≈ 44% of the cell height
      g.translate(cellW / 2, cellH * 0.5)
      g.scale(gs, gs)
      g.lineJoin = 'round'
      g.lineCap = 'round'
      const glyph = GLYPHS[svc.slug] ?? diamond
      g.strokeStyle = 'rgb(0,150,0)'
      g.fillStyle = 'rgb(0,150,0)'
      g.lineWidth = (6.2 * weight * u) / gs
      g.shadowColor = 'rgb(0,255,0)'
      g.shadowBlur = 5.5 * u
      glyph(g)
      g.shadowBlur = 0
      g.shadowColor = 'transparent'
      g.strokeStyle = 'rgb(255,0,0)'
      g.fillStyle = 'rgb(255,0,0)'
      g.lineWidth = (0.78 * weight * u) / gs
      glyph(g)
      g.restore()
    }
    g.globalCompositeOperation = 'source-over'
  }
  draw()

  const rect = (i: number): [number, number, number, number] => {
    const c = i % COLS
    const r = Math.floor(i / COLS)
    const u0 = c / COLS
    const u1 = (c + 1) / COLS
    // flipY: canvas row 0 is the top of the texture (v = 1)
    const v1 = 1 - r / ROWS
    const v0 = 1 - (r + 1) / ROWS
    return [u0, v0, u1, v1]
  }
  return { canvas, cellW, cellH, draw, rect, pill }
}
