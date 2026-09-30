/**
 * Editorial word-rise reveal (Resonance's text motion — replaces scrambles).
 *
 *   const h = rise(el('h2', 'hud-h2', undefined, stage), 'Built to be <em>heard.</em>')
 *   setRise(h, local > 0.1 && local < 0.4)   // each frame; cheap, idempotent
 *
 * Words slide up out of a clip with a slight stagger when `is-in` is set and
 * sink back when it's removed. Settles in ~0.6s; text is always exact.
 * `html` may contain <em>/<br>; other markup is stripped to text.
 */
export function rise<T extends HTMLElement>(node: T, html: string): T {
  node.classList.add('rise')
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  let i = 0
  const out: string[] = []
  const walk = (n: Node, wrapEm: boolean) => {
    if (n.nodeType === Node.TEXT_NODE) {
      const parts = (n.textContent ?? '').split(/(\s+)/)
      for (const p of parts) {
        if (!p) continue
        if (/^\s+$/.test(p)) out.push(' ')
        else {
          const w = p.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!)
          out.push(`<span class="rise-w" style="--i:${i++}"><span>${wrapEm ? `<em>${w}</em>` : w}</span></span>`)
        }
      }
    } else if (n.nodeName === 'BR') out.push('<br>')
    else n.childNodes.forEach(c => walk(c, wrapEm || n.nodeName === 'EM'))
  }
  tmp.childNodes.forEach(c => walk(c, false))
  node.innerHTML = out.join('')
  node.setAttribute('aria-label', tmp.textContent ?? '')
  return node
}

/** Toggle a rise() element in/out (no-op when unchanged). */
export function setRise(node: HTMLElement, on: boolean) {
  if (node.classList.contains('is-in') !== on) node.classList.toggle('is-in', on)
}
