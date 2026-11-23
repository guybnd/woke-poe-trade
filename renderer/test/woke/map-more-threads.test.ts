// 3.30 renamed the map "More Scarabs" line to "More Threads" (upstream fbebcedd).
// The text is a 3.30 T16 map copy with a More Threads line added.
import { describe, it, expect, beforeAll } from 'vitest'
import { loadGameData, parseItem } from '../helpers/game-data'
import { mapProps } from '@/web/price-check/filters/pseudo/maps'
import type { StatFilter } from '@/web/price-check/filters/interfaces'
import { buildMapRegex } from '@/web/woke/map-mods/regex'

beforeAll(loadGameData)

const MAP_330 = `Item Class: Maps
Rarity: Rare
Damnation Trek
Map (Tier 16)
--------
Atlas Drops: +72% (augmented)
Item Rarity: +43% (augmented)
Monster Pack Size: +28% (augmented)
More Threads: +71% (augmented)
--------
Item Level: 83
--------
Monster Level: 83
--------
Monsters Poison on Hit
Monsters have 50% increased Accuracy Rating
--------
Travel to a Map of this tier or lower by using this in a personal Map Device. Maps can only be used once.
--------
Corrupted`

describe('3.30 More Threads', () => {
  it('reads the More Threads line as a map property, not an unknown mod', () => {
    const item = parseItem(MAP_330)
    expect(item.mapMoreThreads).toBe(71)
    expect(item.unknownModifiers.map(m => m.text).join('\n')).not.toMatch(/Threads/)
  })

  it('offers the More Threads filter on the trade pseudo stat', () => {
    const item = parseItem(MAP_330)
    const filters: StatFilter[] = []
    mapProps(false, { item, filters, searchInRange: 10, statsByType: item.statsByType } as never)
    const threads = filters.find(f => f.statRef === 'More Scarabs: #%')
    expect(threads?.roll?.value).toBe(71)
  })

  it('builds a map regex minimum that matches the More Threads line', () => {
    const { text } = buildMapRegex({ avoid: [], want: [], mins: { scarabs: 50 }, highlight: 'good' }, [])
    const re = new RegExp(text.slice(1, -1), 'i')
    expect(re.test('More Threads: +71% (augmented)')).toBe(true)
    expect(re.test('More Threads: +40% (augmented)')).toBe(false)
    expect(re.test('Monster Pack Size: +71% (augmented)')).toBe(false)
  })
})
