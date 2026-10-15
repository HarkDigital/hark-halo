import type { Scene } from '../service/scenes/kit'
import { runScene, type SceneHandle } from '../service/scenes/runner'
import './fx.css'

/*
 * FX: live drawings in glass and neon for any box on the site.
 *
 *   mountFx(el, 'tube-draw')   puts the drawing in `el` (which becomes an .fx
 *                              host: fx.css) on the hero's three bloom
 *                              canvases, drawn only while on screen, answering
 *                              the pointer (a touch counts while the finger is
 *                              down). Returns the runner's handle: hold() and
 *                              dispose().
 *   FX_LIST                    every drawing, with its title, what it is and
 *                              how to play with it (the lab page shows them).
 *
 * Each drawing is a Scene (service/scenes/kit.ts), one file in ./logos (the
 * mark, ten ways) or ./scenes (ten scenes), exported as default, loaded only
 * when asked for. The hero scenes and the stat pictures are their siblings:
 * same Pen, same lights, same rules (the lab page says them).
 */

export interface FxMeta {
  name: string
  kind: 'logo' | 'scene'
  title: string
  blurb: string
  /** how to play with it */
  hint: string
}

export const FX_LIST: FxMeta[] = [
  { name: 'tube-draw', kind: 'logo', title: 'Struck', blurb: 'The mark as three neon tubes in glass sleeves. The gas strikes round each loop from its electrode, dwells, drains and strikes again.', hint: 'Move over a tube to warm it; the strike never waits for you.' },
  { name: 'motes', kind: 'logo', title: 'Motes', blurb: 'A cloud of lit dust gathers into the mark, holds, and drifts apart. Every particle knows its place on the glass.', hint: 'The cursor scatters the dust; it finds its way back.' },
  { name: 'scanlight', kind: 'logo', title: 'Scan', blurb: 'A bar of white light passes over the mark and leaves it lit behind, glass first, then gas.', hint: 'Drag the bar with the cursor; let go and it carries on.' },
  { name: 'orbit', kind: 'logo', title: 'Orbit', blurb: 'The two loops swing apart into rings and circle the diamond, then fall back into the mark.', hint: 'The cursor pulls the rings off course; they settle when you leave.' },
  { name: 'liquid', kind: 'logo', title: 'Liquid', blurb: 'The mark as hollow glass filled with liquid light, a level that sloshes and settles.', hint: 'Move fast and the light sloshes; tilt it by where you point.' },
  { name: 'shatter', kind: 'logo', title: 'Shatter', blurb: 'The mark in frosted glass. Struck, it breaks into lit shards that tumble, then gather back whole.', hint: 'Click or tap to break it.' },
  { name: 'contours', kind: 'logo', title: 'Contours', blurb: 'Echoes of the mark, ring on ring, a topographic map of one shape, lit by a light that walks the contours.', hint: 'The cursor is the lamp.' },
  { name: 'pulse', kind: 'logo', title: 'Pulse', blurb: 'Slugs of light race the loops like current in a circuit, meeting at the diamond and flashing it.', hint: 'The cursor speeds the current near it.' },
  { name: 'lamp', kind: 'logo', title: 'Lamp', blurb: 'A clear glass mark lit by one moving light: a specular glint on its edge, a glow on the wall, a shadow behind.', hint: 'The cursor is the light.' },
  { name: 'sonar', kind: 'logo', title: 'Sonar', blurb: 'The diamond pings. Rings of light ripple out through the loops, lighting each as they pass.', hint: 'Hover to ping; the rings go where you point.' },
  { name: 'aurora', kind: 'scene', title: 'Aurora', blurb: 'Curtains of light hanging in the dark, swaying, their folds lit from below.', hint: 'The cursor draws the curtain toward it; press to send a ripple through it.' },
  { name: 'rain', kind: 'scene', title: 'Rain', blurb: 'Rain on a window at night, each drop a bead of neon running down the glass.', hint: 'The cursor is a finger on the glass: it wipes, and the drops run from it.' },
  { name: 'warp', kind: 'scene', title: 'Warp', blurb: 'Stars rushing past, streaking as they come, the way light does at speed.', hint: 'Steer with the cursor; hold to go faster.' },
  { name: 'lightning', kind: 'scene', title: 'Lightning', blurb: 'Bolts of light that fork from the sky to the ground and leave the air glowing.', hint: 'The bolts strike where you point.' },
  { name: 'scope', kind: 'scene', title: 'Scope', blurb: 'An oscilloscope trace on dark glass, a signal breathing on its line.', hint: 'The cursor bends the wave; press to add a note.' },
  { name: 'ink', kind: 'scene', title: 'Ink', blurb: 'Tendrils of lit smoke curling in still air.', hint: 'The cursor stirs them.' },
  { name: 'bokeh', kind: 'scene', title: 'Bokeh', blurb: 'Lights out of focus drifting in the dark, each a soft disc of colour.', hint: 'The cursor is the lens: lights near it come into focus.' },
  { name: 'tunnel', kind: 'scene', title: 'Tunnel', blurb: 'A grid of light rushing toward you down a tunnel that never ends.', hint: 'Steer with the cursor.' },
  { name: 'field', kind: 'scene', title: 'Field', blurb: 'Lines of force in a dark field, bending around whatever moves through it.', hint: 'The cursor is a magnet.' },
  { name: 'fireflies', kind: 'scene', title: 'Fireflies', blurb: 'A swarm of lit points drifting through the dark, blinking in their own time.', hint: 'They gather toward the cursor and scatter when you press.' },
]

const LOADERS: Record<string, () => Promise<{ default: () => Scene }>> = {
  'tube-draw': () => import('./logos/tube-draw'),
  motes: () => import('./logos/motes'),
  scanlight: () => import('./logos/scanlight'),
  orbit: () => import('./logos/orbit'),
  liquid: () => import('./logos/liquid'),
  shatter: () => import('./logos/shatter'),
  contours: () => import('./logos/contours'),
  pulse: () => import('./logos/pulse'),
  lamp: () => import('./logos/lamp'),
  sonar: () => import('./logos/sonar'),
  aurora: () => import('./scenes/aurora'),
  rain: () => import('./scenes/rain'),
  warp: () => import('./scenes/warp'),
  lightning: () => import('./scenes/lightning'),
  scope: () => import('./scenes/scope'),
  ink: () => import('./scenes/ink'),
  bokeh: () => import('./scenes/bokeh'),
  tunnel: () => import('./scenes/tunnel'),
  field: () => import('./scenes/field'),
  fireflies: () => import('./scenes/fireflies'),
}

/** put the drawing `name` in `host` (any element with a size); resolves to the runner's handle */
export async function mountFx(host: HTMLElement, name: string, o: { reduced?: boolean } = {}): Promise<SceneHandle> {
  const load = LOADERS[name]
  if (!load) throw new Error(`[fx] no drawing called "${name}"`)
  const { default: make } = await load()
  host.classList.add('fx')
  return runScene(host, make(), { reduced: !!o.reduced })
}
