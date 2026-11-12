// Loot filter presets, second batch: hides for maps, price lines on cards,
// uniques and splinters, levelling helpers, volume and beams.
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { FIXTURES } from '../helpers/game-data'
import { parseFilter, serializeFilter } from '@/web/woke/loot-filter/parse'
import type { FilterDoc } from '@/web/woke/loot-filter/parse'
import { matchItem } from '@/web/woke/loot-filter/match'
import type { ItemFacts } from '@/web/woke/loot-filter/item-facts'
import { insertBuildBlocks } from '@/web/woke/loot-filter/build-rules'
import { validateFilter } from '@/web/woke/loot-filter/validate'
import { RULE_TYPE, ruleBlocks } from '@/web/woke/loot-filter/rules'
import {
  applyPresetChanges, cheapCards, cheapSplinters, cheapStacks, cheapUniqueBases, defaultPresets, mapTierCap,
  normalizePresets, presetBlocks, presetsOn
} from '@/web/woke/loot-filter/presets'
import type { Presets, UniqueBreakdown } from '@/web/woke/loot-filter/presets'
import type { PriceLookup } from '@/web/woke/loot-filter/economy'

const NS = fs.readFileSync(path.join(FIXTURES, 'filters/neversink-presets.filter'), 'utf8')
const SAMPLE = fs.readFileSync(path.join(FIXTURES, 'filters/neversink-sample.filter'), 'utf8')

function item (f: Partial<ItemFacts>): ItemFacts {
  return {
    name: f.baseType ?? 'x',
    influences: [],
    explicitModNames: [],
    areaLevel: 83,
    identified: true,
    corrupted: false,
    mirrored: false,
    fractured: false,
    synthesised: false,
    replica: false,
    foulborn: false,
    transfigured: false,
    zanaMemory: false,
    blightedMap: false,
    uberBlightedMap: false,
    anyEnchantment: false,
    hasImplicitMod: false,
    corruptedMods: 0,
    quality: 0,
    socketGroups: [],
    ...f
  }
}

function withPresets (patch: Partial<Presets>, opts: { lookup?: PriceLookup | null, breakdown?: UniqueBreakdown, build?: { uniqueBases: string[], weaponClasses: string[] } } = {}): FilterDoc {
  const doc = parseFilter(NS)
  const p = normalizePresets({ ...defaultPresets(), ...patch })
  insertBuildBlocks(doc, presetBlocks(doc, p, opts.lookup ?? null, null, { breakdown: opts.breakdown, build: opts.build }))
  applyPresetChanges(doc, p)
  return doc
}

const shown = (doc: FilterDoc, f: Partial<ItemFacts>) => matchItem(doc, item(f)).visibility === 'Show'
const finalTier = (doc: FilterDoc, f: Partial<ItemFacts>) => matchItem(doc, item(f)).final?.block.tier

