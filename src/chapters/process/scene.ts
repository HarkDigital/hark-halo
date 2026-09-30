import * as THREE from 'three'
import { G, frostedLogo, neonPath, type NeonPath, closedOutline } from '../../kit/glass'
import { LOGO } from '../../kit/palette'
import { buildTubeMark, buildTubeNeon } from '../../kit/tube'
import { logoParts } from '../../logo/logo'

/*
 * ASSEMBLY — the process chapter's set. The process builds the Hark mark,
 * one step at a time, in the black room over the mirror floor.
 *
 *   sketch     one additive plane in the mark's own plane (mark units): the
 *              point of light where the mark's centre will be, the LISTEN
 *              rings (the diamond's outline, rounding into circles as they
 *              spread) and the PROTOTYPE construction drawing — a fine grid,
 *              the axes and diagonals, the four circles every curl is drawn
 *              from and the tangent lines the bars run along (the mark's real
 *              geometry: curls r 0.15 / 0.054 at (0, ±0.35), (±0.35, 0); bar
 *              edges at x − y = ±0.135, ±0.277), crop marks. Mirrored copy in
 *              the floor.
 *   TUBE       (the site's mark, kit/palette LOGO) the mark as neon encased in
 *              glass tubes (kit/tube): the neon is the tubes' centre lines,
 *              drawn in and staying in the mark's plane (no halo to become);
 *              the glass printed round it is the clear tubes.
 *   neon       (?logo=1) the kit's neonMark (loop A, loop B, the diamond), drawn in with
 *              `draw` and sparked with `pulse`. It starts in the mark's plane
 *              (the working model), then glides back and grows into the
 *              hero's halo behind the glass. Mirrored copy in the floor.
 *   glass      the frosted mark (kit frostedLogo, straight walls), PRINTED
 *              from the floor up: everything above the print front is
 *              discarded, the freshly fused layer glows and cools.
 *   head       the print head: a line of light riding the print front.
 *   card       the backlight: bright in three's glass buffer (the frost
 *              glows), faint in the frame (the room stays black).
 *   floor      the black mirror floor: a soft pool of light under the mark.
 *   reflection the glass mark mirrored in the floor (cheap, not transmissive).
 */

/** mark height in world units */
export const MARK_S = 2.2
/** the black mirror floor, a little below the mark */
export const FLOOR_Y = -MARK_S / 2 - 0.36
/** the glass slab's depth (mark units): straight walls, sharp edges */
export const DEPTH = 0.24
/** the frost: translucent, the neon and the backlight read through it as soft shapes */
export const FROST = 0.36
/** how far the frost spreads the light behind it, past three's own blur */
const DIFFUSE = 1.55
/** the finished halo: the neon mark this far behind the glass, this much larger (the hero's) */
export const HALO_Z = -(DEPTH / 2) - 0.2
export const HALO_SCALE = 1.16

/** the story's mark */
export const TUBE = LOGO.kind === 'tube'

/** reflect about the floor plane: y → 2·FLOOR_Y − y */
export const FLOOR_MIRROR = new THREE.Matrix4().makeTranslation(0, 2 * FLOOR_Y, 0).multiply(new THREE.Matrix4().makeScale(1, -1, 1))

type IsFrame = (rt: THREE.WebGLRenderTarget | null) => boolean

// ------------------------------------------------------------------ sketch

export interface SketchUniforms {
  uIce: { value: THREE.Color }
  uColA: { value: THREE.Color }
  uColB: { value: THREE.Color }
  uColC: { value: THREE.Color }
  /** overall strength */
  uK: { value: number }
  /** the point of light at the centre */
  uDot: { value: number }
  /** listen rings: strength, phase (rings travel outward as it grows), how far they spread */
  uRings: { value: number }
  uRingPhase: { value: number }
  uRingMax: { value: number }
  /** construction drawing: each layer's strength and how far it has been drawn (0..1) */
  uGrid: { value: number }
  uGridR: { value: number }
  uAxes: { value: THREE.Vector2 }
  uCircles: { value: THREE.Vector2 }
  uTangents: { value: THREE.Vector2 }
  uFrame: { value: THREE.Vector2 }
  /** floor clip / mirror */
  uFloorY: { value: number }
  uMirror: { value: number }
  uFade: { value: number }
}

