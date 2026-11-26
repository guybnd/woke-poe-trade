// Every row in the Market's Prices tab gets the game's item tooltip, not just
// the price strip (Guy's rule: every line item has a hover tooltip).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { TipLine, TipModel, TipPack } from '@/web/woke/ui/tooltip/tip-content'
import { rowTipModel, withForbiddenNotable } from '@/web/woke/ui/tooltip/ninja-row-tip'
import { CATEGORY_GROUPS } from '@/web/woke/market/browser'
import { sampleRows } from '../helpers/ninja-rows'
import type { SampleRow } from '../helpers/ninja-rows'

const read = (file: string) => JSON.parse(readFileSync(join(__dirname, '../../public/data/tips', `${file}.json`), 'utf8'))
const pack: TipPack = { 'uniques': read('uniques'), 'unique-extras': read('unique-extras'), 'gems': read('gems'), 'items': read('items'), 'bases': read('bases'), 'base-extras': read('base-extras'), 'drops': read('drops') }

const text = (line: TipLine) => line.map(p => p.text).join('')
const all = (model: TipModel | null) => (model?.sections ?? []).flat().map(text)

// Categories with a tooltip of their own in item-tip.ts, not from the data.
const OWN_TIP: Record<string, string> = {
  Viscera: 'visceraTip: every effect poe.ninja prices',
  Beast: 'beastTip: its Bestiary recipes'
}
// Categories the app's data has no rows of to sample.
const NO_SAMPLE: Record<string, string> = {
  DjinnCoin: 'not in the item data or the league dump yet',
  UniqueIdol: 'not in the item data or the league dump yet'
}
// Rows that show only the price strip, and why. Each is missing text in the
// tooltip data itself (public/data/tips), not a row the mapping misreads.
const NO_TEXT: Array<{ type: string, name: RegExp, why: string }> = [
  { type: 'Corpse', name: /./, why: 'RePoE has no text for corpses; their grave-crafting effects aren\'t in any data the app bundles' },
  { type: 'Fragment', name: /./, why: 'RePoE has no text for these fragments (reliquary keys, Sacrifice, Mortal, Echo pieces)' },
  { type: 'Currency', name: /Reliquary Key$|^Mortal |^Chronicle of Atzoatl$|^Divine Vessel$|^Forbidden Tome$|^Inscribed Ultimatum$|^Mirrored Tablet$/, why: 'RePoE has no text for it' },
  { type: 'Currency', name: /^Viscera$/, why: 'the Viscera row has its own tooltip (OWN_TIP)' },
  { type: 'Incubator', name: /./, why: 'RePoE has no text for incubators' },
  { type: 'Map', name: /^(?:Shaper Guardian|Nightmare|Vaal Temple) Map$/, why: 'no tier in the row and no text; the hover adds the map\'s card drops where the card data has it' },
  { type: 'BaseType', name: /Jewel$|^(?:Two-Stone|Shadowed) Ring$/, why: 'a base with no stats of its own; the hover adds its top tiers and uniques (withBaseExtras)' },
  { type: 'SkillGem', name: /^Dark Pact|^Minion Pact Support$|^Arcane Link$|^Fireball of Radiation$/, why: 'not in RePoE\'s gem data' },
  { type: 'UniqueArmour', name: /./, why: 'uniques poe.ninja and Path of Building have no text of yet; the hover shows the base (only the item data\'s uniques, not poe.ninja rows)' },
  { type: 'UniqueTincture', name: /^Mightblade$/, why: 'not in the tooltip data' }
]
const why = (r: SampleRow) => NO_TEXT.find(x => x.type === r.type && x.name.test(r.name))?.why

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

  // Each exception still covers a row with no text: one that gains text leaves the list.
  it('allows only exceptions still needed', () => {
    const bare = rows.filter(r => !rowTipModel(pack, r)?.sections.length)
    const stale = NO_TEXT.filter(x => !bare.some(r => r.type === x.type && x.name.test(r.name))).map(x => `${x.type} ${x.name}`)
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
