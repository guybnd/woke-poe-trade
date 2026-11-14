import fs from 'fs'
import path from 'path'
import { describe, it, expect } from 'vitest'
import { PNG } from 'pngjs'
import { check, fitTree, hitShare, litLines, litProbes, readScreen } from '../../main/src/woke/tree-fit'
import { readNodes } from '../../renderer/src/web/woke/pob-builds/passive-tree'
import { fitPoints, lineProbes, offBuildLines, refundNodes } from '../../renderer/src/web/woke/pob-builds/tree-overlay'
import { placeAscendancies } from '../../renderer/src/web/woke/pob-builds/asc-layout'
import type { TreeNode } from '../../renderer/src/web/woke/pob-builds/passive-tree'

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

// Since 3.30 the game draws the class's ascendancy inside the tree, in a
// bubble beside the class start (renderer pob-builds/asc-layout.ts). Real
// shots of a Duelist (Slayer) tree, zoomed in and out.
describe('ascendancy bubble', () => {
  function placedSlayer () {
    const nodes = new Map<number, TreeNode>(tree.nodes.map((r: any[]) => [r[0] as number, {
      id: r[0], x: r[1], y: r[2], kind: r[3], name: r[4], stats: r[5], out: r[6], icon: r[7] ?? '', group: r[8] ?? 0, radius: r[9] ?? 0, angle: r[10] ?? 0, ...(r[11] ? { asc: r[11] } : {})
    } as TreeNode]))
    const slayerPoint = [...nodes.values()].find(n => n.asc === 'Slayer' && n.kind === 'asc')!
    return placeAscendancies(nodes, new Set([slayerPoint.id]), tree, tree.groups.length, true).nodes
  }

  it.each(['ascendancy', 'ascendancy-far'])('lands on the game\'s own bubble, %s', (name) => {
    const { px, width, height } = bgra(`passive-tree-real-${name}.png`)
    const scr = readScreen(px, width, height)
    const fit = fitTree(scr, pts)!
    expect(fit).not.toBeNull()
    const nodes = placedSlayer()
    expect(nodes).toHaveLength(15)
    const asc = { x: Float32Array.from(nodes.map(n => n.x)), y: Float32Array.from(nodes.map(n => n.y)), r: Float32Array.from(nodes.map(() => 40)) }
    const here = check(scr, asc, fit.zoom, fit.ox, fit.oy)
    expect(here).toBeGreaterThan(3)
    // Most nodes sit on something bright (small ones zoomed out less so).
    expect(hitShare(scr, asc, fit.zoom, fit.ox, fit.oy)).toBeGreaterThan(name === 'ascendancy' ? 0.8 : 0.5)
    // Moved 25 px off, it isn't (zoomed out the bubble's art is bright all
    // over, so only zoomed in tells).
    if (name === 'ascendancy') expect(check(scr, asc, fit.zoom, fit.ox + 25, fit.oy + 25)).toBeLessThan(here * 0.7)
  })
})

// Lines off the build, read on real shots: a wrong "lit" would say refund.
describe('nodes to refund, on real shots', () => {
  const all = readNodes(tree.nodes)
  const fp = fitPoints(all)
  const drawn = { x: Float32Array.from(fp.x), y: Float32Array.from(fp.y), r: Float32Array.from(fp.r) }
  const lines = offBuildLines(all, [], tree)
  const probes = lineProbes(lines, all).map(p => Float32Array.from(p))
  function read (name: string) {
    const { px, width, height } = bgra(`passive-tree-real-${name}.png`)
    const fit = fitTree(readScreen(px, width, height), drawn)!
    expect(fit).not.toBeNull()
    return litLines(px, width, height, fit, probes, drawn)
  }

  it('reads nothing lit on a tree with no points spent near (gold frames, HUD)', () => {
    expect(read('zoomed-in').filter(Boolean)).toHaveLength(0)
  })

  it('reads the spent points as one joined tree', () => {
    const lit = read('ascendancy-far')
    const n = lit.filter(Boolean).length
    expect(n).toBeGreaterThan(25)
    // Built as if a build had one taken node: the lit lines join up from it.
    // (The class start's own lines run under the ascendancy art, unread.)
    const start = all.get(lines[lit.indexOf(true)].a)!
    const out = refundNodes(lines, lit, new Set([start.id]), new Set())
    expect(out.size).toBeGreaterThan(25)
    // A build with all but one end of a branch: that one is the refund.
    const key = (l: { a: number, b: number }) => l.a < l.b ? `${l.a}-${l.b}` : `${l.b}-${l.a}`
    const litKeys = new Set(lines.filter((_, i) => lit[i]).map(key))
    const leaf = [...out].find(id => lines.filter((l, i) => lit[i] && (l.a === id || l.b === id)).length === 1)!
    const ids = [start.id, ...[...out].filter(id => id !== leaf)]
    const off = offBuildLines(all, ids, tree)
    const offLit = off.map(l => litKeys.has(key(l)))
    expect([...refundNodes(off, offLit, new Set(ids), new Set())]).toEqual([leaf])
  })
})
