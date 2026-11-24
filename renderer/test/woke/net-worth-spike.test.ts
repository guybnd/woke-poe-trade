// Net worth: a spike on poe.ninja's own 7-day line is counted at the line's
// usual price. Rain Tempter on 2026-11-23: about 4c all week, then 98.5c
// (+2,362%) on a market that wasn't thin, so it made 76% of a tab.
import { describe, it, expect } from 'vitest'
import { HOLD_MS, baselineOf, graphChaos, graphSpike, graphStep, historyName, holdJump, priceStep, seriesStep, valueStash } from '@/web/woke/net-worth/valuation'
import { heldNote } from '@/web/woke/net-worth/tips'
import type { Priced, PriceOf, StashItemLike } from '@/web/woke/net-worth/valuation'

const H = 3_600_000
const T0 = Date.UTC(2026, 10, 23, 8, 0)
const card = (typeLine: string, stack: number): StashItemLike => ({ name: '', typeLine, baseType: typeLine, frame: 6, stack, icon: '' })
const pricesOf = (p: Record<string, Priced>): PriceOf => (i) => p[i.typeLine] ?? null

// poe.ninja's line: % change from its first day, today last.
const RAIN_GRAPH = [0, 2.5, -1.2, 3.8, 1.1, 4.4, 2362]
const RAIN = 98.5
const rain = (graph: Array<number | null> = RAIN_GRAPH, chaos = RAIN, extra: Partial<Priced> = {}): PriceOf =>
  pricesOf({ 'Rain Tempter': { chaos, category: 'cards', graph, gaps: 0, ...extra }, 'The Doctor': { chaos: 1000, category: 'cards', graph: [0, 1, 2, 1, 3, 2, 4] } })
const tabs = [{ name: 'Div', id: 't1', items: [card('Rain Tempter', 15), card('The Doctor', 1)] }]
const line = (v: ReturnType<typeof valueStash>, key = 'Rain Tempter') => v.lines.find(l => l.key === key)!

describe('graphChaos', () => {
  it('turns the % line into chaos per day from today\'s price', () => {
    const days = graphChaos(RAIN, RAIN_GRAPH)
    expect(days[6]).toBeCloseTo(98.5)
    expect(days[0]).toBeCloseTo(4, 1)
    expect(graphChaos(10, [null, 0, null])).toEqual([])
    expect(graphChaos(10, [null, 0, 100])).toEqual([null, 5, 10])
    expect(graphChaos(10, undefined)).toEqual([])
  })
})

describe('graphSpike', () => {
  it('catches Rain Tempter and gives its usual price', () => {
    expect(graphSpike(RAIN, RAIN_GRAPH)).toBeCloseTo(4.1, 1)
  })
  it('needs 2 earlier priced days (3 for gear)', () => {
    expect(graphSpike(200, [null, null, 0, null, 0, null, 2000])).toBeCloseTo(9.5, 1)
    expect(graphSpike(200, [null, null, null, null, 0, null, 2000])).toBeNull()
    expect(graphSpike(200, [null, null, 0, null, 0, null, 2000], 3)).toBeNull()
  })
  it('never holds a steady climb, even 64x in a week', () => {
    // 2, 4, 8 ... 128c: a card in a league's first week.
    expect(graphSpike(128, [0, 100, 300, 700, 1500, 3100, 6300])).toBeNull()
    expect(graphSpike(1.2, [0, 100, 200, 300, 500, 700, 1100])).toBeNull()
  })
  it('leaves a flat line, a rise under 5x, and a jump under 1c', () => {
    expect(graphSpike(4, [0, 1, 2, 1, 0, 1, 2])).toBeNull()
    expect(graphSpike(19, [0, 0, 0, 0, 0, 0, 375])).toBeNull()
    expect(graphSpike(0.8, [0, 0, 0, 0, 0, 0, 700])).toBeNull()
  })
  it('takes a rise poe.ninja has had on 3 priced days', () => {
    expect(graphStep(100, [0, 0, 0, 0, 2400, 2300, 2400])).toBe('confirmed')
    expect(graphSpike(100, [0, 0, 0, 0, 2400, 2300, 2400])).toBeNull()
    // Two days isn't enough: a fake can outlast a day (The Web, an Alteration Shard).
    expect(graphSpike(100, [0, 0, 0, 0, 0, 2300, 2400])).toBeCloseTo(4, 1)
    // Gaps are skipped: 3 priced days at the new price count.
    expect(graphStep(100, [0, 0, 0, 2400, null, 2300, 2400])).toBe('confirmed')
  })
  it('needs a line with a price today', () => {
    expect(graphSpike(RAIN, [0, 0, 0, 0, 0, 0, null])).toBeNull()
    expect(graphSpike(RAIN, [2362])).toBeNull()
    expect(graphSpike(RAIN, undefined)).toBeNull()
  })
})

