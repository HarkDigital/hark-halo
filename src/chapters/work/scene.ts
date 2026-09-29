import * as THREE from 'three'
import { G, neonPath, type NeonPath } from '../../kit/glass'
import { placeholderTexture } from '../../kit/images'
import type { WorkItem } from '../../content'

/*
 * The Carousel set: a revolving glass showroom on the black mirror floor.
 *
 *  THE DRUM   six tall leaves of CURVED glass stand in a circle (radius R,
 *             centred on the origin) like the drum of a revolving door, each
 *             facing out, each carrying one site. A leaf is a bent grid (front
 *             and back faces) inside a polished round rim. Its face shader
 *             draws the screenshot as a backlit print behind the glass: sharp
 *             when the leaf is clear (roughness ~0, crisp studio strips),
 *             diffused into soft colour when it is frosted (mip blur + a
 *             jittered sandblast), bleeding into the frosted glass around it.
 *             Transmission-free: the faces are premultiplied-alpha surfaces
 *             (reflections are added at full strength, the print covers, the
 *             margins let the drum's interior through), so the glass buffer
 *             pass never runs in this chapter.
 *  THE RING   six neon arcs on the floor INSIDE the drum (cyan, violet,
 *             magenta, twice round), one behind each leaf: the frost glows
 *             in its arc's colour from the floor up. The front leaf's bottom
 *             edge lights with a thin tube of the same colour.
 *  THE HALO   for the other nine: the floor ring lifts through the drum and
 *             opens above it into a halo of nine arcs; nine smaller curved
 *             tiles hang on it, turning like a carousel's crown.
 *  THE FLOOR  additive: the ring's light pooled on the black floor, the lit
 *             screen's colour pooled in front of it, and mirrored copies of
 *             the leaves and their neon below it (a black mirror).
 */

const DEG = Math.PI / 180

/** the neon trio, in order round the rings */
export const NEON = [G.neonA, G.neonB, G.neonC] as const
export const NEON_C = NEON.map(c => new THREE.Color(c))

/* ---------------------------------------------------------------- drum */

export const R = 2.0
export const STEP = (Math.PI * 2) / 6
const GAP = 5.5 * DEG
export const LEAF_W = R * (STEP - GAP)
/** the print: full width inside a slim margin — the leaf is just the site (the card carries the name) */
const MARGIN = 0.065
export const SHOT_W = LEAF_W - 2 * MARGIN
export const SHOT_H = SHOT_W * 0.625
export const LEAF_H = SHOT_H + 2 * MARGIN
/** bottom edge height: the leaves stand just off the floor, so the ring shows beneath */
export const LEAF_Y0 = 0.3
export const LEAF_CY = LEAF_Y0 + LEAF_H / 2
const LEAF_T = 0.05
const CORNER = 0.05
/** the print's centre height (world) */
export const SHOT_CY = LEAF_Y0 + LEAF_H - MARGIN - SHOT_H / 2
/** the ring on the floor, inside the drum */
export const RING_R = R - 0.36
export const RING_Y = 0.022

/* ---------------------------------------------------------------- halo */

export const HALO_N = 9
export const HALO_STEP = (Math.PI * 2) / HALO_N
export const HALO_R = 3.0
const TILE_GAP = 6 * DEG
export const TILE_W = HALO_R * (HALO_STEP - TILE_GAP)
const TILE_M = 0.035
export const TILE_H = (TILE_W - 2 * TILE_M) * 0.625 + 2 * TILE_M
const TILE_T = 0.034
/** tile centre height; the halo ring runs just under the tiles */
export const HALO_Y = 3.45
export const HALO_RING_Y = HALO_Y - TILE_H / 2 - 0.075

/** City Line Capital (harktest.com) is a pre-launch build: never signal it as live. */
export const isPreview = (url: string) => {
  try {
    return /(^|\.)harktest\.com$/i.test(new URL(url).hostname)
  } catch {
    return false
  }
}

const pad = (n: number) => String(n).padStart(2, '0')

/* ---------------------------------------------------------------- geometry */

/**
 * Bend a flat geometry (x along the arc, y up, z out of the glass) round a
 * vertical axis at (0, 0, -r): x becomes arc length, so the piece's centre
 * stays at the origin facing +z.
 */
