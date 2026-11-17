// byBase walks each item through only the rules that could take its base:
// it must decide exactly what a walk of the whole filter decides.
import { describe, expect, it } from 'vitest'
import { parseFilter } from '@/web/woke/loot-filter/parse'
import { byBase, matchItem } from '@/web/woke/loot-filter/match'
import type { MatchResult } from '@/web/woke/loot-filter/match'
import type { ItemFacts } from '@/web/woke/loot-filter/item-facts'
import { neverSink } from '../helpers/neversink'

const facts = (baseType: string | undefined, over: Partial<ItemFacts> = {}): ItemFacts => ({
  name: baseType ?? 'Thing',
  baseType,
  rarity: 'Normal',
  itemLevel: 83,
  areaLevel: 83,
  quality: 0,
  stackSize: 1,
  socketGroups: [],
  identified: true,
  corrupted: false,
  influences: [],
  explicitModNames: [],
  ...over
} as ItemFacts)

const outcome = (m: MatchResult) => ({
  final: m.final?.block.index ?? null,
  layers: m.layers.map(l => l.block.index),
  uncertain: m.uncertain.map(u => u.block.index),
  visibility: m.visibility,
  actions: m.actions
})

describe('byBase', () => {
  for (const level of ['1-REGULAR', '5-UBER-STRICT'] as const) {
    it(`matches like the whole filter on every listed base (${level})`, () => {
      const doc = parseFilter(neverSink(level))
      const rules = byBase(doc)
      const bases = new Set(doc.blocks.flatMap(b => b.conditions.filter(c => c.key === 'BaseType').flatMap(c => c.values)))
      expect(bases.size).toBeGreaterThan(200)
      for (const base of bases) {
        for (const item of [facts(base), facts(base, { rarity: 'Unique', identified: false }), facts(base, { stackSize: 20 })]) {
          expect(outcome(matchItem(rules(item), item, { brief: true }))).toEqual(outcome(matchItem(doc, item, { brief: true })))
          expect(outcome(matchItem(rules(item), item))).toEqual(outcome(matchItem(doc, item)))
        }
      }
    })
  }

  it('walks everything for an unknown base, and an unlisted base meets only the open rules', () => {
    const doc = parseFilter(neverSink('1-REGULAR'))
    const rules = byBase(doc)
    expect(rules(facts(undefined))).toBe(doc)
    const unlisted = facts('Nothing Like This')
    expect(outcome(matchItem(rules(unlisted), unlisted))).toEqual(outcome(matchItem(doc, unlisted)))
    expect(rules(unlisted).blocks.length).toBeLessThan(doc.blocks.length)
  })
})
