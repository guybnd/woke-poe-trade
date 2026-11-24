import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fromValue, mapCards, orbTradeQuery, orbTradeUrl, rankScry, scryRows, scryableMaps } from '@/web/woke/scrying/scry'
import type { CardDropData } from '@/web/woke/card-drops/card-drops'
import { initScryingWidget, SCRYING_TYPE } from '@/web/woke/scrying/widget'

const small: CardDropData = {
  season: '3.29',
  maps: { 'Rich Map': 16, 'Poor Map': 10, 'Home Map': 5, 'Unique Place': 0 },
  cards: {
    Jackpot: { m: ['Rich Map'], w: 1000 },
    Filler: { m: ['Rich Map', 'Home Map'], w: 10 },
    Dust: { m: ['Poor Map'], w: 10 },
    Gone: { m: ['Rich Map'], w: 10, x: 1 },
    Nowhere: { m: ['Unique Place'], w: 10 }
  }
}
const PRICES: Record<string, number> = { Jackpot: 1010, Filler: 1, Dust: 0.5, Home: 0 }
const price = (n: string) => PRICES[n] ?? null

describe('scryableMaps', () => {
  it('leaves out unique maps', () => {
    expect(scryableMaps(small)).toEqual(['Home Map', 'Poor Map', 'Rich Map'])
  })
})

describe('mapCards', () => {
  it('gives each card its chance and what it adds to one card drop, best first', () => {
    const cards = mapCards(small, 'Rich Map', price)
    // Weights 1/1000 and 1/10: Jackpot is 1 in 101 of Rich Map's own cards.
    expect(cards.map(c => c.name)).toEqual(['Jackpot', 'Filler'])
    expect(cards[0].oneIn).toBe(101)
    expect(cards[0].adds).toBeCloseTo(10, 5)
    expect(cards[1].adds).toBeCloseTo(100 / 101, 5)
  })
})

describe('scryRows and rankScry', () => {
  const orbs: Record<string, { chaos: number, listings: number }> = { 'Rich Map': { chaos: 330, listings: 12 } }
  const opts = { cardsPerMap: 3, fromMap: null, orbPrice: (m: string) => orbs[m] ?? null }

  it('values a scry per map, and the maps the orb takes to pay back', () => {
    const rows = scryRows(small, price, opts)
    const rich = rows.find(r => r.map === 'Rich Map')!
    // 10 from Jackpot, 100/101 from Filler.
    expect(rich.value).toBeCloseTo(10.99, 2)
    expect(rich.gain).toBeCloseTo(32.97, 2)
    expect(rich.orb).toBe(330)
    expect(rich.orbListings).toBe(12)
    expect(rich.payback).toBe(11)
    expect(rich.top?.name).toBe('Jackpot')
    expect(rows.find(r => r.map === 'Poor Map')!.payback).toBeNull()
  })

  it('takes the map you run off the gain, and leaves it out of the list', () => {
    const rows = scryRows(small, price, { ...opts, fromMap: 'Home Map' })
    expect(rows.some(r => r.map === 'Home Map')).toBe(false)
    // Home Map's own card value is 1c (Filler only).
    expect(rows.find(r => r.map === 'Rich Map')!.gain).toBeCloseTo(29.97, 2)
    const ranked = rankScry(rows, 'gain')
    expect(ranked.good.map(r => r.map)).toEqual(['Rich Map'])
    expect(ranked.losing.map(r => r.map)).toEqual(['Poor Map'])
  })

  it('puts maps with no priced card apart', () => {
    const rows = scryRows(small, () => null, opts)
    const ranked = rankScry(rows, 'gain')
    expect(ranked.good).toEqual([])
    expect(ranked.noData).toHaveLength(3)
  })

  it('sorts by payback with priced orbs first', () => {
    const many: CardDropData = { ...small, cards: { ...small.cards, Dust: { m: ['Poor Map'], w: 10 } } }
    const rows = scryRows(many, n => n === 'Dust' ? 100 : price(n), { ...opts, orbPrice: m => m === 'Poor Map' ? { chaos: 10, listings: 3 } : orbs[m] ?? null })
    expect(rankScry(rows, 'payback').good.map(r => r.map)).toEqual(['Poor Map', 'Rich Map', 'Home Map'])
    expect(rankScry(rows, 'gain').good[0].map).toBe('Poor Map')
  })
})

describe('fromValue', () => {
  it('is 0 with no map set, and null for a map with no priced card', () => {
    expect(fromValue(small, null, price)).toBe(0)
    expect(fromValue(small, 'Home Map', price)).toBeCloseTo(1, 5)
    expect(fromValue(small, 'Poor Map', () => null)).toBeNull()
  })
})

describe('orb trade search', () => {
  it('searches the Scrying Orb of one map area, cheapest first', () => {
    expect(orbTradeQuery('2279').query.type).toEqual({ discriminator: 'scrying_orb', option: '2279' })
    const url = orbTradeUrl('Covens', '2279')
    expect(url.startsWith('https://www.pathofexile.com/trade/search/Covens?q=')).toBe(true)
    expect(JSON.parse(decodeURIComponent(url.split('?q=')[1])).sort).toEqual({ price: 'asc' })
  })
})

describe('real card data', () => {
  const DATA = path.join(__dirname, '../../public/data')
  const data = JSON.parse(fs.readFileSync(path.join(DATA, 'card-drops.json'), 'utf8')) as CardDropData
  const areas = fs.readFileSync(path.join(DATA, 'en/items.ndjson'), 'utf8').split('\n')
    .filter(l => l.includes('"namespace":"AREA"')).map(l => JSON.parse(l) as { refName: string, tradeDisc?: string })

  const disc = new Map(areas.map(a => [a.refName, a.tradeDisc]))
  const canScry = (m: string) => !!disc.get(m.replace(/ Map$/, ''))

  it('leaves out maps the trade site has no Scrying Orb for (guardian maps, Vaal Temple...)', () => {
    const maps = scryableMaps(data, canScry)
    expect(maps).toContain('Necropolis Map')
    expect(maps).not.toContain('Citadel Map')
    expect(maps).not.toContain('Vaal Temple Map')
    expect(scryableMaps(data).length - maps.length).toBeLessThan(20)
  })

  it('ranks real maps with real weights', () => {
    const rows = scryRows(data, n => n === 'The Doctor' ? 1000 : 1, { cardsPerMap: 3, fromMap: null, canScry, orbPrice: () => null })
    expect(rows.length).toBeGreaterThan(90)
    expect(rows.find(r => r.map === 'Burial Chambers Map')?.cards.some(c => c.name === 'The Doctor')).toBe(true)
  })
})

describe('widget', () => {
  it('starts hidden with three cards a map', () => {
    expect(initScryingWidget(7)).toMatchObject({ wmId: 7, wmType: SCRYING_TYPE, wmWants: 'hide', cardsPerMap: 3, sort: 'gain', fromMap: null })
  })
})
