// Exchange items poe.ninja prices show that price first; the exchange search waits for a click.
import { describe, expect, it } from 'vitest'
import { holdBulkSearch, fixedPriceItem, ninjaPrice, ninjaTotal, divineTenths, chaosOrbRow, flipTitle, ninjaRates } from '@/web/woke/price-insight/ninja-first'

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

describe('ninjaPrice', () => {
  it('reads cheap items as how many a chaos and a divine buy', () => {
    expect(ninjaPrice(0.003565, 180)).toEqual({ main: '281 per c', each: false, sub: '50,491 per div', flip: 'div' })
  })
  it('reads chaos items with how many a divine buys', () => {
    expect(ninjaPrice(34, 180)).toEqual({ main: '34c', each: true, sub: '0.19 div', flip: 'div' })
    expect(ninjaPrice(12, 180)).toEqual({ main: '12c', each: true, sub: '15 per div', flip: 'div' })
  })
  it('reads div items in div with the chaos under it', () => {
    expect(ninjaPrice(900, 180)).toEqual({ main: '5 div', each: true, sub: '900c', flip: null })
  })
  it('shows a dash, not infinity, for no price', () => {
    expect(ninjaPrice(0, 180).main).toBe('—')
    expect(ninjaPrice(NaN, 180).main).toBe('—')
  })
  it('reads a Divine Orb in chaos', () => {
    expect(ninjaPrice(180, 180, true)).toEqual({ main: '180c', each: true, sub: null, flip: null })
  })
  it('reads items under a divine per divine when asked, with chaos under it', () => {
    expect(ninjaPrice(0.003565, 180, false, 'div')).toEqual({ main: '50,491 per div', each: false, sub: '281 per c', flip: 'c' })
    expect(ninjaPrice(12, 180, false, 'div')).toEqual({ main: '15 per div', each: false, sub: '12c', flip: 'c' })
    expect(ninjaPrice(34, 180, false, 'div')).toEqual({ main: '0.19 div', each: true, sub: '34c', flip: 'c' })
  })
  it('keeps a divine price in div, and a Divine Orb in chaos, whatever the unit', () => {
    expect(ninjaPrice(900, 180, false, 'div').main).toBe('5 div')
    expect(ninjaPrice(180, 180, true, 'div').main).toBe('180c')
  })
  it('has no switch without a divine rate', () => {
    expect(ninjaPrice(0.5, undefined, false, 'div')).toEqual({ main: '2 per c', each: false, sub: null, flip: null })
    expect(ninjaPrice(34, undefined)).toEqual({ main: '34c', each: true, sub: null, flip: null })
  })
  it('hints what a click shows', () => {
    expect(flipTitle(ninjaPrice(34, 180))).toBe('Click to show it in divines')
    expect(flipTitle(ninjaPrice(34, 180, false, 'div'))).toBe('Click to show it in chaos')
    expect(flipTitle(ninjaPrice(900, 180))).toBeUndefined()
  })
  it('totals a cheap stack without rounding it to 0', () => {
    expect(ninjaTotal(19 * 0.003565, 180)).toBe('0.068c')
    expect(ninjaTotal(2 * 0.002, 180)).toBe('0.004c')
    expect(ninjaTotal(238, 180)).toBe('1.3 div')
  })
  it('splits a divine into chaos', () => {
    const tenths = divineTenths(180)
    expect(tenths).toHaveLength(10)
    expect(tenths[0]).toEqual({ div: '0.1 div', chaos: '18c' })
    expect(tenths[2]).toEqual({ div: '0.3 div', chaos: '54c' })
    expect(tenths[9]).toEqual({ div: '1 div', chaos: '180c' })
    // A Chaos Orb, the other way round.
    expect(divineTenths(2500)[6].chaos).toBe('1,750c')
    expect(chaosOrbRow({ info: { refName: 'Chaos Orb', namespace: 'ITEM' } }, 180)?.chaos).toBe(1)
    // Without poe.ninja's rate (not loaded, or a league it doesn't cover) it checks like other currency.
    expect(chaosOrbRow({ info: { refName: 'Chaos Orb', namespace: 'ITEM' } }, undefined)).toBeNull()
    expect(chaosOrbRow({ info: { refName: 'Divine Orb', namespace: 'ITEM' } }, 180)).toBeNull()
  })
})

describe('ninjaRates', () => {
  const t = (r: { left: { n: string, of: string }, right: { n: string, of: string } }) => `${r.left.n} ${r.left.of} = ${r.right.n} ${r.right.of}`
  it('gives the count to whichever side is worth less', () => {
    expect(ninjaRates(1 / 1.1, 175).map(t)).toEqual(['1 c = 1.1 item', '1 div = 193 item'])
    expect(ninjaRates(34, 180).map(t)).toEqual(['1 item = 34 c', '1 div = 5.3 item'])
    expect(ninjaRates(900, 180).map(t)).toEqual(['1 item = 900 c', '1 item = 5 div'])
  })
  it('leaves out the line a Divine Orb or Chaos Orb would price against itself', () => {
    expect(ninjaRates(180, 180, 'divine').map(t)).toEqual(['1 item = 180 c'])
    expect(ninjaRates(1, 180, 'chaos').map(t)).toEqual(['1 div = 180 item'])
  })
  it('has no divine line without a rate, and nothing without a price', () => {
    expect(ninjaRates(34, undefined).map(t)).toEqual(['1 item = 34 c'])
    expect(ninjaRates(0, 180)).toEqual([])
  })
})
