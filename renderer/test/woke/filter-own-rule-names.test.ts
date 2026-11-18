// An own rule naming a base type or item class the game doesn't know would
// make the game refuse the whole filter: it is held back, with a reason.
import { describe, it, expect, beforeAll } from 'vitest'
import { parseFilter } from '@/web/woke/loot-filter/parse'
import { nameCheck, ruleBlocks, ruleProblem } from '@/web/woke/loot-filter/rules'
import type { OwnRule } from '@/web/woke/loot-filter/rules'
import { composeFilter } from '@/web/woke/loot-filter/compose'
import { DEFAULT_SAFETY_NET } from '@/web/woke/loot-filter/safety'
import { defaultPresets } from '@/web/woke/loot-filter/presets'
import { loadGameData } from '../helpers/game-data'
import { neverSink } from '../helpers/neversink'

beforeAll(loadGameData)

const rule = (key: string, values: string[]): OwnRule => ({ id: 7, name: 'Mine', on: true, conditions: [{ key, op: '==', count: null, values }], visibility: 'Show', patch: {} })

describe('own rule names', () => {
  const doc = parseFilter(neverSink('1-REGULAR'))
  // After the game data has loaded (beforeAll).
  const names: ReturnType<typeof nameCheck> = (k, v) => nameCheck(doc)(k, v)

  it('knows the game\'s bases, gems, currency and classes', () => {
    for (const v of ['Gold Ring', 'Chaos Orb', 'Divine Orb', 'Fireball', 'Stygian Vise', 'Map (Tier 16)', 'Map (Tier 1)']) expect(names('BaseType', v), v).toBe(true)
    for (const v of ['Rings', 'Stackable Currency', 'Skill Gems']) expect(names('Class', v), v).toBe(true)
  })

  it('holds back a rule with a misspelt base type or class', () => {
    expect(ruleProblem(rule('BaseType', ['Gold Rnig']), names)).toMatch(/Gold Rnig/)
    // Classes are only warned about in the builder: no full list to check.
    expect(ruleProblem(rule('Class', ['Expedition Logbooks']), names)).toBeNull()
    expect(ruleBlocks([rule('BaseType', ['Gold Rnig'])], names)).toEqual([])
    expect(ruleBlocks([rule('BaseType', ['Gold Ring'])], names)).toHaveLength(1)
  })

  it('the saved filter leaves the misspelt rule out', () => {
    const c = composeFilter(neverSink('1-REGULAR'), {
      presets: defaultPresets(),
      rules: [rule('BaseType', ['Gold Rnig']), { ...rule('BaseType', ['Gold Ring']), id: 8 }],
      edits: [],
      buildRules: { bases: false, gems: false, uniques: false, hideWeapons: false } as never,
      build: null,
      moves: [],
      safetyNet: { ...DEFAULT_SAFETY_NET, on: false },
      prices: { lookup: null, safety: null, breakdown: null },
      dustList: null,
      heldBack: () => false,
      stackHeld: () => false,
      renameBase: () => undefined
    })
    const mine = c.doc.blocks.filter(b => b.type === 'woke->rule')
    expect(mine.map(b => b.tier)).toEqual(['r8'])
  })
})
