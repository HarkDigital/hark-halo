import { NA, P, WHITE, rgba, strike } from '../../scenes/kit'
import type { Builder } from '../picture'
import { TAU, breath, clamp01, drawMotes, glint, hash, motes, span, wash, type Mote } from './lib'

/*
 * Hours: THE HOURGLASS RUNS BACK (../PICTURES.md). One hourglass of dark
 * glass standing right of centre, its sand lit green and running the wrong
 * way: up from the lower bulb, through the waist, into the upper. Hours
 * coming back. Illustrative: it counts nothing; the heaps are fixed shapes,
 * the stream never stops and the lower heap never empties. "Hours" strikes
 * as the first grain crosses the waist upward. Afterwards the heaps breathe,
 * the waist glows with every grain, dust drifts in the light, and the hand
 * glints the glass and bends the stream a little.
 */
const GRAIN = 40
export const sand: Builder<{ kind: 'sand' }> = () => {
  let cx = 0, cy = 0, G = 1
  let glass = new Path2D()
  let mound = new Path2D(), moundEdge = new Path2D()
  let cap = new Path2D(), capEdge = new Path2D()
  let yTop = 0, yBot = 1, yMound = 0, yCap = 0
  let narrow = false
  let grains = 0
  let dust: Mote[] = []
  let box: [number, number, number, number] = [0, 0, 1, 1]
  const seeds = Array.from({ length: GRAIN }, (_, i) => ({ u: hash(i * 5 + 1), v: 70 + 40 * hash(i * 5 + 2), ph: hash(i * 5 + 3), sw: hash(i * 5 + 4) * TAU, r: 1 + 0.6 * hash(i * 5 + 5) }))
  const T0 = 0.5 // seconds after the trigger the first grains lift off

  return {
    lead: [0, 0],
    dur: 2600,
    key: (_p, e) => e >= 0.5,
    init(w, h, env) {
      narrow = env.narrow
      cx = env.mode === 'wide' ? env.copyX + 0.52 * (w - env.copyX) : 0.5 * w
      cy = 0.5 * h
      G = narrow ? 0.76 * h : env.framed ? 0.74 * h : 0.66 * h
      yTop = cy - G / 2
      yBot = cy + G / 2
      const hw = 0.21 * G, bw = 0.3 * G, nw = 0.03 * G
      // the vessel: two bulbs as one outline, flat glass at top and bottom, a waist between
      glass = new Path2D()
      glass.moveTo(cx - hw, yTop)
      glass.lineTo(cx + hw, yTop)
      glass.bezierCurveTo(cx + bw, yTop + 0.2 * G, cx + nw, cy - 0.12 * G, cx + nw, cy)
      glass.bezierCurveTo(cx + nw, cy + 0.12 * G, cx + bw, yBot - 0.2 * G, cx + hw, yBot)
      glass.lineTo(cx - hw, yBot)
      glass.bezierCurveTo(cx - bw, yBot - 0.2 * G, cx - nw, cy + 0.12 * G, cx - nw, cy)
      glass.bezierCurveTo(cx - nw, cy - 0.12 * G, cx - bw, yTop + 0.2 * G, cx - hw, yTop)
      glass.closePath()
      // the resting heap in the lower bulb, and the thin cap of returned sand under the top plate
      yMound = yBot - 0.14 * G
      mound = new Path2D()
      mound.moveTo(cx - hw, yBot)
      mound.quadraticCurveTo(cx, yMound - 0.1 * G, cx + hw, yBot)
      mound.closePath()
      moundEdge = new Path2D()
      moundEdge.moveTo(cx - hw, yBot)
      moundEdge.quadraticCurveTo(cx, yMound - 0.1 * G, cx + hw, yBot)
      yCap = yTop + 0.1 * G
      cap = new Path2D()
      cap.moveTo(cx - hw, yTop)
      cap.quadraticCurveTo(cx, yCap + 0.07 * G, cx + hw, yTop)
      cap.closePath()
      capEdge = new Path2D()
      capEdge.moveTo(cx - hw, yTop)
      capEdge.quadraticCurveTo(cx, yCap + 0.07 * G, cx + hw, yTop)
      grains = narrow ? 18 : env.framed ? 24 : GRAIN
      box = [cx - 0.5 * G, yTop - 0.1 * G, cx + 0.5 * G, yBot + 0.1 * G]
      dust = narrow ? [] : motes(8, 7, box, [-3, 3], [-9, -5])
    },
    frame(pen, w, h, _p, e, t, pointer) {
      const { ctx, glow } = pen
      const warm = 0.1 + 0.06 * clamp01(e / 0.08)
      // the glass, a faint body, a cold highlight down each bulb's left side
      ctx.fillStyle = rgba(WHITE, 0.02)
      ctx.fill(glass)
      pen.glass(glass, warm, 3)
      for (const [y0, y1] of [
        [yTop + 0.06 * G, cy - 0.08 * G],
        [cy + 0.08 * G, yBot - 0.06 * G],
      ]) {
        ctx.strokeStyle = rgba(WHITE, 0.08)
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(cx - 0.19 * G, y0)
        ctx.lineTo(cx - 0.19 * G + 0.02 * G, y1)
        ctx.stroke()
      }
      // the hand on the glass: a glint on the nearer wall
      let near = 0
      if (pointer.inside) {
        const d = Math.hypot(Math.max(0, Math.abs(pointer.x - cx) - 0.21 * G), Math.max(0, Math.abs(pointer.y - cy) - G / 2))
        if (d < 160) near = 1 - d / 160
      }
      if (near > 0 && pointer.y > yTop && pointer.y < yBot) {
        const side = pointer.x < cx ? -1 : 1
        const s = Math.abs(pointer.y - cy) / (G / 2)
        const xw = cx + side * (0.03 * G + 0.18 * G * Math.pow(s, 0.6))
        glint(pen, xw, pointer.y - 28, xw, pointer.y + 28, 0.4 * near)
      }
      if (e <= 0.08) return
      // the lower heap lights from its base up (a reveal with a white-hot front), then breathes
      const reveal = span(0.08, 0.3, e)
      const hb = breath(t, 4.8, 0.07)
      const heapOn = reveal >= 1 ? hb : reveal
      ctx.save()
      ctx.beginPath()
      ctx.rect(cx - 0.3 * G, yBot - (yBot - (yMound - 0.1 * G)) * reveal - 2, 0.6 * G, G)
      ctx.clip()
      ctx.fillStyle = rgba(NA, 0.18 * heapOn)
      ctx.fill(mound)
      ctx.restore()
      glow.fillStyle = rgba(NA, 0.3 * heapOn * reveal)
      glow.fill(mound)
      if (reveal < 1) {
        const yf = yBot - (yBot - (yMound - 0.1 * G)) * reveal
        pen.neon(P.line(cx - 0.21 * G, yf, cx + 0.21 * G, yf), NA, 0.9, 1.4)
      } else {
        const edgeOn = (e < 0.46 ? Math.max(0.4, strike((e - 0.3) * 2.6, 2)) : 1) * hb * (hash(Math.floor(30 * t)) < 0.004 ? 0.6 : 1)
        pen.neon(moundEdge, NA, edgeOn * (1 + 0.3 * (near > 0 && pointer.y > yMound - 0.1 * G ? near : 0)), 1.6)
      }
      // the stream: grains rising from the mound, through the waist, into the upper bulb
      const ts = t - 0.25 - T0
      const len = yMound - 0.04 * G - (yTop + 0.02 * G)
      let waist = 0
      let capFill = 0
      if (ts > 0) {
        ctx.beginPath()
        const bright: [number, number, number][] = []
        for (let i = 0; i < grains; i++) {
          const g = seeds[i]
          let s = (ts * g.v) / len - g.ph * 1.6
          if (s < 0) continue
          capFill = Math.max(capFill, Math.min(1, s))
          s = s % 1
          const spread = s < 0.5 ? 0.09 * G - (0.09 * G - 0.01 * G) * (s / 0.5) : 0.01 * G + (0.11 * G - 0.01 * G) * ((s - 0.5) / 0.5)
          let x = cx + (g.u - 0.5) * 2 * spread + 1.5 * Math.sin(2 * t + g.sw)
          // the stream bends a little toward the hand above the waist (light only)
          if (near > 0 && s > 0.5) x += (pointer.x > cx ? 1 : -1) * 4 * near * (s - 0.5) * 2
          const y = yMound - 0.04 * G - s * len
          waist += Math.max(0, 1 - Math.abs(s - 0.5) * 20)
          if (bright.length < 6) bright.push([x, y, g.r])
          else {
            ctx.moveTo(x + g.r, y)
            ctx.arc(x, y, g.r, 0, TAU)
          }
        }
        ctx.fillStyle = rgba(WHITE, 0.85)
        ctx.fill()
        for (const [x, y, r] of bright) pen.fill(P.circle(x, y, r), NA, 1)
      }
      // the waist glows with each grain passing; the first crossing is the key moment
      if (e >= 0.5) {
        const age = (e - 0.5) * 2.6
        const flare = Math.max(0, 1 - age / 0.3)
        pen.fill(P.circle(cx, cy, 2 + 4 * flare), WHITE, 0.6 * flare + 0.3 * Math.min(1, waist))
        wash(pen, NA, cx, cy, 30, 30, 0.6 * flare + 0.25 * Math.min(1, waist))
      }
      // the cap of returned sand under the top plate grows with the first grains and then rests
      if (capFill > 0) {
        const cf = Math.min(1, capFill) * (reveal >= 1 ? hb : 1)
        ctx.save()
        ctx.beginPath()
        ctx.rect(cx - 0.3 * G, yTop, 0.6 * G, (yCap + 0.07 * G - yTop) * cf)
        ctx.clip()
        ctx.fillStyle = rgba(NA, 0.16)
        ctx.fill(cap)
        ctx.restore()
        glow.fillStyle = rgba(NA, 0.25 * cf)
        glow.fill(cap)
        pen.neon(capEdge, NA, 0.8 * cf, 1.4)
      }
      // the room's light and the dust in it
      const lit = Math.min(1, reveal) * hb
      wash(pen, NA, cx, cy, narrow ? 0.48 * w : 0.42 * w, 0.5 * h, (narrow ? 0.06 : 0.055) * lit)
      if (dust.length) drawMotes(pen, dust, t, box, lit, 4)
      void w, void h
    },
  }
}
