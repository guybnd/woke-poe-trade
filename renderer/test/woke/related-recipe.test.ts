// The recipe list beside a unique's price check: the parts, what they make, and the sum.
import { describe, it, expect, beforeAll } from 'vitest'
import { ITEM_BY_REF } from '@/assets/data'
import { recipesOf, recipeSum, resetRecipeCache, uniqueRecipes } from '@/web/woke/related-family/recipe'
import { loadGameData } from '../helpers/game-data'

beforeAll(async () => { await loadGameData(); resetRecipeCache() })

const find = (name: string) => ITEM_BY_REF('UNIQUE', name)?.[0] ?? ITEM_BY_REF('ITEM', name)?.[0]
const list = () => uniqueRecipes(find)

describe('unique recipes', () => {
  it('lists the Lost Unity rings for one of them', () => {
    const [r, ...more] = recipesOf('The Will of Uul-Netol', list())
    expect(more).toEqual([])
    expect(r.makes.refName).toBe('Lost Unity')
    expect(r.parts.map(p => p.info.refName)).toEqual(['The Will of Xoph', 'The Will of Tul', 'The Will of Esh', 'The Will of Uul-Netol', 'The Sundered Will'])
  })

  it('finds the recipe from what it makes, with currency parts', () => {
    const [r] = recipesOf('The Retch', list())
    expect(r.parts.map(p => [p.info.refName, p.info.namespace, p.qty])).toEqual([
      ['Faminebind', 'UNIQUE', 1], ['Feastbind', 'UNIQUE', 1], ['Orb of Fusing', 'ITEM', 1]
    ])
  })

  it('lists nothing for a currency or splinter part', () => {
    expect(recipesOf('Orb of Fusing', list())).toEqual([])
    expect(recipesOf('Timeless Karui Splinter', list())).toEqual([])
    expect(recipesOf('Lethal Pride', list()).map(r => r.parts[0].qty)).toEqual([10])
  })

  it('leaves out recipes whose parts are not named items', () => {
    const made = list().map(r => r.makes.refName)
    expect(made).not.toContain('Loreweave')
    expect(made).not.toContain("Precursor's Emblem")
    expect(made).not.toContain('The Goddess Scorned')
    expect(made).toEqual(expect.arrayContaining(['Kingmaker', 'Arborix', 'Duskdawn', 'Magna Eclipsis', 'The Taming', 'The Anima Stone', 'Reclaimed Malevolence']))
  })

  it('sums the priced parts and counts the rest', () => {
    const [r] = recipesOf('Kingmaker', list())
    const prices: Record<string, number> = { 'Soul Taker': 100, 'Orb of Fusing': 0.5, 'Kingmaker': 300 }
    expect(recipeSum(r, info => prices[info.refName] ?? null)).toEqual({ parts: 100.5, missing: 1, makes: 300 })
  })
})
