// What changes between two passive trees, on the real tree data.
import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { fitBox, linkState, nodeState, treeDiff } from '@/web/woke/pob-builds/passive-tree'
import type { NodeKind, TreeNode } from '@/web/woke/pob-builds/passive-tree'

type Row = [number, number, number, NodeKind, string, string[], number[]]
const rows = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../public/data/tree/passive-tree.json'), 'utf-8')) as Row[]
const tree = new Map<number, TreeNode>(rows.map(([id, x, y, kind, name, stats, out]) => [id, { id, x, y, kind, name, stats, out }]))
const byName = (name: string) => [...tree.values()].find(n => n.name === name)!

describe('passive tree data', () => {
  it('has the tree, with real stats on notables and places for them', () => {
    expect(tree.size).toBeGreaterThan(2000)
    const n = byName('Holy Dominion')
    expect(n.kind).toBe('notable')
    expect(n.stats).toContain('+12% to all Elemental Resistances')
    expect(n.out.length).toBeGreaterThan(0)
    expect(Math.abs(n.x) + Math.abs(n.y)).toBeGreaterThan(0)
  })
})

describe('treeDiff', () => {
  const holy = byName('Holy Dominion').id
  const small = [...tree.values()].find(n => n.kind === 'small')!.id

  it('counts every point and names the notables', () => {
    const d = treeDiff(tree, [small], [small, holy, 999999])
    expect(d.added).toBe(2)
    expect(d.removed).toBe(0)
    expect(d.addedNames.map(n => n.name)).toEqual(['Holy Dominion'])
  })

  it('counts ascendancy apart, and class and ascendancy starts not at all', () => {
    const start = [...tree.values()].find(n => n.kind === 'start')!.id
    const ascStart = [...tree.values()].find(n => n.kind === 'ascstart')!.id
    const asc = [...tree.values()].filter(n => n.kind === 'asc').slice(0, 2).map(n => n.id)
    const d = treeDiff(tree, [], [start, ascStart, ...asc, holy])
    expect(d.added).toBe(1)
    expect(d.addedAscendancy).toBe(2)
  })

  it('still counts before the data has loaded', () => {
    expect(treeDiff(null, [1], [2, 3])).toMatchObject({ added: 2, removed: 1, addedNames: [] })
  })

  it('says what goes away', () => {
    expect(treeDiff(tree, [holy], []).removedNames.map(n => n.name)).toEqual(['Holy Dominion'])
  })
})

describe('node and line states', () => {
  const from = new Set([1, 2])
  const to = new Set([2, 3])

  it('reads each node', () => {
    expect([1, 2, 3, 4].map(id => nodeState(id, from, to))).toEqual(['remove', 'keep', 'add', ''])
  })

  it('lights a line only with both ends lit', () => {
    expect(linkState('keep', 'keep')).toBe('keep')
    expect(linkState('keep', 'add')).toBe('add')
    expect(linkState('keep', 'remove')).toBe('remove')
    expect(linkState('add', 'remove')).toBe('')
    expect(linkState('', 'add')).toBe('')
  })
})

describe('fitBox', () => {
  it('frames only what is drawn', () => {
    const n = (x: number, y: number, kind: NodeKind) => ({ id: 1, x, y, kind, name: '', stats: [], out: [] })
    expect(fitBox([n(0, 0, 'small'), n(100, 50, 'notable'), n(9999, 9999, 'asc')], 10)).toEqual({ x: -10, y: -10, w: 120, h: 70 })
    expect(fitBox([n(1, 1, 'asc')])).toBeNull()
  })
})
