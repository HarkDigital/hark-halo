import type { ServicePageData } from '../data/pages'
import type { Scene } from './kit'
import { runScene, type SceneHandle } from './runner'
import { aerial } from './aerial'
import { blocks } from './blocks'
import { blueprint } from './blueprint'
import { commerce } from './commerce'
import { dataflow } from './dataflow'
import { focus } from './focus'
import { glitch } from './glitch'
import { radar } from './radar'
import { shield } from './shield'
import { sift } from './sift'
import { velocity } from './velocity'

/*
 * The service heroes: each page's `scene` (src/service/data/pages.ts) is the
 * classic 2026 site's hero animation for that service, ported to glass and
 * neon (./kit). Loaded after the copy is up; see ./runner for the canvases.
 */
const SCENES: Partial<Record<ServicePageData['scene'], () => Scene>> = {
  dataflow,
  blueprint,
  commerce,
  radar,
  velocity,
  sift,
  aerial,
  glitch,
  shield,
  focus,
  blocks,
}

export function mountScene(host: HTMLElement, name: ServicePageData['scene'], o: { reduced: boolean }): SceneHandle {
  return runScene(host, (SCENES[name] ?? dataflow)(), o)
}