describe('valuing Rain Tempter', () => {
  it('counts it at its usual price, not poe.ninja\'s spike, with or without a last read', () => {
    for (const guard of [undefined, { before: null, now: T0 }]) {
      const v = valueStash(tabs, rain(), undefined, guard)
      const l = line(v)
      expect(l.unitChaos).toBeCloseTo(4.1, 1)
      expect(l.ninjaChaos).toBe(98.5)
      expect(l.heldKind).toBe('spike')
      expect(l.heldSince).toBeDefined()
      expect(v.byCategory.cards).toBeCloseTo(15 * 4.1 + 1000, 0)
      // A liquid card that only drifts is untouched.
      expect(line(v, 'The Doctor').unitChaos).toBe(1000)
      expect(line(v, 'The Doctor').heldSince).toBeUndefined()
    }
  })

  it('even when the last read already took the fake price as solid', () => {
    const poisoned = baselineOf(valueStash(tabs, rain(RAIN_GRAPH.map((_, i) => i === 6 ? 4.4 : RAIN_GRAPH[i]), 4.2)))
    poisoned['Rain Tempter'] = { ...poisoned['Rain Tempter'], unitChaos: 98.5, ref: 98.5 }
    const l = line(valueStash(tabs, rain(), undefined, { before: poisoned, now: T0 }))
    expect(l.unitChaos).toBeCloseTo(4.1, 1)
  })

  it('is never the solid price, keeps its start across reads, and lets go when poe.ninja falls back', () => {
    const quiet = [0, 2.5, -1.2, 3.8, 1.1, 4.4, 2]
    const base = baselineOf(valueStash(tabs, rain(quiet, 4.1), undefined, { before: null, now: T0 }))
    expect(base['Rain Tempter'].ref).toBeCloseTo(4.1)
    const first = valueStash(tabs, rain(), undefined, { before: base, now: T0 + H })
    const held = baselineOf(first)
    expect(held['Rain Tempter'].ref).toBeCloseTo(4.1)
    expect(held['Rain Tempter'].heldKind).toBe('spike')
    const later = valueStash(tabs, rain(), undefined, { before: held, now: T0 + 5 * H })
    expect(line(later).heldSince).toBe(T0 + H)
    const back = valueStash(tabs, rain(quiet, 4.1), undefined, { before: baselineOf(later), now: T0 + 7 * H })
    expect(line(back).heldSince).toBeUndefined()
    expect(line(back).unitChaos).toBe(4.1)
  })

  it('takes a real rise once poe.ninja has had it 3 days', () => {
    const v = valueStash(tabs, rain([0, 2, 1, 3, 2300, 2350, 2362]), undefined, { before: null, now: T0 })
    expect(line(v).unitChaos).toBe(98.5)
  })

  it('never overrides your own price, and catches a unique only with 3+ earlier days', () => {
    expect(line(valueStash(tabs, rain(), { prices: { 'Rain Tempter': 50 }, ignored: [] }, { before: null, now: T0 })).unitChaos).toBe(50)
    const gear = (graph: Array<number | null>) => holdJump(500, { category: 'gear', graph }, undefined, T0)
    expect(gear([null, null, null, null, 0, 0, 2400])).toBeNull()
    expect(gear([0, null, 0, null, 0, null, 2400])?.chaos).toBeCloseTo(20)
  })

  it('lets gear go after 6 hours, as a jump', () => {
    const graph = [0, null, 0, null, 0, null, 2400]
    const prev = { name: 'x', icon: '', count: 1, unitChaos: 20, ref: 20, heldSince: T0, heldKind: 'spike' as const }
    expect(holdJump(500, { category: 'gear', graph, thin: true }, prev, T0 + HOLD_MS - 1)?.kind).toBe('spike')
    expect(holdJump(500, { category: 'gear', graph, thin: true }, prev, T0 + HOLD_MS)).toBeNull()
  })

  it('lets gear go once: the hold does not start again on the next read', () => {
    // A unique priced from poe.ninja's sparse line alone: 20 -> 500, never back to 20.
    const unique: StashItemLike = { name: 'Headhunter', typeLine: 'Leather Belt', baseType: 'Leather Belt', frame: 3, stack: 1, icon: '' }
    const gTabs = [{ name: 'Gear', id: 'g', items: [unique] }]
    const p: PriceOf = () => ({ chaos: 500, category: 'gear', graph: [0, null, 0, null, 0, null, 2400] })
    const key = 'Headhunter Leather Belt'
    const at0 = valueStash(gTabs, p, undefined, { before: null, now: T0 })
    expect(at0.lines[0].unitChaos).toBeCloseTo(20)
    const at6 = valueStash(gTabs, p, undefined, { before: baselineOf(at0), now: T0 + HOLD_MS })
    expect(at6.lines[0].unitChaos).toBe(500)
    expect(baselineOf(at6)[key].released).toBe(T0)
    const at8 = valueStash(gTabs, p, undefined, { before: baselineOf(at6), now: T0 + 8 * H })
    expect(at8.lines[0].unitChaos).toBe(500)
    expect(at8.lines[0].heldSince).toBeUndefined()
    expect(baselineOf(at8)[key].released).toBe(T0)
    // A fresh spike 5x over the let-go price is held again.
    const bigger: PriceOf = () => ({ chaos: 5000, category: 'gear', graph: [0, null, 0, null, 0, null, 2400] })
    const at9 = valueStash(gTabs, bigger, undefined, { before: baselineOf(at8), now: T0 + 9 * H })
    expect(at9.lines[0].unitChaos).toBeLessThan(5000)
    expect(at9.lines[0].heldSince).toBe(T0 + 9 * H)
    // Once the step is gone, the marker goes too.
    const flat: PriceOf = () => ({ chaos: 500, category: 'gear', graph: [0, null, 0, null, 0, null, 0] })
    expect(baselineOf(valueStash(gTabs, flat, undefined, { before: baselineOf(at8), now: T0 + 9 * H }))[key].released).toBeUndefined()
  })

  it('starts no thin-market jump hold when a spike is confirmed', () => {
    const prev = { name: 'x', icon: '', count: 1, unitChaos: 4, ref: 4, heldSince: T0, heldKind: 'spike' as const }
    expect(holdJump(98, { thin: true, graph: [0, null, 0, null, 2400, 2400, 2400] }, prev, T0 + 50 * H)).toBeNull()
  })

  it('never holds an ignored item', () => {
    const v = valueStash(tabs, rain(), { prices: {}, ignored: ['Rain Tempter'] })
    const l = v.ignoredLines.find(x => x.key === 'Rain Tempter')!
    expect(l.unitChaos).toBe(98.5)
    expect(l.heldSince).toBeUndefined()
  })

  it('says why on the hover', () => {
    const l = line(valueStash(tabs, rain(), undefined, { before: null, now: T0 }))
    const note = heldNote(l, c => `${c.toFixed(1)}c`)!
    expect(note).toContain('Counted at 4.1c')
    expect(note).toContain('poe.ninja says 98.5c')
    expect(note).toContain('held 3 days')
  })
})

