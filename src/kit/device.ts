/**
 * A touch screen (Engine `mobile`: coarse pointer or a window under 768 px) with more CSS px than
 * this is a tablet: phones are 250k-420k, foldables' inner screens about 590k, an iPad mini 843k.
 * Phones render at 2x with lean glass sleeves; tablets keep 1.5x and the full sleeves.
 */
export const TABLET_CSS_PX = 6e5
export const tabletArea = (w: number, h: number) => w * h > TABLET_CSS_PX
