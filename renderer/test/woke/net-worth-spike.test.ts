// Net worth: a spike on poe.ninja's own 7-day line is counted at the line's
// usual price. Rain Tempter on 2026-11-23: about 4c all week, then 98.5c
// (+2,362%) on a market that wasn't thin, so it made 76% of a tab.
import { describe, it, expect } from 'vitest'
import { HOLD_MS, baselineOf, graphChaos, graphSpike, graphStep, holdJump, valueStash } from '@/web/woke/net-worth/valuation'
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
    expect(note).toContain('has had it 3 days')
  })
})
