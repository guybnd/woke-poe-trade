import { describe, expect, it } from 'vitest'
import { byType, inRange, marketText, withoutSold, saleChaos, saleName, saleType, salesInWindow, searchSales, totals, versusMarket, nextSaleSort, saleSortOf, sortSales, DEFAULT_SALE_SORT } from '@/web/woke/net-worth/sales'
import type { Sale } from '@/web/woke/net-worth/sales'
import { salesLookup } from '@/web/woke/search/lookups/sales'
import { saleItem, saleTip } from '@/web/woke/net-worth/sale-tip'

const H = 3_600_000
const NOW = new Date(2026, 10, 21, 12, 0).getTime()
let n = 0
const sale = (p: Partial<Sale>): Sale => ({
  id: `id${n++}`,
  at: NOW - H,
  name: '',
  typeLine: 'Chaos Orb',
  baseType: 'Chaos Orb',
  frameType: 5,
  icon: '',
  stack: 1,
  price: { amount: 10, currency: 'chaos' },
  ...p
})
const RATES = { chaos: 1, divine: 200 }

describe('saleType', () => {
  it('sorts by frame and name', () => {
    expect(saleType(sale({ frameType: 3, name: 'Headhunter' }))).toBe('uniques')
    expect(saleType(sale({ frameType: 4, typeLine: 'Empower Support' }))).toBe('gems')
    expect(saleType(sale({ frameType: 6, typeLine: 'The Apothecary' }))).toBe('cards')
    expect(saleType(sale({ frameType: 2, typeLine: 'Two-Toned Boots' }))).toBe('gear')
    expect(saleType(sale({ frameType: 5, typeLine: 'Divine Orb' }))).toBe('currency')
    expect(saleType(sale({ frameType: 5, typeLine: 'Ambush Scarab of Containment' }))).toBe('fragments')
    expect(saleType(sale({ frameType: 0, typeLine: "Maven's Writ" }))).toBe('fragments')
    expect(saleType(sale({ frameType: 0, typeLine: 'Crimson Temple Map', mapTier: 16 }))).toBe('maps')
    expect(saleType(sale({ frameType: 7, typeLine: 'Something' }))).toBe('other')
    expect(saleType(sale({ frameType: 1, typeLine: 'Supplemented Blueprint: Tunnels of Anxiety' }))).toBe('other')
    expect(saleType(sale({ frameType: 0, typeLine: "Blueprint: Smuggler's Den" }))).toBe('other')
    expect(saleType(sale({ frameType: 2, name: 'Doomed Trajectory', typeLine: 'Nightmare Map' }))).toBe('maps')
  })
})

describe('prices and totals', () => {
  it('values chaos and divine prices, and counts what it cannot price', () => {
    expect(saleChaos(sale({ price: { amount: 2, currency: 'divine' } }), RATES)).toBe(400)
    expect(saleChaos(sale({ price: { amount: 2, currency: 'exalted' } }), RATES)).toBeNull()
    const t = totals([sale({ price: { amount: 1, currency: 'divine' } }), sale({}), sale({ price: { amount: 1, currency: 'exalted' } })], RATES)
    expect(t).toEqual({ chaos: 210, count: 3, unpriced: 1 })
  })

  it('names stacks and gems', () => {
    expect(saleName(sale({ stack: 12, typeLine: "Maven's Writ" }))).toBe("12 × Maven's Writ")
    expect(saleName(sale({ frameType: 4, typeLine: 'Empower Support', gemLevel: 4, quality: 23 }))).toBe('Empower Support 4/23')
    expect(saleName(sale({ frameType: 3, name: 'Headhunter', typeLine: 'Leather Belt' }))).toBe('Headhunter')
  })

  it('ranges: today starts at midnight, 7d is a rolling week', () => {
    const list = [sale({ at: NOW - H }), sale({ at: NOW - 13 * H }), sale({ at: NOW - 8 * 24 * H })]
    expect(inRange(list, 'today', NOW)).toHaveLength(1)
    expect(inRange(list, '7d', NOW)).toHaveLength(2)
    expect(inRange(list, 'league', NOW)).toHaveLength(3)
  })

  it('ranks types by total with the best sale and a share of the biggest', () => {
    const rows = byType([
      sale({ frameType: 3, name: 'Mageblood', price: { amount: 100, currency: 'divine' } }),
      sale({ frameType: 3, name: 'Headhunter', price: { amount: 38, currency: 'divine' } }),
      sale({ frameType: 4, typeLine: 'Empower Support', price: { amount: 10, currency: 'divine' } })
    ], RATES)
    expect(rows.map(r => r.id)).toEqual(['uniques', 'gems'])
    expect(rows[0]).toMatchObject({ count: 2, chaos: 27600, share: 1 })
    expect(rows[0].best?.name).toBe('Mageblood')
    expect(rows[1].share).toBeCloseTo(2000 / 27600)
  })

  it('compares with poe.ninja per item of a stack', () => {
    expect(versusMarket(95, 100, 1)).toBeCloseTo(-0.05)
    expect(versusMarket(120, 10, 12)).toBeCloseTo(0)
    expect(versusMarket(10, null, 1)).toBeNull()
    // Another version of the item on poe.ninja (450% over): no comparison.
    expect(versusMarket(44, 8, 1)).toBeNull()
    expect(marketText(-0.05)).toBe('5% under')
    expect(marketText(0.01)).toBe('at market')
    expect(marketText(0.2)).toBe('20% over')
  })
})

