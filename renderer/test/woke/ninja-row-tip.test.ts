// Every row in the Market's Prices tab gets the game's item tooltip, not just
// the price strip (Guy's rule: every line item has a hover tooltip).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { TipLine, TipModel, TipPack } from '@/web/woke/ui/tooltip/tip-content'
import { SPECIAL, rowTipModel, withForbiddenNotable } from '@/web/woke/ui/tooltip/ninja-row-tip'
import { NINJA_ROW_TYPES } from '@/web/woke/ui/tooltip/ninja-row-types'
import { CATEGORY_GROUPS } from '@/web/woke/market/browser'
import { sampleRows } from '../helpers/ninja-rows'
import type { SampleRow } from '../helpers/ninja-rows'

const read = (file: string) => JSON.parse(readFileSync(join(__dirname, '../../public/data/tips', `${file}.json`), 'utf8'))
const pack: TipPack = { 'uniques': read('uniques'), 'unique-extras': read('unique-extras'), 'gems': read('gems'), 'items': read('items'), 'bases': read('bases'), 'base-extras': read('base-extras'), 'drops': read('drops'), 'corpses': read('corpses') }

const text = (line: TipLine) => line.map(p => p.text).join('')
const all = (model: TipModel | null) => (model?.sections ?? []).flat().map(text)

// Categories with a tooltip of their own in item-tip.ts, not from the data.
const OWN_TIP: Record<string, string> = {
  Viscera: 'visceraTip: every effect poe.ninja prices',
  Beast: 'beastTip: its Bestiary recipes'
}
// Categories the app's data has no rows of to sample.
const NO_SAMPLE: Record<string, string> = {
  DjinnCoin: 'not in the item data or the league dump yet'
}
// Rows that show only the price strip, by name, and why. Each is missing text
// in the tooltip data itself (public/data/tips), not a row the mapping misreads.
const NO_TEXT: Array<{ type: string, names: string[], why: string }> = [
  {
    type: 'Fragment',
    names: ['Ancient Reliquary Key', 'Archive Reliquary Key', 'Cosmic Reliquary Key', 'Decaying Reliquary Key', 'Echo of Loneliness', 'Echo of Reverence', 'Echo of Trauma', 'Forgotten Reliquary Key', 'Lonely Reliquary Key', 'Mortal Ignorance', 'Mortal Rage', 'Oubliette Reliquary Key', 'Reverent Reliquary Key', 'Shiny Reliquary Key', 'Timeworn Reliquary Key', 'Traumatic Reliquary Key', 'Vaal Reliquary Key', 'Visceral Reliquary Key', 'Voidborn Reliquary Key'],
    why: 'RePoE has no text for these fragments'
  },
  { type: 'Currency', names: ['Chronicle of Atzoatl', 'Divine Vessel', 'Forbidden Tome', 'Inscribed Ultimatum', 'Mirrored Tablet', 'Mortal Rage', 'Voidborn Reliquary Key'], why: 'RePoE has no text for it' },
  { type: 'Currency', names: ['Viscera'], why: 'the Viscera row has its own tooltip (OWN_TIP)' },
  {
    type: 'Incubator',
    names: ["Celestial Armoursmith's Incubator", "Celestial Jeweller's Incubator", 'Fine Incubator', "Gemcutter's Incubator", "Geomancer's Incubator", 'Honoured Incubator', 'Miraged Incubator', 'Ornate Incubator', 'Sacred Incubator', "Thaumaturge's Incubator"],
    why: 'RePoE has no text for incubators'
  },
  { type: 'Map', names: ['Nightmare Map', 'Shaper Guardian Map', 'Vaal Temple Map'], why: 'no tier in the row and no text; the hover adds the map\'s card drops where the card data has it' },
  {
    type: 'BaseType',
    names: ['Cobalt Jewel', 'Crimson Jewel', 'Ghastly Eye Jewel', 'Hypnotic Eye Jewel', 'Murderous Eye Jewel', 'Searching Eye Jewel', 'Shadowed Ring', 'Two-Stone Ring', 'Viridian Jewel'],
    why: 'a base with no stats of its own; the hover adds its top tiers and uniques (withBaseExtras)'
  },
  { type: 'SkillGem', names: ['Arcane Link', 'Dark Pact', 'Dark Pact of Trarthus', 'Fireball of Radiation', 'Minion Pact Support'], why: 'not in RePoE\'s gem data' },
  {
    type: 'UniqueIdol',
    names: ['Arbitrary Tenets', 'Black Thumb', 'Bold Undertakings', "Cassia's Pride", 'Crop Rotation', 'Crystallised Power', 'Dance of Destruction', 'Destructive Play', 'Dimensional Barrier', 'Eldritch Gaze', 'Endless Tide', 'Extreme Archaeology', 'Fungal Remission', 'Gruelling Gauntlet', 'Immutable Dogma', 'Loved by the Sun', 'Lucid Dreams', 'Meticulous Appraiser', 'Ominous Silence', 'Perceived Greatness', "Refiner's Bargain", 'Ruinous Wager', 'Sealed Domain', 'Secular Focus', 'Servant of Order', 'Shadow Shaping', 'Singular Focus', 'Smash and Grab', 'Speaker of the Dead', 'Straight and Narrow', 'Thorough Exploration', 'Timeless Conflict', 'Trade Embargo', 'Twist of Fate', 'Twisted Wish', 'Unending Nightmare', 'Well Supplied', 'Wellspring of Creation', 'Wrath of the Cosmos'],
    why: 'unique idols poe.ninja and Path of Building have no text of yet (a tip-data rebuild may add them); the hover shows the base'
  },
  { type: 'UniqueArmour', names: ['Skin of the Lords'], why: 'no text in poe.ninja or Path of Building; the hover shows the base' },
  { type: 'UniqueWeapon', names: ['The Wellhook'], why: 'no text in poe.ninja or Path of Building; the hover shows the base' }
]
const why = (r: SampleRow) => NO_TEXT.find(x => x.type === r.type && x.names.includes(r.name))?.why

