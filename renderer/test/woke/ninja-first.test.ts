// Exchange items poe.ninja prices show that price first; the exchange search waits for a click.
import { describe, expect, it } from 'vitest'
import { holdBulkSearch, fixedPriceItem } from '@/web/woke/price-insight/ninja-first'

const base = { api: 'bulk' as const, enabled: undefined, live: false, chaos: 34 }

describe('holdBulkSearch', () => {
  it('holds an exchange item poe.ninja prices, with the setting unset', () => {
    expect(holdBulkSearch(base)).toBe(true)
  })

  it('searches when the setting is off', () => {
    expect(holdBulkSearch({ ...base, enabled: false })).toBe(false)
    expect(holdBulkSearch({ ...base, enabled: true })).toBe(true)
  })

  it('searches when the check came from inside the overlay', () => {
    expect(holdBulkSearch({ ...base, live: true })).toBe(false)
  })

  it('searches when poe.ninja has no price', () => {
    expect(holdBulkSearch({ ...base, chaos: null })).toBe(false)
    expect(holdBulkSearch({ ...base, chaos: 0 })).toBe(false)
  })

  it('never holds an item search (rares, uniques)', () => {
    expect(holdBulkSearch({ ...base, api: 'trade' })).toBe(false)
  })
})

describe('fixedPriceItem', () => {
  it('takes cards, beasts and fixed items poe.ninja prices by name', () => {
    expect(fixedPriceItem({ info: { namespace: 'DIVINATION_CARD', refName: 'The Doctor' } })).toBe(true)
    expect(fixedPriceItem({ info: { namespace: 'CAPTURED_BEAST', refName: 'Fenumal Plagued Arachnid' } })).toBe(true)
    expect(fixedPriceItem({ info: { namespace: 'ITEM', refName: 'Decaying Reliquary Key' } })).toBe(true)
  })

  it('leaves out exchange items, craftable bases, uniques, gems and items priced by their text', () => {
    expect(fixedPriceItem({ info: { namespace: 'ITEM', refName: 'Divine Orb', tradeTag: 'divine' } })).toBe(false)
    expect(fixedPriceItem({ info: { namespace: 'ITEM', refName: 'Leather Belt', craftable: {} } })).toBe(false)
    expect(fixedPriceItem({ info: { namespace: 'UNIQUE', refName: 'Headhunter' } })).toBe(false)
    expect(fixedPriceItem({ info: { namespace: 'GEM', refName: 'Enlighten Support' } })).toBe(false)
    expect(fixedPriceItem({ info: { namespace: 'ITEM', refName: 'Chronicle of Atzoatl' } })).toBe(false)
  })

  it('leaves out fixed items whose price follows their text', () => {
    expect(fixedPriceItem({ info: { namespace: 'ITEM', refName: 'Forbidden Tome' }, areaLevel: 70 })).toBe(false)
    expect(fixedPriceItem({ info: { namespace: 'ITEM', refName: "Facetor's Lens" }, storedExperience: 5e9 })).toBe(false)
    expect(fixedPriceItem({ info: { namespace: 'ITEM', refName: 'Scrying Orb' }, mapArea: {} })).toBe(false)
    expect(fixedPriceItem({ info: { namespace: 'ITEM', refName: 'Perfect Hydra' }, itemLevel: 84 })).toBe(false)
    expect(fixedPriceItem({ info: { namespace: 'ITEM', refName: 'Ancient Wombgift' }, itemLevel: 84 })).toBe(true)
  })

  it('holds the trade search of a fixed item', () => {
    expect(holdBulkSearch({ ...base, api: 'trade', fixed: true })).toBe(true)
  })
})
