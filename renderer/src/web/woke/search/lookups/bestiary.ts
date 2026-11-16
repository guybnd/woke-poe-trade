// Blood Altar recipes: "farr", "aspect", "unique ring", "6 link", "fracture".
// A recipe is a result of its own; a beast's price page lists the recipes it's
// in (BeastRecipes.vue). The table (public/data/bestiary-data.json, built by
// scripts/build-bestiary-data.mjs from poedb) is fetched when the palette opens.
import type { Lookup, LookupCard, LookupContext, LookupRow } from './types'

export interface BeastRecipe {
  // poedb's heading and result: "Create a Unique" / "Ring".
  g: string
  r: string
  // Conditions and the mod it adds, one line each.
  n?: string[]
  // Named beasts, in altar order.
  b: string[]
  // Slots any rare beast fills.
  a: number
}
export interface BestiaryData {
  recipes: BeastRecipe[]
  // A spirit boss's uniques, by the boss's first name: "Farrul" -> Farrul's Fur...
  dens: Record<string, string[]>
}

export const BLOOD_ALTAR = 'Blood Altar'

const lc = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)
const uc = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// A short name for the result list: "Unique Ring", "Portal to Farrul's Den".
export function recipeTitle (rec: BeastRecipe): string {
  const { g, r } = rec
  switch (g) {
    case 'Create a Unique': return `Unique ${r}`
    case 'Create a Rare': return `Rare ${r}`
    case 'Open a Portal': return `Portal ${r}`
    case 'Create Currency Items': return uc(r.replace(/^A stack of /, ''))
    case 'Create an Imprint': return `Imprint ${lc(r)}`
    case 'Corrupt a Map': return `Corrupt a map ${lc(r)}`
    case 'Convert this Unique Item': return `Turn a unique ${lc(r)}`
    case 'Craft an Aspect Skill onto an Item': return r
    case 'Add a Mod to a Life or Mana Flask': return `Life or mana flask: ${lc(r)}`
    case 'Add a Mod to a Utility Flask': return `Utility flask: ${lc(r)}`
  }
  // "Fracture a Modifer": poedb's spelling of the game's text.
  if (/^Fracture /.test(g)) return `${g.replace(/Modifers?/, m => m.endsWith('s') ? 'mods' : 'mod')} ${lc(r)}`
  if (/^(Apply|Modify an Item|Sacrifice)/.test(g)) return `${g} ${lc(r)}`
  return r
}

export const shortBeast = (name: string) => name.split(',')[0]

// "Farric Tiger Alpha + 3 any rare"
export function recipeNeeds (rec: BeastRecipe, without?: string): string {
  const named = rec.b.filter(b => b !== without).map(shortBeast)
  const any = rec.a ? `${rec.a} any rare` : ''
  return [...named, any].filter(Boolean).join(' + ')
}

// The named beasts' total, or null when one has no price.
export function beastsCost (rec: BeastRecipe, price: (name: string) => number | null): number | null {
  let sum = 0
  for (const b of rec.b) {
    const p = price(b)
    if (p == null) return null
    sum += p
  }
  return sum
}

export function recipesWith (data: BestiaryData | null, beast: string): BeastRecipe[] {
  return data?.recipes.filter(r => r.b.includes(beast)) ?? []
}

// A portal's boss and what its den drops.
export function denOf (data: BestiaryData | null, rec: BeastRecipe): { boss: string, drops: string[] } | null {
  if (rec.g !== 'Open a Portal' || !data) return null
  const boss = rec.r.match(/^to ([A-Z][a-z]+)'/)?.[1]
  const drops = boss ? data.dens[boss] : undefined
  return boss && drops?.length ? { boss, drops } : null
}

// The recipes that lead to an item: the portal to the den that drops it.
export function recipesMaking (data: BestiaryData | null, item: string): BeastRecipe[] {
  return data?.recipes.filter(r => denOf(data, r)?.drops.includes(item)) ?? []
}

// ---- the lookup ----
// Words that say "Bestiary" without naming a recipe.
const HINTS = new Set(['beast', 'beasts', 'bestiary', 'beastcraft', 'beastcrafting', 'altar', 'blood', 'recipe', 'recipes', 'craft', 'einhar'])
const ALIAS: Record<string, string[]> = {
  '6l': ['six', 'linked'],
  '6s': ['six', 'socket'],
  'links': ['link'],
  'max': ['maximum'],
  'fractured': ['fracture']
}
const MAX_CARDS = 8

function words (text: string): string[] {
  return text.toLowerCase().replace(/['’]/g, '').split(/[^\p{L}\p{N}]+/u).filter(Boolean)
}
function queryWords (raw: string): string[] {
  const text = raw.toLowerCase()
    .replace(/\b6\s*l(?:inks?|inked)?\b/g, '6l')
    .replace(/\b6\s*s(?:ockets?)?\b/g, '6s')
  return words(text).flatMap(w => ALIAS[w] ?? (HINTS.has(w) ? [] : [w]))
}
// Every query word starts a word in the text.
function matches (hay: string[], q: string[]): boolean {
  return q.every(w => hay.some(h => h.startsWith(w) || (w.length > 4 && h.startsWith(w.replace(/s$/, '')))))
}

function card (data: BestiaryData, rec: BeastRecipe, ctx: LookupContext): LookupCard {
  const title = recipeTitle(rec)
  const rows: LookupRow[] = rec.b.map(b => ({
    label: b,
    item: { name: b, type: 'Beast' },
    chaos: ctx.price(b),
    action: { label: `Search trade for ${b}`, trade: b }
  }))
  if (rec.a) rows.push({ label: `${rec.a} any rare beast${rec.a > 1 ? 's' : ''}`, dim: true, value: 'any' })
  const total = beastsCost(rec, ctx.price)
  if (rec.b.length > 1 && total != null) rows.push({ label: 'Named beasts', chaos: total })
  const sections: LookupCard['sections'] = [
    { text: [`${rec.g}: ${rec.r}`, ...(rec.n ?? [])] },
    { label: 'Beasts', rows }
  ]
  const den = denOf(data, rec)
  if (den) {
    sections.push({
      label: `${den.boss} drops`,
      rows: den.drops.map(d => ({ label: d, item: { name: d }, chaos: ctx.price(d) }))
    })
  }
  return {
    id: `beast:${data.recipes.indexOf(rec)}`,
    group: BLOOD_ALTAR,
    name: title,
    sub: recipeNeeds(rec),
    icon: 'fas fa-paw',
    sections,
    actions: rec.b.map(b => ({ label: `Trade: ${shortBeast(b)}`, trade: b }))
  }
}

export function bestiaryLookup (data: BestiaryData | null): Lookup {
  return (query, ctx) => {
    if (!data || query.trim().length < 3) return []
    const q = queryWords(query)
    if (!q.length) return []
    const titled: BeastRecipe[] = []
    const byBeast: BeastRecipe[] = []
    for (const rec of data.recipes) {
      const own = words(`${recipeTitle(rec)} ${rec.g} ${rec.r} ${(rec.n ?? []).join(' ')}`)
      if (matches(own, q)) titled.push(rec)
      else if (matches([...own, ...words(rec.b.join(' '))], q)) byBeast.push(rec)
    }
    // What a recipe makes first, then recipes that only name a matching beast.
    return [...titled, ...byBeast].slice(0, MAX_CARDS).map(rec => card(data, rec, ctx))
  }
}
