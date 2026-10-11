/**
 * FROST on touch devices. three blurs transmission at lod = log2(buffer width) * a (a: the
 * roughness term), so the blur on screen depends on the glass buffer's size; the phone frosts
 * were tuned on a buffer of 0.75 device px per CSS px (1.5x frame, half-size glass). The engine
 * writes how far today's buffer is from that, in mips (log2(dpr * glass scale / 0.75); 0 on
 * desktop), and frosted materials add (1 - a) * bias, which gives the tuned blur width at any
 * buffer size (adaptive steps included) for every frost on the site (a of 0.2 and up). Clear
 * glass (a under 0.1: three never lets roughness reach 0, so the hero's thaw window is a of about
 * 0.08; contact's thaw is 0) fades the bias out, so it reads the sharper buffer as finely as it can, and the lod never goes
 * below mip 0. Use FROST_DECL + frostLod(a) in a replaced transmission_pars
 * chunk and set uniforms.uFrostBias = FROST_BIAS, or kit/glass frostBiased(m).
 *
 * (its own module, free of three, so the engine can write it without pulling the glass kit into
 * the entry chunk)
 */
export const FROST_BIAS = { value: 0 }
export const FROST_DECL = 'uniform float uFrostBias;\n'
export const frostLod = (a: string) =>
  `float frA = ${a};\n\t\tfloat lod = max( log2( transmissionSamplerSize.x ) * frA + ( 1.0 - frA ) * uFrostBias * clamp( ( frA - 0.1 ) * 10.0, 0.0, 1.0 ), 0.0 );`