function bend(geo: THREE.BufferGeometry, r: number) {
  const pos = geo.getAttribute('position') as THREE.BufferAttribute
  const nrm = geo.getAttribute('normal') as THREE.BufferAttribute | undefined
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    const phi = x / r
    const s = Math.sin(phi)
    const c = Math.cos(phi)
    pos.setXYZ(i, (r + z) * s, pos.getY(i), (r + z) * c - r)
    if (nrm) {
      const nx = nrm.getX(i)
      const nz = nrm.getZ(i)
      nrm.setXYZ(i, nx * c + nz * s, nrm.getY(i), -nx * s + nz * c)
    }
  }
  pos.needsUpdate = true
  if (nrm) nrm.needsUpdate = true
  geo.computeBoundingBox()
  geo.computeBoundingSphere()
  return geo
}

/** One face of a curved leaf: a w×h grid at depth z, bent round r. `back` faces inward (its print reads mirrored, as through glass). */
function faceGeometry(w: number, h: number, z: number, r: number, back: boolean, seg: number) {
  const g = new THREE.PlaneGeometry(w, h, seg, 1)
  if (back) {
    g.rotateY(Math.PI)
    // the same print and etching, seen from behind through the glass: mirrored
    const uv = g.getAttribute('uv') as THREE.BufferAttribute
    for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i))
    uv.needsUpdate = true
  }
  g.translate(0, 0, back ? -z : z)
  const n = g.getAttribute('position').count
  g.setAttribute('aBack', new THREE.BufferAttribute(new Float32Array(n).fill(back ? 1 : 0), 1))
  return bend(g, r)
}

/** The rounded rim of a w×h leaf: a round tube along its outline, bent round r. */
function rimGeometry(w: number, h: number, corner: number, radius: number, r: number, seg: number, radial: number) {
  const x0 = -w / 2
  const x1 = w / 2
  const y0 = -h / 2
  const y1 = h / 2
  const c = corner
  const V = (x: number, y: number) => new THREE.Vector3(x, y, 0)
  const path = new THREE.CurvePath<THREE.Vector3>()
  path.add(new THREE.LineCurve3(V(x0 + c, y0), V(x1 - c, y0)))
  path.add(new THREE.QuadraticBezierCurve3(V(x1 - c, y0), V(x1, y0), V(x1, y0 + c)))
  path.add(new THREE.LineCurve3(V(x1, y0 + c), V(x1, y1 - c)))
  path.add(new THREE.QuadraticBezierCurve3(V(x1, y1 - c), V(x1, y1), V(x1 - c, y1)))
  path.add(new THREE.LineCurve3(V(x1 - c, y1), V(x0 + c, y1)))
  path.add(new THREE.QuadraticBezierCurve3(V(x0 + c, y1), V(x0, y1), V(x0, y1 - c)))
  path.add(new THREE.LineCurve3(V(x0, y1 - c), V(x0, y0 + c)))
  path.add(new THREE.QuadraticBezierCurve3(V(x0, y0 + c), V(x0, y0), V(x0 + c, y0)))
  const g = new THREE.TubeGeometry(path, seg, radius, radial, true)
  return bend(g, r)
}

/** Points along an arc of radius r at height y, from angle a0 to a1 (angle from +z toward +x). */
function arcPoints(r: number, y: number, a0: number, a1: number, n: number) {
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n
    pts.push(new THREE.Vector3(r * Math.sin(a), y, r * Math.cos(a)))
  }
  return pts
}

/* ---------------------------------------------------------------- the face */

/** Uniforms of one leaf / tile face (shared by its front and back faces). */
export interface FaceUniforms {
  uShot: { value: THREE.Texture }
  uLabel: { value: THREE.Texture }
  /** 0 = clear glass (the print razor sharp) … 1 = sandblasted */
  uFrost: { value: number }
  /** the print's backlight */
  uLit: { value: number }
  /** print rect in face uv (x0, y0, x1, y1) */
  uRect: { value: THREE.Vector4 }
  uLabelRect: { value: THREE.Vector4 }
  /** face size in world units */
  uSize: { value: THREE.Vector2 }
  uCorner: { value: number }
  /** the neon behind the glass (colour × strength) and its height (world y) */
  uSpill: { value: THREE.Color }
  uRingY: { value: number }
  /** overall presence 0..1 */
  uFade: { value: number }
  /** how milky the frosted margins are (0..1 opacity) */
  uMilk: { value: number }
  /** reflection strength over a clear print (keeps a lit site legible) */
  uSpecIn: { value: number }
  /** the etched label's brightness */
  uEtch: { value: number }
}

