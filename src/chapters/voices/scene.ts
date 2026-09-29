import * as THREE from 'three'
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js'
import { G, flattenCaps, frosted, polished, smoothSides } from '../../kit/glass'
import { SAMPLES, sampleS, voiceprint } from './voiceprint'

/*
 * VOICEPRINT — the set.
 *
 *   the wire    ONE neon tube bent into a voice's waveform, running across the
 *               room. A fixed tube mesh (ring k = sample k of the print) whose
 *               vertex shader reads every voice's waveform from a small float
 *               texture (one row per quote) and bends the tube between two of
 *               them — so scrolling from one voice to the next morphs the line
 *               with uniforms only (no geometry rebuilt, nothing uploaded).
 *               Core (white-hot gas, saturated flanks; a dark glass tube when
 *               unlit) + a halo sleeve. Both sit in the opaque list, so three's
 *               glass buffer sees them and the frosted pane diffuses them.
 *   the pane    a tall sheet of FROSTED glass, sized every layout to the DOM
 *               card the quote is set on: frosted faces (softer than three's
 *               own blur), polished edges. Behind it the wire is soft colour;
 *               past its edges it's a crisp tube.
 *   the floor   black mirror: the wire's reflection (crisp beside the pane,
 *               only a soft glow behind it) and a pool of the pane's light.
 */

/**
 * how far the frost spreads the light behind it, past three's blur for that
 * roughness (phones: a narrower line under the frost, so a little less)
 */
const DIFFUSE = 1.08
const DIFFUSE_MOBILE = 0.9
const LOD_RE = /float lod = log2\( transmissionSamplerSize\.x \) \* applyIorToRoughness\( roughness, ior \);/

export interface WirePass {
  core: number
  glow: number
}

export interface Wire {
  /** shared uniforms: the voices, the morph, the placement, the light */
  u: WireUniforms
  core: THREE.Mesh
  glow: THREE.Mesh
  reflCore: THREE.Mesh
  reflGlow: THREE.Mesh
  /** per-pass strengths: the frame / three's glass buffer (what the frost diffuses) / the reflection */
  k: { main: WirePass; trans: WirePass; refl: WirePass }
  /** rows in the waveform texture (one per voice) */
  rows: number
}

export interface WireUniforms {
  uWave: { value: THREE.DataTexture }
  uLast: { value: number }
  uRowA: { value: number }
  uRowB: { value: number }
  uMix: { value: number }
  uShiftA: { value: number }
  uShiftB: { value: number }
  uGain: { value: number }
  uOrigin: { value: THREE.Vector3 }
  uScale: { value: THREE.Vector2 }
  uTime: { value: number }
  uLive: { value: number }
  uColor: { value: THREE.Color }
  uOn: { value: number }
  uDark: { value: number }
  uFloorY: { value: number }
  uPaneX: { value: THREE.Vector2 }
  /** the playhead: where along the speech (s) the line is brightest, and how much */
  uHead: { value: number }
  uHeadK: { value: number }
}

const WIRE_VERT = /* glsl */ `
  uniform sampler2D uWave;
  uniform float uLast, uRowA, uRowB, uMix, uShiftA, uShiftB, uGain, uTime, uLive, uRadius;
  uniform vec3 uOrigin;
  uniform vec2 uScale;
  attribute float aK;
  attribute float aA;
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vW;
  varying float vS;
  float rowY(float row, float k) {
    float k0 = floor(k);
    float f = k - k0;
    int r = int(row + 0.5);
    float a = texelFetch(uWave, ivec2(int(clamp(k0, 0.0, uLast)), r), 0).g;
    float b = texelFetch(uWave, ivec2(int(clamp(k0 + 1.0, 0.0, uLast)), r), 0).g;
    return mix(a, b, f);
  }
  vec2 at(float k) {
    float kk = clamp(k, 0.0, uLast);
    float s = texelFetch(uWave, ivec2(int(kk), 0), 0).r;
    float y = mix(rowY(uRowA, kk + uShiftA), rowY(uRowB, kk + uShiftB), uMix);
    // a live voice: a slow swell travelling along the line (idle only)
    y *= 1.0 + uLive * (0.1 * sin(uTime * 1.7 - s * 4.0) + 0.05 * sin(uTime * 2.9 + s * 9.0));
    return vec2(s * uScale.x, y * uScale.y * uGain);
  }
  void main() {
    vec2 p = at(aK);
    vS = p.x / uScale.x;
    vec2 d = at(aK + 1.0) - at(aK - 1.0);
    vec2 t = d / max(length(d), 1e-6);
    vec3 nrm = vec3(-t.y, t.x, 0.0);
    vec3 n = cos(aA) * nrm + sin(aA) * vec3(0.0, 0.0, 1.0);
    vec3 pos = uOrigin + vec3(p, 0.0) + n * uRadius;
    vec4 w = modelMatrix * vec4(pos, 1.0);
    vW = w.xyz;
    vec4 mv = viewMatrix * w;
    vN = normalize(mat3(viewMatrix) * mat3(modelMatrix) * n);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`

