// What the build tree overlay draws over the game's tree, on the real data.
import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { readNodes } from '@/web/woke/pob-builds/passive-tree'
import type { TreeArt } from '@/web/woke/pob-builds/passive-tree'
import { buildPath, fitPoints, probesOf, takenNodes } from '@/web/woke/pob-builds/tree-overlay'

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
