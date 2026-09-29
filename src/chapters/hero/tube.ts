import * as THREE from 'three'
import { mergeGeometries, toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js'
import { G, closedOutline, edgeGlow, neonPath, sharpTransmission, type NeonPath } from '../../kit/glass'
import { extrudeInset, logoParts } from '../../logo/logo'

/*
 * TUBE — the hero logo's second option (kit/palette LOGO_STYLES): the mark IS
 * the neon. Each loop of the mark is a band of even width; a neon tube runs
 * down the middle of it, encased in a clear glass tube as wide as the band
 * (rounded glass ends where the artwork's ends are cut), so the silhouette is
 * still the mark. The diamond is a small clear glass tile with a neon square
 * inside. Loop A, loop B and the diamond take the active lights.
 *
 *   the glass   one transmissive mesh (every tube + the tile): the neon and
 *               its halo reach the eye only through it, refracted (a round
 *               tube is a lens: the core swells as it turns toward you)
 *   the walls   light piped along the glass: an additive fresnel sheet per
 *               part in its neon colour, brightest at the silhouettes
 *   the cores   kit neonPath tubes (strike, pulse, floor reflection)
 *
 * Everything lives in mark units (1u tall), inside the logo root.
 */

/** a loop's centre line (mark units, from one cut end to the other) and its band width */
interface Band {
  pts: THREE.Vector2[]
  width: number
}

/** an open polyline resampled at an even `step`, ends kept */
function resample(poly: THREE.Vector2[], step: number): THREE.Vector2[] {
  const cum = [0]
  for (let i = 1; i < poly.length; i++) cum.push(cum[i - 1] + poly[i].distanceTo(poly[i - 1]))
  const total = cum[cum.length - 1]
  const count = Math.max(2, Math.round(total / step))
  const out: THREE.Vector2[] = []
  let seg = 0
  for (let k = 0; k <= count; k++) {
    const d = (k / count) * total
    while (seg < poly.length - 2 && cum[seg + 1] < d) seg++
    const len = cum[seg + 1] - cum[seg] || 1
    out.push(poly[seg].clone().lerp(poly[seg + 1], (d - cum[seg]) / len))
  }
  return out
}

/** cut `a` off the start and `b` off the end of an open polyline (by length) */
function trim(poly: THREE.Vector2[], a: number, b: number): THREE.Vector2[] {
  const cum = [0]
  for (let i = 1; i < poly.length; i++) cum.push(cum[i - 1] + poly[i].distanceTo(poly[i - 1]))
  const total = cum[cum.length - 1]
  const at = (d: number) => {
    let i = 0
    while (i < poly.length - 2 && cum[i + 1] < d) i++
    const len = cum[i + 1] - cum[i] || 1
    return { i, p: poly[i].clone().lerp(poly[i + 1], (d - cum[i]) / len) }
  }
  const s = at(a)
  const e = at(total - b)
  return [s.p, ...poly.slice(s.i + 1, e.i + 1), e.p]
}

/**
 * The centre line of a band-shaped outline (a thick stroke with two cut
 * ends): the four sharpest corners are the two cuts; the two long sides
 * between them are walked together (each point on the longer side paired
 * with its nearest point on the other, never going back, so a curl's end
 * never snaps across its channel to the neighbouring band); the pairs'
 * midpoints, evened out and smoothed, are the centre line.
 */
function bandCenterline(shape: THREE.Shape): Band {
  const raw = shape.getPoints().map(p => p.clone())
  if (raw.length > 1 && raw[0].distanceTo(raw[raw.length - 1]) < 1e-9) raw.pop()
  const n = raw.length
  const a = new THREE.Vector2()
  const b = new THREE.Vector2()
  const turn = raw.map((c, i) => {
    a.subVectors(c, raw[(i - 1 + n) % n]).normalize()
    b.subVectors(raw[(i + 1) % n], c).normalize()
    return Math.acos(THREE.MathUtils.clamp(a.dot(b), -1, 1))
  })
  const corners = [...raw.keys()]
    .sort((i, j) => turn[j] - turn[i])
    .slice(0, 4)
    .sort((i, j) => i - j)
  // the cuts: pair the corners that sit next to each other round the outline
  const gap = (i: number, j: number) => (j - i + n) % n
  const [c0, c1, c2, c3] = corners
  const pairA = gap(c0, c1) + gap(c2, c3) <= gap(c1, c2) + gap(c3, c0)
  const [s1, e1, s2, e2] = pairA ? [c0, c1, c2, c3] : [c1, c2, c3, c0]
  // side P runs from cut 1 to cut 2 one way round, side Q the other way (reversed to match)
  const walk = (from: number, to: number) => {
    const out: THREE.Vector2[] = []
    for (let i = from; ; i = (i + 1) % n) {
      out.push(raw[i])
      if (i === to) break
    }
    return out
  }
  const P = resample(walk(e1, s2), 0.0015)
  const Q = resample(walk(e2, s1).reverse(), 0.0015)
  const [L, S] = P.length >= Q.length ? [P, Q] : [Q, P]
  const mids: THREE.Vector2[] = []
  const widths: number[] = []
  let j = 0
  for (let i = 0; i < L.length; i++) {
    let best = j
    let bd = Infinity
    for (let k = j; k < Math.min(S.length, j + 90); k++) {
      const d = L[i].distanceToSquared(S[k])
      if (d < bd) {
        bd = d
        best = k
      }
    }
    j = i === L.length - 1 ? S.length - 1 : best
    mids.push(L[i].clone().add(S[j]).multiplyScalar(0.5))
    widths.push(L[i].distanceTo(S[j]))
  }
  let pts = resample(mids, 0.004)
  // smooth (ends pinned): the midpoints of two sampled outlines wobble a little
  for (let pass = 0; pass < 8; pass++) {
    const q = pts.map(p => p.clone())
    for (let i = 1; i < pts.length - 1; i++) q[i].set(0.5 * pts[i].x + 0.25 * (pts[i - 1].x + pts[i + 1].x), 0.5 * pts[i].y + 0.25 * (pts[i - 1].y + pts[i + 1].y))
    pts = q
  }
  widths.sort((x, y) => x - y)
  return { pts, width: widths[Math.floor(widths.length / 2)] }
}

let bands: { loops: Band[]; radius: number } | null = null
/** both loops' centre lines (cached) and the glass tube radius */
function tubeBands() {
  if (bands) return bands
  const lp = logoParts()
  const loops = [...lp.loopA, ...lp.loopB].map(bandCenterline)
  // the glass tube fills the band (a hair inside it, so the channels stay open)
  const radius = Math.min(...loops.map(l => l.width)) * 0.49
  bands = { loops, radius }
  return bands
}

/** the diamond's neon: a square inside the glass tile */
function diamondRing(inset: number): THREE.Vector2[] {
  const d = logoParts().diamond[0]
  const c = new THREE.Vector2()
  const pts = d.getPoints()
  if (pts.length > 1 && pts[0].distanceTo(pts[pts.length - 1]) < 1e-9) pts.pop()
  for (const p of pts) c.add(p)
  c.divideScalar(pts.length)
  const half = Math.max(...pts.map(p => p.distanceTo(c)))
  const k = Math.max(0.2, (half - inset * Math.SQRT2) / half)
  const path = new THREE.Path(pts.map(p => p.clone().sub(c).multiplyScalar(k).add(c)))
  path.closePath()
  return closedOutline(path, 0.002, 0.004)
}

const WALL_VERT = /* glsl */ `
  varying vec3 vN; varying vec3 vV;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`
const WALL_FRAG = /* glsl */ `
  uniform vec3 uColor; uniform float uK, uOn;
  varying vec3 vN; varying vec3 vV;
  void main() {
    // light caught in the glass runs along its walls and shows where you look
    // through the most glass: the silhouettes; a faint tint across the rest
    float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
    float wall = f * f * f;
    vec3 col = uColor * (0.07 + 1.1 * wall);
    gl_FragColor = vec4(col * uK * uOn, 1.0);
  }
`

export interface TubeMark {
  pivot: THREE.Group
  /** the same shape as the frosted mark's handle: root (mark space, scaled), mark (the glass), caps = sides = the glass */
  logo: { root: THREE.Group; mark: THREE.Mesh; caps: THREE.MeshPhysicalMaterial; sides: THREE.MeshPhysicalMaterial }
  glass: THREE.MeshPhysicalMaterial
  /** the light in the glass walls, per part (loop A, loop B, diamond) */
  walls: THREE.ShaderMaterial[]
  rim: THREE.ShaderMaterial
  markAspect: number
}

/** the glass: every tube and the diamond tile, one clear transmissive mesh (mark units) */
export function buildTubeMark(mobile: boolean, envMap: THREE.Texture | null, markS: number): TubeMark {
  const { loops, radius: r } = tubeBands()
  const radial = mobile ? 18 : 32
  const partGeos: THREE.BufferGeometry[] = []
  const Y = new THREE.Vector3(0, 1, 0)
  for (const band of loops) {
    // the rounded glass end reaches exactly to the artwork's cut
    const line = trim(band.pts, r, r).map(p => new THREE.Vector3(p.x, p.y, 0))
    const curve = new THREE.CatmullRomCurve3(line, false, 'centripetal', 0.5)
    const seg = Math.ceil(curve.getLength() / 0.005)
    const tube = new THREE.TubeGeometry(curve, seg, r, radial, false)
    const ends: THREE.BufferGeometry[] = [tube]
    for (const [t, sgn] of [
      [0, -1],
      [1, 1],
    ] as const) {
      const cap = new THREE.SphereGeometry(r, radial, Math.ceil(radial / 4), 0, Math.PI * 2, 0, Math.PI / 2)
      const dir = curve.getTangentAt(t).multiplyScalar(sgn).normalize()
      cap.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(Y, dir))
      cap.translate(...curve.getPointAt(t).toArray())
      ends.push(cap)
    }
    const g = mergeGeometries(ends.map(e => e.toNonIndexed()))!
    for (const e of ends) e.dispose()
    partGeos.push(g)
  }
  // the diamond: a glass tile as deep as the tubes, its edges rolled round
  const bt = r * 0.55
  const tile = extrudeInset(logoParts().diamond, { depth: Math.max(0.001, 2 * r - 2 * bt), bevelThickness: bt, bevelSize: bt * 0.8, bevelSegments: mobile ? 5 : 8 })
  tile.deleteAttribute('uv')
  const tileN = toCreasedNormals(tile, Math.PI / 5)
  tile.dispose()
  tileN.clearGroups()
  for (const g of partGeos) g.deleteAttribute('uv')
  partGeos.push(tileN)
  const all = mergeGeometries(partGeos)!
  all.computeBoundingBox()
  all.computeBoundingSphere()

  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0,
    transmission: 1,
    // a HOLLOW tube: a thin glass wall (mark units; the transmission ray scales with the
    // mesh), so the neon inside keeps its own size (a solid rod would magnify it to fill the tube)
    thickness: r * 0.12,
    ior: 1.5,
    specularIntensity: 1,
    specularColor: new THREE.Color(0xffffff),
    clearcoat: 0.5,
    clearcoatRoughness: 0.04,
    envMapIntensity: 1,
  })
  glass.dispersion = mobile ? 0 : 0.28
  // crisp: the neon inside reads sharp through the clear glass
  sharpTransmission(glass)
  if (envMap) glass.envMap = envMap
  const mark = new THREE.Mesh(all, glass)
  const root = new THREE.Group()
  root.add(mark)

  const colors = [G.neonA, G.neonB, G.neonC]
  const walls = partGeos.map((g, i) => {
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      uniforms: { uColor: { value: new THREE.Color(colors[i === partGeos.length - 1 ? 2 : i]) }, uK: { value: 0 }, uOn: { value: 0 } },
      vertexShader: WALL_VERT,
      fragmentShader: WALL_FRAG,
    })
    const w = new THREE.Mesh(g, m)
    w.renderOrder = 2
    root.add(w)
    return m
  })
  // a faint white rim: the glass's own edge in the studio light
  const rim = edgeGlow(G.ice, 3, 0)
  const rimMesh = new THREE.Mesh(all, rim)
  rimMesh.renderOrder = 3
  root.add(rimMesh)

  root.scale.setScalar(markS)
  const pivot = new THREE.Group()
  pivot.add(root)
  const bb = all.boundingBox!
  const markAspect = (bb.max.x - bb.min.x) / Math.max(1e-3, bb.max.y - bb.min.y)
  return { pivot, logo: { root, mark, caps: glass, sides: glass }, glass, walls, rim, markAspect }
}

