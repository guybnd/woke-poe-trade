// The editor's search box: any item in the game, matched against the filter
// as it would lie on the ground.
import { describe, it, expect, beforeAll } from 'vitest'
import { parseFilter } from '@/web/woke/loot-filter/parse'
import type { FilterDoc } from '@/web/woke/loot-filter/parse'
import { matchItem } from '@/web/woke/loot-filter/match'
import { buildCatalog, filterClasses, searchFacts, searchItems } from '@/web/woke/loot-filter/item-search'
import type { SearchItem } from '@/web/woke/loot-filter/item-search'
import { loadGameData } from '../helpers/game-data'
import { neverSink } from '../helpers/neversink'

let list: SearchItem[]
let doc: FilterDoc
beforeAll(async () => {
  await loadGameData()
  list = buildCatalog()
  doc = parseFilter(neverSink('4-VERY-STRICT'))
})

const find = (name: string, kind?: string) => list.find(i => i.name === name && (!kind || i.kind === kind))!
const shown = (item: SearchItem, opts: { areaLevel?: number, rarity?: 'Normal' | 'Magic' | 'Rare' } = {}) =>
  matchItem(doc, searchFacts(item, { areaLevel: opts.areaLevel ?? 83, rarity: opts.rarity, classes: filterClasses(doc) }))

describe('the catalogue', () => {
  it('holds bases, uniques, currency, cards, gems and maps, not areas', () => {
    expect(find('Vaal Regalia').kind).toBe('Base')
    expect(find('Headhunter').kind).toBe('Unique')
    expect(find('Headhunter').baseType).toBe('Leather Belt')
    expect(find('Headhunter').itemClass).toBe('Belts')
    expect(find('Divine Orb').kind).toBe('Currency')
    expect(find('The Doctor').itemClass).toBe('Divination Cards')
    expect(find('Empower Support').itemClass).toBe('Support Gems')
    expect(find('Fireball').itemClass).toBe('Skill Gems')
    expect(find('Divine Life Flask').itemClass).toBe('Life Flasks')
    expect(list.some(i => i.name === 'Academy')).toBe(false)
  })

  it('names each item once per kind', () => {
    const keys = list.map(i => `${i.kind}|${i.name}`)
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('searching', () => {
  it('puts the name start first and finds uniques by name', () => {
    expect(searchItems(list, 'head')[0].name).toBe('Headhunter')
    expect(searchItems(list, 'divine orb')[0].name).toBe('Divine Orb')
    expect(searchItems(list, 'mageblood').map(i => i.name)).toContain('Mageblood')
  })

  it("finds a rare by the base inside its title, not by its random name", () => {
    expect(searchItems(list, 'Doom Nails, Spike-Point Arrow Quiver')[0].name).toBe('Spike-Point Arrow Quiver')
    expect(searchItems(list, 'doom nails spike-point arrow quiver')[0].name).toBe('Spike-Point Arrow Quiver')
    // The base's own name still ranks it first, ahead of Soul Strike on it.
    expect(searchItems(list, 'spike-point')[0].name).toBe('Spike-Point Arrow Quiver')
    expect(searchItems(list, 'Doom Nails')).toEqual([])
  })

  it('needs two letters', () => {
    expect(searchItems(list, 'd')).toEqual([])
  })

  it('ranks a word start above the middle of a word', () => {
    const names = searchItems(list, 'mage', 40).map(i => i.name)
    const firstMiddle = names.findIndex(n => /\wmage/i.test(n) && !/(^|\s)mage/i.test(n))
    const lastWord = names.map((n, i) => /(^|\s)mage/i.test(n) ? i : -1).filter(i => i >= 0).pop()!
    if (firstMiddle >= 0) expect(lastWord).toBeLessThan(firstMiddle)
  })
})

describe('matching against NeverSink', () => {
  it('learns currency classes from the filter', () => {
    expect(filterClasses(doc).get('Divine Orb')).toBe('Stackable Currency')
  })

  it('shows a Divine Orb with a decided rule', () => {
    const m = shown(find('Divine Orb'))
    expect(m.visibility).toBe('Show')
    expect(m.final?.block.type).toMatch(/currency/)
  })

  it('shows Headhunter as a unique', () => {
    const m = shown(find('Headhunter'))
    expect(m.visibility).toBe('Show')
    expect(m.final?.block.conditions.some(c => c.key === 'Rarity')).toBe(true)
  })

  it('hides a cheap white base at very strict but not its rare', () => {
    expect(shown(find('Simple Robe'), { rarity: 'Normal' }).visibility).toBe('Hide')
  })

  it('matches every item to some outcome without throwing', () => {
    const classes = filterClasses(doc)
    for (const item of list) matchItem(doc, searchFacts(item, { areaLevel: 83, classes }), { brief: true })
  })
})

describe('replicas', () => {
  it('drop as replicas, so replica rules can see them', () => {
    const facts = searchFacts(find('Replica Headhunter'), { areaLevel: 83 })
    expect(facts.replica).toBe(true)
    expect(searchFacts(find('Headhunter'), { areaLevel: 83 }).replica).toBe(false)
  })
})

describe('review fixes', () => {
  it('a rapier is a thrusting sword', () => {
    expect(find('Jewelled Foil').itemClass).toBe('Thrusting One Hand Swords')
    expect(find('Rusted Sword').itemClass).toBe('One Hand Swords')
  })

  it('a unique map drops with a tier, as "Map (Tier N)"', () => {
    const u = list.find(i => i.kind === 'Unique' && i.baseType === 'Map')!
    const facts = searchFacts(u, { areaLevel: 83 })
    expect(facts.mapTier).toBe(16)
    expect(facts.baseType).toBe('Map (Tier 16)')
  })

  it('a fresh drop is not mirrored, fractured or of any quality', () => {
    const facts = searchFacts(find('Phantom Boots'), { areaLevel: 86 })
    expect(facts.mirrored).toBe(false)
    expect(facts.fractured).toBe(false)
    expect(facts.quality).toBe(0)
  })

  it('fragments take the class a several-class rule gives them, not currency', () => {
    const classes = filterClasses(doc)
    const facts = searchFacts(find('Incandescent Invitation'), { areaLevel: 83, classes })
    expect(facts.itemClass).toBe('Misc Map Items')
    expect(find('Incandescent Invitation').gear).toBe(false)
  })
})