const WIRE_CORE = /* glsl */ `
  uniform vec3 uColor;
  uniform float uK, uOn, uDark, uMirror, uFloorY, uFade, uHead, uHeadK;
  uniform vec2 uPaneX;
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vW;
  varying float vS;
  void main() {
    float f = abs(dot(normalize(vN), normalize(vV)));
    // lit: a glass tube full of glowing gas, saturated, with only a thin
    // white-hot line down the middle
    vec3 gas = mix(uColor, vec3(1.0), smoothstep(0.84, 1.0, f) * 0.85) * (0.5 + 0.5 * f);
    // unlit: dark glass, a faint cool rim and a thin specular line
    float rim = 1.0 - f;
    vec3 glassC = vec3(0.62, 0.67, 0.76) * (0.07 + 0.3 * rim * rim + 0.7 * smoothstep(0.9, 1.0, f));
    // the playhead: the stretch of the voice being 'heard' burns a little brighter
    float hd = (vS - uHead) / 0.2;
    float head = 1.0 + uHeadK * 0.55 * exp(-hd * hd);
    vec3 col = gas * uK * uOn * head + glassC * uDark * (1.0 - uOn);
    // mirrored copy: only below the floor, fading with depth; behind the pane's
    // own reflection the tube is frosted away (its glow copy stays)
    float below = max(uFloorY - vW.y, 0.0);
    float inPane = smoothstep(uPaneX.x - 0.05, uPaneX.x + 0.05, vW.x) * (1.0 - smoothstep(uPaneX.y - 0.05, uPaneX.y + 0.05, vW.x));
    col *= mix(1.0, exp(-below * uFade) * step(vW.y, uFloorY + 0.001) * (1.0 - inPane), uMirror);
    gl_FragColor = vec4(col, 1.0);
  }
`

const WIRE_GLOW = /* glsl */ `
  uniform vec3 uColor;
  uniform float uK, uOn, uMirror, uFloorY, uFade, uHead, uHeadK;
  uniform vec2 uPaneX;
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vW;
  varying float vS;
  void main() {
    // a fat, invisible sleeve: bright along the middle, gone at its edge
    float f = abs(dot(normalize(vN), normalize(vV)));
    float g = f * f * f;
    float below = max(uFloorY - vW.y, 0.0);
    float inPane = smoothstep(uPaneX.x - 0.1, uPaneX.x + 0.1, vW.x) * (1.0 - smoothstep(uPaneX.y - 0.1, uPaneX.y + 0.1, vW.x));
    float m = mix(1.0, exp(-below * uFade) * step(vW.y, uFloorY + 0.001) * (1.0 - 0.6 * inPane), uMirror);
    float hd = (vS - uHead) / 0.24;
    float head = 1.0 + uHeadK * 0.9 * exp(-hd * hd);
    gl_FragColor = vec4(uColor * g * g * uK * uOn * m * head, 1.0);
  }
`

/** the tube's rings × sides as a fixed index grid (positions come from the shader) */
function wireGeometry(radial: number): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry()
  const n = SAMPLES * (radial + 1)
  const aK = new Float32Array(n)
  const aA = new Float32Array(n)
  const pos = new Float32Array(n * 3)
  for (let k = 0; k < SAMPLES; k++)
    for (let j = 0; j <= radial; j++) {
      const i = k * (radial + 1) + j
      aK[i] = k
      aA[i] = (j / radial) * Math.PI * 2
    }
  const idx: number[] = []
  for (let k = 0; k < SAMPLES - 1; k++)
    for (let j = 0; j < radial; j++) {
      const a = k * (radial + 1) + j
      const b = a + radial + 1
      // outward-facing winding (seen from outside the tube)
      idx.push(a, a + 1, b, b, a + 1, b + 1)
    }
  g.setIndex(idx)
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('aK', new THREE.BufferAttribute(aK, 1))
  g.setAttribute('aA', new THREE.BufferAttribute(aA, 1))
  // bounds are meaningless (the shader places everything): never culled
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4)
  return g
}

