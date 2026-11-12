// The "?" list in the search palette: every example finds something.
import { describe, it, expect } from 'vitest'
import { EXAMPLES, exampleCards } from '@/web/woke/search/lookups/examples'
import { recipeLookup } from '@/web/woke/search/lookups/recipes'
import { countdownLookup, currencyLookup } from '@/web/woke/search/lookups/answers'
import { betrayalLookup } from '@/web/woke/search/lookups/betrayal'
import { bossLookup, dropLookup } from '@/web/woke/search/lookups/bosses'
import type { LookupContext } from '@/web/woke/search/lookups/types'

const ctx: LookupContext = {
  price: n => ({ 'Chaos Orb': 1, 'Divine Orb': 200, 'Mirror of Kalandra': 100000 } as Record<string, number>)[n] ?? null,
  items: [],
  tools: new Set(),
  divine: 200,
  now: Date.UTC(2026, 10, 12),
  league: null
}

describe('exampleCards', () => {
  it('turns each example into a card that searches it', () => {
    const cards = exampleCards()
    expect(cards).toHaveLength(EXAMPLES.flatMap(g => g.items).length)
    expect(cards[0].actions[0]).toEqual({ label: 'Search "mageblood"', search: 'mageblood' })
  })
  it('only suggests searches that answer', () => {
    const found = (q: string, lookups: Array<(q: string, c: LookupContext) => unknown[]>) => lookups.some(l => l(q, ctx).length > 0)
    expect(found('3.5 div', [currencyLookup(['Divine Orb', 'Mirror of Kalandra'])])).toBe(true)
    expect(found('1 mirror in div', [currencyLookup(['Divine Orb', 'Mirror of Kalandra'])])).toBe(true)
    expect(found('lab reset', [countdownLookup])).toBe(true)
    expect(found('league', [countdownLookup])).toBe(true)
    for (const q of ['uber maven', 'reality frag']) expect(found(q, [bossLookup])).toBe(true)
    expect(found('progenesis', [dropLookup])).toBe(true)
    for (const q of ['6l', 'chaos recipe', 'movement speed']) expect(found(q, [recipeLookup])).toBe(true)
    for (const q of ['aisling', 'veiled']) expect(found(q, [betrayalLookup()])).toBe(true)
  })
})
