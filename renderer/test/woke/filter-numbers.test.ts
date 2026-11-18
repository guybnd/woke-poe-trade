// The numbers a rule checks (cluster passives, item level...), read and set.
import { describe, it, expect } from 'vitest'
import { boundOf, numberChecks, numberWords, setNumber } from '@/web/woke/loot-filter/numbers'
import { addEdit, applyEdits, describeEdit, isValidEdit, blocksOf } from '@/web/woke/loot-filter/edits'
import type { FilterEdit } from '@/web/woke/loot-filter/edits'
import { buildLadder } from '@/web/woke/loot-filter/ladder'
import { buildTree } from '@/web/woke/loot-filter/groups'
import { parseFilter, serializeFilter } from '@/web/woke/loot-filter/parse'
import { LEVELS, neverSink } from '../helpers/neversink'

const block = (lines: string[]) => parseFilter(['Show', ...lines.map(l => `\t${l}`)].join('\n')).blocks[0]

describe('reading numbers', () => {
  it('reads bounds, folding > and < in, what the item is before where it dropped', () => {
    const b = block(['ItemLevel > 83', 'EnchantmentPassiveNum <= 8', 'MapTier 12', 'Rarity Rare'])
    expect(numberChecks(b.conditions)).toEqual([
      { key: 'EnchantmentPassiveNum', bound: 'max', value: 8 },
      { key: 'MapTier', bound: 'exact', value: 12 },
      { key: 'ItemLevel', bound: 'min', value: 84 }
    ])
  })

  it('skips lists, != and keys it does not edit', () => {
    expect(boundOf(block(['MapTier == 1 16']).conditions[0])).toBeNull()
    expect(boundOf(block(['ItemLevel != 84']).conditions[0])).toBeNull()
    expect(boundOf(block(['StackSize >= 5']).conditions[0])).toBeNull()
  })

  it('says a range as one span', () => {
    const b = block(['ItemLevel >= 75', 'ItemLevel <= 83', 'EnchantmentPassiveNum 12'])
    expect(numberWords(b.conditions).map(w => w.text)).toEqual(['Passives 12', 'Item level 75–83'])
  })
})

describe('setting numbers', () => {
  it('replaces a bound in place', () => {
    const b = block(['ItemLevel >= 84', 'Rarity Rare'])
    const out = setNumber(b.conditions, 'ItemLevel', 'min', 75)
    expect(out.map(c => `${c.key} ${c.op} ${c.values.join(' ')}`)).toEqual(['ItemLevel >= 75', 'Rarity  Rare'])
  })

  it('adds a bound the rule did not have, and takes one off', () => {
    const b = block(['Rarity Rare'])
    expect(numberChecks(setNumber(b.conditions, 'ItemLevel', 'min', 84))).toEqual([{ key: 'ItemLevel', bound: 'min', value: 84 }])
    expect(numberChecks(setNumber(block(['ItemLevel >= 84']).conditions, 'ItemLevel', 'min', null))).toEqual([])
  })

  it('drops a range when an exact value goes in, and the other way round', () => {
    const range = block(['ItemLevel >= 75', 'ItemLevel <= 83']).conditions
    expect(numberChecks(setNumber(range, 'ItemLevel', 'exact', 80))).toEqual([{ key: 'ItemLevel', bound: 'exact', value: 80 }])
    const exact = block(['EnchantmentPassiveNum 12']).conditions
    expect(numberChecks(setNumber(exact, 'EnchantmentPassiveNum', 'max', 8))).toEqual([{ key: 'EnchantmentPassiveNum', bound: 'max', value: 8 }])
  })
})

