// The build window's ascendancy bubbles, on the real tree data.
import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { drawnRadius, fitBox, readNodes } from '@/web/woke/pob-builds/passive-tree'
import type { TreeArt } from '@/web/woke/pob-builds/passive-tree'
import { placeAscendancies } from '@/web/woke/pob-builds/asc-layout'

const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../public/data/tree/passive-tree.json'), 'utf-8')) as TreeArt & { nodes: Parameters<typeof readNodes>[0] }
const tree = readNodes(data.nodes)
const nodes = [...tree.values()]
const start = nodes.find(n => n.kind === 'start')!
// Two Inquisitor points.
const inq = [662, 53884]

describe('ascendancy bubbles', () => {
  it('draws the build\'s ascendancy in its bubble, clear of the main tree', () => {
    const lay = placeAscendancies(tree, new Set([start.id, ...inq]))
    expect(lay.bubbles).toHaveLength(1)
    expect(lay.nodes).toHaveLength(17)
    expect(lay.nodes.every(n => n.asc === 'Inquisitor' && n.placed === true && drawnRadius(n) > 0)).toBe(true)
    const b = lay.bubbles[0]
    for (const n of lay.nodes) expect(Math.hypot(n.x - b.x, n.y - b.y)).toBeLessThan(b.r)
    const main = nodes.filter(n => ['small', 'notable', 'key', 'jewel', 'start'].includes(n.kind))
    for (const n of main) expect(Math.hypot(n.x - b.x, n.y - b.y)).toBeGreaterThan(b.r)
  })

  it('draws a bloodline too', () => {
    const aul = nodes.find(n => n.asc === 'Aul' && n.kind === 'asc')!
    expect(placeAscendancies(tree, new Set([...inq, aul.id])).bubbles).toHaveLength(2)
  })

  it('draws nothing without ascendancy points', () => {
    expect(placeAscendancies(tree, new Set([start.id])).nodes).toHaveLength(0)
  })

  it('leaves the rest of the ascendancies undrawn, and out of the view', () => {
    const asc = tree.get(53884)!
    expect(drawnRadius(asc)).toBe(0)
    expect(fitBox([start, asc])).toEqual(fitBox([start]))
    const placed = { ...asc, placed: true as const }
    expect(fitBox([start, placed])!.w).toBeGreaterThan(fitBox([start])!.w)
  })
})
