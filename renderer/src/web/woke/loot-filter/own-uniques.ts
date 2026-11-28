// The Loot tab's own unique lists (WOKEPOET-697), loaded with the tables
// (own-lists.ts) so startup JS doesn't grow.
import type { FilterBlock, FilterCondition } from './parse'
import type { OwnTables } from './own-lists'

const cond = (key: string, values: string[]): FilterCondition => ({ key, op: '==', values } as FilterCondition)

// Early league (Guy's pick, 2026-11-28): a base whose uniques sold for this
// many times their usual price in last league's first days, and for at
// least EARLY_MIN chaos.
export const EARLY_RATIO = 3
export const EARLY_MIN = 5

// What last league says about a unique base: its uniques' usual price and
// their first days' price (plain averages), and whether they started well
// above it.
export function baseGuess (t: OwnTables, base: string): { chaos: number, first: number, early: boolean } | null {
  const names = t.bases?.().get(base) ?? []
  const usual = names.map(n => t.guesses.get(n)).filter((x): x is number => x != null)
  if (!usual.length) return null
  const chaos = usual.reduce((a, b) => a + b, 0) / usual.length
  const first = names.map(n => t.day1?.get(n)).filter((x): x is number => x != null)
  const day1 = first.length ? first.reduce((a, b) => a + b, 0) / first.length : 0
  return { chaos, first: day1, early: day1 >= EARLY_MIN && day1 >= chaos * EARLY_RATIO }
}

// Own unique tiers, read by uniqueCategoryOf like NeverSink's plain ones.
export const OWN_UNIQUE_TIER = { plain: 'own', variable: 'ownvar', early: 'ownearly' } as const

// The unique bases as rules, one per section, with only the bases one of
// whose uniques is priced now or was last league. `find`: a live price.
export function ownUniqueBlocks (t: OwnTables, find: (base: string) => number | null, listed: ReadonlySet<string> = new Set()): FilterBlock[] {
  const by = new Map<string, string[]>()
  for (const [base, names] of t.bases?.() ?? []) {
    const live = find(base)
    const g = baseGuess(t, base)
    if (!(live != null && live > 0) && !g && !listed.has(base)) continue
    const tier = g?.early ? OWN_UNIQUE_TIER.early : names.some(n => t.variable?.has(n)) ? OWN_UNIQUE_TIER.variable : OWN_UNIQUE_TIER.plain
    by.set(tier, [...by.get(tier) ?? [], base])
  }
  return [...by].map(([tier, names], i) => ({
    kind: 'block',
    index: -1001 - i,
    line: 0,
    visibility: 'Show',
    disabled: false,
    comment: `own list, uniques ${tier}`,
    type: 'uniques',
    tier,
    conditions: [cond('Rarity', ['Unique']), cond('BaseType', names)],
    actions: [],
    continue: false,
    section: '',
    subsection: '',
    raw: [],
    dirty: false
  }))
}
