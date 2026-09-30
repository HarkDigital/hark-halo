import * as THREE from 'three'
import type { CameraPose, Chapter, ChapterContext, Frame } from '../../core/types'
import { el, reveal, rise, setRise } from '../../core/dom'
import { clamp, ease, lerp, segment, smoothstep } from '../../core/math'
import { nextFrame } from '../../core/yield'
import { SECURITY } from '../../content'
import { G } from '../../kit/glass'
import { H, LOCK_C, W, buildSite, poseShackle, type SiteSet } from './scene'
import './shield.css'

/*
 * SHORT CIRCUIT — "Hacked? Breathe."
 *
 * "Your site" is a neon sign in clear glass tubes: a browser window with a
 * big padlock, three lines of text and a button on its page, glowing in the
 * lights' colours in a black room. Then someone picks the lock.
 *
 *   0.00–0.08  IN       the sign at rest. The eyebrow and "Hacked?" from 0.06.
 *   0.08–0.26  BREACH   the padlock's shackle springs open; red (the only red
 *                       on the site) gets in at the keyhole and runs through
 *                       every tube, nearest first; the frame stutters, lines of
 *                       the page and its button short out, the picture glitches.
 *   0.28–0.40  HOLD     "Breathe." + the body over the infected sign (the 0.33
 *                       landing: the whole problem in one frame).
 *   0.40–0.74  THE FIX  the four steps, each ticked off in the list as the sign
 *                       does it:
 *              01 FIND     a white scan line sweeps the window and four
 *                          targeting corners close in on the padlock
 *              02 CLEAN    a white-hot purge chases the red back through every
 *                          tube (the farthest first) and out at the keyhole
 *              03 RESTORE  the dead lines strike back on, one by one
 *              04 LOCK     the shackle snaps shut; a ring of light
 *   0.74–0.95  STEADY   the four steps done, the emergency CTA (anchor 0.84)
 *
 * Everything derives from `local`; frame.time only adds the infected tubes'
 * uneven buzz (slow dips, never a strobe).
 */

const T = {
  strike: 0.08,
  breathe: 0.28,
  handoff: 0.4,
  find0: 0.4,
  scan1: 0.47,
  lockOn: 0.49,
  clean0: 0.49,
  clean1: 0.6,
  restore0: 0.6,
  lock0: 0.67,
  lock1: 0.74,
  out: 0.95,
}
/** each step's stretch of the fix */
const STEPS: [number, number][] = [
  [T.find0, T.clean0],
  [T.clean0, T.restore0],
  [T.restore0, T.lock0],
  [T.lock0, T.lock1],
]

const RED = new THREE.Color(G.ember)
const COOL = new THREE.Color(G.ice)
const SLOT = [new THREE.Color(G.neonA), new THREE.Color(G.neonB), new THREE.Color(G.neonC)]

// ------------------------------------------------------------------ camera

interface Layout {
  w: number
  h: number
  top: number
  bottom: number
  gutter: number
  copyRight: number
  copyTop: number
  ok: boolean
}
interface Region {
  cx: number
  cy: number
  fw: number
  fh: number
}
interface Key {
  l: number
  yaw: number
  pitch: number
  fill: number
  /** subject centre offset (world) */
  s: [number, number, number]
}

