// Splitting a pseudo total into the mods behind it, so each can be searched
// (and swapped) on its own.
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fixture, loadGameData, parseItem } from '../helpers/game-data'
import { createPresets } from '@/web/price-check/filters/create-presets'
import { initUiModFilters } from '@/web/price-check/filters/create-stat-filters'
import type { FilterOrGroup, StatFilter } from '@/web/price-check/filters/interfaces'
import { exclude, fracturedOnlyIds, include, isFracturedOnly, setFracturedOnly, splitFilters, tierBound } from '@/web/woke/price-insight/pseudo-split'
import { looseBound, stashSearch } from '@/web/woke/price-insight/tier-ladder'
import { detectSwaps } from '@/web/woke/harvest-swap/detect'

// vi.mock is hoisted above the imports.
vi.mock('@/web/background/IPC', () => ({ Host: { proxy: async () => new Response('{}') } }))
vi.mock('@/web/Config', () => ({
  AppConfig: () => ({ apiLatencySeconds: 2, accountName: '' }),
  poeWebApi: () => 'www.pathofexile.com'
}))

const OPTS = { league: 'Mirage', merchantOnly: true, currency: null, collapseListings: 'api' as const, activateStockFilter: false, searchStatRange: 10, useEn: false }

describe('splitFilters', () => {
  beforeAll(loadGameData)

  it('turns total Elemental Resistance on a ring into one filter per mod, each with its own roll', () => {
    const item = parseItem(fixture('items/rare-ring.txt'))
    const presets = createPresets(item, OPTS)
    const stats = presets.presets.find(p => p.id === presets.active)!.stats
    const total = stats.find((s): s is StatFilter => !('group' in s && s.group) && s.statRef === '+#% total Elemental Resistance')!
    expect(total.sources.length).toBeGreaterThanOrEqual(2)

    const parts = splitFilters(total, stats, item, 10)
    const byRef = Object.fromEntries(parts.map(p => [`${p.tag}|${p.statRef}`, p]))
    expect(byRef['explicit|+#% to Fire Resistance']?.roll?.value).toBe(38)
    expect(byRef['explicit|+#% to Lightning Resistance']?.roll?.value).toBe(46)
    expect(byRef['explicit|+#% to all Elemental Resistances']?.roll?.value).toBe(11)
    expect(parts.every(p => !p.disabled)).toBe(true)
    // The total itself wasn't changed.
    expect(total.sources.length).toBeGreaterThanOrEqual(2)

    // Once split, the Fire mod can be swapped, to Cold only: Lightning is on the ring.
    const fire = detectSwaps(item, [...stats, ...parts]).find(c => c.filter.statRef === '+#% to Fire Resistance')
    expect(fire?.targets).toEqual(['cold'])
  })

  it('skips mods that already have their own row', () => {
    const item = parseItem(fixture('items/rare-ring.txt'))
    const presets = createPresets(item, OPTS)
    const stats = presets.presets.find(p => p.id === presets.active)!.stats
    const total = stats.find((s): s is StatFilter => !('group' in s && s.group) && s.statRef === '+#% total Elemental Resistance')!
    const first = splitFilters(total, stats, item, 10)
    expect(splitFilters(total, [...stats, ...first], item, 10)).toEqual([])
  })

  it('sums two mods of the same kind and stat into one row', () => {
    const item = parseItem(fixture('items/rare-ring.txt'))
    const presets = createPresets(item, OPTS)
    const stats = presets.presets.find(p => p.id === presets.active)!.stats
    const total = stats.find((s): s is StatFilter => !('group' in s && s.group) && s.statRef === '+#% total Elemental Resistance')!
    const fire = total.sources.find(s => s.stat.stat.ref === '+#% to Fire Resistance')!
    const doubled: StatFilter = { ...total, sources: [...total.sources, fire] }
    const parts = splitFilters(doubled, stats, item, 10)
    const fireRows = parts.filter(p => p.statRef === '+#% to Fire Resistance')
    expect(fireRows).toHaveLength(1)
    expect(fireRows[0].roll?.value).toBe(76)
  })
})

