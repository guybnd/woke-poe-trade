// The price check's Base step: price gear as its base.
import { describe, it, expect, beforeAll, vi } from 'vitest'
import { loadGameData, fixture, parseItem } from '../helpers/game-data'

vi.mock('@/web/background/IPC', () => ({ Host: { proxy: async () => new Response('{}') } }))
vi.mock('@/web/Config', () => ({
  AppConfig: () => ({ apiLatencySeconds: 2, accountName: '' }),
  poeWebApi: () => 'www.pathofexile.com'
}))

/* eslint-disable import-x/first */
import { createFilters } from '@/web/price-check/filters/create-item-filters'
import { initUiModFilters } from '@/web/price-check/filters/create-stat-filters'
import type { StatFilter } from '@/web/price-check/filters/interfaces'
import { applyBasePreset, restoreBasePreset, baseSignature } from '@/web/woke/price-insight/base-preset'
import { isValuableBasetype } from '@/web/price-check/trends/getDetailsId'
/* eslint-enable import-x/first */

const OPTS = { league: 'Mirage', merchantOnly: true, currency: null, collapseListings: 'api' as const, activateStockFilter: false, searchStatRange: 10, useEn: false, exact: false }

const HUNTER_GLOVES = `Item Class: Gloves
Rarity: Rare
Doom Grip
Crusader Gloves
--------
Quality: +23% (augmented)
Armour: 238 (augmented)
Energy Shield: 48 (augmented)
--------
Requirements:
Level: 66
Str: 51
Int: 51
--------
Sockets: R-B-B-R
--------
Item Level: 85
--------
{ Prefix Modifier "Rotund" (Tier: 3) — Life }
+64(60-69) to maximum Life
{ Suffix Modifier "of the Lightning" (Tier: 4) — Elemental, Lightning, Resistance }
+33(30-35)% to Lightning Resistance
--------
Hunter Item
`

const CORRUPTED_RING = `Item Class: Rings
Rarity: Rare
Doom Loop
Ruby Ring
--------
Requirements:
Level: 40
--------
Item Level: 84
--------
{ Implicit Modifier — Elemental, Fire, Resistance }
+25(20-30)% to Fire Resistance (implicit)
{ Corruption Implicit Modifier — Elemental, Resistance }
+12(10-12)% to all Elemental Resistances (implicit)
--------
{ Suffix Modifier "of the Thunderhead" (Tier: 4) — Elemental, Lightning, Resistance }
+33(30-35)% to Lightning Resistance
--------
Corrupted
`

function setup (text: string) {
  const item = parseItem(text)
  const filters = createFilters(item, OPTS)
  const stats = initUiModFilters(item, { searchStatRange: 10 })
  return { item, filters, stats }
}
const flat = (stats: ReturnType<typeof setup>['stats']) => stats.filter((f): f is StatFilter => !f.group)

describe('Base step', () => {
  beforeAll(loadGameData)

  it('ticks base, item level, influence and quality over 20, and unticks the mods', () => {
    const { item, filters, stats } = setup(HUNTER_GLOVES)
    expect(isValuableBasetype(item)).toBe(true)
    applyBasePreset(item, filters, stats)
    expect(filters.searchRelaxed?.disabled).toBe(true)
    expect(filters.itemLevel).toMatchObject({ value: 85, disabled: false })
    expect(filters.influences).toEqual([{ value: 'Hunter', disabled: false }])
    expect(filters.quality).toMatchObject({ value: 23, disabled: false })
    expect(flat(stats).every(f => f.disabled)).toBe(true)
  })

  it('puts the old ticks back on a second click', () => {
    const { item, filters, stats } = setup(HUNTER_GLOVES)
    const before = baseSignature(filters, stats)
    const snap = applyBasePreset(item, filters, stats)
    expect(baseSignature(filters, stats)).not.toBe(before)
    restoreBasePreset(filters, snap)
    expect(baseSignature(filters, stats)).toBe(before)
  })

  it('keeps a fractured mod ticked', () => {
    const { item, filters, stats } = setup(fixture('items/rare-fractured.txt'))
    applyBasePreset(item, filters, stats)
    const on = flat(stats).filter(f => !f.disabled)
    expect(on.length).toBeGreaterThan(0)
    expect(on.every(f => f.text.includes('Physical Damage'))).toBe(true)
  })

  it('unticks eldritch implicits below Exceptional', () => {
    const { item, filters, stats } = setup(fixture('items/rare-eldritch.txt'))
    applyBasePreset(item, filters, stats)
    expect(flat(stats).every(f => f.disabled)).toBe(true)
  })

  it('unticks a total that also counts an explicit mod', () => {
    const { item, filters, stats } = setup(CORRUPTED_RING)
    applyBasePreset(item, filters, stats)
    expect(flat(stats).filter(f => !f.disabled).map(f => f.text)).toEqual([])
  })

  it('is not offered on uniques', () => {
    expect(isValuableBasetype(parseItem(fixture('items/unique-headhunter.txt')))).toBe(false)
  })
})
