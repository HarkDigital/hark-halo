import type { Pen, Pointer } from '../scenes/kit'
import type { StatViz } from '../data/pages'

/*
 * A PICTURE in the stat band (band.ts): the service's number drawn in glass
 * and neon on the band's canvases (canvas.ts: the hero's three-layer bloom,
 * scenes/kit.ts's Pen), filling the whole band. One file per picture in
 * ./pictures, one builder per StatViz kind (data/pages.ts).
 *
 * init(w, h, env) once per (re)size, in scene px (laptop px: on wide
 * screens the canvases scale them up by --hud-px, as the hero's do). The
 * picture composes for env.mode: 'wide' has the copy over its left part
 * (compose the subject right of env.copyX; light and atmosphere may run
 * under the copy), 'framed' is a wide short band under centred copy on a
 * tablet (compose centred, inside the box), 'narrow' a short band under the
 * copy on a phone (simplified). It may return up to three labels (tiny
 * tracked caps the band sets in the DOM at those scene coordinates).
 *
 * frame() every frame while the band is on screen: p is the eased 0..1 the
 * number counts with (what is lit always equals the number), e the linear
 * 0..1 of the strike (DELAY after the trigger, over `dur` ms), t the seconds
 * since the trigger, which keeps running after the strike: the picture stays
 * alive (restrained idle life, an answer to the pointer) and never replays
 * its strike. Before the trigger one still frame is drawn at p = e = t = 0
 * (unlit glass). Frames must be pure in p, e and t (a rebuild or the dev seek
 * draws any time in any order) and cheap. Colours: NA / NB / NC and white
 * from kit.ts; glass is faint white. All of it is aria-hidden: the band's
 * text says it all.
 */

export interface Env {
  mode: 'wide' | 'framed' | 'narrow'
  /** a phone's short band */
  narrow: boolean
  /** a tablet's band under centred copy */
  framed: boolean
  /** wide: the x (scene px) where the copy's column ends; 0 otherwise */
  copyX: number
}

export interface Label {
  text: string
  /** scene px */
  x: number
  y: number
  /** which edge sits at x (default left) */
  align?: 'left' | 'center' | 'right'
  /** set in the brighter label colour */
  hi?: boolean
}

export interface StatPicture {
  /** (re)build for a size; up to three labels, or nothing */
  init(w: number, h: number, env: Env): Label[] | void
  /** draw the state at p (eased, the count's), e (the strike's linear clock) and t (seconds since the trigger) */
  frame(pen: Pen, w: number, h: number, p: number, e: number, t: number, pointer: Pointer, dt: number): void
  /** the band glow's two tints (left, right), as places along the lights: 0 = NA, 0.5 = NB, 1 = NC */
  lead: [number, number]
  /** the strike's length (ms), when not the band's default */
  dur?: number
  /**
   * where on e (0..1) the count begins: p stays 0 until then and eases over the rest (a picture
   * with a prologue the number must not run ahead of: the two loads' first second). Default 0.
   */
  countFrom?: number
  /** a word value's key light: true once it is on (the word strikes with it) */
  key?(p: number, e: number): boolean
  /** rebuilt on the minute while on screen (the clock) */
  live?: boolean
}

export type Builder<V extends StatViz = StatViz> = (viz: V, value: string) => StatPicture
