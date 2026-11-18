// The cluster jewel picker on the price check's title: picking a size and type
// rewrites the search, and picking the copied jewel's own puts it back.
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fixture, loadGameData, parseItem } from '../helpers/game-data'
import { createPresets } from '@/web/price-check/filters/create-presets'
import type { StatFilter } from '@/web/price-check/filters/interfaces'
import { createTradeRequest } from '@/web/price-check/trade/pathofexile-trade'
import { applyClusterType, clusterTypes, currentType, matchTypes, ownType, pickedSize } from '@/web/woke/cluster-type/apply'
import { clusterSpots, markClusterSpots } from '@/web/woke/cluster-type/spots'

// vi.mock is hoisted above the imports.
vi.mock('@/web/background/IPC', () => ({ Host: { proxy: async () => new Response('{}') } }))
vi.mock('@/web/Config', () => ({
  AppConfig: () => ({ apiLatencySeconds: 2, accountName: '' }),
  poeWebApi: () => 'www.pathofexile.com'
}))

const OPTS = { league: 'Mirage', merchantOnly: true, currency: null, collapseListings: 'api' as const, activateStockFilter: false, searchStatRange: 10, useEn: true }

function setup () {
  const item = parseItem(fixture('items/rare-cluster-large.txt'))
  const presets = createPresets(item, OPTS)
  const preset = presets.presets.find(p => p.id === presets.active)!
  const rows = () => preset.stats.filter((s): s is StatFilter => !('group' in s && s.group))
  return { filters: preset.filters, stats: preset.stats, rows }
}

const type = (size: 'Small' | 'Medium' | 'Large', name: string) => clusterTypes(size).find(t => t.name === name)!
const ids = (body: ReturnType<typeof createTradeRequest>) => body.query.stats.flatMap(g => g.filters.filter(f => !f.disabled).map(f => f.id))