const SKETCH_VERT = /* glsl */ `
  varying vec2 vP;
  varying float vWY;
  void main() {
    vP = position.xy;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWY = w.y;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`

const SKETCH_FRAG = /* glsl */ `
  uniform vec3 uIce, uColA, uColB, uColC;
  uniform float uK, uDot, uRings, uRingPhase, uRingMax, uGrid, uGridR;
  uniform vec2 uAxes, uCircles, uTangents, uFrame;
  uniform float uFloorY, uMirror, uFade;
  varying vec2 vP;
  varying float vWY;

  const float TAU = 6.28318531;
  const float S2 = 0.70710678;

  // a hairline about 1.3 px wide (aa = one pixel in mark units)
  float hair(float d, float aa) { return 1.0 - smoothstep(aa * 0.35, aa * 1.35, d); }
  // a straight line segment grown from its middle: d across, s along (0 at the middle), half-length L
  float grown(float d, float s, float L, float aa) {
    return hair(d, aa) * (1.0 - smoothstep(L - aa * 2.0, L, abs(s)));
  }
  // a circle drawn round from angle a0 like a compass
  float arc(vec2 p, vec2 c, float r, float a0, float draw, float aa) {
    vec2 q = p - c;
    float t = fract((atan(q.y, q.x) - a0) / TAU);
    float on = 1.0 - smoothstep(draw - 0.012, draw, t);
    return hair(abs(length(q) - r), aa) * on * step(0.001, draw);
  }

  void main() {
    vec2 p = vP;
    float aa = max(length(fwidth(p)) * 0.7071, 1e-5);
    float r = length(p);
    vec3 col = vec3(0.0);

    // ---- the point of light where the mark's centre will be
    if (uDot > 0.0) {
      col += (uIce * exp(-r * r / 0.00012) * 1.4 + uColC * exp(-r * r / 0.0035) * 0.35) * uDot;
    }

    // ---- LISTEN: rings leave the diamond, its outline rounding into circles as they spread
    if (uRings > 0.0) {
      vec2 a = max(abs(p), vec2(1e-6));
      // which loop's side of the mark a point is on (loop A up-left, loop B down-right)
      float side = clamp((p.y - p.x) / max(r * 1.4, 1e-3) * 0.5 + 0.5, 0.0, 1.0);
      vec3 sideCol = mix(uColB, uColA, side);
      for (int i = 0; i < 5; i++) {
        float ph = fract(uRingPhase + float(i) * 0.2);
        float rr = mix(0.085, uRingMax, ph);
        float round01 = smoothstep(0.0, 0.5, ph);
        float pn = 1.0 + round01;
        float n = pow(pow(a.x, pn) + pow(a.y, pn), 1.0 / pn);
        float d = abs(n - rr) / mix(1.41421356, 1.0, round01);
        float fade = (1.0 - ph) * (1.0 - ph) * smoothstep(0.0, 0.08, ph);
        vec3 c = mix(uColC, sideCol, smoothstep(0.1, 0.75, ph));
        float core = hair(d, aa);
        float glow = exp(-d * d / 0.00012);
        col += c * (core * 1.25 + glow * 0.45) * fade * uRings;
      }
    }

    // ---- PROTOTYPE: the construction drawing
    if (uGrid > 0.0) {
      float box = max(abs(p.x), abs(p.y));
      float m = (1.0 - smoothstep(uGridR - 0.16, uGridR, r)) * (1.0 - smoothstep(0.5, 0.66, box));
      vec2 g = abs(fract(p / 0.05 + 0.5) - 0.5) * 0.05;
      vec2 g2 = abs(fract(p / 0.25 + 0.5) - 0.5) * 0.25;
      float fine = max(hair(g.x, aa), hair(g.y, aa));
      float major = max(hair(g2.x, aa), hair(g2.y, aa));
      col += uIce * (fine * 0.12 + major * 0.26) * m * uGrid;
    }
    if (uAxes.x > 0.0) {
      float L = 0.66 * uAxes.y;
      float u = (p.x + p.y) * S2;
      float v = (p.x - p.y) * S2;
      float ax = max(grown(abs(p.y), p.x, L, aa), grown(abs(p.x), p.y, L, aa));
      // the diagonals the bars run along: dashed
      float dash = smoothstep(0.35, 0.5, abs(fract(max(abs(u), abs(v)) / 0.024) - 0.5) * 2.0);
      float dg = max(grown(abs(v), u, L * 1.05, aa), grown(abs(u), v, L * 1.05, aa)) * (0.35 + 0.65 * dash);
      col += uIce * (ax * 0.5 + dg * 0.42) * uAxes.x;
    }
    if (uCircles.x > 0.0) {
      float dr = uCircles.y;
      // loop A's curls (top, left) and loop B's (bottom, right): outer 0.15, inner 0.054
      float ca = arc(p, vec2(0.0, 0.35), 0.15, 1.57, dr, aa) + arc(p, vec2(-0.35, 0.0), 0.15, 3.14, dr, aa)
               + 0.8 * (arc(p, vec2(0.0, 0.352), 0.054, 1.57, dr, aa) + arc(p, vec2(-0.352, 0.0), 0.054, 3.14, dr, aa));
      float cb = arc(p, vec2(0.0, -0.35), 0.15, -1.57, dr, aa) + arc(p, vec2(0.35, 0.0), 0.15, 0.0, dr, aa)
               + 0.8 * (arc(p, vec2(0.0, -0.352), 0.054, -1.57, dr, aa) + arc(p, vec2(0.352, 0.0), 0.054, 0.0, dr, aa));
      col += (mix(uIce, uColA, 0.55) * ca + mix(uIce, uColB, 0.55) * cb) * 0.85 * uCircles.x;
    }
    if (uTangents.x > 0.0) {
      float L = 0.62 * uTangents.y;
      float u = (p.x + p.y) * S2;
      float v = (p.x - p.y) * S2;
      // the bars' edges: tangent to the outer and inner circles of both curls
      float ta = grown(abs(v + 0.0955), u, L, aa) + grown(abs(v + 0.1959), u, L, aa);
      float tb = grown(abs(v - 0.0955), u, L, aa) + grown(abs(v - 0.1959), u, L, aa);
      col += (mix(uIce, uColA, 0.4) * ta + mix(uIce, uColB, 0.4) * tb) * 0.55 * uTangents.x;
    }
    if (uFrame.x > 0.0) {
      // crop marks at the corners of the mark's square, and a centre cross
      vec2 q = abs(p);
      float E = 0.56;
      float len = 0.07 * uFrame.y;
      float cm = hair(abs(q.x - E), aa) * step(E - len, q.y) * step(q.y, E) + hair(abs(q.y - E), aa) * step(E - len, q.x) * step(q.x, E);
      float cx = 0.02 * uFrame.y;
      float cc = hair(abs(p.y), aa) * step(q.x, cx) + hair(abs(p.x), aa) * step(q.y, cx);
      col += uIce * (cm * 0.7 + cc * 0.6) * uFrame.x;
    }

    // the floor: the drawing stops at it; the mirrored copy shows only below, fading with depth
    float below = uFloorY - vWY;
    float keep = mix(1.0 - smoothstep(-0.03, -0.004, below), exp(-max(below, 0.0) * uFade) * step(0.0, below), uMirror);
    gl_FragColor = vec4(col * uK * keep, 1.0);
  }
`

