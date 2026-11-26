// Pick drop-counter-maps: 3.30 maps copy as plain "Map"; the drop counter
// gives each tier its own line ("Map (Tier 16)"), as poe.ninja prices them,
// and Item lookup sends such a map to the wiki's list of maps.
import { describe, it, expect, beforeAll } from 'vitest'
import { loadGameData, fixture, parseItem } from '../helpers/game-data'
import { addLine, dropName, findLine } from '@/web/woke/drop-counter/drop-counter'
import { lookupUrl } from '@/web/woke/item-lookup/lookup'
import { buildTip, tieredMapBase } from '@/web/woke/ui/tooltip/tip-content'
import type { TipPack } from '@/web/woke/ui/tooltip/tip-content'

beforeAll(loadGameData)

describe('a map in the drop counter', () => {
  it('counts a real 3.30 T16 copy on "Map (Tier 16)"', () => {
    const item = parseItem(fixture('items/map-rare-t16-330.txt'))
    expect(item.info.refName).toBe('Map')
    expect(dropName(item)).toBe('Map (Tier 16)')
  })

  it('keeps tiers apart, and leaves other items and unique maps by name', () => {
    const w = { items: [] as Array<{ type: string, name: string, drops: number[] }> }
    addLine(w, { type: 'Map', name: dropName({ info: { refName: 'Map' }, mapTier: 1, rarity: 'Normal' }) })
    addLine(w, { type: 'Map', name: dropName({ info: { refName: 'Map' }, mapTier: 16, rarity: 'Rare' }) })
    expect(w.items.map(l => l.name)).toEqual(['Map (Tier 1)', 'Map (Tier 16)'])
    expect(findLine(w.items, 'map (tier 16)')).toBe(w.items[1])
    expect(dropName({ info: { refName: 'Blighted Map' }, mapTier: 14 })).toBe('Blighted Map (Tier 14)')
    expect(dropName({ info: { refName: 'Divine Orb' } })).toBe('Divine Orb')
    expect(dropName({ info: { refName: 'Map' }, mapTier: 16, rarity: 'Unique' })).toBe('Map')
  })
})

describe('its hover tooltip', () => {
  it('reads "Map (Tier 16)" as the Map base, under its own name', () => {
    expect(tieredMapBase('Map (Tier 16)')).toBe('Map')
    expect(tieredMapBase('Blight-ravaged Map (Tier 15)')).toBe('Blight-ravaged Map')
    expect(tieredMapBase('Beach Map')).toBeNull()
    const pack = { bases: { Map: { c: 'Map', w: 1, h: 1 } } } as unknown as TipPack
    expect(buildTip(pack, { name: 'Map (Tier 16)', kind: 'item' })).toBeNull()
    expect(buildTip(pack, { name: tieredMapBase('Map (Tier 16)')!, kind: 'item' })).not.toBeNull()
  })
})

describe('Item lookup', () => {
  it('opens the wiki list of maps for a map with no area name', () => {
    expect(lookupUrl('wiki', { rawText: '', info: { refName: 'Map' } }, 'en')).toBe('https://www.poewiki.net/wiki/List_of_maps')
    expect(lookupUrl('wiki', { rawText: '', info: { refName: 'Blighted Map' } }, 'en')).toBe('https://www.poewiki.net/wiki/Blighted_Map')
  })
})
