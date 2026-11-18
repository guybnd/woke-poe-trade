// Facetor's Lens: known to the parser and Ctrl+Space search, and priced by the
// experience it holds (trade site misc filter stored_experience).
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { loadGameData, parseItem } from '../helpers/game-data'
import { ITEM_BY_REF } from '@/assets/data'
import { createPresets } from '@/web/price-check/filters/create-presets'
import type { StatFilter } from '@/web/price-check/filters/interfaces'
import { createTradeRequest } from '@/web/price-check/trade/pathofexile-trade'
import { kindOfName, priceCheckInput } from '@/web/woke/ui/tooltip/item-menu-logic'

// vi.mock is hoisted above the imports.
vi.mock('@/web/background/IPC', () => ({ Host: { proxy: async () => new Response('{}') } }))
vi.mock('@/web/Config', () => ({
  AppConfig: () => ({ apiLatencySeconds: 2, accountName: '' }),
  poeWebApi: () => 'www.pathofexile.com'
}))

const OPTS = { league: 'Covens', merchantOnly: true, currency: null, collapseListings: 'api' as const, activateStockFilter: false, searchStatRange: 10, useEn: false }

const ALONE = `Item Class: Stackable Currency
Rarity: Currency
Facetor's Lens
--------
Stored Experience: 512345678
--------
Adds stored experience to a gem, up to its maximum level
--------
Right click this item then left click a gem to apply it.`

const WITH_STACK = `Item Class: Stackable Currency
Rarity: Currency
Facetor's Lens
--------
Stack Size: 1/1
Stored Experience: 1,234,567
--------
Adds stored experience to a gem, up to its maximum level
--------
Right click this item then left click a gem to apply it.`

function setup (text: string) {
  const item = parseItem(text)
  const presets = createPresets(item, OPTS)
  const preset = presets.presets.find(p => p.id === presets.active)!
  const stats = preset.stats.filter((s): s is StatFilter => !('group' in s && s.group))
  return { item, filters: preset.filters, stats, all: preset.stats }
}

describe("Facetor's Lens", () => {
  beforeAll(loadGameData)

  it('is in the item data', () => {
    expect(ITEM_BY_REF('ITEM', "Facetor's Lens")?.[0]?.name).toBe("Facetor's Lens")
  })

  it('reads the stored experience on its own line or under the stack size', () => {
    expect(parseItem(ALONE).storedExperience).toBe(512345678)
    expect(parseItem(WITH_STACK).storedExperience).toBe(1234567)
  })

  it('searches by stored experience in millions, ticked', () => {
    const { stats, filters, all } = setup(ALONE)
    const row = stats.find(s => s.tradeId[0] === 'item.stored_experience')!
    expect(row).toBeDefined()
    expect(row.disabled).toBe(false)
    expect(row.roll!.value).toBe(512)
    expect(row.text).toBe('Stored Experience: #M')
    const min = row.roll!.min as number
    expect(min).toBeLessThanOrEqual(512)

    const body = createTradeRequest(filters, all)
    const sx = body.query.filters.misc_filters!.filters.stored_experience!
    expect(sx.min).toBe(Math.floor(min * 1e6))
    expect(sx.min).toBeLessThanOrEqual(512345678)
    expect(body.query.type).toBe("Facetor's Lens")
  })

  it('sends a hand-typed minimum as whole experience', () => {
    const { stats, filters, all } = setup(ALONE)
    const row = stats.find(s => s.tradeId[0] === 'item.stored_experience')!
    row.roll!.min = 300
    row.roll!.max = 600.5
    const sx = createTradeRequest(filters, all).query.filters.misc_filters!.filters.stored_experience!
    expect(sx).toMatchObject({ min: 300000000, max: 600500000 })
  })

  it('is price checked by name from Ctrl+Space search', () => {
    const info = ITEM_BY_REF('ITEM', "Facetor's Lens")![0]
    const input = priceCheckInput({ name: "Facetor's Lens" }, kindOfName("Facetor's Lens"), info)
    expect(input).not.toBeNull()
    expect(parseItem(input!.clipboard).info.refName).toBe("Facetor's Lens")
  })

  it('leaves a lens under 10,000 experience unticked', () => {
    const { stats } = setup(ALONE.replace('512345678', '9000'))
    expect(stats.find(s => s.tradeId[0] === 'item.stored_experience')!.disabled).toBe(true)
  })
})
