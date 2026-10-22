import type { SceneName } from '../data/pages'
import type { Scene } from './kit'
import { runScene, type SceneHandle } from './runner'
import { aerial } from './aerial'
import { blocks } from './blocks'
import { blueprint } from './blueprint'
import { commerce } from './commerce'
import { constellation } from './constellation'
import { dataflow } from './dataflow'
import { focus } from './focus'
import { glitch } from './glitch'
import { handset } from './handset'
import { pipeline } from './pipeline'
import { radar } from './radar'
import { shield } from './shield'
import { sift } from './sift'
import { turntable } from './turntable'
import { velocity } from './velocity'

/*
 * The service heroes: each page's `scene` (src/service/data/pages.ts) is the
 * classic 2026 site's hero animation for that service, ported to glass and
 * neon (./kit). Loaded after the copy is up; see ./runner for the canvases.
 */
export const SERVICE_SCENES: Partial<Record<SceneName, () => Scene>> = {
  dataflow,
  blueprint,
  commerce,
  radar,
  velocity,
  sift,
  aerial,
  glitch,
  handset,
  turntable,
  shield,
  focus,
  blocks,
  constellation,
  pipeline,
}

export function mountScene(host: HTMLElement, name: SceneName, o: { reduced: boolean }): SceneHandle {
  return runScene(host, (SERVICE_SCENES[name] ?? dataflow)(), o)
}