const FACE_VERT_HEAD = /* glsl */ `
attribute float aBack;
varying vec2 vFaceUv;
varying float vFaceY;
varying float vBack;
`
const FACE_FRAG_HEAD = /* glsl */ `
varying vec2 vFaceUv;
varying float vFaceY;
varying float vBack;
uniform sampler2D uShot, uLabel;
uniform float uFrost, uLit, uCorner, uRingY, uFade, uMilk, uSpecIn, uEtch;
uniform vec4 uRect, uLabelRect;
uniform vec2 uSize;
uniform vec3 uSpill;
float faceHash( vec2 p ) { vec3 p3 = fract( vec3( p.xyx ) * 0.1031 ); p3 += dot( p3, p3.yzx + 33.33 ); return fract( ( p3.x + p3.y ) * p3.z ); }
// sandblasted glass over a backlit print: a mip-blurred hexagonal gather
// (smooth, so a frosted site reads as soft colour, never as static)
vec3 faceFrost( vec2 suv, float f ) {
	float lod = 0.5 + f * 4.3;
	vec2 ts = exp2( lod ) / vec2( textureSize( uShot, 0 ) );
	vec3 acc = textureLod( uShot, suv, lod ).rgb * 0.28;
	for ( int i = 0; i < 6; i ++ ) {
		float a = float( i ) * 1.0471976 + 0.26;
		acc += textureLod( uShot, clamp( suv + vec2( cos( a ), sin( a ) ) * ts * 1.3, 0.0, 1.0 ), lod ).rgb * 0.12;
	}
	return acc;
}
`
const FACE_FRAG_BODY = /* glsl */ `
	vec2 fp = vFaceUv * uSize;
	vec2 fh = uSize * 0.5;
	// the leaf's rounded outline (the rim tube covers the seam)
	vec2 fq = abs( fp - fh ) - ( fh - uCorner );
	float fOut = length( max( fq, 0.0 ) ) + min( max( fq.x, fq.y ), 0.0 ) - uCorner;
	float faa = max( fwidth( fOut ), 1e-4 );
	float fMask = 1.0 - smoothstep( -faa, faa, fOut );
	// the print
	vec2 rMin = uRect.xy * uSize;
	vec2 rMax = uRect.zw * uSize;
	vec2 rq = abs( fp - ( rMin + rMax ) * 0.5 ) - ( rMax - rMin ) * 0.5;
	float rOut = length( max( rq, 0.0 ) ) + min( max( rq.x, rq.y ), 0.0 );
	float raa = max( fwidth( rOut ), 1e-4 );
	float fr = clamp( uFrost, 0.0, 1.0 );
	// frosted, the print's edge softens into the glass
	float rIn = 1.0 - smoothstep( -raa - fr * 0.02, raa + fr * 0.02, rOut );
	vec2 suv = ( vFaceUv - uRect.xy ) / ( uRect.zw - uRect.xy );
	vec3 sharpC = texture2D( uShot, suv ).rgb;
	vec3 softC = fr > 0.01 ? faceFrost( clamp( suv, 0.0, 1.0 ), fr ) : sharpC;
	// the sandblast's fine, fixed tooth
	softC *= 1.0 + ( faceHash( floor( gl_FragCoord.xy * 0.5 ) ) - 0.5 ) * 0.07 * fr;
	// frosted, a print takes on the neon behind it (never a white wash):
	// its light keeps its luminance but leans to the arc's colour
	float spillMax = max( uSpill.r, max( uSpill.g, uSpill.b ) );
	vec3 tintC = mix( vec3( 1.0 ), uSpill / max( spillMax, 1e-3 ), step( 1e-3, spillMax ) );
	float softL = dot( softC, vec3( 0.2126, 0.7152, 0.0722 ) );
	softC = mix( vec3( softL ), softC, 1.2 );
	softC = mix( softC, softL * tintC * 1.35, 0.38 * fr );
	vec3 shotC = mix( sharpC, softC, smoothstep( 0.0, 0.3, fr ) );
	// light diffusing out of the print into the frosted glass around it
	vec3 edgeC = textureLod( uShot, clamp( suv, 0.0, 1.0 ), 6.0 ).rgb;
	float bleed = exp( -max( rOut, 0.0 ) / 0.13 ) * fr;
	// the neon behind the glass: brightest at the ring's height
	float ringL = exp( -abs( vFaceY - uRingY ) * 2.1 );
	// the etched lot label
	vec2 luv = ( vFaceUv - uLabelRect.xy ) / ( uLabelRect.zw - uLabelRect.xy );
	float lIn = step( 0.0, luv.x ) * step( luv.x, 1.0 ) * step( 0.0, luv.y ) * step( luv.y, 1.0 );
	// (frosted, the etching softens with the glass; from behind it is faint)
	float lab = textureLod( uLabel, clamp( luv, 0.0, 1.0 ), fr * 2.2 ).a * lIn * ( 1.0 - rIn ) * mix( 1.0, 0.1, vBack );
	float glass = 1.0 - rIn;
	// seen from inside the drum a leaf is quieter, so the lit leaf in front leads
	float backK = mix( 1.0, 0.55, vBack );
	vec3 faceEm = shotC * rIn * uLit * backK;
	faceEm += edgeC * bleed * glass * 0.5 * uLit * backK;
	faceEm += uSpill * ringL * glass * mix( 0.4, 1.0, fr ) * backK;
	faceEm += vec3( 0.03, 0.032, 0.036 ) * fr * glass;
	// etched glyphs: frosted white on clear glass, and they catch the neon
	faceEm += ( vec3( 0.58, 0.6, 0.66 ) * mix( 0.75, 0.32, fr ) + uSpill * ringL * 1.8 ) * lab * uEtch;
	float faceA = max( rIn, mix( 0.16, uMilk, fr ) + lab * mix( 0.85, 0.3, fr ) );
	faceA = clamp( faceA, 0.0, 1.0 ) * fMask * uFade;
	float faceSpecK = fMask * uFade * mix( 1.0, uSpecIn, rIn * ( 1.0 - fr ) );
`

