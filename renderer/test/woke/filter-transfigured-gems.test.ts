// The game refuses the whole filter over a transfigured gem name in a BaseType
// list ("No base types found exactly matching Dual Strike of Ambidexterity").
// Filters name those gems by their base gem plus `TransfiguredGem True`, so
// every list is rewritten that way before the filter is saved.
import { describe, it, expect, beforeAll } from 'vitest'
import { composeFilter } from '@/web/woke/loot-filter/compose'
import { serializeFilter, parseFilter } from '@/web/woke/loot-filter/parse'
import type { FilterBlock } from '@/web/woke/loot-filter/parse'
import { gemBaseName, renameBases } from '@/web/woke/loot-filter/gem-bases'
import { DEFAULT_BUILD_RULES } from '@/web/woke/loot-filter/build-rules'
import { defaultPresets } from '@/web/woke/loot-filter/presets'
import { matchItem } from '@/web/woke/loot-filter/match'
import { loadGameData } from '../helpers/game-data'
import { facts } from '../helpers/filter-guard'

const SOURCE = [
  '#   VERSION:  8.21.0a',
  '',
  'Show # $type->gems $tier->any',
  '\tClass == "Skill Gems"',
  '\tSetFontSize 30',
  ''
].join('\n')

function compose (gems: string[]) {
  return composeFilter(SOURCE, {
    presets: defaultPresets(),
    rules: [],
    edits: [],
    buildRules: { ...DEFAULT_BUILD_RULES },
    build: { buildName: 'Test', gems, linkColours: [], uniqueBases: [], rareBases: [], weaponClasses: [] },
    moves: [],
    safetyNet: { on: false, minChaos: 20 },
    prices: { lookup: null, safety: null, breakdown: null },
    dustList: null,
    heldBack: () => false,
    stackHeld: () => false
  })
}

const bases = (b: FilterBlock) => b.conditions.find(c => c.key === 'BaseType')?.values
const transfigured = (b: FilterBlock) => b.conditions.find(c => c.key === 'TransfiguredGem')?.values

describe('transfigured gems in BaseType lists', () => {
  beforeAll(async () => { await loadGameData() })

  it('knows a transfigured gem by its base gem, and leaves other names alone', () => {
    expect(gemBaseName('Dual Strike of Ambidexterity')).toBe('Dual Strike')
    expect(gemBaseName('Dual Strike')).toBeUndefined()
    expect(gemBaseName('Vaal Molten Shell')).toBeUndefined()
    expect(gemBaseName('Multistrike Support')).toBeUndefined()
    expect(gemBaseName('Opal Ring')).toBeUndefined()
  })

  it('puts a transfigured build gem in a copy of the rule for transfigured gems only (Guy\'s Elemental Hit build)', () => {
    const doc = compose(['Herald of Ash', 'Dual Strike of Ambidexterity', 'Vaal Molten Shell']).doc
    const text = serializeFilter(doc)
    expect(text).not.toContain('Ambidexterity')
    const gems = doc.blocks.filter(b => b.tier === 'gems')
    expect(gems.map(bases)).toEqual([['Dual Strike'], ['Herald of Ash', 'Vaal Molten Shell']])
    expect(transfigured(gems[0])).toEqual(['True'])
    expect(transfigured(gems[1])).toBeUndefined()
    // Both are in the file, the copy right before the rule.
    expect(doc.chunks.indexOf(gems[0])).toBe(doc.chunks.indexOf(gems[1]) - 1)
    expect(text).toMatch(/BaseType == "Dual Strike"\r?\n(\t.*\r?\n)*\tTransfiguredGem True/)
  })

  it('turns a rule of only transfigured names into a transfigured-only rule, without a copy', () => {
    const gems = compose(['Arc of Oscillating', 'Arc of Surging']).doc.blocks.filter(b => b.tier === 'gems')
    expect(gems).toHaveLength(1)
    expect(bases(gems[0])).toEqual(['Arc'])
    expect(transfigured(gems[0])).toEqual(['True'])
  })

  it('previews a transfigured gem as the game sees it: by its base gem', () => {
    const doc = compose(['Herald of Ash', 'Dual Strike of Ambidexterity']).doc
    const gem = facts({ itemClass: 'Skill Gems', baseType: 'Dual Strike of Ambidexterity', filterBase: 'Dual Strike', transfigured: true, areaLevel: 30 })
    expect(matchItem(doc, gem).final?.block.tier).toBe('gems')
    // The plain gem isn't in the build: NeverSink's own rule decides it.
    const plain = facts({ itemClass: 'Skill Gems', baseType: 'Dual Strike', transfigured: false, areaLevel: 30 })
    expect(matchItem(doc, plain).final?.block.tier).toBe('any')
  })

  it('fixes any list, not only ours, and marks the rules to be written again', () => {
    const doc = parseFilter('Show\n\tBaseType "Dual Strike of Ambidexterity" "Herald of Ash"\n\tSetFontSize 30\n')
    expect(renameBases(doc, gemBaseName)).toBe(1)
    expect(doc.blocks.map(bases)).toEqual([['Dual Strike'], ['Herald of Ash']])
    expect(doc.blocks.every(b => b.dirty)).toBe(true)
    expect(doc.blocks.map(b => b.index)).toEqual([0, 1])
    expect(serializeFilter(doc)).not.toContain('Ambidexterity')
  })

  it('renames in place where the rule is already for transfigured gems', () => {
    const doc = parseFilter('Show\n\tTransfiguredGem True\n\tBaseType == "Arc of Oscillating" "Arc of Surging"\n\tSetFontSize 30\n')
    renameBases(doc, gemBaseName)
    expect(doc.blocks.map(bases)).toEqual([['Arc']])
  })

  it('drops names a TransfiguredGem False rule could never match', () => {
    const doc = parseFilter('Show\n\tTransfiguredGem False\n\tBaseType == "Dual Strike of Ambidexterity" "Herald of Ash"\n\tSetFontSize 30\n')
    renameBases(doc, gemBaseName)
    expect(doc.blocks.map(bases)).toEqual([['Herald of Ash']])
    expect(doc.blocks[0].disabled).toBe(false)
  })

  it('leaves rules without transfigured names untouched', () => {
    const doc = parseFilter('Show\n\tBaseType == "Herald of Ash"\n\tSetFontSize 30\n')
    expect(renameBases(doc, gemBaseName)).toBe(0)
    expect(doc.blocks[0].dirty).toBe(false)
  })
})
