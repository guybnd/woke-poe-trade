// The game refuses the whole filter over a transfigured gem name in a BaseType
// list ("No base types found exactly matching Dual Strike of Ambidexterity"),
// so the build gems rule, and every other list, writes the base gem instead.
import { describe, it, expect, beforeAll } from 'vitest'
import { composeFilter } from '@/web/woke/loot-filter/compose'
import { serializeFilter, parseFilter } from '@/web/woke/loot-filter/parse'
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

const gemLine = (text: string) => text.split('\n').find(l => /BaseType/.test(l) && /Herald of Ash/.test(l)) ?? ''

describe('transfigured gems in BaseType lists', () => {
  beforeAll(async () => { await loadGameData() })

  it('knows a transfigured gem by its base gem, and leaves other gems alone', () => {
    expect(gemBaseName('Dual Strike of Ambidexterity')).toBe('Dual Strike')
    expect(gemBaseName('Dual Strike')).toBeUndefined()
    expect(gemBaseName('Vaal Molten Shell')).toBeUndefined()
    expect(gemBaseName('Multistrike Support')).toBeUndefined()
    expect(gemBaseName('Opal Ring')).toBeUndefined()
  })

  it('writes the build gems rule with the base gem name (Guy\'s Elemental Hit build)', () => {
    const text = serializeFilter(compose(['Herald of Ash', 'Dual Strike of Ambidexterity', 'Vaal Molten Shell']).doc)
    expect(text).not.toContain('Ambidexterity')
    expect(gemLine(text)).toBe('\tBaseType == "Herald of Ash" "Dual Strike" "Vaal Molten Shell"')
  })

  it('lists a gem once when its transfigured and normal versions are both in the build', () => {
    const text = serializeFilter(compose(['Herald of Ash', 'Dual Strike', 'Dual Strike of Ambidexterity']).doc)
    expect(gemLine(text)).toBe('\tBaseType == "Herald of Ash" "Dual Strike"')
  })

  it('fixes any list, not only ours, and marks the rule to be written again', () => {
    const doc = parseFilter('Show\n\tBaseType "Dual Strike of Ambidexterity" "Herald of Ash"\n\tSetFontSize 30\n')
    expect(renameBases(doc, gemBaseName)).toBe(1)
    expect(doc.blocks[0].dirty).toBe(true)
    expect(serializeFilter(doc)).toContain('BaseType "Dual Strike" "Herald of Ash"')
  })

  it('leaves rules without transfigured names untouched', () => {
    const doc = parseFilter('Show\n\tBaseType == "Herald of Ash"\n\tSetFontSize 30\n')
    expect(renameBases(doc, gemBaseName)).toBe(0)
    expect(doc.blocks[0].dirty).toBe(false)
  })

  it('previews a transfigured gem as the game sees it: by its base gem', () => {
    const doc = compose(['Herald of Ash', 'Dual Strike of Ambidexterity']).doc
    const gem = facts({ itemClass: 'Skill Gems', baseType: 'Dual Strike of Ambidexterity', filterBase: 'Dual Strike', transfigured: true, areaLevel: 30 })
    expect(matchItem(doc, gem).final?.block.tier).toBe('gems')
  })
})