describe('presets, second batch', () => {
  it('all start off, and old configs read them as off', () => {
    const d = defaultPresets()
    expect(presetsOn(d)).toBe(false)
    const old = normalizePresets({ quiet: { on: true, keepTiers: 2 } } as Partial<Presets>)
    expect(old.cheapCards).toEqual({ on: false, chaos: 2 })
    expect(old.lowMaps).toEqual({ on: false, tier: 14 })
    expect(old.volume).toEqual({ on: false, percent: 60 })
    expect(old.weapons).toEqual({ on: false, archetype: 'auto' })
    expect(normalizePresets({ weapons: { on: true, archetype: 'wizard' as 'auto' }, volume: { on: true, percent: 900 } }).weapons.archetype).toBe('auto')
    expect(normalizePresets({ volume: { on: true, percent: 900 } }).volume.percent).toBe(100)
  })

  it('the fixture parses and stays valid with every preset on', () => {
    const all = Object.fromEntries(Object.entries(defaultPresets()).map(([k, v]) => [k, { ...v, on: true }])) as unknown as Presets
    const doc = withPresets(all, { lookup: () => ({ chaos: 0.1, thin: false }), breakdown: () => [{ name: 'x', chaos: 0.1, thin: false }] })
    expect(validateFilter(doc)).toEqual([])
    expect(validateFilter(parseFilter(serializeFilter(doc)))).toEqual([])
  })

  it('hides white and blue gear in maps but keeps what NeverSink ranks higher', () => {
    const doc = withPresets({ hideGear: { on: true } })
    // Early-map 4-link: the white one hides, the rare one still shows.
    const fourLink = (rarity: 'Normal' | 'Rare') => ({ itemClass: 'Body Armours', baseType: 'Plate Vest', rarity, itemLevel: 70, areaLevel: 70, socketGroups: ['RGBR'] })
    expect(shown(doc, fourLink('Normal'))).toBe(false)
    expect(shown(doc, fourLink('Rare'))).toBe(true)
    // Item level 84 crafting base in white: hidden; at 86 NeverSink's tier stays.
    expect(shown(doc, { itemClass: 'Body Armours', baseType: 'Sadist Garb', rarity: 'Normal', itemLevel: 84 })).toBe(false)
    expect(finalTier(doc, { itemClass: 'Body Armours', baseType: 'Conquest Lamellar', rarity: 'Normal', itemLevel: 86 })).toBe('t1_86')
    // 6-sockets keep showing.
    expect(finalTier(doc, { itemClass: 'Body Armours', baseType: 'Plate Vest', rarity: 'Normal', socketGroups: ['RG', 'B', 'R', 'G', 'B'], height: 3 })).toBe('6sockets')
    const off = parseFilter(NS)
    expect(shown(off, fourLink('Normal'))).toBe(true)
  })

  it('hides cheap divination cards, but not a stack worth the line or a thin price', () => {
    const prices: Record<string, { chaos: number, thin: boolean }> = {
      'A Mother\'s Parting Gift': { chaos: 0.5, thin: false },
      'A Note in the Wind': { chaos: 0.2, thin: true },
      'Apocalypse': { chaos: 400, thin: false }
    }
    const lookup: PriceLookup = (_g, base) => prices[base] ?? null
    const doc = withPresets({ cheapCards: { on: true, chaos: 2 } }, { lookup })
    expect([...cheapCards(parseFilter(NS), lookup, 2)]).toEqual([[4, ['A Mother\'s Parting Gift']]])
    const card = (baseType: string, stackSize = 1) => ({ itemClass: 'Divination Cards', baseType, stackSize })
    expect(shown(doc, card('A Mother\'s Parting Gift'))).toBe(false)
    expect(shown(doc, card('A Mother\'s Parting Gift', 3))).toBe(false)
    // Four of them make 2c.
    expect(shown(doc, card('A Mother\'s Parting Gift', 4))).toBe(true)
    expect(shown(doc, card('A Note in the Wind'))).toBe(true)
    expect(shown(doc, card('Apocalypse'))).toBe(true)
  })

  it('stack sizes round down, so a stack worth the line never hides', () => {
    const price = (chaos: number) => () => ({ chaos, thin: false })
    expect([...cheapStacks(['a'], price(0.3), 1)]).toEqual([[4, ['a']]])
    expect([...cheapStacks(['a'], price(0.15), 1)]).toEqual([[5, ['a']]])
    expect([...cheapStacks(['a'], price(0.01), 2)]).toEqual([[200, ['a']]])
    expect([...cheapStacks(['a'], price(1), 1)]).toEqual([])
    expect([...cheapStacks(['a'], price(0.1), 1)]).toEqual([[10, ['a']]])
  })

  it('hides maps below the tier but keeps unique, blighted, influenced and progress maps', () => {
    const doc = withPresets({ lowMaps: { on: true, tier: 14 } })
    const map = (mapTier: number, f: Partial<ItemFacts> = {}) => ({ itemClass: 'Maps', baseType: 'Strand Map', rarity: 'Normal' as const, mapTier, ...f })
    expect(shown(doc, map(13))).toBe(false)
    expect(shown(doc, map(3))).toBe(false)
    expect(shown(doc, map(14))).toBe(true)
    expect(shown(doc, map(16))).toBe(true)
    expect(shown(doc, map(3, { rarity: 'Unique' }))).toBe(true)
    expect(shown(doc, map(3, { blightedMap: true }))).toBe(true)
    expect(shown(doc, map(3, { influences: ['Crusader'] }))).toBe(true)
    // A tier 3 map in a level 69 zone is progress: NeverSink's map-up rule.
    expect(shown(doc, map(3, { areaLevel: 69 }))).toBe(true)
  })

  it('reads the highest tier a map rule can catch', () => {
    const doc = parseFilter(NS)
    const cap = (tier: string) => mapTierCap(doc.blocks.find(b => b.type === 'maps' && b.tier === tier)!)
    expect(cap('maps_b_t13')).toBe(13)
    expect(cap('deco_zone4general')).toBe(5)
    expect(cap('maps_a_t16')).toBe(null)
    expect(cap('restex')).toBe(null)
  })

  it('hides flasks in maps, but not 20% quality or unique ones', () => {
    const doc = withPresets({ hideFlasks: { on: true } })
    const flask = (f: Partial<ItemFacts>) => ({ itemClass: 'Utility Flasks', baseType: 'Quicksilver Flask', rarity: 'Magic' as const, itemLevel: 80, ...f })
    expect(shown(doc, flask({}))).toBe(false)
    expect(shown(doc, flask({ quality: 20, rarity: 'Normal' }))).toBe(true)
    expect(shown(doc, flask({ rarity: 'Unique' }))).toBe(true)
    // Still shown while levelling.
    expect(shown(doc, flask({ areaLevel: 40, itemLevel: 40 }))).toBe(true)
  })

  it('hides uniques on all-cheap bases in maps, keeping 5-links, dust and build bases', () => {
    const rows: Record<string, Array<{ name: string, chaos: number | null, thin: boolean }>> = {
      'Ambusher': [{ name: 'Cheap A', chaos: 0.5, thin: false }],
      'Ancient Greaves': [{ name: 'Cheap B', chaos: 0.5, thin: false }, { name: 'Unpriced', chaos: null, thin: false }],
      'Antique Greaves': [{ name: 'Cheap C', chaos: 0.5, thin: false }, { name: 'Pricey', chaos: 50, thin: false }],
      'Antique Rapier': [{ name: 'Thin', chaos: 0.5, thin: true }],
      'Arcanist Gloves': [{ name: 'Cheap D', chaos: 0.5, thin: false }],
      'Arcanist Slippers': [{ name: 'Cheap E', chaos: 0.5, thin: false }]
    }
    const breakdown: UniqueBreakdown = (_g, base) => rows[base] ?? []
    expect(cheapUniqueBases(parseFilter(NS), breakdown, 1)).toEqual(['Ambusher', 'Arcanist Gloves', 'Arcanist Slippers'])
    const doc = withPresets({ cheapUniques: { on: true, chaos: 1 }, dust: { on: true, fromPrices: false, line: 5000 } }, {
      breakdown,
      build: { uniqueBases: ['Arcanist Slippers'], weaponClasses: [] }
    })
    const unique = (baseType: string, f: Partial<ItemFacts> = {}) => ({ itemClass: 'Claws', baseType, rarity: 'Unique' as const, itemLevel: 83, ...f })
    expect(shown(doc, unique('Ambusher'))).toBe(false)
    expect(shown(doc, unique('Ambusher', { areaLevel: 50 }))).toBe(true)
    expect(shown(doc, unique('Ambusher', { socketGroups: ['RGBRG'] }))).toBe(true)
    expect(shown(doc, unique('Ambusher', { corrupted: true }))).toBe(true)
    expect(shown(doc, unique('Ancient Greaves'))).toBe(true)
    expect(shown(doc, unique('Antique Greaves'))).toBe(true)
    expect(shown(doc, unique('Antique Rapier'))).toBe(true)
    // Arcanist Gloves is on NeverSink's dust list, Arcanist Slippers in the build.
    expect(shown(doc, unique('Arcanist Gloves'))).toBe(true)
    expect(shown(doc, unique('Arcanist Slippers'))).toBe(true)
  })

  it('hides cheap splinter stacks in maps by their stack value', () => {
    const prices: Record<string, number> = { 'Timeless Karui Splinter': 0.2, 'Simulacrum Splinter': 2 }
    const lookup: PriceLookup = (g, base) => g.type === 'currency' && prices[base] != null ? { chaos: prices[base], thin: false } : null
    expect([...cheapSplinters(parseFilter(NS), lookup, 1)]).toEqual([[5, ['Timeless Karui Splinter']]])
    const doc = withPresets({ cheapSplinters: { on: true, chaos: 1 } }, { lookup })
    const splinter = (baseType: string, stackSize: number, areaLevel = 83) => ({ itemClass: 'Stackable Currency', baseType, stackSize, areaLevel })
    expect(shown(doc, splinter('Timeless Karui Splinter', 4))).toBe(false)
    expect(shown(doc, splinter('Timeless Karui Splinter', 5))).toBe(true)
    expect(shown(doc, splinter('Timeless Karui Splinter', 4, 50))).toBe(true)
    expect(shown(doc, splinter('Simulacrum Splinter', 1))).toBe(true)
  })

  it('highlights movement speed boots while levelling', () => {
    const doc = withPresets({ msBoots: { on: true } })
    const boots = (mods: string[], f: Partial<ItemFacts> = {}) => ({ itemClass: 'Boots', baseType: 'Leather Boots', rarity: 'Magic' as const, itemLevel: 20, areaLevel: 20, explicitModNames: mods, ...f })
    const m = matchItem(doc, item(boots(["Runner's"])))
    expect(m.final?.block.tier).toBe('msboots')
    expect(m.actions.some(a => a.key === 'PlayAlertSound')).toBe(true)
    expect(finalTier(doc, boots(['of the Penguin']))).not.toBe('msboots')
    expect(finalTier(doc, boots(["Runner's"], { areaLevel: 70, itemLevel: 70 }))).not.toBe('msboots')
  })

  it('stops the chromatic recipe rules in maps only', () => {
    const doc = withPresets({ hideRgb: { on: true } })
    const rgb = (areaLevel: number) => ({ itemClass: 'Gloves', baseType: 'Iron Gauntlets', rarity: 'Normal' as const, socketGroups: ['RGB'], width: 2, height: 3, areaLevel, itemLevel: areaLevel })
    expect(finalTier(doc, rgb(30))).toBe('rgbmedium')
    expect(finalTier(parseFilter(NS), rgb(75))).toBe('rgbmedium')
    expect(shown(doc, rgb(75))).toBe(false)
  })

  it('shows 20% quality gems and flasks for the vendor, below NeverSink\'s exceptional gems', () => {
    const doc = withPresets({ vendorQuality: { on: true } })
    const gem = (f: Partial<ItemFacts>) => ({ itemClass: 'Skill Gems', baseType: 'Fireball', quality: 20, gemLevel: 1, areaLevel: 40, ...f })
    expect(finalTier(doc, gem({}))).toBe('vendorgems')
    expect(finalTier(doc, gem({ areaLevel: 83 }))).toBe('qt2')
    expect(finalTier(doc, gem({ quality: 23 }))).toBe('qt1')
    expect(finalTier(doc, gem({ baseType: 'Awakened Empower Support', itemClass: 'Support Gems' }))).toBe('t1')
    expect(finalTier(doc, { itemClass: 'Life Flasks', baseType: 'Divine Life Flask', rarity: 'Magic', quality: 20, itemLevel: 70, areaLevel: 70 })).toBe('vendorflasks')
    expect(finalTier(parseFilter(NS), gem({}))).toBe('qt2')
  })

  it('scales every drop sound, with quiet mode, but not your own rules', () => {
    const doc = parseFilter(SAMPLE)
    insertBuildBlocks(doc, ruleBlocks([{
      id: 1,
      name: 'mine',
      on: true,
      visibility: 'Show',
      conditions: [{ key: 'Class', op: '==', count: null, values: ['Rings'] }],
      patch: { sound: { id: '1', volume: 300 } }
    }]))
    applyPresetChanges(doc, normalizePresets({ volume: { on: true, percent: 50 }, quiet: { on: true, keepTiers: 2 } }))
    const t1 = doc.blocks.find(b => b.tier === 't1exalted')!
    expect(t1.actions).toContainEqual({ key: 'PlayAlertSound', args: ['6', '150'] })
    expect(doc.blocks.find(b => b.tier === 't3chaos')!.actions.some(a => a.key === 'PlayAlertSound')).toBe(false)
    const own = doc.blocks.find(b => b.type === RULE_TYPE)!
    expect(own.actions.filter(a => a.key === 'PlayAlertSound').every(a => a.args[1] === '300')).toBe(true)
  })

  it('keeps beams and minimap icons only on the top tiers, with their colours', () => {
    const doc = parseFilter(NS)
    applyPresetChanges(doc, normalizePresets({ beams: { on: true, keepTiers: 2 } }))
    const block = (type: string, tier: string) => doc.blocks.find(b => b.type === type && b.tier === tier)!
    expect(block('divination', 't1').actions.some(a => a.key === 'PlayEffect')).toBe(true)
    const t3 = block('currency->splinter', 't3')
    expect(t3.actions.some(a => a.key === 'PlayEffect' || a.key === 'MinimapIcon')).toBe(false)
    expect(t3.actions.some(a => a.key === 'SetTextColor')).toBe(true)
  })

  it('hides weapons other builds use while levelling, and dims their rares', () => {
    const doc = withPresets({ weapons: { on: true, archetype: 'bow' } })
    const weapon = (itemClass: string, rarity: 'Normal' | 'Rare', areaLevel = 30) => ({ itemClass, baseType: 'x', rarity, areaLevel, itemLevel: areaLevel })
    expect(shown(doc, weapon('Wands', 'Normal'))).toBe(false)
    expect(finalTier(doc, weapon('Wands', 'Rare'))).toBe('otherweaponsrare')
    expect(finalTier(doc, weapon('Bows', 'Normal'))).not.toBe('otherweapons')
    expect(shown(doc, weapon('Bows', 'Normal'))).toBe(true)
    // In maps it's NeverSink's call again.
    expect(finalTier(doc, weapon('Wands', 'Rare', 75))).not.toBe('otherweaponsrare')
    // Auto takes the PoB build's weapons; with no build it adds nothing.
    const auto = withPresets({ weapons: { on: true, archetype: 'auto' } }, { build: { uniqueBases: [], weaponClasses: ['Wands'] } })
    expect(finalTier(auto, weapon('Bows', 'Rare'))).toBe('otherweaponsrare')
    expect(finalTier(auto, weapon('Wands', 'Rare'))).not.toBe('otherweaponsrare')
    const none = withPresets({ weapons: { on: true, archetype: 'auto' } })
    expect(none.blocks.some(b => b.tier === 'otherweapons')).toBe(false)
  })
})
