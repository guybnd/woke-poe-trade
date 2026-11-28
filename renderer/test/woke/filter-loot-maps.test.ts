// Maps on the Loot tab (Guy's Maps A, 2026-11-27): normal maps under the
// tier slider hide; special maps keep NeverSink's rules above.
import { describe, it, expect } from 'vitest'
import { parseFilter, serializeFilter } from '@/web/woke/loot-filter/parse'
import { matchItem } from '@/web/woke/loot-filter/match'
import type { ItemFacts } from '@/web/woke/loot-filter/item-facts'
import { validateFilter } from '@/web/woke/loot-filter/validate'
import { applyMapFloor } from '@/web/woke/loot-filter/map-floor'
import { defaultCurrency, normalizeCurrency } from '@/web/woke/loot-filter/currency-weights'
import { neverSink } from '../helpers/neversink'

const REGULAR = neverSink('1-REGULAR')
const map = (tier: number, more: Partial<ItemFacts> = {}): ItemFacts => ({
  name: 'Strand Map',
  baseType: 'Strand Map',
  itemClass: 'Maps',
  rarity: 'Normal',
  mapTier: tier,
  areaLevel: 83,
  influences: [],
  explicitModNames: [],
  corrupted: false,
  blightedMap: false,
  uberBlightedMap: false,
  ...more
} as ItemFacts)

describe('maps on the Loot tab', () => {
  it('hides normal maps under the slider, keeps special maps', () => {
    const cfg = { ...defaultCurrency(), on: true, mapFrom: 14 }
    const doc = parseFilter(REGULAR)
    expect(applyMapFloor(doc, cfg)).not.toBeNull()
    expect(matchItem(doc, map(10)).visibility).toBe('Hide')
    expect(matchItem(doc, map(16)).visibility).toBe('Show')
    expect(matchItem(doc, map(10, { blightedMap: true } as Partial<ItemFacts>)).visibility).toBe('Show')
    expect(matchItem(doc, map(10, { rarity: 'Unique' })).visibility).toBe('Show')
    expect(validateFilter(parseFilter(serializeFilter(doc))).map(p => p.message)).toEqual([])
  })

  it('does nothing at tier 1 or when off', () => {
    const doc = parseFilter(REGULAR)
    expect(applyMapFloor(doc, { ...defaultCurrency(), on: true })).toBeNull()
    expect(applyMapFloor(doc, { ...defaultCurrency(), mapFrom: 10 })).toBeNull()
    expect(normalizeCurrency({ mapFrom: 12 } as never).mapFrom).toBe(12)
    expect(normalizeCurrency({ mapFrom: 40 } as never).mapFrom).toBe(1)
  })
})
