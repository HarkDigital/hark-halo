/*
 * A NEON tube round a card's edge that DRAWS ITSELF as the card scrolls into
 * view: two strokes leave the top centre, run down both sides and meet at the
 * bottom centre once the card is in view (and ebb back as it leaves).
 *
 * Inline SVG sized to the card (re-measured on resize), in the active lights
 * (--neon-a / b / c): a wide soft glow, a coloured tube and a white-hot core,
 * each two half-paths with pathLength 1 so progress is a dash offset. The
 * light follows the scroll (no autonomous motion), so it is fine under
 * reduced motion too.
 */

const NS = 'http://www.w3.org/2000/svg'
let uid = 0

export function mountNeonFrame(card: HTMLElement) {
  const id = `nf${++uid}`
  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('class', 'neon-frame')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('focusable', 'false')
  svg.innerHTML = `
    <defs>
      <linearGradient id="${id}-g" gradientUnits="userSpaceOnUse">
        <stop offset="0" style="stop-color: var(--neon-a)" />
        <stop offset="0.5" style="stop-color: var(--neon-b)" />
        <stop offset="1" style="stop-color: var(--neon-c)" />
      </linearGradient>
      <filter id="${id}-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9" /></filter>
      <filter id="${id}-bloom" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.4" /></filter>
    </defs>
    <g class="nf-soft" filter="url(#${id}-soft)"><path class="nf-p" /><path class="nf-p" /></g>
    <g class="nf-bloom" filter="url(#${id}-bloom)"><path class="nf-p" /><path class="nf-p" /></g>
    <g class="nf-tube"><path class="nf-p" /><path class="nf-p" /></g>
    <g class="nf-core"><path class="nf-p" /><path class="nf-p" /></g>`
  card.prepend(svg)
  const grad = svg.querySelector('linearGradient')!
  const paths = [...svg.querySelectorAll<SVGPathElement>('.nf-p')]
  for (const p of paths) {
    p.setAttribute('pathLength', '1')
    p.setAttribute('stroke-dasharray', '1 1')
    if (!p.closest('.nf-core')) p.setAttribute('stroke', `url(#${id}-g)`)
  }

  const layout = () => {
    const w = card.clientWidth
    const h = card.clientHeight
    if (!w || !h) return
    const r = Math.min(parseFloat(getComputedStyle(card).borderTopLeftRadius) || 22, w / 2, h / 2)
    const i = 0.75 // the tube sits on the card's edge
    const x0 = i
    const y0 = i
    const x1 = w - i
    const y1 = h - i
    const rr = Math.max(0, r - i)
    const mx = w / 2
    // right half: top centre → clockwise → bottom centre; left half mirrored
    const right = `M${mx} ${y0}H${x1 - rr}A${rr} ${rr} 0 0 1 ${x1} ${y0 + rr}V${y1 - rr}A${rr} ${rr} 0 0 1 ${x1 - rr} ${y1}H${mx}`
    const left = `M${mx} ${y0}H${x0 + rr}A${rr} ${rr} 0 0 0 ${x0} ${y0 + rr}V${y1 - rr}A${rr} ${rr} 0 0 0 ${x0 + rr} ${y1}H${mx}`
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
    svg.setAttribute('width', String(w))
    svg.setAttribute('height', String(h))
    paths.forEach((p, k) => p.setAttribute('d', k % 2 ? left : right))
    grad.setAttribute('x1', '0')
    grad.setAttribute('y1', '0')
    grad.setAttribute('x2', String(w))
    grad.setAttribute('y2', String(h))
    update()
  }

  let last = -1
  const update = () => {
    const r = card.getBoundingClientRect()
    const vh = window.innerHeight || 1
    // starts as the card's top enters the view; complete once the card is (mostly) in view
    const span = Math.max(1, Math.min(r.height, vh) * 0.85)
    const p = Math.max(0, Math.min(1, (vh * 0.96 - r.top) / span))
    const q = Math.round(p * 1000) / 1000
    if (q === last) return
    last = q
    for (const path of paths) path.setAttribute('stroke-dashoffset', String(1 - q))
    svg.style.setProperty('--nf', String(q))
    svg.classList.toggle('is-full', q >= 0.999)
  }

  let raf = 0
  const onScroll = () => {
    if (!raf)
      raf = requestAnimationFrame(() => {
        raf = 0
        update()
      })
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll)
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(layout).observe(card)
  layout()
}
