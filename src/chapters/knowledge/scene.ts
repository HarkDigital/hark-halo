import * as THREE from 'three'
import { G, closedOutline, neonPath, type NeonPath } from '../../kit/glass'
import { glassSleeve, sleeveGlass, sleeveWalls } from '../../kit/tube'

/*
 * CONSTELLATION: the knowledge chapter's set, a NEON SIGN in clear glass
 * tubes (the security chapter's language, the same tube scale): a search bar
 * and an answer card in the middle, and round them, at different depths, the
 * company's knowledge as small signs of their own. World units, the bar and
 * card centred, facing +z.
 *
 *   bar       the search bar (a long rounded tube) and its magnifier; the
 *             caret and the "typing" (dashes of white light, no words) inside
 *   card      the answer card: its outline, four lines that write in, and a
 *             row of citation dots (one per cited source, in its colour)
 *   sources   files (a page with a folded corner), chats (a speech bubble)
 *             and tasks (a ticked box), in the lights a / b / c. Each hangs
 *             on a PIVOT at the end of its thread (the icon's edge nearest the
 *             card), so it can turn and drift without coming off it.
 *   threads   a thin glass line from the card to every source. A cited
 *             source's thread starts at its dot (down through the card's
 *             bottom edge, behind it); the rest start at the card's nearest
 *             edge. u = 0 at the card, 1 at the source.
 *   scans     two rings of white light that pulse out from the bar through
 *             the constellation (a shader on a plane: the width stays put)
 *   beads     a bead of light per cited thread (a white-hot point in its
 *             source's colour, always facing the camera), run down it into
 *             the card; like the neon, it sits in the opaque list, so the
 *             thread's glass shows it
 */

export type Kind = 'file' | 'chat' | 'task'

const BAR = { x: 0, y: 0.74, w: 2.0, h: 0.26 }
const CARD = { x: 0, y: -0.3, w: 2.0, h: 1.24 }
const CARD_TOP = CARD.y + CARD.h / 2
const CARD_BOT = CARD.y - CARD.h / 2
/** the scan's centre: the bar */
const SCAN_C = new THREE.Vector3(BAR.x, BAR.y, 0)

const R_GLASS = 0.034
const R_CORE = 0.011
const R_GLOW = 0.075
const R_THREAD = 0.012
const DOT_R = 0.04
const DOT_Y = CARD_BOT + 0.22

type IsFrame = (rt: THREE.WebGLRenderTarget | null) => boolean

/**
 * The constellation: [kind, x, y, z (the icon's centre), size, cited, on phones].
 * Kinds take their light: files a, chats b, tasks c. The cited ones sit low
 * and to the sides, so their threads leave the card's bottom edge cleanly.
 * The cameras look from the left (about 0.4 rad): sources on the left come
 * forward (z > 0), those on the right sit back, so none slides out behind
 * the copy, and each is placed by where it lands across the view
 * (0.92 x + 0.39 z), so no two stack up.
 */
const LAYOUT: [Kind, number, number, number, number, boolean, boolean][] = [
  ['task', -1.73, -1.02, 0.55, 1.0, true, true],
  ['chat', -0.5, -1.45, 0.1, 1.0, true, true],
  ['file', 0.91, -1.47, -0.3, 1.05, true, true],
  ['task', 1.75, -0.9, -0.6, 1.0, true, false],
  ['file', -1.9, 0.92, 0.5, 0.95, false, true],
  ['chat', -2.25, -0.05, 0.9, 1.0, false, false],
  ['chat', 1.82, 1.1, -0.9, 0.95, false, true],
  ['task', 2.21, 0.12, -0.8, 0.95, false, true],
  ['chat', -1.1, 1.35, 0.6, 0.9, false, true],
  ['task', 0.88, 1.42, -1.3, 0.95, false, false],
  ['file', 3.12, -0.42, -1.2, 1.05, false, false],
  ['file', 3.0, 1.28, -1.3, 1.0, false, false],
]

