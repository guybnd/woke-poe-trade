// Plain names for tags, and the add-item box on a tier.
import { describe, it, expect } from 'vitest'
import { groupLabel, sectionLabel, tierLabel } from '@/web/woke/loot-filter/names'
import { addSearch, byPrice, groupName, pickBases } from '@/web/woke/loot-filter/groups'
import { addEdit, applyEdits, describeEdit, moveTargets } from '@/web/woke/loot-filter/edits'
import { matchItem } from '@/web/woke/loot-filter/match'
import { parseFilter, ruleLabel, serializeFilter } from '@/web/woke/loot-filter/parse'
import type { ItemFacts } from '@/web/woke/loot-filter/item-facts'
import { LEVELS, neverSink } from '../helpers/neversink'

describe('tier names', () => {
  it.each([
    ['t1exalted', 'Tier 1'], ['t3annul', 'Tier 3'], ['t2', 'Tier 2'], ['t1top', 'Tier 1 top'], ['t3stackedex', 'Tier 3 stackedex'],
    ['t1_86', 'Tier 1, item level 86'], ['n12_i84_t1', '12 nodes, item level 84, tier 1'], ['any86', 'Any, item level 86'], ['t5r1', 'Item tier 5, rank 1'], ['any5', 'Any base, item tier 4+'],
    ['stack3', 'Stack tier 3'], ['restex', 'The rest'], ['any', 'Any'], ['hideable', 'Can be hidden'],
    ['#abc12', 'Rule'], ['weapon_phys', 'Weapon phys']
  ])('%s reads %s', (tag, name) => {
    expect(tierLabel(tag)).toBe(name)
  })

  it.each(LEVELS)('two tiers of a group never read the same at %s', (level) => {
    const doc = parseFilter(neverSink(level))
    const clashes: string[] = []
    for (const type of new Set(doc.blocks.map(b => b.type!))) {
      const tiers = [...new Set(doc.blocks.filter(b => b.type === type).map(b => b.tier!))]
      const names = tiers.map(tierLabel)
      if (new Set(names).size !== names.length) clashes.push(`${type}: ${tiers.join()}`)
    }
    expect(clashes).toEqual([])
  })

  it('no raw tag reads like one', () => {
    const doc = parseFilter(neverSink('1-REGULAR'))
    for (const b of doc.blocks) {
      expect(groupLabel(b.type!)).toMatch(/^[A-Z0-9]/)
      expect(groupLabel(b.type!)).not.toContain('->')
    }
  })
})

describe('group names', () => {
  it('reads plainly', () => {
    expect(groupLabel('rareid')).toBe('Identified rares')
    expect(groupLabel('currency')).toBe('General currency')
    expect(groupLabel('currency->deadmansulphur')).toBe('Currency › Dead man\'s sulphur')
    expect(groupLabel('leveling->normalmagic->3l')).toBe('Levelling › Normal and magic › 3l')
    expect(groupName('woke->own')).toBe('Your own rules')
    expect(ruleLabel('rareid', 'weapon_phys')).toBe('Identified rares › Weapon phys')
    expect(ruleLabel('currency', 't1exalted')).toBe('General currency › Tier 1')
  })

  it('leaves mixed-case chapter titles alone and calms capitals', () => {
    expect(sectionLabel('IDENTIFIED MOD FILTERING')).toBe('Identified mod filtering')
    expect(sectionLabel('Exotic Bases')).toBe('Exotic Bases')
  })
})

describe('picking chips', () => {
  const list = ['a', 'b', 'c', 'd', 'e']

  it('a click picks or unpicks, keeping the others', () => {
    expect(pickBases(list, [], 'b', false, null)).toEqual(['b'])
    expect(pickBases(list, ['b'], 'd', false, 'b')).toEqual(['b', 'd'])
    expect(pickBases(list, ['b', 'd'], 'b', false, 'd')).toEqual(['d'])
  })

  it('shift picks the run from the last one clicked, either way', () => {
    expect(pickBases(list, ['b'], 'd', true, 'b')).toEqual(['b', 'c', 'd'])
    expect(pickBases(list, ['d'], 'b', true, 'd')).toEqual(['d', 'b', 'c'])
    expect(pickBases(list, ['e'], 'a', true, 'b')).toEqual(['e', 'a', 'b'])
  })

  it('shift with nothing to run from is a plain click', () => {
    expect(pickBases(list, [], 'c', true, null)).toEqual(['c'])
    expect(pickBases(list, [], 'c', true, 'gone')).toEqual(['c'])
  })
})

