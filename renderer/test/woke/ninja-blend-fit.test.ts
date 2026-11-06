// poe.ninja can't see rolls, corruption or Foulborn mods, so it mustn't drag a
// price below what such an item is listed for.
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fixture, loadGameData, parseItem } from '../helpers/game-data'

vi.mock('@/web/background/IPC', () => ({ Host: { proxy: async () => new Response('{}') } }))
vi.mock('@/web/Config', () => ({
  AppConfig: () => ({ apiLatencySeconds: 2, accountName: '' }),
  poeWebApi: () => 'www.pathofexile.com'
}))

/* eslint-disable import/first */
import { createPresets } from '@/web/price-check/filters/create-presets'
import { buildInsight } from '@/web/woke/price-insight/insight'
import type { InsightListing } from '@/web/woke/price-insight/insight'
import { buildBlend, headlinePrice } from '@/web/woke/price-insight/sources'
import { ninjaFitsSearch } from '@/web/woke/price-insight/search-scope'
import type { ParsedItem } from '@/parser'
/* eslint-enable import/first */

const NOW = Date.parse('2026-11-05T12:00:00Z')
const OPTS = { divine: 180, now: NOW }

function rows (chaos: number, n: number, over: Partial<InsightListing> = {}): InsightListing[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `r${chaos}-${i}`,
    priceAmount: chaos,
    priceCurrency: 'chaos',
    indexedAt: new Date(NOW - 30 * 3600e3).toISOString(),
    hasNote: true,
    hasFee: true,
    isMine: false,
    accountName: `s${i}`,
    accountStatus: 'online' as const,
    listedTimes: 1,
    ...over
  }))
}

function headline (listings: InsightListing[], ninja: { chaos: number, gaps: number, fits?: boolean }) {
  const insight = buildInsight(listings, OPTS)
  return headlinePrice(buildBlend({ insight, ninja, now: NOW }), insight)
}

describe('headline', () => {
  it('never sits below the cheapest trusted listing', () => {
    expect(headline(rows(1000, 4), { chaos: 100, gaps: 0 })).toEqual({ chaos: 1000, from: 'listings' })
    expect(headline(rows(1000, 4, { hasFee: false }), { chaos: 100, gaps: 0 })).toEqual({ chaos: 1000, from: 'listings' })
  })

  it('leaves poe.ninja out of a search it does not cover', () => {
    const insight = buildInsight([...rows(100, 2), ...rows(300, 2)], OPTS)
    const blend = buildBlend({ insight, ninja: { chaos: 150, gaps: 0, fits: false }, now: NOW })
    expect(blend.points.find(p => p.key === 'ninja')?.weight).toBe(0)
    expect(headlinePrice(blend, insight)?.from).toBe('listings')
  })

  it('does not let a lone bait listing set the price of a corrupted unique', () => {
    const h = headline(rows(1, 1, { hasFee: false }), { chaos: 500, gaps: 0, fits: false })!
    expect(h.chaos).toBeGreaterThan(3)
  })

  it('does not floor on one lone ask', () => {
    const h = headline(rows(5000, 1, { hasFee: false }), { chaos: 100, gaps: 0 })!
    expect(h.chaos).toBeLessThan(5000)
  })

  it('does not floor on listings nobody has bought', () => {
    const old = { hasFee: false, indexedAt: new Date(NOW - 20 * 24 * 3600e3).toISOString(), accountStatus: 'online' as const }
    expect(headline(rows(1000, 4, old), { chaos: 100, gaps: 0 })!.chaos).toBeLessThan(1000)
  })

  it('still uses poe.ninja when it fits', () => {
    const stash = { hasFee: false }
    const insight = buildInsight([...rows(100, 2, stash), ...rows(300, 2, stash)], OPTS)
    const blend = buildBlend({ insight, ninja: { chaos: 150, gaps: 0, fits: true }, now: NOW })
    expect(headlinePrice(blend, insight)?.from).toBe('blend')
  })

  it('falls back to poe.ninja when nothing is listed, even off target', () => {
    expect(headline([], { chaos: 150, gaps: 0, fits: false })).toEqual({ chaos: 150, from: 'blend' })
  })
})

describe('ninjaFitsSearch', () => {
  beforeAll(loadGameData)
  const OPT = { league: 'Mirage', merchantOnly: true, currency: null, collapseListings: 'api' as const, activateStockFilter: false, searchStatRange: 10, useEn: false }
  const stats = (item: ParsedItem) => {
    const { presets, active } = createPresets(item, OPT)
    return presets.find(p => p.id === active)!.stats
  }

  it('is true for rares and gems', () => {
    const ring = parseItem(fixture('items/rare-ring.txt'))
    expect(ninjaFitsSearch(ring, stats(ring))).toBe(true)
    const gem = parseItem(fixture('items/gem-enlighten.txt'))
    expect(ninjaFitsSearch(gem, stats(gem))).toBe(true)
  })

  it('is false for a unique searched on a good roll', () => {
    const kaom = parseItem(fixture('items/unique-kaoms-heart.txt'))
    expect(ninjaFitsSearch(kaom, stats(kaom))).toBe(false)
  })

  it('is true for a unique on an ordinary roll', () => {
    const text = fixture('items/unique-kaoms-heart.txt').replace('40(20-40)%', '23(20-40)%')
    const kaom = parseItem(text)
    expect(ninjaFitsSearch(kaom, stats(kaom))).toBe(true)
  })

  it('follows the Corrupted chip, since its unique prices are uncorrupted', () => {
    const plain = fixture('items/unique-kaoms-heart.txt').replace('40(20-40)%', '23(20-40)%')
    const clean = parseItem(plain)
    const corrupted = parseItem(`${plain}
--------
Corrupted`)
    expect(ninjaFitsSearch(clean, stats(clean), 'corrupted')).toBe(false)
    expect(ninjaFitsSearch(clean, stats(clean), 'not-corrupted')).toBe(true)
    expect(ninjaFitsSearch(corrupted, stats(corrupted), 'any')).toBe(false)
    expect(ninjaFitsSearch(corrupted, stats(corrupted), 'corrupted')).toBe(false)
  })

  it('counts a good property roll', () => {
    const roll = { value: 1062, min: 1062, max: undefined, default: { min: 1062, max: 1091 }, bounds: { min: 916, max: 1091 }, dp: false, isNegated: false, tradeInvert: false }
    const pdps = { statRef: 'Physical DPS: #', tag: 'property', disabled: false, roll, sources: [], tradeId: [], text: '' } as never
    const kaom = parseItem(fixture('items/unique-kaoms-heart.txt'))
    expect(ninjaFitsSearch(kaom, [pdps])).toBe(false)
  })

  it('is true once that roll is unticked', () => {
    const kaom = parseItem(fixture('items/unique-kaoms-heart.txt'))
    const unticked = stats(kaom).map(s => ({ ...s, disabled: true })) as never
    expect(ninjaFitsSearch(kaom, unticked)).toBe(true)
  })

  it('is false for corrupted and Foulborn uniques', () => {
    const kaom = parseItem(fixture('items/unique-kaoms-heart.txt'))
    expect(ninjaFitsSearch({ ...kaom, isCorrupted: true } as ParsedItem, [])).toBe(false)
    expect(ninjaFitsSearch({ ...kaom, isFoulborn: true } as ParsedItem, [])).toBe(false)
  })
})