let faceSeq = 0

/**
 * A curved leaf / tile face: a PBR glass surface (black, so only its
 * reflections light it; roughness follows the frost) whose emissive is the
 * print behind it. Premultiplied alpha: the print covers, the glass around it
 * is milky when frosted and nearly invisible when clear, and reflections add
 * at full strength either way.
 */
export function faceMaterial(u: FaceUniforms): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({
    color: 0x000000,
    roughness: 0.4,
    metalness: 0,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
    envMapIntensity: 1,
  })
  m.blending = THREE.CustomBlending
  m.blendSrc = THREE.OneFactor
  m.blendDst = THREE.OneMinusSrcAlphaFactor
  m.blendSrcAlpha = THREE.OneFactor
  m.blendDstAlpha = THREE.OneMinusSrcAlphaFactor
  m.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, u)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${FACE_VERT_HEAD}`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n\tvFaceUv = uv;\n\tvBack = aBack;\n\tvFaceY = ( modelMatrix * vec4( transformed, 1.0 ) ).y;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FACE_FRAG_HEAD}`)
      .replace('#include <alphamap_fragment>', `#include <alphamap_fragment>\n${FACE_FRAG_BODY}`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = mix( 0.03, 0.42, fr );')
      .replace('#include <emissivemap_fragment>', 'totalEmissiveRadiance = faceEm;')
      .replace('#include <opaque_fragment>', 'gl_FragColor = vec4( faceEm * faceA + totalSpecular * faceSpecK, faceA );')
  }
  m.customProgramCacheKey = () => 'halo-carousel-face'
  m.name = `carousel-face-${faceSeq++}`
  return m
}

/* ---------------------------------------------------------------- the mirror */

const MIRROR_VERT = /* glsl */ `
  varying vec2 vUv;
  varying float vWY;
  void main() {
    vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWY = w.y;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`
