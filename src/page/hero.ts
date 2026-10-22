import type { SceneHandle } from '../service/scenes/runner'
import type { MenuSheet } from '../ui/menuSheet'

/*
 * THE HERO'S ART on a plain page (the service and industry pages): the scene mounts
 * last, after the copy, and holds still once the phone Menu sheet is up (the sheet
 * frosts a still image; a live canvas under backdrop-filter is costly on a phone).
 * `heroHold` gives mountTop its onOpen / onClose and takes the scene once it is in.
 */
export function heroHold(reduced: boolean) {
  let art: SceneHandle | undefined
  let menu: MenuSheet | undefined
  let stillTimer = 0
  return {
    handlers: {
      onOpen: () => {
        clearTimeout(stillTimer)
        stillTimer = window.setTimeout(() => {
          if (menu?.isOpen) art?.hold(true)
        }, reduced ? 0 : 420)
      },
      onClose: () => {
        clearTimeout(stillTimer)
        art?.hold(false)
      },
    },
    /** the sheet, once mountTop has made it */
    bind(m: MenuSheet) {
      menu = m
    },
    /** the scene, once it is mounted (held at once if the sheet is already up) */
    set(a: SceneHandle) {
      art = a
      if (menu?.isOpen) a.hold(true)
    },
  }
}

/**
 * The hero copy's visible width, which service.css centres in the left half on
 * desktop (--svc-copy-vis on .svc-hero): from the box's left edge to the
 * furthest of its eyebrow, headline words, lede lines and buttons.
 * Layout edges, not the entrances' transforms: the centre and layout width of
 * each give where it comes to rest.
 * Only the block's position depends on it, never its width, so it settles in
 * one pass; measured again once the font is in and on every resize (the type
 * can change size while the box keeps its width).
 */
export function fitHeroCopy() {
  const hero = document.querySelector<HTMLElement>('.svc-hero')
  const copy = hero?.querySelector<HTMLElement>('.svc-hero-copy')
  if (!hero || !copy) return
  const lede = copy.querySelector('.svc-lede')
  const range = document.createRange()
  const measure = () => {
    const left = copy.getBoundingClientRect().left
    let right = left
    copy.querySelectorAll<HTMLElement>('.hud-eyebrow, .rise-w, .hud-btn').forEach(el => {
      const r = el.getBoundingClientRect()
      right = Math.max(right, (r.left + r.right) / 2 + el.offsetWidth / 2)
    })
    if (lede) {
      range.selectNodeContents(lede)
      for (const r of range.getClientRects()) right = Math.max(right, r.right)
    }
    if (right > left) hero.style.setProperty('--svc-copy-vis', `${Math.ceil(right - left)}px`)
  }
  measure()
  document.fonts?.ready.then(measure)
  addEventListener('resize', measure, { passive: true })
}
