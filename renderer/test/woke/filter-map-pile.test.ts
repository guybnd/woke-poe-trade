import { describe, expect, it } from 'vitest'
import { mapPile } from '@/web/woke/loot-filter/map-pile'

describe('Maps page ground pile', () => {
  it('mixes map kinds, not only blighted maps', () => {
    const pile = mapPile(1)
    expect(pile).toHaveLength(26)
    const has = (f: (d: typeof pile[number]) => boolean) => pile.some(f)
    expect(has(d => d.facts.zanaMemory === true)).toBe(true)
    expect(has(d => d.facts.blightedMap === true)).toBe(true)
    expect(has(d => d.facts.baseType === 'Nightmare Map')).toBe(true)
    expect(has(d => d.facts.baseType === 'Vaal Temple Map')).toBe(true)
    expect(has(d => d.facts.explicitModNames.length > 0 && d.facts.identified === true)).toBe(true)
    expect(has(d => d.kind == null && /^Map \(Tier \d+\)$/.test(d.label))).toBe(true)
    // Blighted maps are under a third of the pile.
    expect(pile.filter(d => d.facts.blightedMap).length).toBeLessThan(pile.length / 3)
  })
  it('is stable for a seed', () => {
    expect(mapPile(7).map(d => d.key)).toEqual(mapPile(7).map(d => d.key))
    expect(mapPile(7).map(d => d.key)).not.toEqual(mapPile(8).map(d => d.key))
  })
})