export function buildSketch(): { mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>; mirror: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>; u: SketchUniforms } {
  const u: SketchUniforms = {
    uIce: { value: new THREE.Color(G.ice) },
    uColA: { value: new THREE.Color(G.neonA) },
    uColB: { value: new THREE.Color(G.neonB) },
    uColC: { value: new THREE.Color(G.neonC) },
    uK: { value: 1 },
    uDot: { value: 0 },
    uRings: { value: 0 },
    uRingPhase: { value: 0 },
    uRingMax: { value: 0.9 },
    uGrid: { value: 0 },
    uGridR: { value: 0 },
    uAxes: { value: new THREE.Vector2() },
    uCircles: { value: new THREE.Vector2() },
    uTangents: { value: new THREE.Vector2() },
    uFrame: { value: new THREE.Vector2() },
    uFloorY: { value: FLOOR_Y },
    uMirror: { value: 0 },
    uFade: { value: 2.2 },
  }
  const make = (uu: SketchUniforms) => {
    const mat = new THREE.ShaderMaterial({
      uniforms: uu as unknown as Record<string, THREE.IUniform>,
      vertexShader: SKETCH_VERT,
      fragmentShader: SKETCH_FRAG,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
    // in mark units (the plane lives in the mark's own space); rings spread past the mark
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), mat)
    m.frustumCulled = false
    m.renderOrder = 3
    return m
  }
  const mesh = make(u)
  const mirror = make({ ...u, uMirror: { value: 1 }, uK: { value: 0 } })
  mirror.matrixAutoUpdate = false
  return { mesh, mirror, u }
}

