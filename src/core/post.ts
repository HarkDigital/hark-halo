import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { ACTIVE } from '../kit/palette'
import type { SegueMode } from './types'

/*
 * Post-processing for Hark Frost: Scene (render + NaN guard) → Bloom →
 * Output → FINAL.
 *
 * Anti-aliasing: the scene renders into its OWN target, the only
 * multisampled one (4x whenever the frame is under ~1.75 device px per CSS px:
 * 1x/1.25x monitors and phones capped at 1.5, so the razor-sharp mark never
 * stair-steps). The composer's ping-pong targets stay single-sampled, so the
 * post passes never pay for MSAA.
 *
 * FINAL is a clean, sharp finish for a black site: no chromatic aberration
 * (the mark must stay razor sharp), a deep vignette, a fine grain and flash /
 * fade, plus:
 *  - FROST (params.frost 0..1): the whole frame behind frosted glass.
 *  - THE BREATH CUT: approaching a chapter boundary, condensation forms on the
 *    screen from its edges inward (a noise-edged frost front); at the boundary
 *    the whole frame is fogged (hiding the swap); after it the fog clears from
 *    the centre outward like breath evaporating off cold glass. uCutSide says
 *    which half. A few tiny clear 'droplet' spots sparkle in the fog.
 *  - THE SEGUES (uSegue = SEGUE_ID[mode], a chapter's `segue`): a watched
 *    transition instead of the fog, for a scroll through that boundary. Each
 *    is drawn here, in this pass (no extra one), from uTransition (t: 0 far …
 *    1 at the boundary, scroll-linear over the Engine's SEGUE_WINDOW) and
 *    uCutSide (-1 on the way in, +1 after it), so it plays both ways and is
 *    scene-independent at t = 1 (the swap is never seen). uAim is where the
 *    incoming chapter's subject sits on screen (its chapter writes post.aim).
 *      blinds  the frame closes into horizontal glass slats, a slow wave down
 *              the blind: fluted frosted glass (the picture behind magnified a
 *              touch and diffused), a sheen sliding down each slat as it turns,
 *              a rim of light along its top edge. Shut, it is black glass ruled
 *              with fine neon hairlines; it opens the same way onto the next
 *              chapter, and the hairlines draw in to uAim (services: the column,
 *              whose own louvres open out of hairlines) and go.
 *      glass   the camera pushes through a pane of frosted glass: the frame
 *              frosts (a wide sandblasted blur that blooms the light it
 *              catches, a fine static grain), a soft light swells behind the
 *              pane while the picture gives way to it, a sheen crosses the pane
 *              once; it clears onto the next chapter as it settles in from a
 *              touch smaller. A soft shoulder keeps the frosted neon from
 *              clipping to a flat white field.
 *      neon    the light drains out of the picture (its highlights pulled out
 *              sideways into a faint anamorphic streak) while one thin line of
 *              neon draws across the frame, left to right, a white-hot spark at
 *              its head; after the boundary the line glides onto uAim's top
 *              hairline (services: the first plate, Software Development) as the
 *              next chapter comes up behind it, and goes. No squash, no dot.
 *      tube    an old tube set switching off: the picture squashes into one
 *              white-hot line with a neon glow (the lights, a → b → c), the line
 *              pulls in to a point, the point goes out; the next chapter powers
 *              up the same way in reverse.
 *    A held transition (a fast scroll, a nav jump's tail) keeps the look it
 *    started with (Engine); a long nav jump always wears the breath cut.
 *
 * Keep the Post API (params / resetParams / setSize / render / compileAsync /
 * setFadeTone / cutSide) and the uTransition / uFade / uFlash / uGlitch uniforms.
 */

const FinalShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uDpr: { value: 1 },
    uTransition: { value: 0 },
    uCutSide: { value: 1 },
    uGlitch: { value: 0 },
    uAberration: { value: 0 },
    uGrain: { value: 0.018 },
    uVignette: { value: 0.45 },
    uFlash: { value: 0 },
    uFade: { value: 0 },
    uFrost: { value: 0 },
    uFog: { value: new THREE.Color('#9aa2ad') },
    uSegue: { value: 0 },
    uAim: { value: new THREE.Vector4(0, 0, 1, 1) },
    uNeonA: { value: new THREE.Color(ACTIVE.a) },
    uNeonB: { value: new THREE.Color(ACTIVE.b) },
    uNeonC: { value: new THREE.Color(ACTIVE.c) },
    uFadeColor: { value: new THREE.Color('#000000') },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime, uDpr, uTransition, uCutSide, uGlitch, uAberration, uGrain, uVignette, uFlash, uFade, uFrost;
    uniform vec2 uResolution;
    uniform vec3 uFog, uFadeColor;
    uniform float uSegue;
    uniform vec4 uAim;
    uniform vec3 uNeonA, uNeonB, uNeonC;
    varying vec2 vUv;

    float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
    }
    float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { v += a * noise(p); p = p * 2.07 + 5.3; a *= 0.5; } return v / 0.875; }

    vec3 frosted(vec2 uv, float radiusPx) {
      vec2 px = 1.0 / uResolution;
      float a0 = hash(gl_FragCoord.xy) * 6.2831853;
      vec3 acc = vec3(0.0);
      for (int i = 0; i < 10; i++) {
        float fi = float(i);
        float r = sqrt((fi + 0.5) / 10.0) * radiusPx;
        float a = a0 + fi * 2.3999632;
        acc += texture2D(tDiffuse, uv + vec2(cos(a), sin(a)) * r * px).rgb;
      }
      return acc / 10.0;
    }

    // a wide frost (the glass segue's pane): a few more taps, and one spiral per CSS pixel
    // (neighbouring device pixels share it, so the wide taps stay cache-friendly; the
    // grain it leaves is the sandblast's own, at 1 CSS px)
    vec3 frostedWide(vec2 uv, float radiusPx) {
      vec2 px = 1.0 / uResolution;
      float a0 = hash(floor(gl_FragCoord.xy / max(uDpr, 1.0))) * 6.2831853;
      vec3 acc = vec3(0.0);
      for (int i = 0; i < 12; i++) {
        float fi = float(i);
        float r = sqrt((fi + 0.5) / 12.0) * radiusPx;
        float a = a0 + fi * 2.3999632;
        acc += texture2D(tDiffuse, clamp(uv + vec2(cos(a), sin(a)) * r * px, 0.001, 0.999)).rgb;
      }
      return acc / 12.0;
    }

    float ease3(float x) { x = clamp(x, 0.0, 1.0); return x * x * (3.0 - 2.0 * x); }

    vec3 neonAt(float x) {
      return x < 0.5 ? mix(uNeonA, uNeonB, x * 2.0) : mix(uNeonB, uNeonC, x * 2.0 - 1.0);
    }
    // THE TUBE SEGUE (t: 0 far from the boundary … 1 at it; the incoming chapter plays it backwards)
    vec3 tubeSegue(vec2 uv, float t) {
      float sy = 1.0 - smoothstep(0.0, 0.58, t);      // the picture squashes into a line
      float sx = 1.0 - smoothstep(0.6, 0.9, t);       // the line pulls in to a point
      float off = smoothstep(0.9, 1.0, t);            // the point goes out
      vec2 q = uv - 0.5;
      float hy = max(sy * 0.5, 0.5 / uResolution.y);
      float hx = sx * 0.5;
      vec3 outc = vec3(0.0);
      if (abs(q.y) <= hy && abs(q.x) <= hx) {
        vec2 s = vec2(0.5 + q.x / max(sx, 1e-4), 0.5 + q.y / max(sy, 1e-4));
        // squeezed light gets brighter as the band thins
        outc = texture2D(tDiffuse, clamp(s, 0.001, 0.999)).rgb * (1.0 + 2.5 * (1.0 - sy)) * (1.0 - off);
      }
      // the line of light it squeezes into: white-hot, a neon glow in the lights' colours
      float thin = smoothstep(0.22, 0.58, t) * (1.0 - off);
      float dy = abs(q.y) * uResolution.y / uDpr;
      float ends = 1.0 - smoothstep(hx - 0.01, hx + 0.03, abs(q.x));
      vec3 neon = neonAt(clamp(0.5 + q.x / max(sx, 0.08), 0.0, 1.0));
      float core = exp(-(dy * dy) / 1.8);
      float glow = exp(-(dy * dy) / 260.0) + 0.35 * exp(-(dy * dy) / 4200.0);
      outc += (vec3(1.0) * core * 1.3 + neon * glow) * ends * thin;
      // the last point of light
      float aspect = uResolution.x / max(uResolution.y, 1.0);
      float rp = length(vec2(q.x * aspect, q.y)) * uResolution.y / uDpr;
      float pt = smoothstep(0.72, 0.9, t) * (1.0 - off);
      outc += (vec3(1.0) * exp(-(rp * rp) / 30.0) * 1.4 + neonAt(0.5) * exp(-(rp * rp) / 2400.0)) * pt;
      return outc;
    }

    // THE BLINDS (t: 0 far … 1 at the boundary; side -1 closing on the way in, +1 opening after)
    vec3 blindsSegue(vec2 uv, vec3 col, float t, float side) {
      float H = uResolution.y / uDpr;
      float aspect = uResolution.x / max(uResolution.y, 1.0);
      float n = clamp(floor(H / 62.0 + 0.5), 9.0, 18.0);
      float band = H / n;                       // CSS px per slat
      float yd = (1.0 - uv.y) * n;
      float bi = floor(yd);
      float f = yd - bi - 0.5;                  // -0.5 top … 0.5 bottom of this slat's band
      float k = bi / max(n - 1.0, 1.0);         // 0 top slat … 1 bottom slat
      // how shut each slat is (0 edge-on … 1 flat): a slow wave down the blind, both ways
      float c = side < 0.0 ? ease3((t - 0.1 - 0.2 * k) / 0.6) : ease3((t - 0.42 - 0.18 * (1.0 - k)) / 0.36);
      float px = 1.0 / band;                    // one CSS px, in band units
      float halfC = 0.5 * max(sin(c * 1.5707963), px);
      float inside = 1.0 - smoothstep(halfC - 0.6 * px, halfC + 0.6 * px, abs(f));
      // the hairlines (the slats edge-on): in before they turn; after, they draw in to the
      // column's own louvres (uAim) and go, those beyond its height first
      float lineK;
      if (side < 0.0) lineK = ease3(t / 0.12);
      else {
        float g = ease3((t - 0.1) / 0.36);
        float x0 = mix(uAim.x, -0.02, g), x1 = mix(uAim.z, 1.02, g);
        float inCol = step(uAim.y - 0.03, uv.y) * step(uv.y, uAim.w + 0.03);
        lineK = ease3(t / 0.16) * smoothstep(x0 - 0.008, x0 + 0.008, uv.x) * (1.0 - smoothstep(x1 - 0.008, x1 + 0.008, uv.x));
        lineK *= max(inCol, ease3((t - 0.2) / 0.2));
      }
      float alpha = inside * mix(lineK, 1.0, ease3(c / 0.12));
      // the slat: fluted frosted glass (the picture behind it magnified a touch and diffused,
      // giving way to the light behind the blind as it shuts), shaded along its curve
      float v = clamp(f / max(halfC, 1e-4), -1.0, 1.0);      // -1 its top edge … 1 its bottom edge
      vec2 pc = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);
      float lamp = 0.2 + 0.8 * exp(-dot(pc, pc) / 0.3);
      float trans = 0.85 * (1.0 - ease3((t - 0.45) / 0.5));
      vec3 face = vec3(0.0);
      if (trans > 0.002 && alpha > 0.002) {
        float yc = 1.0 - (bi + 0.5) / n;                       // the slat's axis (uv)
        face = frosted(vec2(uv.x, yc + (uv.y - yc) * 0.72), 12.0 * uDpr) * trans;
      }
      // smoked glass: a faint lift where the light behind the blind is, darker along its curve
      face += vec3(0.022, 0.026, 0.034) * lamp;
      face *= 1.2 - 0.55 * (v * 0.5 + 0.5);
      // a soft sheen slides down each slat as it turns past the light (a ripple down the blind)
      float dg = v - mix(-0.9, 0.6, c);
      face += vec3(0.8, 0.86, 0.95) * exp(-dg * dg / 0.05) * 0.09 * c * (1.0 - c) * 4.0 * lamp;
      // the rim of light along each slat's top edge (all there is of a slat edge-on), a shadow under it
      float dTop = (f + halfC) * band;
      float dBot = (halfC - f) * band;
      vec3 rimC = mix(vec3(0.95, 0.97, 1.0), neonAt(uv.x), 0.45);
      face += rimC * (exp(-dTop * dTop / 0.5) * 0.85 + exp(-dTop / 3.0) * 0.12) * (0.3 + 0.7 * lamp);
      face *= 1.0 - 0.5 * exp(-dBot * dBot / 3.0) * c;
      // through the gaps: the picture, darkening as the slats close, shadowed at their edges
      float de = (abs(f) - halfC) * band;
      float deN = (1.0 - abs(f) - halfC) * band;
      float gapK = (1.0 - 0.5 * c - 0.5 * smoothstep(0.8, 1.0, c)) * (1.0 - 0.4 * c * (exp(-max(de, 0.0) / 7.0) + exp(-max(deN, 0.0) / 7.0)));
      return mix(col * max(gapK, 0.0), face, alpha);
    }

    // THE GLASS PANE (the camera pushes through a pane of frosted glass lit from behind)
    vec3 glassSegue(vec2 uv, float t, float side) {
      vec2 c = uv - 0.5;
      float aspect = uResolution.x / max(uResolution.y, 1.0);
      vec2 pc = vec2(c.x * aspect, c.y);
      float e = ease3(t);
      // the push: in toward the pane (the hero grows), on past it (services settles in from a touch smaller)
      float z = side < 0.0 ? 1.0 + 0.1 * e * e : 1.0 - 0.06 * e;
      vec2 su = clamp(0.5 + c / z, 0.001, 0.999);
      float fk = ease3((t - 0.04) / 0.78);                  // how frosted
      vec3 col = texture2D(tDiffuse, su).rgb;
      if (fk > 0.002) {
        // the frost spreads the light it catches (a soft bloom)
        vec3 fr = frostedWide(su, (3.0 + 44.0 * fk) * uDpr);
        col = mix(col, fr * (1.0 + 0.3 * fk), smoothstep(0.0, 0.4, fk));
      }
      // the picture behind gives way to the pane's own light at the boundary (hides the swap)
      col *= 1.0 - ease3((t - 0.68) / 0.3);
      float L = ease3((t - 0.42) / 0.58);
      vec2 gq = pc * vec2(0.75, 1.0);
      float glow = exp(-dot(gq, gq) / 0.1);
      float wide = exp(-dot(gq, gq) / 0.5);
      vec3 lightC = mix(vec3(0.84, 0.9, 1.0), neonAt(uv.x), 0.4 * (1.0 - glow));
      col += lightC * (0.12 * wide + 0.4 * glow) * L;
      // sandblasted: a fine grain and a faint mottling in the frost (static: no shimmer)
      float g = hash(floor(gl_FragCoord.xy / uDpr)) - 0.5;
      float m = fbm(pc * 4.0 + 3.1) - 0.5;
      col += (0.045 * g + 0.02 * m) * fk * (0.25 + 0.75 * L);
      // a sheen crosses the pane once over the whole segue (continuous through the boundary)
      float ph = side < 0.0 ? 0.5 * t : 1.0 - 0.5 * t;
      float sd = (pc.x * 0.6 + c.y) - mix(-1.3, 1.3, ph);
      col += vec3(0.88, 0.92, 1.0) * (exp(-sd * sd / 0.0012) * 0.045 + exp(-sd * sd / 0.02) * 0.015) * fk;
      // a soft shoulder (hue kept): the frosted neon glows, it never clips to a flat white field
      col = max(col, vec3(0.0));
      float pk = max(max(col.r, col.g), col.b);
      if (pk > 0.7) col *= (0.7 + 0.26 * (1.0 - exp(-(pk - 0.7) / 0.26))) / pk;
      return col;
    }

    // THE NEON LINE (the light drains into one line of neon; it becomes the first plate's hairline)
    vec3 neonSegue(vec2 uv, vec3 col, float t, float side) {
      float W = uResolution.x / uDpr;
      float H = uResolution.y / uDpr;
      float y0, xa, xb, lineK, u;
      float head = 0.0;
      if (side < 0.0) {
        // the picture's light drains away, its highlights pulled out sideways into streaks
        // (an anamorphic flare: jittered taps, so a smooth streak, never stepped copies)
        float st = ease3((t - 0.06) / 0.6);
        vec3 streak = vec3(0.0);
        if (st > 0.002) {
          float R = 260.0 * st / W;
          float j = hash(gl_FragCoord.xy) - 0.5;
          for (int i = 0; i < 8; i++) {
            float o = (float(i) - 3.5 + j) / 4.0;
            vec3 sm = texture2D(tDiffuse, vec2(clamp(uv.x + o * R, 0.001, 0.999), uv.y)).rgb;
            streak += max(sm - 0.3, 0.0) * (1.0 - abs(o));
          }
          streak *= 0.32 * st;
        }
        col = (col + streak) * (1.0 - ease3((t - 0.14) / 0.66));
        float draw = ease3((t - 0.16) / 0.68);
        y0 = 0.5;
        xa = 0.0;
        xb = draw;
        u = uv.x;
        lineK = smoothstep(0.0, 0.05, draw);
        head = smoothstep(0.0, 0.05, draw) * (1.0 - smoothstep(0.88, 1.0, draw));
      } else {
        // services comes up behind it; the line glides onto the top plate's hairline and goes
        float g = 1.0 - ease3((t - 0.3) / 0.62);
        y0 = mix(0.5, uAim.w, g);
        xa = mix(0.0, uAim.x, g);
        xb = mix(1.0, uAim.z, g);
        u = (uv.x - xa) / max(xb - xa, 1e-3);
        col *= 1.0 - ease3((t - 0.12) / 0.58);
        lineK = ease3((t - 0.02) / 0.3);
      }
      float dy = (uv.y - y0) * H;
      float ex = 1.5 / W;
      float inX = smoothstep(xa - ex, xa + ex, uv.x) * (1.0 - smoothstep(xb - ex, xb + ex, uv.x));
      float gx = 30.0 / W;
      float inG = smoothstep(xa - gx, xa + ex, uv.x) * (1.0 - smoothstep(xb - ex, xb + gx, uv.x));
      vec3 neon = neonAt(clamp(u, 0.0, 1.0));
      float core = exp(-dy * dy / 1.1);
      float glow = 0.5 * exp(-dy * dy / 70.0) + 0.2 * exp(-dy * dy / 1400.0);
      col += ((vec3(0.85) + 0.5 * neon) * core * inX + neon * glow * inG) * lineK;
      // the drawing head: a white-hot spark with a little glow
      if (head > 0.001) {
        vec2 d = vec2((uv.x - xb) * W, dy);
        col += (vec3(1.0) * exp(-(d.x * d.x / 260.0 + d.y * d.y / 3.0)) * 1.3 + neon * exp(-dot(d, d) / 1800.0) * 0.35) * head;
      }
      return col;
    }

    void main() {
      vec2 uv = vUv;
      vec2 c = uv - 0.5;
      float gl = clamp(uGlitch, 0.0, 1.0);
      uv.x += gl * 0.003 * sin(uv.y * 60.0 + uTime * 8.0);

      vec3 col;
      if (uAberration > 0.00001) {
        col.r = texture2D(tDiffuse, uv + c * uAberration).r;
        col.g = texture2D(tDiffuse, uv).g;
        col.b = texture2D(tDiffuse, uv - c * uAberration).b;
      } else col = texture2D(tDiffuse, uv).rgb;

      float fr = clamp(uFrost, 0.0, 1.0);
      float t = clamp(uTransition, 0.0, 1.0);
      // ---- THE BREATH CUT: a noise-edged fog front
      float fogMask = 0.0;
      if (uSegue > 0.5) {
        if (t > 0.001) {
          if (uSegue < 1.5) col = tubeSegue(uv, t);
          else if (uSegue < 2.5) col = blindsSegue(uv, col, t, uCutSide);
          else if (uSegue < 3.5) col = glassSegue(uv, t, uCutSide);
          else col = neonSegue(uv, col, t, uCutSide);
        }
      } else if (t >= 0.82) fogMask = 1.0;   // fully fogged: no front to shape
      else if (t > 0.001) {
        float aspect = uResolution.x / max(uResolution.y, 1.0);
        vec2 pc = vec2(c.x * aspect, c.y);
        float r = length(pc) / (0.5 * length(vec2(aspect, 1.0)));   // 0 centre … 1 corners
        float n = fbm(pc * 3.2 + uTime * 0.05) - 0.5;
        float e = t * t * (3.0 - 2.0 * t);
        if (uCutSide < 0.0) fogMask = smoothstep(0.0, 0.08, (r + n * 0.35) - (1.05 - e * 1.25));   // forms from the edges inward
        else fogMask = 1.0 - smoothstep(0.0, 0.08, (1.0 - e) * 1.25 - 0.1 - (r + n * 0.35));       // clears from the centre out
        fogMask = max(fogMask, smoothstep(0.82, 1.0, t));
      }
      float frostK = max(fr, fogMask);
      if (frostK > 0.002) {
        vec3 f = frosted(uv, 30.0 * uDpr * max(fr, fogMask) * 1.2);
        // condensation: lifted, pale, faintly granular
        float grain = hash(floor(gl_FragCoord.xy / (1.6 * uDpr)));
        vec3 fog = f * 0.8 + uFog * (0.07 + 0.05 * grain) * fogMask + 0.02 * fr;
        // a few clear droplets sparkle in the fog: jittered in their cells, each
        // its own size, each appearing on its own threshold as the fog thickens
        vec2 cq = gl_FragCoord.xy / (22.0 * uDpr);
        vec2 cell = floor(cq);
        float h0 = hash(cell), h1 = hash(cell + 17.3), h2 = hash(cell + 41.9);
        vec2 dp = fract(cq) - 0.5 - (vec2(h1, h2) - 0.5) * 0.55;
        float rad = 0.05 + 0.11 * h2;
        float drop = step(0.93, h0) * (1.0 - smoothstep(rad * 0.45, rad, length(dp))) * smoothstep(h1 * 0.6, h1 * 0.6 + 0.3, fogMask);
        fog = mix(fog, col * 1.05 + 0.05, drop * fogMask);
        col = mix(col, fog, smoothstep(0.0, 0.3, frostK));
      }

      col = mix(col, vec3(1.0), clamp(uFlash, 0.0, 1.0));
      float v = 1.0 - smoothstep(0.3, 1.0, length(c * vec2(1.0, 0.9)) * 1.45);
      col *= mix(1.0, 0.4 + 0.6 * v, uVignette);
      col += (hash(vUv * uResolution + fract(uTime * 7.13) * 91.0) - 0.5) * uGrain;
      col = mix(col, uFadeColor, clamp(uFade, 0.0, 1.0));
      gl_FragColor = vec4(col, 1.0);
    }
  `,
}

/** uSegue per mode (0 = the breath cut) */
export const SEGUE_ID: Record<SegueMode, number> = { tube: 1, blinds: 2, glass: 3, neon: 4 }

/** minimum seconds between two white-flash onsets (WCAG 2.3.1) */
const FLASH_GAP = 0.4

export type PostParams = {
  bloomStrength: number
  bloomRadius: number
  bloomThreshold: number
  aberration: number
  grain: number
  vignette: number
  /** wobble 0..1 */
  glitch: number
  /** white wash 0..1 */
  flash: number
  exposure: number
  /** whole-frame frosted glass 0..1 */
  frost: number
}

/** Bloom only catches HDR (> ~1.0): emissive lamps, LEDs, speculars. */
export const POST_DEFAULTS: PostParams = {
  // bloom only on true highlights (polished edges, the halo core): never smear the mark
  bloomStrength: 0.35,
  bloomRadius: 0.4,
  bloomThreshold: 1.05,
  aberration: 0,
  grain: 0.018,
  vignette: 0.45,
  glitch: 0,
  flash: 0,
  exposure: 1,
  frost: 0,
}

/**
 * Scrubs NaN/Inf and clamps runaway HDR right after the scene render. A single
 * bad fragment would otherwise smear across the whole frame through bloom.
 */
const SanitizeShader = {
  uniforms: { tDiffuse: { value: null as THREE.Texture | null } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      if (any(isnan(c)) || any(isinf(c))) c = vec4(0.0, 0.0, 0.0, 1.0);
      gl_FragColor = vec4(clamp(c.rgb, 0.0, 64.0), c.a);
    }
  `,
}

