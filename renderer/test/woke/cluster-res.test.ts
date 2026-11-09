// A cluster jewel's "also grant" resistance line gets a total Elemental
// Resistance row that matches any element, since the trade site's pseudo
// totals don't count these lines.
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { loadGameData, parseItem } from '../helpers/game-data'
import { createPresets } from '@/web/price-check/filters/create-presets'
import type { StatFilter } from '@/web/price-check/filters/interfaces'
import { createTradeRequest } from '@/web/price-check/trade/pathofexile-trade'

// vi.mock is hoisted above the imports.
vi.mock('@/web/background/IPC', () => ({ Host: { proxy: async () => new Response('{}') } }))
vi.mock('@/web/Config', () => ({
  AppConfig: () => ({ apiLatencySeconds: 2, accountName: '' }),
  poeWebApi: () => 'www.pathofexile.com'
}))

const OPTS = { league: 'Mirage', merchantOnly: true, currency: null, collapseListings: 'api' as const, activateStockFilter: false, searchStatRange: 10, useEn: false }

function cluster (suffixes: string) {
  return `Item Class: Jewels
Rarity: Rare
Eagle Spark
Small Cluster Jewel
--------
Requirements:
Level: 54
--------
Item Level: 84
--------
Adds 2 Passive Skills (enchant)
Added Small Passive Skills grant: 6% increased Mana Reservation Efficiency of Skills (enchant)
--------
{ Prefix Modifier "Vital" (Tier: 1) — Life }
Added Small Passive Skills also grant: +10(10-15) to Maximum Life
${suffixes}
--------
Place into an allocated Small, Medium or Large Jewel Socket on the Passive Skill Tree. Added passives do not interact with jewel radiuses. Right click to remove from the Socket.`
}

const LIGHTNING = `{ Suffix Modifier "of the Storm" (Tier: 1) — Elemental, Lightning, Resistance }
Added Small Passive Skills also grant: +2(2-3)% to Lightning Resistance`
const FIRE = `{ Suffix Modifier "of the Flame" (Tier: 1) — Elemental, Fire, Resistance }
Added Small Passive Skills also grant: +2(2-3)% to Fire Resistance`

function setup (text: string) {
  const item = parseItem(text)
  const presets = createPresets(item, OPTS)
  const preset = presets.presets.find(p => p.id === presets.active)!
  const stats = preset.stats.filter((s): s is StatFilter => !('group' in s && s.group))
  return { filters: preset.filters, stats, all: preset.stats }
}

describe('cluster jewel resistance', () => {
  beforeAll(loadGameData)

  it('adds a ticked total row that searches any element at the same number', () => {
    const { filters, stats, all } = setup(cluster(LIGHTNING))
    const total = stats.find(s => s.statRef === '+#% total Elemental Resistance')
    const plain = stats.find(s => s.statRef === 'Added Small Passive Skills also grant: +#% to Lightning Resistance')
    expect(total).toBeDefined()
    expect(total!.roll!.value).toBe(2)
    expect(total!.disabled).toBe(false)
    expect(plain!.disabled).toBe(true)
    expect(stats.indexOf(total!)).toBeLessThan(stats.indexOf(plain!))

    total!.roll!.min = 2
    const body = createTradeRequest(filters, all)
    const group = body.query.stats.find(g => g.type === 'count' && g.filters.length === 4)!
    expect(group).toBeDefined()
    const byId = Object.fromEntries(group.filters.map(f => [f.id, f.value?.min]))
    expect(byId['explicit.stat_1790411851']).toBe(2) // fire
    expect(byId['explicit.stat_2709692542']).toBe(2) // cold
    expect(byId['explicit.stat_2250780084']).toBe(2) // lightning
    expect(byId['explicit.stat_2669029667']).toBeCloseTo(2 / 3) // all elemental
  })

  it('counts an uncorrupted fractured line once', () => {
    const fractured = cluster(LIGHTNING.replace('{ Suffix', '{ Fractured Suffix')) + '\n--------\nFractured Item'
    const { stats } = setup(fractured)
    expect(stats.some(s => s.statRef === '+#% total Elemental Resistance' && !s.disabled)).toBe(true)
  })

  it('leaves the base-item preset alone, where a fractured line is what makes the base', () => {
    const fractured = cluster(LIGHTNING.replace('{ Suffix', '{ Fractured Suffix')) + '\n--------\nFractured Item'
    const item = parseItem(fractured)
    const presets = createPresets(item, OPTS)
    for (const preset of presets.presets.filter(p => p.id !== presets.active)) {
      expect(preset.stats.some(s => !('group' in s && s.group) && s.statRef === '+#% total Elemental Resistance')).toBe(false)
    }
  })

  it('leaves a jewel with two resistance lines alone: one line at a time can not add them up', () => {
    const { stats } = setup(cluster(`${LIGHTNING}\n${FIRE}`))
    expect(stats.some(s => s.statRef === '+#% total Elemental Resistance')).toBe(false)
  })
})