describe('the number edit', () => {
  const edit = (over: Partial<FilterEdit> = {}) => ({ id: 1, kind: 'number', type: 'jewels->cluster', tier: 'highlarge', key: 'EnchantmentPassiveNum', bound: 'max', value: 6, ...over }) as FilterEdit

  it('checks saved edits', () => {
    expect(isValidEdit(edit())).toBe(true)
    expect(isValidEdit(edit({ value: null } as Partial<FilterEdit>))).toBe(true)
    expect(isValidEdit(edit({ value: 40 } as Partial<FilterEdit>))).toBe(false)
    expect(isValidEdit(edit({ key: 'StackSize' } as Partial<FilterEdit>))).toBe(false)
    expect(isValidEdit(edit({ key: 'constructor', value: null } as Partial<FilterEdit>))).toBe(false)
    expect(isValidEdit(edit({ bound: 'less' } as unknown as Partial<FilterEdit>))).toBe(false)
  })

  it('folds two edits of one bound into one', () => {
    const list = addEdit(addEdit([], edit()), edit({ id: 2, value: 5 } as Partial<FilterEdit>))
    expect(list).toHaveLength(1)
    expect((list[0] as { value: number }).value).toBe(5)
    expect(addEdit(list, edit({ id: 3, bound: 'min', value: 2 } as Partial<FilterEdit>))).toHaveLength(2)
  })

  it('changes the cluster rule NeverSink ships', () => {
    const doc = parseFilter(neverSink('1-REGULAR'))
    const [r] = applyEdits(doc, [edit(), edit({ id: 2, tier: 'optimalhighlarge', key: 'ItemLevel', bound: 'min', value: 82 } as Partial<FilterEdit>)])
    expect(r.ok).toBe(true)
    expect(numberChecks(blocksOf(doc, 'jewels->cluster', 'highlarge')[0].conditions)).toContainEqual({ key: 'EnchantmentPassiveNum', bound: 'max', value: 6 })
    expect(numberChecks(blocksOf(doc, 'jewels->cluster', 'optimalhighlarge')[0].conditions)).toContainEqual({ key: 'ItemLevel', bound: 'min', value: 82 })
    expect(serializeFilter(doc)).toMatch(/EnchantmentPassiveNum <= 6\r?\n\tBaseType == "Large Cluster Jewel"/)
    expect(describeEdit(edit())).toMatch(/passives up to 6/)
  })
})

describe('cluster jewels in the editor', () => {
  it.each(LEVELS)('%s: lists the rules by size, numbers first', (level) => {
    const g = buildTree(parseFilter(neverSink(level))).flatMap(s => s.groups).find(x => x.type === 'jewels->cluster')!
    const l = buildLadder(g.tiers)
    // Two numbers (passives, item level) tell the rules apart: no one order.
    expect(l.axis).toBeNull()
    expect(l.specials).toEqual([])
    expect([...new Set(l.rows.map(r => r.section))]).toEqual(['Large Cluster Jewel', 'Medium Cluster Jewel', 'Small Cluster Jewel'])
  })

  it('lists by numbers only the groups that two numbers split', () => {
    const groups = buildTree(parseFilter(neverSink('2-SEMI-STRICT'))).flatMap(x => x.groups)
    const listed = groups.filter(g => g.tiers.length > 1 && buildLadder(g.tiers).axis == null && buildLadder(g.tiers.filter(t => !t.blocks[0].continue)).rows.length > 1)
      .map(g => g.type)
    // Gems by quality and the hide layer by area level keep their order: the
    // second number sits on a few of their rules only.
    for (const kept of ['maps', 'gems->generic', 'crafting->qualityperfection', 'hidelayer']) expect(listed).not.toContain(kept)
    for (const two of ['jewels->cluster', 'jewels->clustereco', 'endgameflasks', 'leveling->weaponprogression']) expect(listed).toContain(two)
  })

  it('keeps one order where one number does', () => {
    const g = buildTree(parseFilter(neverSink('1-REGULAR'))).flatMap(s => s.groups).find(x => x.type === 'maps')!
    expect(buildLadder(g.tiers).axis).toBe('MapTier')
  })
})