const MIRROR_FRAG = /* glsl */ `
  uniform sampler2D uShot;
  uniform vec4 uRect;
  uniform vec2 uSize;
  uniform vec3 uSpill;
  uniform float uK, uFrost, uLit, uRingY, uCorner;
  varying vec2 vUv;
  varying float vWY;
  void main() {
    float below = max(-vWY, 0.0);
    float fade = exp(-below * 1.35) * step(vWY, 0.001);
    vec2 fp = vUv * uSize;
    vec2 fh = uSize * 0.5;
    vec2 fq = abs(fp - fh) - (fh - uCorner);
    float fOut = length(max(fq, 0.0)) + min(max(fq.x, fq.y), 0.0) - uCorner;
    float fMask = 1.0 - smoothstep(-0.01, 0.01, fOut);
    vec2 rMin = uRect.xy * uSize;
    vec2 rMax = uRect.zw * uSize;
    vec2 rq = abs(fp - (rMin + rMax) * 0.5) - (rMax - rMin) * 0.5;
    float rOut = length(max(rq, 0.0)) + min(max(rq.x, rq.y), 0.0);
    float rIn = 1.0 - smoothstep(-0.02, 0.03, rOut);
    vec2 suv = clamp((vUv - uRect.xy) / (uRect.zw - uRect.xy), 0.0, 1.0);
    // a black mirror is glossy, not perfect: the print a touch soft
    vec3 c = textureLod(uShot, suv, mix(2.2, 5.0, uFrost)).rgb * rIn * uLit;
    float ringL = exp(-abs(-vWY - uRingY) * 2.1);
    c += uSpill * ringL * (1.0 - rIn) * mix(0.3, 0.7, uFrost);
    gl_FragColor = vec4(c * fade * fMask * uK, 1.0);
  }
`

/** Mirror uniforms of one leaf (the print shares the face's texture uniform). */
export interface MirrorUniforms {
  uShot: { value: THREE.Texture }
  uRect: { value: THREE.Vector4 }
  uSize: { value: THREE.Vector2 }
  uSpill: { value: THREE.Color }
  uK: { value: number }
  uFrost: { value: number }
  uLit: { value: number }
  uRingY: { value: number }
  uCorner: { value: number }
}

/* ---------------------------------------------------------------- the floor */

const FLOOR_FRAG = /* glsl */ `
  uniform vec3 uC0, uC1, uC2, uPoolC;
  uniform float uRingR, uRingRot, uRingK, uArcs, uPoolK, uPoolZ, uInner;
  varying vec3 vW;
  void main() {
    vec2 p = vW.xz;
    float r = length(p);
    // which arc of the ring lies at this azimuth (arc k centred on k * 2pi / n)
    float ang = atan(p.x, p.y);
    float t = (ang - uRingRot) / (6.2831853 / uArcs);
    float k = floor(t + 0.5);
    float fr = t - k;
    float idx = mod(k, 3.0);
    vec3 c = idx < 0.5 ? uC0 : (idx < 1.5 ? uC1 : uC2);
    // the wide spill mixes with the neighbouring arc toward the gap (no hard wedges on the floor)
    float idx2 = mod(k + (fr > 0.0 ? 1.0 : -1.0), 3.0);
    vec3 c2 = idx2 < 0.5 ? uC0 : (idx2 < 1.5 ? uC1 : uC2);
    vec3 cw = mix(c, c2, smoothstep(0.05, 0.5, abs(fr)) * 0.5);
    float lit = 1.0 - smoothstep(0.34, 0.5, abs(fr));
    float d = r - uRingR;
    vec3 col = (c * exp(-d * d / 0.012) * 0.8 * mix(0.3, 1.0, lit) + cw * (exp(-d * d / 0.16) * 0.34 + exp(-d * d / 1.1) * 0.08) * mix(0.7, 1.0, lit)) * uRingK;
    // the drum's interior: a faint pool
    col += (uC0 + uC1 + uC2) * 0.33 * exp(-r * r / 1.4) * uInner;
    // the lit screen's colour pooled on the floor in front of it
    vec2 q = (p - vec2(0.0, uPoolZ)) / vec2(1.25, 0.55);
    col += uPoolC * exp(-dot(q, q)) * uPoolK;
    col *= 1.0 - smoothstep(5.5, 9.0, r);
    gl_FragColor = vec4(col, 1.0);
  }
`

