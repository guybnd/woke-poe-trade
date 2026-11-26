// Guy's picks from the assumptions audit (2026-11-26).
import { describe, expect, it } from 'vitest'
import { DIVINE_ON, divineOnFrom, saleChaos } from '@/web/woke/net-worth/sales'
import type { Rates } from '@/web/woke/net-worth/sales'
import { emptyHistory, lastDivine } from '@/web/woke/net-worth/valuation'
import { EARLY_SHOW_MS, SHOW_MS, showMsFor } from '@/web/woke/shared/trade-quotes'
import { stashSearch } from '@/web/woke/price-insight/tier-ladder'

const H = 3_600_000
const DAY = 24 * H

describe('a sale in divines counts at its own day\'s rate', () => {
  const days = { '2026-11-20': { at: 1000 * DAY, divine: 150 }, '2026-11-24': { at: 1004 * DAY, divine: 200 } }
  const rates: Rates = { chaos: 1, divine: 250, [DIVINE_ON]: divineOnFrom(days) }

  it('uses the nearest saved day within a day and a half', () => {
    expect(saleChaos({ price: { amount: 2, currency: 'divine' }, at: 1000 * DAY + 5 * H }, rates)).toBe(300)
    expect(saleChaos({ price: { amount: 2, currency: 'divine' }, at: 1004 * DAY - 10 * H }, rates)).toBe(400)
  })
  it('falls back to today\'s rate with no saved day near it, or with no time', () => {
    expect(saleChaos({ price: { amount: 2, currency: 'divine' }, at: 1002 * DAY }, rates)).toBe(500)
    expect(saleChaos({ price: { amount: 2, currency: 'divine' } }, rates)).toBe(500)
  })
  it('leaves chaos and other currencies alone', () => {
    expect(saleChaos({ price: { amount: 30, currency: 'chaos' }, at: 1000 * DAY }, rates)).toBe(30)
    expect(saleChaos({ price: { amount: 1, currency: 'exalted' }, at: 1000 * DAY }, { ...rates, exalted: 12 })).toBe(12)
  })
})

describe('the last saved divine rate stands in before poe.ninja loads', () => {
  it('is the newest day with a rate', () => {
    const h = { ...emptyHistory(), days: { a: { at: 1, chaos: 0, divine: 150, byCategory: {} }, b: { at: 3, chaos: 0, divine: null, byCategory: {} }, c: { at: 2, chaos: 0, divine: 180, byCategory: {} } } } as never
    expect(lastDivine(h)).toBe(180)
    expect(lastDivine(emptyHistory())).toBeNull()
  })
})

describe('unid quotes in a league\'s first week', () => {
  it('stand in for 2 days, then 7', () => {
    const start = 5000 * DAY
    expect(showMsFor(start + 3 * DAY, start)).toBe(EARLY_SHOW_MS)
    expect(showMsFor(start + 8 * DAY, start)).toBe(SHOW_MS)
    expect(showMsFor(start + 3 * DAY, null)).toBe(SHOW_MS)
  })
})

describe('stash search length', () => {
  it('keeps mod text up to the box\'s 250 characters', () => {
    const text = 'Adds # to # Physical Damage to Attacks against Enemies that are on Low Life'
    expect(stashSearch(text)).toBe('"physical damage to attacks against enemies that are on low life"')
  })
})
