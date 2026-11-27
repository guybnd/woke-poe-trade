// League items on the Loot tab (Guy's League A, 2026-11-27): a mechanic set
// Off hides in maps; the rest stays NeverSink's.
import { describe, it, expect } from 'vitest'
import { parseFilter, serializeFilter } from '@/web/woke/loot-filter/parse'
import { matchItem } from '@/web/woke/loot-filter/match'
import type { ItemFacts } from '@/web/woke/loot-filter/item-facts'
import { validateFilter } from '@/web/woke/loot-filter/validate'
import { applyLeagueOff } from '@/web/woke/loot-filter/league-classes'
import { defaultCurrency } from '@/web/woke/loot-filter/currency-weights'
import { neverSink } from '../helpers/neversink'

const REGULAR = neverSink('1-REGULAR')
const item = (baseType: string, itemClass: string, areaLevel = 83): ItemFacts => ({
  name: baseType, baseType, itemClass, rarity: 'Normal', areaLevel, itemLevel: 83, influences: [], explicitModNames: []
} as ItemFacts)

describe('league items on the Loot tab', () => {
  it('hides a mechanic set Off, in maps only', () => {
    const doc = parseFilter(REGULAR)
    expect(applyLeagueOff(doc, { ...defaultCurrency(), on: true, catMode: { lgexped: 'off' } })).toHaveLength(1)
    expect(matchItem(doc, item('Expedition Logbook', 'Expedition Logbooks')).visibility).toBe('Hide')
    expect(matchItem(doc, item('Expedition Logbook', 'Expedition Logbooks', 60)).visibility).toBe('Show')
    expect(matchItem(doc, item('Chronicle of Atzoatl', 'Misc Map Items')).visibility).toBe('Show')
    expect(validateFilter(parseFilter(serializeFilter(doc))).map(p => p.message)).toEqual([])
  })

  it('writes nothing while off or with every mechanic shown', () => {
    expect(applyLeagueOff(parseFilter(REGULAR), { ...defaultCurrency(), catMode: { lgexped: 'off' } })).toEqual([])
    expect(applyLeagueOff(parseFilter(REGULAR), { ...defaultCurrency(), on: true })).toEqual([])
  })
})
