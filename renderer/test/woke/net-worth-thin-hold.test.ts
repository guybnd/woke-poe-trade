// Net worth: a thin item's poe.ninja price jump is held (The Witch read
// 7,075c for two hours while it was worth 0.2c), and a read a price glitch
// moved is left out of the chart.
import { describe, it, expect } from 'vitest'
import { baselineOf, holdJump, valueStash, HOLD_MS } from '@/web/woke/net-worth/valuation'
import { priceSpikes, seriesFor, valueByTab } from '@/web/woke/net-worth/ledger'
import { heldNote } from '@/web/woke/net-worth/tips'
import type { LedgerPoint } from '@/web/woke/net-worth/ledger'
import type { Baseline, Priced, PriceOf, StashItemLike } from '@/web/woke/net-worth/valuation'

const H = 3_600_000
const T0 = Date.UTC(2026, 10, 22, 2, 53)
const card = (typeLine: string, stack: number): StashItemLike => ({ name: '', typeLine, baseType: typeLine, frame: 6, stack, icon: '' })
const tabs = [{ name: 'Cards', id: 't1', items: [card('The Witch', 13), card('Rain Tempter', 14), card('The Doctor', 1)] }]
const pricesOf = (p: Record<string, Priced>): PriceOf => (i) => p[i.typeLine] ?? null

const normal = pricesOf({
  'The Witch': { chaos: 1, category: 'cards', thin: true },
  'Rain Tempter': { chaos: 0.5, category: 'cards', thin: true },
  'The Doctor': { chaos: 1000, category: 'cards' }
})
const glitch = pricesOf({
  'The Witch': { chaos: 7075, category: 'cards', thin: true },
  'Rain Tempter': { chaos: 857.5, category: 'cards', thin: true },
  'The Doctor': { chaos: 6000, category: 'cards' }
})

describe('holdJump', () => {
  const prev = { name: 'x', icon: '', count: 1, unitChaos: 1 }
  it('holds a 5× jump in a thin market', () => {
    expect(holdJump(7075, true, prev, T0)).toEqual({ chaos: 1, since: T0 })
    expect(holdJump(5, true, prev, T0)).toEqual({ chaos: 1, since: T0 })
  })
  it('takes the price when the market is not thin, the rise is under 5×, or under 1c', () => {
    expect(holdJump(7075, false, prev, T0)).toBeNull()
    expect(holdJump(4.9, true, prev, T0)).toBeNull()
    expect(holdJump(0.9, true, { ...prev, unitChaos: 0.1 }, T0)).toBeNull()
    expect(holdJump(7075, true, undefined, T0)).toBeNull()
    expect(holdJump(7075, true, { ...prev, unitChaos: 0 }, T0)).toBeNull()
  })
  it('takes the new price once it has been held 6 hours', () => {
    const held = { ...prev, heldSince: T0 }
    expect(holdJump(7075, true, held, T0 + HOLD_MS - 1)).toEqual({ chaos: 1, since: T0 })
    expect(holdJump(7075, true, held, T0 + HOLD_MS)).toBeNull()
  })
})

