/*
 * MOTION: the site always runs its full motion, whatever the device's
 * "reduce motion" setting says (the owner's call, Sep 2026). Everything that
 * used to ask prefers-reduced-motion (the engine and so every chapter's
 * ctx.reducedMotion, the chrome, the loader, the form dialog, the service
 * pages) reads this instead, and the CSS no longer has reduced-motion blocks.
 *
 * To honour the device setting again: set this to
 * matchMedia('(prefers-reduced-motion: reduce)').matches and restore the
 * @media (prefers-reduced-motion: reduce) blocks from git history.
 */
export const REDUCED_MOTION = false