/**
 * Renders the scene into its own target (the only multisampled one) and
 * copies it through the NaN guard into the composer's read buffer.
 */
class ScenePass extends Pass {
  target: THREE.WebGLRenderTarget
  material: THREE.ShaderMaterial
  private quad: FullScreenQuad

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.Camera,
    w: number,
    h: number,
    samples: number,
  ) {
    super()
    this.needsSwap = false
    this.target = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples })
    this.material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(SanitizeShader.uniforms),
      vertexShader: SanitizeShader.vertexShader,
      fragmentShader: SanitizeShader.fragmentShader,
    })
    this.quad = new FullScreenQuad(this.material)
  }

  setSamples(n: number) {
    if (this.target.samples === n) return
    this.target.samples = n
    this.target.dispose() // re-created with the new sample count on next use
  }

  setSize(w: number, h: number) {
    this.target.setSize(w, h)
  }

  render(renderer: THREE.WebGLRenderer, _write: THREE.WebGLRenderTarget, read: THREE.WebGLRenderTarget) {
    renderer.setRenderTarget(this.target)
    renderer.clear()
    renderer.render(this.scene, this.camera)
    this.material.uniforms.tDiffuse.value = this.target.texture
    renderer.setRenderTarget(read)
    this.quad.render(renderer)
  }

  dispose() {
    this.target.dispose()
    this.material.dispose()
    this.quad.dispose()
  }
}