/**
 * The neon inside the glass: a tube down each loop's centre line (stopping
 * short of the glass ends, where the electrodes would be) and a square in the
 * diamond. Same shape as the kit's neonMark: `parts[i]` = part i's tubes.
 */
export function buildTubeNeon(isFrameTarget: (rt: THREE.WebGLRenderTarget | null) => boolean, mirror?: { floorY: number; fade?: number }): { root: THREE.Group; parts: NeonPath[][] } {
  const { loops, radius: r } = tubeBands()
  const colors = [G.neonA, G.neonB, G.neonC]
  const root = new THREE.Group()
  const parts: NeonPath[][] = []
  const core = r * 0.2
  loops.forEach((band, i) => {
    const line = trim(band.pts, r * 1.25, r * 1.25)
    const t = neonPath({
      points: line.map(p => new THREE.Vector3(p.x, p.y, 0)),
      closed: false,
      color: colors[i],
      radius: core,
      glowRadius: r * 1.5,
      endFade: r * 1.1,
      segments: line.length * 2,
      mirror,
      isFrameTarget,
    })
    root.add(t.root)
    parts.push([t])
  })
  const ring = diamondRing(r * 0.42)
  const d = neonPath({
    points: ring.map(p => new THREE.Vector3(p.x, p.y, 0)),
    closed: true,
    color: colors[2],
    radius: core * 0.8,
    glowRadius: r * 1.2,
    segments: ring.length * 2,
    mirror,
    isFrameTarget,
  })
  root.add(d.root)
  parts.push([d])
  return { root, parts }
}
