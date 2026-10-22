import { NA, NB, NC, P, rgba, strike, type Scene } from '../../service/scenes/kit'

interface Beam {
  /** which floor it is (0 the ground floor's ceiling) */
  k: number
  /** when it was set (t), for its strike */
  at: number
}
interface Loose {
  x: number
  y: number
  vy: number
  age: number
}

const FLOORS = 7
const clamp = (x: number, a = 0, b = 1) => (x < a ? a : x > b ? b : x)
const smooth = (x: number) => {
  x = clamp(x)
  return x * x * (3 - 2 * x)
}
/** the crane's round: fetch a girder from the pile, lift, carry it over the frame, lower, set */
type Phase = 'fetch' | 'lift' | 'carry' | 'lower' | 'set' | 'topped'

/*
 * CONSTRUCTION & TRADES — the frame going up. A building's steel frame rises
 * from the ground floor by floor beside a tower crane: the crane's trolley
 * runs out along the jib to a pile of girders, the hook drops and lifts one,
 * carries it back over the frame and lowers it onto the columns, and the new
 * beam strikes on in the lead colour as its floor's columns rise to meet the
 * next. A beacon blinks on the mast. When the frame tops out it holds, lit,
 * then clears for the next build. The cursor takes the crane: the hook runs
 * out and in along the jib under the hand and the girder hangs from it, up
 * or down as the hand is; let go (leave the art, or lift a touch) and the
 * girder drops where it is: over the frame it is the next beam, off it it
 * falls to the ground.
 */
