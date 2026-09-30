import { NA, NB, NC, P, WHITE, type Scene } from './kit'

interface Threat {
  x: number
  y: number
  vx: number
  vy: number
  incoming: boolean
  life: number
}
interface Spark {
  x: number
  y: number
  age: number
}

/*
 * SECURITY — a shielded core under a glass dome. Two counter-rotating rings
 * of neon arcs guard the brand diamond; threats (streaks in the third
 * colour) come in from the edges and glance off the perimeter in a flash,
 * and the shield flares with each hit. Move the cursor to launch your own.
 */
export function shield(): Scene {
  let threats: Threat[] = []
  let sparks: Spark[] = []
  let spawnAcc = 0
  let lastPointerSpawn = 0
  let hit = 0

  const spawn = (w: number, h: number, cx: number, cy: number, fromX?: number, fromY?: number) => {
    const edge = Math.floor(Math.random() * 4)
    const x = fromX ?? (edge === 0 ? -10 : edge === 1 ? w + 10 : Math.random() * w)
    const y = fromY ?? (edge === 2 ? -10 : edge === 3 ? h + 10 : Math.random() * h)
    const d = Math.hypot(cx - x, cy - y) || 1
    const speed = 90 + Math.random() * 110
    threats.push({ x, y, vx: ((cx - x) / d) * speed, vy: ((cy - y) / d) * speed, incoming: true, life: 1 })
  }

  return {
    init(w, h) {
      threats = []
      sparks = []
      for (let i = 0; i < 5; i++) spawn(w, h, w / 2, h / 2)
    },

    frame(pen, w, h, pointer, dt, t) {
      const cx = w / 2
      const cy = h / 2
      const Rs = Math.min(w, h) * 0.22

      spawnAcc += dt
      if (spawnAcc > 0.7 && threats.length < 26) {
        spawnAcc = 0
        spawn(w, h, cx, cy)
      }
      if (pointer.inside && t - lastPointerSpawn > 0.5 && Math.hypot(pointer.x - cx, pointer.y - cy) > Rs * 1.6) {
        spawn(w, h, cx, cy, pointer.x, pointer.y)
        lastPointerSpawn = t
      }
      hit = Math.max(0, hit - dt * 2.5)

      // the dome, and the two counter-rotating rings of arcs
      pen.glass(P.circle(cx, cy, Rs * 1.42), 0.16, 10)
      for (const [r, dir, n, c] of [
        [Rs, 1, 5, NA],
        [Rs * 1.18, -1, 3, NB],
      ] as const) {
        const ring = new Path2D()
        for (let i = 0; i < n; i++) {
          const a0 = ((Math.PI * 2) / n) * i + t * 0.7 * dir
          ring.moveTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r)
          ring.arc(cx, cy, r, a0, a0 + (Math.PI * 2) / n - 0.5)
        }
        pen.tube(ring, c, 0.72 + hit * 0.28, 2)
      }

      // the core: the brand diamond
      const pulse = 11 + Math.sin(t * 2.2) * 1.8
      pen.fill(P.diamond(cx, cy, pulse), NA, 1)
      pen.neon(P.diamond(cx, cy, pulse + 14), NA, 0.35 + hit * 0.4, 1.2)

      // threats
      threats = threats.filter(th => th.life > 0)
      for (const th of threats) {
        th.x += th.vx * dt
        th.y += th.vy * dt
        if (th.incoming) {
          const d = Math.hypot(th.x - cx, th.y - cy)
          if (d <= Rs) {
            // deflect: reflect off the circle's normal
            const nx = (th.x - cx) / d
            const ny = (th.y - cy) / d
            const dot = th.vx * nx + th.vy * ny
            th.vx = (th.vx - 2 * dot * nx) * 0.75
            th.vy = (th.vy - 2 * dot * ny) * 0.75
            th.incoming = false
            sparks.push({ x: th.x, y: th.y, age: 0 })
            hit = 1
          }
        } else th.life -= dt * 0.8
        const x0 = th.x - th.vx * 0.1
        const y0 = th.y - th.vy * 0.1
        if (th.incoming) pen.streak(x0, y0, th.x, th.y, NC, 0.95, 1.8)
        else pen.streak(x0, y0, th.x, th.y, WHITE, th.life * 0.35, 1.4)
      }

      // impact flashes
      sparks = sparks.filter(s => s.age < 0.6)
      for (const s of sparks) {
        s.age += dt
        const p = s.age / 0.6
        pen.neon(P.circle(s.x, s.y, 2 + p * 26), NA, (1 - p) * 0.9, 1.5)
      }
    },
  }
}