// Guy's saved prices (woke-market/Covens/daily), 2026-11-17 to 11-22, and
// poe.ninja on 11-23: 20,140c (98 div), its line only +2,362% (from an
// 818c fake), 5 of 7 days empty.
describe('Rain Tempter, 98 div', () => {
  const saved = [0.5, 1, 1, 1, 0.11, 1]
  const ninjaLine = [null, null, null, null, null, 0, 2362]
  const p: Priced = { chaos: 20140, category: 'cards', graph: ninjaLine, history: saved, thin: true, gaps: 5 }
  const tab = [{ name: 'Div', id: 't1', items: [card('Rain Tempter', 15)] }]

  it('is a spike against the app\'s saved prices, counted at 1c', () => {
    expect(priceStep(20140, p)).toEqual({ step: 1, saved: true })
    for (const guard of [undefined, { before: null, now: T0 }]) {
      const v = valueStash(tab, pricesOf({ 'Rain Tempter': p }), undefined, guard)
      expect(line(v).unitChaos).toBe(1)
      expect(line(v).heldKind).toBe('spike')
      expect(v.chaos).toBe(15)
    }
  })

  it('even when the last read took 857c as solid and its hold ran out', () => {
    const before = { 'Rain Tempter': { name: 'Rain Tempter', icon: '', count: 15, unitChaos: 857.5, ref: 857.5 } }
    expect(line(valueStash(tab, pricesOf({ 'Rain Tempter': p }), undefined, { before, now: T0 })).unitChaos).toBe(1)
  })

  it('says on the hover that a step this big waits about 2 weeks', () => {
    const v = valueStash(tab, pricesOf({ 'Rain Tempter': p }), undefined, { before: null, now: T0 })
    expect(heldNote(line(v), c => `${c}c`)).toContain('about 2 weeks')
  })

  it('poe.ninja\'s line alone could not catch it', () => {
    expect(graphStep(20140, ninjaLine)).toBeNull()
  })

  it('a 50x step never counts on time alone', () => {
    // Fake for 3 days in the saved prices: still held.
    expect(seriesStep(20140, [1, 1, 1, 1, 1, 20000, 20100, 20140])).toBe(1)
    // A real 10x rise held 3 days counts.
    expect(seriesStep(10, [1, 1, 1, 1, 1, 9.5, 10, 10])).toBe('confirmed')
  })

  it('the saved prices also keep a steady climb counted', () => {
    expect(priceStep(128, { history: [2, 4, 8, 16, 32, 64], graph: [], category: 'cards' }).step).toBeNull()
  })
})

