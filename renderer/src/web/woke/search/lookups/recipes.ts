// Vendor recipes: search by what you get, what you sell, or a nickname
// ("chrome", "6 link", "chaos recipe"). The list is in recipe-list.ts.
import { matchRank } from '../search'
import type { Lookup, LookupCard, LookupContext } from './types'
import { RECIPES, type Recipe } from './recipe-list'

export { RECIPES, type Recipe }

function norm (text: string): string {
  return text.toLowerCase().replace(/['’]/g, '').replace(/\s+/g, ' ').trim()
}

function rank (r: Recipe, query: string): number {
  const q = norm(query)
  // A nickname: "6l", "chrome", "chaos recipe".
  const phrases = r.words ? r.words.split(',').map(norm) : []
  if (phrases.some(p => p === q || (q.length >= 3 && p.startsWith(q)))) return 0
  if (q.length < 3) return -1
  const got = matchRank(r.get, query)
  if (got >= 0 && got < 2) return got
  // What you sell: a word start, from 4 letters, so "orb" doesn't list them all.
  return q.length >= 4 && r.give.some(g => { const k = matchRank(g, query); return k >= 0 && k < 2 }) ? 2 : -1
}

export function recipeCard (r: Recipe, ctx: LookupContext, i: number): LookupCard {
  const each = r.base ? null : ctx.price(r.get)
  return {
    id: `recipe:${i}`,
    group: 'Vendor recipes',
    // The input too: four recipes make an Orb of Chance.
    name: `${r.qty ? `${r.qty} × ` : ''}${r.get} from ${r.give[0][0].toLowerCase()}${r.give[0].slice(1)}`,
    title: `${r.qty ? `${r.qty} × ` : ''}${r.get}`,
    sub: `Vendor: ${r.give.join(' + ')}`,
    icon: 'fas fa-store',
    sections: [
      { label: 'Sell to a vendor', rows: r.give.map(g => ({ label: g })) },
      { label: 'Get', rows: [{ label: `${r.qty ? `${r.qty} × ` : ''}${r.get}`, ...(each != null ? { chaos: each * (r.qty ?? 1), item: { name: r.get } } : {}) }] },
      ...(r.note ? [{ text: [r.note] }] : [])
    ],
    actions: [{ label: 'Recipe list on poedb', url: 'https://poedb.tw/us/Vendor_recipe_system' }]
  }
}

export const recipeLookup: Lookup = (query, ctx) => {
  if (query.trim().length < 2) return []
  return RECIPES
    .map((r, i) => ({ r, i, rank: rank(r, query) }))
    .filter(h => h.rank >= 0)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 5)
    .map(h => recipeCard(h.r, ctx, h.i))
}