describe('row operations', () => {
  beforeAll(loadGameData)

  function fireRow () {
    const item = parseItem(fixture('items/rare-ring.txt'))
    const presets = createPresets(item, OPTS)
    const stats = presets.presets.find(p => p.id === presets.active)!.stats
    const total = stats.find((s): s is StatFilter => !('group' in s && s.group) && s.statRef === '+#% total Elemental Resistance')!
    return splitFilters(total, stats, item, 10).find(p => p.statRef === '+#% to Fire Resistance')!
  }

  it('excludes without a range, and Include puts the range and tick back', () => {
    const f = fireRow()
    f.disabled = true
    const min = f.roll!.min
    exclude(f)
    expect(f.not).toBe(true)
    expect(f.disabled).toBe(false)
    expect(f.roll!.min).toBe('')
    expect(f.roll!.max).toBe('')
    include(f)
    expect(f.not).toBeUndefined()
    expect(f.roll!.min).toBe(min)
    expect(f.disabled).toBe(true)
  })

  it("gives the tier's worst roll for a tiered mod", () => {
    // +38(36-41)% to Fire Resistance, tier 3
    expect(tierBound(fireRow())).toBe(36)
  })
})

describe('tier bound and split edge cases', () => {
  beforeAll(loadGameData)

  const rowsOf = (text: string) =>
    initUiModFilters(parseItem(text), { searchStatRange: 10 }).filter((f): f is StatFilter => !f.group)

  it('offers no tier bound on a property row (a sword: APS and crit)', () => {
    const rows = rowsOf(fixture('items/rare-sword-local-phys.txt'))
    // Attacks per Second is made of the T1 attack speed mod alone.
    const aps = rows.find(r => r.tradeId[0] === 'item.aps')!
    expect(aps.sources.length).toBe(1)
    expect(tierBound(aps)).toBeNull()
    expect(tierBound(rows.find(r => r.tradeId[0] === 'item.crit')!)).toBeNull()
  })

  it('offers no tier bound on Energy Shield when only a hybrid mod adds to it', () => {
    const text = fixture('items/rare-body-armour-es.txt')
      .replace('{ Prefix Modifier "Unassailable" (Tier: 1) — Defences, Energy Shield }\n120(110-120)% increased Energy Shield\n', '')
    const es = rowsOf(text).find(r => r.tradeId[0] === 'item.energy_shield')!
    expect(es.sources.length).toBe(1)
    expect(tierBound(es)).toBeNull()
  })

  it('scales a one-mod pseudo total by what the mod adds to it', () => {
    const ring = `Item Class: Rings
Rarity: Rare
Woe Loop
Gold Ring
--------
Item Level: 84
--------
{ Prefix Modifier "Rotund" (Tier: 3) — Life }
+64(60-69) to maximum Life
{ Suffix Modifier "of the Rainbow" (Tier: 4) — Elemental, Fire, Cold, Lightning, Resistance }
+11(11-12)% to all Elemental Resistances
`
    const total = rowsOf(ring).find(r => r.statRef === '+#% total Elemental Resistance')!
    expect(total.roll?.value).toBe(33)
    expect(tierBound(total)).toBe(33)
  })

  it('uses the uncatalysed tier on a catalysed belt', () => {
    const rows = rowsOf(fixture('items/rare-belt-catalysed.txt'))
    // +47(30-50) to Dexterity, Q20 attribute catalyst: 56 on the item, tier 36-60 catalysed
    const dex = rows.find(r => r.statRef === '+# total to Dexterity')!
    expect(dex.roll?.value).toBe(56)
    expect(tierBound(dex)).toBe(30)
  })

  it('totals on a fractured item leave its fractured mod out', () => {
    const item = parseItem(fixture('items/rare-ring-fractured.txt').replace(
      '{ Suffix Modifier "of the Volcano" (Tier: 3)',
      '{ Fractured Suffix Modifier "of the Volcano" (Tier: 3)'))
    const stats: FilterOrGroup[] = initUiModFilters(item, { searchStatRange: 10 })
    const total = stats.find((s): s is StatFilter => !s.group && s.statRef === '+#% total Elemental Resistance')!
    expect(total.sources.some(s => s.modifier.info.type === 'fractured')).toBe(false)
    expect(splitFilters(total, stats, item, 10).some(p => p.statRef === '+#% to Fire Resistance' && p.roll?.value === 38)).toBe(false)
  })
})