describe('sorting chips by price', () => {
  it('puts the most valuable first and no price last, otherwise as they were', () => {
    const prices: Record<string, number> = { b: 5, c: 90, d: 5 }
    expect(byPrice(['a', 'b', 'c', 'd', 'e'], x => prices[x] ?? null)).toEqual(['c', 'b', 'd', 'a', 'e'])
    expect(byPrice(['x', 'y'], () => null)).toEqual(['x', 'y'])
  })
})

describe('adding an item to a tier', () => {
  const source = [
    'Hide # $type->scarabs $tier->t4', '\tBaseType == "Rusted Ambush Scarab" "Rusted Abyss Scarab"', '',
    'Show # $type->scarabs $tier->t2', '\tBaseType == "Polished Ambush Scarab"', '',
    '#Show # $type->scarabs $tier->t9', '#\tBaseType == "Off Scarab"', '',
    'Show # $type->other $tier->x', '\tBaseType == "Ambush Mitts"', '',
    'Show # $type->scarabs $tier->t3', '\tBaseType == "Gilded Scarab"', ''
  ].join('\n')

  it('finds items by any word, best match first, without the tier\'s own', () => {
    const doc = parseFilter(source)
    expect(addSearch(doc, 'scarabs', 't2', 'ambush').map(r => r.base)).toEqual(['Ambush Mitts', 'Rusted Ambush Scarab'])
    expect(addSearch(doc, 'scarabs', 't2', 'r')).toEqual([])
    expect(addSearch(doc, 'scarabs', 't2', '   ')).toEqual([])
  })

  it('says where each one sits now', () => {
    const doc = parseFilter(source)
    const [rusted] = addSearch(doc, 'scarabs', 't2', 'rusted amb')
    expect(rusted).toMatchObject({ base: 'Rusted Ambush Scarab', sameGroup: true })
    expect(rusted.block?.tier).toBe('t4')
    const [mitts] = addSearch(doc, 'scarabs', 't3', 'mitts')
    expect(mitts.sameGroup).toBe(false)
    expect(mitts.caughtBy?.tier).toBe('x')
    expect(addSearch(doc, 'scarabs', 't2', 'mitts')[0].caughtBy).toBeNull()
  })

  it('also finds any item in the game, after what the filter lists', () => {
    const doc = parseFilter(source)
    const found = addSearch(doc, 'scarabs', 't2', 'ambush', ['Ambush Ring', 'Ambush Mitts'])
    expect(found.map(r => [r.base, r.block?.tier ?? null])).toEqual([['Ambush Mitts', 'x'], ['Ambush Ring', null], ['Rusted Ambush Scarab', 't4']])
  })

  it('moving one in takes it out of its old tier', () => {
    const doc = parseFilter(source)
    const [r] = applyEdits(doc, [{ id: 1, kind: 'move', type: 'scarabs', base: 'Rusted Ambush Scarab', from: 't4', to: 't2' }])
    expect(r.ok).toBe(true)
    const f: ItemFacts = { name: 'x', baseType: 'Rusted Ambush Scarab', influences: [], explicitModNames: [] }
    expect(matchItem(parseFilter(serializeFilter(doc)), f).final?.block.tier).toBe('t2')
  })

  it('an item from outside the group is added and stays in its own group', () => {
    const doc = parseFilter(source)
    const [r] = applyEdits(doc, [{ id: 1, kind: 'move', type: 'scarabs', base: 'Ambush Mitts', from: '', to: 't2' }])
    expect(r.ok).toBe(true)
    const out = parseFilter(serializeFilter(doc))
    expect(out.blocks.find(b => b.tier === 't2')!.conditions[0].values).toContain('Ambush Mitts')
    expect(out.blocks.find(b => b.tier === 'x')!.conditions[0].values).toContain('Ambush Mitts')
    expect(describeEdit({ id: 1, kind: 'move', type: 'scarabs', base: 'Ambush Mitts', from: '', to: 't2' })).toBe('Ambush Mitts: added to Scarabs › Tier 2')
  })

  it('an item in no rule at all can be added', () => {
    const doc = parseFilter(source)
    expect(applyEdits(doc, [{ id: 1, kind: 'move', type: 'scarabs', base: 'New League Scarab', from: '', to: 't2' }])[0].ok).toBe(true)
    const f: ItemFacts = { name: 'x', baseType: 'New League Scarab', influences: [], explicitModNames: [] }
    expect(matchItem(parseFilter(serializeFilter(doc)), f).final?.block.tier).toBe('t2')
  })

  it('taking an item off a tier leaves its other tiers, and an empty tier is commented out', () => {
    const doc = parseFilter(source)
    const res = applyEdits(doc, [
      { id: 1, kind: 'move', type: 'scarabs', base: 'Rusted Ambush Scarab', from: 't4', to: '' },
      { id: 2, kind: 'move', type: 'scarabs', base: 'Polished Ambush Scarab', from: 't2', to: '' }
    ])
    expect(res.every(r => r.ok)).toBe(true)
    const out = parseFilter(serializeFilter(doc))
    expect(out.blocks.find(b => b.tier === 't4')!.conditions[0].values).toEqual(['Rusted Abyss Scarab'])
    expect(out.blocks.find(b => b.tier === 't2')!.disabled).toBe(true)
    expect(describeEdit({ id: 1, kind: 'move', type: 'scarabs', base: 'X', from: 't4', to: '' })).toBe('X: taken off Scarabs › Tier 4')
  })

  it('taking off an item already gone counts as done, so it never asks for a new home', () => {
    const doc = parseFilter(source)
    expect(applyEdits(doc, [{ id: 1, kind: 'move', type: 'scarabs', base: 'Gone', from: 't4', to: '' }])[0].ok).toBe(true)
  })

  it('names its real tier when an own rule or another group lists it first', () => {
    const doc = parseFilter([
      'Show # $type->woke->own $tier->divine-1', '\tBaseType == "Divine Orb"', '',
      'Show # $type->other $tier->o', '\tBaseType == "Divine Orb"', '',
      'Show # $type->currency $tier->t1', '\tBaseType == "Mirror"', '',
      'Show # $type->currency $tier->t2', '\tBaseType == "Divine Orb"', ''
    ].join('\n'))
    const [r] = addSearch(doc, 'currency', 't1', 'divine')
    expect(r.sameGroup).toBe(true)
    expect(r.block?.tier).toBe('t2')
    expect(r.caughtBy?.type).toBe('woke->own')
  })

  it('judges what comes first by the tier\'s live rule', () => {
    const doc = parseFilter([
      '#Show # $type->c $tier->t1', '#\tBaseType == "Off"', '',
      'Show # $type->other $tier->o', '\tBaseType == "Item"', '',
      'Show # $type->c $tier->t1', '\tBaseType == "On"', ''
    ].join('\n'))
    expect(addSearch(doc, 'c', 't1', 'item')[0].caughtBy?.tier).toBe('o')
  })

  it('adding then taking off in one go undoes it', () => {
    let list = addEdit([], { id: 1, kind: 'move', type: 'c', base: 'X', from: '', to: 't1' })
    list = addEdit(list, { id: 2, kind: 'move', type: 'c', base: 'X', from: 't1', to: '' })
    expect(list).toEqual([])
  })

  it('moveTargets is unchanged by an add', () => {
    const doc = parseFilter(source)
    expect(moveTargets(doc, 'scarabs')).toEqual(['t4', 't2', 't9', 't3'])
  })
})
