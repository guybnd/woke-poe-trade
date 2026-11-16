// 3.30's drop tier on unidentified gear: "Unidentified (Tier 2)" in the copy
// is NeverSink's UnidentifiedItemTier, so the item tiers rules can be judged.
import { describe, it, expect, beforeAll } from 'vitest'
import { parseClipboard } from '@/parser'
import { itemFacts } from '@/web/woke/loot-filter/item-facts'
import { matchItem } from '@/web/woke/loot-filter/match'
import { parseFilter } from '@/web/woke/loot-filter/parse'
import { loadGameData } from '../helpers/game-data'

beforeAll(loadGameData)

const copy = (unid: string) => [
  'Item Class: Helmets', 'Rarity: Rare', 'Mind Cage', '--------',
  'Energy Shield: 62', '--------',
  'Requirements:', 'Level: 65', 'Int: 138', '--------',
  'Sockets: B-B B ', '--------',
  'Item Level: 84', '--------',
  unid
].join('\n')

const FILTER = [
  'Show # $type->gear->tiered $tier->t2r2',
  '\tUnidentifiedItemTier >= 2',
  '\tItemLevel >= 68',
  '\tRarity Normal Magic Rare',
  '\tBaseType == "Mind Cage"',
  '',
  'Hide # $type->hidelayer $tier->raresendgame',
  '\tRarity Rare',
  ''
].join('\n')

describe('Unidentified (Tier N)', () => {
  it('parses as unidentified, with the tier', () => {
    const r = parseClipboard(copy('Unidentified (Tier 2)'))
    expect(r.isOk()).toBe(true)
    expect(r.isOk() && r.value.isUnidentified).toBe(true)
    expect(r.isOk() && r.value.unidentifiedTier).toBe(2)
  })

  it('lets the item tier rules decide, with or without the parser', () => {
    const text = copy('Unidentified (Tier 2)')
    for (const parsed of [parseClipboard(text), null]) {
      const facts = itemFacts(text, parsed && parsed.isOk() ? parsed.value : null)
      expect(facts.identified).toBe(false)
      expect(facts.unidentifiedItemTier).toBe(2)
      const m = matchItem(parseFilter(FILTER), facts)
      expect(m.final?.block.tier).toBe('t2r2')
      expect(m.uncertain).toEqual([])
    }
  })

  it('a tier below the rule is hidden for sure', () => {
    const text = copy('Unidentified (Tier 1)')
    const m = matchItem(parseFilter(FILTER), itemFacts(text, null))
    expect(m.visibility).toBe('Hide')
    expect(m.uncertain).toEqual([])
  })

  it('no tier in the copy stays unknown', () => {
    const facts = itemFacts(copy('Unidentified'), null)
    expect(facts.unidentifiedItemTier).toBeUndefined()
    expect(matchItem(parseFilter(FILTER), facts).uncertain.map(u => u.block.tier)).toEqual(['t2r2'])
  })
})