export interface FloorUniforms {
  uC0: { value: THREE.Color }
  uC1: { value: THREE.Color }
  uC2: { value: THREE.Color }
  uPoolC: { value: THREE.Color }
  uRingR: { value: number }
  uRingRot: { value: number }
  uRingK: { value: number }
  uArcs: { value: number }
  uPoolK: { value: number }
  uPoolZ: { value: number }
  uInner: { value: number }
}

/* ---------------------------------------------------------------- set */

export interface Leaf {
  /** on the drum, facing out */
  station: THREE.Group
  front: THREE.Mesh
  back: THREE.Mesh
  u: FaceUniforms
  mirror: MirrorUniforms
  /** the thin neon tube along its bottom edge, and its reflection */
  edge: NeonPath
  edgeRefl: NeonPath
  color: THREE.Color
  /** the print's average colour (the light it pools on the floor) */
  tint: THREE.Color
}

export interface Tile {
  station: THREE.Group
  u: FaceUniforms
  color: THREE.Color
}

export interface CarouselSet {
  root: THREE.Group
  drum: THREE.Group
  leaves: Leaf[]
  /** the floor ring: six arcs inside the drum (rides with it; lifts into the halo) */
  ring: THREE.Group
  ringArcs: NeonPath[]
  halo: THREE.Group
  haloArcs: NeonPath[]
  tiles: Tile[]
  floor: FloorUniforms
  rim: THREE.MeshPhysicalMaterial
  /** the tiles' rims (fade in with the halo) */
  tileRim: THREE.MeshPhysicalMaterial
  faces: THREE.MeshStandardMaterial[]
}

/** Average colour of a canvas texture (the glow a screenshot throws). */
export function averageColor(tex: THREE.Texture, out: THREE.Color): THREE.Color {
  const img = tex.image as CanvasImageSource | undefined
  if (!img) return out
  try {
    const c = document.createElement('canvas')
    c.width = c.height = 4
    const g = c.getContext('2d')!
    g.drawImage(img, 0, 0, 4, 4)
    const d = g.getImageData(0, 0, 4, 4).data
    let r = 0
    let gg = 0
    let b = 0
    for (let i = 0; i < d.length; i += 4) {
      r += d[i]
      gg += d[i + 1]
      b += d[i + 2]
    }
    const n = d.length / 4
    out.setRGB(r / n / 255, gg / n / 255, b / n / 255, THREE.SRGBColorSpace)
  } catch {
    /* tainted or missing: keep the old colour */
  }
  return out
}

