// What an item is made from, or makes, for the price check's side list: check
// The Will of Uul-Netol and see the other Lost Unity rings, Lost Unity itself,
// and what the parts add up to. Four sources, all checked against poedb:
// - vendor recipes, from the vendor recipe list (shared with the palette); a
//   recipe shows only when every part is a named item, so "3 copies of a
//   unique" or "60 unique rings" never show as rows;
// - upgrades and combines from the item data's drop groups: a Breach unique +
//   Flesh of Xesht, an Incursion unique + its vial, a Harbinger unique + its
//   scroll, a Harbinger unique's pieces, The Utmost's four curios;
// - splinters that combine into a whole (300 Simulacrum, 100 Timeless, 10 Crescent);
// - Precursor's Emblem, from any Mountain, Valley and Meadow ring.
import type { BaseType, DropEntry } from '@/assets/data'
import { RECIPES } from '../search/lookups/recipe-list'

export interface RecipePart {
  info: BaseType
  qty: number
  // Any one of these does (Precursor's Emblem's rings); `info` is the first.
  options?: BaseType[]
  // A kind of part, said above its row ("Any Mountain ring").
  label?: string
}

export type RecipeKind = 'vendor' | 'upgrade' | 'combine'

export interface UniqueRecipe {
  kind: RecipeKind
  // The drop group it was read from: one group's recipes count as one use of
  // a shared part (Vial of Transcendence upgrades three Tempered jewels).
  group?: DropEntry
  makes: BaseType
  parts: RecipePart[]
  note?: string
}

// `find` looks a name up as a unique first, then as an item (currency, splinters).
export type Find = (name: string) => BaseType | undefined

export function recipeTitle (r: UniqueRecipe): string {
  return r.kind === 'vendor'
    ? `${r.makes.name} recipe`
    : r.kind === 'upgrade' ? `Upgrade to ${r.makes.name}` : `Combine into ${r.makes.name}`
}

function partOf (text: string, find: Find): RecipePart | null {
  const m = /^(\d+) (.+)$/.exec(text)
  const info = find(m ? m[2] : text)
  return info ? { info, qty: m ? Number(m[1]) : 1 } : null
}

// "UNIQUE::Uul-Netol's Kiss // Mesh Ring" -> its name and namespace.
function keyName (key: string): { ns: string, name: string } {
  const [ns, rest] = key.split('::')
  return { ns, name: rest.split(' // ')[0] }
}

function vendorRecipes (find: Find): UniqueRecipe[] {
  const out: UniqueRecipe[] = []
  for (const r of RECIPES) {
    if (r.base || r.qty) continue
    const makes = find(r.get)
    // Uniques, and the oil ladder (3 Clear Oil -> 1 Sepia Oil): other currency
    // swaps are vendor trades, not what an item is made from.
    if (makes?.namespace !== 'UNIQUE' && !(makes && r.words === 'oil upgrade')) continue
    const parts = r.give.map(g => partOf(g, find))
    if (parts.some(p => p == null)) continue
    out.push({ kind: 'vendor', makes, parts: parts as RecipePart[], note: r.note })
  }
  return out
}

function precursor (find: Find): UniqueRecipe[] {
  const makes = find("Precursor's Emblem")
  if (!makes) return []
  const parts: RecipePart[] = []
  for (const kind of ['Mountain', 'Valley', 'Meadow']) {
    const options = ["Ahkeli's", "Putembo's", "Uzaza's"].map(who => find(`${who} ${kind}`)).filter((b): b is BaseType => b != null)
    if (options.length) parts.push({ info: options[0], qty: 1, options, label: `Any ${kind} ring` })
  }
  return parts.length === 3 ? [{ kind: 'vendor', makes, parts, note: 'The three picked decide its mods.' }] : []
}

