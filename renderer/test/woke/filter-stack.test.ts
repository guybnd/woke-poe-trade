// Stack sizes of a group's tiers, on NeverSink's real filter at every strictness.
import { describe, it, expect, beforeAll } from 'vitest'
import { addEdit, applyEdits, describeEdit, isValidEdit, rehomeOptions } from '@/web/woke/loot-filter/edits'
import type { FilterEdit } from '@/web/woke/loot-filter/edits'
import { buildTree } from '@/web/woke/loot-filter/groups'
import type { GroupNode, TierNode } from '@/web/woke/loot-filter/groups'
import { parseFilter, serializeFilter } from '@/web/woke/loot-filter/parse'
import { cleanStackSize, scaleMax, scalePct, scaleSize, stackLadder, tierStack, unreachableTiers } from '@/web/woke/loot-filter/stack'
import { itemFacts } from '@/web/woke/loot-filter/item-facts'
import { matchItem } from '@/web/woke/loot-filter/match'
import { loadGameData } from '../helpers/game-data'
import { LEVELS, neverSink } from '../helpers/neversink'

beforeAll(loadGameData)

const groupOf = (text: string, type: string): GroupNode => buildTree(parseFilter(text)).flatMap(s => s.groups).find(g => g.type === type)!
const tierOf = (g: GroupNode, tier: string): TierNode => g.tiers.find(t => t.tier === tier)!
const stackEdit = (tier: string, size: number, id = 1): FilterEdit => ({ id, kind: 'stack', type: 'currency->harvest', tier, size })

describe('reading', () => {
  it('finds Harvest\'s real ladder', () => {
    const g = groupOf(neverSink('1-REGULAR'), 'currency->harvest')
    expect(tierStack(tierOf(g, 't1lifeforce'))).toBe(4000)
    expect(tierStack(tierOf(g, 't6lifeforce'))).toBeNull()
    const ladder = stackLadder(g.tiers, tierStack)!
    expect(ladder.steps.map(s => s.size)).toEqual([4000, 500, 250, 45, 20])
    expect(ladder.floor).toBe('t6lifeforce')
  })

  it('finds gold\'s piles', () => {
    const g = groupOf(neverSink('1-REGULAR'), 'gold')
    expect(stackLadder(g.tiers, tierStack)!.steps.map(s => s.size)).toEqual([3001, 500, 150, 50])
  })

  it('has no scale where every tier is the same', () => {
    expect(stackLadder(groupOf(neverSink('1-REGULAR'), 'currency->stackedsix').tiers, tierStack)).toBeNull()
  })

  it('has no scale over different items that share numbers', () => {
    expect(stackLadder(groupOf(neverSink('1-REGULAR'), 'currency->levelingstacked').tiers, tierStack)).toBeNull()
  })

  it('keeps its scale when you type two tiers to one number', () => {
    const g = groupOf(neverSink('1-REGULAR'), 'currency->harvest')
    const ladder = stackLadder(g.tiers, t => t.tier === 't2lifeforce' ? 250 : tierStack(t))!
    expect(ladder.steps.map(s => s.size)).toEqual([4000, 250, 250, 45, 20])
  })

  it.each(LEVELS)('no group\'s real tiers are unreachable at %s', (level) => {
    for (const g of buildTree(parseFilter(neverSink(level))).flatMap(s => s.groups)) {
      expect(unreachableTiers(g.tiers, tierStack), g.type).toEqual([])
    }
  })

  it('a tier whose rules disagree shows no number', () => {
    const g = groupOf('Show # $type->x $tier->a\n\tStackSize >= 3\n\tBaseType == "A"\nShow # $type->x $tier->a\n\tStackSize >= 5\n\tBaseType == "B"\n', 'x')
    expect(tierStack(g.tiers[0])).toBeNull()
  })
})

