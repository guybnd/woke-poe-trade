// NeverSink's tab is retired (M7, WOKEPOET-720): the Loot and Equipment tabs are
// on for every filter. New filters and new profiles start with it on; an existing
// config gets it switched on once (Config.ts, woke.lootOnByDefault), for the
// profile in use and every stored one.
import { describe, expect, it } from 'vitest'
import { levelsOn, lootOnForAll, normalizeLootFilterWidget, nsDownload, seedLootFilterWidget } from '@/web/woke/loot-filter/widget'
import { LEVEL_IDS, LEVEL_NAMES } from '@/web/woke/loot-filter/strictness'
import { levelOf } from '@/web/woke/loot-filter/currency-weights'
import type { LootFilterWidget } from '@/web/woke/loot-filter/widget'
import { blankProfileData } from '@/web/woke/loot-filter/profiles'
import { normalizePresets } from '@/web/woke/loot-filter/presets'

describe('Loot tab on by default', () => {
  it('a new filter starts with Loot on', () => {
    expect(seedLootFilterWidget(1).presets.currency.on).toBe(true)
    expect(seedLootFilterWidget(1).presets.weights.on).toBe(true)
  })

  it('a new profile starts with Loot on', () => {
    const w = seedLootFilterWidget(1)
    w.presets.currency.on = false
    expect(normalizePresets(blankProfileData(w).presets).currency.on).toBe(true)
    expect(normalizePresets(blankProfileData(w).presets).weights.on).toBe(true)
  })

  it('switches Loot on for the profile in use and every stored one, keeping their settings', () => {
    const w = seedLootFilterWidget(1)
    w.presets.currency.on = false
    w.presets.currency.line = 3
    w.profiles = [
      { id: 1, name: 'Mine' },
      { id: 2, name: 'Bossing', data: { presets: { ...w.presets, currency: { ...w.presets.currency, on: false, line: 7 } } } },
      { id: 3, name: 'Old', data: {} }
    ] as LootFilterWidget['profiles']
    lootOnForAll(w)
    expect(w.presets.currency.on).toBe(true)
    expect(w.presets.currency.line).toBe(3)
    expect(w.presets.weights.on).toBe(true)
    const two = normalizePresets(w.profiles[1].data!.presets).currency
    expect(two.on).toBe(true)
    expect(two.line).toBe(7)
    expect(normalizePresets(w.profiles[2].data!.presets).currency.on).toBe(true)
  })

  it('works on a saved widget with no presets yet', () => {
    const raw = { wmId: 1, wmType: 'woke-loot-filter' } as unknown as LootFilterWidget
    lootOnForAll(raw)
    normalizeLootFilterWidget(raw)
    expect(raw.presets.currency.on).toBe(true)
    expect(raw.presets.weights.on).toBe(true)
  })
})

// Guy's full cut (2026-11-28): our own filter is the default source.
describe('own filter by default', () => {
  it('a new filter starts on our own base, with strictness and no download', () => {
    const w = seedLootFilterWidget(1)
    expect(w.ownBase).toBe(true)
    expect(levelsOn(w)).toBe(true)
    expect(nsDownload(w)).toBe(false)
  })

  it('NeverSink from GitHub downloads only while our base is off', () => {
    expect(nsDownload({ neversink: { on: true } })).toBe(true)
    expect(nsDownload({ neversink: { on: true }, ownBase: true })).toBe(false)
    expect(levelsOn({ neversink: { on: false } })).toBe(false)
  })

  it('every level has its #TYPE header', () => {
    expect(LEVEL_IDS.map(levelOf)).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(LEVEL_IDS).toHaveLength(LEVEL_NAMES.length)
  })
})
