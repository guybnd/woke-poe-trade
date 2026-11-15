// The card tells the game's older file apart from the filter as the app has it
// now: the same item, matched by both, and compared by verdict.
import { describe, it, expect } from 'vitest'
import { parseFilter } from '@/web/woke/loot-filter/parse'
import { matchItem, sameOutcome, sameRule } from '@/web/woke/loot-filter/match'
import type { ItemFacts } from '@/web/woke/loot-filter/item-facts'

const filter = (...lines: string[]) => lines.map(l => l.startsWith('  ') ? `\t${l.trim()}` : l).join('\n') + '\n'

const NET = filter(
  'Show # $type->woke->safety $tier->uniques',
  '  Rarity == Unique',
  '  BaseType == "Shagreen Boots"',
  '  SetFontSize 36',
  ''
)
const HIDE = filter(
  'Hide # $type->uniques $tier->hideable',
  '  Rarity Unique',
  '  BaseType == "Shagreen Boots"',
  '',
  'Show # $type->uniques $tier->t1',
  '  Rarity Unique'
)
const boots: ItemFacts = { name: 'Shagreen Boots', itemClass: 'Boots', baseType: 'Shagreen Boots', rarity: 'Unique', itemLevel: 71, identified: false, areaLevel: 69, influences: [], explicitModNames: [] }

describe('the game file against the app', () => {
  it('sees the old safety net show what the new filter hides', () => {
    const written = matchItem(parseFilter(NET + HIDE), boots)
    const now = matchItem(parseFilter(HIDE), boots)
    expect(written.visibility).toBe('Show')
    expect(now.visibility).toBe('Hide')
    expect(sameOutcome(written, now)).toBe(false)
  })

  it('calls the same rule the same', () => {
    const doc = parseFilter(HIDE)
    expect(sameOutcome(matchItem(doc, boots), matchItem(parseFilter(HIDE), boots))).toBe(true)
  })

  it('tells a new look under the same rule apart', () => {
    const louder = HIDE + '\tPlayAlertSound 3 300\n'
    const ring: ItemFacts = { ...boots, baseType: 'Gold Ring', name: 'Gold Ring', itemClass: 'Rings' }
    const a = matchItem(parseFilter(HIDE), ring)
    const b = matchItem(parseFilter(louder), ring)
    expect(sameRule(a, b)).toBe(true)
    expect(sameOutcome(a, b)).toBe(false)
  })
})