// ------------------------------------------------------------------ the printed glass mark

export interface PrintUniforms {
  /** the print front (object y, mark units): glass above it isn't there yet */
  uPrint: { value: number }
  /** the freshly fused layer's glow */
  uHot: { value: number }
  uHotColor: { value: THREE.Color }
}

const LOD_RE = /float lod = log2\( transmissionSamplerSize\.x \) \* applyIorToRoughness\( roughness, ior \);\s*return textureBicubic\( transmissionSamplerMap, fragCoord\.xy, lod \);/

/** three's transmission read with the frost spread wider (light arrives through it as soft washes) */
function diffuseTransmissionChunk(): string | null {
  const chunk = THREE.ShaderChunk.transmission_pars_fragment
  if (!LOD_RE.test(chunk)) {
    if (import.meta.env.DEV) console.warn('[process] three transmission chunk changed; the frost keeps three’s blur')
    return null
  }
  return chunk.replace(
    LOD_RE,
    `float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior ) * ${DIFFUSE.toFixed(2)};
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );`,
  )
}

const PRINT_PARS = /* glsl */ `
varying vec3 vPrP;
uniform float uPrint, uHot;
uniform vec3 uHotColor;`

const PRINT_CLIP = /* glsl */ `#include <clipping_planes_fragment>
	if ( vPrP.y > uPrint ) discard;`

const PRINT_GLOW = /* glsl */ `#include <emissivemap_fragment>
	if ( uHot > 0.0 ) {
		// the fused layer: a razor-bright edge, a warm band under it, cooling fast
		float prD = max( uPrint - vPrP.y, 0.0 );
		float prK = prD / 0.0055;
		totalEmissiveRadiance += uHotColor * uHot * ( exp( -prK * prK ) * 1.5 + 0.22 * exp( -prD / 0.05 ) );
	}`

function patchPrint(m: THREE.MeshPhysicalMaterial, u: PrintUniforms, key: string, diffuse: boolean) {
  const chunk = diffuse ? diffuseTransmissionChunk() : null
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u)
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPrP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPrP = position;')
    let f = sh.fragmentShader
    if (chunk) f = f.replace('#include <transmission_pars_fragment>', chunk)
    sh.fragmentShader = f
      .replace('#include <common>', `#include <common>\n${PRINT_PARS}`)
      .replace('#include <clipping_planes_fragment>', PRINT_CLIP)
      .replace('#include <emissivemap_fragment>', PRINT_GLOW)
  }
  m.customProgramCacheKey = () => key
}

export interface PrintedMark {
  logo: { root: THREE.Group; mark: THREE.Mesh; caps: THREE.MeshPhysicalMaterial; sides: THREE.MeshPhysicalMaterial }
  print: PrintUniforms
  /** the tube mark's light in its glass walls (per part) and its white rim; empty / null for the frosted mark */
  walls: THREE.ShaderMaterial[]
  rim: THREE.ShaderMaterial | null
}

export function buildGlass(envMap: THREE.Texture | null, mobile = false): PrintedMark {
  if (TUBE) {
    const print: PrintUniforms = { uPrint: { value: -1 }, uHot: { value: 0 }, uHotColor: { value: new THREE.Color(G.ice) } }
    const tm = buildTubeMark(mobile, envMap, MARK_S, print)
    return { logo: tm.logo, print, walls: tm.walls, rim: tm.rim }
  }
  const logo = frostedLogo({ depth: DEPTH, bevel: 0, frost: FROST })
  const { caps, sides } = logo
  // fully frosted, like the hero: satin walls meeting the frosted faces at crisp edges
  sides.roughness = FROST * 0.8
  sides.clearcoat = 0
  sides.dispersion = 0
  sides.thickness = 0.12
  sides.color.setScalar(1)
  caps.thickness = 0.16
  if (envMap) {
    caps.envMap = envMap
    sides.envMap = envMap
  }
  caps.envMapIntensity = 0.12
  sides.envMapIntensity = 1.2
  const print: PrintUniforms = {
    uPrint: { value: -1 },
    uHot: { value: 0 },
    uHotColor: { value: new THREE.Color(G.ice) },
  }
  patchPrint(caps, print, 'hark-halo-process-caps-1', true)
  patchPrint(sides, print, 'hark-halo-process-sides-1', false)
  logo.root.scale.setScalar(MARK_S)
  return { logo, print, walls: [], rim: null }
}