// Upgrades and combines read from the drop groups. Each group is one rule;
// `used` collects the groups taken, so the side list doesn't also call them drops.
function dropRecipes (drops: DropEntry[], find: Find, used: Set<DropEntry>): UniqueRecipe[] {
  const out: UniqueRecipe[] = []
  const look = (key: string) => {
    const { name } = keyName(key)
    return find(name)
  }
  for (const g of drops) {
    const q = g.query.map(keyName)
    // A helper item that turns each unique into the item at the same place:
    // Flesh of Xesht, a vial, a Harbinger scroll.
    const helperAt = q.findIndex(k => k.ns === 'ITEM' && (k.name === 'Flesh of Xesht' || k.name.startsWith('Vial of ') || k.name.endsWith(' Scroll')))
    if (helperAt >= 0) {
      const helper = look(g.query[helperAt])
      const from = g.query.filter((_, i) => i !== helperAt)
      if (!helper || from.length !== g.items.length || q.filter(k => k.ns === 'ITEM').length !== 1) continue
      const made: UniqueRecipe[] = []
      from.forEach((key, i) => {
        const part = look(key)
        const makes = look(g.items[i])
        if (part && makes) made.push({ kind: 'upgrade', group: g, makes, parts: [{ info: part, qty: 1 }, { info: helper, qty: 1 }] })
      })
      if (made.length === from.length) { out.push(...made); used.add(g) }
      continue
    }
    // Pieces or curios that combine into one unique.
    if (g.items.length === 1 && q.length > 1 && q.every(k => k.ns === 'UNIQUE' && (/ Piece of /.test(k.name) || k.name.startsWith('Curio of ')))) {
      const parts = g.query.map(look)
      const makes = look(g.items[0])
      if (makes && parts.every(p => p)) {
        out.push({ kind: 'combine', makes, parts: parts.map(info => ({ info: info!, qty: 1 })) })
        used.add(g)
      }
    }
  }
  return out
}

// From poedb: "Combine 300 Splinters to create a Simulacrum", 100 Timeless
// splinters to an emblem, 10 Crescent Splinters to The Maven's Writ, 100
// Ritual Splinters to a Ritual Vessel.
const SPLINTERS: Array<[string, number, string]> = [
  ['Simulacrum Splinter', 300, 'Simulacrum'],
  ['Crescent Splinter', 10, "The Maven's Writ"],
  ['Ritual Splinter', 100, 'Ritual Vessel'],
  // The Eternal Empire's splinter makes the "Timeless Eternal Emblem".
  ...['Karui', 'Maraketh', 'Eternal Empire', 'Templar', 'Vaal'].map((who): [string, number, string] => [`Timeless ${who} Splinter`, 100, `Timeless ${who.split(' ')[0]} Emblem`])
]

function splinterRecipes (find: Find): UniqueRecipe[] {
  const out: UniqueRecipe[] = []
  for (const [part, qty, whole] of SPLINTERS) {
    const info = find(part)
    const makes = find(whole)
    if (info && makes) out.push({ kind: 'combine', makes, parts: [{ info, qty }] })
  }
  return out
}

export interface RecipeBook {
  list: UniqueRecipe[]
  // Drop groups that are recipes, not drops.
  used: Set<DropEntry>
  // Non-unique parts in 3 or more recipes (Orb of Fusing, Flesh of Xesht):
  // checking one lists none of them.
  common: Set<string>
}

let cache: RecipeBook | null = null

export function recipeBook (find: Find, drops: DropEntry[]): RecipeBook {
  if (cache) return cache
  const used = new Set<DropEntry>()
  const list = [...vendorRecipes(find), ...precursor(find), ...dropRecipes(drops, find, used), ...splinterRecipes(find)]
  const uses = new Map<string, Set<unknown>>()
  for (const r of list) {
    for (const p of r.parts) {
      if (p.info.namespace === 'UNIQUE') continue
      if (!uses.has(p.info.refName)) uses.set(p.info.refName, new Set())
      uses.get(p.info.refName)!.add(r.group ?? r)
    }
  }
  const common = new Set([...uses].filter(([, from]) => from.size >= 3).map(([name]) => name))
  cache = { list, used, common }
  return cache
}

const partNames = (p: RecipePart) => (p.options ?? [p.info]).map(o => o.refName)

// The recipes an item makes or is a part of.
export function recipesOf (refName: string, book: RecipeBook): UniqueRecipe[] {
  if (book.common.has(refName)) return book.list.filter(r => r.makes.refName === refName)
  return book.list.filter(r => r.makes.refName === refName || r.parts.some(p => partNames(p).includes(refName)))
}

// A part with options takes the checked item if it is one, else the cheapest
// priced option, else the first.
export function resolveParts (r: UniqueRecipe, own: string, priceOf: (info: BaseType) => number | null): RecipePart[] {
  return r.parts.map(p => {
    if (!p.options) return p
    const mine = p.options.find(o => o.refName === own)
    if (mine) return { ...p, info: mine }
    const priced = p.options.map(info => ({ info, chaos: priceOf(info) })).filter(o => o.chaos != null)
    priced.sort((a, b) => a.chaos! - b.chaos!)
    return { ...p, info: priced[0]?.info ?? p.info }
  })
}

