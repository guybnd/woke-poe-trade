import { describe, expect, it } from 'vitest'
import { ageBand, groupListings, rowTitle, shortAge, RowListing } from '@/web/woke/price-insight/listing-rows'
import type { DropReason } from '@/web/woke/price-insight/insight'

const NOW = Date.parse('2026-11-05T12:00:00Z')
const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

let seq = 0
function listing (over: Partial<RowListing> & { hoursAgo?: number } = {}): RowListing {
  const { hoursAgo = 1, ...rest } = over
  seq += 1
  return {
    id: `l${seq}`,
    priceAmount: 5,
    priceCurrency: 'chaos',
    listedTimes: 1,
    hasFee: true,
    hasNote: true,
    isMine: false,
    accountName: `seller${seq}`,
    accountStatus: 'online',
    indexedAt: new Date(NOW - hoursAgo * HOUR).toISOString(),
    relativeDate: `${hoursAgo} hr. ago`,
    ...rest
  }
}

describe('ageBand', () => {
  it('splits at a day and at a week', () => {
    expect(ageBand(DAY)).toBe('fresh')
    expect(ageBand(DAY + 1)).toBe('aging')
    expect(ageBand(7 * DAY)).toBe('aging')
    expect(ageBand(7 * DAY + 1)).toBe('stale')
  })

  it('does not mark a listing with no time as stale', () => {
    expect(ageBand(null)).toBe('fresh')
  })
})

describe('shortAge', () => {
  it('uses the largest whole unit', () => {
    expect(shortAge(30_000)).toBe('now')
    expect(shortAge(5 * 60_000)).toBe('5m')
    expect(shortAge(23 * HOUR)).toBe('23h')
    expect(shortAge(3 * DAY + HOUR)).toBe('3d')
    expect(shortAge(65 * DAY)).toBe('2mo')
  })
})

describe('groupListings', () => {
  it('merges the same price into one row and keeps price order', () => {
    const rows = groupListings([
      listing({ priceAmount: 1 }),
      listing({ priceAmount: 1 }),
      listing({ priceAmount: 2 }),
      listing({ priceAmount: 3 })
    ], { now: NOW, merge: true })
    expect(rows.map(r => [r.lead.priceAmount, r.count])).toEqual([[1, 2], [2, 1], [3, 1]])
  })

  it('keeps different currencies apart', () => {
    const rows = groupListings([
      listing({ priceAmount: 1, priceCurrency: 'chaos' }),
      listing({ priceAmount: 1, priceCurrency: 'divine' })
    ], { now: NOW, merge: true })
    expect(rows).toHaveLength(2)
  })

  it('counts a seller\'s repeated listings and tells sellers apart', () => {
    const [row] = groupListings([
      listing({ listedTimes: 4, accountName: 'wall' }),
      listing({ listedTimes: 1, accountName: 'other' })
    ], { now: NOW, merge: true })
    expect(row.count).toBe(5)
    expect(row.sellers).toBe(2)
  })

  it('never hides a visible difference in a merged row', () => {
    const detail = (l: RowListing) => l.accountName
    const rows = groupListings([listing({ accountName: 'a' }), listing({ accountName: 'b' })], { now: NOW, merge: true, detail })
    expect(rows).toHaveLength(2)
  })

  it('keeps stash listings, listings without a note and your own listings on their own rows', () => {
    const rows = groupListings([
      listing(),
      listing({ hasFee: false }),
      listing({ hasFee: false, hasNote: false }),
      listing({ isMine: true })
    ], { now: NOW, merge: true })
    expect(rows).toHaveLength(4)
  })

  it('separates listings the verdict ignored, by reason, even when they are not next to each other', () => {
    const ghost = listing({ hoursAgo: 200 })
    const bait = listing()
    const kept1 = listing()
    const kept2 = listing()
    const dropped = new Map<string, DropReason>([[ghost.id, 'stale'], [bait.id, 'fixer']])
    const rows = groupListings([kept1, ghost, kept2, bait], { now: NOW, merge: true, dropped })
    expect(rows.map(r => [r.dropped, r.count])).toEqual([[undefined, 2], ['stale', 1], ['fixer', 1]])
  })

  it('shows the age range, and reads as fresh when any listing is', () => {
    const [row] = groupListings([listing({ hoursAgo: 2 }), listing({ hoursAgo: 24 * 25 })], { now: NOW, merge: true })
    expect(row.ageText).toBe('2h–25d')
    expect(row.band).toBe('fresh')
  })

  it('reads as stale when even the freshest listing is old', () => {
    const [row] = groupListings([listing({ hoursAgo: 24 * 8 }), listing({ hoursAgo: 24 * 9 })], { now: NOW, merge: true })
    expect(row.band).toBe('stale')
  })

  it('shows one age when every listing rounds to the same', () => {
    const [row] = groupListings([listing({ hoursAgo: 2 }), listing({ hoursAgo: 2 })], { now: NOW, merge: true })
    expect(row.ageText).toBe('2h')
  })

  it('takes the most available seller as the row status', () => {
    const [row] = groupListings([listing({ accountStatus: 'offline' }), listing({ accountStatus: 'afk' })], { now: NOW, merge: true })
    expect(row.status).toBe('afk')
  })

  it('survives listings with no usable time', () => {
    const [row] = groupListings([listing({ indexedAt: undefined }), listing({ indexedAt: 'nonsense' })], { now: NOW, merge: true })
    expect(row.ageText).toBe('')
    expect(row.band).toBe('fresh')
  })

  it('keeps one row per listing when not merging, even for a repeated id', () => {
    const a = listing()
    const rows = groupListings([a, { ...a }], { now: NOW, merge: false })
    expect(rows).toHaveLength(2)
    expect(new Set(rows.map(r => r.key)).size).toBe(2)
  })
})

describe('rowTitle', () => {
  it('is empty for a plain row', () => {
    const [row] = groupListings([listing()], { now: NOW, merge: true })
    expect(rowTitle(row)).toBeUndefined()
  })

  it('explains a group, a stale row and an ignored row', () => {
    const a = listing({ hoursAgo: 24 * 9, accountName: 'x' })
    const b = listing({ hoursAgo: 24 * 8, accountName: 'x' })
    const [row] = groupListings([a, b], { now: NOW, merge: true, dropped: new Map<string, DropReason>([[a.id, 'stale'], [b.id, 'stale']]) })
    const title = rowTitle(row)!
    expect(title).toContain('Ignored by the verdict')
    expect(title).toContain('2 listings from 1 seller')
    expect(title).toContain('over a week old')
  })
})
