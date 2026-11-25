// An instant buyout counts in full in the fair price, whoever is online:
// anyone can buy it from a merchant tab while the seller is offline.
import { describe, expect, it } from 'vitest'
import { buildInsight, listingWeight } from '@/web/woke/price-insight/insight'
import type { InsightListing } from '@/web/woke/price-insight/insight'

const NOW = Date.parse('2026-11-25T12:00:00Z')
const DAY = 86_400_000
let n = 0
function listing (chaos: number, instant: boolean, status: InsightListing['accountStatus'], ageDays = 1): InsightListing {
  n++
  return {
    id: `l${n}`,
    priceAmount: chaos,
    priceCurrency: 'chaos',
    indexedAt: new Date(NOW - ageDays * DAY).toISOString(),
    hasNote: true,
    hasFee: instant,
    isMine: false,
    accountName: `s${n}`,
    accountStatus: status,
    listedTimes: 1
  }
}

describe('instant buyout weight', () => {
  it('counts an offline, week-old instant buyout in full', () => {
    expect(listingWeight({ accountStatus: 'offline', indexedAt: new Date(NOW - 10 * DAY).toISOString(), hasFee: true }, NOW)).toBe(1)
  })

  it('still weighs whisper listings by status and age', () => {
    expect(listingWeight({ accountStatus: 'offline', indexedAt: new Date(NOW - 2 * DAY).toISOString(), hasFee: false }, NOW)).toBeCloseTo(0.32)
    expect(listingWeight({ accountStatus: 'online', indexedAt: new Date(NOW - 2 * DAY).toISOString() }, NOW)).toBeCloseTo(0.8)
  })

  it('keeps the fair price at the offline buyouts, not the online whispers above them', () => {
    const rows = [
      listing(100, true, 'offline'), listing(100, true, 'offline'), listing(101, true, 'offline'),
      listing(130, false, 'online'), listing(135, false, 'online'), listing(140, false, 'online')
    ]
    const insight = buildInsight(rows, { divine: 200, now: NOW })
    expect(insight.range?.fair).toBe(101)
    expect(insight.kept.slice(0, 3).every(k => k.weight === 1)).toBe(true)
  })
})