export interface Source {
  kind: Kind
  /** colour slot: 0 = lights a, 1 = b, 2 = c */
  slot: number
  /** at the thread's end: the icon turns about it */
  pivot: THREE.Group
  tubes: NeonPath[]
  walls: THREE.ShaderMaterial
  thread: NeonPath
  /** how far (xy) from the bar's centre: when the scan reaches it */
  dist: number
  /** its citation (0.. left to right), or -1 */
  cite: number
  /** a seed for its drift, and where (l) it glimmers while it's buried */
  seed: number
  glint: number
  /** its resting turn [pitch, yaw, roll] */
  rest: [number, number, number]
}

export interface Bead {
  mesh: THREE.Mesh
  u: { uK: { value: number } }
  /** the thread it runs along (u = 0 at the card) */
  curve: THREE.Curve<THREE.Vector3>
}

export interface Typed {
  tube: NeonPath
  x0: number
  len: number
}

export interface KnowledgeSet {
  root: THREE.Group
  sources: Source[]
  /** the cited sources, by citation (left to right) */
  cited: Source[]
  bar: NeonPath
  lens: NeonPath[]
  caret: NeonPath
  caretRoot: THREE.Group
  /** the typing: dashes of light along the bar, left to right */
  typed: Typed[]
  /** where the typing starts and ends (x) */
  typeX0: number
  typeX1: number
  card: NeonPath
  lines: NeonPath[]
  dots: NeonPath[]
  /** the glass walls' light: the bar, the magnifier, the card, the lines, each dot, the threads */
  walls: { bar: THREE.ShaderMaterial; lens: THREE.ShaderMaterial; card: THREE.ShaderMaterial; lines: THREE.ShaderMaterial; dots: THREE.ShaderMaterial[]; threads: THREE.ShaderMaterial }
  glass: THREE.MeshPhysicalMaterial
  scans: { mesh: THREE.Mesh; u: { uR: { value: number }; uK: { value: number } } }[]
  /** one per cited source, by citation */
  beads: Bead[]
}

const V = (x: number, y: number, z = 0) => new THREE.Vector3(x, y, z)
const lerp = THREE.MathUtils.lerp

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

/** an open polyline with a small fillet at each bend (a bent tube turns, it doesn't kink), evenly sampled */
function poly(pts: [number, number][], f = 0.022): THREE.Vector3[] {
  const p = new THREE.Path()
  p.moveTo(pts[0][0], pts[0][1])
  const a = new THREE.Vector2()
  const b = new THREE.Vector2()
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1]
    const [cx, cy] = pts[i]
    const [qx, qy] = pts[i + 1]
    a.set(cx - px, cy - py).normalize()
    b.set(qx - cx, qy - cy).normalize()
    p.lineTo(cx - a.x * f, cy - a.y * f)
    p.quadraticCurveTo(cx, cy, cx + b.x * f, cy + b.y * f)
  }
  const [lx, ly] = pts[pts.length - 1]
  p.lineTo(lx, ly)
  const n = Math.max(12, Math.ceil(p.getLength() / 0.012))
  return p.getSpacedPoints(n).map(q => V(q.x, q.y))
}

// ------------------------------------------------------------------ the icons

/** an icon's half extents (for where its thread meets it) */
function extent(kind: Kind, s: number): [number, number] {
  if (kind === 'file') return [0.18 * s, 0.23 * s]
  if (kind === 'chat') return [0.24 * s, 0.17 * s]
  return [0.19 * s, 0.19 * s]
}