// ------------------------------------------------------------------ the print head

export function buildHead(): { mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>; u: { uK: { value: number }; uColor: { value: THREE.Color } } } {
  const u = { uK: { value: 0 }, uColor: { value: new THREE.Color(G.ice) } }
  const mat = new THREE.ShaderMaterial({
    uniforms: u,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
    vertexShader: /* glsl */ `varying vec2 vP; void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uK; uniform vec3 uColor; varying vec2 vP;
      void main() {
        // (mark units) a line across the mark at the print front, brackets at its ends
        float aa = max(length(fwidth(vP)) * 0.7071, 1e-5);
        float y = abs(vP.y);
        float x = abs(vP.x);
        float line = 1.0 - smoothstep(aa * 0.6, aa * 1.6, y);
        float halo = exp(-y * y / 0.00008) * 0.5 + exp(-y * y / 0.0012) * 0.12;
        float span = 1.0 - smoothstep(0.6, 0.64, x);
        // the head's end stops: short vertical ticks just past the mark's sides
        float tick = (1.0 - smoothstep(aa * 0.6, aa * 1.6, abs(x - 0.6))) * step(y, 0.018);
        gl_FragColor = vec4(uColor * ((line * 1.6 + halo) * span + tick * 1.1) * uK, 1.0);
      }
    `,
  })
  // in mark units: 1.4 wide, 0.2 tall around the line (the halo is gone by its edges)
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.2), mat)
  mesh.frustumCulled = false
  mesh.renderOrder = 4
  return { mesh, u }
}

// ------------------------------------------------------------------ the neon (the hero's halo, drawn in)

export interface Neon {
  root: THREE.Group
  /** loop A, loop B, the diamond: each part's tubes */
  parts: NeonPath[][]
  /** each part's first tube's axis (root space; getPointAt(u) matches the tube's `draw` / `pulse` u) */
  curves: THREE.Curve<THREE.Vector3>[]
}

/**
 * The diamond's contour with softly rounded corners (mark units, from the
 * top corner, counter-clockwise like the loops): a tube bent through a
 * dead-sharp corner folds its halo sleeve into streaks, and the diamond is
 * seen close up here.
 */
function diamondContour(): THREE.Vector3[] {
  const R = 0.0765
  const rf = 0.013
  const inset = R - rf * Math.SQRT2
  const pts: THREE.Vector3[] = []
  for (let k = 0; k < 4; k++) {
    const th = Math.PI / 2 + (k * Math.PI) / 2
    const cx = Math.cos(th) * inset
    const cy = Math.sin(th) * inset
    // the fillet round this corner
    for (let j = 0; j <= 8; j++) {
      const a = th - Math.PI / 4 + (j / 8) * (Math.PI / 2)
      pts.push(new THREE.Vector3(cx + Math.cos(a) * rf, cy + Math.sin(a) * rf, 0))
    }
    // the straight edge to the next corner
    const a1 = th + Math.PI / 4
    const th2 = th + Math.PI / 2
    const nx = Math.cos(th2) * inset + Math.cos(th2 - Math.PI / 4) * rf
    const ny = Math.sin(th2) * inset + Math.sin(th2 - Math.PI / 4) * rf
    const ex = cx + Math.cos(a1) * rf
    const ey = cy + Math.sin(a1) * rf
    for (let j = 1; j < 8; j++) pts.push(new THREE.Vector3(lerpN(ex, nx, j / 8), lerpN(ey, ny, j / 8), 0))
  }
  // start at the top corner's apex
  const start = 4
  return [...pts.slice(start), ...pts.slice(0, start)]
}
const lerpN = (a: number, b: number, t: number) => a + (b - a) * t

/**
 * The Hark mark in neon (the kit's neonMark, with a rounded diamond): one
 * glass tube along every contour, in the mark's own plane (z 0, 1:1). Animate
 * root.position.z / root.scale to mount it behind the glass as the halo.
 * Loop A neonA, loop B neonB, the diamond neonC.
 */
