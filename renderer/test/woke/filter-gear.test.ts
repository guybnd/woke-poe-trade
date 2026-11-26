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
    expect(matchItem(d, item(f)).final!.block.tier).toBe('quality-r3-notier')
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

  it('marks over-quality bases on top of their row\'s look', () => {
    const d = doc()
    const mark = { border: [255, 120, 220, 255] as [number, number, number, number], effect: { color: 'Pink', temp: false }, icon: { size: 0, color: 'Pink', shape: 'Star' } }
    applyGear(d, gearOn(d, g => { g.quality.on = true; g.quality.min.r1 = 21; g.look.quality = mark; g.look.rare = { fontSize: 33 } }), [])
    const f = { ...R1, rarity: 'Rare' as const, unidentifiedItemTier: 5 }
    const q = matchItem(d, item({ ...f, quality: 22 }))
    const plain = matchItem(d, item({ ...f, quality: 0 }))
    expect(q.final!.block.tier).toBe('quality-r1-t5')
    expect(plain.final!.block.tier).not.toMatch(/^quality/)
    // The size of rank 1, tier 5 (yours included), the over-quality colours...
    expect(q.actions.find(a => a.key === 'SetFontSize')?.args).toEqual(['33'])
    expect(q.actions.find(a => a.key === 'SetBackgroundColor')?.args.slice(0, 3)).toEqual(['50', '28', '0'])
    // ...with the mark on top.
    expect(q.actions.find(a => a.key === 'SetBorderColor')?.args.slice(0, 3)).toEqual(['255', '120', '220'])
    expect(q.actions.find(a => a.key === 'PlayEffect')?.args[0]).toBe('Pink')
    expect(q.actions.find(a => a.key === 'MinimapIcon')?.args).toEqual(['0', 'Pink', 'Star'])
    expect(plain.actions.find(a => a.key === 'SetBorderColor')?.args.slice(0, 3)).not.toEqual(['255', '120', '220'])
  })

  it('shows over-quality bases where the table hides their tier, in the over-quality colours by default', () => {
    const d = doc()
    applyGear(d, gearOn(d, g => { magicOff(g); g.quality.on = true; g.quality.min.r1 = 21 }), [])
    const f = { ...R1, rarity: 'Magic' as const, unidentifiedItemTier: 2 }
    expect(vis(d, f)).toBe('Hide')
    const q = matchItem(d, item({ ...f, quality: 23 }))
    expect(q.visibility).toBe('Show')
    expect(q.actions.find(a => a.key === 'SetBorderColor')?.args.slice(0, 3)).toEqual(['255', '170', '40'])
    expect(q.actions.find(a => a.key === 'SetTextColor')?.args.slice(0, 3)).toEqual(['255', '200', '80'])
    expect(q.actions.find(a => a.key === 'SetBackgroundColor')?.args.slice(0, 3)).toEqual(['50', '28', '0'])
  })

  it('keeps NeverSink\'s over-quality rules off with every row Off', () => {
    const d = doc('1-REGULAR')
    applyGear(d, gearOn(d, g => { g.quality.on = true; for (const r of ['build', 'r1', 'r2', 'r3', 'any'] as const) g.quality.min[r] = 0 }), [])
    const m = matchItem(d, item({ baseType: 'Lich\'s Circlet', itemClass: 'Helmets', rarity: 'Magic', quality: 28, unidentifiedItemTier: 2 }))
    expect(m.final?.block.type).not.toBe('crafting->qualityperfection')
  })

  it('hides Never bases with quality at any item level', () => {
    const d = doc()
    applyGear(d, gearOn(d, g => { g.quality.on = true; g.moves['Plate Vest'] = 'never' }), [])
    expect(vis(d, { baseType: 'Plate Vest', itemClass: 'Body Armours', rarity: 'Rare', quality: 30, itemLevel: 40 })).toBe('Hide')
  })

  it('a mark switched off adds nothing, leaving the row\'s own', () => {
    const d = doc()
    applyGear(d, gearOn(d, g => { g.quality.on = true; g.quality.min.r1 = 21; g.look.quality = { effect: null, border: null } }), [])
    const f = { ...R1, rarity: 'Rare' as const, unidentifiedItemTier: 5 }
    const q = matchItem(d, item({ ...f, quality: 22 }))
    const plain = matchItem(d, item({ ...f, quality: 0 }))
    expect(q.actions.find(a => a.key === 'PlayEffect')).toEqual(plain.actions.find(a => a.key === 'PlayEffect'))
    expect(q.actions.find(a => a.key === 'SetBorderColor')).toEqual(plain.actions.find(a => a.key === 'SetBorderColor'))
  })

  it('keeps only a mark in a saved config', () => {
    const g = normalizeGear({ look: { rarityText: true, magic: {}, rare: {}, quality: { fontSize: 40, border: null } } })
    expect(g.look.quality).toEqual({ border: null })
    expect(normalizeGear({}).look.quality).toEqual({})
  })

  it('shows exotic bases at any drop tier when asked', () => {
    const d = doc()
    const src = parseFilter(serializeFilter(d))
    const exotic = [...(src.blocks.find(b => b.type === 'exoticbases' && b.tier === 'exoticstiered')?.conditions.find(c => c.key === 'BaseType')?.values ?? [])]
    const magic = (b: string) => ({ baseType: b, itemClass: 'Amulets', rarity: 'Magic' as const })
    // As if you'd hidden NeverSink's exotic rules other than the tiered one.
    d.blocks.filter(b => b.type === 'exoticbases' && b.tier !== 'exoticstiered').forEach(b => { b.disabled = true })
    const talismans = exotic.filter(b => b.endsWith('Talisman'))
    const hidden = talismans.filter(b => vis(d, magic(b)) === 'Hide')
    expect(hidden.length).toBeGreaterThan(0)
    applyGear(d, gearOn(d, g => { g.show.exotic = { magic: 1, rare: 1 } }), [])
    expect(hidden.filter(b => vis(d, magic(b)) !== 'Show')).toEqual([])
  })

  it('shows a row with no drop tier when its line is None', () => {
    const d = doc()
    const f = { ...R3, rarity: 'Rare' as const }
    expect(vis(d, f)).not.toBe('Show')
    applyGear(d, gearOn(d, g => { g.show.r3.rare = 1 }), [])
    expect(vis(d, f)).toBe('Show')
    expect(vis(d, { ...R3, rarity: 'Rare', unidentifiedItemTier: 2 })).toBe('Show')
  })

  it('drops base names a share code could break the filter with', () => {
    const g = normalizeGear({ moves: { 'Vaal Regalia"\nShow\n\tBaseType "Mirror of Kalandra': 'r1', 'Vaal Regalia': 'r1' }, build: { auto: true, extra: ['a"b', 'Hubris Circlet'], removed: ['x\ny'] } } as never)
    expect(Object.keys(g.moves)).toEqual(['Vaal Regalia'])
    expect(g.build.extra).toEqual(['Hubris Circlet'])
    expect(g.build.removed).toEqual([])
  })

  it('keeps Never and ranked bases out of the unranked row\'s Always', () => {
    const d = doc()
    applyGear(d, gearOn(d, g => { g.moves['Twilight Regalia'] = 'never'; g.show.any.rare = 1; g.show.r3.rare = 4 }), [])
    expect(vis(d, { ...R1, rarity: 'Rare' })).toBe('Hide')
    expect(vis(d, { ...R3, rarity: 'Rare' })).toBe('Hide')
    expect(vis(d, { ...ANY, rarity: 'Rare' })).toBe('Show')
  })

  it('keeps a ranked base below its line out of the unranked row', () => {
    const d = doc()
    applyGear(d, gearOn(d, g => { g.show.r3.rare = 4; g.show.any.rare = 2 }), [])
    expect(vis(d, { ...R3, rarity: 'Rare', unidentifiedItemTier: 2 })).toBe('Hide')
    expect(vis(d, { ...ANY, rarity: 'Rare', unidentifiedItemTier: 2 })).toBe('Show')
  })

  it('gives a slot its own line inside a row', () => {
    const d = doc()
    applyGear(d, gearOn(d, g => { g.show.r1.rare = 4; g.slots.r1 = { jewellery: { magic: 0, rare: 2 } } }), [])
    const ring = { baseType: 'Two-Stone Ring', itemClass: 'Rings', rarity: 'Rare' as const }
    expect(vis(d, { ...ring, unidentifiedItemTier: 2 })).toBe('Show')
    expect(vis(d, { ...R1, rarity: 'Rare', unidentifiedItemTier: 3 })).toBe('Hide')
    expect(vis(d, { ...R1, rarity: 'Rare', unidentifiedItemTier: 4 })).toBe('Show')
    expect(validateFilter(parseFilter(serializeFilter(d))).map(p => p.message)).toEqual([])
  })

  it('never lets a slot with its own line fall into its row', () => {
    const at = (level: typeof LEVELS[number], change: (g: GearSettings) => void, f: Partial<ItemFacts>) => {
      const d = doc(level)
      applyGear(d, gearOn(d, change), ['Twilight Regalia'])
      return { with: vis(d, f), base: (() => { const b = doc(level); applyGear(b, gearOn(b, g => { change(g); g.slots = {} }), ['Twilight Regalia']); return b })() }
    }
    const off = { magic: 0, rare: 0 }
    // Rank 1 shows from 2, its body armours are off.
    let r = at('6-UBER-PLUS-STRICT', g => { g.show.r1 = { magic: 2, rare: 2 }; g.slots.r1 = { body: off } }, { ...R1, rarity: 'Rare', unidentifiedItemTier: 2 })
    expect(r.with).not.toBe('Show')
    // Unranked from 2, its body armours off.
    r = at('6-UBER-PLUS-STRICT', g => { g.show.any = { magic: 2, rare: 2 }; g.slots.any = { body: off } }, { ...ANY, rarity: 'Rare', unidentifiedItemTier: 3 })
    expect(r.with).not.toBe('Show')
    // Rank 1 always, its body armours from 3: with no tier they go where a
    // plain "from 3" row sends them, not to the row's Always rule.
    r = at('1-REGULAR', g => { g.show.r1 = { magic: 1, rare: 1 }; g.slots.r1 = { body: { magic: 3, rare: 3 } } }, { ...R1, rarity: 'Rare' })
    const plain = doc('1-REGULAR')
    applyGear(plain, gearOn(plain, g => { g.show.r1 = { magic: 3, rare: 3 } }), ['Twilight Regalia'])
    expect(r.with).toBe(vis(plain, { ...R1, rarity: 'Rare' }))
    // Build body armours follow their rank (off here).
    r = at('1-REGULAR', g => { g.show.build = { magic: 2, rare: 2 }; g.show.r1 = off; g.slots.build = { body: off } }, { ...R1, rarity: 'Rare', unidentifiedItemTier: 3 })
    expect(r.with).toBe('Hide')
  })

  it('takes the unranked row\'s Always slot by slot', () => {
    const d = doc('1-REGULAR')
    applyGear(d, gearOn(d, g => { g.show.any = { magic: 3, rare: 3 }; g.slots.any = { jewellery: { magic: 1, rare: 1 } } }), [])
    const base = doc('1-REGULAR')
    applyGear(base, gearOn(base, g => { g.show.any = { magic: 3, rare: 3 } }), [])
    expect(vis(d, { ...R1, rarity: 'Rare' })).toBe(vis(base, { ...R1, rarity: 'Rare' }))
  })

  it('moves slot lines with the quick setups', () => {
    const g = normalizeGear({ on: true, slots: { r1: { body: { magic: 2, rare: 3 } } } } as never)
    magicOff(g)
    expect(g.slots.r1?.body).toEqual({ magic: 0, rare: 3 })
    shiftAll(g, 1)
    expect(g.slots.r1?.body).toEqual({ magic: 0, rare: 4 })
  })

  it('writes no empty Class line when every slot of a row has its own line', () => {
    // Guy's settings on 2026-11-18: rank 1 split into all five slots.
    const d = doc()
    applyGear(d, gearOn(d, g => {
      g.show.r1 = { magic: 5, rare: 3 }
      g.slots.r1 = {
        body: { magic: 0, rare: 3 },
        armour: { magic: 0, rare: 3 },
        offhand: { magic: 0, rare: 5 },
        jewellery: { magic: 0, rare: 3 },
        weapon: { magic: 5, rare: 5 }
      }
    }), [])
    const out = parseFilter(serializeFilter(d))
    expect(out.blocks.filter(b => !b.disabled && b.conditions.some(c => c.key === 'Class' && !c.values.length))).toEqual([])
    expect(validateFilter(out).map(p => p.message)).toEqual([])
    expect(vis(d, { ...R1, rarity: 'Rare', unidentifiedItemTier: 3 })).toBe('Show')
    expect(vis(d, { ...R1, rarity: 'Magic', unidentifiedItemTier: 5 })).not.toBe('Show')
  })
})