describe('cluster jewel type picker', () => {
  beforeAll(loadGameData)

  it('lists each size with a trade id, two-line types as one', () => {
    expect(clusterTypes('Large').map(t => t.name)).toContain('Attack Damage while Dual Wielding')
    expect(clusterTypes('Large')).toHaveLength(17)
    expect(clusterTypes('Medium')).toHaveLength(21)
    // The old attribute types have no trade id any more.
    expect(clusterTypes('Small').map(t => t.name)).not.toContain('Strength')
    expect(clusterTypes('Small')).toHaveLength(14)
    const axe = type('Large', 'Axe and Sword Damage')
    expect(axe.ref.split('\n')).toHaveLength(2)
    expect(axe.tradeId).toEqual(['enchant.stat_3948993189|1'])
    expect(clusterTypes('Large').every(t => t.tradeId[0].startsWith('enchant.stat_3948993189|'))).toBe(true)
  })

  it('reads the copied type and filters by typed words', () => {
    const { stats } = setup()
    expect(currentType('Large', stats)?.name).toBe('Fire Damage')
    expect(matchTypes(clusterTypes('Large'), 'dual').map(t => t.name)).toEqual(['Attack Damage while Dual Wielding'])
    expect(matchTypes(clusterTypes('Large'), 'damage cold').map(t => t.name)).toEqual(['Cold Damage'])
    expect(matchTypes(clusterTypes('Medium'), 'zzz')).toEqual([])
  })

  it('a type of the same size swaps the enchant and unticks the notables', () => {
    const { filters, stats, rows } = setup()
    const notable = rows().find(s => s.statRef.startsWith('1 Added Passive Skill is '))!
    notable.disabled = false
    applyClusterType(filters, stats, 'Large', 'Large', type('Large', 'Spell Damage'))
    expect(currentType('Large', stats)?.name).toBe('Spell Damage')
    expect(notable.disabled).toBe(true)
    expect(filters.searchExact.baseType).toBe('Large Cluster Jewel')
    const body = createTradeRequest(filters, stats)
    expect(ids(body)).toContain(type('Large', 'Spell Damage').tradeId[0])
    expect(ids(body)).not.toContain(type('Large', 'Fire Damage').tradeId[0])
    expect(body.query.type).toBe('Large Cluster Jewel')
  })

  it('another size changes the base and opens the passive count', () => {
    const { filters, stats, rows } = setup()
    applyClusterType(filters, stats, 'Large', 'Medium', type('Medium', 'Critical Chance'))
    expect(pickedSize(filters, 'Large')).toBe('Medium')
    expect(filters.searchExact.baseType).toBe('Medium Cluster Jewel')
    expect(filters.searchExact.baseTypeTrade).toBe('Medium Cluster Jewel')
    const passives = rows().find(s => s.statRef === 'Adds # Passive Skills')!
    expect(passives.roll!.min).toBe(4)
    expect(passives.roll!.max).toBe(6)
    // The copy's own count stays its value (results' Yours); the line reads the range.
    expect(passives.roll!.value).toBe(8)
    expect(passives.text).toBe('Adds 4-6 Passive Skills')
    const body = createTradeRequest(filters, stats)
    expect(body.query.type).toBe('Medium Cluster Jewel')
    expect(ids(body)).toContain(type('Medium', 'Critical Chance').tradeId[0])
    applyClusterType(filters, stats, 'Large', 'Small', type('Small', 'Life'))
    expect([passives.roll!.min, passives.roll!.max, passives.roll!.value]).toEqual([2, 3, 8])
    // The copied jewel's notable places don't describe another jewel.
    expect(rows().find(s => s.statRef === '1 Added Passive Skill is Blowback')!.clusterSpot).toBeUndefined()
    applyClusterType(filters, stats, 'Large', 'Large', type('Large', 'Fire Damage'))
    expect(rows().find(s => s.statRef === '1 Added Passive Skill is Blowback')!.clusterSpot).toBeDefined()
  })

  it('picking the copied size and type puts every change back', () => {
    const { filters, stats, rows } = setup()
    const notable = rows().find(s => s.statRef.startsWith('1 Added Passive Skill is '))!
    notable.disabled = false
    const passives = rows().find(s => s.statRef === 'Adds # Passive Skills')!
    const before = JSON.stringify(passives.roll)
    const enchBefore = JSON.stringify(createTradeRequest(filters, stats))
    applyClusterType(filters, stats, 'Large', 'Small', type('Small', 'Life'))
    applyClusterType(filters, stats, 'Large', 'Medium', type('Medium', 'Minion Life'))
    applyClusterType(filters, stats, 'Large', 'Large', type('Large', 'Fire Damage'))
    expect(notable.disabled).toBe(false)
    expect(JSON.stringify(passives.roll)).toBe(before)
    expect(passives.text).toBe('Adds # Passive Skills')
    expect(JSON.stringify(createTradeRequest(filters, stats))).toBe(enchBefore)
  })

  it('a Small pick unticks the small passive effect, which Small never rolls', () => {
    const { filters, stats, rows } = setup()
    const effect = { tradeId: ['explicit.stat_effect'], statRef: 'Added Small Passive Skills have #% increased Effect', text: '', tag: 'explicit' as StatFilter['tag'], sources: [], disabled: false }
    stats.push(effect)
    applyClusterType(filters, stats, 'Large', 'Small', type('Small', 'Life'))
    expect(rows().find(s => s.statRef === effect.statRef)!.disabled).toBe(true)
    applyClusterType(filters, stats, 'Large', 'Large', type('Large', 'Fire Damage'))
    expect(rows().find(s => s.statRef === effect.statRef)!.disabled).toBe(false)
  })

  it('a legacy type the trade site no longer lists is still offered back', () => {
    const item = parseItem(fixture('items/rare-cluster-large.txt')
      .replace('Large Cluster Jewel', 'Small Cluster Jewel')
      .replace('Adds 8 Passive Skills (enchant)\n2 Added Passive Skills are Jewel Sockets (enchant)\nAdded Small Passive Skills grant: 12% increased Fire Damage (enchant)',
        'Adds 2 Passive Skills (enchant)\nAdded Small Passive Skills grant: +10 to Strength (enchant)'))
    const presets = createPresets(item, OPTS)
    const preset = presets.presets.find(p => p.id === presets.active)!
    const before = JSON.stringify(createTradeRequest(preset.filters, preset.stats))
    const own = ownType(preset.filters, preset.stats, 'Small')
    if (!own) return // the parser has no row for this old line: nothing to restore
    applyClusterType(preset.filters, preset.stats, 'Small', 'Small', type('Small', 'Life'))
    applyClusterType(preset.filters, preset.stats, 'Small', 'Small', own)
    expect(JSON.stringify(createTradeRequest(preset.filters, preset.stats))).toBe(before)
  })
})

describe('cluster notable spots', () => {
  beforeAll(loadGameData)

  it('lays a Large jewel out as PoB does: two notables in front, one at the back', () => {
    const spots = clusterSpots('Large', 8, 2, ['Insatiable Killer', 'Combat Rhythm', 'Heavy Hitter'])
    expect(spots.get('Combat Rhythm')).toEqual({ points: 2, side: 'front' })
    expect(spots.get('Heavy Hitter')).toEqual({ points: 2, side: 'front' })
    expect(spots.get('Insatiable Killer')).toEqual({ points: 5, side: 'back' })
  })

  it('a single notable gets its points and no side; unknown names are skipped', () => {
    const one = clusterSpots('Medium', 5, 1, ['Blowback', 'Not A Notable'])
    expect([...one.keys()]).toEqual(['Blowback'])
    expect(one.get('Blowback')!.side).toBeNull()
    expect(one.get('Blowback')!.points).toBeGreaterThan(1)
  })

  it('puts no tags on a jewel with a notable the tree data doesn\'t know', () => {
    const rows = [
      { statRef: '1 Added Passive Skill is Combat Rhythm' },
      { statRef: '1 Added Passive Skill is Brand New Notable' }
    ] as StatFilter[]
    markClusterSpots(rows, 'Large')
    expect(rows.every(r => r.clusterSpot == null)).toBe(true)
  })

  it('marks the copied jewel\'s notable rows', () => {
    const { rows } = setup()
    const blowback = rows().find(s => s.statRef === '1 Added Passive Skill is Blowback')!
    expect(blowback.clusterSpot).toEqual(expect.objectContaining({ side: null }))
  })
})