export function buildCarousel(featured: WorkItem[], rest: WorkItem[], mobile: boolean, isFrameTarget: (rt: THREE.WebGLRenderTarget | null) => boolean): CarouselSet {
  const root = new THREE.Group()
  root.name = 'carousel'
  const faces: THREE.MeshStandardMaterial[] = []

  // polished rims: black glass that only its reflections light
  const rim = new THREE.MeshPhysicalMaterial({
    color: '#050608',
    roughness: 0.07,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    envMapIntensity: 1.6,
    emissive: new THREE.Color('#0b0d12'),
  })
  const blankLabel = placeholderTexture('#000000')
  // (a fully transparent 1x1: tiles carry no label)
  {
    const c = blankLabel.image as HTMLCanvasElement
    const g = c.getContext('2d')!
    g.clearRect(0, 0, 1, 1)
    blankLabel.needsUpdate = true
  }

  // ---------------------------------------------------------------- drum
  const drum = new THREE.Group()
  drum.name = 'drum'
  root.add(drum)
  const segX = mobile ? 28 : 48
  const leafFront = faceGeometry(LEAF_W, LEAF_H, LEAF_T / 2, R, false, segX)
  const leafBack = faceGeometry(LEAF_W, LEAF_H, LEAF_T / 2, R, true, segX)
  const leafRim = rimGeometry(LEAF_W, LEAF_H, CORNER, LEAF_T / 2, R, mobile ? 150 : 240, mobile ? 6 : 10)
  const rect = new THREE.Vector4(MARGIN / LEAF_W, 1 - (MARGIN + SHOT_H) / LEAF_H, 1 - MARGIN / LEAF_W, 1 - MARGIN / LEAF_H)
  // (no etched label on the glass: the leaf is the site; the card names it)
  const labelRect = new THREE.Vector4(-1, -1, -0.5, -0.5)
  const size = new THREE.Vector2(LEAF_W, LEAF_H)

  const leaves: Leaf[] = featured.map((w, k) => {
    const th = k * STEP
    const station = new THREE.Group()
    station.position.set(R * Math.sin(th), 0, R * Math.cos(th))
    station.rotation.y = th
    drum.add(station)
    const color = NEON_C[k % 3].clone()
    const shot = placeholderTexture('#15171c')
    const u: FaceUniforms = {
      uShot: { value: shot },
      uLabel: { value: blankLabel },
      uFrost: { value: 1 },
      uLit: { value: 0.5 },
      uRect: { value: rect },
      uLabelRect: { value: labelRect },
      uSize: { value: size },
      uCorner: { value: CORNER },
      uSpill: { value: new THREE.Color() },
      uRingY: { value: RING_Y },
      uFade: { value: 1 },
      uMilk: { value: 0.8 },
      uSpecIn: { value: 0.14 },
      uEtch: { value: 1 },
    }
    const mat = faceMaterial(u)
    faces.push(mat)
    const front = new THREE.Mesh(leafFront, mat)
    front.position.y = LEAF_CY
    const back = new THREE.Mesh(leafBack, mat)
    back.position.y = LEAF_CY
    // (sorted as transparent by their own origins: the drum's far side draws first)
    back.position.z = -0.001
    const rimMesh = new THREE.Mesh(leafRim, rim)
    rimMesh.position.y = LEAF_CY
    station.add(rimMesh, front, back)

    // the mirror: the leaf flipped under the floor
    const mirror: MirrorUniforms = {
      uShot: u.uShot,
      uRect: u.uRect,
      uSize: u.uSize,
      uSpill: { value: new THREE.Color() },
      uK: { value: 0.2 },
      uFrost: u.uFrost,
      uLit: u.uLit,
      uRingY: u.uRingY,
      uCorner: u.uCorner,
    }
    const mMat = new THREE.ShaderMaterial({
      uniforms: mirror as unknown as Record<string, THREE.IUniform>,
      vertexShader: MIRROR_VERT,
      fragmentShader: MIRROR_FRAG,
      transparent: false,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    })
    const refl = new THREE.Mesh(leafFront, mMat)
    refl.position.y = -LEAF_CY
    refl.scale.y = -1
    refl.renderOrder = -6
    station.add(refl)

    // the neon edge along its bottom (lit when the leaf faces you) and its reflection
    const ey = LEAF_Y0 - LEAF_T / 2 - 0.024
    const half = LEAF_W / 2 - CORNER * 0.6
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= 18; i++) {
      const x = -half + (2 * half * i) / 18
      const phi = x / R
      pts.push(new THREE.Vector3(R * Math.sin(phi), ey, R * Math.cos(phi) - R + 0.004))
    }
    const edge = neonPath({ points: pts, color, radius: 0.0085, glowRadius: 0.055, segments: 48, isFrameTarget })
    const edgeRefl = neonPath({ points: pts, color, radius: 0.0085, glowRadius: 0.055, segments: 48, mirror: { floorY: 0, fade: 1.6 }, isFrameTarget })
    edgeRefl.root.scale.y = -1
    edgeRefl.k.main.tube = 1.1
    edgeRefl.k.main.glow = 0.16
    station.add(edge.root, edgeRefl.root)

    return { station, front, back, u, mirror, edge, edgeRefl, color, tint: new THREE.Color(0.4, 0.42, 0.48) }
  })

  // ---------------------------------------------------------------- floor ring (rides with the drum)
  const ring = new THREE.Group()
  ring.name = 'ring'
  drum.add(ring)
  const ringArcs: NeonPath[] = []
  const arcHalf = STEP / 2 - 3.2 * DEG
  for (let k = 0; k < 6; k++) {
    const a = k * STEP
    const arc = neonPath({
      points: arcPoints(RING_R, 0, a - arcHalf, a + arcHalf, 20),
      color: NEON[k % 3],
      radius: 0.017,
      glowRadius: 0.1,
      segments: 64,
      isFrameTarget,
    })
    arc.k.main.tube = 3.4
    arc.k.main.glow = 0.5
    ring.add(arc.root)
    ringArcs.push(arc)
  }
  ring.position.y = RING_Y

  // ---------------------------------------------------------------- halo
  const halo = new THREE.Group()
  halo.name = 'halo'
  root.add(halo)
  const tileFront = faceGeometry(TILE_W, TILE_H, TILE_T / 2, HALO_R, false, mobile ? 18 : 28)
  const tileBack = faceGeometry(TILE_W, TILE_H, TILE_T / 2, HALO_R, true, mobile ? 18 : 28)
  const tileRim = rimGeometry(TILE_W, TILE_H, 0.035, TILE_T / 2, HALO_R, mobile ? 110 : 170, mobile ? 6 : 8)
  const tileRect = new THREE.Vector4(TILE_M / TILE_W, TILE_M / TILE_H, 1 - TILE_M / TILE_W, 1 - TILE_M / TILE_H)
  const tileSize = new THREE.Vector2(TILE_W, TILE_H)
  const noLabel = new THREE.Vector4(-1, -1, -0.5, -0.5)
  const tileRimMat = rim.clone()
  tileRimMat.transparent = true
  tileRimMat.opacity = 0
  const tiles: Tile[] = rest.map((_, j) => {
    const th = j * HALO_STEP
    const station = new THREE.Group()
    station.position.set(HALO_R * Math.sin(th), HALO_Y, HALO_R * Math.cos(th))
    station.rotation.y = th
    halo.add(station)
    const u: FaceUniforms = {
      uShot: { value: placeholderTexture('#15171c') },
      uLabel: { value: blankLabel },
      uFrost: { value: 1 },
      uLit: { value: 0.5 },
      uRect: { value: tileRect },
      uLabelRect: { value: noLabel },
      uSize: { value: tileSize },
      uCorner: { value: 0.035 },
      uSpill: { value: new THREE.Color() },
      uRingY: { value: HALO_RING_Y },
      uFade: { value: 0 },
      uMilk: { value: 0.8 },
      uSpecIn: { value: 0.14 },
      uEtch: { value: 1 },
    }
    const mat = faceMaterial(u)
    faces.push(mat)
    const front = new THREE.Mesh(tileFront, mat)
    const back = new THREE.Mesh(tileBack, mat)
    back.position.z = -0.001
    const rimMesh = new THREE.Mesh(tileRim, tileRimMat)
    station.add(rimMesh, front, back)
    return { station, u, color: NEON_C[j % 3].clone() }
  })
  const haloArcs: NeonPath[] = []
  const hHalf = HALO_STEP / 2 - 2.6 * DEG
  for (let j = 0; j < HALO_N; j++) {
    const a = j * HALO_STEP
    const arc = neonPath({
      points: arcPoints(HALO_R - 0.02, HALO_RING_Y, a - hHalf, a + hHalf, 16),
      color: NEON[j % 3],
      radius: 0.016,
      glowRadius: 0.09,
      segments: 56,
      isFrameTarget,
    })
    arc.k.main.tube = 3.4
    arc.k.main.glow = 0.5
    halo.add(arc.root)
    haloArcs.push(arc)
  }

  // ---------------------------------------------------------------- floor
  const floor: FloorUniforms = {
    uC0: { value: NEON_C[0].clone() },
    uC1: { value: NEON_C[1].clone() },
    uC2: { value: NEON_C[2].clone() },
    uPoolC: { value: new THREE.Color() },
    uRingR: { value: RING_R },
    uRingRot: { value: 0 },
    uRingK: { value: 1 },
    uArcs: { value: 6 },
    uPoolK: { value: 0 },
    uPoolZ: { value: R + 0.45 },
    uInner: { value: 0.05 },
  }
  const floorMat = new THREE.ShaderMaterial({
    uniforms: floor as unknown as Record<string, THREE.IUniform>,
    transparent: false,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    vertexShader: /* glsl */ `
      varying vec3 vW;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: FLOOR_FRAG,
  })
  const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), floorMat)
  floorMesh.rotation.x = -Math.PI / 2
  floorMesh.position.y = 0.001
  floorMesh.renderOrder = -7
  root.add(floorMesh)

  return { root, drum, leaves, ring, ringArcs, halo, haloArcs, tiles, floor, rim, tileRim: tileRimMat, faces }
}
