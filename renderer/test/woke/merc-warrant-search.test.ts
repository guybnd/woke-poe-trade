// A warrant copied from the game turns into support ladders, and Measure's
// searches ask the trade site for the skill alone and the skill with one support.
import { it, expect, beforeAll, vi } from 'vitest'
import { parseClipboard } from '@/parser'
import { loadGameData } from '../helpers/game-data'
import { createPresets } from '@/web/price-check/filters/create-presets'
import { createTradeRequest } from '@/web/price-check/trade/pathofexile-trade'
import { skillLadders, measureStats, supportKey } from '@/web/woke/merc/ladder'

vi.mock('@/web/background/IPC', () => ({ Host: { proxy: async () => new Response('{}') } }))
vi.mock('@/web/Config', () => ({ AppConfig: () => ({ apiLatencySeconds: 2, accountName: '' }), poeWebApi: () => 'www.pathofexile.com' }))

beforeAll(loadGameData)

// Written from the parser's format, not copied from the game (no real copy yet).
export const WARRANT = ['Item Class: Mercenary Warrants', 'Rarity: Normal', 'Mercenary Warrant', '--------',
  'Mercenary Level: 84', 'Build: Bastion', '--------',
  'Shield Crush', 'Greater Pulverise', 'Greater Fortify', 'Brutality', 'Faster Attacks', '--------',
  'Determination', '--------', 'Dash'].join('\n')

type Q = { type: string, disabled?: boolean, filters: Array<{ id: string, disabled: boolean }> }
const on = (q: Q[], type: string) => q.filter(g => g.type === type && !g.disabled).flatMap(g => g.filters.filter(f => !f.disabled).map(f => f.id))

it('measures the skill alone and the skill with one support', () => {
  const r = parseClipboard(WARRANT)
  expect(r.isOk()).toBe(true)
  const item = r._unsafeUnwrap()
  const p = createPresets(item, { league: 'Mirage', merchantOnly: true, currency: null, collapseListings: 'api', activateStockFilter: false, searchStatRange: 10, useEn: false })
  const { stats, filters } = p.presets[0]
  const [l] = skillLadders(stats)
  expect(l.skillRef).toBe('Shield Crush')
  expect(l.supports.map(supportKey)).toEqual(['Pulverise#3', 'Greater Fortify#3', 'Brutality#2', 'Faster Attacks#2'])

  const bare = createTradeRequest(filters, measureStats(stats, 'Shield Crush', null)).query.stats as Q[]
  expect(on(bare, 'mercenary')).toEqual([])
  expect(on(bare, 'not')).toEqual([])
  expect(on(bare, 'and')).toEqual(['mercenary.skill_21201'])

  const withOne = createTradeRequest(filters, measureStats(stats, 'Shield Crush', 'Pulverise')).query.stats as Q[]
  // Greater Pulverise searches only the Greater tier.
  expect(on(withOne, 'mercenary')).toEqual(['mercenary.skill_21201', 'mercenary.support_64416'])
})
