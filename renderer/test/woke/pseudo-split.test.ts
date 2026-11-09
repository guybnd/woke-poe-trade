// Splitting a pseudo total into the mods behind it, so each can be searched
// (and swapped) on its own.
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fixture, loadGameData, parseItem } from '../helpers/game-data'
import { createPresets } from '@/web/price-check/filters/create-presets'
import type { StatFilter } from '@/web/price-check/filters/interfaces'
import { splitFilters } from '@/web/woke/price-insight/pseudo-split'
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
})
