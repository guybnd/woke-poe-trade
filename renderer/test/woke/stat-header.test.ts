// The weapon/armour stat header (Guy's pick F1): DPS split and total with
// chaos, roll bar fill, and which filters each number picks.
import { describe, it, expect, beforeAll } from 'vitest'
import { loadGameData, fixture, parseItem } from '../helpers/game-data'
import { initUiModFilters } from '@/web/price-check/filters/create-stat-filters'
import type { StatFilter } from '@/web/price-check/filters/interfaces'
import { rollFill, weaponDps } from '@/web/woke/price-insight/weapon-dps'
import { pickFixed, buildStatHeader, headerFilters, notePick, pickOrder } from '@/web/woke/price-insight/stat-header'

function load (name: string) {
  const item = parseItem(fixture(`items/${name}`))
  const stats = initUiModFilters(item, { searchStatRange: 10 })
  const prop = (id: string) => stats.find((f): f is StatFilter => !f.group && f.tradeId[0] === id)
  return { item, stats, prop }
}

describe('rollFill', () => {
  it('is the share of the way from min to max', () => {
    expect(rollFill({ value: 5, min: 0, max: 10 })).toBe(0.5)
    expect(rollFill({ value: 10, min: 0, max: 10 })).toBe(1)
    expect(rollFill({ value: 0, min: 0, max: 10 })).toBe(0)
  })
  it('is null (grey bar) when nothing can roll it', () => {
    expect(rollFill({ value: 1.6, min: 1.6, max: 1.6 })).toBeNull()
  })
  it('clamps values outside the range', () => {
    expect(rollFill({ value: 12, min: 0, max: 10 })).toBe(1)
    expect(rollFill({ value: -1, min: 0, max: 10 })).toBe(0)
  })
})

describe('weaponDps', () => {
  beforeAll(loadGameData)

  it('splits ele and chaos and counts chaos in the total', () => {
    const { item } = load('rare-sword-ele-chaos.txt')
    const d = weaponDps(item)
    expect(d.aps.value).toBeCloseTo(1.6)
    // Fire 105.5 + lightning 116 average, times 1.6 APS.
    expect(d.ele.value).toBeCloseTo((105.5 + 116) * 1.6, 1)
    expect(d.chaos.value).toBeCloseTo(119 * 1.6, 1)
    expect(d.total.value).toBeCloseTo(d.phys.value + d.ele.value + d.chaos.value, 6)
    expect(d.total.min).toBeCloseTo(d.phys.min + d.ele.min + d.chaos.min, 6)
    expect(d.total.max).toBeCloseTo(d.phys.max + d.ele.max + d.chaos.max, 6)
    // The chaos mod's roll range (80-90 to 145-160, avg 112.5..125) times APS.
    expect(d.chaos.min).toBeCloseTo(112.5 * 1.6, 1)
    expect(d.chaos.max).toBeCloseTo(125 * 1.6, 1)
    expect(d.split.fire).toBeCloseTo(105.5 * 1.6, 1)
    expect(d.split.lightning).toBeCloseTo(116 * 1.6, 1)
    expect(d.split.cold).toBe(0)
    expect(d.split.ele).toBeCloseTo(0, 6)
    expect(d.split.chaos).toBeCloseTo(d.chaos.value, 6)
  })

  it('has no chaos on a weapon without a chaos mod', () => {
    const { item } = load('rare-sword-local-phys.txt')
    const d = weaponDps(item)
    expect(d.chaos).toEqual({ value: 0, min: 0, max: 0 })
    expect(d.total.value).toBeCloseTo(d.phys.value, 6)
  })
})

describe('Total DPS filter', () => {
  beforeAll(loadGameData)

  it('includes chaos in the searched value and range, as the trade site does', () => {
    const { item, prop } = load('rare-sword-ele-chaos.txt')
    const total = prop('item.total_dps')!
    const d = weaponDps(item)
    expect(total).toBeDefined()
    expect(Math.abs(total.roll!.value - d.total.value)).toBeLessThan(1)
    expect(total.roll!.value).toBeGreaterThan(d.phys.value + d.ele.value + 100)
    expect(total.disabled).toBe(false)
  })

  it('keeps the old picks: ele picked, phys hidden by its small share', () => {
    const { prop } = load('rare-sword-ele-chaos.txt')
    expect(prop('item.elemental_dps')!.disabled).toBe(false)
    const pdps = prop('item.physical_dps')!
    expect(pdps.disabled).toBe(true)
    expect(pdps.hidden).toBe('filters.hide_phys_dps')
  })
})

