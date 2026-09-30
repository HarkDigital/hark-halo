import * as THREE from 'three'
import { G, closedOutline, neonPath, type NeonPath } from '../../kit/glass'
import { glassSleeve, sleeveGlass, sleeveWalls } from '../../kit/tube'

/*
 * SHORT CIRCUIT — the security chapter's set: "your site" as a NEON SIGN in
 * clear glass tubes (the tube mark's language): a browser window — frame,
 * title bar, three dots, the address pill — with a big padlock, three lines
 * of text and a button on its page. World units, the window W x H, centred,
 * facing +z.
 *
 *   signs     every neon line (kit neonPath): colour slot a / b / c from the
 *             lights, whether it goes dark while the site is down, and where
 *             the infection enters it (its nearest point to the BREACH, the
 *             keyhole) and how far that is.
 *   shackle   the padlock's shackle in its own group, pivoting on its long
 *             leg: it lifts and swings open when the lock is picked, and
 *             snaps shut at the end.
 *   glass     one clear, hollow glass sleeve round every line (per colour, so
 *             its walls glow in that colour; the shackle's rides with it).
 *   scan      a white line of light that sweeps the window (finding the breach)
 *   brackets  four targeting corners that close in on the padlock
 *   ring      the flash ring when the lock snaps shut
 */

export const W = 3.2
export const H = 2.0
/** where the attack gets in: the padlock's keyhole */
export const BREACH = new THREE.Vector3(-0.85, -0.4, 0)
/** the padlock's centre (the reticle's target, the lock flash) */
export const LOCK_C = new THREE.Vector3(-0.85, -0.3, 0)
/** the shackle's pivot: the foot of its long (right) leg, on the body's top */
const PIVOT = new THREE.Vector3(-0.65, -0.19, 0)

const R_GLASS = 0.034
const R_CORE = 0.011
const R_GLOW = 0.075

type IsFrame = (rt: THREE.WebGLRenderTarget | null) => boolean

export interface Sign {
  tube: NeonPath
  /** colour slot: 0 = lights a, 1 = b, 2 = c */
  slot: number
  /** goes dark while the site is down */
  dies: boolean
  /** where the infection enters it (u) and how far that is from the breach (world) */
  u0: number
  dist: number
  /** how far (u) the infection has to spread either way to cover it */
  full: number
}

export interface SiteSet {
  /** the whole sign (dips on the strike) */
  root: THREE.Group
  shackle: THREE.Group
  signs: Sign[]
  /** the glass walls' light per sleeve: slots 0, 1, 2, then the shackle's */
  walls: THREE.ShaderMaterial[]
  glass: THREE.MeshPhysicalMaterial
  scan: NeonPath
  scanRoot: THREE.Group
  /** top-left, top-right, bottom-right, bottom-left */
  brackets: { root: THREE.Group; tube: NeonPath }[]
  ring: NeonPath
  ringRoot: THREE.Group
}

const V = (x: number, y: number) => new THREE.Vector3(x, y, 0)

function rrect(cx: number, cy: number, w: number, h: number, r: number): THREE.Vector3[] {
  const p = new THREE.Path()
  const x0 = cx - w / 2
  const x1 = cx + w / 2
  const y0 = cy - h / 2
  const y1 = cy + h / 2
  p.moveTo(x0 + r, y0)
  p.lineTo(x1 - r, y0)
  p.absarc(x1 - r, y0 + r, r, -Math.PI / 2, 0, false)
  p.lineTo(x1, y1 - r)
  p.absarc(x1 - r, y1 - r, r, 0, Math.PI / 2, false)
  p.lineTo(x0 + r, y1)
  p.absarc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI, false)
  p.lineTo(x0, y0 + r)
  p.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, false)
  return closedOutline(p, 0.01).map(q => V(q.x, q.y))
}

function circle(cx: number, cy: number, r: number): THREE.Vector3[] {
  const p = new THREE.Path()
  p.absarc(cx, cy, r, 0, Math.PI * 2, false)
  return closedOutline(p, Math.min(0.01, r * 0.15)).map(q => V(q.x, q.y))
}

function line(x0: number, y0: number, x1: number, y1: number): THREE.Vector3[] {
  const n = Math.max(8, Math.round(Math.hypot(x1 - x0, y1 - y0) / 0.03))
  return Array.from({ length: n + 1 }, (_, i) => V(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n))
}

/** the shackle, in its pivot's frame: up the long leg, over the arch, down the short leg */
function shackle(): THREE.Vector3[] {
  const pts: THREE.Vector3[] = []
  const top = 0.26
  const r = 0.2
  for (let i = 0; i <= 8; i++) pts.push(V(0, 0.06 + ((top - 0.06) * i) / 8))
  for (let i = 1; i < 16; i++) {
    const a = (Math.PI * i) / 16
    pts.push(V(-r + Math.cos(a) * r, top + Math.sin(a) * r))
  }
  for (let i = 0; i <= 8; i++) pts.push(V(-2 * r, top - ((top - 0.06) * i) / 8))
  return pts
}

/** an L-shaped targeting corner (its corner at the origin, arms along +x and -y) */
function bracket(L: number): THREE.Vector3[] {
  const f = 0.022
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= 6; i++) pts.push(V(0, -L + ((L - f) * i) / 6))
  // a small fillet round the corner (centre (f, -f)), so the tube turns rather than kinks
  for (let i = 1; i < 6; i++) {
    const a = Math.PI - (Math.PI / 2) * (i / 6)
    pts.push(V(f + Math.cos(a) * f, -f + Math.sin(a) * f))
  }
  for (let i = 0; i <= 6; i++) pts.push(V(f + ((L - f) * i) / 6, 0))
  return pts
}