describe('sales in a refresh', () => {
  it('takes those after the read before, up to the read', () => {
    const a = sale({ at: NOW - 2 * H })
    const b = sale({ at: NOW - H })
    const c = sale({ at: NOW })
    expect(salesInWindow([a, b, c], NOW - 1.5 * H, NOW - 0.5 * H)).toEqual([b])
    // No read before: the hour up to it.
    expect(salesInWindow([a, b, c], null, NOW - 0.5 * H)).toEqual([b])
  })

  it('takes sold items out of their removed line by item and count, never an added one', () => {
    const lines = [
      { key: 'Headhunter Leather Belt', count: 1, chaos: 8000, dir: 'remove' as const },
      { key: 'Divine Orb', count: 40, chaos: 8000, dir: 'add' as const },
      { key: 'Ambush Scarab', count: 60, chaos: 600, dir: 'remove' as const },
      { key: 'Vaal Grace|L20|Q20', count: 1, chaos: 50, dir: 'remove' as const }
    ]
    const out = withoutSold(lines, [
      sale({ frameType: 3, name: 'Headhunter', typeLine: 'Leather Belt' }),
      sale({ typeLine: 'Divine Orb' }),
      sale({ typeLine: 'Ambush Scarab', stack: 10 }),
      sale({ frameType: 4, typeLine: 'Vaal Grace', gemLevel: 20, quality: 20, corrupted: true })
    ])
    expect(out.map(l => [l.key, l.count, l.chaos])).toEqual([
      ['Divine Orb', 40, 8000],
      ['Ambush Scarab', 50, 500],
      // A corrupted gem is another item.
      ['Vaal Grace|L20|Q20', 1, 50]
    ])
  })

  it('searches by every word', () => {
    const list = [sale({ frameType: 3, name: 'Headhunter', typeLine: 'Leather Belt' }), sale({ typeLine: 'Divine Orb' })]
    expect(searchSales(list, 'head belt').map(s => s.name)).toEqual(['Headhunter'])
    expect(searchSales(list, '')).toEqual([])
  })

  it('finds names with apostrophes and accents typed plainly', () => {
    const list = [sale({ frameType: 3, name: 'Kaom\'s Heart', typeLine: 'Glorious Plate' }), sale({ frameType: 3, name: 'Black Mórrigan', typeLine: 'Arcanist Gloves' })]
    expect(searchSales(list, 'kaoms').map(s => s.name)).toEqual(['Kaom\'s Heart'])
    expect(searchSales(list, 'morrigan').map(s => s.name)).toEqual(['Black Mórrigan'])
  })
})

describe('tooltips', () => {
  it('draws gear from its own mods, everything else by name', () => {
    const rare = sale({ frameType: 2, name: 'Vengeance Crown', typeLine: 'Prophet Crown', tip: { name: 'Vengeance Crown', typeLine: 'Prophet Crown', baseType: 'Prophet Crown', frameType: 2, rarity: 'Rare', explicitMods: ['+80 to maximum Life'] } })
    expect(saleItem(rare)?.rarity).toBe('RARE')
    expect(saleTip(rare)).toMatchObject({ name: 'Vengeance Crown', content: { kind: 'item' } })
    const gem = sale({ frameType: 4, typeLine: 'Empower Support', gemLevel: 4, quality: 20 })
    expect(saleItem(gem)).toBeNull()
    expect(saleTip(gem)).toMatchObject({ name: 'Empower Support', fallback: { kind: 'gem', level: 4, quality: 20 } })
    // Read before tooltips were kept: by name.
    // A unique by its name alone: its base isn't a poe.ninja type.
    const hh = saleTip(sale({ frameType: 3, name: 'Headhunter', typeLine: 'Leather Belt' }))
    expect(hh).toMatchObject({ name: 'Headhunter' })
    expect(hh.type).toBeUndefined()
    // A rare without its mods: its base's tooltip.
    expect(saleTip(sale({ frameType: 2, name: 'Doom Loop', typeLine: 'Two-Toned Boots' }))).toEqual({ name: 'Two-Toned Boots', count: 1 })
  })
})