describe('buildStatHeader', () => {
  beforeAll(loadGameData)

  it('weapon: big DPS on Total DPS, legend phys/ele/chaos, chips aps/crit', () => {
    const { item, stats, prop } = load('rare-sword-ele-chaos.txt')
    const m = buildStatHeader(item, stats)!
    expect(m.kind).toBe('weapon')
    expect(m.bigs).toHaveLength(1)
    expect(m.bigs[0].filter).toBe(prop('item.total_dps'))
    expect(m.legend!.map(c => c.key)).toEqual(['phys', 'ele', 'chaos'])
    expect(m.legend![0].filter).toBe(prop('item.physical_dps'))
    expect(m.legend![1].filter).toBe(prop('item.elemental_dps'))
    // No chaos DPS trade filter: the chaos entry is the mod's own row.
    const chaos = m.legend![2].filter!
    expect(chaos.statRef).toBe('Adds # to # Chaos Damage')
    expect(chaos.tradeId[0]).toMatch(/^explicit\./)
    expect(m.chips.map(c => c.key)).toEqual(['aps', 'crit'])
    // No attack speed mod: grey bar.
    expect(m.chips[0].fill).toBeNull()
    expect(m.split!.map(s => s.key)).toEqual(['phys', 'fire', 'lightning', 'chaos'])
  })

  it('header owns the property filters but not the chaos mod line', () => {
    const { item, stats, prop } = load('rare-sword-ele-chaos.txt')
    const owned = headerFilters(buildStatHeader(item, stats))
    expect(owned.has(prop('item.total_dps')!)).toBe(true)
    expect(owned.has(prop('item.aps')!)).toBe(true)
    expect([...owned].some(f => f.statRef === 'Adds # to # Chaos Damage')).toBe(false)
  })

  it('phys-only weapon: the big number picks Physical DPS', () => {
    const { item, stats, prop } = load('rare-sword-local-phys.txt')
    const m = buildStatHeader(item, stats)!
    expect(prop('item.total_dps')).toBeUndefined()
    expect(m.bigs[0].filter).toBe(prop('item.physical_dps'))
    // Its hover names what it really searches.
    expect(m.bigs[0].name).toBe('Physical DPS')
    expect(m.legend!.map(c => c.key)).toEqual(['phys'])
    expect(m.legend![0].fill).not.toBeNull()
  })

  it('armour: one big number per defence, base percentile chip', () => {
    const { item, stats, prop } = load('rare-body-armour-ar-ev.txt')
    const m = buildStatHeader(item, stats)!
    expect(m.kind).toBe('armour')
    expect(m.bigs.map(c => c.key)).toEqual(['armour', 'evasion'])
    expect(m.bigs[0].filter).toBe(prop('item.armour'))
    expect(m.bigs[0].fill).not.toBeNull()
    if (prop('item.base_percentile')) expect(m.chips.map(c => c.key)).toContain('base')
  })

  it("a unique's fixed Armour stays clickable and searches at least its value", () => {
    const { item, stats, prop } = load('unique-kaoms-heart.txt')
    expect(prop('item.armour')?.hidden).toBe('hide_variable_by_base_percentile_only')
    const m = buildStatHeader(item, stats)!
    const armour = m.bigs.find(c => c.key === 'armour')!
    // A corruption or enchant can still raise it (Guy's call).
    expect(armour.filter).toBe(prop('item.armour'))
    expect(armour.fixed).toBe(true)
    pickFixed(armour.filter!)
    expect(armour.filter!.hidden).toBeUndefined()
    expect(armour.filter!.roll?.min).not.toBeUndefined()
    expect(m.chips.find(c => c.key === 'base')?.filter).toBe(prop('item.base_percentile'))
  })

  // Triumphant Lamellar's base rolls 380-437 Armour, 477-549 Evasion. Base 420 / 500 here:
  // (420 + 92) * 2.05 = 1049, (500 + 85) * 2.05 = 1199, at 0% quality.
  const LAMELLAR = fixture('items/rare-body-armour-ar-ev.txt')
    .replace('Armour: 1650', 'Armour: 1049')
    .replace('Evasion Rating: 1820', 'Evasion Rating: 1199')
  function lamellar (text = LAMELLAR) {
    const item = parseItem(text)
    return { item, m: buildStatHeader(item, initUiModFilters(item, { searchStatRange: 10 }))! }
  }

  it('armour: each defence shows its max with the base and mods at their top rolls, at 20% quality', () => {
    const { m } = lamellar()
    const ar = m.bigs.find(c => c.key === 'armour')!
    // Base 437, +# to Armour tops at 100, the hybrid % at 110.
    expect(ar.max).toBe(String(Math.ceil((437 + 100) * (1 + 110 / 100) * 1.2)))
    expect(Number(ar.max)).toBeGreaterThan(Number(ar.text))
    // The lowest: base 380, +81 to Armour, 101%.
    expect(ar.min).toBe(String(Math.floor((380 + 81) * 2.01 * 1.2)))
    expect(ar.atMax).toBe(false)
    expect(ar.maxNote).toContain('the base and these mods at their top rolls')
    expect(ar.maxNote).toContain('at 20% quality')
    expect(m.bigs.find(c => c.key === 'evasion')!.max).toBe(String(Math.ceil((549 + 87) * 2.1 * 1.2)))
    expect(m.chips.find(c => c.key === 'base')?.max).toBeUndefined()
  })

  it('armour: an item over 20% quality is counted at its own quality', () => {
    // (420 + 92) * (1 + 1.05 + 0.28) = 1192, (500 + 85) * 2.33 = 1363.
    const { m } = lamellar(LAMELLAR
      .replace('Armour: 1049', 'Quality: +28% (augmented)\nArmour: 1192')
      .replace('Evasion Rating: 1199', 'Evasion Rating: 1363'))
    const ar = m.bigs.find(c => c.key === 'armour')!
    expect(ar.max).toBe(String(Math.ceil((437 + 100) * 2.1 * 1.28)))
    expect(ar.maxNote).toContain('at 28% quality')
  })

  it('armour: a perfect roll reads MAX', () => {
    // Base 437 and every mod at its top: (437 + 100) * 2.10 = 1127, (549 + 87) * 2.10 = 1335.
    const { m } = lamellar(LAMELLAR
      .replace('Armour: 1049', 'Armour: 1127').replace('Evasion Rating: 1199', 'Evasion Rating: 1335')
      .replace('+92(81-100)', '+100(81-100)').replace('+85(73-87)', '+87(73-87)').replace('105(101-110)', '110(101-110)'))
    for (const c of m.bigs) expect(c.atMax).toBe(true)
  })

  it('armour: no max when the number is over what its base and mods allow', () => {
    // The plain fixture's 1650 Armour can't come from this base and these mods.
    const { item, stats } = load('rare-body-armour-ar-ev.txt')
    const m = buildStatHeader(item, stats)!
    expect(m.bigs.find(c => c.key === 'armour')!.max).toBeUndefined()
  })

  it('weapon: DPS and its rolling parts show a max; chaos from its mod range', () => {
    const { item, stats } = load('rare-sword-ele-chaos.txt')
    const m = buildStatHeader(item, stats)!
    const d = weaponDps(item)
    expect(m.legend!.find(c => c.key === 'chaos')!.max).toBe(d.chaos.max.toFixed(0))
    expect(m.legend!.find(c => c.key === 'ele')!.max).toBe('379')
    expect(m.bigs[0].max).toBe('706')
    expect(m.bigs[0].min).toBe('634')
    expect(m.chips.find(c => c.key === 'crit')!.max).toBe('7.4%')
    // Its crit mod rolled 34 of 30-34.
    expect(m.chips.find(c => c.key === 'crit')!.atMax).toBe(true)
    expect(m.bigs[0].atMax).toBe(false)
    // Nothing rolls this sword's phys or aps: no max.
    expect(m.legend!.find(c => c.key === 'phys')!.max).toBeUndefined()
    expect(m.chips.find(c => c.key === 'aps')!.max).toBeUndefined()
  })

  it("no max on a unique's fixed number", () => {
    const { item, stats } = load('unique-kaoms-heart.txt')
    const m = buildStatHeader(item, stats)!
    expect(m.bigs.find(c => c.key === 'armour')!.max).toBeUndefined()
  })

  it('no max when the copy has no roll ranges (a plain paste)', () => {
    const text = LAMELLAR
      .replace(/\(\d+-\d+\)/g, '')
      .replace(/ \(Tier: \d+\)/g, '')
    const item = parseItem(text)
    const m = buildStatHeader(item, initUiModFilters(item, { searchStatRange: 10 }))!
    expect(m.bigs.length).toBeGreaterThan(0)
    for (const c of m.bigs) expect(c.max).toBeUndefined()
  })

  it('no header for an item without property filters', () => {
    const { item, stats } = load('rare-ring.txt')
    expect(buildStatHeader(item, stats)).toBeNull()
  })
})

describe('pick order', () => {
  beforeAll(loadGameData)

  it('counts header clicks in order; default picks are 0', () => {
    const { prop } = load('rare-sword-ele-chaos.txt')
    const a = prop('item.aps')!
    const c = prop('item.crit')!
    expect(pickOrder(a)).toBe(0)
    notePick(c)
    notePick(a)
    expect(pickOrder(c)).toBeLessThan(pickOrder(a))
  })
})
