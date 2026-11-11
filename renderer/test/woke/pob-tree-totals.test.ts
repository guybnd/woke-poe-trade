// What a passive tree adds up to, on made-up nodes shaped like the real data.
import { describe, expect, it } from 'vitest'
import { filterTotals, groupTotals, matchingNodes, treeTotals } from '@/web/woke/pob-builds/tree-totals'
import type { NodeKind, TreeNode } from '@/web/woke/pob-builds/passive-tree'

const node = (id: number, stats: string[], kind: NodeKind = 'small', name = ''): TreeNode =>
  ({ id, x: 0, y: 0, kind, name, stats, out: [], icon: '', group: 0, radius: 0, angle: 0 })

const nodes = new Map([
  node(1, ['10% increased maximum Life']),
  node(2, ['+30 to maximum Life', '10% increased maximum Life'], 'notable', 'Discipline and Training'),
  node(3, ['+12% to all Elemental Resistances', '24% increased Elemental Damage'], 'notable', 'Holy Dominion'),
  node(4, ['Enemies you Kill Explode\nfor 10% of their Life']),
  node(5, ['10% reduced Mana Cost of Skills'], 'asc', 'Ascendant'),
  node(6, ['-5% to Chaos Resistance']),
  node(7, ['-5% to Chaos Resistance'])
].map(n => [n.id, n]))

describe('treeTotals', () => {
  const totals = treeTotals(nodes, [1, 2, 3, 4, 5, 6, 7, 999])
  const row = (text: string) => totals.find(t => t.text === text)

  it('adds lines that differ only by their number', () => {
    expect(row('increased maximum Life')).toMatchObject({ amount: '20%', ids: [1, 2] })
    expect(row('maximum Life')).toMatchObject({ amount: '+30' })
  })

  it('keeps negative rolls negative', () => {
    expect(row('Chaos Resistance')).toMatchObject({ amount: '-10%' })
  })

  it('lists lines with no number as they are, and leaves ascendancy out', () => {
    expect(row('Enemies you Kill Explode for 10% of their Life')?.amount).toBe('')
    expect(totals.some(t => t.text.includes('Mana Cost'))).toBe(false)
  })

  it('groups in a fixed order, largest first', () => {
    const groups = groupTotals(totals)
    expect(groups[0].name).toBe('Attributes and pools')
    expect(groups[0].rows.map(r => r.text)).toEqual(['maximum Life', 'increased maximum Life'])
    expect(groups.find(g => g.name === 'Resistances')?.rows.map(r => r.amount)).toEqual(['+12%', '-10%'])
    expect(groups.find(g => g.name === 'Damage')?.rows[0].text).toBe('increased Elemental Damage')
  })
})

describe('search', () => {
  const totals = treeTotals(nodes, [1, 2, 3])

  it('finds a line by its words as the game writes them', () => {
    expect(filterTotals(totals, 'to maximum life').map(t => t.text)).toEqual(['maximum Life'])
  })

  it('filters the totals, ignoring case', () => {
    expect(filterTotals(totals, 'LIFE').map(t => t.text)).toEqual(['maximum Life', 'increased maximum Life'])
    expect(filterTotals(totals, '  ')).toHaveLength(totals.length)
  })

  it('finds nodes by name and by text, on the whole tree', () => {
    expect(matchingNodes(nodes.values(), 'dominion')).toEqual([3])
    expect(matchingNodes(nodes.values(), 'life')).toEqual([1, 2, 4])
  })

  it('waits for two letters, and leaves out what is not drawn', () => {
    expect(matchingNodes(nodes.values(), 'l')).toEqual([])
    expect(matchingNodes(nodes.values(), 'mana')).toEqual([])
  })
})

describe('real shapes of stat lines', () => {
  const list = (...stats: string[]) => new Map(stats.map((stat, i) => [i, node(i, [stat])]))
  const of = (...stats: string[]) => treeTotals(list(...stats), stats.map((_, i) => i))

  it('adds a number mid-line, in place', () => {
    expect(of('Sword Attacks deal 12% increased Damage', 'Sword Attacks deal 12% increased Damage').map(t => t.text))
      .toEqual(['Sword Attacks deal 24% increased Damage'])
  })

  it('joins a wrapped line, and keeps two real ones apart', () => {
    expect(of('Summon fewer than\n8 Grasping Vines').map(t => t.text)).toEqual(['Summon fewer than 8 Grasping Vines'])
    expect(of('10% increased Damage\n10% increased Area of Effect').map(t => t.text)).toEqual(['increased Damage', 'increased Area of Effect'])
  })

  it('adds a sign into its number', () => {
    expect(of('-10% to maximum Chance to Block', '+3% to maximum Chance to Block').map(t => t.amount)).toEqual(['-7%'])
  })

  it('counts lines with several numbers rather than adding them', () => {
    const [row] = of('Adds 1 to 2 Fire Damage', 'Adds 1 to 2 Fire Damage')
    expect(row.text).toBe('Adds 1 to 2 Fire Damage (2 times)')
  })

  it('puts lines where they belong', () => {
    const group = (line: string) => of(line)[0].group
    expect(group('+10% Chance to Block Spell Damage')).toBe('Defence')
    expect(group('1% of Damage Leeched as Life')).toBe('Defence')
    expect(group('Regenerate 1.6% of Life per second')).toBe('Defence')
    expect(group('Damage Penetrates 6% Cold Resistance')).toBe('Damage')
    expect(group('5% increased Damage per 15 Dexterity')).toBe('Damage')
    expect(group('10% increased Attack Speed')).toBe('Speed')
    expect(group('+20 to Strength and Intelligence')).toBe('Attributes and pools')
  })
})

describe('picked masteries in the totals', () => {
  it('count the picked effect, through the node lookup', () => {
    const map = new Map([node(1, ['10% increased maximum Life']), node(8, [], 'mastery', 'Life Mastery')].map(n => [n.id, n]))
    const nodeOf = (id: number) => id === 8 ? { ...map.get(8)!, stats: ['10% increased maximum Life'] } : map.get(id)
    expect(treeTotals(map, [1, 8], nodeOf).find(t => /Life/.test(t.text))?.amount).toBe('20%')
    expect(treeTotals(map, [1, 8]).find(t => /Life/.test(t.text))?.amount).toBe('10%')
  })
})
