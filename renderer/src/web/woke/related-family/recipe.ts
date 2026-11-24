// The vendor recipes a unique belongs to, for the price check's side list:
// check The Will of Uul-Netol and see the other Lost Unity rings, Lost Unity
// itself, and what the parts add up to. Read from the vendor recipe list (one
// list for the palette and here); a recipe shows only when every part is a
// named item in the game data, so "3 copies of a unique" or "60 unique rings"
// never show as rows.
import type { BaseType } from '@/assets/data'
import { RECIPES } from '../search/lookups/recipe-list'

export interface RecipePart {
  info: BaseType
  qty: number
}

export interface UniqueRecipe {
  makes: BaseType
  parts: RecipePart[]
  note?: string
}

// `find` looks a name up as a unique first, then as an item (currency, splinters).
type Find = (name: string) => BaseType | undefined

function partOf (text: string, find: Find): RecipePart | null {
  const m = /^(\d+) (.+)$/.exec(text)
  const info = find(m ? m[2] : text)
  return info ? { info, qty: m ? Number(m[1]) : 1 } : null
}

let cache: UniqueRecipe[] | null = null

// Every recipe that makes a unique from named items.
export function uniqueRecipes (find: Find): UniqueRecipe[] {
  if (cache) return cache
  const out: UniqueRecipe[] = []
  for (const r of RECIPES) {
    if (r.base || r.qty) continue
    const makes = find(r.get)
    if (makes?.namespace !== 'UNIQUE') continue
    const parts = r.give.map(g => partOf(g, find))
    if (parts.some(p => p == null)) continue
    out.push({ makes, parts: parts as RecipePart[], note: r.note })
  }
  cache = out
  return out
}

// The recipes a unique makes or is a part of. Only unique parts count: an Orb
// of Fusing is a part of five recipes and says nothing about any of them.
export function recipesOf (refName: string, list: UniqueRecipe[]): UniqueRecipe[] {
  return list.filter(r => r.makes.refName === refName || r.parts.some(p => p.info.namespace === 'UNIQUE' && p.info.refName === refName))
}

export interface RecipeSum {
  // Chaos for all the parts, counting only those with a price.
  parts: number
  // Parts poe.ninja has no price for.
  missing: number
  makes: number | null
}

export function recipeSum (r: UniqueRecipe, priceOf: (info: BaseType) => number | null): RecipeSum {
  let parts = 0
  let missing = 0
  for (const p of r.parts) {
    const each = priceOf(p.info)
    if (each == null) missing++
    else parts += each * p.qty
  }
  return { parts, missing, makes: priceOf(r.makes) }
}

// For tests: the list is built once per game data load.
export function resetRecipeCache () { cache = null }
