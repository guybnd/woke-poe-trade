import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BOSSES, VARIABLE_ITEMS } from '@/web/woke/boss-runs/bosses'
import { dropPrice, evaluateBoss, killDropPrice, needsTrade, priceResolver, tradeQuery, tradeWanted, unidentifiedTradeUrl } from '@/web/woke/boss-runs/calc'
import type { BossPrefs, TradeQuote } from '@/web/woke/boss-runs/calc'
import { ESTIMATED_RATES, estimateUrl } from '@/web/woke/boss-runs/estimates'
import { createTradePrices, quoteFromListings } from '@/web/woke/boss-runs/trade-prices'
import type { PriceItem } from '@/web/woke/market/types'

const prefs = (over: Partial<BossPrefs> = {}) => ({
  runSeconds: {}, rates: {}, extraDrops: {}, kills: {}, ownEntry: false, plannedRuns: 0, dropToggles: {}, priceModes: {}, customPrices: {}, ...over
}) as BossPrefs
const item = (name: string, chaos: number) => ({ type: 'UniqueJewel', name, variant: '', chaos }) as unknown as PriceItem
const quotes = (map: Record<string, TradeQuote>) => (name: string) => map[name] ?? null
const boss = (id: string) => BOSSES.find(b => b.id === id)!

const jewel = { name: 'The Light of Meaning', chance: null, variable: true }
const ninja = [item('The Light of Meaning', 28)]

describe('boss drop pricing', () => {
  it('prices jewels at the unidentified trade price, not poe.ninja', () => {
    const p = dropPrice(jewel, priceResolver(ninja, quotes({ 'The Light of Meaning': { chaos: 786, listings: 466 } })), prefs())
    expect(p).toMatchObject({ price: 786, mode: 'unid', source: 'trade', listings: 466 })
  })

  it('shows poe.ninja until the trade price is known', () => {
    expect(dropPrice(jewel, priceResolver(ninja), prefs())).toMatchObject({ price: 28, mode: 'unid', source: 'ninja', listings: null })
  })

  it('keeps the player\'s choice over the trade price', () => {
    const px = priceResolver(ninja, quotes({ 'The Light of Meaning': { chaos: 786, listings: 466 } }))
    expect(dropPrice(jewel, px, prefs({ priceModes: { 'The Light of Meaning': 'median' } }))).toMatchObject({ price: 28, source: 'ninja' })
    expect(dropPrice(jewel, px, prefs({ priceModes: { 'The Light of Meaning': 'custom' }, customPrices: { 'The Light of Meaning': 5 } }))).toMatchObject({ price: 5, source: 'custom' })
  })

  it('fills a drop poe.ninja doesn\'t list from trade, and never overrides a row it has', () => {
    const px = priceResolver([item('Voidforge', 100)], quotes({ 'Decaying Reliquary Key': { chaos: 800, listings: 12 }, Voidforge: { chaos: 999, listings: 1 } }))
    expect(dropPrice({ name: 'Decaying Reliquary Key', chance: null }, px, prefs())).toMatchObject({ price: 800, source: 'trade', mode: null })
    expect(dropPrice({ name: 'Voidforge', chance: null }, px, prefs())).toMatchObject({ price: 100, source: 'ninja' })
  })

  it('values logged kills at the same price as the row', () => {
    const px = priceResolver(ninja, quotes({ 'The Light of Meaning': { chaos: 786, listings: 466 } }))
    expect(killDropPrice({ name: 'The Light of Meaning' }, px, prefs())).toBe(786)
  })

  it('treats every boss jewel as unidentified', () => {
    for (const name of ['The Light of Meaning', 'Impossible Escape', 'Thread of Hope', "Watcher's Eye", 'Forbidden Flesh', 'Forbidden Flame', 'Sublime Vision', 'Rational Doctrine', 'Beauty', 'Melding of the Flesh', 'Dissolution of the Flesh']) {
      expect(VARIABLE_ITEMS.has(name)).toBe(true)
    }
    expect(boss('king-in-the-mists').drops.find(d => d.name === 'The Light of Meaning')?.variable).toBe(true)
  })
})

describe('trade lookups wanted', () => {
  it('skips rows poe.ninja can price and drops the player priced themselves', () => {
    const px = priceResolver([item('Voidforge', 100)])
    expect(needsTrade({ name: 'Voidforge' }, px, prefs())).toBe(false)
    expect(needsTrade({ name: 'Void of the Elements' }, px, prefs())).toBe(true)
    expect(needsTrade({ name: "Watcher's Eye" }, px, prefs())).toBe(true)
    expect(needsTrade({ name: "Watcher's Eye" }, px, prefs({ priceModes: { "Watcher's Eye": 'custom' } }))).toBe(false)
  })

  it('puts the opened boss first and asks for each name once', () => {
    const names = tradeWanted(BOSSES, 'king-in-the-mists', prefs(), priceResolver([]))
    expect(names[0]).toBe('The Light of Meaning')
    expect(new Set(names).size).toBe(names.length)
  })

  it('searches jewels unidentified at instant buyout, and other drops by type', () => {
    expect(tradeQuery('The Light of Meaning', true).query).toMatchObject({
      status: { option: 'securable' },
      name: 'The Light of Meaning',
      type: 'Prismatic Jewel',
      filters: { misc_filters: { filters: { identified: { option: 'false' } } } }
    })
    const key = tradeQuery('Decaying Reliquary Key', false).query
    expect(key).toMatchObject({ type: 'Decaying Reliquary Key', filters: {} })
    expect(key).not.toHaveProperty('name')
    expect(decodeURIComponent(unidentifiedTradeUrl('Allflame', "Watcher's Eye"))).toContain('"securable"')
  })
})