describe('Ctrl+Space', () => {
  const ctx = { price: () => null, items: [], tools: new Set<string>(), divine: 200, now: NOW, league: null }
  const list = [sale({ frameType: 3, name: 'Headhunter', typeLine: 'Leather Belt', at: NOW - H, price: { amount: 38, currency: 'divine' } })]

  it('"sold" answers with today and the week', () => {
    const cards = salesLookup(list)('sold', ctx)
    expect(cards[0].id).toBe('answer:sales')
    expect(cards[0].sections[0].rows?.[0]).toMatchObject({ chaos: 7600 })
  })

  it("an item's name shows when and for how much it sold", () => {
    const cards = salesLookup(list)('headh', ctx)
    expect(cards).toHaveLength(1)
    expect(cards[0].name).toBe('Sold Headhunter')
    expect(cards[0].sections[0].rows?.[0].chaos).toBe(7600)
    // The result, its heading and its rows show the item's tooltip.
    expect(cards[0].tip?.name).toBe('Headhunter')
    expect(cards[0].sections[0].rows?.[0].item?.name).toBe('Headhunter')
  })

  it('stays quiet without sales or for short queries', () => {
    expect(salesLookup(null)('sold', ctx)).toEqual([])
    expect(salesLookup(list)('he', ctx)).toEqual([])
  })
})

describe('sortSales', () => {
  const a = sale({ id: 'a', name: 'Headhunter', frameType: 3, at: NOW - 3 * H, price: { amount: 2, currency: 'divine' } })
  const b = sale({ id: 'b', typeLine: 'Ambush Scarab', at: NOW - 2 * H, price: { amount: 150, currency: 'chaos' } })
  const c = sale({ id: 'c', typeLine: 'Chaos Orb', at: NOW - H, price: { amount: 5, currency: 'mystery' } })
  const d = sale({ id: 'd', typeLine: 'blessed Orb', at: NOW - 4 * H, price: { amount: 30, currency: 'chaos' } })
  const all = [a, b, c, d]
  const market = (s: Sale) => ({ a: 0.1, b: -0.2, d: 0.5 } as Record<string, number>)[s.id] ?? null
  const ids = (sort: Parameters<typeof sortSales>[1]) => sortSales(all, sort, RATES, market).map(s => s.id).join('')

  it('defaults to When, newest first', () => {
    expect(DEFAULT_SALE_SORT).toEqual({ key: 'when', dir: 'desc' })
    expect(ids(DEFAULT_SALE_SORT)).toBe('cbad')
    expect(ids({ key: 'when', dir: 'asc' })).toBe('dabc')
  })
  it('sorts price by chaos value, unpriced last either way', () => {
    expect(ids({ key: 'price', dir: 'desc' })).toBe('abdc')
    expect(ids({ key: 'price', dir: 'asc' })).toBe('dbac')
    expect(ids({ key: 'value', dir: 'desc' })).toBe('abdc')
  })
  it('sorts vs ninja with no comparison last', () => {
    expect(ids({ key: 'market', dir: 'desc' })).toBe('dabc')
    expect(ids({ key: 'market', dir: 'asc' })).toBe('badc')
  })
  it('sorts items by name, ignoring case', () => {
    expect(ids({ key: 'item', dir: 'asc' })).toBe('bdca')
    expect(ids({ key: 'item', dir: 'desc' })).toBe('acdb')
  })
  it('flips the same column and starts a new one at its first direction', () => {
    expect(nextSaleSort(DEFAULT_SALE_SORT, 'when')).toEqual({ key: 'when', dir: 'asc' })
    expect(nextSaleSort(DEFAULT_SALE_SORT, 'item')).toEqual({ key: 'item', dir: 'asc' })
    expect(nextSaleSort({ key: 'item', dir: 'asc' }, 'item')).toEqual({ key: 'item', dir: 'desc' })
    expect(nextSaleSort({ key: 'item', dir: 'asc' }, 'price')).toEqual({ key: 'price', dir: 'desc' })
  })
  it('falls back to the default for a missing or broken stored sort', () => {
    expect(saleSortOf(undefined)).toEqual(DEFAULT_SALE_SORT)
    expect(saleSortOf({ key: 'nope', dir: 'asc' })).toEqual(DEFAULT_SALE_SORT)
    expect(saleSortOf({ key: 'price', dir: 'asc' })).toEqual({ key: 'price', dir: 'asc' })
  })
})