export function buildNeon(isFrameTarget: IsFrame, mirror?: { floorY: number; fade?: number }): Neon {
  // the tube mark: the neon down the bands' centre lines (the curves match draw / pulse u)
  if (TUBE) return buildTubeNeon(isFrameTarget, mirror)
  const root = new THREE.Group()
  const lp = logoParts()
  const colors = [G.neonA, G.neonB, G.neonC]
  const parts: NeonPath[][] = []
  const curves: THREE.Curve<THREE.Vector3>[] = []
  // (the kit's neonPath curve: centripetal Catmull-Rom through the points, closed)
  const curveOf = (pts: THREE.Vector3[]) => new THREE.CatmullRomCurve3(pts, true, 'centripetal', 0.5)
  ;[lp.loopA, lp.loopB].forEach((shapes, pi) => {
    const tubes: NeonPath[] = []
    for (const shape of shapes) {
      for (const path of [shape, ...shape.holes]) {
        const ring = closedOutline(path, 0.004)
        const n = ring.length
        const pts = ring.map(p => new THREE.Vector3(p.x, p.y, 0))
        const t = neonPath({ points: pts, closed: true, color: colors[pi], radius: 0.0072, glowRadius: 0.045, segments: n * 2, mirror, isFrameTarget })
        root.add(t.root)
        if (!tubes.length) curves.push(curveOf(pts))
        tubes.push(t)
      }
    }
    parts.push(tubes)
  })
  const dp = diamondContour()
  const d = neonPath({ points: dp, closed: true, color: colors[2], radius: 0.0068, glowRadius: 0.026, segments: 220, mirror, isFrameTarget })
  root.add(d.root)
  parts.push([d])
  curves.push(curveOf(dp))
  return { root, parts, curves }
}

// ------------------------------------------------------------------ sparks

export interface Spark {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>
  /** 0..1 */
  k: { value: number }
}

/**
 * A spark of light riding a neon tube: a camera-facing bead in the opaque
 * list, so three's glass buffer sees it and the frost in front turns it into
 * a soft glow travelling through the glass; where the tube shows past the
 * glass, a white-hot bead on it. (The tube's own `pulse` brightens the tube
 * with it.) Place it in the neon root's space.
 */
export function buildSpark(color: THREE.ColorRepresentation, isFrameTarget: IsFrame, size = 0.16, transHalo = 5.0): Spark {
  const k = { value: 0 }
  const u = {
    uColor: { value: new THREE.Color(color) },
    uSize: { value: size },
    uK: k,
    uCore: { value: 0 },
    uHalo: { value: 0 },
  }
  const mat = new THREE.ShaderMaterial({
    uniforms: u,
    transparent: false,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    vertexShader: /* glsl */ `
      uniform float uSize;
      varying vec2 vQ;
      void main() {
        vQ = position.xy * 2.0;
        vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        // world-sized billboard (the parents' scale sets it: mark units x the mark's height)
        float s = length((modelMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz);
        mv.xy += position.xy * uSize * s;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uK, uCore, uHalo;
      varying vec2 vQ;
      void main() {
        float r2 = dot(vQ, vQ);
        float core = exp(-r2 * 60.0);
        float halo = exp(-r2 * 7.0) * (1.0 - smoothstep(0.7, 1.0, r2));
        vec3 c = (mix(uColor, vec3(1.0), 0.6) * core * uCore + uColor * halo * uHalo) * uK;
        gl_FragColor = vec4(c, 1.0);
      }
    `,
  })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat)
  mesh.frustumCulled = false
  mesh.renderOrder = -3
  mesh.onBeforeRender = renderer => {
    const rt = renderer.getRenderTarget()
    const main = rt === null || isFrameTarget(rt as THREE.WebGLRenderTarget)
    // the frame: a small hot bead; the glass buffer: a broad glow for the frost to spread
    u.uCore.value = main ? 2.4 : 4.0
    u.uHalo.value = main ? 0.25 : transHalo
    mat.uniformsNeedUpdate = true
  }
  return { mesh, k }
}

// ------------------------------------------------------------------ backlight card

export interface CardPass {
  glow: number
  wide: number
}