describe('quoteFromListings', () => {
  it('takes the middle of the listings so bait doesn\'t set the price', () => {
    const list = [1, 400, 400, 400, 400].map(priceAmount => ({ priceAmount, priceCurrency: 'chaos' }))
    expect(quoteFromListings(list, 400)).toBe(400)
  })

  it('converts divines and ignores currencies it can\'t value', () => {
    expect(quoteFromListings([
      { priceAmount: 2, priceCurrency: 'divine' },
      { priceAmount: 2, priceCurrency: 'divine' },
      { priceAmount: 1, priceCurrency: 'mirror' }
    ], 390)).toBe(780)
    expect(quoteFromListings([{ priceAmount: 0, priceCurrency: 'no price' }], 390)).toBeNull()
  })

  it('won\'t set a price from too few usable listings', () => {
    const two = [{ priceAmount: 90, priceCurrency: 'divine' }, { priceAmount: 1, priceCurrency: 'exalted' }, { priceAmount: 95, priceCurrency: 'divine' }]
    expect(quoteFromListings(two, 390, 3)).toBeNull()
    expect(quoteFromListings(two, 390)).toBe(92.5 * 390)
  })
})

describe('trade price store', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  type Lookup = (league: string, name: string, divine: number) => Promise<{ chaos: number | null, listings: number }>
  function store (lookup = vi.fn<Lookup>(async () => ({ chaos: 50, listings: 5 })), read = () => ({})) {
    const write = vi.fn()
    return { prices: createTradePrices({ lookup, read, write, now: () => Date.now() }), lookup, write }
  }

  it('looks names up one at a time with a gap', async () => {
    const { prices, lookup, write } = store()
    prices.request('Allflame', 400, ['A', 'B'])
    await vi.advanceTimersByTimeAsync(0)
    expect(lookup).toHaveBeenCalledTimes(1)
    expect(prices.get('Allflame', 'A')).toEqual({ chaos: 50, listings: 5 })
    expect(prices.pending('B')).toBe(true)
    await vi.advanceTimersByTimeAsync(9_000)
    expect(lookup).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1_000)
    expect(lookup).toHaveBeenCalledTimes(2)
    expect(prices.pending('B')).toBe(false)
    expect(write).toHaveBeenCalledTimes(2)
  })

  it('doesn\'t look up again within the hour, then does', async () => {
    const { prices, lookup } = store()
    prices.request('Allflame', 400, ['A'])
    await vi.advanceTimersByTimeAsync(0)
    prices.request('Allflame', 400, ['A'])
    await vi.advanceTimersByTimeAsync(0)
    expect(lookup).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(61 * 60 * 1000)
    prices.request('Allflame', 400, ['A'])
    await vi.advanceTimersByTimeAsync(0)
    expect(lookup).toHaveBeenCalledTimes(2)
  })

  it('stops when the panel closes, without losing what it found', async () => {
    const { prices, lookup } = store()
    prices.request('Allflame', 400, ['A', 'B'])
    await vi.advanceTimersByTimeAsync(0)
    prices.stop()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(lookup).toHaveBeenCalledTimes(1)
    expect(prices.get('Allflame', 'A')?.chaos).toBe(50)
  })

  it('moves on after a failure and retries it later', async () => {
    const lookup = vi.fn<Lookup>(async (_l, name) => {
      if (name === 'A') throw new Error('Retry after 30 seconds')
      return { chaos: 10, listings: 1 }
    })
    const { prices } = store(lookup)
    prices.request('Allflame', 400, ['A', 'B'])
    await vi.advanceTimersByTimeAsync(10_000)
    // A failure backs off rather than running through the queue.
    expect(prices.get('Allflame', 'B')).toBeNull()
    await vi.advanceTimersByTimeAsync(50_000)
    expect(prices.get('Allflame', 'A')).toBeNull()
    expect(prices.get('Allflame', 'B')?.chaos).toBe(10)
    prices.request('Allflame', 400, ['A'])
    await vi.advanceTimersByTimeAsync(0)
    expect(lookup).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000)
    prices.request('Allflame', 400, ['A'])
    await vi.advanceTimersByTimeAsync(0)
    expect(lookup).toHaveBeenCalledTimes(3)
  })

  it('remembers no listings without showing a price, and keeps leagues apart', async () => {
    const lookup = vi.fn<Lookup>(async () => ({ chaos: null, listings: 0 }))
    const { prices } = store(lookup)
    prices.request('Allflame', 400, ['A'])
    await vi.advanceTimersByTimeAsync(0)
    expect(prices.get('Allflame', 'A')).toBeNull()
    prices.request('Allflame', 400, ['A'])
    await vi.advanceTimersByTimeAsync(0)
    expect(lookup).toHaveBeenCalledTimes(1)
    prices.request('Standard', 400, ['A'])
    await vi.advanceTimersByTimeAsync(10_000)
    expect(lookup).toHaveBeenCalledTimes(2)
  })

  it('keeps the gap when the panel is closed and reopened', async () => {
    const { prices, lookup } = store()
    prices.request('Allflame', 400, ['A', 'B'])
    await vi.advanceTimersByTimeAsync(0)
    prices.stop()
    prices.request('Allflame', 400, ['B'])
    await vi.advanceTimersByTimeAsync(9_000)
    expect(lookup).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1_000)
    expect(lookup).toHaveBeenCalledTimes(2)
  })

  it('still looks a name up in the new league when the league changes mid-lookup', async () => {
    const seen: string[] = []
    const { prices } = store(vi.fn<Lookup>(async (league) => {
      seen.push(league)
      await new Promise(resolve => setTimeout(resolve, 1_000))
      return { chaos: 5, listings: 5 }
    }))
    prices.request('Allflame', 400, ['A'])
    await vi.advanceTimersByTimeAsync(0)
    prices.request('Standard', 400, ['A'])
    await vi.advanceTimersByTimeAsync(11_000)
    expect(seen).toEqual(['Allflame', 'Standard'])
    expect(prices.pending('A')).toBe(false)
  })

  it('doesn\'t search a finished name again when the queue was replaced mid-lookup', async () => {
    const seen: string[] = []
    const { prices } = store(vi.fn<Lookup>(async (_league, name) => {
      seen.push(name)
      await new Promise(resolve => setTimeout(resolve, 1_000))
      return { chaos: 5, listings: 5 }
    }))
    prices.request('Allflame', 400, ['A', 'B'])
    await vi.advanceTimersByTimeAsync(0)
    prices.request('Allflame', 400, ['B', 'A'])
    await vi.advanceTimersByTimeAsync(40_000)
    expect(seen).toEqual(['A', 'B'])
  })

  it('moves on from a lookup that never answers', async () => {
    const lookup = vi.fn<Lookup>(async (_league, name) => {
      if (name === 'A') await new Promise(() => {})
      return { chaos: 5, listings: 5 }
    })
    const { prices } = store(lookup)
    prices.request('Allflame', 400, ['A', 'B'])
    await vi.advanceTimersByTimeAsync(30_000)
    expect(prices.pending('A')).toBe(false)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(prices.get('Allflame', 'B')?.chaos).toBe(5)
  })

  it('stops showing a price after a day', () => {
    const { prices } = store(undefined, () => ({ Allflame: { A: { chaos: 50, listings: 5, ts: Date.now() - 25 * 60 * 60 * 1000 } } }))
    expect(prices.get('Allflame', 'A')).toBeNull()
  })
})

