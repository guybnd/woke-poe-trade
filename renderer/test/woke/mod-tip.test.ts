// A price check mod row's hover tooltip: its tiers with item levels and the
// bench's craft of the same line (tooltip audit G5/I1).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { loadGameData, parseItem } from '../helpers/game-data'
import { initUiModFilters } from '@/web/price-check/filters/create-stat-filters'
import type { StatFilter } from '@/web/price-check/filters/interfaces'
import { benchCraft, modTipFor } from '@/web/woke/price-insight/mod-tip'

vi.mock('@/web/background/IPC', () => ({ Host: { proxy: async () => new Response('{}'), onEvent: () => {}, sendEvent: () => {} } }))
vi.mock('@/web/Config', () => ({ AppConfig: () => ({}), saveConfig: () => {}, saveConfigQuietly: () => {}, poeWebApi: () => 'www.pathofexile.com' }))

const file = (name: string) => readFileSync(join(__dirname, '../../public/data', name), 'utf8')

const RING = `Item Class: Rings
Rarity: Rare
Woe Loop
Gold Ring
--------
Item Level: 84
--------
{ Prefix Modifier "Rotund" (Tier: 4) — Life }
+64(55-69) to maximum Life
`

describe('mod row tooltip', () => {
  beforeAll(loadGameData)

  it('lists the tiers with the item level each needs, the row\'s own lit', async () => {
    const real = globalThis.fetch
    vi.stubGlobal('fetch', async (url: string) => new Response(file(String(url).replace(/^.*data\//, ''))))
    const item = parseItem(RING)
    const total = initUiModFilters(item, { searchStatRange: 10 }).filter((f): f is StatFilter => !f.group).find(f => f.statRef === '+# total maximum Life')!
    const tip = (await modTipFor(item, total))!
    vi.stubGlobal('fetch', real)
    expect(tip.kind).toBe('mod')
    expect(tip.title).toBe('# to maximum Life')
    expect(tip.sub).toBe('Prefix · Ring')
    expect(tip.mine).toBe(4)
    expect(tip.steps[3]).toMatchObject({ min: 55, max: 69 })
    expect(tip.steps[0].level).toBeGreaterThan(tip.steps[3].level)
    expect(tip.itemLevel).toBe(84)
    expect(tip.bench?.text).toMatch(/to maximum Life$/)
  })

  it('picks the best bench tier the item class can take', () => {
    const data = JSON.parse(file('craft-data.json'))
    const ring = benchCraft(data, 'Ring', '+# to maximum Life')!
    expect(ring.text).toBe('+(41–55) to maximum Life')
    expect(ring.cost).toBe('2 Orb of Alchemy')
    expect(ring.where).toBe('unlocked in The Feeding Trough')
    expect(benchCraft(data, 'Ring', 'Some line no bench makes #')).toBeUndefined()
    expect(benchCraft(data, undefined, '+# to maximum Life')).toBeUndefined()
  })
})