describe('every Prices category', () => {
  const rows = sampleRows()

  it('has rows to check', () => {
    for (const type of CATEGORY_GROUPS.flatMap(g => g.types)) {
      if (NO_SAMPLE[type] || OWN_TIP[type]) continue
      expect(rows.some(r => r.type === type), type).toBe(true)
    }
  })

  it('shows the game tooltip for each row', () => {
    const missing = rows
      .filter(r => !OWN_TIP[r.type] && !why(r))
      .filter(r => !rowTipModel(pack, r)?.sections.length)
      .map(r => `${r.type}: ${r.name}${r.variant ? ` (${r.variant})` : ''}`)
    expect(missing).toEqual([])
  })

  // Each name listed is still a row with no text: one that gains text leaves the list.
  it('allows only exceptions still needed', () => {
    const bare = rows.filter(r => !rowTipModel(pack, r)?.sections.length)
    const stale = NO_TEXT.flatMap(x => x.names.filter(n => !bare.some(r => r.type === x.type && r.name === n)).map(n => `${x.type}: ${n}`))
    expect(stale).toEqual([])
  })
})

describe('rows named after what prices them', () => {
  it('shows a Forbidden jewel row as the jewel with that notable', () => {
    const tip = rowTipModel(pack, { type: 'ForbiddenJewel', name: 'Bastion of Hope', variant: 'Forbidden Flesh, Bastion of Hope' })!
    expect(tip.name).toBe('Forbidden Flesh')
    expect(tip.base).toBe('Cobalt Jewel')
    expect(tip.frame).toBe('unique')
    const lines = all(tip)
    expect(lines).toContain('Allocates Bastion of Hope if you have the matching modifier on Forbidden Flame')
    // Only this notable, not the pool of every one it can roll.
    expect(lines.filter(l => l.startsWith('Allocates '))).toHaveLength(1)
    expect(lines.some(l => l.startsWith('Rolls from'))).toBe(false)
    const flame = rowTipModel(pack, { type: 'ForbiddenJewel', name: 'Bastion of Hope', variant: 'Forbidden Flame' })!
    expect(flame.name).toBe('Forbidden Flame')
    expect(all(flame)).toContain('Allocates Bastion of Hope if you have the matching modifier on Forbidden Flesh')
  })

  it('shows poe.ninja\'s own Forbidden rows (variant just the jewel)', () => {
    const tip = rowTipModel(pack, { type: 'ForbiddenJewel', name: 'Void Beacon', variant: 'Forbidden Flesh' })!
    expect(tip.name).toBe('Forbidden Flesh')
    expect(all(tip).filter(l => l.startsWith('Allocates '))).toEqual(['Allocates Void Beacon if you have the matching modifier on Forbidden Flame'])
  })

  it('shows both jewels for a row that names neither (Ctrl+Space\'s pair)', () => {
    const tip = rowTipModel(pack, { type: 'ForbiddenJewel', name: 'Bastion of Hope' })!
    expect(tip.name).toBe('Forbidden Flame + Flesh')
    expect(tip.base).toBe('Bastion of Hope')
    expect(all(tip)).toEqual([
      'Forbidden Flame (Crimson Jewel)', 'Allocates Bastion of Hope if you have the matching modifier on Forbidden Flesh',
      'Forbidden Flesh (Cobalt Jewel)', 'Allocates Bastion of Hope if you have the matching modifier on Forbidden Flame'
    ])
  })

  it('adds the notable\'s class and stats from the tree', () => {
    const tip = rowTipModel(pack, { type: 'ForbiddenJewel', name: 'Bastion of Hope', variant: 'Forbidden Flesh' })!
    const lines = all(withForbiddenNotable(tip, { cls: 'Templar', group: 'Guardian', stats: ['Gain 2 Endurance Charges'] }))
    expect(lines).toContain('Requires Class: Templar')
    expect(lines).toContain('Ascendancy: Guardian')
  })

  it('shows a cluster jewel row as its size, enchant and item level', () => {
    const tip = rowTipModel(pack, { type: 'ClusterJewel', name: '12% increased Fire Damage', variant: '8 passives, 84' })!
    expect(tip.name).toBe('Large Cluster Jewel')
    expect(all(tip)).toEqual(['Item Level: 84+', 'Adds 8 Passive Skills', 'Added Small Passive Skills grant: 12% increased Fire Damage'])
    expect(rowTipModel(pack, { type: 'ClusterJewel', name: 'x', variant: '5 passives' })!.name).toBe('Medium Cluster Jewel')
    expect(rowTipModel(pack, { type: 'ClusterJewel', name: 'x', variant: '3 passives' })!.name).toBe('Small Cluster Jewel')
  })

  it('maps only the types it lists, and lists every type it maps', () => {
    expect(Object.keys(SPECIAL).sort()).toEqual([...NINJA_ROW_TYPES].sort())
  })

  it('reads a map row\'s tier from its name or its variant', () => {
    expect(all(rowTipModel(pack, { type: 'BlightedMap', name: 'Blighted Map (Tier 13)', variant: ', Gen-24' }))).toContain('Map Tier: 13')
    expect(rowTipModel(pack, { type: 'Map', name: 'Map (Tier 16)', variant: 'T0, Gen-24' })!.name).toBe('Map')
    expect(all(rowTipModel(pack, { type: 'Map', name: 'Strand Map', variant: 'Tier 16' }))).toContain('Map Tier: 16')
  })

  it('shows a Filled Coffin row with its mod and corpse level', () => {
    const tip = rowTipModel(pack, { type: 'Coffin', name: '(12-16)% to All Resistances', variant: '80' })!
    expect(tip.name).toBe('Filled Coffin')
    expect(all(tip)).toEqual(['Corpse Level: 80+', '(12-16)% to All Resistances'])
  })

  it('shows a temple room, a Valdo map, a shrine belt and an imbued gem', () => {
    const room = rowTipModel(pack, { type: 'IncursionTemple', name: 'Hatchery (Tier 1)' })!
    expect(room.name).toBe('Chronicle of Atzoatl')
    expect(all(room)).toContain('Room: Hatchery (Tier 1)')
    const valdo = rowTipModel(pack, { type: 'ValdoMap', name: 'Unholy Reaches', variant: 'Foil Brightbeak' })!
    expect(valdo.base).toBe('Valdo Map')
    expect(all(valdo)).toContain('Reward: Foil Brightbeak')
    const belt = rowTipModel(pack, { type: 'ShrineBelt', name: 'Screams of the Desiccated', variant: 'Greater Freezing' })!
    expect(belt.frame).toBe('unique')
    expect(all(belt)).toContain('Shrine: Greater Freezing')
    const gem = rowTipModel(pack, { type: 'ImbuedGem', name: 'Elemental Hit', variant: 'Rage' })!
    expect(gem.frame).toMatch(/^gem-/)
    expect(all(gem)).toContain('Imbued: Rage')
  })

  it('leaves rows named after their item as they were', () => {
    expect(rowTipModel(pack, { type: 'Currency', name: 'Divine Orb' })!.frame).toBe('currency')
    expect(rowTipModel(pack, { type: 'UniqueArmour', name: "Kaom's Heart", variant: 'Glorious Plate' })!.base).toBe('Glorious Plate')
  })
})
