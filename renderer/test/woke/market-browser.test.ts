// The Market window: categories from poe.ninja's dense overview, rows with a
// 7-day line, sorting, filtering, and moving old configs over to Movers.
import { describe, it, expect } from 'vitest'
import { categoryGroups, categoryLabel, filterRows, parseCategory, sortRows, trendLine } from '@/web/woke/market/browser'
import { MARKET_BROWSER_TYPE, MARKET_TRACKER_TYPE, foldMarketWindow } from '@/web/woke/market/widget'
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

  it('lists Viscera, which is too big for an unknown category, under General', () => {
    const groups = categoryGroups([currency, chunk('viscera', [{ name: "Greater Sirus' Head", variant: 'Area Skills have #% chance to deal Double Damage', chaos: 900, graph: [] }])])
    expect(groups[0].categories.map(c => [c.type, c.label])).toEqual([['Currency', 'Currency'], ['Viscera', 'Viscera']])
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

describe('one Market window with tabs', () => {
  type W = Record<string, unknown> & { wmId: number, wmType: string }
  const menu = (pinned: number[]): W => ({ wmId: 1, wmType: 'menu', pinned })

  it('folds a separate Market window into the tracker, keeping its settings and rail spot', () => {
    const widgets: W[] = [
      menu([5, 8, 3, 7]),
      { wmId: 3, wmType: MARKET_TRACKER_TYPE, wmTitle: 'Movers', view: 'watchlist', watchlist: [{ type: 'Currency', name: 'Divine Orb', variant: '' }] },
      { wmId: 8, wmType: MARKET_BROWSER_TYPE, wmTitle: 'Market', category: 'Essence', sort: 'name', desc: false, hideThin: true }
    ]
    foldMarketWindow(widgets)
    expect(widgets.some(w => w.wmType === MARKET_BROWSER_TYPE)).toBe(false)
    const tracker = widgets.find(w => w.wmType === MARKET_TRACKER_TYPE)!
    expect(tracker).toMatchObject({ wmTitle: 'Market', view: 'prices', priceCategory: 'Essence', priceSort: 'name', priceDesc: false, priceSkipThin: true })
    expect(tracker.watchlist).toHaveLength(1)
    expect(widgets[0].pinned).toEqual([5, 3, 7])
  })

  it('folds every copy, and keeps the rail name and panel size', () => {
    const widgets: W[] = [
      { wmId: 1, wmType: 'menu', pinned: [8, 9], labels: { 8: 'Prices' } },
      { wmId: 3, wmType: MARKET_TRACKER_TYPE, wmTitle: 'Movers', wokeSizes: { main: { w: 400 } } },
      { wmId: 8, wmType: MARKET_BROWSER_TYPE, corrupted: 'only', wokeSizes: { main: { w: 700 } } },
      { wmId: 9, wmType: MARKET_BROWSER_TYPE }
    ]
    foldMarketWindow(widgets)
    expect(widgets.map(w => w.wmType)).toEqual(['menu', MARKET_TRACKER_TYPE])
    expect(widgets[0]).toMatchObject({ pinned: [3], labels: { 3: 'Prices' } })
    expect(widgets[1]).toMatchObject({ priceCorrupted: 'only', wokeSizes: { main: { w: 400 }, prices: { w: 700 } } })
  })

  it('moves the rail pin over when only the price list was pinned', () => {
    const widgets: W[] = [menu([8]), { wmId: 3, wmType: MARKET_TRACKER_TYPE, wmTitle: 'Movers' }, { wmId: 8, wmType: MARKET_BROWSER_TYPE }]
    foldMarketWindow(widgets)
    expect(widgets[0].pinned).toEqual([3])
  })

  it('turns a lone price list into the Market window', () => {
    const widgets: W[] = [menu([8]), { wmId: 8, wmType: MARKET_BROWSER_TYPE, wmTitle: 'Market', category: 'Oil' }]
    foldMarketWindow(widgets)
    expect(widgets[1]).toMatchObject({ wmId: 8, wmType: MARKET_TRACKER_TYPE, view: 'prices', priceCategory: 'Oil', watchlist: [] })
    expect(widgets[0].pinned).toEqual([8])
  })

  it('leaves an old tracker on its tab, and keeps a name you gave it', () => {
    const widgets: W[] = [{ wmId: 3, wmType: MARKET_TRACKER_TYPE, wmTitle: 'Div watch', view: 'movers' }]
    foldMarketWindow(widgets)
    expect(widgets[0]).toMatchObject({ wmTitle: 'Div watch', view: 'movers' })
  })

  it('does nothing without a market window', () => {
    const widgets: W[] = [menu([1])]
    foldMarketWindow(widgets)
    expect(widgets).toEqual([menu([1])])
  })
})

describe('League mechanics: Covens Viscera', () => {
  it('fills each slot from poe.ninja Viscera, every tier, at its cheapest effect', async () => {
    const { MECHANICS, priceGroup } = await import('@/web/woke/mechanics/data')
    const covens = MECHANICS.find(m => m.id === 'covens')!
    const head = covens.groups.find(g => g.label === 'Head Viscera')!
    const v = (name: string, variant: string, chaos: number) => ({ type: 'Viscera', name, variant, chaos })
    const rows = priceGroup(head, [
      v("Greater Sirus' Head", 'Enemies you Kill have a #% chance to Explode', 3000),
      v("Sirus' Head", 'Transfiguration of Soul', 916),
      v("Sirus' Head", 'Transfiguration of Body', 218),
      v("Warden's Arm", 'Something', 50),
      { type: 'Currency', name: "Sirus' Head", variant: '', chaos: 1 }
    ])
    expect(rows.map(r => [r.item.name, r.chaos])).toEqual([["Greater Sirus' Head", 3000], ["Sirus' Head", 218]])
  })
})

describe('a category poe.ninja just started tracking', () => {
  it("doesn't call a row thin just because it has no history yet", async () => {
    const { parseDenseChunks } = await import('@/web/woke/market/parse')
    const items = parseDenseChunks([
      chunk('currency', [
        { name: 'Divine Orb', chaos: 112, graph: [0, 1, 2, 3, 4, 5, 6] },
        { name: 'Rare Orb', chaos: 5, graph: [] }
      ]),
      chunk('viscera', [
        { name: "Sirus' Head", variant: 'Transfiguration of Soul', chaos: 900, graph: [] },
        // Tracked for two days: priced on both is full, priced on one is thin.
        { name: "Shaper's Head", variant: 'x', chaos: 90, graph: [null, null, null, null, null, 0, 5] },
        { name: "Elder's Head", variant: 'x', chaos: 80, graph: [null, null, null, null, null, null, 5] }
      ])
    ])
    const gaps = Object.fromEntries(items.map(i => [i.name, i.gaps]))
    expect(gaps['Rare Orb']).toBe(7)
    expect(gaps["Sirus' Head"]).toBe(0)
    expect(gaps["Shaper's Head"]).toBe(0)
    expect(gaps["Elder's Head"]).toBe(4)
    expect(parseCategory('Viscera', chunk('viscera', [{ name: "Sirus' Head", variant: 'x', chaos: 900, graph: [] }]), 7)[0].gaps).toBe(0)
  })
})
