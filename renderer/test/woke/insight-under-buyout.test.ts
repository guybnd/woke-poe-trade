// Whisper listings far under the instant buyouts are bait (WOKEPOET-541).
import { describe, expect, it } from 'vitest'
import { buildInsight } from '@/web/woke/price-insight/insight'
import type { InsightListing } from '@/web/woke/price-insight/insight'

const NOW = Date.parse('2026-11-24T12:00:00Z')
let n = 0
function listing (chaos: number, instant: boolean, over: Partial<InsightListing> = {}): InsightListing {
  n++
  return {
    id: `l${n}`,
    priceAmount: chaos,
    priceCurrency: 'chaos',
    indexedAt: new Date(NOW - 86_400_000).toISOString(),
    hasNote: true,
    hasFee: instant,
    isMine: false,
    accountName: `s${n}`,
    accountStatus: 'online',
    listedTimes: 1,
    ...over
  }
}

describe('whisper listings under the instant buyouts', () => {
  it('drops whisper listings under 60% of the cheapest buyout, and says why', () => {
    // Too close to the next listings for the older bait rule (under half of them).
    const w1 = listing(55, false)
    const w2 = listing(58, false)
    const rows = [w1, w2, listing(100, true), listing(100, true), listing(98, false), listing(105, true)]
    const insight = buildInsight(rows, { divine: 200, now: NOW })
    expect(insight.dropped.get(w1.id)).toBe('underbuy')
    expect(insight.dropped.get(w2.id)).toBe('underbuy')
    expect(insight.kept.map(k => k.chaos)).toEqual([98, 100, 100, 105])
    expect(insight.signals.find(s => s.kind === 'bait')?.text).toBe('2 whisper listings far under the instant buyouts: likely bait')
  })

  it('keeps a whisper listing close to the buyouts', () => {
    const w = listing(70, false)
    const insight = buildInsight([w, listing(95, true), listing(100, true), listing(102, true)], { divine: 200, now: NOW })
    expect(insight.dropped.has(w.id)).toBe(false)
  })

  it('needs buyouts from two sellers', () => {
    const w = listing(40, false)
    const insight = buildInsight([w, listing(45, false), listing(50, false), listing(100, true, { accountName: 'one' }), listing(101, true, { accountName: 'one' })], { divine: 200, now: NOW })
    expect(insight.dropped.get(w.id)).not.toBe('underbuy')
  })

  it('never drops an instant buyout this way', () => {
    const cheap = listing(30, true)
    const insight = buildInsight([cheap, listing(95, true), listing(100, true), listing(101, false)], { divine: 200, now: NOW })
    expect(insight.dropped.has(cheap.id)).toBe(false)
  })

  it('leaves them in when most listings ask that: then it is the market', () => {
    const whispers = Array.from({ length: 6 }, () => listing(50, false))
    const insight = buildInsight([...whispers, listing(100, true), listing(102, true)], { divine: 200, now: NOW })
    expect(whispers.some(w => insight.dropped.get(w.id) === 'underbuy')).toBe(false)
  })
})
