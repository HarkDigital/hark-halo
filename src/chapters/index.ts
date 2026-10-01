import type { ChapterDef } from '../core/types'
import { LOGO } from '../kit/palette'
import * as ETCHED from './services/timeline'

/**
 * The scroll story, in order. `length` is scroll distance in viewport
 * heights; `landing` is where nav jumps land (local progress, on settled
 * copy — keep it clear of the ~6% cut window at each end). Each chapter lives
 * in src/chapters/<id>/ and default-exports a factory returning a Chapter.
 *
 * THEME: rename the labels to fit the concept (Orbit "Signal/Orbit/…",
 * Press "Proof/Paste-up/…", Arcade "Title Screen/Arcade Hall/…"). The ids are
 * shared with src/core/srContent.ts and the chrome's business names.
 *
 * `segue` picks how a chapter arrives from the one before when the visitor
 * scrolls through that boundary (a watched transition, drawn in
 * src/core/post.ts, THE SEGUES); without it, the breath cut (fog). Long nav
 * jumps always use the time-driven fog cut. Modes:
 *   'blinds'  the frame closes into frosted glass slats, each catching a rim
 *             of light; they open again onto services, their hairlines drawing
 *             in to the column's own louvres as those open
 *   'glass'   the camera pushes through a pane of frosted glass: the frame
 *             frosts, a soft light swells behind the pane, it clears onto the
 *             next chapter
 *   'neon'    the light drains out of the frame into one thin line of neon that
 *             draws across it, then glides onto the first plate's hairline
 *   'tube'    an old tube set switching off (a line, a point, black, and back)
 * `?segue=blinds|glass|neon|tube|fog` overrides it for review.
 */
export const CHAPTERS: ChapterDef[] = [
  { id: 'hero', label: 'Hark Digital', length: 2.6, landing: 0, intro: 0.02, load: () => import('./hero/index') },
  // (arrives through the glass segue; its length, landing and intro beat come from services/timeline.ts)
  { id: 'services', label: 'Etched', length: ETCHED.LENGTH, landing: ETCHED.LANDING, intro: ETCHED.INTRO, segue: 'glass', load: () => import('./services/index') },
  { id: 'process', label: 'Assembly', length: 2.2, landing: 0.17, intro: 0.12, load: () => import('./process/index') },
  { id: 'work', label: 'Carousel', length: 7.0, landing: 0.12, intro: 0.06, load: () => import('./work/index') },
  { id: 'voices', label: 'Voiceprint', length: 6.0, landing: 0.08, intro: 0.06, load: () => import('./voices/index') },
  { id: 'shield', label: 'Short circuit', length: 3.0, landing: 0.33, intro: 0.33, load: () => import('./shield/index') },
  { id: 'contact', label: LOGO.kind === 'tube' ? 'Afterglow' : 'Thaw', length: 1.5, landing: 0.3, intro: 0.3, load: () => import('./contact/index') },
]