export function crane(): Scene {
  let beams: Beam[] = []
  let loose: Loose[] = []
  let ground = 0, bx = 0, bw = 0, fh = 0, mast = 0, jibY = 0, jibL = 0, jibR = 0, pileX = 0, G = 0
  let phase: Phase = 'fetch'
  let trolley = 0, hook = 0 // the trolley's x and the hook's y
  let carrying = false
  let wasHand = false
  let hold = 0
  let fade = 1
  let topped = 0
  const nextY = () => ground - (beams.length + 1) * fh
  const slotX = () => bx + bw / 2
  const flash = { x: 0, y: 0, age: 9 }

  return {
    init(w, h, framed) {
      const side = !framed && w > 600
      ground = h * (framed ? 0.84 : 0.82)
      G = Math.min(w, h) * (framed ? 0.46 : side ? 0.48 : 0.42)
      bw = G * 0.6
      fh = G * 0.105
      bx = w * (framed ? 0.5 : side ? 0.52 : 0.5) - bw * (side ? 0.6 : 0.75)
      mast = bx + bw + G * 0.2
      jibY = ground - fh * (FLOORS + 2.1)
      jibL = mast - bw * 1.45
      jibR = mast + G * 0.42
      pileX = mast + G * 0.24
      beams = []
      loose = []
      // a build already under way
      for (let k = 0; k < 3; k++) beams.push({ k, at: -10 })
      phase = 'fetch'
      trolley = slotX()
      hook = jibY + fh * 2
      carrying = false
      wasHand = false
      hold = 0
      fade = 1
      topped = 0
      flash.age = 9
    },

    frame(pen, w, h, pointer, dt, t) {
      const { glow } = pen
      const hand = pointer.inside
      const beamLen = bw * 0.96
      const pileY = ground - G * 0.03
      let tx = trolley
      let ty = hook

      // ---- the crane's round, or the hand's
      if (hand && phase !== 'topped') {
        // the hand takes the trolley and the hook; it always has a girder on the hook
        carrying = true
        tx = clamp(pointer.x, jibL + beamLen * 0.4, jibR - beamLen * 0.3)
        ty = clamp(pointer.y, jibY + fh, ground - fh * 0.6)
        phase = 'carry'
      } else if (wasHand && carrying && phase !== 'topped') {
        // let go: the girder drops where it is
        const y = nextY()
        if (Math.abs(trolley - slotX()) < beamLen * 0.5 && hook < y + fh * 0.5) {
          hook = y
          phase = 'set'
        } else {
          loose.push({ x: trolley, y: hook, vy: 0, age: 0 })
          carrying = false
          phase = 'fetch'
        }
      }
      wasHand = hand
      if (!hand) {
        switch (phase) {
          case 'fetch':
            tx = pileX
            ty = pileY - fh * 0.5
            if (Math.abs(trolley - tx) < 2 && Math.abs(hook - ty) < 2) {
              hold += dt
              if (hold > 0.35) {
                carrying = true
                hold = 0
                phase = 'lift'
              }
            }
            break
          case 'lift':
            tx = pileX
            ty = jibY + fh * 1.4
            if (Math.abs(hook - ty) < 3) phase = 'carry'
            break
          case 'carry':
            tx = slotX()
            ty = jibY + fh * 1.4
            if (Math.abs(trolley - tx) < 2) phase = 'lower'
            break
          case 'lower':
            tx = slotX()
            ty = nextY()
            if (Math.abs(hook - ty) < 1.5) phase = 'set'
            break
          case 'set':
            tx = trolley
            ty = hook
            break
          case 'topped':
            tx = jibL + bw * 0.9
            ty = jibY + fh * 1.5
            break
        }
      }
      if (phase === 'set') {
        beams.push({ k: beams.length, at: t })
        flash.x = slotX()
        flash.y = hook
        flash.age = 0
        carrying = false
        if (beams.length >= FLOORS) {
          phase = 'topped'
          hold = 0
        } else phase = 'fetch'
      }
      if (phase === 'topped') {
        hold += dt
        topped = Math.min(1, topped + dt * 2)
        if (hold > 2.6) fade = Math.max(0, fade - dt * 1.2)
        if (fade <= 0) {
          beams = []
          fade = 1
          topped = 0
          phase = 'fetch'
        }
      }
      // the trolley runs out and in, the hook up and down, each at its own pace
      const vx = hand ? 9 : phase === 'carry' ? 2.2 : 3
      const vy = hand ? 9 : phase === 'lower' ? 2.4 : 3.2
      trolley += (tx - trolley) * Math.min(1, dt * vx)
      hook += (ty - hook) * Math.min(1, dt * vy)

      // ---- the ground and the site
      pen.glass(P.line(0, ground, w, ground), 0.3, 3)
      const hatch = new Path2D()
      for (let x = bx - G * 0.3; x < jibR; x += G * 0.06) {
        hatch.moveTo(x, ground + 2)
        hatch.lineTo(x - G * 0.03, ground + G * 0.035)
      }
      pen.glass(hatch, 0.12, 1.5)
      // the pile of girders waiting by the mast
      const pile = new Path2D()
      for (let i = 0; i < 3; i++) {
        const y = pileY - i * fh * 0.3
        pile.moveTo(pileX - beamLen * 0.5 + i * 3, y)
        pile.lineTo(pileX + beamLen * 0.5 - i * 3, y)
      }
      pen.glass(pile, 0.3, 4)

      // ---- the frame: each set beam's floor, its columns rising to the next
      const cols = new Path2D()
      const brace = new Path2D()
      const litCols = new Path2D()
      const n = beams.length
      for (let k = 0; k <= n; k++) {
        const y0 = ground - k * fh
        const y1 = y0 - fh
        const grown = k < n ? 1 : phase === 'topped' ? 0 : clamp(1 - (ground - (k + 1) * fh - hook) / fh) * (carrying ? 1 : 0)
        if (grown <= 0.01) continue
        for (const x of [bx, bx + bw * 0.5, bx + bw]) {
          const into = k < n ? litCols : cols
          into.moveTo(x, y0)
          into.lineTo(x, y0 + (y1 - y0) * grown)
        }
        if (k < n) {
          brace.moveTo(bx, y0)
          brace.lineTo(bx + bw * 0.5, y1)
          brace.moveTo(bx + bw, y0)
          brace.lineTo(bx + bw * 0.5, y1)
        }
      }
      pen.glass(cols, 0.3 * fade, 4)
      pen.glass(litCols, 0.34 * fade, 4)
      pen.neon(litCols, NA, 0.18 * fade, 1.4)
      pen.glass(brace, 0.14 * fade, 2)
      for (const b of beams) {
        const y = ground - (b.k + 1) * fh
        const on = (b.at < 0 ? 1 : strike(t - b.at, b.k)) * fade
        const p = P.line(bx + bw * 0.02, y, bx + bw * 0.98, y)
        pen.glass(p, 0.3 * fade, 6)
        pen.neon(p, NA, (0.55 + (b.k === n - 1 ? 0.4 : 0)) * on, 2.2)
        // floor plates: a faint wash between the columns
        pen.wash(P.rect(bx, y, bw, fh), NA, 0.012 * on)
      }
      // the slab on the ground
      pen.neon(P.line(bx - G * 0.02, ground, bx + bw + G * 0.02, ground), NA, 0.3 * fade, 2)
      // the next beam's slot, marked
      if (phase !== 'topped' && n < FLOORS) {
        const y = nextY()
        pen.dash([4, 6])
        pen.glass(P.line(bx, y, bx + bw, y), 0.22, 1.5)
        pen.dash([])
      }
      // topped out: a flare over the whole frame
      if (topped > 0) {
        const top = ground - n * fh
        pen.neon(P.rect(bx, top, bw, n * fh), NA, 0.35 * topped * fade, 1.2)
        const g = glow.createRadialGradient(bx + bw / 2, top, 0, bx + bw / 2, top, G * 0.5)
        g.addColorStop(0, rgba(NA, 0.3 * topped * fade))
        g.addColorStop(1, rgba(NA, 0))
        glow.fillStyle = g
        glow.fillRect(bx - G * 0.3, top - G * 0.5, bw + G * 0.6, G)
      }

      // ---- the crane: a lattice mast, the jib and its counter-jib, the trolley, cable and hook
      const mw = G * 0.04
      const lattice = new Path2D()
      lattice.moveTo(mast - mw, ground)
      lattice.lineTo(mast - mw, jibY)
      lattice.moveTo(mast + mw, ground)
      lattice.lineTo(mast + mw, jibY)
      for (let y = ground; y > jibY + mw; y -= mw * 1.6) {
        lattice.moveTo(mast - mw, y)
        lattice.lineTo(mast + mw, y - mw * 1.6)
      }
      pen.glass(lattice, 0.3, 2.2)
      // the jib: a long boom with its lattice, the counter-jib and its weight, the tie bars
      const jib = new Path2D()
      jib.moveTo(jibL, jibY)
      jib.lineTo(jibR, jibY)
      jib.moveTo(jibL, jibY - mw)
      jib.lineTo(jibR, jibY - mw)
      for (let x = jibL; x < jibR - mw; x += mw * 1.5) {
        jib.moveTo(x, jibY)
        jib.lineTo(x + mw * 1.5, jibY - mw)
      }
      pen.glass(jib, 0.32, 2.2)
      const apex = jibY - G * 0.12
      const ties = new Path2D()
      ties.moveTo(mast, apex)
      ties.lineTo(jibL + (jibR - jibL) * 0.12, jibY - mw)
      ties.moveTo(mast, apex)
      ties.lineTo(jibR - (jibR - jibL) * 0.08, jibY - mw)
      ties.moveTo(mast, jibY - mw)
      ties.lineTo(mast, apex)
      pen.glass(ties, 0.22, 1.5)
      // the counterweight at the far right, the cab at the mast
      pen.glass(P.rect(jibR - G * 0.09, jibY, G * 0.08, mw * 1.6), 0.3, 2)
      pen.glass(P.rrect(mast - mw * 1.6, jibY + mw * 0.4, mw * 3.2, mw * 2, 2), 0.34, 2)
      pen.fill(P.rect(mast - mw * 1.2, jibY + mw * 0.7, mw * 2.4, mw * 0.9), NC, 0.35)
      // the beacon blinking at the apex
      pen.fill(P.circle(mast, apex, Math.max(2, G * 0.012)), NB, 0.2 + 0.8 * (Math.sin(t * 2.4) > 0.3 ? 1 : 0))
      // the trolley, the cable and the hook
      pen.fill(P.rect(trolley - mw * 0.9, jibY - mw * 0.2, mw * 1.8, mw * 1.2), NB, 0.9)
      pen.glass(P.line(trolley, jibY + mw, trolley, hook - fh * 0.3), 0.4, 1.2)
      const hk = P.arc(trolley, hook - fh * 0.12, fh * 0.14, Math.PI * 1.2, Math.PI * 2.3)
      pen.glass(hk, 0.5, 2)
      pen.neon(hk, NB, 0.45, 1)
      // the girder on the hook
      if (carrying) {
        const sl = new Path2D()
        sl.moveTo(trolley, hook - fh * 0.3)
        sl.lineTo(trolley - beamLen * 0.5, hook)
        sl.moveTo(trolley, hook - fh * 0.3)
        sl.lineTo(trolley + beamLen * 0.5, hook)
        pen.glass(sl, 0.3, 1.2)
        const g = P.line(trolley - beamLen * 0.5, hook, trolley + beamLen * 0.5, hook)
        pen.glass(g, 0.4, 6)
        const overSlot = Math.abs(trolley - slotX()) < beamLen * 0.5 ? 1 : 0
        pen.neon(g, NA, 0.25 + overSlot * 0.35, 2)
      }
      // girders let fall off the frame
      loose = loose.filter(l => l.age < 1.6)
      for (const l of loose) {
        l.age += dt
        if (l.y < pileY) {
          l.vy += G * 6 * dt
          l.y = Math.min(pileY, l.y + l.vy * dt)
        }
        const a = 1 - l.age / 1.6
        pen.glass(P.line(l.x - beamLen * 0.5, l.y, l.x + beamLen * 0.5, l.y), 0.4 * a, 6)
        pen.neon(P.line(l.x - beamLen * 0.5, l.y, l.x + beamLen * 0.5, l.y), NC, 0.4 * a, 1.6)
      }
      // a beam setting: a flash at the joints
      if (flash.age < 0.6) {
        flash.age += dt
        const a = 1 - flash.age / 0.6
        for (const x of [bx, bx + bw * 0.5, bx + bw]) pen.neon(P.circle(x, flash.y, 3 + flash.age * 30), NA, a * 0.8, 1.4)
      }

      // ---- the night: the frame's light on the ground
      const g = glow.createRadialGradient(bx + bw / 2, ground, 0, bx + bw / 2, ground, G * 0.6)
      g.addColorStop(0, rgba(NA, (0.04 + 0.01 * n) * fade))
      g.addColorStop(1, rgba(NA, 0))
      glow.fillStyle = g
      glow.fillRect(bx - G * 0.4, ground - G * 0.6, bw + G * 0.8, G * 0.7)
    },
  }
}
