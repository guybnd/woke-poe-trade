import { describe, expect, it } from 'vitest'
import { lootUnit, newSession, toSessionRecord, totals } from '@/web/woke/farming/farming'
import type { PricedRef } from '@/web/woke/farming/farming'

const PRICES: Record<string, number> = { 'The Doctor': 900, 'Rain of Chaos': 1 }
const price = (r: PricedRef) => PRICES[r.name] ?? null
const rules = { bulkFactor: 1, junkBelow: 0 }
const card = (name: string, qty: number) => ({ type: 'DivinationCard', name, variant: '', qty })

describe('Farming loot lines (shared line item)', () => {
  it('a left-out line counts nothing; your price replaces poe.ninja\'s', () => {
    const s = newSession('Test', 0)
    s.loot = [{ ...card('The Doctor', 1), out: true }, { ...card('Rain of Chaos', 4), each: 2 }, card('Unknown Card', 1)]
    const t = totals(s, [], price, 0, rules)
    expect(t.loot).toBe(8)
    expect(t.missingPrices).toBe(1)
    expect(lootUnit(s, card('The Doctor', 1), price)).toBe(0)
  })

  it('the saved session keeps your edits, per map too', () => {
    const s = newSession('Test', 0)
    s.loot = [{ ...card('The Doctor', 1), out: true }, { ...card('Rain of Chaos', 4), each: 2 }]
    s.runs = [{ areaId: 'MapWorldsStrand', name: 'Strand', level: 83, enteredAt: 0, mapMs: 1, otherMs: 0, loot: [card('The Doctor', 1), card('Rain of Chaos', 4)] }]
    const r = toSessionRecord(s, [], price, rules, { now: 1, league: 'L', divine: 200, strategy: 'Test' })
    expect(r.runs[0].loot).toEqual([
      { type: 'DivinationCard', name: 'The Doctor', variant: '', qty: 1, chaos: 900, out: true },
      { type: 'DivinationCard', name: 'Rain of Chaos', variant: '', qty: 4, chaos: 2, read: 1 }
    ])
  })
})
