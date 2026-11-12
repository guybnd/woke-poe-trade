// Search palette vendor recipes.
import { describe, it, expect } from 'vitest'
import { RECIPES, recipeLookup } from '@/web/woke/search/lookups/recipes'
import type { LookupContext } from '@/web/woke/search/lookups/types'

const ctx: LookupContext = {
  price: n => ({ 'Chromatic Orb': 0.2, 'Orb of Fusing': 0.5 } as Record<string, number>)[n] ?? null,
  tools: new Set(),
  divine: 200,
  now: 0,
  league: null
}
const names = (q: string) => recipeLookup(q, ctx).map(c => c.name)

describe('recipeLookup', () => {
  it('finds a recipe by what you get, with its price', () => {
    expect(names('chromatic')[0]).toBe('Chromatic Orb')
    const fuse = recipeLookup('6 link', ctx)[0]
    expect(fuse.name).toBe('20 × Orb of Fusing')
    expect(fuse.sections[1].rows![0].chaos).toBe(10)
  })
  it('finds a recipe by its nickname', () => {
    expect(names('chrome')).toContain('Chromatic Orb')
    expect(names('chaos recipe')[0]).toBe('Chaos Orb')
    expect(names('movement speed')).toContain('Boots with 5% more movement speed')
  })
  it('finds what a thing sells into, but not on a word like "orb"', () => {
    expect(names('rustic sash')).toContain('Weapon with 40% to 84% physical damage')
    expect(names('orb')).not.toContain('Kingmaker')
    expect(names('ab')).toEqual([])
  })
  it('chains every oil to the one below it', () => {
    const golden = RECIPES.find(r => r.get === 'Golden Oil')!
    expect(golden.give).toEqual(['3 Silver Oil'])
    expect(RECIPES.find(r => r.get === 'Sepia Oil')!.give).toEqual(['3 Clear Oil'])
  })
})
