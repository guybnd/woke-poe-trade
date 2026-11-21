// Valdo maps (Valdo's Puzzle Box): a rare "Valdo Map" with a Reward line,
// Unmodifiable and Foil. The trade search has its reward and one Void filter,
// set Any / Void / No void on the Valdo strip (ValdoStrip.vue).
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fixture, loadGameData, parseItem } from '../helpers/game-data'

vi.mock('@/web/background/IPC', () => ({ Host: { proxy: async () => new Response('{}') } }))
vi.mock('@/web/Config', () => ({
  AppConfig: () => ({ apiLatencySeconds: 2, accountName: '' }),
  poeWebApi: () => 'www.pathofexile.com'
}))

/* eslint-disable import-x/first */
import { createPresets } from '@/web/price-check/filters/create-presets'
import { createTradeRequest } from '@/web/price-check/trade/pathofexile-trade'
import type { StatFilter } from '@/web/price-check/filters/interfaces'
/* eslint-enable import-x/first */

const OPTS = { league: 'Mirage', merchantOnly: true, currency: null, collapseListings: 'api' as const, activateStockFilter: false, searchStatRange: 10, useEn: false }
const VOID = 'explicit.stat_1095765106'

beforeAll(loadGameData)

function check (file: string) {
  const item = parseItem(fixture(file))
  const { presets, active } = createPresets(item, OPTS)
  const preset = presets.find(p => p.id === active)!
  return { item, ...preset, void: preset.stats.filter((s): s is StatFilter => !s.group && !!s.valdoVoid) }
}

describe('Valdo map', () => {
  it('reads the reward, area and numbers', () => {
    const item = parseItem(fixture('items/map-valdo-void.txt'))
    expect(item.info.refName).toBe('Valdo Map')
    expect(item.mapCompletionReward?.name).toBe('Nimis')
    expect(item.mapArea?.name).toBe('Moon Temple')
    expect(item.isUnmodifiable).toBe(true)
    expect(item.areaPackSize).toBe(23)
  })

  it('a void map searches void maps with its reward, and no quality', () => {
    const { filters, stats, void: v } = check('items/map-valdo-void.txt')
    expect(v).toHaveLength(1)
    expect(v[0].disabled).toBe(false)
    expect(v[0].not).toBeUndefined()
    expect(filters.quality).toBeUndefined()
    const q = createTradeRequest(filters, stats).query
    expect(q.type).toBe('Valdo Map')
    expect(q.filters.map_filters?.filters.map_completion_reward?.option).toBe('Nimis')
    const group = q.stats.find(g => g.filters.some(f => f.id === VOID))!
    expect(group.type).not.toBe('not')
  })

  it('a map without the Void mod searches maps without it', () => {
    const { filters, stats, void: v } = check('items/map-valdo.txt')
    expect(v).toHaveLength(1)
    expect(v[0].not).toBe(true)
    const q = createTradeRequest(filters, stats).query
    expect(q.stats.find(g => g.filters.some(f => f.id === VOID))!.type).toBe('not')
  })

  it('Any reward and Any void leave both out', () => {
    const { filters, stats, void: v } = check('items/map-valdo-void.txt')
    filters.mapCompletionReward!.disabled = true
    v[0].disabled = true
    const q = createTradeRequest(filters, stats).query
    expect(q.filters.map_filters?.filters.map_completion_reward).toBeUndefined()
    expect(q.stats.some(g => g.filters.some(f => f.id === VOID && !f.disabled))).toBe(false)
  })
})
