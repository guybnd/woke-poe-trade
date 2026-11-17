// The Gear page's table (gear.ts) on NeverSink's real 8.21 files: off changes
// nothing, defaults keep NeverSink's answers, and the table's cells, rank
// moves, Never and the build row decide magic and rare drops apart.
import { describe, it, expect } from 'vitest'
import { parseFilter, serializeFilter } from '@/web/woke/loot-filter/parse'
import type { FilterDoc } from '@/web/woke/loot-filter/parse'
import { matchItem } from '@/web/woke/loot-filter/match'
import type { ItemFacts } from '@/web/woke/loot-filter/item-facts'
import { validateFilter } from '@/web/woke/loot-filter/validate'
import { GEAR_TYPE, applyGear, gearDefaults, magicOff, normalizeGear, readTiered, shiftAll, sourceShowFrom } from '@/web/woke/loot-filter/gear'
import type { GearSettings } from '@/web/woke/loot-filter/gear'
import { applyPresetChanges, defaultPresets } from '@/web/woke/loot-filter/presets'
import { LEVELS, neverSink } from '../helpers/neversink'

function item (f: Partial<ItemFacts>): ItemFacts {
  return {
    name: f.baseType ?? 'x',
    influences: [],
    explicitModNames: [],
    areaLevel: 83,
    itemLevel: 84,
    dropLevel: 60,
    identified: false,
    corrupted: false,
    mirrored: false,
    fractured: false,
    synthesised: false,
    replica: false,
    foulborn: false,
    vestigial: false,
    ...f
  } as ItemFacts
}

const doc = (level: typeof LEVELS[number] = '4-VERY-STRICT') => parseFilter(neverSink(level))

function gearOn (d: FilterDoc, change: (g: GearSettings) => void = () => {}): GearSettings {
  const g = gearDefaults(d)
  g.on = true
  change(g)
  return g
}

// A rank base of each rank in NeverSink 8.21 (body armours and a ring).
const R1 = { baseType: 'Twilight Regalia', itemClass: 'Body Armours' }
const R2 = { baseType: 'Nightweave Robe', itemClass: 'Body Armours' }
const R3 = { baseType: 'Vaal Regalia', itemClass: 'Body Armours' }
const ANY = { baseType: 'Occultist\'s Vestment', itemClass: 'Body Armours' }

const vis = (d: FilterDoc, f: Partial<ItemFacts>) => matchItem(d, item(f)).visibility