/** every voice's print in one float texture: R = s (shared), G = height, one row per voice */
function waveTexture(texts: string[]): THREE.DataTexture {
  const rows = texts.length
  const data = new Float32Array(SAMPLES * rows * 2)
  const s = sampleS()
  texts.forEach((t, r) => {
    const y = voiceprint(t)
    for (let k = 0; k < SAMPLES; k++) {
      data[(r * SAMPLES + k) * 2] = s[k]
      data[(r * SAMPLES + k) * 2 + 1] = y[k]
    }
  })
  const tex = new THREE.DataTexture(data, SAMPLES, rows, THREE.RGFormat, THREE.FloatType)
  tex.minFilter = THREE.NearestFilter
  tex.magFilter = THREE.NearestFilter
  tex.generateMipmaps = false
  tex.needsUpdate = true
  return tex
}

export function buildWire(
  texts: string[],
  o: { mobile: boolean; isFrameTarget: (rt: THREE.WebGLRenderTarget | null) => boolean },
): Wire {
  const tex = waveTexture(texts)
  const u: WireUniforms = {
    uWave: { value: tex },
    uLast: { value: SAMPLES - 1 },
    uRowA: { value: 0 },
    uRowB: { value: 0 },
    uMix: { value: 0 },
    uShiftA: { value: 0 },
    uShiftB: { value: 0 },
    uGain: { value: 1 },
    uOrigin: { value: new THREE.Vector3() },
    uScale: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uLive: { value: 0 },
    uColor: { value: new THREE.Color(G.neonA) },
    uOn: { value: 1 },
    uDark: { value: 1 },
    uFloorY: { value: 0 },
    uPaneX: { value: new THREE.Vector2(-1, 1) },
    uHead: { value: -9 },
    uHeadK: { value: 0 },
  }
  const k = {
    main: { core: 2.1, glow: 0.34 },
    trans: { core: 2.0, glow: 0.7 },
    refl: { core: 0.42, glow: 0.14 },
  }
  const geo = wireGeometry(o.mobile ? 6 : 8)
  const make = (frag: string, radius: number, mirror: boolean, additive: boolean) => {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        ...u,
        uRadius: { value: radius },
        uK: { value: 0 },
        uMirror: { value: mirror ? 1 : 0 },
        uFade: { value: 1.6 },
      },
      vertexShader: WIRE_VERT,
      fragmentShader: frag,
      transparent: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthWrite: !additive,
      // a mirrored mesh turns its faces inside out: draw the back faces
      side: mirror ? THREE.BackSide : THREE.FrontSide,
      toneMapped: false,
    })
    const m = new THREE.Mesh(geo, mat)
    m.frustumCulled = false
    return m
  }
  const core = make(WIRE_CORE, 1, false, false)
  const glow = make(WIRE_GLOW, 1, false, true)
  const reflCore = make(WIRE_CORE, 1, true, true)
  const reflGlow = make(WIRE_GLOW, 1, true, true)
  core.renderOrder = -5
  glow.renderOrder = -4
  reflCore.renderOrder = -4
  reflGlow.renderOrder = -4
  // the reflection: mirrored about the floor (y = 0)
  for (const m of [reflCore, reflGlow]) {
    m.matrixAutoUpdate = false
    m.matrix.makeScale(1, -1, 1)
  }
  const bind = (m: THREE.Mesh, key: keyof WirePass, refl = false) => {
    const mu = (m.material as THREE.ShaderMaterial).uniforms
    m.onBeforeRender = renderer => {
      const rt = renderer.getRenderTarget()
      const main = rt === null || o.isFrameTarget(rt as THREE.WebGLRenderTarget)
      // the glass buffer never sees the reflection (it's under the floor, in front of the pane)
      mu.uK.value = refl ? (main ? k.refl[key] : 0) : main ? k.main[key] : k.trans[key]
      ;(m.material as THREE.ShaderMaterial).uniformsNeedUpdate = true
    }
  }
  bind(core, 'core')
  bind(glow, 'glow')
  bind(reflCore, 'core', true)
  bind(reflGlow, 'glow', true)
  return { u, core, glow, reflCore, reflGlow, k, rows: texts.length }
}

