// The ascendancy bubble beside the class start, on the real tree data.
import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { drawnRadius, fitBox, readNodes } from '@/web/woke/pob-builds/passive-tree'
import type { TreeArt } from '@/web/woke/pob-builds/passive-tree'
import { ascCentre, BUBBLE_FROM_START, placeAscendancies } from '@/web/woke/pob-builds/asc-layout'

const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../public/data/tree/passive-tree.json'), 'utf-8')) as TreeArt & { nodes: Parameters<typeof readNodes>[0] }
const tree = readNodes(data.nodes)
const nodes = [...tree.values()]
const duelist = tree.get(50986)!
const slayer = nodes.filter(n => n.asc === 'Slayer')
const slayerPoint = slayer.find(n => n.kind === 'asc')!
const base = data.groups.length

describe('ascendancy bubble', () => {
  it('sits beside the class start, towards the tree centre, as in game', () => {
    const root = slayer.find(n => n.kind === 'ascstart')!
    // Measured on a Duelist's tree: straight up from the start.
    const at = ascCentre(tree, root)!
    expect(Math.abs(at.x - duelist.x)).toBeLessThan(2)
    expect(at.y).toBeCloseTo(duelist.y - BUBBLE_FROM_START, 0)
  })

  it('moves the whole ascendancy there at the tree\'s scale, with its orbits', () => {
    const lay = placeAscendancies(tree, new Set([duelist.id, slayerPoint.id]), data, base)
    expect(lay.nodes).toHaveLength(slayer.length)
    expect(lay.nodes.every(n => n.placed && drawnRadius(n) > 0)).toBe(true)
    // Same shape: distances between nodes unchanged.
    const a = lay.nodes[0]
    const b = lay.nodes[5]
    const a0 = tree.get(a.id)!
    const b0 = tree.get(b.id)!
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeCloseTo(Math.hypot(a0.x - b0.x, a0.y - b0.y), 5)
    // Each copy's orbit centre moved by as much as the node.
    for (const n of lay.nodes) {
      const g = lay.groups[n.group - base]
      const g0 = data.groups[tree.get(n.id)!.group]
      expect(g[0] - g0[0]).toBeCloseTo(n.x - tree.get(n.id)!.x, 5)
    }
    const bubble = lay.bubbles[0]
    expect(Math.hypot(bubble.x - duelist.x, bubble.y - duelist.y)).toBeCloseTo(BUBBLE_FROM_START, 5)
  })

  it('places an ascendancy over the game only where measured, never over passives', () => {
    const main = nodes.filter(n => ['small', 'notable', 'key', 'jewel', 'mastery'].includes(n.kind))
    for (const name of new Set(nodes.filter(n => n.kind === 'ascstart' && n.asc).map(n => n.asc!))) {
      const point = nodes.find(n => n.asc === name && n.kind === 'asc')
      if (!point) continue
      const lay = placeAscendancies(tree, new Set([point.id]), data, base, true)
      for (const b of lay.bubbles) {
        // Its art may cover the class start's frame, never a passive.
        for (const n of main) expect(Math.hypot(n.x - b.x, n.y - b.y), `${name} over ${n.id}`).toBeGreaterThan(b.r * 0.9)
      }
      if (name !== 'Slayer' && name !== 'Gladiator' && name !== 'Champion') expect(lay.nodes, name).toHaveLength(0)
    }
  })

  it('draws an unmeasured class where GGG places it in the window', () => {
    const inq = nodes.find(n => n.asc === 'Inquisitor' && n.kind === 'asc')!
    const lay = placeAscendancies(tree, new Set([inq.id]), data, base)
    expect(lay.nodes.find(n => n.id === inq.id)).toMatchObject({ x: inq.x, y: inq.y, placed: true })
  })

  it('draws a bloodline in place in the window, never over the game', () => {
    const aul = nodes.find(n => n.asc === 'Aul' && n.kind === 'asc')!
    expect(placeAscendancies(tree, new Set([slayerPoint.id, aul.id]), data, base).bubbles).toHaveLength(2)
    const inGame = placeAscendancies(tree, new Set([slayerPoint.id, aul.id]), data, base, true)
    expect(inGame.bubbles).toHaveLength(1)
    expect(inGame.nodes.every(n => n.asc === 'Slayer')).toBe(true)
  })

  it('draws nothing without ascendancy points', () => {
    expect(placeAscendancies(tree, new Set([duelist.id]), data, base).nodes).toHaveLength(0)
  })

  it('leaves the rest of the ascendancies undrawn, and out of the view', () => {
    expect(drawnRadius(slayerPoint)).toBe(0)
    expect(fitBox([duelist, slayerPoint])).toEqual(fitBox([duelist]))
  })
})
