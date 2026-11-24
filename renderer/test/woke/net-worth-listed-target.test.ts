import { describe, expect, it } from 'vitest'
import { asTradePrice, listingsFor, namesOfText, stepUnder, suggestions, targetOpen } from '@/web/woke/net-worth/listed-target'
import { checkFromAsks, withCheck, withTarget } from '@/web/woke/net-worth/cheapest'
import { asksOf } from '@/web/woke/price-insight/last-asks'
import type { Sale } from '@/web/woke/net-worth/sales'
import { listedLookup } from '@/web/woke/search/lookups/listed'
import type { LookupContext } from '@/web/woke/search/lookups/types'

const T0 = 1_000_000_000_000
const item = (id: string, extra: Partial<Sale> = {}): Sale =>
  ({ id, at: T0, name: 'Headhunter', typeLine: 'Leather Belt', baseType: 'Leather Belt', frameType: 3, icon: '', stack: 1, price: { amount: 38, currency: 'divine' }, ...extra })

describe('set a price from the price check', () => {
  it('reads the name lines of game text', () => {
    expect(namesOfText('Item Class: Belts\nRarity: Unique\nHeadhunter\nLeather Belt\n--------\nRequires Level 40')).toEqual({ name: 'Headhunter', base: 'Leather Belt' })
    expect(namesOfText('Item Class: Stackable Currency\nRarity: Currency\nDivine Orb\n--------\nStack Size: 1/20')).toEqual({ name: 'Divine Orb' })
    expect(namesOfText('nothing')).toBeNull()
  })

  it('finds your listings of the checked item', () => {
    const hh = item('hh')
    const doom = item('doom', { name: 'Doom Clasp', frameType: 2 })
    const map = item('map', { name: '', typeLine: 'Strand Map', baseType: 'Strand Map', frameType: 0, mapTier: 16 })
    const list = [hh, doom, map]
    expect(listingsFor({ name: 'Headhunter', base: 'Leather Belt', rarity: 'Unique' }, list)).toEqual([hh])
    expect(listingsFor({ name: 'Doom Clasp', base: 'Leather Belt', rarity: 'Rare' }, list)).toEqual([doom])
    expect(listingsFor({ name: 'Strand Map', rarity: 'Normal', mapTier: 16 }, list)).toEqual([map])
    expect(listingsFor({ name: 'Strand Map', rarity: 'Normal', mapTier: 15 }, list)).toEqual([])
    // A white Leather Belt is none of them.
    expect(listingsFor({ name: 'Leather Belt', rarity: 'Normal' }, list)).toEqual([])
  })

  it('suggests one step under the cheapest, and matching it', () => {
    expect(asTradePrice(150, 200)).toEqual({ amount: 150, currency: 'chaos' })
    expect(asTradePrice(7000, 200)).toEqual({ amount: 35, currency: 'divine' })
    expect(asTradePrice(530, 200)).toEqual({ amount: 2.7, currency: 'divine' })
    expect(stepUnder({ amount: 35, currency: 'divine' }, 200)).toEqual({ amount: 34, currency: 'divine' })
    expect(stepUnder({ amount: 2.7, currency: 'divine' }, 200)).toEqual({ amount: 2.6, currency: 'divine' })
    // 1 div less a step drops to chaos.
    expect(stepUnder({ amount: 1, currency: 'divine' }, 200)).toEqual({ amount: 180, currency: 'chaos' })
    expect(stepUnder({ amount: 1, currency: 'chaos' }, 200)).toEqual({ amount: 1, currency: 'chaos' })
    expect(suggestions(7000, 200)).toEqual({ under: { amount: 34, currency: 'divine' }, match: { amount: 35, currency: 'divine' } })
    expect(suggestions(null, 200)).toBeNull()
    // The cheapest asks 20c: the suggestions stay in chaos (Guy saw "20 div").
    expect(suggestions(20, 200, { amount: 20, currency: 'chaos', stack: 1 })).toEqual({ under: { amount: 19, currency: 'chaos' }, match: { amount: 20, currency: 'chaos' } })
    // A fraction of a chaos: from the price each, so under stays under match.
    expect(suggestions(0.5, 200, { amount: 0.5, currency: 'chaos', stack: 1 })?.match).toEqual({ amount: 1, currency: 'chaos' })
    // Asked in divines: copied as listed.
    expect(suggestions(900, 180, { amount: 5, currency: 'divine', stack: 1 })?.match).toEqual({ amount: 5, currency: 'divine' })
    // Another stack size: from the price each, for your stack.
    expect(suggestions(200, 200, { amount: 50, currency: 'chaos', stack: 5 }, 20)?.match).toEqual({ amount: 1, currency: 'divine' })
  })

  it('the price check hands over other sellers\' asks, each', () => {
    const a = asksOf([
      { priceAmount: 36, priceCurrency: 'divine', isMine: false },
      { priceAmount: 38, priceCurrency: 'divine', isMine: true },
      { priceAmount: 100, priceCurrency: 'chaos', stackSize: 10, isMine: false },
      { priceAmount: 5, priceCurrency: 'exalted', isMine: false }
    ], 200, 'x', 30, false)
    expect(a.chaos).toEqual([10, 7200])
    expect(a.cheapest).toEqual({ amount: 100, currency: 'chaos', stack: 10 })
    expect(a).toMatchObject({ mine: 1, total: 30, all: false })
  })

  it('the price check ranks the listing from what it loaded, never rough', () => {
    // A rolled unique: a search by name would be rough, its own price check isn't.
    const c = checkFromAsks(item('hh'), 38 * 200, [7000, 7400, 8000], 1, 4, true, T0)
    expect(c).toMatchObject({ cheaper: 2, total: 3, asks: [7000, 7400, 8000], priceCheck: true })
    expect(c.rough).toBeUndefined()
    expect(JSON.parse(JSON.stringify(c))).not.toHaveProperty('rough')
    // All of them cheaper and more not loaded: "+".
    expect(checkFromAsks(item('hh'), 38 * 200, [7000], 0, 50, false, T0).more).toBe(true)
    // Opened by name (no item data): as rough as a search by name.
    const rolled = item('hh', { corrupted: true })
    expect(checkFromAsks(rolled, 600, [500], 0, 1, true, T0, true).rough).toBe(true)
  })

  it('a set price stands until the listing asks it, and keeps the checks', () => {
    const doc = withCheck(null, 'L', 'hh', { at: T0, price: { amount: 38, currency: 'divine' }, cheaper: 1, asks: [7000], total: 2 })
    const set = withTarget(doc, 'L', 'hh', { amount: 34, currency: 'divine', at: T0 })
    expect(set.checks.hh).toBeDefined()
    expect(targetOpen(set.targets?.hh, item('hh'))).toBe(true)
    expect(targetOpen(set.targets?.hh, item('hh', { price: { amount: 34, currency: 'divine' } }))).toBe(false)
    // A new check keeps the target; clearing drops it.
    expect(withCheck(set, 'L', 'x', doc.checks.hh).targets?.hh).toBeDefined()
    expect(withTarget(set, 'L', 'hh', null).targets).toBeUndefined()
    // Ctrl+Space "listed" says it.
    const l = item('hh', { at: T0 - 3600_000 })
    const pending = { league: 'L', readAt: T0, listings: [l], firstSeen: { hh: l.at } }
    const ctx = { divine: 200, price: () => null, now: T0 } as unknown as LookupContext
    expect(listedLookup(pending, [], 2, true, set)('headhunter', ctx)[0].sub).toContain('set 34 div')
  })
})
