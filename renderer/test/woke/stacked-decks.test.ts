import { describe, expect, it } from 'vitest'
import {
  IDLE_END_MS, MAX_SIMULATED_DECKS, REPLAY_MAX_MS, calibration, markSeen, replaySince, expectedValue, isBigHit, isOver, luckPercentile, openOrSell, ownAverage,
  parseCardLine, recordPrice, runningResult, startSession, toRecord, totals
} from '@/web/woke/stacked-decks/deck'
import type { PriceOf } from '@/web/woke/stacked-decks/deck'
import { WEIGHTS } from '@/web/woke/stacked-decks/weights'

const PRICES: Record<string, number> = { 'Rain of Chaos': 0.5, 'The Lover': 1, 'Her Mask': 2, 'The Doctor': 900 }
const price: PriceOf = name => PRICES[name] ?? null

describe('parseCardLine', () => {
  it('reads the card from the Client.txt line', () => {
    expect(parseCardLine('2026/11/08 18:04:11 3725546 1186a8a3 [INFO Client 4567] : Card drawn from the deck: <divination>{The Doctor}')).toBe('The Doctor')
    expect(parseCardLine("2026/11/08 18:04:11 1 a [INFO Client 1] : Card drawn from the deck: <divination>{The Wolven King's Bite}")).toBe("The Wolven King's Bite")
  })

  it('ignores other lines, and chat that only quotes it', () => {
    expect(parseCardLine('2026/11/08 18:04:11 1 a [INFO Client 1] : You have entered Strand.')).toBeNull()
    expect(parseCardLine('2026/11/08 18:04:11 1 a [INFO Client 1] @From Someone: Card drawn from the deck: <divination>{The Doctor}')).toBeNull()
  })
})

describe('totals', () => {
  const draws = ['Rain of Chaos', 'Rain of Chaos', 'The Doctor', 'Her Mask', 'Unknown Card']

  it('adds up spent, got and the result, by card total', () => {
    const t = totals(draws, price, 3)
    expect(t.decks).toBe(5)
    expect(t.spent).toBe(15)
    expect(t.got).toBe(903)
    expect(t.result).toBe(888)
    expect(t.unpriced).toBe(1)
    expect(t.rows.map(r => r.name)).toEqual(['The Doctor', 'Her Mask', 'Rain of Chaos', 'Unknown Card'])
    expect(t.rows.find(r => r.name === 'Rain of Chaos')).toMatchObject({ qty: 2, total: 1 })
  })

  it('takes one copy of the best card off for "without top card"', () => {
    const t = totals(draws, price, 3)
    expect(t.top?.name).toBe('The Doctor')
    expect(t.withoutTop).toBe(888 - 900)
  })

  it('has no spent or result without a deck price', () => {
    const t = totals(draws, price, null)
    expect(t.spent).toBeNull()
    expect(t.result).toBeNull()
    expect(t.withoutTop).toBeNull()
  })
})

describe('runningResult', () => {
  it('is the result after each deck', () => {
    expect(runningResult(['Rain of Chaos', 'The Doctor', 'Her Mask'], price, 3)).toEqual([-2.5, 894.5, 893.5])
  })

  it('thins long sessions and keeps the last point', () => {
    const draws = Array.from({ length: 1000 }, () => 'The Lover')
    const pts = runningResult(draws, price, 3, 100)
    expect(pts.length).toBeLessThanOrEqual(101)
    expect(pts[pts.length - 1]).toBe(-2000)
  })
})

describe('sessions', () => {
  it('end after 15 minutes without a card', () => {
    const s = startSession(1000, 'Allflame', 3, 180)
    expect(isOver(s, 1000 + IDLE_END_MS - 1)).toBe(false)
    expect(isOver(s, 1000 + IDLE_END_MS)).toBe(true)
  })

  it('save with their prices, which a record keeps', () => {
    const s = startSession(1000, 'Allflame', null, null)
    s.draws.push('The Doctor', 'Rain of Chaos', 'Rain of Chaos')
    const r = toRecord(s, 2000, price, 3, 180)
    expect(r).toMatchObject({ decks: 3, deckChaos: 3, divine: 180, endedAt: 2000, league: 'Allflame' })
    expect(r.cards).toEqual([{ name: 'The Doctor', qty: 1, chaos: 900 }, { name: 'Rain of Chaos', qty: 2, chaos: 0.5 }])
    expect(recordPrice(r)('The Doctor')).toBe(900)
    expect(recordPrice(r)('Her Mask')).toBeNull()
  })
})