/** an icon's neon lines, centred on its origin: [points, closed] */
function icon(kind: Kind, s: number): [THREE.Vector3[], boolean][] {
  if (kind === 'file') {
    // a page with a folded corner
    const w = 0.36 * s
    const h = 0.46 * s
    const f = 0.12 * s
    const p = new THREE.Path()
    p.moveTo(w / 2 - f, h / 2)
    p.lineTo(-w / 2, h / 2)
    p.lineTo(-w / 2, -h / 2)
    p.lineTo(w / 2, -h / 2)
    p.lineTo(w / 2, h / 2 - f)
    p.closePath()
    const page = closedOutline(p, 0.01).map(q => V(q.x, q.y))
    const fold = poly(
      [
        [w / 2 - f, h / 2],
        [w / 2 - f, h / 2 - f],
        [w / 2, h / 2 - f],
      ],
      0.018,
    )
    return [
      [page, true],
      [fold, false],
    ]
  }
  if (kind === 'chat') {
    // a speech bubble with a tail
    const w = 0.48 * s
    const h = 0.32 * s
    const r = 0.08 * s
    const x0 = -w / 2
    const x1 = w / 2
    const y0 = -h / 2 + 0.03 * s
    const y1 = h / 2 + 0.03 * s
    const p = new THREE.Path()
    p.moveTo(x0 + 0.11 * s, y0)
    p.lineTo(x0 + 0.06 * s, y0 - 0.1 * s)
    p.lineTo(x0 + 0.21 * s, y0)
    p.lineTo(x1 - r, y0)
    p.absarc(x1 - r, y0 + r, r, -Math.PI / 2, 0, false)
    p.lineTo(x1, y1 - r)
    p.absarc(x1 - r, y1 - r, r, 0, Math.PI / 2, false)
    p.lineTo(x0 + r, y1)
    p.absarc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI, false)
    p.lineTo(x0, y0 + r)
    p.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, false)
    p.closePath()
    return [[closedOutline(p, 0.01).map(q => V(q.x, q.y)), true]]
  }
  // a ticked box
  const b = 0.38 * s
  const tick = poly(
    [
      [-0.085 * s, 0.0],
      [-0.025 * s, -0.07 * s],
      [0.095 * s, 0.08 * s],
    ],
    0.02,
  )
  return [
    [rrect(0, 0, b, b, 0.075 * s), true],
    [tick, false],
  ]
}

// ------------------------------------------------------------------ the threads

/** a cubic Bézier from a to d, sampled every ~0.03 (both ends included) */
function bezier(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3): THREE.Vector3[] {
  const len = a.distanceTo(b) + b.distanceTo(c) + c.distanceTo(d)
  const n = Math.max(12, Math.ceil(len / 0.03))
  const out: THREE.Vector3[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const u = 1 - t
    out.push(
      new THREE.Vector3()
        .addScaledVector(a, u * u * u)
        .addScaledVector(b, 3 * u * u * t)
        .addScaledVector(c, 3 * u * t * t)
        .addScaledVector(d, t * t * t),
    )
  }
  return out
}

/**
 * Where an uncited source's thread leaves the card: the nearest point of its
 * edge (clear of the corners; never the top, which the bar sits over), and
 * the edge's outward normal.
 */
function edgeFor(x: number, y: number): { p: THREE.Vector3; n: THREE.Vector3 } {
  const hw = CARD.w / 2
  const inner = Math.abs(x) < hw - 0.2
  if (inner && y < CARD_BOT) return { p: V(x * 0.9, CARD_BOT - 0.05), n: V(0, -1) }
  const side = Math.sign(x) || 1
  const yy = THREE.MathUtils.clamp(y, CARD_BOT + 0.22, CARD_TOP - 0.22)
  return { p: V(side * (hw + 0.05), yy), n: V(side, 0) }
}

// ------------------------------------------------------------------ the scan

const SCAN_VERT = /* glsl */ `
  varying vec2 vP;
  void main() {
    vP = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const SCAN_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uR, uW, uK;
  varying vec2 vP;
  float pow2(float x) { return x * x; }
  void main() {
    float d = length(vP);
    // a fine line of light at radius uR (at least ~1.5 px wide), a soft halo round it,
    // and a faint wash trailing inside it (the sweep)
    float w = max(uW, fwidth(d) * 1.2);
    float core = exp(-pow2((d - uR) / w));
    float halo = exp(-pow2((d - uR) / (w * 7.0)));
    float trail = d < uR ? exp(-(uR - d) / 0.35) : 0.0;
    gl_FragColor = vec4(uColor * (core * 2.0 + halo * 0.22 + trail * 0.04) * uK, 1.0);
  }
`

