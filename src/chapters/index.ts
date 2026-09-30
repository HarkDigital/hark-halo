import type { ChapterDef } from '../core/types'
import { LOGO } from '../kit/palette'

/**
 * The scroll story, in order. `length` is scroll distance in viewport
 * heights; `landing` is where nav jumps land (local progress, on settled
 * copy — keep it clear of the ~6% cut window at each end). Each chapter lives
 * in src/chapters/<id>/ and default-exports a factory returning a Chapter.
 *
 * THEME: rename the labels to fit the concept (Orbit "Signal/Orbit/…",
 * Press "Proof/Paste-up/…", Arcade "Title Screen/Arcade Hall/…"). The ids are
 * shared with src/core/srContent.ts and the chrome's business names.
 */
export const CHAPTERS: ChapterDef[] = [
  { id: 'hero', label: 'Hark Digital', length: 2.6, landing: 0, intro: 0.02, load: () => import('./hero/index') },
  // (arrives through the tube segue: the hero powers down into a line of neon, services powers up from it)
  { id: 'services', label: 'Etched', length: 3.8, landing: 0.12, intro: 0.12, segue: 'tube', load: () => import('./services/index') },
  { id: 'process', label: 'Assembly', length: 2.2, landing: 0.17, intro: 0.12, load: () => import('./process/index') },
  { id: 'work', label: 'Carousel', length: 7.0, landing: 0.12, intro: 0.06, load: () => import('./work/index') },
  { id: 'voices', label: 'Voiceprint', length: 6.0, landing: 0.08, intro: 0.06, load: () => import('./voices/index') },
  { id: 'shield', label: 'Short circuit', length: 3.0, landing: 0.33, intro: 0.33, load: () => import('./shield/index') },
  { id: 'contact', label: LOGO.kind === 'tube' ? 'Afterglow' : 'Thaw', length: 1.5, landing: 0.3, intro: 0.3, load: () => import('./contact/index') },
]
