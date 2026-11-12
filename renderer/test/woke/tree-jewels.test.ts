// Jewels in the PoB tree view (WOKEPOET-205).
import { describe, it, expect } from 'vitest'
import { changedBy, jewelStats, nodesInRadius, rewritten, socketedJewels, timelessAsk, timelessByNode } from '@/web/woke/pob-builds/tree-jewels'
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

describe('Timeless jewel rewrites in the tree', () => {
  const node = (id: number, kind: TreeNode['kind'], x: number, name = 'Passive', stats = ['10% increased Damage']): TreeNode =>
    ({ id, x, y: 0, kind, name, stats, out: [], icon: '', group: 0, radius: 0, angle: 0 })
  const nodes = new Map<number, TreeNode>([
    [1, node(1, 'jewel', 0)],
    [2, node(2, 'notable', 100, 'Twin Terrors')],
    [3, node(3, 'small', 200, 'Dexterity', ['+10 to Dexterity'])],
    [0x10001, node(0x10001, 'small', 50)],
    [4, node(4, 'mastery', 50)]
  ])
  const gv = { rarity: 'UNIQUE', name: 'Glorious Vanity', base: 'Timeless Jewel', radius: 'Large', sockets: '', implicits: [], mods: ['Bathed in the blood of 2500 sacrificed in the name of Xibaqua'] } as PobItem
  const jewels = socketedJewels([{ node: 1, item: gv }])

  it('asks about the tree passives in the ring, not cluster passives or masteries', () => {
    const { asked, ask } = timelessAsk(nodes, jewels)
    expect(asked).toHaveLength(1)
    expect(ask.jewels[0].nodes.map(n => n.id).sort()).toEqual([2, 3])
  })

  it('replaces or adds to a passive', () => {
    const by = timelessByNode(jewels, { found: true, jewels: [{ 2: { replace: true, name: 'Ritual of Memory', stats: ['21% increased maximum Mana'] }, 3: { replace: false, stats: ['+2 to Strength'] } }] })
    expect(rewritten(nodes.get(2)!, by.get(2)!.rewrite)).toMatchObject({ name: 'Ritual of Memory', stats: ['21% increased maximum Mana'] })
    expect(rewritten(nodes.get(3)!, by.get(3)!.rewrite)).toMatchObject({ name: 'Dexterity', stats: ['+10 to Dexterity', '+2 to Strength'] })
  })
})