describe('saved prices', () => {
  it('a step poe.ninja has also had 3 days counts, a 50x one doesn\'t', () => {
    const line = [0, 0, 0, 0, 900, 950, 1000]
    expect(priceStep(10, { history: [1, 1, 1, 1], graph: line, category: 'cards' }).step).toBe('confirmed')
    expect(priceStep(100, { history: [1, 1, 1, 1], graph: line, category: 'cards' }).step).toBe(1)
  })

  it('asks for a rolled map\'s saved prices by its base, as prices.ts looks them up', () => {
    const map = (frame: number, typeLine: string, baseType: string): StashItemLike => ({ name: frame === 2 ? 'Dread Cell' : '', typeLine, baseType, frame, stack: 1, icon: '', mapTier: 16 })
    expect(historyName(map(1, 'Fecund Cemetery Map of Bameth', 'Cemetery Map'))).toBe('Cemetery Map')
    expect(historyName(map(2, 'Cemetery Map', 'Cemetery Map'))).toBe('Cemetery Map')
    expect(historyName(map(1, 'Blighted Strand Map of Power', 'Strand Map'))).toBe('Blighted Strand Map')
    expect(historyName({ name: 'Headhunter', typeLine: 'Leather Belt', baseType: 'Leather Belt', frame: 3, stack: 1, icon: '' })).toBe('Headhunter')
    expect(historyName(card('Rain Tempter', 1))).toBe('Rain Tempter')
  })

  it('only fresh rows of one type are kept (history.ts)', async () => {
    const { historyMap } = await import('@/web/woke/net-worth/history')
    const dates = ['2026-11-18', '2026-11-19', '2026-11-20', '2026-11-22']
    const m = historyMap(dates, {
      'DivinationCard\u0000Rain Tempter\u0000': [1, 1, 0.11, 1],
      'DivinationCard\u0000Old Card\u0000': [5, 5, null, null],
      'UniqueArmour\u0000Kaom\u0000': [100, 100, 100, 100],
      'UniqueRelic\u0000Kaom\u0000': [9000, 9000, 9000, 9000]
    }, '2026-11-21')
    expect(m.get('DIVINATION_CARD\u0000Rain Tempter\u0000')).toEqual([1, 1, 0.11, 1])
    expect(m.has('DIVINATION_CARD\u0000Old Card\u0000')).toBe(false)
    expect(m.has('UNIQUE\u0000Kaom\u0000')).toBe(false)
  })
})
