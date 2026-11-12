// Search palette quick answers: currency maths, countdowns, web search.
import { describe, it, expect } from 'vitest'
import { countdownLookup, currencyLookup, NEXT_LEAGUE, parseCurrencyQuery, webLookup } from '@/web/woke/search/lookups/answers'
import type { LookupContext } from '@/web/woke/search/lookups/types'

const PRICES: Record<string, number> = { 'Chaos Orb': 1, 'Divine Orb': 240, 'Mirror of Kalandra': 120000, 'Orb of Annulment': 4, 'Orb of Alchemy': 0.25 }
const ctx = (over: Partial<LookupContext> = {}): LookupContext => ({
  price: n => PRICES[n] ?? null,
  tools: new Set(),
  divine: 240,
  now: Date.UTC(2026, 10, 12, 10),
  league: null,
  ...over
})
const currency = currencyLookup(Object.keys(PRICES))

describe('parseCurrencyQuery', () => {
  const names = (t: string) => ({ div: 'Divine Orb', c: 'Chaos Orb', chaos: 'Chaos Orb' } as Record<string, string>)[t.trim()] ?? null
  it('reads amounts, k and a target', () => {
    expect(parseCurrencyQuery('3.5 div', names)).toEqual({ amount: 3.5, from: 'Divine Orb', to: null })
    expect(parseCurrencyQuery('450c', names)).toEqual({ amount: 450, from: 'Chaos Orb', to: null })
    expect(parseCurrencyQuery('2k chaos', names)).toEqual({ amount: 2000, from: 'Chaos Orb', to: null })
    expect(parseCurrencyQuery('1,200 c in div', names)).toEqual({ amount: 1200, from: 'Chaos Orb', to: 'Divine Orb' })
    expect(parseCurrencyQuery('1,5 div', names)).toEqual({ amount: 1.5, from: 'Divine Orb', to: null })
  })
  it('ignores what is not currency maths', () => {
    expect(parseCurrencyQuery('div', names)).toBeNull()
    expect(parseCurrencyQuery('3 headhunter', names)).toBeNull()
    expect(parseCurrencyQuery('0 div', names)).toBeNull()
    expect(parseCurrencyQuery('3 div in nothing', names)).toBeNull()
  })
})

describe('currencyLookup', () => {
  it('turns divines into chaos', () => {
    const [card] = currency('3.5 div', ctx())
    expect(card.name).toBe('3.5 Divine Orb = 840 c')
    expect(card.actions[0]).toEqual({ label: 'Copy 840', copy: '840' })
  })
  it('turns chaos into divines', () => {
    const [card] = currency('480c', ctx())
    expect(card.name).toBe('480 Chaos Orb = 2 div')
  })
  it('converts to a named currency, by full name too', () => {
    const [card] = currency('1 mirror in div', ctx())
    expect(card.name).toBe('1 Mirror of Kalandra = 500 Divine Orb')
    expect(currency('10 orb of annul', ctx())[0].name).toBe('10 Orb of Annulment = 40 c')
  })
  it('keeps decimals under a thousand', () => {
    expect(currency('12.5 div', ctx())[0].name).toBe('12.5 Divine Orb = 3,000 c')
    expect(currency('3000c', ctx())[0].name).toBe('3,000 Chaos Orb = 12.5 div')
  })
  it('leaves a name that fits several currencies alone', () => {
    expect(currency('10 orb', ctx())).toEqual([])
  })
  it('stays quiet without a price', () => {
    expect(currency('3 div', ctx({ price: n => n === 'Chaos Orb' ? 1 : null }))).toEqual([])
    expect(currency('Mageblood', ctx())).toEqual([])
  })
})

describe('countdownLookup', () => {
  it('counts down to the lab reset at midnight UTC', () => {
    const [card] = countdownLookup('lab', ctx())
    expect(card.name).toBe('Lab layout resets in 14h 00m')
  })
  it('counts down to the next league, then counts league days', () => {
    const before = countdownLookup('league', ctx())
    expect(before.map(c => c.id)).toEqual(['answer:league-next'])
    expect(before[0].name).toBe(`${NEXT_LEAGUE.name} starts in 1d 9h 00m`)
    const after = countdownLookup('league', ctx({ now: NEXT_LEAGUE.startsAt + 3 * 86400e3, league: { name: 'Covens of Umbra', startedAt: NEXT_LEAGUE.startsAt } }))
    expect(after.map(c => c.name)).toEqual(['Day 4 of Covens of Umbra'])
    const standard = countdownLookup('league', ctx({ now: NEXT_LEAGUE.startsAt + 86400e3, league: { name: 'Standard', startedAt: Date.UTC(2013, 0, 23) } }))
    expect(standard).toEqual([])
  })
  it('stays out of unrelated searches', () => {
    expect(countdownLookup('mageblood', ctx())).toEqual([])
    for (const q of ['star', 'start', 'res', 'time', 'la', 'end', 'new']) expect(countdownLookup(q, ctx())).toEqual([])
    expect(countdownLookup('labyrinth', ctx()).map(c => c.id)).toEqual(['answer:lab-reset'])
  })
})

describe('webLookup', () => {
  it('searches poewiki and poedb with what you typed', () => {
    const cards = webLookup('soul of lunaris', ctx())
    expect(cards.map(c => c.actions[0])).toEqual([
      { label: 'Open poewiki', url: 'https://www.poewiki.net/index.php?search=soul%20of%20lunaris' },
      { label: 'Open poedb', url: 'https://poedb.tw/us/search?q=soul%20of%20lunaris' }
    ])
    expect(webLookup('x', ctx())).toEqual([])
  })
})