const KEYS: Key[] = [
  { l: 0.0, yaw: -0.5, pitch: 0.08, fill: 0.84, s: [0, 0, 0] },
  { l: T.strike, yaw: -0.44, pitch: 0.07, fill: 0.88, s: [-0.1, -0.04, 0] },
  // lean in toward the padlock while the red runs out of it; hold it through the landing
  { l: 0.24, yaw: -0.36, pitch: 0.06, fill: 1.0, s: [-0.36, -0.14, 0] },
  { l: T.handoff, yaw: -0.38, pitch: 0.06, fill: 1.0, s: [-0.3, -0.12, 0] },
  // ease back to the whole sign for the fix
  { l: T.clean1, yaw: -0.46, pitch: 0.07, fill: 0.9, s: [0, 0, 0] },
  { l: T.lock1, yaw: -0.4, pitch: 0.07, fill: 0.9, s: [0, 0, 0] },
  { l: 1.0, yaw: -0.3, pitch: 0.06, fill: 0.9, s: [0, 0, 0] },
]
const KEYS_TALL: Key[] = [
  { l: 0.0, yaw: -0.34, pitch: 0.07, fill: 0.9, s: [0, 0, 0] },
  { l: T.strike, yaw: -0.3, pitch: 0.06, fill: 0.92, s: [-0.06, -0.03, 0] },
  { l: 0.24, yaw: -0.24, pitch: 0.05, fill: 1.0, s: [-0.28, -0.12, 0] },
  { l: T.handoff, yaw: -0.26, pitch: 0.05, fill: 1.0, s: [-0.24, -0.1, 0] },
  { l: T.clean1, yaw: -0.32, pitch: 0.06, fill: 0.94, s: [0, 0, 0] },
  { l: T.lock1, yaw: -0.28, pitch: 0.06, fill: 0.94, s: [0, 0, 0] },
  { l: 1.0, yaw: -0.2, pitch: 0.05, fill: 0.94, s: [0, 0, 0] },
]
/** the studio turn: strips glide along the glass tubes */
const TURN: [number, number][] = [
  [0.0, 0.3],
  [T.strike, 0.15],
  [0.3, -0.1],
  [T.clean0, 0.1],
  [T.lock0, 1.0],
  [0.8, 0.9],
  [1.0, 0.8],
]
function envTurn(l: number) {
  for (let i = 0; i < TURN.length - 1; i++) {
    const [a, va] = TURN[i]
    const [b, vb] = TURN[i + 1]
    if (l <= b) return lerp(va, vb, ease.inOutCubic(segment(l, a, b)))
  }
  return TURN[TURN.length - 1][1]
}

const isTall = (frame: Frame) => frame.height > frame.width * 1.05
const window01 = (x: number, a: number, b: number, f: number) => smoothstep(a, a + f, x) * (1 - smoothstep(b - f, b, x))

function regionFor(L: Layout, frame: Frame, out: Region) {
  const w = L.ok ? L.w : frame.width
  const h = L.ok ? L.h : frame.height
  const tall = h > w * 1.05
  let x0 = L.gutter
  let x1 = w - L.gutter
  let y0 = L.top
  let y1 = h - L.bottom
  if (L.ok) {
    if (tall) y1 = Math.min(y1, L.copyTop - 18)
    else x0 = Math.max(x0, L.copyRight + 36)
  } else if (tall) y1 = h * 0.52
  else x0 = w * 0.42
  if (y1 - y0 < h * 0.22) y1 = y0 + h * 0.22
  if (x1 - x0 < w * 0.3) x0 = x1 - w * 0.3
  // the chrome sits in the top band: nudge the subject a touch lower on wide screens
  if (!tall) y0 += Math.min(20, h * 0.02)
  out.cx = (x0 + x1) / w - 1
  out.cy = 1 - (y0 + y1) / h
  out.fw = (x1 - x0) / w
  out.fh = (y1 - y0) / h
}

const _r: Region = { cx: 0, cy: 0, fw: 1, fh: 1 }
const _dir = new THREE.Vector3()
const _fwd = new THREE.Vector3()
const _right = new THREE.Vector3()
const _up = new THREE.Vector3()
const _Y = new THREE.Vector3(0, 1, 0)

function solvePose(l: number, frame: Frame, L: Layout, out: CameraPose): Region {
  const keys = isTall(frame) ? KEYS_TALL : KEYS
  let k = 0
  while (k < keys.length - 2 && l > keys[k + 1].l) k++
  const a = keys[k]
  const b = keys[k + 1]
  const t = ease.inOutCubic(segment(l, a.l, b.l))
  regionFor(L, frame, _r)
  const yaw = lerp(a.yaw, b.yaw, t)
  const pitch = lerp(a.pitch, b.pitch, t)
  const fill = lerp(a.fill, b.fill, t)
  const sx = lerp(a.s[0], b.s[0], t)
  const sy = lerp(a.s[1], b.s[1], t)
  const sz = lerp(a.s[2], b.s[2], t)
  const fov = isTall(frame) ? 34 : 28
  const aspect = frame.width / Math.max(1, frame.height)
  const tanV = Math.tan(THREE.MathUtils.degToRad(fov / 2))
  const tanX = tanV * aspect
  // the sign seen at an angle is narrower on screen: frame its projected width
  const sw = W * Math.cos(yaw) + (isTall(frame) ? 0.22 : 0.5)
  const sh = H + 0.34
  const D = Math.max(sw / (2 * tanX * _r.fw * fill), sh / (2 * tanV * _r.fh * fill))
  _dir.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch))
  _fwd.copy(_dir).negate()
  _right.crossVectors(_fwd, _Y).normalize()
  _up.crossVectors(_right, _fwd)
  out.position
    .set(sx, sy, sz)
    .addScaledVector(_dir, D)
    .addScaledVector(_right, -_r.cx * D * tanX)
    .addScaledVector(_up, -_r.cy * D * tanV)
  out.target.copy(out.position).addScaledVector(_fwd, D)
  out.fov = fov
  out.roll = 0
  out.parallax = frame.reducedMotion || frame.still ? 0 : 0.16
  return _r
}