describe('estimated drop chances', () => {
  it('fills Uber Uber Elder with estimates, flagged as such', () => {
    const r = evaluateBoss(boss('uber-uber-elder'), prefs(), priceResolver([item('Sublime Vision', 1000)]))
    const row = r.drops.find(d => d.name === 'Sublime Vision')!
    expect(row).toMatchObject({ chance: 0.015, rateSource: 'estimate', value: 15 })
    expect(r.estimated).toBe(r.drops.length)
    expect(r.unrated).toBe(0)
  })

  it('lets typed rates and the kill log win over estimates', () => {
    const typed = evaluateBoss(boss('uber-uber-elder'), prefs({ rates: { 'uber-uber-elder': { Voidforge: 0.5 } } }), priceResolver([]))
    expect(typed.drops.find(d => d.name === 'Voidforge')).toMatchObject({ chance: 0.5, rateSource: 'custom' })
    const kills = Array.from({ length: 5 }, () => ({ ts: 0, drops: [{ name: 'Voidforge', qty: 1 }] }))
    const logged = evaluateBoss(boss('uber-uber-elder'), prefs({ kills: { 'uber-uber-elder': kills } as unknown as BossPrefs['kills'] }), priceResolver([]))
    expect(logged.drops.find(d => d.name === 'Voidforge')).toMatchObject({ chance: 1, rateSource: 'mine' })
    expect(logged.estimated).toBe(0)
  })

  it('never overrides a measured rate, and every estimate names a real drop', () => {
    const r = evaluateBoss(boss('uber-maven'), prefs(), priceResolver([]))
    expect(r.drops.find(d => d.name === 'Impossible Escape')?.rateSource).toBe('community')
    for (const [id, rows] of Object.entries(ESTIMATED_RATES)) {
      const b = boss(id)
      expect(estimateUrl(id)).toContain('pathofkalandra.com')
      for (const name of Object.keys(rows)) {
        const drop = b.drops.find(d => d.name === name)
        expect(drop, `${id}: ${name}`).toBeTruthy()
        expect(drop!.chance, `${id}: ${name}`).toBeNull()
      }
    }
  })
})
