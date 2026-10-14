import { P } from '../../scenes/kit'
import type { Builder } from '../picture'

/* A kind with no picture yet: one line of unlit glass across the band. */
export const blank: Builder = () => {
  let line = new Path2D()
  return {
    lead: [0, 1],
    init(w, h, env) {
      line = P.line(env.copyX, h * 0.62, w, h * 0.62)
    },
    frame(pen) {
      pen.glass(line, 0.14, 4)
    },
  }
}