describe('changing', () => {
  it.each(LEVELS)('rewrites only that tier, in the file, at %s', (level) => {
    const doc = parseFilter(neverSink(level))
    const [res] = applyEdits(doc, [stackEdit('t2lifeforce', 777)])
    if (!tierOf(groupOf(neverSink(level), 'currency->harvest'), 't2lifeforce').blocks.some(b => b.conditions.some(c => c.key === 'StackSize'))) {
      expect(res.ok).toBe(false)
      return
    }
    expect(res.ok).toBe(true)
    const out = serializeFilter(doc)
    expect(out).toContain('StackSize >= 777')
    const after = groupOf(out, 'currency->harvest')
    expect(tierStack(tierOf(after, 't2lifeforce'))).toBe(777)
    expect(tierStack(tierOf(after, 't3lifeforce'))).toBe(tierStack(tierOf(groupOf(neverSink(level), 'currency->harvest'), 't3lifeforce')))
  })

  it('changes what a stack matches', () => {
    const facts = { ...itemFacts('Item Class: Stackable Currency\nRarity: Currency\nVivid Crystallised Lifeforce\n--------\nStack Size: 700/1000\n', null), areaLevel: 83 }
    const before = parseFilter(neverSink('1-REGULAR'))
    expect(matchItem(before, facts).final?.block.tier).toBe('t2lifeforce')
    const doc = parseFilter(neverSink('1-REGULAR'))
    applyEdits(doc, [stackEdit('t1lifeforce', 600)])
    expect(matchItem(doc, facts).final?.block.tier).toBe('t1lifeforce')
  })

  it('fails plainly on a tier with no stack size, or none at all', () => {
    const doc = parseFilter(neverSink('1-REGULAR'))
    expect(applyEdits(doc, [stackEdit('t6lifeforce', 5)])[0].ok).toBe(false)
    expect(applyEdits(doc, [stackEdit('nope', 5)])[0].ok).toBe(false)
  })

  it('one edit per tier, the last one standing', () => {
    let list: FilterEdit[] = []
    list = addEdit(list, stackEdit('t1lifeforce', 100, 1))
    list = addEdit(list, stackEdit('t2lifeforce', 50, 2))
    list = addEdit(list, stackEdit('t1lifeforce', 200, 3))
    expect(list.map(e => e.kind === 'stack' && [e.tier, e.size])).toEqual([['t1lifeforce', 200], ['t2lifeforce', 50]])
  })

  it('a second change to a tier is still that one edit', () => {
    const first = addEdit([], stackEdit('t1lifeforce', 100, 1))
    expect(addEdit(first, stackEdit('t1lifeforce', 200, 9))[0].id).toBe(1)
  })

  it('a failed edit is only offered tiers that have a stack size', () => {
    const doc = parseFilter(neverSink('1-REGULAR'))
    const tiers = rehomeOptions(doc, stackEdit('gone', 5)).filter(o => o.type === 'currency->harvest').map(o => o.tier)
    expect(tiers).toContain('t1lifeforce')
    expect(tiers).not.toContain('t6lifeforce')
    expect(tiers).not.toContain('exhide')
  })

  it('checks saved edits', () => {
    expect(isValidEdit({ ...stackEdit('t1', 5), size: 1e21 })).toBe(false)
    expect(isValidEdit(stackEdit('t1', 5))).toBe(true)
    expect(isValidEdit({ ...stackEdit('t1', 5), size: 0 })).toBe(false)
    expect(isValidEdit({ ...stackEdit('t1', 5), size: 1.5 })).toBe(false)
    expect(isValidEdit({ ...stackEdit('t1', 5), size: '5' })).toBe(false)
  })

  it('reads in the history', () => {
    expect(describeEdit(stackEdit('t1lifeforce', 600))).toContain('stacks of 600 or more')
  })

  it('warns when your number puts a tier behind another', () => {
    const g = groupOf(neverSink('1-REGULAR'), 'currency->harvest')
    const sizes: Record<string, number> = { t1lifeforce: 100 }
    expect(unreachableTiers(g.tiers, t => sizes[t.tier] ?? tierStack(t))).toEqual(['t2lifeforce', 't3lifeforce'])
  })
})

describe('numbers', () => {
  it('cleans what you type', () => {
    expect(cleanStackSize('12')).toBe(12)
    expect(cleanStackSize('12.6')).toBe(13)
    expect(cleanStackSize('0')).toBe(1)
    expect(cleanStackSize('-5')).toBe(1)
    expect(cleanStackSize('999999')).toBe(99999)
    expect(cleanStackSize('')).toBeNull()
    expect(cleanStackSize('abc')).toBeNull()
  })

  it('the scale goes both ways, to round numbers', () => {
    const max = scaleMax([{ tier: 'a', size: 4000 }])
    expect(max).toBe(8000)
    for (const n of [1, 20, 45, 250, 500, 4000]) {
      const back = scaleSize(scalePct(n, max), max)
      expect(Math.abs(back - n) / n).toBeLessThan(0.1)
    }
    expect(scaleSize(200, max)).toBe(8000)
    expect(scaleSize(-5, max)).toBe(1)
  })
})
