// Jewels in the PoB tree view (WOKEPOET-205).
import { describe, it, expect } from 'vitest'
import { changedBy, jewelStats, nodesInRadius, socketedJewels } from '@/web/woke/pob-builds/tree-jewels'
import type { TreeNode } from '@/web/woke/pob-builds/passive-tree'
import type { PobItem } from '@/web/woke/pob-builds/widget'

const node = (id: number, x: number, y: number, kind: TreeNode['kind'] = 'small'): TreeNode =>
  ({ id, x, y, kind, name: `N${id}`, stats: ['+10 to Strength'], out: [], icon: '', group: 0, radius: 0, angle: 0 })
const item = (over: Partial<PobItem>): PobItem => ({ rarity: 'UNIQUE', name: '', base: '', sockets: '', implicits: [], mods: [], ...over })

const nodes = new Map<number, TreeNode>([
  [1, node(1, 0, 0, 'jewel')],
  [2, node(2, 1000, 0)],
  [3, node(3, 2000, 0, 'notable')],
  [4, node(4, 3000, 0)],
  [5, node(5, 100, 0, 'mastery')]
])

describe('PoB tree jewels', () => {
  it('reads a jewel\'s ring and which passives it changes', () => {
    const [vanity] = socketedJewels([{ node: 1, item: item({ name: 'Glorious Vanity', base: 'Timeless Jewel', radius: 'Large' }) }])
    expect(vanity.radius).toBe(1800)
    expect(vanity.changes).toBe(true)
    expect(nodesInRadius(nodes, vanity).map(n => n.id)).toEqual([2])
    expect(changedBy(nodes, [vanity], nodes.get(2)!)?.item.name).toBe('Glorious Vanity')
    expect(changedBy(nodes, [vanity], nodes.get(4)!)).toBeNull()
  })

  it('counts a plain jewel\'s mods, but not a Timeless or cluster jewel\'s text', () => {
    expect(jewelStats(item({ rarity: 'RARE', base: 'Cobalt Jewel', mods: ['+12% to Cold Resistance'] }))).toEqual(['+12% to Cold Resistance'])
    expect(jewelStats(item({ base: 'Timeless Jewel', mods: ['Bathed in the blood of 1234'] }))).toEqual([])
    expect(jewelStats(item({ rarity: 'RARE', base: 'Large Cluster Jewel', mods: ['Adds 8 Passive Skills'] }))).toEqual([])
    // A magic one is one line, affixes and all.
    expect(jewelStats(item({ rarity: 'MAGIC', name: 'Large Cluster Jewel of Fire', mods: ['Adds 8 Passive Skills'] }))).toEqual([])
  })

  it('a jewel with no radius draws no ring', () => {
    const [eye] = socketedJewels([{ node: 1, item: item({ name: "Watcher's Eye", base: 'Prismatic Jewel' }) }])
    expect(eye.radius).toBeNull()
    expect(nodesInRadius(nodes, eye)).toEqual([])
  })
})
