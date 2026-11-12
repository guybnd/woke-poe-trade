// Loot filter presets on NeverSink's real files: regressions from the bug hunt
// (cheap uniques and NeverSink's exceptions, gear in maps, custom sound volume,
// the top map tier, colour-blind build rules, tier conditions in words).
import { describe, it, expect } from 'vitest'
import { parseFilter } from '@/web/woke/loot-filter/parse'
import type { FilterDoc } from '@/web/woke/loot-filter/parse'
import { matchItem } from '@/web/woke/loot-filter/match'
import type { ItemFacts } from '@/web/woke/loot-filter/item-facts'
import { BUILD_RULE_TYPE, insertBuildBlocks } from '@/web/woke/loot-filter/build-rules'
import { validateFilter } from '@/web/woke/loot-filter/validate'
import { addedBlock, describeCondition } from '@/web/woke/loot-filter/rules'
import { applyPresetChanges, defaultPresets, normalizePresets, presetBlocks } from '@/web/woke/loot-filter/presets'
import type { Presets, UniqueBreakdown } from '@/web/woke/loot-filter/presets'
import { neverSink } from '../helpers/neversink'

function item (f: Partial<ItemFacts>): ItemFacts {
  return {
    name: f.baseType ?? 'x',
    influences: [],
    explicitModNames: [],
    areaLevel: 83,
    itemLevel: 83,
    identified: true,
    corrupted: false,
    mirrored: false,
    fractured: false,
    synthesised: false,
    replica: false,
    foulborn: false,
    vestigial: false,
    crucibleTree: false,
    transfigured: false,
    zanaMemory: false,
    blightedMap: false,
    uberBlightedMap: false,
    anyEnchantment: false,
    hasImplicitMod: false,
    corruptedMods: 0,
    quality: 0,
    socketGroups: ['R'],
    ...f
  }
}

function withPresets (doc: FilterDoc, patch: Partial<Presets>, breakdown?: UniqueBreakdown): FilterDoc {
  const p = normalizePresets({ ...defaultPresets(), ...patch })
  insertBuildBlocks(doc, presetBlocks(doc, p, null, null, { breakdown }))
  applyPresetChanges(doc, p)
  return doc
}

const match = (doc: FilterDoc, f: Partial<ItemFacts>) => matchItem(doc, item(f))

describe('cheap uniques keep NeverSink\'s exceptions (L1)', () => {
  const cheap = ['Onyx Amulet', 'Glorious Plate', 'Murder Boots', 'Carnal Armour']
  const breakdown: UniqueBreakdown = (_g, base) => cheap.includes(base) ? [{ name: 'Cheap', chaos: 0.5, thin: false }] : []
  const doc = withPresets(parseFilter(neverSink('1-REGULAR')), { cheapUniques: { on: true, chaos: 1 } }, breakdown)
  const unique = (itemClass: string, baseType: string, f: Partial<ItemFacts> = {}) => ({ itemClass, baseType, rarity: 'Unique' as const, ...f })

  it('still hides the plain copies in maps', () => {
    expect(match(doc, unique('Amulets', 'Onyx Amulet')).visibility).toBe('Hide')
    expect(match(doc, unique('Body Armours', 'Glorious Plate')).visibility).toBe('Hide')
    expect(match(doc, unique('Boots', 'Murder Boots')).visibility).toBe('Hide')
    expect(match(doc, unique('Body Armours', 'Carnal Armour')).visibility).toBe('Hide')
    expect(match(doc, unique('Boots', 'Murder Boots', { areaLevel: 50 })).visibility).toBe('Show')
  })

  it('leaves the exceptions to NeverSink', () => {
    const cases: Array<[Partial<ItemFacts>, string]> = [
      [unique('Amulets', 'Onyx Amulet', { influences: ['Shaper', 'Elder'] }), 'exuberimpresence'],
      [unique('Body Armours', 'Glorious Plate', { socketGroups: [] }), 'exkaom'],
      [unique('Boots', 'Murder Boots', { socketGroups: ['A', 'A'] }), '2xabyss'],
      [unique('Body Armours', 'Carnal Armour', { socketGroups: ['A', 'A', 'A'] }), '3xabyss'],
      [unique('Boots', 'Murder Boots', { vestigial: true }), 'vestige'],
      [unique('Boots', 'Murder Boots', { crucibleTree: true }), 'excrucibleunique']
    ]
    for (const [f, tier] of cases) {
      const m = match(doc, f)
      expect(m.visibility, tier).toBe('Show')
      expect(m.final?.block.tier, tier).toBe(tier)
    }
  })

  it('passes the save check', () => {
    expect(validateFilter(doc).map(x => x.message)).toEqual([])
  })
})

