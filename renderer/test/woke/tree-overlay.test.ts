// What the build tree overlay draws over the game's tree, on the real data.
import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { readNodes } from '@/web/woke/pob-builds/passive-tree'
import type { TreeArt } from '@/web/woke/pob-builds/passive-tree'
import { ascFitPoints, ascPath, buildAscendancy, buildPath, fitPoints, probesOf, takenNodes } from '@/web/woke/pob-builds/tree-overlay'

const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../public/data/tree/passive-tree.json'), 'utf-8')) as TreeArt & { nodes: Parameters<typeof readNodes>[0] }
const tree = readNodes(data.nodes)

// A short walk out from a class start, along the tree's own links.
function walk (steps: number): number[] {
  const start = [...tree.values()].find(n => n.kind === 'start')!
  const ids = [start.id]
  let at = start
  for (let i = 0; i < steps; i++) {
    const next = at.out.map(id => tree.get(id)!).find(n => n && n.kind === 'small' && !ids.includes(n.id)) ??
      [...tree.values()].find(n => n.kind === 'small' && n.out.includes(at.id) && !ids.includes(n.id))
    if (!next) break
    ids.push(next.id)
    at = next
  }
  return ids
}

describe('build tree overlay', () => {
  it('fits on what the game draws: no ascendancy nodes', () => {
    const pts = fitPoints(tree)
    expect(pts.x.length).toBe(pts.y.length)
    const asc = [...tree.values()].filter(n => n.kind === 'asc' || n.kind === 'ascstart').length
    expect(pts.x.length).toBe([...tree.values()].length - asc - [...tree.values()].filter(n => n.kind === 'wormhole').length)
  })

  it('joins the build along its links, with probes in the middle of each line', () => {
    const ids = walk(5)
    const p = buildPath(tree, ids, data)
    expect(p.lines.length).toBeGreaterThanOrEqual(ids.length - 1)
    const probes = probesOf(p, tree)
    for (const [i, pr] of probes.entries()) {
      const a = tree.get(p.lines[i].a)!
      const b = tree.get(p.lines[i].b)!
      // The middle probe sits between the two ends, not on either node.
      const mx = pr[4]
      const my = pr[5]
      const len = Math.hypot(b.x - a.x, b.y - a.y)
      expect(Math.hypot(mx - a.x, my - a.y)).toBeGreaterThan(len * 0.2)
      expect(Math.hypot(mx - b.x, my - b.y)).toBeGreaterThan(len * 0.2)
    }
  })

  it('counts a node taken only when a lit line reaches it', () => {
    const ids = walk(4)
    const p = buildPath(tree, ids, data)
    const lit = p.lines.map((_, i) => i === 0)
    const taken = takenNodes(p, lit)
    expect(taken.has(p.lines[0].a)).toBe(true)
    expect(taken.has(p.lines[0].b)).toBe(true)
    expect(taken.has(ids[ids.length - 1])).toBe(false)
  })
})

describe('ascendancy panel', () => {
  // An Inquisitor taking Righteous Providence then Inevitable Judgement, with
  // a main tree walk that must not count.
  const ids = [...walk(3), 662, 53884, 37486, 48214]

  it('finds the ascendancy from the build points', () => {
    expect(buildAscendancy(tree, ids)).toBe('Inquisitor')
    expect(buildAscendancy(tree, walk(3))).toBeNull()
  })

  it('picks the class ascendancy over a bloodline point listed first', () => {
    const aul = [...tree.values()].find(n => n.asc === 'Aul' && n.kind === 'asc')!
    expect(buildAscendancy(tree, [aul.id, ...ids])).toBe('Inquisitor')
  })

  it('fits on every node of that ascendancy only', () => {
    const pts = ascFitPoints(tree, 'Inquisitor')
    expect(pts.x.length).toBe(17)
    // Laid out together, about a panel's width across.
    expect(Math.max(...pts.x) - Math.min(...pts.x)).toBeLessThan(2000)
  })

  it('draws the path out from the ascendancy start', () => {
    const p = ascPath(tree, ids, data, 'Inquisitor')
    expect(p.nodes.map(n => n.id).sort((a, b) => a - b)).toEqual([662, 37486, 48214, 53884, 61871])
    expect(p.lines).toHaveLength(4)
    // The start is taken without a lit line; nothing else is.
    expect([...takenNodes(p, p.lines.map(() => false))]).toEqual([61871])
    expect(probesOf(p, tree).every(pr => pr.every(Number.isFinite))).toBe(true)
  })

  it('keeps ascendancy off the main tree path', () => {
    expect(buildPath(tree, ids, data).nodes.some(n => n.kind === 'asc' || n.kind === 'ascstart')).toBe(false)
  })
})