describe('ownAverage (D1) and openOrSell (C1)', () => {
  // 200 decks: 199 Lovers (1c) and one Doctor (900c).
  const records = [{ decks: 200, cards: [{ name: 'The Lover', qty: 199, chaos: 1 }, { name: 'The Doctor', qty: 1, chaos: 900 }] }]

  it('averages at today\'s prices, and without the luckiest 1%', () => {
    const own = ownAverage(records, price)!
    expect(own.decks).toBe(200)
    expect(own.perDeck).toBeCloseTo((199 + 900) / 200)
    // 1% of 200: the Doctor and one Lover come off.
    expect(own.perDeckTrimmed).toBeCloseTo(198 / 198)
  })

  it('says open, open for luck, or sell', () => {
    const own = ownAverage(records, price)!
    expect(openOrSell(own, 0.5)).toBe('open')
    expect(openOrSell(own, 3)).toBe('luck')
    expect(openOrSell(own, 6)).toBe('sell')
  })

  it('has nothing to say without decks', () => {
    expect(ownAverage([], price)).toBeNull()
  })
})

describe('community weights (D2) and luck (C3)', () => {
  const tiny = { patch: 't', samples: 1, weights: { 'Rain of Chaos': 3, 'The Doctor': 1 } }

  it('expects the weighted value of a deck', () => {
    const e = expectedValue(tiny, price)!
    expect(e.perDeck).toBeCloseTo(0.75 * 0.5 + 0.25 * 900)
    expect(e.unpricedShare).toBe(0)
  })

  it('bundles the Prohibited Library weights', () => {
    expect(Object.keys(WEIGHTS.weights).length).toBeGreaterThan(300)
    expect(WEIGHTS.weights['Rain of Chaos']).toBeGreaterThan(WEIGHTS.weights['The Doctor'] ?? 0)
  })

  it('calibrates the weights by your own decks only once there are enough', () => {
    const e = expectedValue(tiny, price)!
    expect(calibration({ decks: 100, perDeck: 400, perDeckTrimmed: 400 }, e)).toBe(1)
    expect(calibration({ decks: 600, perDeck: e.perDeck * 1.2, perDeckTrimmed: 1 }, e)).toBeCloseTo(1.2)
    // A wild ratio is kept in range.
    expect(calibration({ decks: 600, perDeck: 1e6, perDeckTrimmed: 1e6 }, e)).toBe(1.6)
  })

  it('puts a session among simulated ones, the same way every time', () => {
    const e = expectedValue({ patch: 't', samples: 1, weights: { 'Rain of Chaos': 1, 'The Lover': 1 } }, price)!
    // 10 decks of 0.5c or 1c: all Lovers is as lucky as it gets.
    expect(luckPercentile(e, 10, 10, 1, 7)).toBeGreaterThan(0.99)
    expect(luckPercentile(e, 10, 5, 1, 7)).toBeLessThan(0.01)
    const mid = luckPercentile(e, 10, 7.5, 1, 7)!
    expect(mid).toBeGreaterThan(0.3)
    expect(mid).toBeLessThan(0.7)
    expect(luckPercentile(e, 10, 7.5, 1, 7)).toBe(mid)
  })
})

describe('luck for long sessions', () => {
  it('uses a normal curve past the simulation cap', () => {
    const e = expectedValue({ patch: 't', samples: 1, weights: { 'Rain of Chaos': 1, 'The Lover': 1 } }, price)!
    const n = MAX_SIMULATED_DECKS * 2
    expect(luckPercentile(e, n, 0.75 * n)).toBeCloseTo(0.5, 2)
    expect(luckPercentile(e, n, 0.75 * n + 100)).toBeGreaterThan(0.99)
  })
})

describe('replay marks', () => {
  const T = new Date(2026, 10, 8, 18, 4, 11).getTime()
  const a = '2026/11/08 18:04:11 1 a [INFO Client 1] : Card drawn from the deck: <divination>{The Lover}'
  const b = '2026/11/08 18:04:11 2 a [INFO Client 1] : Card drawn from the deck: <divination>{The Lover}'

  it('counts a line once, and another line of the same second', () => {
    const w = { seenUntil: null as number | null, seenLines: [] as string[] }
    expect(markSeen(w, a, T)).toBe(true)
    expect(markSeen(w, a, T)).toBe(false)
    expect(markSeen(w, b, T + 400)).toBe(true)
    expect(w).toEqual({ seenUntil: T, seenLines: [a, b] })
    expect(markSeen(w, 'later', T + 1000)).toBe(true)
    expect(w.seenLines).toEqual(['later'])
  })

  it('replays from the second of the last card, at most half a day back', () => {
    expect(replaySince(T, T + 60_000)).toBe(T - 1000)
    expect(replaySince(T, T + REPLAY_MAX_MS * 3)).toBe(T + REPLAY_MAX_MS * 2)
    expect(replaySince(null, T)).toBeNull()
  })
})

describe('isBigHit', () => {
  it('is at or above the line in divines', () => {
    expect(isBigHit(180, 180, 1)).toBe(true)
    expect(isBigHit(179, 180, 1)).toBe(false)
    expect(isBigHit(900, null, 1)).toBe(false)
    expect(isBigHit(null, 180, 1)).toBe(false)
  })
})