const CARD_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uHalf, uCore, uWideR, uGlow, uWide;
  varying vec2 vUv;
  void main() {
    vec2 p = (vUv - 0.5) * 2.0 * uHalf;
    float r2 = dot(p, p);
    float C = max(uCore, 0.01);
    float W = max(uWideR, 0.01);
    float glow = exp(-r2 / (C * C)) + 0.12 * exp(-r2 / (C * C * 6.0));
    float wide = exp(-r2 / (W * W));
    float edge = 1.0 - smoothstep(0.7, 1.0, sqrt(r2) / uHalf);
    gl_FragColor = vec4(uColor * (glow * uGlow + wide * uWide) * edge, 1.0);
  }
`

/**
 * The backlight: an additive card in the opaque list (three's glass buffer
 * sees it) with per-pass strengths — bright where the frost reads it, faint
 * in the frame.
 */
export function buildCard(isFrameTarget: IsFrame) {
  const k = { main: { glow: 0, wide: 0 } as CardPass, trans: { glow: 0, wide: 0 } as CardPass }
  const mat = new THREE.ShaderMaterial({
    transparent: false,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
    uniforms: {
      uColor: { value: new THREE.Color(G.ice) },
      uHalf: { value: 5 },
      uCore: { value: 0.6 },
      uWideR: { value: 1.6 },
      uGlow: { value: 0 },
      uWide: { value: 0 },
    },
    vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: CARD_FRAG,
  })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat)
  mesh.renderOrder = -6
  mesh.frustumCulled = false
  const u = mat.uniforms
  mesh.onBeforeRender = renderer => {
    const rt = renderer.getRenderTarget()
    const p = rt === null || isFrameTarget(rt as THREE.WebGLRenderTarget) ? k.main : k.trans
    u.uGlow.value = p.glow
    u.uWide.value = p.wide
    mat.uniformsNeedUpdate = true
  }
  return { mesh, k }
}

// ------------------------------------------------------------------ floor + reflection

export function buildFloor(): THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> {
  const mat = new THREE.ShaderMaterial({
    transparent: false,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    uniforms: {
      uColor: { value: new THREE.Color(G.ice) },
      uK: { value: 0 },
      uPool: { value: new THREE.Vector2(0, -0.4) },
      uPoolR: { value: new THREE.Vector2(1.1, 0.6) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying vec3 vW;
      void main() {
        vUv = uv;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uK; uniform vec2 uPool, uPoolR;
      varying vec2 vUv; varying vec3 vW;
      void main() {
        vec2 d = (vW.xz - uPool) / uPoolR;
        float pool = exp(-dot(d, d));
        float edge = 1.0 - smoothstep(0.35, 0.5, length(vUv - 0.5));
        gl_FragColor = vec4(uColor * pool * edge * uK, 1.0);
      }
    `,
  })
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), mat)
  floor.rotation.x = -Math.PI / 2
  floor.position.y = FLOOR_Y
  floor.renderOrder = -7
  return floor
}

/**
 * The glass mark mirrored in the black floor: a frosted glow toward the
 * centre and a bright rim on the walls, fading with depth below the floor,
 * printed up to the same front. Transparent + additive, so the glass buffer
 * never sees it.
 */
export function buildReflection(geo: THREE.BufferGeometry, print: PrintUniforms): THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial> {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    uniforms: {
      uColor: { value: new THREE.Color(G.ice) },
      uStrength: { value: 0 },
      uFloorY: { value: FLOOR_Y },
      uFade: { value: 1.6 },
      uPrint: print.uPrint,
    },
    vertexShader: /* glsl */ `
      varying vec3 vP; varying vec3 vN; varying vec3 vV; varying float vWY;
      void main() {
        vP = position;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWY = w.y;
        vec4 mv = viewMatrix * w;
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uStrength, uFloorY, uFade, uPrint;
      varying vec3 vP; varying vec3 vN; varying vec3 vV; varying float vWY;
      void main() {
        if (vP.y > uPrint) discard;
        float below = max(uFloorY - vWY, 0.0);
        float fade = exp(-below * uFade) * step(vWY, uFloorY + 0.001);
        float glow = 0.22 + 0.78 * exp(-dot(vP.xy, vP.xy) / 0.1);
        float nv = clamp(abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0);
        float f = 1.0 - nv;
        vec3 col = uColor * (glow * nv * 0.75 + f * f * f * 1.4);
        gl_FragColor = vec4(col * fade * uStrength, 1.0);
      }
    `,
  })
  const m = new THREE.Mesh(geo, mat)
  m.matrixAutoUpdate = false
  m.frustumCulled = false
  m.renderOrder = 1
  return m
}