describe('right-click menu helpers', () => {
  beforeAll(loadGameData)

  const RING = `Item Class: Rings
Rarity: Rare
Woe Loop
Gold Ring
--------
Item Level: 84
--------
{ Prefix Modifier "Rotund" (Tier: 3) — Life }
+64(60-69) to maximum Life
{ Suffix Modifier "of Burning" (Tier: 4) — Elemental, Fire, Resistance }
-12(-12--10)% to Fire Resistance
`
  // A ring's life folds into the pseudo total; its split row is the explicit one.
  const rows = (text: string) => {
    const item = parseItem(text)
    const all = initUiModFilters(item, { searchStatRange: 10 }).filter((f): f is StatFilter => !f.group)
    const total = all.find(f => f.statRef === '+# total maximum Life')!
    return { item, rows: splitFilters(total, all, item, 10) }
  }

  it('switches any explicit mod to its fractured copy and back', () => {
    const { item, rows: r } = rows(RING)
    const life = r.find(f => f.statRef === '+# to maximum Life' && f.tag === 'explicit')!
    const was = life.tradeId
    life.disabled = true
    expect(fracturedOnlyIds(life, item)?.[0]).toMatch(/^fractured\./)
    expect(isFracturedOnly(life, item)).toBe(false)
    setFracturedOnly(life, item, true)
    expect(isFracturedOnly(life, item)).toBe(true)
    expect(life.tradeId[0]).toMatch(/^fractured\./)
    expect(life.disabled).toBe(false)
    setFracturedOnly(life, item, false)
    expect(life.tradeId).toEqual(was)
  })

  it('offers no Fractured only on an excluded row or a unique', () => {
    const { item, rows: r } = rows(RING)
    const life = r.find(f => f.statRef === '+# to maximum Life' && f.tag === 'explicit')!
    expect(fracturedOnlyIds({ ...life, not: true }, item)).toBeUndefined()
    expect(fracturedOnlyIds(life, { ...item, rarity: 'Unique' as typeof item.rarity })).toBeUndefined()
  })

  it('loosens a min by a tenth, rounding down so the roll still matches', () => {
    const { rows: r } = rows(RING)
    const life = r.find(f => f.statRef === '+# to maximum Life' && f.tag === 'explicit')!
    expect(looseBound(life)).toBe(57)
    const at = (value: number, better: 1 | -1, dp = false) => looseBound({ ...life, roll: { ...life.roll!, value, better, dp } })
    // Negative rolls loosen away from zero.
    expect(at(-12, 1)).toBe(-14)
    expect(at(-12, -1)).toBe(-10)
    // No float noise: 50 * 1.1 is not 56.
    expect(at(50, -1)).toBe(55)
    expect(at(0.7, -1, true)).toBe(0.8)
    // Nothing to loosen into, or 0 ("any").
    expect(at(1, 1)).toBeNull()
  })

  it('makes a quoted stash search from the mod text', () => {
    expect(stashSearch('+# to maximum Life')).toBe('"to maximum life"')
    expect(stashSearch('Adds # to # Physical Damage to Attacks')).toBe('"physical damage to attacks"')
    expect(stashSearch('#% increased Attack Speed')).toBe('"increased attack speed"')
    expect(stashSearch('#')).toBeNull()
  })
})
