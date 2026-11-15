// The Market window: categories from poe.ninja's dense overview, rows with a
// 7-day line, sorting, filtering, and moving old configs over to Movers.
import { describe, it, expect } from 'vitest'
import { categoryGroups, categoryLabel, filterRows, parseCategory, sortRows, trendLine } from '@/web/woke/market/browser'
import { MARKET_BROWSER_TYPE, MARKET_TRACKER_TYPE, splitMarketWindow } from '@/web/woke/market/widget'
import type { DenseChunk } from '@/web/woke/market/parse'
import { slugForType } from '@/web/woke/market/types'

function chunk (url: string, entries: object[]): DenseChunk {
  return { ns: 'ITEM', url, lines: `{"type":"x","lines":[${entries.map(e => JSON.stringify(e)).join(',')}]}` }
}

const currency = chunk('currency', [
  { name: 'Divine Orb', chaos: 112, graph: [null, null, null, null, null, 0, 115.4] },
  { name: 'Mirror Shard', chaos: 1763, graph: [null, null, null, null, null, 0, 74.66] },
  { name: 'Mirror of Kalandra', chaos: 18093, graph: [null, null, null, null, null, null, 18.24] },
  { name: 'Mirror Shard', chaos: 1700, graph: [] }
])

describe('market browser', () => {
  it('groups categories like poe.ninja and skips empty and base types', () => {
    const groups = categoryGroups([
      currency,
      chunk('scarabs', []),
      chunk('unique-armours', [{ name: 'Kaom\'s Heart', variant: 'Glorious Plate', chaos: 50, graph: [] }]),
      chunk('base-types', [{ name: 'Vaal Regalia', chaos: 1, graph: [] }]),
      // A category APT learned when prices loaded, not in the known list.
      chunk(slugForType('Wombgift'), [{ name: 'Mysterious Wombgift', chaos: 2, graph: [] }])
    ])
    expect(groups.map(g => g.label)).toEqual(['General', 'Equipment & gems'])
    expect(groups[0].categories.map(c => [c.type, c.count])).toEqual([['Currency', 4], ['Wombgift', 1]])
    expect(groups[1].categories[0].label).toBe('Unique Armours')
    expect(groups[1].categories[0].sample).toEqual(["Kaom's Heart"])
  })

  it('names categories', () => {
    expect(categoryLabel('UniqueWeapon')).toBe('Unique Weapons')
    expect(categoryLabel('DivinationCard')).toBe('Divination Cards')
    expect(categoryLabel('Essence')).toBe('Essences')
  })

  it('reads rows, keeps the first of a repeated name, and works out the change', () => {
    const rows = parseCategory('Currency', currency)
    expect(rows.map(r => r.name)).toEqual(['Divine Orb', 'Mirror Shard', 'Mirror of Kalandra'])
    const shard = rows[1]
    expect(shard.trend).toHaveLength(2)
    expect(shard.trend[1]).toBeCloseTo(1763)
    expect(shard.change).toBeCloseTo(74.66, 1)
    expect(shard.dayChange).toBeCloseTo(74.66, 1)
    expect(rows[2].dayChange).toBeNull()
    // One priced day: no line, but poe.ninja's change still shows.
    expect(rows[2].trend).toHaveLength(1)
    expect(rows[2].change).toBeCloseTo(18.24)
    // Only zeros: not enough data.
    expect(parseCategory('Currency', chunk('currency', [{ name: 'Soul Core of Might', chaos: 560, graph: [null, null, null, null, null, null, 0] }]))[0].change).toBeNull()
  })

  it('makes no line from a broken graph', () => {
    expect(trendLine(10, null)).toEqual([])
    expect(trendLine(10, [1, 2, null])).toEqual([])
    expect(trendLine(10, [-100, 0])).toEqual([10])
  })

  it('sorts by value, name and change, with no change last', () => {
    const rows = parseCategory('Currency', currency)
    expect(sortRows(rows, 'value', true).map(r => r.name)).toEqual(['Mirror of Kalandra', 'Mirror Shard', 'Divine Orb'])
    expect(sortRows(rows, 'name', false).map(r => r.name)).toEqual(['Divine Orb', 'Mirror of Kalandra', 'Mirror Shard'])
    expect(sortRows(rows, 'change', true).map(r => r.name)).toEqual(['Divine Orb', 'Mirror Shard', 'Mirror of Kalandra'])
    expect(sortRows(rows, 'change', false).map(r => r.name)).toEqual(['Mirror of Kalandra', 'Mirror Shard', 'Divine Orb'])
  })

  it('filters by words in any order, in the name or the variant', () => {
    const rows = parseCategory('UniqueArmour', chunk('unique-armours', [
      { name: 'Kaom\'s Heart', variant: 'Glorious Plate', chaos: 50, graph: [] },
      { name: 'Tabula Rasa', variant: 'Simple Robe', chaos: 10, graph: [] }
    ]))
    expect(filterRows(rows, 'plate kaom').map(r => r.name)).toEqual(['Kaom\'s Heart'])
    expect(filterRows(rows, '  ')).toHaveLength(2)
  })
})

describe('splitting the old Market window', () => {
  function config () {
    return [
      { wmId: 1, wmType: 'menu', pinned: [5, 3, 7] },
      { wmId: 3, wmType: MARKET_TRACKER_TYPE, wmTitle: 'Market', unit: 'div' },
      { wmId: 7, wmType: 'woke-boss-runs' }
    ] as Array<Record<string, unknown> & { wmId: number, wmType: string }>
  }
  const anchor = () => ({ pos: 'tc' as const, x: 50, y: 10 })

  it('adds a hidden Market window just before Movers on the rail', () => {
    const widgets = config()
    splitMarketWindow(widgets, anchor)
    const browser = widgets.find(w => w.wmType === MARKET_BROWSER_TYPE)!
    expect(browser.wmId).toBe(8)
    expect(browser.wmWants).toBe('hide')
    expect(browser.unit).toBe('div')
    expect(widgets[0].pinned).toEqual([5, 8, 3, 7])
    expect(widgets[1].wmTitle).toBe('Movers')
  })

  it('keeps a name you gave the tracker', () => {
    const widgets = config()
    widgets[1].wmTitle = 'Div watch'
    splitMarketWindow(widgets, anchor)
    expect(widgets[1].wmTitle).toBe('Div watch')
  })

  it('does nothing twice, or without a tracker', () => {
    const widgets = config()
    splitMarketWindow(widgets, anchor)
    splitMarketWindow(widgets, anchor)
    expect(widgets.filter(w => w.wmType === MARKET_BROWSER_TYPE)).toHaveLength(1)
    const none = config().filter(w => w.wmType !== MARKET_TRACKER_TYPE)
    splitMarketWindow(none, anchor)
    expect(none.some(w => w.wmType === MARKET_BROWSER_TYPE)).toBe(false)
  })
})