// ------------------------------------------------------------------ chapter

export default function create(): Chapter {
  const group = new THREE.Group()
  let site: SiteSet | null = null
  let maxDist = 1

  // DOM
  let copyA: HTMLElement
  let eyebrow: HTMLElement
  let line1: HTMLElement
  let line2: HTMLElement
  let panel: HTMLElement
  let copyB: HTMLElement
  let fixTitle: HTMLElement
  const stepEls: HTMLElement[] = []
  const stepState: string[] = []
  const stepP: number[] = []
  let probe: HTMLElement

  const layout: Layout = { w: 1, h: 1, top: 90, bottom: 90, gutter: 32, copyRight: 0, copyTop: 0, ok: false }
  const scratch: CameraPose = { position: new THREE.Vector3(), target: new THREE.Vector3(), fov: 30, roll: 0, parallax: 0 }
  const tmpC = new THREE.Color()

  function measure(stage: HTMLElement) {
    const cs = getComputedStyle(probe)
    layout.w = stage.clientWidth || window.innerWidth
    layout.h = stage.clientHeight || window.innerHeight
    layout.top = parseFloat(cs.paddingTop) || 90
    layout.bottom = parseFloat(cs.paddingBottom) || 90
    layout.gutter = parseFloat(cs.paddingLeft) || 32
    layout.copyRight = Math.max(copyA.offsetLeft + copyA.offsetWidth, copyB.offsetLeft + copyB.offsetWidth)
    layout.copyTop = Math.min(copyA.offsetTop, copyB.offsetTop)
    layout.ok = layout.w > 0 && layout.h > 0 && copyA.offsetWidth > 0
  }

  return {
    id: 'shield',
    group,
    anchors: [0.84],

    async init(ctx: ChapterContext) {
      const stage = ctx.stage

      // ---------------- DOM (the visual layer; the accessible copy is srContent)
      copyA = el('div', 'sh-a', undefined, stage)
      eyebrow = el('p', 'hud-eyebrow sh-eyebrow', SECURITY.eyebrow, copyA)
      const h = el('h2', 'hud-title sh-title', undefined, copyA)
      line1 = rise(el('span', 'sh-line', undefined, h), 'Hacked?')
      line2 = rise(el('span', 'sh-line', undefined, h), '<em>Breathe.</em>')
      panel = el('div', 'hud-panel hud-panel--strong sh-panel', undefined, copyA)
      el('p', 'hud-body', SECURITY.body, panel)

      // the fix: the steps (unnumbered), ticked off as the sign does them, and the emergency CTA
      copyB = el('div', 'sh-b', undefined, stage)
      el('p', 'hud-eyebrow', SECURITY.fixEyebrow, copyB)
      fixTitle = rise(el('h2', 'hud-h2 sh-fix-title', undefined, copyB), SECURITY.fixTitle)
      const ol = el('ol', 'hud-panel hud-panel--strong sh-steps', undefined, copyB)
      SECURITY.steps.forEach(s => {
        const li = el('li', 'sh-step', undefined, ol)
        el('span', 'sh-step-t', s, li)
        const mark = el('span', 'sh-step-mark', undefined, li)
        mark.setAttribute('aria-hidden', 'true')
        stepEls.push(li)
        stepState.push('')
        stepP.push(-1)
      })
      const cta = el('a', 'hud-btn sh-cta', SECURITY.cta, copyB)
      cta.href = SECURITY.href

      probe = el('div', 'sh-probe', undefined, stage)
      reveal(copyA, 0)
      reveal(copyB, 0)
      reveal(panel, 0, 0)
      measure(stage)
      if (typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(() => measure(stage))
        ro.observe(stage)
        ro.observe(copyA)
        ro.observe(copyB)
      } else window.addEventListener('resize', () => measure(stage))

      // ---------------- the sign
      site = buildSite(rt => ctx.post.isFrameTarget(rt), ctx.mobile, ctx.world.envMap)
      maxDist = Math.max(...site.signs.map(s => s.dist), 0.5)
      group.add(site.root)
      await nextFrame()
    },

    update(l: number, frame: Frame, ctx: ChapterContext) {
      if (!site) return
      const s = site
      const calm = ctx.reducedMotion || !!frame.still
      const t = frame.time
      const wp = ctx.world.params
      const pp = ctx.post.params

      // ---------------- the lock: picked open on the strike, snapped shut at the end
      const picked = smoothstep(T.strike, T.strike + 0.045, l)
      const snap = smoothstep(T.lock0, T.lock0 + 0.03, l)
      poseShackle(s.shackle, picked * (1 - snap))
      // the strike: the sign jolts back and settles (scroll-driven; it holds)
      const hit = segment(l, T.strike, T.strike + 0.05)
      s.root.position.set(0, 0, calm || l < T.strike ? 0 : -0.06 * Math.sin(Math.PI * hit) * (1 - hit))

      // ---------------- the infection: in at the keyhole, through every tube (nearest first);
      // the purge chases it back out (farthest first)
      let threat = 0
      const restoreAt = (i: number) => T.restore0 + 0.012 + i * 0.016
      let dead = 0
      s.signs.forEach((g, i) => {
        const d = g.dist / maxDist
        const start = T.strike + 0.012 + d * 0.1
        const grow = ease.outQuad(segment(l, start, start + 0.07))
        const p0 = T.clean0 + 0.012 + (1 - d) * 0.06
        const purge = segment(l, p0, p0 + 0.05)
        const cover = Math.min(grow, 1 - ease.inOutQuad(purge))
        g.tube.infect.value.set(g.u0, cover * g.full, cover > 0 ? 1 : 0, Math.sin(Math.PI * purge) * 1.6)
        threat += cover
        // the tube's light: a stutter on the strike, an uneven buzz while infected (slow dips,
        // never a strobe), the page's lines and button short out until they're restored
        let on = 1
        if (l > T.strike && l < T.strike + 0.012) on = 0.15
        if (cover > 0 && !calm) {
          const buzz = Math.max(0, Math.sin(t * 2.3 + i * 1.7) * Math.sin(t * 1.3 + i * 0.9))
          on *= 1 - 0.45 * buzz * cover
        }
        if (g.dies) {
          const out = smoothstep(start + 0.02, start + 0.035, l)
          // back on with a single stutter
          const back = l - restoreAt(dead)
          const relit = back <= 0 ? 0 : back < 0.004 ? 0.8 : back < 0.009 ? 0.2 : smoothstep(0.009, 0.02, back)
          on *= 1 - out * (1 - relit)
          dead++
        }
        g.tube.on.value = on
        g.tube.k.main.tube = 3.0
        g.tube.k.main.glow = 0.3
        g.tube.k.trans.tube = 3.0
        g.tube.k.trans.glow = 0.34
      })
      threat /= s.signs.length
      // the glass walls take the tubes' light (red while it's in them)
      s.walls.forEach((w, i) => {
        w.uniforms.uColor.value.copy(SLOT[Math.min(2, i)]).lerp(RED, clamp(threat * 1.3))
        w.uniforms.uK.value = 0.4
      })
      s.glass.envMapIntensity = 1.0

      // ---------------- 01 FIND: the scan line, then the targeting corners close in on the lock
      const scanP = segment(l, T.find0, T.scan1)
      s.scanRoot.position.y = lerp(H / 2 - 0.16, -H / 2 + 0.16, ease.inOutCubic(scanP))
      s.scan.on.value = window01(l, T.find0, T.scan1, 0.012)
      s.scan.root.visible = s.scan.on.value > 0.001
      const home = ease.inOutCubic(segment(l, T.find0 + 0.02, T.lockOn))
      const cx = lerp(0, LOCK_C.x, home)
      const cy = lerp(0, LOCK_C.y, home)
      const hx = lerp(W / 2 + 0.08, 0.43, home)
      const hy = lerp(H / 2 + 0.08, 0.52, home)
      // locked on: two quick blinks (scroll-driven)
      const lk = segment(l, T.lockOn, T.lockOn + 0.02)
      const blink = lk > 0 && lk < 1 ? 1 + 0.9 * Math.max(0, Math.sin(lk * Math.PI * 4)) : 1
      const bOn = window01(l, T.find0 + 0.015, T.clean0 + 0.05, 0.015) * blink
      const corners: [number, number][] = [
        [cx - hx, cy + hy],
        [cx + hx, cy + hy],
        [cx + hx, cy - hy],
        [cx - hx, cy - hy],
      ]
      s.brackets.forEach((b, i) => {
        b.root.position.set(corners[i][0], corners[i][1], 0.09)
        b.tube.on.value = bOn
        b.tube.root.visible = bOn > 0.001
        b.tube.k.main.tube = 3.0
        b.tube.k.main.glow = 0.45
      })
      s.scan.k.main.tube = 3.0
      s.scan.k.main.glow = 0.5

      // ---------------- 04 LOCK: a ring of light as the shackle snaps home
      const rp = segment(l, T.lock0 + 0.012, T.lock0 + 0.06)
      s.ringRoot.scale.setScalar(lerp(0.32, 1.1, ease.outCubic(rp)))
      s.ring.on.value = rp > 0 && rp < 1 ? (1 - rp) * (1 - rp) * 2.2 : 0
      s.ring.root.visible = s.ring.on.value > 0.001
      s.ring.k.main.tube = 3.0
      s.ring.k.main.glow = 0.6

      // ---------------- the room: a halo behind the sign, red while the site is infected
      const reg = solvePose(l, frame, layout, scratch)
      const aspect = frame.width / Math.max(1, frame.height)
      wp.top = '#020203'
      wp.bottom = '#000000'
      wp.focus.set(reg.cx * aspect, reg.cy)
      wp.haloSize = clamp(reg.fh * 1.55, 0.8, 1.7)
      wp.halo = lerp(0.5, 0.85, threat) + 0.25 * s.ring.on.value
      wp.haloColor = tmpC.copy(COOL).lerp(RED, clamp(threat * 1.2))
      wp.slits = 0
      wp.slitAngle = 0
      wp.envTurn = envTurn(l)
      wp.env = 1
      wp.keyDir.set(-0.5, 0.8, 0.55)
      wp.key = 1.2
      wp.fill = 0.04

      // ---------------- post: the neon blooms; the picture glitches on the strike and
      // shivers now and then while the site is infected
      pp.vignette = 0.55
      pp.bloomStrength = 0.22
      pp.bloomRadius = 0.25
      pp.bloomThreshold = 1.6
      const shiver = calm ? 0 : Math.max(0, Math.sin(t * 1.7) * Math.sin(t * 5.3) - 0.55) * 0.9 * threat
      pp.glitch = 0.85 * window01(l, T.strike, T.strike + 0.04, 0.008) + shiver

      // ---------------- DOM
      const inA = smoothstep(0.055, 0.075, l) * (1 - smoothstep(T.handoff - 0.02, T.handoff, l))
      reveal(copyA, inA)
      setRise(line1, l > 0.058 && l < T.handoff)
      setRise(line2, l > T.breathe && l < T.handoff)
      reveal(panel, smoothstep(T.breathe, T.breathe + 0.03, l), 0)
      reveal(eyebrow, 1, 0)
      const inB = smoothstep(T.handoff - 0.004, T.handoff + 0.016, l) * (1 - smoothstep(T.out, T.out + 0.02, l))
      reveal(copyB, inB)
      setRise(fixTitle, l > T.handoff && l < T.out + 0.01)
      for (let i = 0; i < stepEls.length; i++) {
        const [a, b] = STEPS[i]
        const st = l >= b ? 'is-done' : l >= a ? 'is-on' : ''
        if (st !== stepState[i]) {
          stepEls[i].classList.remove('is-on', 'is-done')
          if (st) stepEls[i].classList.add(st)
          stepState[i] = st
        }
        // (written only when it changes: no per-frame style writes once it's done)
        const p = Math.round(segment(l, a, b) * 200) / 200
        if (p !== stepP[i]) {
          stepP[i] = p
          stepEls[i].style.setProperty('--p', String(p))
        }
      }
    },

    camera(l: number, frame: Frame, out: CameraPose) {
      solvePose(l, frame, layout, out)
    },
  }
}

