import type { Scene } from '../../service/scenes/kit'
import { runScene, type SceneHandle } from '../../service/scenes/runner'
import { SERVICE_SCENES } from '../../service/scenes'
import { dataflow } from '../../service/scenes/dataflow'
import type { IndustryScene } from '../data'

/*
 * The industry heroes: each page's `scene` (src/industry/data) drawn in the service
 * heroes' glass and neon (service/scenes/kit, the same runner). An industry's own
 * scene is a file here, ./<name>.ts, exporting a factory of the same name
 * (`export function crane(): Scene`); nothing to register. A name with no file
 * falls through to the service scenes, so a page can borrow one until its own is drawn.
 */
const OWN = import.meta.glob<Record<string, () => Scene>>('./*.ts')

export async function mountIndustryScene(host: HTMLElement, name: IndustryScene, o: { reduced: boolean }): Promise<SceneHandle> {
  const own = OWN[`./${name}.ts`]
  const make = own ? (await own())[name] : undefined
  const fallback = SERVICE_SCENES[name as keyof typeof SERVICE_SCENES] ?? dataflow
  return runScene(host, (make ?? fallback)(), o)
}