export function buildSite(isFrameTarget: IsFrame, mobile: boolean, envMap: THREE.Texture | null): SiteSet {
  const colors = [G.neonA, G.neonB, G.neonC]
  const root = new THREE.Group()
  const shackleG = new THREE.Group()
  shackleG.position.copy(PIVOT)
  root.add(shackleG)

  // [points, closed, slot, dies]
  const defs: [THREE.Vector3[], boolean, number, boolean][] = [
    // the window
    [rrect(0, 0, W, H, 0.14), true, 0, false],
    [line(-W / 2 + 0.08, 0.62, W / 2 - 0.08, 0.62), false, 0, false],
    [circle(-1.36, 0.81, 0.045), true, 2, false],
    [circle(-1.21, 0.81, 0.045), true, 1, false],
    [circle(-1.06, 0.81, 0.045), true, 0, false],
    [rrect(0.25, 0.81, 2.1, 0.16, 0.08), true, 1, false],
    // the page: the padlock (body, keyhole), three lines of text, a button
    [rrect(-0.85, -0.44, 0.62, 0.5, 0.09), true, 2, false],
    [circle(BREACH.x, BREACH.y, 0.05), true, 2, false],
    [line(BREACH.x, BREACH.y - 0.075, BREACH.x, BREACH.y - 0.18), false, 2, false],
    [line(-0.15, 0.36, 1.32, 0.36), false, 1, false],
    [line(-0.15, 0.16, 1.0, 0.16), false, 1, true],
    [line(-0.15, -0.04, 1.18, -0.04), false, 1, true],
    [rrect(0.2, -0.42, 0.7, 0.2, 0.1), true, 0, true],
  ]
  const signs: Sign[] = []
  const sleeves: { curve: THREE.Curve<THREE.Vector3>; closed: boolean }[][] = [[], [], []]
  const near = new THREE.Vector3()
  const make = (pts: THREE.Vector3[], closed: boolean, slot: number, dies: boolean, parent: THREE.Group, world: (p: THREE.Vector3) => THREE.Vector3) => {
    const tube = neonPath({ points: pts, closed, color: colors[slot], radius: R_CORE, glowRadius: R_GLOW, segments: Math.max(48, pts.length * 3), isFrameTarget })
    parent.add(tube.root)
    // where the infection gets into this line: its nearest point to the breach
    const curve = tube.tube.geometry.parameters.path
    let u0 = 0
    let best = Infinity
    for (let i = 0; i <= 200; i++) {
      const d = world(curve.getPointAt(i / 200, near)).distanceTo(BREACH)
      if (d < best) {
        best = d
        u0 = i / 200
      }
    }
    const full = closed ? 0.5 : Math.max(u0, 1 - u0)
    signs.push({ tube, slot, dies, u0, dist: best, full })
    return curve
  }
  for (const [pts, closed, slot, dies] of defs) sleeves[slot].push({ curve: make(pts, closed, slot, dies, root, p => p), closed })
  const shackleCurve = make(shackle(), false, 2, false, shackleG, p => p.clone().add(PIVOT))

  // ---- the glass: a clear hollow sleeve round every line; its walls glow in the line's colour
  const glass = sleeveGlass(R_GLASS * 0.12, mobile, envMap)
  const walls: THREE.ShaderMaterial[] = []
  const sleeve = (paths: { curve: THREE.Curve<THREE.Vector3>; closed: boolean }[], color: string, parent: THREE.Group) => {
    const geo = glassSleeve(paths, R_GLASS, mobile)
    const m = new THREE.Mesh(geo, glass)
    const wm = sleeveWalls(color)
    const w = new THREE.Mesh(geo, wm)
    w.renderOrder = 2
    parent.add(m, w)
    walls.push(wm)
  }
  sleeves.forEach((paths, slot) => sleeve(paths, colors[slot], root))
  sleeve([{ curve: shackleCurve, closed: false }], colors[2], shackleG)

  // ---- the find: a scan line and four targeting corners (white light, in front of the glass)
  const ice = G.ice
  const scanRoot = new THREE.Group()
  const scan = neonPath({ points: line(-W / 2 + 0.1, 0, W / 2 - 0.1, 0), color: ice, radius: 0.006, glowRadius: 0.06, endFade: 0.3, segments: 80, isFrameTarget })
  scanRoot.add(scan.root)
  scanRoot.position.z = 0.08
  root.add(scanRoot)
  const brackets = [0, 1, 2, 3].map(k => {
    const b = new THREE.Group()
    const tube = neonPath({ points: bracket(0.16), color: ice, radius: 0.007, glowRadius: 0.05, segments: 60, isFrameTarget })
    b.add(tube.root)
    // corners clockwise from the top-left: each one turned a quarter more
    b.rotation.z = (-Math.PI / 2) * k
    root.add(b)
    return { root: b, tube }
  })
  const ringRoot = new THREE.Group()
  const ring = neonPath({ points: circle(0, 0, 1), closed: true, color: ice, radius: 0.012, glowRadius: 0.07, segments: 200, isFrameTarget })
  ringRoot.add(ring.root)
  ringRoot.position.set(LOCK_C.x, LOCK_C.y, 0.05)
  root.add(ringRoot)

  return { root, shackle: shackleG, signs, walls, glass, scan, scanRoot, brackets, ring, ringRoot }
}

/**
 * the shackle's pose: 0 = locked, 1 = picked open (lifted, the short leg swung
 * back round the long one; the story's cameras look from the left, so it
 * turns toward them and stays readable instead of going edge-on)
 */
export function poseShackle(g: THREE.Group, open: number) {
  g.position.set(PIVOT.x, PIVOT.y + 0.1 * Math.min(1, open * 1.6), PIVOT.z)
  g.rotation.set(0, -0.85 * THREE.MathUtils.smoothstep(open, 0.25, 1), 0)
}
