import { MARK_DIAMOND, MARK_LOOPS, MARK_VIEW } from '../logo/svgSource'

/*
 * The Hark mark for the canvas: its two loops and the diamond as Path2D in
 * MARK UNITS (the Illustrator box, 1889.59 x 1889.86, y down), and helpers to
 * place it and to walk its contours.
 *
 *   MARK              the paths, the box, the contours' lengths
 *   markFrame(c, cx, cy, size)   scale a context so the mark is centred at
 *                     (cx, cy) and `size` px tall; returns the scale s. Inside
 *                     that frame every length is in mark units: a line width
 *                     of w px is w / s, a dash of L px is L / s. Wrap it in
 *                     save/restore on BOTH of the Pen's layers (ctx and glow)
 *                     so the bloom lands on the tube.
 *   markOutline(n)    n points along each contour (mark units), once: for
 *                     particles, distances to the cursor, heads riding the
 *                     tube. markLength(i) is contour i's length.
 *   markBounds        each contour's box (mark units)
 *
 * The site's rule (ui/mark.ts): the mark is monochrome in the chrome; in a
 * drawing it is light, so the lights (NA / NB / NC) may colour it.
 */
export const MARK_W = MARK_VIEW.w
export const MARK_H = MARK_VIEW.h
/** the contours, in the order loop A (top right), loop B (bottom left), the diamond */
export const MARK_D = [...MARK_LOOPS, MARK_DIAMOND]
export const MARK = {
  loops: MARK_LOOPS.map(d => new Path2D(d)),
  diamond: new Path2D(MARK_DIAMOND),
  all: MARK_D.map(d => new Path2D(d)),
  w: MARK_W,
  h: MARK_H,
  /** the mark's centre, in mark units */
  cx: MARK_W / 2,
  cy: MARK_H / 2,
}

/** scale `c` so the mark is centred at (cx, cy) and `size` px tall; returns the scale */
export function markFrame(c: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const s = size / MARK_H
  c.translate(cx - (MARK_W * s) / 2, cy - (MARK_H * s) / 2)
  c.scale(s, s)
  return s
}

const svgPaths: SVGPathElement[] = []
function svgPath(i: number) {
  if (!svgPaths[i]) {
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    p.setAttribute('d', MARK_D[i])
    svgPaths[i] = p
  }
  return svgPaths[i]
}
const lengths: number[] = []
/** contour i's length, in mark units */
export function markLength(i: number) {
  if (lengths[i] === undefined) lengths[i] = svgPath(i).getTotalLength()
  return lengths[i]
}
const outlines = new Map<number, [number, number][][]>()
/** n points along each contour (mark units), evenly spaced by length; cached per n */
export function markOutline(n = 400): [number, number][][] {
  let o = outlines.get(n)
  if (!o) {
    o = MARK_D.map((_, i) => {
      const p = svgPath(i)
      const L = markLength(i)
      return Array.from({ length: n }, (_, k) => {
        const q = p.getPointAtLength((L * k) / n)
        return [q.x, q.y] as [number, number]
      })
    })
    outlines.set(n, o)
  }
  return o
}
/** the point `s` mark units along contour i */
export function markPointAt(i: number, s: number): [number, number] {
  const q = svgPath(i).getPointAtLength(((s % markLength(i)) + markLength(i)) % markLength(i))
  return [q.x, q.y]
}
/** each contour's box, in mark units */
export const markBounds = (): { x: number; y: number; w: number; h: number }[] =>
  markOutline(200).map(pts => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
    for (const [x, y] of pts) {
      if (x < x0) x0 = x
      if (y < y0) y0 = y
      if (x > x1) x1 = x
      if (y > y1) y1 = y
    }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
  })