describe('valuing with the last read', () => {
  const before = baselineOf(valueStash(tabs, normal))

  it('keeps the last read\'s price for the glitched thin cards, not for a liquid one', () => {
    const v = valueStash(tabs, glitch, undefined, { before, now: T0 })
    const witch = v.lines.find(l => l.key === 'The Witch')!
    expect(witch.unitChaos).toBe(1)
    expect(witch.ninjaChaos).toBe(7075)
    expect(witch.heldSince).toBe(T0)
    expect(v.lines.find(l => l.key === 'Rain Tempter')!.unitChaos).toBe(0.5)
    // Not thin: a real 6× move counts.
    expect(v.lines.find(l => l.key === 'The Doctor')!.unitChaos).toBe(6000)
    expect(v.byCategory.cards).toBe(13 + 7 + 6000)
    expect(valueByTab(tabs, glitch, undefined, { before, now: T0 })[0].chaos).toBe(13 + 7 + 6000)
  })

  it('stays held across reads, then takes the price after 6 hours', () => {
    const first = valueStash(tabs, glitch, undefined, { before, now: T0 })
    const base = baselineOf(first)
    expect(base['The Witch'].heldSince).toBe(T0)
    expect(base['The Witch'].unitChaos).toBe(1)
    const later = valueStash(tabs, glitch, undefined, { before: base, now: T0 + 2 * H })
    expect(later.lines.find(l => l.key === 'The Witch')!.unitChaos).toBe(1)
    const after = valueStash(tabs, glitch, undefined, { before: baselineOf(later), now: T0 + HOLD_MS })
    const witch = after.lines.find(l => l.key === 'The Witch')!
    expect(witch.unitChaos).toBe(7075)
    expect(witch.heldSince).toBeUndefined()
    expect(baselineOf(after)['The Witch'].heldSince).toBeUndefined()
  })

  it('lets go when poe.ninja falls back', () => {
    const base = baselineOf(valueStash(tabs, glitch, undefined, { before, now: T0 }))
    const back = valueStash(tabs, normal, undefined, { before: base, now: T0 + H })
    expect(back.lines.find(l => l.key === 'The Witch')!.heldSince).toBeUndefined()
    expect(baselineOf(back)['The Witch'].heldSince).toBeUndefined()
  })

  it('starts no hold when you remove your own price, or for an ignored item', () => {
    const own = baselineOf(valueStash(tabs, glitch, { prices: { 'The Witch': 0.5 }, ignored: [] }))
    expect(own['The Witch'].mine).toBe(true)
    const v = valueStash(tabs, glitch, undefined, { before: own, now: T0 })
    expect(v.lines.find(l => l.key === 'The Witch')!.unitChaos).toBe(7075)
    const ign = valueStash(tabs, glitch, { prices: {}, ignored: ['The Witch'] }, { before, now: T0 })
    expect(ign.ignoredLines.find(l => l.key === 'The Witch')!.unitChaos).toBe(7075)
    expect(baselineOf(ign)['The Witch'].heldSince).toBeUndefined()
  })

  it('never holds your own price, and no guard means poe.ninja\'s', () => {
    const v = valueStash(tabs, glitch, { prices: { 'The Witch': 3 }, ignored: [] }, { before, now: T0 })
    expect(v.lines.find(l => l.key === 'The Witch')!.unitChaos).toBe(3)
    expect(valueStash(tabs, glitch).lines.find(l => l.key === 'The Witch')!.unitChaos).toBe(7075)
  })

  it('says why on the hover', () => {
    const v = valueStash(tabs, glitch, undefined, { before, now: T0 })
    const note = heldNote(v.lines.find(l => l.key === 'The Witch')!, c => `${c}c`)!
    expect(note).toContain('poe.ninja says 7075c')
    expect(note).toContain('thin market')
    expect(heldNote(v.lines.find(l => l.key === 'The Doctor')!, c => `${c}c`)).toBeUndefined()
  })
})

describe('priceSpikes', () => {
  const cats = (cards: number) => ({ currency: 0, fragments: 0, cards, gear: 0, other: 0 })
  const p = (at: number, chaos: number, netChaos: number | null): LedgerPoint => ({ at, chaos, divine: 214, byCategory: cats(chaos), netChaos, top: [] })
  // Guy's reads on 2026-11-22: 4 pm doubled by The Witch and Rain Tempter.
  const reads = [p(1, 82955, 1137), p(2, 196339, -4288), p(3, 100436, 7824), p(4, 100673, 238)]

  it('finds the 4 pm read and charts it at the read before\'s prices', () => {
    expect([...priceSpikes(reads)]).toEqual([2])
    const s = seriesFor(reads, {}, 'league', 5, 214)
    expect(s.map(x => x.at)).toEqual([1, 2, 3, 4])
    expect(s[1].div * 214).toBeCloseTo(82955 - 4288)
    expect(s[1].byCategory.cards * 214).toBeCloseTo(82955 - 4288)
    // What came in at that read still shows.
    expect(s[1].netDiv! * 214).toBeCloseTo(-4288)
  })

  it('keeps a real jump that stays, items coming in, and a drop that comes back by trading', () => {
    // Prices rise and stay.
    expect(priceSpikes([p(1, 100, 0), p(2, 200, 0), p(3, 205, 0)]).size).toBe(0)
    // A big drop in, then sold back out: items, not prices.
    expect(priceSpikes([p(1, 100, 0), p(2, 300, 200), p(3, 100, -200)]).size).toBe(0)
    // Small wobble.
    expect(priceSpikes([p(1, 100, 0), p(2, 120, 0), p(3, 100, 0)]).size).toBe(0)
    // Unknown change (tabs changed): left alone.
    expect(priceSpikes([p(1, 100, 0), p(2, 300, null), p(3, 100, 0)]).size).toBe(0)
  })

  it('finds a glitch down too', () => {
    expect([...priceSpikes([p(1, 1000, 0), p(2, 400, 0), p(3, 990, 0)])]).toEqual([2])
  })
})

// The Baseline type still reads an old baseline (no heldSince).
const old: Baseline = { 'The Witch': { name: 'The Witch', icon: '', count: 13, unitChaos: 1 } }
void old
