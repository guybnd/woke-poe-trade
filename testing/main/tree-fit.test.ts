import fs from 'fs'
import path from 'path'
import { describe, it, expect } from 'vitest'
import { PNG } from 'pngjs'
import { fitTree, litProbes, readScreen } from '../../main/src/woke/tree-fit'

const tree = JSON.parse(fs.readFileSync(path.join(__dirname, '../../renderer/public/data/tree/passive-tree.json'), 'utf8'))
const R: Record<string, number> = { small: 34, notable: 54, key: 82, jewel: 54, mastery: 70, start: 40 }
const rows = tree.nodes.filter((r: unknown[]) => R[r[3] as string])
const pts = {
  x: Float32Array.from(rows.map((r: number[]) => r[1])),
  y: Float32Array.from(rows.map((r: number[]) => r[2])),
  r: Float32Array.from(rows.map((r: unknown[]) => R[r[3] as string]))
}

const W = 2560
const H = 1440

const SCREENS = path.join(__dirname, '../fixtures/screens')

function bgra (file: string): { px: Uint8Array, width: number, height: number } {
  const png = PNG.sync.read(fs.readFileSync(path.join(SCREENS, file)))
  const px = new Uint8Array(png.data)
  for (let i = 0; i < px.length; i += 4) { const t = px[i]; px[i] = px[i + 2]; px[i + 2] = t }
  return { px, width: png.width, height: png.height }
}

describe('passive tree fit', () => {
  it.each(['zoomed-in', 'zoomed-out'])('lines up with the real tree, %s', (name) => {
    const want = JSON.parse(fs.readFileSync(path.join(SCREENS, `passive-tree-real-${name}.json`), 'utf8'))
    const { px, width, height } = bgra(`passive-tree-real-${name}.png`)
    const fit = fitTree(readScreen(px, width, height), pts)
    expect(fit).not.toBeNull()
    expect(Math.abs(fit!.zoom / want.zoom - 1)).toBeLessThan(0.004)
    // Every node on screen lands within 5 px of where it really is (frames
    // are 25 to 60 px across zoomed in).
    let worst = 0
    for (let i = 0; i < pts.x.length; i++) {
      const x = pts.x[i] * want.zoom + want.ox
      const y = pts.y[i] * want.zoom + want.oy
      if (x < 0 || y < 0 || x > width || y > height) continue
      worst = Math.max(worst, Math.hypot(pts.x[i] * fit!.zoom + fit!.ox - x, pts.y[i] * fit!.zoom + fit!.oy - y))
    }
    expect(worst).toBeLessThan(5)
  })

  it('finds no tree on a play screen', () => {
    const { px, width, height } = bgra('area-mods-real-1.png')
    expect(fitTree(readScreen(px, width, height), pts)).toBeNull()
  })

  it('finds nothing on a bright play screen', () => {
    const px = new Uint8Array(W * H * 4)
    for (let i = 0; i < px.length; i++) px[i] = 40 + ((i * 2654435761) >>> 24) % 120
    expect(fitTree(readScreen(px, W, H), pts)).toBeNull()
  })

  it('tells lit lines from dim ones', () => {
    const px = new Uint8Array(W * H * 4).fill(12)
    // A pale gold line along y = 100, x 100..300.
    for (let x = 100; x <= 300; x++) for (let y = 99; y <= 101; y++) { const j = (y * W + x) * 4; px[j] = 150; px[j + 1] = 210; px[j + 2] = 235 }
    const fit = { zoom: 1, ox: 0, oy: 0, score: 9 }
    const lit = litProbes(px, W, H, fit, [Float32Array.from([150, 100, 200, 100, 250, 100]), Float32Array.from([150, 300, 200, 300])])
    expect(lit).toEqual([true, false])
  })
})