describe('hiding gear in maps (L2)', () => {
  it('a white and blue only tier is hidden whole, with its Rarity kept', () => {
    const doc = parseFilter(neverSink('1-REGULAR'))
    // Shipped off; switched on the way a player would.
    const tier = doc.blocks.find(b => b.type === 'normalcraft->extra' && b.tier === 'earlycraftoptional')!
    tier.disabled = false
    withPresets(doc, { hideGear: { on: true } })
    expect(tier.visibility).toBe('Hide')
    expect(tier.conditions.find(c => c.key === 'Rarity')?.values).toEqual(['Normal', 'Magic'])
    expect(validateFilter(doc).map(x => x.message)).toEqual([])
  })
})

describe('drop sound volume (L4)', () => {
  it('turns down custom sounds too', () => {
    const doc = parseFilter(neverSink('1-REGULAR'))
    const b = doc.blocks.find(x => !x.disabled && x.actions.some(a => a.key === 'PlayAlertSound'))!
    b.actions = [...b.actions.filter(a => a.key !== 'PlayAlertSound'), { key: 'CustomAlertSound', args: ['drop.mp3', '300'] }, { key: 'CustomAlertSoundOptional', args: ['other.mp3', '200'] }]
    withPresets(doc, { volume: { on: true, percent: 50 } })
    expect(b.actions.filter(a => a.key.startsWith('CustomAlertSound')).map(a => a.args)).toEqual([['drop.mp3', '150'], ['other.mp3', '100']])
  })
})

describe('low maps below the top tier (L5)', () => {
  const map = (mapTier: number, areaLevel = 83) => ({ itemClass: 'Maps', baseType: 'Strand Map', rarity: 'Rare' as const, mapTier, areaLevel, itemLevel: areaLevel })

  it('"below tier 17" hides tier 16 maps, which NeverSink catches with an open-ended rule', () => {
    const doc = withPresets(parseFilter(neverSink('1-REGULAR')), { lowMaps: { on: true, tier: 17 } })
    expect(match(doc, map(16)).visibility).toBe('Hide')
    expect(match(doc, map(15)).visibility).toBe('Hide')
    expect(match(doc, map(17)).visibility).toBe('Show')
    // A tier 16 map in a lower zone is progress and still shows.
    expect(match(doc, map(16, 80)).visibility).toBe('Show')
    expect(match(doc, { ...map(16), influences: ['Shaper'] }).visibility).toBe('Show')
    expect(validateFilter(doc).map(x => x.message)).toEqual([])
  })

  it('a lower line leaves tier 16 alone', () => {
    const doc = withPresets(parseFilter(neverSink('1-REGULAR')), { lowMaps: { on: true, tier: 14 } })
    expect(match(doc, map(16)).visibility).toBe('Show')
    expect(match(doc, map(13)).visibility).toBe('Hide')
  })
})

describe('colour-blind preset (L7)', () => {
  it('reaches build rules and the presets\' own, not your own rules', () => {
    const doc = parseFilter(neverSink('1-REGULAR'))
    const build = addedBlock(BUILD_RULE_TYPE, 'b1', 'build', [{ key: 'BaseType', op: '==', count: null, values: ['Gold Ring'] }], 'Show', 'Build')
    build.actions = [{ key: 'PlayEffect', args: ['Brown'] }, { key: 'MinimapIcon', args: ['1', 'Green', 'Star'] }]
    const mine = addedBlock('woke->rule', 'r1', 'mine', [{ key: 'BaseType', op: '==', count: null, values: ['Iron Ring'] }], 'Show', 'Your rules')
    mine.actions = [{ key: 'PlayEffect', args: ['Brown'] }]
    insertBuildBlocks(doc, [mine, build])
    withPresets(doc, { colourBlind: { on: true } })
    expect(build.actions.map(a => a.args)).toEqual([['Yellow'], ['1', 'Blue', 'Star']])
    expect(mine.actions[0].args).toEqual(['Brown'])
  })
})

describe('tier conditions in words (L6)', () => {
  it('shows the compare', () => {
    expect(describeCondition({ key: 'UnidentifiedItemTier', op: '>=', count: null, values: ['4'] })).toBe('Item tier >= 4')
    expect(describeCondition({ key: 'UnidentifiedItemTier', op: '', count: null, values: ['3'] })).toBe('Item tier = 3')
  })
})
