// The price check's Q tag: rows a catalyst raised, and the item's catalyst quality filter.
import { describe, it, expect, beforeAll } from 'vitest'
import { loadGameData, fixture, parseItem } from '../helpers/game-data'
import { createExactStatFilters, initUiModFilters } from '@/web/price-check/filters/create-stat-filters'
import type { StatFilter } from '@/web/price-check/filters/interfaces'
import { catalystQualityFilter, raisedBy, tagQuality, toggleCatalyst } from '@/web/woke/price-insight/catalyst-filter'
import { ninjaFitsSearch } from '@/web/woke/price-insight/search-scope'
import { ItemRarity, ParsedItem } from '@/parser'
import { catalystBands, onlyCatalysed } from '@/web/ui/catalyst-zone'

function beltStats () {
  const item = parseItem(fixture('items/rare-belt-catalysed.txt'))
  return createExactStatFilters(item, item.statsByType, { searchStatRange: 10, mode: 'props' }) as StatFilter[]
}

describe('catalyst quality filter', () => {
  beforeAll(loadGameData)

  it('finds the item\'s catalyst filter, off and at its quality', () => {
    const quality = catalystQualityFilter(beltStats())!
    expect(quality.tradeId).toEqual(['pseudo.pseudo_jewellery_attribute_quality'])
    expect(quality.disabled).toBe(true)
    expect(quality.roll?.min).toBe(20)
  })

  it('tags only rows the catalyst raised', () => {
    const stats = beltStats()
    const str = stats.find(f => f.text.includes('Strength'))!
    expect(raisedBy(str)).toBe(20)
    expect(raisedBy(catalystQualityFilter(stats)!)).toBeUndefined()
  })

  it('switches the one shared filter on and off', () => {
    const stats = beltStats()
    toggleCatalyst(stats)
    expect(catalystQualityFilter(stats)!.disabled).toBe(false)
    toggleCatalyst(stats)
    expect(catalystQualityFilter(stats)!.disabled).toBe(true)
  })

  it('has no filter on an item without catalyst quality', () => {
    const item = parseItem(fixture('items/rare-ring.txt'))
    const stats = createExactStatFilters(item, item.statsByType, { searchStatRange: 10, mode: 'props' })
    expect(catalystQualityFilter(stats)).toBeUndefined()
  })
})

describe('catalyst tag edges', () => {
  beforeAll(loadGameData)

  it('names the filter\'s edited minimum', () => {
    const stats = beltStats()
    const str = stats.find(f => f.text.includes('Strength'))!
    const quality = catalystQualityFilter(stats)!
    expect(tagQuality(str, quality)).toBe(20)
    quality.roll!.min = 10
    expect(tagQuality(str, quality)).toBe(10)
  })

  it('tags no total with an unraised mod behind it', () => {
    const life = beltStats().find(f => f.sources.length > 1 && f.sources.some(s => s.modifier.info.rollIncr) && f.sources.some(s => !s.modifier.info.rollIncr && s.stat.roll && !s.stat.roll.unscalable))
    if (life) expect(raisedBy(life)).toBeUndefined()
  })

  it('stops counting poe.ninja as a match once the quality is searched', () => {
    const item = parseItem(fixture('items/rare-belt-catalysed.txt'))
    const stats = beltStats()
    const unique = { ...item, rarity: ItemRarity.Unique, isCorrupted: false, isFoulborn: false } as ParsedItem
    expect(ninjaFitsSearch(unique, stats)).toBe(true)
    toggleCatalyst(stats)
    expect(ninjaFitsSearch(unique, stats)).toBe(false)
  })
})

describe('catalysed roll range', () => {
  beforeAll(loadGameData)

  function auxium () {
    const item = parseItem(fixture('items/unique-belt-catalysed.txt'))
    return initUiModFilters(item, { searchStatRange: 10 }).filter((f): f is StatFilter => !('group' in f && f.group))
  }

  it('runs from the uncatalysed minimum to the catalysed maximum', () => {
    const ele = auxium().find(f => f.text.includes('Elemental Damage with Attack Skills'))!
    expect(ele.roll?.value).toBe(30)
    expect(ele.roll?.bounds).toEqual({ min: 20, max: 30 })
    expect(ele.roll?.plain).toEqual({ min: 20, max: 25 })
  })

  it('leaves rows no catalyst raised alone', () => {
    const mana = auxium().find(f => f.text.includes('maximum Mana'))!
    expect(mana.roll?.bounds).toEqual({ min: 45, max: 55 })
    expect(mana.roll?.plain).toBeUndefined()
  })

  it('widens a rare\'s catalysed row the same way', () => {
    // +30(25-35) Strength at 20% shows 36, from a 30 to 42 tier: the slider starts at 25.
    const str = beltStats().find(f => f.text.includes('Strength'))!
    expect(str.roll?.value).toBe(36)
    expect(str.roll?.bounds).toEqual({ min: 25, max: 42 })
  })
})

describe('catalyst-only part of the slider', () => {
  it('stripes the part above the uncatalysed max', () => {
    expect(catalystBands({ min: 20, max: 30 }, { min: 20, max: 25 })).toEqual([{ left: 50, right: 0 }])
    expect(catalystBands({ min: 20, max: 30 }, undefined)).toEqual([])
  })

  it('stripes the part below on a negated row', () => {
    expect(catalystBands({ min: -30, max: -20 }, { min: -25, max: -20 })).toEqual([{ left: 0, right: 50 }])
  })

  it('says when only catalysed items can match', () => {
    const plain = { min: 20, max: 25 }
    const bounds = { min: 20, max: 30 }
    expect(onlyCatalysed(27, undefined, plain, bounds)).toBe('above')
    expect(onlyCatalysed(25, undefined, plain, bounds)).toBeUndefined()
    expect(onlyCatalysed(27, undefined, undefined, bounds)).toBeUndefined()
    // No band below 20 here, and nothing at all past 30.
    expect(onlyCatalysed('', 19, plain, bounds)).toBeUndefined()
    expect(onlyCatalysed(31, undefined, plain, bounds)).toBeUndefined()
    expect(onlyCatalysed('', -27, { min: -25, max: -20 }, { min: -30, max: -20 })).toBe('below')
  })
})
