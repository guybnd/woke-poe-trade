// Net worth: a thin item's poe.ninja price jump is held (The Witch read
// 7,075c for two hours while it was worth 0.2c), and a read a price glitch
// moved is left out of the chart.
import { describe, it, expect } from 'vitest'
import { baselineOf, holdJump, valueStash, HOLD_MS } from '@/web/woke/net-worth/valuation'
import { priceSpikes, seriesFor, valueByTab } from '@/web/woke/net-worth/ledger'
import { heldNote } from '@/web/woke/net-worth/tips'
import { pricedOnlyToday } from '@/web/woke/market/parse'
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
    expect(holdJump(7075, { thin: true }, prev, T0)).toEqual({ chaos: 1, since: T0, kind: 'jump' })
    expect(holdJump(5, { thin: true }, prev, T0)).toEqual({ chaos: 1, since: T0, kind: 'jump' })
  })
  it('takes the price when the market is not thin, the rise is under 5×, or under 1c', () => {
    expect(holdJump(7075, { thin: false }, prev, T0)).toBeNull()
    expect(holdJump(4.9, { thin: true }, prev, T0)).toBeNull()
    expect(holdJump(0.9, { thin: true }, { ...prev, unitChaos: 0.1 }, T0)).toBeNull()
    expect(holdJump(7075, { thin: true }, undefined, T0)).toBeNull()
    expect(holdJump(7075, { thin: true }, { ...prev, unitChaos: 0 }, T0)).toBeNull()
  })
  it('takes the new price once it has been held 6 hours', () => {
    const held = { ...prev, heldSince: T0 }
    expect(holdJump(7075, { thin: true }, held, T0 + HOLD_MS - 1)).toEqual({ chaos: 1, since: T0, kind: 'jump' })
    expect(holdJump(7075, { thin: true }, held, T0 + HOLD_MS)).toBeNull()
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

describe('one-day prices', () => {
  // poe.ninja on 2026-11-22: The Web was 2.25c (priced daily), dropped off the
  // list for 8 hours, then came back at 28,886c priced on 1 of 7 days.
  const web = (chaos: number, gaps: number, category: 'cards' | 'gear' = 'cards'): PriceOf =>
    pricesOf({ 'The Web': { chaos, category, thin: gaps >= 3, gaps, oneDay: gaps === 6 } })
  const webTab = [{ name: 'Cards', id: 't1', items: [card('The Web', 7)] }]
  const none: PriceOf = () => null
  const line = (v: ReturnType<typeof valueStash>) => [...v.lines, ...v.unpricedLines].find(l => l.key === 'The Web')!

  it('keeps the last solid price through reads with no price, and holds the fake at it', () => {
    let base = baselineOf(valueStash(webTab, web(2.25, 0), undefined, { before: null, now: T0 }))
    expect(base['The Web'].ref).toBe(2.25)
    base = baselineOf(valueStash(webTab, none, undefined, { before: base, now: T0 + H }))
    expect(base['The Web'].unitChaos).toBe(0)
    expect(base['The Web'].ref).toBe(2.25)
    const v = valueStash(webTab, web(28886, 6), undefined, { before: base, now: T0 + 9 * H })
    expect(line(v).unitChaos).toBe(2.25)
    expect(line(v).heldKind).toBe('one-day')
    expect(v.byCategory.cards).toBeCloseTo(7 * 2.25)
    // Still one day, a day later: still held (no time limit).
    const later = valueStash(webTab, web(28886, 6), undefined, { before: baselineOf(v), now: T0 + 40 * H })
    expect(line(later).unitChaos).toBe(2.25)
  })

  it('counts nothing for a one-day price with no solid price to check it, including an old baseline', () => {
    const fresh = valueStash(webTab, web(28886, 6), undefined, { before: null, now: T0 })
    expect(line(fresh).unitChaos).toBe(0)
    expect(fresh.chaos).toBe(0)
    expect(heldNote(line(fresh), c => `${c}c`)).toContain('Not counted')
    // A baseline from before refs, already holding the fake price.
    const poisoned: Baseline = { 'The Web': { name: 'The Web', icon: '', count: 7, unitChaos: 28886, cat: 'cards' } }
    expect(line(valueStash(webTab, web(28886, 6), undefined, { before: poisoned, now: T0 })).unitChaos).toBe(0)
  })

  it('counts a one-day price near the last solid price, a cheap one, and once poe.ninja has a second day', () => {
    const base = baselineOf(valueStash(webTab, web(40, 1), undefined, { before: null, now: T0 }))
    expect(line(valueStash(webTab, web(60, 6), undefined, { before: base, now: T0 })).unitChaos).toBe(60)
    expect(line(valueStash(webTab, web(9, 6), undefined, { before: null, now: T0 })).unitChaos).toBe(9)
    const held = baselineOf(valueStash(webTab, web(28886, 6), undefined, { before: null, now: T0 }))
    // Priced a second day but still thin and a 5x jump over... nothing solid: taken.
    expect(line(valueStash(webTab, web(28886, 5), undefined, { before: held, now: T0 + H })).unitChaos).toBe(28886)
  })

  it('leaves gear to the jump rule: a quiet unique or gem keeps its price', () => {
    expect(line(valueStash(webTab, web(1650, 6, 'gear'), undefined, { before: null, now: T0 })).unitChaos).toBe(1650)
  })

  it('gives a one-day hold that ends the full 6 hours as a jump', () => {
    const base = baselineOf(valueStash(webTab, web(2.25, 0), undefined, { before: null, now: T0 }))
    const oneDay = baselineOf(valueStash(webTab, web(28886, 6), undefined, { before: base, now: T0 }))
    expect(oneDay['The Web'].heldKind).toBe('one-day')
    const second = valueStash(webTab, web(28886, 5), undefined, { before: oneDay, now: T0 + 10 * H })
    expect(line(second).unitChaos).toBe(2.25)
    expect(line(second).heldKind).toBe('jump')
    expect(line(second).heldSince).toBe(T0 + 10 * H)
    expect(baselineOf(second)['The Web'].ref).toBe(2.25)
  })

  it('a held price is never the solid one', () => {
    const base = baselineOf(valueStash(webTab, web(2.25, 0), undefined, { before: null, now: T0 }))
    const v = valueStash(webTab, web(28886, 6), undefined, { before: base, now: T0 })
    expect(baselineOf(v)['The Web'].ref).toBe(2.25)
  })
})

describe('pricedOnlyToday', () => {
  it('is a price today and none before, not an empty or quiet line', () => {
    expect(pricedOnlyToday([null, null, null, null, null, null, 40])).toBe(true)
    expect(pricedOnlyToday([40])).toBe(true)
    expect(pricedOnlyToday([])).toBe(false)
    expect(pricedOnlyToday([null, null, null, null, null, null, null])).toBe(false)
    expect(pricedOnlyToday([null, null, 3, null, null, null, 40])).toBe(false)
    expect(pricedOnlyToday([null, null, null, null, null, 40, null])).toBe(false)
    // A league's first day has no days before.
    expect(pricedOnlyToday([40], 1)).toBe(false)
    expect(pricedOnlyToday([5, null, 40], 2)).toBe(true)
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
