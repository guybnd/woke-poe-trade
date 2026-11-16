// 3.30's Fated mark: "Fated Lathi" in the copy is a Lathi with the mark, and
// NeverSink's Fated twins (t1f, t2f) show it when the plain tier is off.
import { describe, it, expect, beforeAll } from 'vitest'
import { parseClipboard } from '@/parser'
import { itemFacts } from '@/web/woke/loot-filter/item-facts'
import { matchItem } from '@/web/woke/loot-filter/match'
import { parseFilter } from '@/web/woke/loot-filter/parse'
import { alsoShownBy } from '@/web/woke/loot-filter/groups'
import { tierLabel } from '@/web/woke/loot-filter/names'
import { conditionWords } from '@/web/woke/loot-filter/ladder'
import { applyEdits } from '@/web/woke/loot-filter/edits'
import { loadGameData } from '../helpers/game-data'
import { LEVELS, neverSink } from '../helpers/neversink'

beforeAll(loadGameData)

const LATHI = [
  'Item Class: Staves', 'Rarity: Rare', 'Fated Lathi', '--------',
  'Staff', 'Physical Damage: 72-120', 'Critical Strike Chance: 7.50%', 'Attacks per Second: 1.30', 'Weapon Range: 1.3 metres', '--------',
  'Requirements:', 'Str: 113', 'Int: 113 (unmet)', '--------',
  'Sockets: W ', '--------',
  'Item Level: 85', '--------',
  '{ Implicit Modifier }', '+25% Chance to Block Spell Damage', '--------',
  'Unidentified'
].join('\n')

const FILTER = [
  'Show # $type->rr $tier->t2f',
  '\tFated True',
  '\tItemLevel >= 68',
  '\tRarity Rare',
  '\tBaseType == "Lathi" "Vaal Axe"',
  '\tSetFontSize 38',
  '',
  '#Show # $type->rr $tier->t2',
  '#\tItemLevel >= 68',
  '#\tRarity Rare',
  '#\tBaseType == "Lathi" "Vaal Axe"',
  '',
  'Hide # $type->hidelayer $tier->raresendgame',
  '\tRarity Rare',
  ''
].join('\n')

describe('Fated items', () => {
  it('parse as their base, with the mark', () => {
    const r = parseClipboard(LATHI)
    expect(r.isOk()).toBe(true)
    expect(r.isOk() && r.value.info.refName).toBe('Lathi')
    expect(r.isOk() && r.value.isFated).toBe(true)
  })

  it('match the Fated twin, with or without the parser', () => {
    const doc = parseFilter(FILTER)
    for (const parsed of [parseClipboard(LATHI), null]) {
      const facts = itemFacts(LATHI, parsed && parsed.isOk() ? parsed.value : null)
      expect(facts.baseType).toBe('Lathi')
      expect(facts.fated).toBe(true)
      const m = matchItem(doc, facts)
      expect(m.final?.block.tier).toBe('t2f')
      expect(m.visibility).toBe('Show')
    }
  })

  it('a plain rare is not Fated', () => {
    const plain = LATHI.replace('Fated Lathi', 'Lathi')
    const facts = itemFacts(plain, null)
    expect(facts.fated).toBe(false)
    expect(matchItem(parseFilter(FILTER), facts).visibility).toBe('Hide')
  })

  it('a tier that is off says which rule still shows its items', () => {
    const doc = parseFilter(FILTER)
    expect(alsoShownBy(doc, 'rr', 't2').map(o => [o.tier, o.bases.length])).toEqual([['t2f', 2]])
    expect(alsoShownBy(doc, 'rr', 't2f')).toEqual([])
  })

  it('on the real filter: only the twin, never crafting bases, uniques or a tier below a live hidden one', () => {
    for (const level of LEVELS) {
      const doc = parseFilter(neverSink(level))
      applyEdits(doc, [{ id: 1, kind: 'visibility', type: 'rr', tier: 't2', visibility: 'Hide' }, { id: 2, kind: 'visibility', type: 'rr', tier: 't1f', visibility: 'Hide' }])
      const t2 = alsoShownBy(doc, 'rr', 't2').map(o => `${o.type} ${o.tier}`)
      expect(t2.every(x => x.startsWith('rr ')), level).toBe(true)
      if (doc.blocks.some(b => b.type === 'rr' && b.tier === 't2f' && !b.disabled)) expect(t2, level).toContain('rr t2f')
      expect(alsoShownBy(doc, 'rr', 't1f'), level).toEqual([])
    }
  })

  it('names the twins in words', () => {
    expect(tierLabel('t2f')).toBe('Tier 2, Fated')
    expect(tierLabel('fatedgear')).toBe('Fated gear')
  })
})

describe('rules without an item list say what they catch', () => {
  const block = parseFilter(['#Show # $type->rr $tier->identifieditemhandling', '#\tMirrored False', '#\tIdentified True', '#\tItemLevel >= 68', '#\tRarity Rare', '#\tClass == "Amulets" "Belts" "Body Armours" "Boots" "Bows" "Claws"', ''].join('\n')).blocks[0]
  it('in words', () => {
    expect(block.conditions.map(conditionWords)).toEqual(['Not mirrored', 'Identified', 'Item level 68+', 'Rarity: Rare', 'Class: Amulets, Belts, Body Armours, Boots +2'])
    expect(tierLabel('identifieditemhandling')).toBe('Identified rares, not corrupted or mirrored')
  })
})
