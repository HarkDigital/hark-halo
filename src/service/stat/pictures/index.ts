import type { StatViz } from '../../data/pages'
import type { Builder, StatPicture } from '../picture'
import { blank } from './blank'
import { years } from './years'
import { arc } from './arc'
import { gauge } from './gauge'
import { beads } from './beads'
import { windowPane } from './window'
import { loads } from './loads'
import { impacts } from './impacts'
import { past } from './past'
import { first } from './first'
import { lamps } from './lamps'
import { sand } from './sand'
import { now } from './now'
import { sign } from './sign'

/*
 * The pictures, one builder per StatViz kind (data/pages.ts; the briefs are
 * in ../PICTURES.md), each in its own file (see ../picture.ts for what a
 * picture is). A kind without a picture yet draws the blank: unlit glass.
 */
const PICTURES: { [K in StatViz['kind']]?: Builder<Extract<StatViz, { kind: K }>> } = {
  years,
  arc,
  gauge,
  beads,
  window: windowPane,
  loads,
  impacts,
  past,
  first,
  lamps,
  sand,
  now,
  sign,
}

/** the picture for `viz` (built once; canvas.ts calls init on every size) */
export function build(viz: StatViz, value: string): StatPicture {
  const b = PICTURES[viz.kind] as Builder | undefined
  return (b ?? blank)(viz, value)
}