export interface RecipeSum {
  // Chaos for all the parts, counting only those with a price.
  parts: number
  // Parts poe.ninja has no price for.
  missing: number
  makes: number | null
}

export function recipeSum (parts: RecipePart[], makes: BaseType, priceOf: (info: BaseType) => number | null): RecipeSum {
  let total = 0
  let missing = 0
  for (const p of parts) {
    const each = priceOf(p.info)
    if (each == null) missing++
    else total += each * p.qty
  }
  return { parts: total, missing, makes: priceOf(makes) }
}

// The divination cards whose reward is this item, from the tooltip's item
// file: "<uniqueitem>{Headhunter}", "<currencyitem>{2x Exalted Orb}", and a
// stack size. `gives` is how many of the item a full stack gives.
export interface CardReward { card: string, stack: number, gives: number, corrupted: boolean }

// A card's reward when it is one named unique or currency, plainly or
// corrupted: "<currencyitem>{2x Exalted Orb}", "<size:30>{<currencyitem>{Mirror
// of Kalandra}}". A reward with a level or links isn't the plain item: null.
// "<uniqueitem>{Map}" (any unique map) parses, and the caller's item lookup
// finds no such item.
export interface NamedReward { namespace: 'UNIQUE' | 'ITEM', name: string, gives: number, corrupted: boolean }
export function rewardOf (d: string): NamedReward | null {
  const lines = d.split(/\r?\n/)
  const first = /^<size:\d+>\{(.*)\}$/.exec(lines[0])?.[1] ?? lines[0]
  const m = /^<(uniqueitem|currencyitem)>\{(?:(\d+)x )?(.+)\}$/.exec(first)
  if (!m) return null
  const rest = lines.slice(1)
  if (rest.some(l => !/^<corrupted>\{Corrupted\}$/.test(l))) return null
  return { namespace: m[1] === 'uniqueitem' ? 'UNIQUE' : 'ITEM', name: m[3], gives: m[2] ? Number(m[2]) : 1, corrupted: rest.length > 0 }
}

// Only a card for this exact item: a unique's card names that unique, a
// currency's that currency.
export function cardsFor (item: { refName: string, namespace: string }, items: Record<string, { d?: string, n?: number }>): CardReward[] {
  if (item.namespace !== 'UNIQUE' && item.namespace !== 'ITEM') return []
  const out: CardReward[] = []
  for (const [card, v] of Object.entries(items)) {
    if (!v.n || !v.d) continue
    const r = rewardOf(v.d)
    if (!r || r.namespace !== item.namespace || r.name !== item.refName) continue
    out.push({ card, stack: v.n, gives: r.gives, corrupted: r.corrupted })
  }
  return out.sort((a, b) => a.stack / a.gives - b.stack / b.gives || a.card.localeCompare(b.card))
}

// Fragment sets that open something together: one of each.
const SET_FIRSTS = new Set(['Sacrifice at Dawn', 'Mortal Ignorance', 'Fragment of the Minotaur', 'Fragment of Eradication', 'Fragment of Knowledge', "Al-Hezmin's Crest"])

export function isFragmentSet (group: DropEntry): boolean {
  return group.query.length === 4 && SET_FIRSTS.has(keyName(group.query[0]).name)
}

// Upstream groups whose items aren't drops, only things the query items go
// with: Harvest's lifeforce crafts, Blight's special oils, the Eldritch
// currencies and Orb of Conflict (poedb: The Maven drops it). Timeless
// splinters make the emblems, which the splinter recipe shows. Their items
// are never shown as "Drops from" or "Drops in".
const NOT_DROPS = new Set(['Essence of Insanity', 'Primal Crystallised Lifeforce', 'Golden Oil', 'Lesser Eldritch Ember', 'Lesser Eldritch Ichor', 'Timeless Eternal Empire Splinter'])

// Items in a real drop group that poedb doesn't back: Perfect Forest Tiger is
// an Azmeri corpse, not a drop of the King in the Mists.
const NOT_DROP_ITEMS = new Set(['ITEM::Perfect Forest Tiger'])

export function dropsAreReal (group: DropEntry): boolean {
  return !NOT_DROPS.has(keyName(group.query[0]).name)
}

// What a group really drops.
export function realDrops (group: DropEntry): string[] {
  return dropsAreReal(group) ? group.items.filter(id => !NOT_DROP_ITEMS.has(id)) : []
}

// For tests: the book is built once per game data load.
export function resetRecipeCache () { cache = null }
