import type { StatViz } from '../../data/pages'
import type { Builder, StatPicture } from '../picture'
import { blank } from './blank'
import { rings } from './rings'
import { ream } from './ream'
import { lamps } from './lamps'
import { bars } from './bars'
import { first } from './first'
import { loads } from './loads'
import { spool } from './spool'
import { orb } from './orb'
import { drone } from './drone'
import { now } from './now'
import { impacts } from './impacts'
import { windowPane } from './window'
import { reeds } from './reeds'

/*
 * The pictures, one builder per StatViz kind (data/pages.ts; the briefs are
 * in ../PICTURES.md), each in its own file (see ../picture.ts for what a
 * picture is). A kind without a picture yet draws the blank: unlit glass.
 */
const PICTURES: { [K in StatViz['kind']]?: Builder<Extract<StatViz, { kind: K }>> } = {
  rings,
  ream,
  lamps,
  bars,
  first,
  loads,
  spool,
  orb,
  drone,
  now,
  impacts,
  window: windowPane,
  reeds,
}

/** the picture for `viz` (built once; canvas.ts calls init on every size) */
export function build(viz: StatViz, value: string): StatPicture {
  const b = PICTURES[viz.kind] as Builder | undefined
  return (b ?? blank)(viz, value)
}