export class Post {
  composer: EffectComposer
  scenePass: ScenePass
  bloom: UnrealBloomPass
  final: ShaderPass
  /**
   * Chapters write targets here every frame (the engine resets them to
   * defaults first); values are damped so nothing pops at a cut.
   */
  params: PostParams = { ...POST_DEFAULTS }
  private current: PostParams = { ...POST_DEFAULTS }
  transition = 0
  /** -1 while approaching a chapter boundary, +1 after it (engine-driven) */
  cutSide = 1
  /** the segue drawing the boundary in play (SEGUE_ID; 0 = the breath cut; engine-driven) */
  segue = 0
  /**
   * Where the incoming chapter's subject sits on screen (uv, y up: x0, y0, x1,
   * y1), written by that chapter while a segue plays: the blinds' hairlines and
   * the neon line land on it (services: its column, y1 the top plate).
   */
  aim = new THREE.Vector4(0, 0, 1, 1)
  fade = 0
  private lastFlashAt = -1e9
  private flashLive = false
  private flashOk = true

  constructor(
    private renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
  ) {
    const size = renderer.getDrawingBufferSize(new THREE.Vector2())
    // single-sampled ping-pong targets (the composer clones this one)
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType })
    this.composer = new EffectComposer(renderer, rt)
    this.scenePass = new ScenePass(scene, camera, size.x, size.y, Post.samplesFor(renderer.getPixelRatio()))
    this.composer.addPass(this.scenePass)
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.45, 0.4, 1.0)
    this.composer.addPass(this.bloom)
    this.composer.addPass(new OutputPass())
    this.final = new ShaderPass(FinalShader)
    this.composer.addPass(this.final)
  }

  /** Colour of the reduced-motion fade (black). */
  setCutColor(color: THREE.ColorRepresentation) {
    ;(this.final.uniforms.uFadeColor.value as THREE.Color).set(color)
  }

  /** Engine hook (kept for compatibility; themes may tint the fade by scene tone). */
  setFadeTone(_tone: number) {}

  resetParams() {
    Object.assign(this.params, POST_DEFAULTS)
  }

  /**
   * Compile every post-processing shader in parallel so the first composer
   * render doesn't block on synchronous links.
   */
  compileAsync(): Promise<unknown> {
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2))
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const b = this.bloom as unknown as Record<string, unknown>
    const mats: THREE.Material[] = []
    const add = (m: unknown) => {
      if (m && (m as THREE.Material).isMaterial) mats.push(m as THREE.Material)
    }
    for (const pass of this.composer.passes) add((pass as unknown as { material?: unknown }).material)
    for (const m of (b.separableBlurMaterials as unknown[]) ?? []) add(m)
    add(b.compositeMaterial)
    add(b.blendMaterial)
    add(b.materialHighPassFilter)
    add(b.copyMaterial)
    return Promise.all(mats.map(m => this.renderer.compileAsync(new THREE.Mesh(quad.geometry, m), cam).catch(() => {})))
  }

  /**
   * True for targets that hold the FRAME (the scene target and the composer's
   * ping-pong targets), false for three's transmission buffer. Materials that
   * draw different strengths in the frame vs the glass buffer test with this.
   */
  isFrameTarget(rt: THREE.WebGLRenderTarget | null) {
    return rt === this.scenePass.target || rt === this.composer.renderTarget1 || rt === this.composer.renderTarget2
  }

  /** 4x MSAA on the scene render unless the frame is already supersampled */
  static samplesFor(dpr: number) {
    return dpr < 1.75 ? 4 : 0
  }

  setSize(w: number, h: number, dpr: number) {
    this.scenePass.setSamples(Post.samplesFor(dpr))
    this.composer.setPixelRatio(dpr)
    this.composer.setSize(w, h)
    this.bloom.resolution.set((w * dpr) / 2, (h * dpr) / 2)
    this.final.uniforms.uResolution.value.set(w * dpr, h * dpr)
    this.final.uniforms.uDpr.value = dpr
  }

  render(dt: number, time: number) {
    const k = 1 - Math.exp(-6 * dt)
    const c = this.current
    const p = this.params
    for (const key of Object.keys(p) as (keyof PostParams)[]) {
      // flash & glitch respond instantly so chapters can punch them
      c[key] = key === 'flash' || key === 'glitch' ? p[key] : c[key] + (p[key] - c[key]) * k
    }
    // flash budget (WCAG 2.3.1): a flash starting within FLASH_GAP of the last is dropped
    if (c.flash > 0.02) {
      if (!this.flashLive) {
        this.flashLive = true
        this.flashOk = time - this.lastFlashAt >= FLASH_GAP
        if (this.flashOk) this.lastFlashAt = time
      }
      if (!this.flashOk) c.flash = 0
    } else this.flashLive = false
    // a pass that adds nothing costs nothing: chapters set strength 0 where no highlight crosses
    this.bloom.enabled = c.bloomStrength > 0.01
    this.bloom.strength = c.bloomStrength
    this.bloom.radius = c.bloomRadius
    this.bloom.threshold = c.bloomThreshold
    this.renderer.toneMappingExposure = c.exposure
    const u = this.final.uniforms
    u.uTime.value = time
    u.uTransition.value = this.transition
    u.uGlitch.value = c.glitch
    u.uAberration.value = c.aberration
    u.uGrain.value = c.grain
    u.uVignette.value = c.vignette
    u.uFlash.value = c.flash
    u.uFrost.value = c.frost
    u.uCutSide.value = this.cutSide
    u.uSegue.value = this.segue
    ;(u.uAim.value as THREE.Vector4).copy(this.aim)
    u.uFade.value = this.fade
    this.composer.render(dt)
  }
}
