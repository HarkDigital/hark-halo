import { NA, NB, NC, P, WHITE, rgba, type Scene } from './kit'

interface Cell {
  x: number
  y: number
  corrupt: boolean
  cleanFlash: number
  seed: number
}

/*
 * HACK REMEDIATION — a corrupted grid being swept clean. Infected cells are
 * broken neon, buzzing and split (the third colour, a ghost in the second);
 * a neon scanline in a glass tube sweeps across and each cell it passes
 * flashes clean in the lead colour. Hover to clean cells yourself.
 */
export function glitch(): Scene {
  let cells: Cell[] = []
  let gap = 26

  return {
    init(w, h) {
      gap = Math.max(22, Math.min(w, h) / 24)
      const cols = Math.ceil(w / gap)
      const rows = Math.ceil(h / gap)
      cells = []
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          cells.push({
            x: c * gap + gap / 2,
            y: r * gap + gap / 2,
            corrupt: Math.random() < 0.18,
            cleanFlash: 0,
            seed: Math.random() * 100,
          })
        }
      }
    },

    frame(pen, w, h, pointer, dt, t) {
      const SWEEP = 11 // seconds per pass
      const scanX = ((t % SWEEP) / SWEEP) * (w + 160) - 80

      const dots = new Path2D()
      for (const cell of cells) {
        // the scanline disinfects
        if (cell.corrupt && Math.abs(cell.x - scanX) < gap) {
          cell.corrupt = false
          cell.cleanFlash = 1
        }
        // so does the cursor
        if (cell.corrupt && pointer.inside) {
          const d2 = (cell.x - pointer.x) ** 2 + (cell.y - pointer.y) ** 2
          if (d2 < 64 * 64) {
            cell.corrupt = false
            cell.cleanFlash = 1
          }
        }
        // reinfection far behind the scanline keeps the loop alive
        if (!cell.corrupt && cell.cleanFlash <= 0 && Math.random() < dt * 0.006) {
          const behind = scanX - cell.x
          if (behind > w * 0.3 || behind < -gap * 2) cell.corrupt = true
        }

        if (cell.corrupt) {
          // broken neon: buzzing, flickering, knocked sideways
          const flick = Math.sin(t * 17 + cell.seed * 9)
          if (flick > -0.4) {
            const off = Math.sin(t * 23 + cell.seed) * 4
            const s = gap * 0.52
            pen.box(cell.x - s / 2 + off, cell.y - s / 2, s, s * 0.34, NC, 0.3 + Math.abs(flick) * 0.6)
            pen.box(cell.x - s / 2 - off, cell.y - s * 0.02, s * 0.8, s * 0.2, NB, 0.22)
          }
        } else if (cell.cleanFlash > 0) {
          const s = 3 + cell.cleanFlash * 4
          pen.fill(P.rect(cell.x - s / 2, cell.y - s / 2, s, s), NA, cell.cleanFlash * 0.9)
          cell.cleanFlash = Math.max(0, cell.cleanFlash - dt * 1.1)
        } else dots.rect(cell.x - 1, cell.y - 1, 2, 2)
      }
      pen.ctx.fillStyle = rgba(WHITE, 0.14)
      pen.ctx.fill(dots)

      // the scanline: a wash of light behind a neon tube
      for (const [k, a] of [
        [pen.ctx, 0.12],
        [pen.glow, 0.2],
      ] as const) {
        const g = k.createLinearGradient(scanX - 90, 0, scanX, 0)
        g.addColorStop(0, rgba(NA, 0))
        g.addColorStop(1, rgba(NA, a))
        k.fillStyle = g
        k.fillRect(scanX - 90, 0, 90, h)
      }
      pen.tube(P.line(scanX, 0, scanX, h), NA, 0.95, 2.2)
    },
  }
}
