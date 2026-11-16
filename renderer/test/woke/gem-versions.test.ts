// A gem's other versions: poe.ninja rows to a sorted list, and the filters a
// clicked row searches with.
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { loadGameData, parseItem } from '../helpers/game-data'

import type { BaseType } from '@/assets/data'
import type { ItemFilters } from '@/web/price-check/filters/interfaces'
import { createPresets } from '@/web/price-check/filters/create-presets'
import { createTradeRequest } from '@/web/price-check/trade/pathofexile-trade'
import { getDetailsId } from '@/web/price-check/trends/getDetailsId'
import { gemForms, listVersions, parseVariant, versionFilters, type GemVersion } from '@/web/woke/gem-versions/versions'

vi.mock('@/web/background/IPC', () => ({ Host: { proxy: async () => new Response('{}') } }))
vi.mock('@/web/Config', () => ({
  AppConfig: () => ({ apiLatencySeconds: 2, accountName: '' }),
  poeWebApi: () => 'www.pathofexile.com'
}))

const OPTS = { league: 'Mirage', merchantOnly: true, currency: null, collapseListings: 'api' as const, activateStockFilter: false, searchStatRange: 10, useEn: false }

function gem (name: string, level: number, quality: number, corrupted: boolean) {
  return `Item Class: Skill Gems
Rarity: Gem
${name}
--------
Projectile, Spell, Cold, Duration
Level: ${level}${level >= 20 ? ' (Max)' : ''}
Cost: 20 Mana
Cast Time: 0.70 sec
${quality ? `Quality: +${quality}% (augmented)\n` : ''}--------
Requirements:
Level: 70
Int: 155
--------
Fires a projectile.
--------
Experience: 1/1
--------
Place into an item socket of the right colour to gain this skill. Right click to remove from a socket.${corrupted ? '\n--------\nCorrupted' : ''}`
}

// Real poe.ninja rows for this gem on 2026-11-16.
const ROWS = [
  { name: 'Eye of Winter of Transience', variant: '21/23c', chaos: 155 },
  { name: 'Eye of Winter of Transience', variant: '21/20c', chaos: 90 },
  { name: 'Eye of Winter of Transience', variant: '21c', chaos: 30 },
  { name: 'Eye of Winter of Transience', variant: '20/20', chaos: 25 },
  { name: 'Eye of Winter of Transience', variant: '20/20c', chaos: 20 },
  { name: 'Eye of Winter of Transience', variant: '1/20', chaos: 10 },
  { name: 'Eye of Winter of Transience', variant: '1', chaos: 3 }
]

beforeAll(loadGameData)

describe('gem versions', () => {
  it('reads poe.ninja variant text', () => {
    expect(parseVariant('21/23c')).toEqual({ level: 21, quality: 23, corrupted: true })
    expect(parseVariant('1')).toEqual({ level: 1, quality: 0, corrupted: false })
    expect(parseVariant('20c')).toEqual({ level: 20, quality: 0, corrupted: true })
    expect(parseVariant('Something')).toBeNull()
    expect(parseVariant(undefined)).toBeNull()
  })

  it('sorts by level, quality, corrupted and marks the copied gem', () => {
    const item = parseItem(gem('Eye of Winter of Transience', 21, 20, true))
    const own = getDetailsId(item)!.variant
    expect(own).toBe('21/20c')
    const list = listVersions(ROWS, [{ name: 'Vaal X', variant: '1c', chaos: 1 }], { vaal: false, variant: own })
    expect(list.map(v => (v.vaal ? 'V' : '') + v.key)).toEqual(['1', '1/20', '20/20', '20/20c', '21c', '21/20c', '21/23c', 'V1c'])
    expect(list.filter(v => v.own).map(v => v.key)).toEqual(['21/20c'])
  })

  it('searches a clicked version by level, quality and corruption', () => {
    const item = parseItem(gem('Eye of Winter of Transience', 21, 20, true))
    const presets = createPresets(item, OPTS)
    const filters = presets.presets.find(p => p.id === presets.active)!.filters
    const forms = gemForms(item)!
    const list = listVersions(ROWS, [], { vaal: false, variant: '21/20c' })
    const at = (key: string) => list.find(v => v.key === key)!

    const q2020 = createTradeRequest(versionFilters(filters, at('20/20'), forms), []).query
    expect(q2020.filters.misc_filters?.filters).toMatchObject({
      gem_level: { min: 20 }, quality: { min: 20 }, corrupted: { option: 'false' }
    })
    expect(q2020.filters.misc_filters?.filters.gem_imbued).toBeUndefined()

    const q1 = createTradeRequest(versionFilters(filters, at('1'), forms), []).query
    expect(q1.filters.misc_filters?.filters.gem_level).toBeUndefined()
    expect(q1.filters.misc_filters?.filters.quality).toBeUndefined()

    const q21 = createTradeRequest(versionFilters(filters, at('21/23c'), forms), []).query
    expect(q21.filters.misc_filters?.filters).toMatchObject({
      gem_level: { min: 21 }, quality: { min: 23 }, corrupted: { option: 'true' }, gem_imbued: { option: 'false' }
    })
    // The transfigured gem is still searched as itself.
    expect(q21.type).toEqual(createTradeRequest(filters, []).query.type)
    // The price check's own filters are left alone.
    expect(filters.gemLevel?.value).toBe(21)
  })

  it('switches between the normal and Vaal forms', () => {
    const base = { name: 'Righteous Fire', refName: 'Righteous Fire' } as unknown as BaseType
    const vaal = { name: 'Vaal Righteous Fire', refName: 'Vaal Righteous Fire', gem: { vaal: true } } as unknown as BaseType
    const forms = { base, vaal }
    const v = (vaalRow: boolean): GemVersion => ({ key: '20/20c', vaal: vaalRow, level: 20, quality: 20, corrupted: true, chaos: 60, own: false })
    const plain = { searchExact: { baseType: 'Righteous Fire', baseTypeTrade: 'Righteous Fire' }, trade: { league: 'Mirage' } } as unknown as ItemFilters

    expect(versionFilters(plain, v(true), forms).searchExact.sub).toEqual({ baseType: 'Vaal Righteous Fire', baseTypeTrade: 'Vaal Righteous Fire', disabled: false })
    expect(versionFilters(plain, v(false), forms).searchExact.sub).toBeUndefined()

    const withSub = { ...plain, searchExact: { ...plain.searchExact, sub: { baseType: 'Vaal Righteous Fire', disabled: false } } }
    expect(versionFilters(withSub, v(false), forms).searchExact.sub!.disabled).toBe(true)
    expect(versionFilters(withSub, v(true), forms).searchExact.sub!.disabled).toBe(false)

    const namedVaal = { ...plain, searchExact: { baseType: 'Vaal Righteous Fire', baseTypeTrade: 'Vaal Righteous Fire' } }
    expect(versionFilters(namedVaal, v(false), forms).searchExact).toEqual({ baseType: 'Righteous Fire', baseTypeTrade: 'Righteous Fire' })
    expect(versionFilters(namedVaal, v(true), forms).searchExact).toEqual(namedVaal.searchExact)
  })
})
