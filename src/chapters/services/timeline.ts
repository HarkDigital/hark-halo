/*
 * The Etched timeline, in viewport heights of scroll (vh) and the local
 * progress they come to. chapters/index.ts reads LENGTH / LANDING / INTRO from
 * here, so the chapter's length and its beats can never drift apart.
 *
 *   0.00–0.90 vh  INTRO   the segue clears (hero → services, src/core/post.ts),
 *                         the louvres open out of hairlines (0.12–0.62), the
 *                         copy rises ("Full range.", from 0.30)
 *                         and holds while the column hangs in its backlight and
 *                         the camera drifts in
 *   0.90–4.09 vh  PLATES  eleven plates, 0.29 vh each: part → turn → settle →
 *                         hold (Software Development is the first)
 *   4.09–4.40 vh  OUT     the last plate returns; the louvres close to
 *                         hairlines of light, the camera pulls back into black
 *
 * (Until Oct 2026 the intro was 0.30 vh of a 3.8 vh chapter, almost all of it
 * under the segue: plate 1 began parting as the copy arrived. The plates and
 * the out beat keep their old scroll lengths exactly.)
 */

/** chapter length (vh) */
export const LENGTH = 4.4
/** the intro beat (vh), before plate 1 starts to part */
export const INTRO_VH = 0.9
/** the eleven plates (vh): 0.84 of the old 3.8 vh chapter */
export const PLATES_VH = 3.192

/** vh of scroll → local progress */
export const at = (vh: number) => vh / LENGTH

/** plate 1 starts parting */
export const A = at(INTRO_VH)
/** the last plate is back in the column */
export const B = at(INTRO_VH + PLATES_VH)
/** the intro copy rises (the segue has all but cleared) … */
export const INTRO_IN = at(0.3)
/** … and gives way to the card as plate 1 slides out */
export const CARD_IN = A + at(0.053)
export const CARD_OUT = B - at(0.019)
/** the louvres open out of hairlines (local) */
export const LOUVRE_IN_AT = at(0.12)
export const LOUVRE_IN_LEN = at(0.5)
/**
 * Where nav jumps (the Services nav item, #services, a long jump's fog cut)
 * and the heading's Tab stop land: the intro beat, settled (copy in, column
 * open, the segue long gone). A service's own stop (#services/<slug>, the dots,
 * the copy layer) lands on its plate via the chapter's anchors instead.
 */
export const LANDING = at(0.66)
export const INTRO = LANDING