function scanRing(): KnowledgeSet['scans'][number] {
  const u = {
    uColor: { value: new THREE.Color(G.ice) },
    uR: { value: 0 },
    uW: { value: 0.012 },
    uK: { value: 0 },
  }
  const mat = new THREE.ShaderMaterial({
    uniforms: u,
    vertexShader: SCAN_VERT,
    fragmentShader: SCAN_FRAG,
    transparent: false,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), mat)
  mesh.position.copy(SCAN_C)
  mesh.renderOrder = -5
  mesh.frustumCulled = false
  mesh.visible = false
  return { mesh, u }
}

// ------------------------------------------------------------------ the beads

const BEAD_VERT = /* glsl */ `
  uniform float uSize;
  varying vec2 vQ;
  void main() {
    // a quad round the bead's centre, turned to face the camera
    vQ = position.xy * 2.0;
    vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    mv.xy += position.xy * uSize;
    gl_Position = projectionMatrix * mv;
  }
`
const BEAD_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uK;
  varying vec2 vQ;
  void main() {
    float r2 = dot(vQ, vQ);
    float core = exp(-r2 / 0.03);
    float glow = exp(-r2 / 0.22);
    vec3 col = mix(uColor, vec3(1.0), core) * (core * 3.4 + glow * 0.9);
    gl_FragColor = vec4(col * uK, 1.0);
  }
