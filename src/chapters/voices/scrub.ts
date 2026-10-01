import { clamp } from '../../core/math'

/*
 * Scroll-scrubbed word rise for the Voiceprint chapter (voices).
 *
 * rise() (core/rise.ts) splits a line into words; other chapters then play
 * those words in on a timer (setRise). Here every word's reveal is a function
 * of scroll instead: each frame the chapter hands each word a 0..1 value and
 * this writes it as the word's --p, which voices.css maps onto the same rise
 * (up out of the clip, blur to sharp, transparent to opaque).
 *
 *   0       hidden   (no --p, visibility: hidden: not painted)
 *   0..1    rising   (.is-fly + --p, quantised to 1/100)
 *   1       settled  (.is-set: no filter, no transform)
 *
 * A word is only touched when its quantised value changes, and nothing is
 * read back from the DOM, so the frame loop never forces style or layout.
 */
export class WordScrub {
  /** each word's outer .rise-w, in reading order across the lines */
  readonly words: HTMLElement[] = []
  /** last value written per word, in hundredths (-1: not written yet) */
  private last: Int16Array
  private opacity = -1
  private live = true

  /** `root` fades as a whole (calm mode); `lines` are rise() elements, in reading order */
  constructor(
    private root: HTMLElement,
    lines: HTMLElement[],
  ) {
    for (const line of lines) {
      line.classList.add('vx-scrub')
      line.querySelectorAll<HTMLElement>('.rise-w').forEach(w => this.words.push(w))
    }
    this.last = new Int16Array(this.words.length).fill(-1)
  }

  get count() {
    return this.words.length
  }

  /** word k's reveal, 0 (hidden) … 1 (settled) */
  set(k: number, v: number) {
    const q = v <= 0 ? 0 : v >= 1 ? 100 : Math.round(v * 100)
    const was = this.last[k]
    if (q === was) return
    this.last[k] = q
    this.live = true
    const w = this.words[k]
    const fly = q > 0 && q < 100
    if (fly) w.style.setProperty('--p', String(q / 100))
    else if (was > 0 && was < 100) w.style.removeProperty('--p')
    if (was < 0 || (was > 0 && was < 100) !== fly) w.classList.toggle('is-fly', fly)
    if (was < 0 || (was === 100) !== (q === 100)) w.classList.toggle('is-set', q === 100)
  }

  /** the whole group's opacity (calm mode's quick fade); 1 clears it */
  fade(o: number) {
    const q = o >= 1 ? 100 : Math.round(clamp(o) * 100)
    if (q === this.opacity) return
    this.opacity = q
    this.live = true
    this.root.style.opacity = q === 100 ? '' : String(q / 100)
  }

  /** every word hidden, the fade cleared (cheap when it already is) */
  clear() {
    if (!this.live) return
    for (let k = 0; k < this.words.length; k++) this.set(k, 0)
    this.fade(1)
    this.live = false
  }
}

/**
 * Word j of n coming through a window [a, b] of some progress x: each word
 * ramps 0 → 1 over its own slice of the window, the slices' starts spread
 * across it in order, so a sweep of ~8 words is in motion at once whatever the
 * line's length. Linear in x (the caller eases it).
 */
export function wordRamp(x: number, a: number, b: number, j: number, n: number) {
  const span = b - a
  if (n <= 1) return clamp((x - a) / span)
  const w = span * clamp(8 / n, 0.18, 0.45)
  const s = a + ((span - w) * j) / (n - 1)
  return clamp((x - s) / w)
}

/** the rise's feel: quick off the mark, a long soft settle (scrubbing back plays it in reverse) */
export const riseEase = (t: number) => 1 - (1 - t) * (1 - t) * (1 - t)
