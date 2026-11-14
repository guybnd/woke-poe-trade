// 3.30 replaced the map Item Quantity line with Atlas Drops, old maps too.
// Fixture: a real 3.30 T16 copy from the trade site's item text.
import { describe, it, expect, beforeAll } from 'vitest'
import { loadGameData, fixture, parseItem } from '../helpers/game-data'
import { createExactStatFilters } from '@/web/price-check/filters/create-stat-filters'
import { mapProps } from '@/web/price-check/filters/pseudo/maps'
import type { StatFilter } from '@/web/price-check/filters/interfaces'
import { renameQuantityStarter, starterEntries } from '@/web/woke/regex-library/widget'
import type { RegexEntry } from '@/web/woke/regex-library/widget'

beforeAll(loadGameData)

describe('3.30 Atlas Drops', () => {
  it('reads the Atlas Drops line as a map property, not an unknown mod', () => {
    const item = parseItem(fixture('items/map-rare-t16-330.txt'))
    expect(item.areaAtlasDrops).toBe(72)
    expect(item.areaItemQuantity).toBeUndefined()
    expect(item.areaItemRarity).toBe(43)
    expect(item.areaPackSize).toBe(28)
    expect(item.unknownModifiers.map(m => m.text).join('\n')).not.toMatch(/Atlas Drops/)
  })

  it('offers an Atlas Drops filter, off until the trade site indexes it', () => {
    const item = parseItem(fixture('items/map-rare-t16-330.txt'))
    const filters: StatFilter[] = []
    mapProps(false, { item, filters, searchInRange: 10, statsByType: item.statsByType } as never)
    const drops = filters.find(f => f.tradeId[0] === 'item.map_atlas_drops')!
    expect(drops.roll?.value).toBe(72)
    expect(drops.disabled).toBe(true)
    expect(filters.find(f => f.tradeId[0] === 'item.map_item_quantity')).toBeUndefined()
    // The rest of the price check still builds.
    expect(() => createExactStatFilters(item, item.statsByType, { searchStatRange: 10, mode: 'props' })).not.toThrow()
  })

  it('moves the old quantity starter regex to the Atlas Drops line', () => {
    const old: RegexEntry = { ...starterEntries()[0], name: 'Quantity 80%+', text: '"tity: \\+([89]\\d|\\d{3})%"', notes: 'Item Quantity of 80% or more.' }
    const edited: RegexEntry = { ...old, text: '"tity: \\+([5-9]\\d|\\d{3})%"' }
    const widgets = [{ wmType: 'woke-regex-library', entries: [old, edited] }]
    renameQuantityStarter(widgets)
    renameQuantityStarter(widgets)
    expect(old).toMatchObject({ name: 'Atlas Drops 80%+', text: '"ops: \\+([89]\\d|\\d{3})%"' })
    expect(edited.text).toBe('"ops: \\+([5-9]\\d|\\d{3})%"')
    const built: RegexEntry = { ...old, text: '"!eflec" "tity: .([89]\\d|\\d{3})%"' }
    const gear: RegexEntry = { ...old, category: 'Gear', text: '"tity: \\+"' }
    renameQuantityStarter([{ wmType: 'woke-regex-library', entries: [built, gear] }])
    expect(built.text).toBe('"!eflec" "ops: .([89]\\d|\\d{3})%"')
    expect(gear.text).toBe('"tity: \\+"')
    expect(new RegExp(old.text.slice(1, -1), 'i').test(fixture('items/map-rare-t16-330.txt'))).toBe(false)
    expect(new RegExp(old.text.slice(1, -1), 'i').test('Atlas Drops: +85% (augmented)')).toBe(true)
  })
})
