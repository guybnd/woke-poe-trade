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