`

function bead(color: string, curve: THREE.Curve<THREE.Vector3>): Bead {
  const u = { uColor: { value: new THREE.Color(color) }, uK: { value: 0 }, uSize: { value: 0.16 } }
  const mat = new THREE.ShaderMaterial({
    uniforms: u,
    vertexShader: BEAD_VERT,
    fragmentShader: BEAD_FRAG,
    transparent: false,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat)
  mesh.renderOrder = -4
  mesh.frustumCulled = false
  mesh.visible = false
  return { mesh, u, curve }
}

// ------------------------------------------------------------------ the set

export function buildKnowledge(isFrameTarget: IsFrame, mobile: boolean, envMap: THREE.Texture | null): KnowledgeSet {
  const colors = [G.neonA, G.neonB, G.neonC]
  const slotOf: Record<Kind, number> = { file: 0, chat: 1, task: 2 }
  const root = new THREE.Group()
  const glass = sleeveGlass(R_GLASS * 0.12, mobile, envMap)

  const tube = (points: THREE.Vector3[], closed: boolean, color: string, o: { r?: number; glow?: number } = {}) => {
    const t = neonPath({
      points,
      closed,
      color,
      radius: o.r ?? R_CORE,
      glowRadius: o.glow ?? R_GLOW,
      // (the points are already dense: a closed outline every 0.01; fewer segments than the
      // shield's 3 per point keep this busier set's triangle count near its)
      segments: Math.max(48, Math.round(points.length * (mobile ? 1.2 : 1.6))),
      isFrameTarget,
    })
    t.k.main.tube = 3.0
    t.k.main.glow = 0.3
    t.k.trans.tube = 3.0
    t.k.trans.glow = 0.34
    return t
  }
  const curveOf = (t: NeonPath) => t.tube.geometry.parameters.path
  /** a clear glass sleeve round some tubes (their walls glow in `color`), in `parent` */
  const sleeve = (tubes: NeonPath[], color: string, parent: THREE.Object3D, r = R_GLASS) => {
    const geo = glassSleeve(
      tubes.map(t => ({ curve: curveOf(t), closed: t.tube.geometry.parameters.closed })),
      r,
      // (a thread's thin glass reads as round with the phones' fewer sides)
      mobile || r < R_GLASS,
    )
    const wm = sleeveWalls(color)
    const w = new THREE.Mesh(geo, wm)
    w.renderOrder = 2
    parent.add(new THREE.Mesh(geo, glass), w)
    return wm
  }

  // ---- the search bar and its magnifier
  const bar = tube(rrect(BAR.x, BAR.y, BAR.w, BAR.h, 0.12), true, G.neonB)
  const lx = BAR.x - BAR.w / 2 + 0.17
  const ly = BAR.y + 0.012
  const lr = 0.048
  const hx = lx + lr * 0.72
  const hy = ly - lr * 0.72
  const lens = [tube(circle(lx, ly, lr), true, G.neonC), tube(line(hx + 0.012, hy - 0.012, hx + 0.058, hy - 0.058), false, G.neonC)]
  root.add(bar.root, ...lens.map(t => t.root))
  const barWalls = sleeve([bar], G.neonB, root)
  const lensWalls = sleeve(lens, G.neonC, root)

  // the typing: words as dashes of white light (no text), and the caret
  const typeX0 = lx + 0.13
  const words = mobile ? [0.26, 0.18, 0.34, 0.2] : [0.24, 0.16, 0.3, 0.12, 0.26, 0.18]
  const typed: Typed[] = []
  let x = typeX0
  for (const len of words) {
    const t = tube(line(x, BAR.y, x + len, BAR.y), false, G.ice, { r: 0.0085, glow: 0.05 })
    t.draw.value = 0
    root.add(t.root)
    typed.push({ tube: t, x0: x, len })
    x += len + 0.055
  }
  const typeX1 = x - 0.055
  const caretRoot = new THREE.Group()
  const caret = tube(line(0, -0.068, 0, 0.068), false, G.ice, { r: 0.007, glow: 0.045 })
  caretRoot.add(caret.root)
  caretRoot.position.set(typeX0, BAR.y, 0.01)
  root.add(caretRoot)

  // ---- the answer card: its outline, four lines, the citation dots
  const card = tube(rrect(CARD.x, CARD.y, CARD.w, CARD.h, 0.13), true, G.neonA)
  root.add(card.root)
  const cardWalls = sleeve([card], G.neonA, root)
  const lx0 = CARD.x - CARD.w / 2 + 0.2
  const lineLens = [1.56, 1.36, 1.5, 0.9]
  const lines = lineLens.map((len, i) => {
    const y = CARD_TOP - 0.24 - i * 0.18
    const t = tube(line(lx0, y, lx0 + len, y), false, G.ice, { r: 0.0095, glow: 0.06 })
    t.draw.value = 0
    root.add(t.root)
    return t
  })
  const linesWalls = sleeve(lines, G.ice, root)

  // ---- the sources
  const picked = LAYOUT.filter(r => !mobile || r[6])
  const citedRows = picked.filter(r => r[5]).sort((a, b) => a[1] - b[1])
  const nCite = citedRows.length
  const dotX = (k: number) => CARD.x + (k - (nCite - 1) / 2) * 0.17
  const dots: NeonPath[] = []
  const dotWalls: THREE.ShaderMaterial[] = []
  citedRows.forEach((r, k) => {
    const c = colors[slotOf[r[0]]]
    const t = tube(circle(dotX(k), DOT_Y, DOT_R), true, c, { glow: 0.065 })
    t.on.value = 0
    root.add(t.root)
    dots.push(t)
    dotWalls.push(sleeve([t], c, root))
  })

  const sources: Source[] = []
  const threadTubes: NeonPath[] = []
  picked.forEach((r, i) => {
    const [kind, sx, sy, sz, size, isCited] = r
    const slot = slotOf[kind]
    const cite = isCited ? citedRows.indexOf(r) : -1
    // where the thread leaves the card, and the first stretch of it
    let head: THREE.Vector3[]
    let exit: THREE.Vector3
    let out: THREE.Vector3
    if (cite >= 0) {
      // from the dot, straight down through the card's bottom edge (behind it)
      const dx = dotX(cite)
      head = [V(dx, DOT_Y - DOT_R - 0.016, 0), V(dx, DOT_Y - DOT_R - 0.07, -0.02), V(dx, CARD_BOT, -0.07), V(dx, CARD_BOT - 0.1, -0.05)]
      exit = head[head.length - 1]
      out = V(0, -1)
    } else {
      const e = edgeFor(sx, sy)
      head = [e.p]
      exit = e.p
      out = e.n
    }
    // where it meets the icon: the icon's edge, facing the way the thread comes in
    const [hw, hh] = extent(kind, size)
    const d = new THREE.Vector2(exit.x - sx, exit.y - sy).normalize()
    const reach = Math.min(Math.abs(d.x) > 1e-4 ? hw / Math.abs(d.x) : 1e9, Math.abs(d.y) > 1e-4 ? hh / Math.abs(d.y) : 1e9)
    const A = V(sx + d.x * reach, sy + d.y * reach, sz)
    // the curve: out of the card along its normal, a gentle bend, into the icon. Its depth
    // changes evenly along it (a thread that dived at one end would hook back in perspective)
    const span = exit.distanceTo(A)
    const seed = (i * 0.6180339 + 0.13) % 1
    const bend = (seed < 0.5 ? -1 : 1) * 0.14 * Math.min(1, span / 1.5)
    const perp = V(-(A.y - exit.y), A.x - exit.x).normalize().multiplyScalar(bend)
    const c1 = exit.clone().lerp(A, 0.18).addScaledVector(out, Math.min(0.4, span * 0.22))
    const c2 = exit.clone().lerp(A, 0.66).add(perp)
    c1.z = lerp(exit.z, A.z, 1 / 3)
    c2.z = lerp(exit.z, A.z, 2 / 3)
    const pts = [...head.slice(0, -1), ...bezier(exit, c1, c2, A)]
    const thread = tube(pts, false, colors[slot], { r: 0.0045, glow: 0.032 })
    thread.on.value = 0
    root.add(thread.root)
    threadTubes.push(thread)

    // the icon, hung on its pivot at the thread's end
    const pivot = new THREE.Group()
    pivot.position.copy(A)
    const inner = new THREE.Group()
    inner.position.set(sx - A.x, sy - A.y, 0)
    pivot.add(inner)
    const tubes = icon(kind, size).map(([p, closed]) => {
      const t = tube(p, closed, colors[slot])
      inner.add(t.root)
      return t
    })
    const walls = sleeve(tubes, colors[slot], inner)
    root.add(pivot)
    const side = Math.sign(sx) || 1
    sources.push({
      kind,
      slot,
      pivot,
      tubes,
      walls,
      thread,
      dist: Math.hypot(sx - SCAN_C.x, sy - SCAN_C.y),
      cite,
      seed,
      glint: 0.05 + ((i * 0.381966 + 0.21) % 1) * 0.17,
      rest: [0.04 * Math.sin(i * 2.1), -0.16 - 0.12 * side, 0.09 * Math.sin(i * 1.3 + 0.5)],
    })
  })
  const threadWalls = sleeve(threadTubes, G.ice, root, R_THREAD)
  const cited = sources.filter(s => s.cite >= 0).sort((a, b) => a.cite - b.cite)

  // ---- the scan: a ring and its echo; the beads
  const scans = [scanRing(), scanRing()]
  for (const s of scans) root.add(s.mesh)
  const beads = cited.map(src => bead(colors[src.slot], curveOf(src.thread)))
  for (const b of beads) root.add(b.mesh)

  return {
    root,
    sources,
    cited,
    bar,
    lens,
    caret,
    caretRoot,
    typed,
    typeX0,
    typeX1,
    card,
    lines,
    dots,
    walls: { bar: barWalls, lens: lensWalls, card: cardWalls, lines: linesWalls, dots: dotWalls, threads: threadWalls },
    glass,
    scans,
    beads,
  }
}
