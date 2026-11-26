import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('@/web/background/IPC', () => ({ Host: { proxy: async () => new Response('{}') } }))
vi.mock('@/web/Config', () => ({
  AppConfig: () => ({ apiLatencySeconds: 2, accountName: '' }),
  poeWebApi: () => 'www.pathofexile.com'
}))

/* eslint-disable import-x/first */
import { parseClipboard } from '@/parser'
import { CORPSE_MONSTERS, isCorpse } from '@/web/woke/shared/corpses'
import { fixedPriceItem } from '@/web/woke/price-insight/ninja-first'
import { createFilters } from '@/web/price-check/filters/create-item-filters'
import { CORPSE_ITEM } from '@/web/woke/tab-bar/news-demos'
import { buildTip } from '@/web/woke/ui/tooltip/tip-content'
import type { TipCorpse } from '@/web/woke/ui/tooltip/tip-content'
import { loadGameData } from '../helpers/game-data'
/* eslint-enable import-x/first */

beforeAll(loadGameData)

const OPTS = { league: 'Mirage', merchantOnly: true, currency: null, collapseListings: 'api' as const, activateStockFilter: false, searchStatRange: 10, useEn: false, exact: false }

const items: Array<{ name: string, namespace: string, craftable?: unknown }> = readFileSync(join(__dirname, '../../public/data/en/items.ndjson'), 'utf8')
  .trim().split('\n').map(l => JSON.parse(l))

describe('corpses', () => {
  it('lists every monster the item data has a Perfect and an Imperfect corpse of', () => {
    const names = new Set(items.filter(i => i.namespace === 'ITEM' && !i.craftable).map(i => i.name))
    const inData = [...names].filter(n => n.startsWith('Perfect ') && names.has(`Imperfect ${n.slice('Perfect '.length)}`)).map(n => n.slice('Perfect '.length))
    expect([...CORPSE_MONSTERS].sort()).toEqual(inData.sort())
  })

  it('knows a corpse by any of its three names', () => {
    expect(isCorpse('Perfect Hydra')).toBe(true)
    expect(isCorpse('Imperfect Guardian Turtle')).toBe(true)
    expect(isCorpse('Meatsack')).toBe(true)
    expect(isCorpse('Perfect Jewel')).toBe(false)
    expect(isCorpse('Divine Orb')).toBe(false)
  })

  const corpseData = JSON.parse(readFileSync(join(__dirname, '../../public/data/tips/corpses.json'), 'utf8')) as Record<string, TipCorpse>

  it('has the spectre data for every corpse', () => {
    const names = [...CORPSE_MONSTERS].flatMap(m => [m, `Perfect ${m}`, `Imperfect ${m}`])
    expect(Object.keys(corpseData).sort()).toEqual(names.sort())
  })

  it('shows a corpse\'s spectre in its tooltip', () => {
    const tip = buildTip({ corpses: corpseData }, { name: 'Perfect Guardian Turtle', kind: 'item' })!
    expect(tip.base).toBe('Raise Spectre corpse')
    const lines = tip.sections.flat().map(l => l.map(p => p.text).join(''))
    expect(lines).toEqual(['Monster: Beast', "Buffs Owner with Rongokurai's Boon", 'Owner gains 5% Physical Damage Reduction', 'Casts Determination'])
    const mirage = buildTip({ corpses: corpseData }, { name: 'Perfect Conjuror of Rot', kind: 'item' })!
    expect(mirage.sections.flat().map(l => l.map(p => p.text).join(''))).toContain('Mirage areas only')
  })

  it('takes the What\'s new sample corpse to the quick card', () => {
    const item = parseClipboard(CORPSE_ITEM)._unsafeUnwrap()
    expect(item.info.refName).toBe('Perfect Hydra')
    expect(fixedPriceItem(item)).toBe(true)
  })

  // Its item level doesn't change its price (Guy, 2026-11-26).
  it('searches the trade site with the item level chip off', () => {
    const filters = createFilters(parseClipboard(CORPSE_ITEM)._unsafeUnwrap(), OPTS)
    expect(filters.itemLevel).toEqual({ value: 84, disabled: true })
  })
})
