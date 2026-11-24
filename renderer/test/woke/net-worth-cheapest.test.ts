import { describe, expect, it } from 'vitest'
import { canCheck, checkFor, cheapestQuery, ordinal, rankText, summarize, withCheck } from '@/web/woke/net-worth/cheapest'
import type { CheapestCheck } from '@/web/woke/net-worth/cheapest'
import type { Sale } from '@/web/woke/net-worth/sales'
import { listedLookup } from '@/web/woke/search/lookups/listed'
import type { LookupContext } from '@/web/woke/search/lookups/types'

const T0 = 1_000_000_000_000
const item = (extra: Partial<Sale> = {}): Sale =>
  ({ id: 'hh', at: T0, name: 'Headhunter', typeLine: 'Leather Belt', baseType: 'Leather Belt', frameType: 3, icon: '', stack: 1, price: { amount: 38, currency: 'divine' }, ...extra })
const ask = (c: number | null, mine = false) => ({ chaosEach: c, mine })

describe('still cheapest?', () => {
  it('builds an instant buyout search, cheapest first, per kind of item', () => {
    const u = cheapestQuery(item({ links: 6 }))!
    expect(u.query.status.option).toBe('securable')
    expect(u.sort).toEqual({ price: 'asc' })
    expect(u.query.name).toBe('Headhunter')
    expect(u.query.type).toBe('Leather Belt')
    expect(u.query.filters.misc_filters?.filters.corrupted).toEqual({ option: 'false' })
    expect(u.query.filters.socket_filters?.filters.links).toEqual({ min: 6 })

    const gem = cheapestQuery(item({ name: '', typeLine: 'Enlighten Support', frameType: 4, gemLevel: 4, quality: 20, corrupted: true }))!
    expect(gem.query.name).toBeUndefined()
    expect(gem.query.type).toBe('Enlighten Support')
    expect(gem.query.filters.misc_filters?.filters).toEqual({ gem_level: { min: 4, max: 4 }, quality: { min: 20 }, corrupted: { option: 'true' } })

    // A rare map: its base and tier, any non-unique.
    const map = cheapestQuery(item({ name: 'Grim Trap', typeLine: 'Strand Map', baseType: 'Strand Map', frameType: 2, mapTier: 16 }))!
    expect(map.query.type).toBe('Strand Map')
    expect(map.query.filters.map_filters?.filters.map_tier).toEqual({ min: 16, max: 16 })
    expect(map.query.filters.type_filters?.filters.rarity).toEqual({ option: 'nonunique' })

    // A transfigured gem: its normal gem and the discriminator.
    const tg = cheapestQuery(item({ name: '', typeLine: 'Lightning Arrow of Electrocution', frameType: 4 }), { option: 'Lightning Arrow', discriminator: 'alt_x' })!
    expect(tg.query.type).toEqual({ option: 'Lightning Arrow', discriminator: 'alt_x' })
    // A white base: no check (its price is in its item level or influence).
    expect(canCheck(item({ name: '', typeLine: 'Leather Belt', frameType: 0 }))).toBe(false)
    // A fragment is fine.
    expect(canCheck(item({ name: '', typeLine: 'Fragment of the Hydra', frameType: 0 }))).toBe(true)
    // Rare gear: no check.
    expect(canCheck(item({ name: 'Doom Clasp', frameType: 2 }))).toBe(false)
    expect(cheapestQuery(item({ name: 'Doom Clasp', frameType: 2 }))).toBeNull()
  })

  it('ranks your ask among other sellers, leaving yours and unpriced ones out', () => {
    const c = summarize(item(), 38 * 200, [ask(35 * 200), ask(36 * 200), ask(38 * 200, true), ask(null), ask(38 * 200), ask(40 * 200)], 6, true, T0)
    expect(c.cheaper).toBe(2)
    expect(c.more).toBeUndefined()
    expect(c.asks).toEqual([7000, 7200, 7600, 8000])
    expect(c.total).toBe(5)
    expect(rankText(c)).toBe('3rd')
    // A tie is not cheaper.
    expect(summarize(item(), 100, [ask(100), ask(120)], 2, true, T0).cheaper).toBe(0)
    // Every fetched ask cheaper and more listed than fetched: "11th+".
    const more = summarize(item(), 100, Array.from({ length: 10 }, (_, i) => ask(50 + i)), 40, false, T0)
    expect(more.more).toBe(true)
    expect(rankText(more)).toBe('11th+')
    expect(more.asks).toHaveLength(5)
    // Nobody else: 1st.
    expect(rankText(summarize(item(), 100, [ask(100, true)], 1, true, T0))).toBe('1st')
    // A corrupted unique is rough.
    expect(rankText(summarize(item({ corrupted: true }), 100, [ask(50)], 1, true, T0))).toBe('~2nd')
  })

  it('a check holds until you reprice', () => {
    const c: CheapestCheck = { at: T0, price: { amount: 38, currency: 'divine' }, cheaper: 1, asks: [7000], total: 3 }
    const doc = withCheck(null, 'L', 'hh', c)
    expect(checkFor(doc, item())).toBe(c)
    expect(checkFor(doc, item({ price: { amount: 35, currency: 'divine' } }))).toBeNull()
    // Another league's doc doesn't carry over.
    expect(withCheck(doc, 'M', 'x', c).checks.hh).toBeUndefined()
  })

  it('ordinals', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 101].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '101st'])
  })

  it('Ctrl+Space "listed" shows the rank', () => {
    const l = item({ at: T0 - 3600_000 })
    const doc = { league: 'L', readAt: T0, listings: [l], firstSeen: { hh: l.at } }
    const checks = withCheck(null, 'L', 'hh', { at: T0, price: { amount: 38, currency: 'divine' }, cheaper: 3, asks: [7000], total: 9 })
    const ctx = { divine: 200, price: () => null, now: T0 } as unknown as LookupContext
    const cards = listedLookup(doc, [], 2, true, checks)('headhunter', ctx)
    expect(cards[0].sub).toContain('4th cheapest')
  })
})
