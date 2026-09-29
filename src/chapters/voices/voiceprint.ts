/*
 * VOICEPRINT — a waveform drawn from a sentence, deterministically.
 *
 * Every word is one half-cycle of the wave (up, down, up …): its WIDTH follows
 * the word's length, its HEIGHT its syllables and stress (small function words
 * stay low, long words and SHOUTED ones peak). Commas, dashes and semicolons
 * are short silences, full stops longer ones; a sentence trails off a little
 * toward its end. The same quote always draws the same line.
 *
 * The tube is sampled along its length at SAMPLES points: a dense stretch for
 * the speech (s ∈ [-1, 1]) and sparse flat leads out to ±LEAD_S either side
 * (silence, running on past the edges of the frame).
 */

/** samples in the speech stretch / in each flat lead */
export const SPEECH_SAMPLES = 720
export const LEAD_SAMPLES = 48
export const SAMPLES = SPEECH_SAMPLES + 2 * LEAD_SAMPLES
/** the leads run out to ±LEAD_S (in speech half-widths) */
export const LEAD_S = 7
/** the speech itself sits a touch inside its stretch (a breath before and after) */
const PAD = 0.035

const STOP = new Set(
  'a an the of to and but at he she is it its in on we our us that with for as by be his her has have was were are so any they their them i me my up or if this'.split(' '),
)

/** a rough English syllable count (vowel groups, silent e, digits as spoken) */
export function syllables(word: string): number {
  const w = word.toLowerCase()
  if (/\d/.test(w)) return 2 // "90s" → nine-ties
  const s = w.replace(/[^a-z]/g, '')
  if (s.length <= 3) return 1
  const t = s.replace(/(?:[^laeiouy]es|[^laeiouy]ed|[^laeiouy]e)$/, '').replace(/^y/, '')
  const m = t.match(/[aeiouy]{1,2}/g)
  return Math.max(1, m ? m.length : 1)
}

/** stable 0..1 hash of a string (FNV-1a) */
function hash01(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 10007) / 10007
}

interface Unit {
  /** relative width */
  w: number
  /** peak height (0 = a silence) */
  h: number
}

/** the sentence as a row of word lobes and silences */
function units(text: string): Unit[] {
  const tokens = text.match(/[A-Za-z0-9’']+|[,;:.!?—–]/g) ?? []
  const out: Unit[] = []
  // words per sentence, so each sentence can trail off
  let sentence: Unit[] = []
  const closeSentence = () => {
    const n = sentence.length
    sentence.forEach((u, i) => {
      const x = n > 1 ? i / (n - 1) : 0
      // a sentence swells a little, then trails off
      u.h *= (0.74 + 0.36 * Math.sin(Math.PI * Math.min(1, x * 1.25))) * (1 - 0.22 * x * x)
    })
    sentence = []
  }
  tokens.forEach((tok, i) => {
    if (/^[,;:—–]$/.test(tok)) {
      out.push({ w: 2.2, h: 0 })
      return
    }
    if (/^[.!?]$/.test(tok)) {
      closeSentence()
      if (i < tokens.length - 1) out.push({ w: 4.2, h: 0 })
      return
    }
    const letters = tok.replace(/[^A-Za-z0-9]/g, '').length
    const syl = syllables(tok)
    const lower = tok.toLowerCase().replace(/[’']/g, '')
    let h = 0.22 + 0.2 * Math.min(syl, 4) + 0.05 * Math.min(letters, 12)
    if (STOP.has(lower)) h *= 0.42
    if (letters > 1 && tok === tok.toUpperCase() && /[A-Z]/.test(tok)) h *= 1.5 // "TWO"
    h *= 0.76 + 0.48 * hash01(lower + i) // every voice has its own grain
    const u: Unit = { w: 1.6 + 0.62 * letters, h }
    out.push(u)
    sentence.push(u)
  })
  closeSentence()
  return out
}

/** the speech coordinate s of every sample (shared by every voice) */
export function sampleS(): Float32Array {
  const s = new Float32Array(SAMPLES)
  const edge = 1
  for (let k = 0; k < LEAD_SAMPLES; k++) {
    // leads: denser near the speech, stretching out to ±LEAD_S
    const t = (LEAD_SAMPLES - k) / LEAD_SAMPLES
    s[k] = -edge - (LEAD_S - edge) * t * t
    s[SAMPLES - 1 - k] = -s[k]
  }
  for (let k = 0; k < SPEECH_SAMPLES; k++) s[LEAD_SAMPLES + k] = -edge + (2 * edge * k) / (SPEECH_SAMPLES - 1)
  return s
}

/**
 * The voiceprint of `text`: SAMPLES heights in -1..1 (0 = silence), one per
 * sample of sampleS(). Peaks are normalised so every voice fills the same band.
 */
export function voiceprint(text: string): Float32Array {
  const us = units(text)
  const total = us.reduce((a, u) => a + u.w, 0) || 1
  const y = new Float32Array(SAMPLES)
  const s = sampleS()
  // speech runs over [-1 + PAD, 1 - PAD]
  const x0 = -1 + PAD
  const span = 2 - 2 * PAD
  // lobe boundaries in s
  const edges: number[] = []
  let acc = 0
  for (const u of us) {
    edges.push(x0 + (acc / total) * span)
    acc += u.w
  }
  edges.push(x0 + span)
  let sign = 1
  const signs = us.map(u => {
    if (u.h === 0) return 0
    const v = sign
    sign = -sign
    return v
  })
  let j = 0
  for (let k = LEAD_SAMPLES; k < LEAD_SAMPLES + SPEECH_SAMPLES; k++) {
    const x = s[k]
    while (j < us.length - 1 && x >= edges[j + 1]) j++
    const u = us[j]
    if (!u || u.h === 0 || x < edges[0] || x > edges[us.length]) continue
    const t = (x - edges[j]) / (edges[j + 1] - edges[j])
    y[k] = signs[j] * u.h * Math.sin(Math.PI * t)
  }
  // soften the joins a touch (a glass tube can't turn on a point)
  const tmp = new Float32Array(y)
  const K = [0.06, 0.24, 0.4, 0.24, 0.06]
  for (let k = 2; k < SAMPLES - 2; k++) {
    let v = 0
    for (let q = -2; q <= 2; q++) v += tmp[k + q] * K[q + 2]
    y[k] = v
  }
  let peak = 0
  for (let k = 0; k < SAMPLES; k++) peak = Math.max(peak, Math.abs(y[k]))
  // normalise, then compress the dynamics a little (quiet words stay visible)
  if (peak > 0) for (let k = 0; k < SAMPLES; k++) y[k] = Math.sign(y[k]) * Math.pow(Math.abs(y[k]) / peak, 0.8)
  return y
}