/** set the tube + halo radii (world units) */
export function setWireRadius(w: Wire, core: number, glow: number) {
  ;(w.core.material as THREE.ShaderMaterial).uniforms.uRadius.value = core
  ;(w.reflCore.material as THREE.ShaderMaterial).uniforms.uRadius.value = core
  ;(w.glow.material as THREE.ShaderMaterial).uniforms.uRadius.value = glow
  ;(w.reflGlow.material as THREE.ShaderMaterial).uniforms.uRadius.value = glow
}

/* ------------------------------------------------------------------ pane */

export interface Pane {
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material[]>
  caps: THREE.MeshPhysicalMaterial
  sides: THREE.MeshPhysicalMaterial
  /** rebuild for a new size (world units); the front face sits at z = 0, the foot at y = 0 */
  resize(w: number, h: number, depth: number, radius: number): void
  size: { w: number; h: number; depth: number }
}

function roundedRect(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  r = Math.min(r, w / 2, h / 2)
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  return s
}

export function buildPane(o: { mobile: boolean; envMap: THREE.Texture | null; frost: number }): Pane {
  const caps = frosted({ frost: o.frost, thickness: 0.12, env: 0.6 }).clone()
  const sides = polished({ thickness: 0.1 }).clone()
  // highlights razor thin but never below a pixel (sub-pixel HDR lines bead under bloom)
  sides.roughness = 0.06
  sides.clearcoatRoughness = 0.08
  // the polished rim: a crisp hairline of the studio strips around the sheet
  sides.envMapIntensity = 1.9
  caps.envMap = o.envMap
  sides.envMap = o.envMap
  // frost that spreads the light behind it a little further than three's own blur
  caps.onBeforeCompile = shader => {
    const chunk = THREE.ShaderChunk.transmission_pars_fragment
    if (!LOD_RE.test(chunk)) return
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <transmission_pars_fragment>',
      chunk.replace(LOD_RE, `float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior ) * ${(o.mobile ? DIFFUSE_MOBILE : DIFFUSE).toFixed(2)};`),
    )
  }
  caps.customProgramCacheKey = () => 'voices-frost-diffuse'
  const size = { w: 0, h: 0, depth: 0 }
  const mesh = new THREE.Mesh<THREE.BufferGeometry, THREE.Material[]>(new THREE.BufferGeometry(), [caps, sides])
  mesh.renderOrder = 2
  const bevelSegs = o.mobile ? 3 : 5
  return {
    mesh,
    caps,
    sides,
    size,
    resize(w, h, depth, radius) {
      if (Math.abs(w - size.w) < 1e-4 && Math.abs(h - size.h) < 1e-4 && Math.abs(depth - size.depth) < 1e-4) return
      size.w = w
      size.h = h
      size.depth = depth
      const bevel = Math.min(depth * 0.4, 0.035)
      const raw = new THREE.ExtrudeGeometry(roundedRect(w - 2 * bevel * 0.9, h - 2 * bevel * 0.9, Math.max(0.001, radius - bevel)), {
        depth: depth - 2 * bevel,
        bevelEnabled: true,
        bevelThickness: bevel,
        bevelSize: bevel * 0.9,
        bevelSegments: bevelSegs,
        curveSegments: 8,
        steps: 1,
      })
      // front face at z = 0, foot at y = 0
      raw.translate(0, h / 2, -depth + bevel)
      const geo = toCreasedNormals(raw, Math.PI / 4.5)
      raw.dispose()
      smoothSides(geo)
      flattenCaps(geo)
      geo.computeBoundingBox()
      geo.computeBoundingSphere()
      mesh.geometry.dispose()
      mesh.geometry = geo
    },
  }
}

/* ----------------------------------------------------------------- floor */

const FLOOR_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uK;
  uniform vec2 uPool, uPoolR;
  varying vec2 vUv;
  varying vec3 vW;
  void main() {
    vec2 d = (vW.xz - uPool) / uPoolR;
    float pool = exp(-dot(d, d));
    float edge = 1.0 - smoothstep(0.3, 0.5, length(vUv - 0.5));
    gl_FragColor = vec4(uColor * pool * edge * uK, 1.0);
  }
`

/** the black mirror floor: an additive pool of the pane's coloured light at its foot */
export function buildFloor(color: THREE.Color): THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    uniforms: {
      uColor: { value: color },
      uK: { value: 0 },
      uPool: { value: new THREE.Vector2(0, 0.6) },
      uPoolR: { value: new THREE.Vector2(3, 1.2) },
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
    fragmentShader: FLOOR_FRAG,
  })
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), mat)
  floor.rotation.x = -Math.PI / 2
  floor.renderOrder = -6
  return floor
}