describe('gear table', () => {
  it('reads NeverSink 8.21 ranks and its Very strict lines', () => {
    const src = readTiered(doc())!
    expect(src.ranks.r1).toContain('Twilight Regalia')
    expect(src.ranks.r3).toContain('Vaal Regalia')
    expect(sourceShowFrom(src)).toEqual({ r1: 2, r2: 2, r3: 3, any: 3 })
  })

  it('does nothing while off', () => {
    const d = doc()
    const before = serializeFilter(d)
    expect(applyGear(d, normalizeGear(undefined), [])).toEqual({ blocks: 0, replaced: 0 })
    expect(serializeFilter(d)).toBe(before)
  })

  it('keeps NeverSink\'s answers with the defaults, every strictness', () => {
    for (const level of LEVELS) {
      const base = doc(level)
      const d = doc(level)
      applyGear(d, gearOn(d), [])
      for (const it of [R1, R2, R3, ANY]) {
        for (const rarity of ['Normal', 'Magic', 'Rare'] as const) {
          for (const tier of [2, 3, 4, 5]) {
            for (const fractured of [false, true]) {
              const f = { ...it, rarity, unidentifiedItemTier: tier, fractured }
              const a = matchItem(base, item(f))
              const b = matchItem(d, item(f))
              const what = `${level} ${it.baseType} ${rarity} t${tier}${fractured ? ' fractured' : ''}`
              expect(b.visibility, what).toBe(a.visibility)
              // Special gear (stranded fractured and veiled) still comes first.
              if (a.final?.block.tier?.startsWith('stranded')) expect(b.final?.block.tier, what).toBe(a.final.block.tier)
            }
          }
        }
      }
    }
  })

  it('hides magic but keeps rares with Magic off', () => {
    const d = doc()
    applyGear(d, gearOn(d, magicOff), [])
    expect(vis(d, { ...R1, rarity: 'Magic', unidentifiedItemTier: 5 })).toBe('Hide')
    expect(vis(d, { ...ANY, rarity: 'Magic', unidentifiedItemTier: 5 })).toBe('Hide')
    expect(vis(d, { ...R1, rarity: 'Rare', unidentifiedItemTier: 5 })).toBe('Show')
    expect(vis(d, { ...R1, rarity: 'Rare', unidentifiedItemTier: 2 })).toBe('Show')
    const shown = matchItem(d, item({ ...R1, rarity: 'Rare', unidentifiedItemTier: 5 })).final!.block
    expect(shown.type).toBe(GEAR_TYPE)
  })

  it('moves a base between ranks for every tier', () => {
    const d = doc()
    applyGear(d, gearOn(d, g => { g.moves['Vaal Regalia'] = 'r1' }), [])
    // Rank 1 shows rares from tier 2; rank 3 only from 3.
    expect(vis(doc(), { ...R3, rarity: 'Rare', unidentifiedItemTier: 2 })).not.toBe('Show')
    expect(vis(d, { ...R3, rarity: 'Rare', unidentifiedItemTier: 2 })).toBe('Show')
  })

  it('hides Never bases at any drop tier', () => {
    const d = doc()
    applyGear(d, gearOn(d, g => { g.moves['Twilight Regalia'] = 'never' }), [])
    expect(vis(d, { ...R1, rarity: 'Rare', unidentifiedItemTier: 5 })).toBe('Hide')
  })

  it('lifts the build\'s bases above their rank', () => {
    const d = doc()
    applyGear(d, gearOn(d, g => { g.show.build = { magic: 0, rare: 2 } }), ['Vaal Regalia'])
    expect(vis(doc(), { ...R3, rarity: 'Rare', unidentifiedItemTier: 2 })).not.toBe('Show')
    expect(vis(d, { ...R3, rarity: 'Rare', unidentifiedItemTier: 2 })).toBe('Show')
    // Magic "same as rank": rank 3 hides a magic tier 2.
    expect(vis(d, { ...R3, rarity: 'Magic', unidentifiedItemTier: 2 })).toBe(vis(doc(), { ...R3, rarity: 'Magic', unidentifiedItemTier: 2 }))
  })

  it('shifts every line one tier stricter', () => {
    const d = doc()
    applyGear(d, gearOn(d, g => shiftAll(g, 1)), [])
    expect(vis(d, { ...R1, rarity: 'Rare', unidentifiedItemTier: 2 })).toBe('Hide')
    expect(vis(d, { ...R1, rarity: 'Rare', unidentifiedItemTier: 3 })).toBe('Show')
  })

  it('shows over-quality bases from the rank\'s line', () => {
    const d = doc()
    applyGear(d, gearOn(d, g => { g.quality.on = true; g.quality.min.r3 = 21 }), [])
    const f = { ...R3, rarity: 'Normal' as const, quality: 22 }
    expect(vis(d, f)).toBe('Show')
    expect(matchItem(d, item(f)).final!.block.tier).toBe('quality-r3')
  })

  it('writes a filter the save check accepts', () => {
    const d = doc()
    applyGear(d, gearOn(d, g => { magicOff(g); g.quality.on = true; g.moves['Vaal Regalia'] = 'never' }), ['Hubris Circlet'])
    const out = parseFilter(serializeFilter(d))
    expect(out.blocks.filter(b => b.type === GEAR_TYPE).length).toBeGreaterThan(10)
    expect(validateFilter(out).map(p => p.message)).toEqual([])
  })

  it('keeps hiding low item tiers when that preset is on', () => {
    const p = defaultPresets()
    p.lowTiers = { on: true, tier: 4 }
    const base = doc()
    applyPresetChanges(base, p)
    const d = doc()
    applyGear(d, gearOn(d), [])
    applyPresetChanges(d, p)
    const f = { ...R3, rarity: 'Rare' as const, unidentifiedItemTier: 3 }
    expect(vis(d, f)).toBe(vis(base, f))
  })

  it('reads its defaults from NeverSink\'s tier names, not lines a preset moved', () => {
    const p = defaultPresets()
    p.lowTiers = { on: true, tier: 4 }
    const d = doc()
    applyPresetChanges(d, p)
    expect(gearDefaults(d).show.any).toEqual(gearDefaults(doc()).show.any)
  })

  it('starts the any-base over-quality line where NeverSink has it', () => {
    const d = doc('1-REGULAR')
    const src = readTiered(d)!
    const g = gearDefaults(d)
    expect(g.quality.min.any).toBeLessThanOrEqual(src.quality.anyMin || 30)
  })

  it('gives magic and rare their own looks', () => {
    const d = doc()
    applyGear(d, gearOn(d, g => { g.look.magic = { border: [80, 80, 255, 255] } }), [])
    const magic = matchItem(d, item({ ...R1, rarity: 'Magic', unidentifiedItemTier: 5 }))
    const rare = matchItem(d, item({ ...R1, rarity: 'Rare', unidentifiedItemTier: 5 }))
    expect(magic.visibility).toBe('Show')
    expect(magic.final!.block).not.toBe(rare.final!.block)
    expect(magic.actions.find(a => a.key === 'SetBorderColor')?.args.slice(0, 3)).toEqual(['80', '80', '255'])
    // The game's rarity colour for the text: NeverSink's text colour is gone.
    expect(rare.actions.some(a => a.key === 'SetTextColor')).toBe(false)
    expect(rare.actions.find(a => a.key === 'SetBorderColor')?.args.slice(0, 3)).not.toEqual(['80', '80', '255'])
  })
})
