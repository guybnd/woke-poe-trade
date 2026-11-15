// Crafting bench and Harvest crafts with what they cost at today's prices:
// "life", "fire res ring", "6 link", "cold to fire", "harvest speed".
// The table (public/data/craft-data.json, built by scripts/build-craft-data.mjs
// from poedb) is fetched when the palette opens.
import type { Lookup, LookupCard, LookupContext, LookupRow, LookupTableRow } from './types'

type Cost = Array<[number, number]>
export interface CraftData {
  cur: string[]
  cls: string[]
  bench: Array<{ f: string, s?: 'p' | 's', r: Array<[string, Cost, number[], string]> }>
  harvest: Array<[string, Cost]>
}

const STOP = new Set(['to', 'into', 'a', 'an', 'the', 'of', 'with', 'on', 'mod', 'mods', 'modifier', 'modifiers', 'craft', 'crafts', 'crafting', 'recipe'])
const BENCH_WORDS = new Set(['bench'])
const HARVEST_WORDS = new Set(['harvest', 'horticraft', 'horticrafting', 'lifeforce'])
// A word for the item it goes on. Matching rows keep only tiers for that item.
const ITEM_WORDS: Record<string, string[]> = {
  ring: ['Ring'],
  rings: ['Ring'],
  amulet: ['Amulet'],
  amulets: ['Amulet'],
  ammy: ['Amulet'],
  belt: ['Belt'],
  belts: ['Belt'],
  quiver: ['Quiver'],
  body: ['Body Armour'],
  chest: ['Body Armour'],
  glove: ['Gloves'],
  gloves: ['Gloves'],
  boot: ['Boots'],
  boots: ['Boots'],
  helm: ['Helmet'],
  helmet: ['Helmet'],
  shield: ['Shield'],
  weapon: ['One Hand Melee', 'Two Hand Melee', 'One Hand Ranged', 'Two Hand Ranged'],
  bow: ['Two Hand Ranged'],
  wand: ['One Hand Ranged'],
  flask: ['Flask'],
  jewel: ['Jewel'],
  tincture: ['Tincture'],
  map: ['Map'],
  maps: ['Map']
}
// Short words people type for longer ones.
const ALIAS: Record<string, string[]> = {
  ms: ['movement', 'speed'],
  ele: ['elemental'],
  phys: ['physical'],
  crit: ['critical'],
  aspd: ['attack', 'speed'],
  cspd: ['cast', 'speed'],
  // Only Harvest's mod swaps say "similar-tier".
  swap: ['similar'],
  augment: ['add'],
  multimod: ['can', 'have', 'up', 'crafted']
}
const NUM = ['', '', 'two', 'three', 'four', 'five', 'six']

interface Query {
  words: string[]
  only: 'bench' | 'harvest' | null
  classes: string[] | null
  // The item words, to search as plain words when nothing fits the item.
  itemWords: string[]
  ordered: boolean
}
// "energy shield", "spell block shield", "flask effect": a mod's words, not the item.
function partOfMod (w: string, prev: string | undefined, next: string | undefined): boolean {
  if (w === 'shield') return prev === 'energy' || prev === 'spell'
  if (w === 'flask') return /^(effect|charge|duration)/.test(next ?? '')
  return false
}

function words (text: string): string[] {
  return text.toLowerCase().replace(/['’]/g, '').split(/[^\p{L}\p{N}]+/u).filter(Boolean)
}

export function parseQuery (raw: string): Query {
  const text = raw.toLowerCase()
    // "6l", "6 link", "5 linked" -> six linked sockets; "6s", "6 socket" -> six sockets.
    .replace(/\b([2-6])\s*l(?:inks?|inked)?\b/g, (_, n: string) => `${NUM[+n]} linked sockets`)
    .replace(/\b([2-6])\s*s(?:ockets?)?\b/g, (_, n: string) => `${NUM[+n]} sockets`)
  let only: Query['only'] = null
  let classes: string[] | null = null
  const itemWords: string[] = []
  const out: string[] = []
  const list = words(text)
  list.forEach((w, k) => {
    if (BENCH_WORDS.has(w)) only = 'bench'
    else if (HARVEST_WORDS.has(w)) only = 'harvest'
    else if (ITEM_WORDS[w] && !partOfMod(w, list[k - 1], list[k + 1])) {
      classes = [...(classes ?? []), ...ITEM_WORDS[w]]
      itemWords.push(w)
    } else if (ALIAS[w]) out.push(...ALIAS[w])
    else if (!STOP.has(w)) out.push(w)
  })
  // Harvest crafts don't go by item class: "harvest body armour enchant" reads the words.
  if (only === 'harvest' && classes) {
    out.push(...itemWords)
    classes = null
  }
  return { words: out, only, classes, itemWords, ordered: /\s(to|into)\s/.test(text) }
}

// Whether every query word starts a word in the text. `ordered` ("cold res to
// fire res"): each word is looked for after the one before it.
function matches (hay: string[], q: string[], ordered = false): boolean {
  let from = 0
  for (const w of q) {
    // A plural finds the single word too: "prefixes" -> "prefix".
    const stem = w.length > 4 ? w.replace(/(?:es|s)$/, '') : w
    const i = hay.findIndex((h, k) => k >= from && (h.startsWith(w) || h.startsWith(stem)))
    if (i < 0) return false
    if (ordered) from = i + 1
  }
  return true
}

const SHORT: Record<string, string> = {
  'Chaos Orb': 'Chaos',
  'Divine Orb': 'Divine',
  'Exalted Orb': 'Exalted',
  'Regal Orb': 'Regal',
  'Vaal Orb': 'Vaal',
  'Blessed Orb': 'Blessed',
  'Sacred Orb': 'Sacred',
  'Instilling Orb': 'Instilling',
  "Jeweller's Orb": "Jeweller's",
  'Wild Crystallised Lifeforce': 'Wild',
  'Vivid Crystallised Lifeforce': 'Vivid',
  'Primal Crystallised Lifeforce': 'Primal',
  'Sacred Crystallised Lifeforce': 'Sacred',
  'Crystallised Rancour': 'Rancour'
}
export const shortCurrency = (name: string) => SHORT[name] ?? name.replace(/^Orb of /, '')
const qty = (n: number) => n.toLocaleString('en-US')

export function costText (cost: Cost, data: CraftData): string {
  return cost.map(([n, c]) => `${qty(n)} ${shortCurrency(data.cur[c])}`).join(' + ')
}
export function costChaos (cost: Cost, data: CraftData, ctx: LookupContext): number | null {
  let sum = 0
  for (const [n, c] of cost) {
    const each = ctx.price(data.cur[c])
    if (each == null) return null
    sum += n * each
  }
  return sum
}

const WEAPONS = ['One Hand Melee', 'Two Hand Melee', 'One Hand Ranged', 'Two Hand Ranged']
const ARMOUR = ['Body Armour', 'Gloves', 'Boots', 'Helmet', 'Shield']
// "Armour, rings, amulets, belt, quiver" for a list of item classes.
export function itemText (classes: string[]): string {
  const left = new Set(classes)
  const parts: string[] = []
  const take = (set: string[], label: string) => {
    if (set.every(c => left.has(c))) { set.forEach(c => left.delete(c)); parts.push(label) }
  }
  take(WEAPONS, 'Weapons')
  take(ARMOUR, 'Armour')
  for (const c of left) {
    const name = c === 'Map Like Items' ? 'Other map items' : c
    parts.push(parts.length ? name.toLowerCase() : name)
  }
  return parts.join(', ')
}

// "+(15–25) to maximum Life" -> "15–25"; text with no number stays whole.
export function rollText (text: string): string {
  const nums = [...text.matchAll(/\((-?[\d.]+–-?[\d.]+)\)|(?<![\w(-])(-?\d+(?:\.\d+)?)(?![\w)])/g)].map(m => m[1] ?? m[2])
  return nums.length ? nums.join(' / ') : text
}
// The family's name with numbers as #: "+# to maximum Life".
function familyName (f: CraftData['bench'][number]): string {
  const t = f.r[0][0]
  if (!/\d/.test(t) || /^(Socket|Fortune)/.test(f.f)) return f.f.includes(' / ') ? t.split('\n')[0] : f.f
  return t.replace(/\(-?[\d.]+–-?[\d.]+\)|-?\d+(?:\.\d+)?/g, '#').split('\n').join(' / ')
}

function benchCard (f: CraftData['bench'][number], tiers: CraftData['bench'][number]['r'], data: CraftData, ctx: LookupContext, i: number, on: string | null): LookupCard {
  const name = familyName(f)
  const rows: LookupTableRow[] = tiers.map(([text, cost, cls, unlock]) => ({
    cells: [rollText(text), { text: costText(cost, data), sub: unlock }, itemText(cls.map(c => data.cls[c]))],
    chaos: costChaos(cost, data, ctx)
  }))
  const prices = rows.map(r => r.chaos).filter((c): c is number => c != null)
  const side = f.s === 'p' ? 'prefix' : f.s === 's' ? 'suffix' : null
  const top = prices.length ? Math.max(...prices) : null
  const fmt = (c: number) => ctx.divine && c >= ctx.divine ? `${(c / ctx.divine).toFixed(1).replace(/\.0$/, '')} div` : c >= 10 ? `${Math.round(c)}c` : c >= 1 ? `${c.toFixed(1).replace(/\.0$/, '')}c` : `${c.toFixed(2).replace(/0$/, '')}c`
  return {
    id: `bench:${i}`,
    group: 'Crafting bench',
    name,
    sub: [tiers.length === 1 ? costText(tiers[0][1], data) : `${tiers.length} tiers`, side, top != null && tiers.length > 1 ? `up to ${fmt(top)}` : null].filter(Boolean).join(' · '),
    icon: 'fas fa-hammer',
    sections: [
      { text: [`Crafting bench${side ? ` · ${side}` : ''}${on ? ` · on ${on}` : ''}. Small text is where the recipe unlocks.`] },
      { table: { head: ['Roll', 'Cost', 'Price', 'Items'], priceAt: 2, rows } }
    ],
    actions: [{ label: 'Bench list on poedb', url: 'https://poedb.tw/us/Crafting_Bench' }]
  }
}

// A shorter name for a Harvest craft; the card shows the full text.
export function harvestName (text: string): string {
  let m = text.match(/^Reforge an? (Influenced )?Rare item with random modifiers, including an? (\w+) modifier$/)
  if (m) return `Reforge ${m[1] ? 'influenced ' : ''}with ${/^[AEIOU]/.test(m[2]) ? 'an' : 'a'} ${m[2]} modifier`
  m = text.match(/^Change a modifier that grants (.+?) into a similar-tier modifier that grants (.+)$/)
  if (m) return `${m[1]} mod to ${m[2]}`
  m = text.match(/^Add a new (\w+) modifier and remove another random modifier/)
  if (m) return `Add ${/^[AEIOU]/.test(m[1]) ? 'an' : 'a'} ${m[1]} mod, remove one`
  m = text.match(/^Enchant an? (.+?)\. Quality does not increase its [^,]+, (?:grants |has )?(.+)$/)
  if (m) return `${m[1]} enchant: ${m[2]}`
  m = text.match(/^Change a stack of (.+?) into/)
  if (m) return `Change ${m[1]}`
  return text.split('. ')[0]
}

function harvestCard (text: string, cost: Cost, data: CraftData, ctx: LookupContext, i: number): LookupCard {
  const total = costChaos(cost, data, ctx)
  const rows: LookupRow[] = cost.map(([n, c]) => {
    const each = ctx.price(data.cur[c])
    return { label: `${qty(n)} × ${data.cur[c]}`, chaos: each == null ? null : n * each, item: { name: data.cur[c] } }
  })
  if (cost.length > 1) rows.push({ label: 'Total', chaos: total })
  return {
    id: `harvest:${i}`,
    group: 'Harvest crafts',
    name: harvestName(text),
    title: harvestName(text),
    sub: costText(cost, data),
    icon: 'fas fa-seedling',
    sections: [
      { text: [text] },
      { label: 'Cost', rows }
    ],
    actions: [{ label: 'Harvest crafts on poedb', url: 'https://poedb.tw/us/Horticrafting' }]
  }
}

function hintCard (only: 'bench' | 'harvest'): LookupCard {
  return only === 'harvest'
    ? { id: 'harvest:hint', group: 'Harvest crafts', name: 'Harvest crafts', sub: 'Add a word: speed, swap, fossil', icon: 'fas fa-seedling', sections: [{ text: ['Add what you want to do: "harvest speed", "cold to fire", "harvest fossil", "harvest enchant".'] }], actions: [{ label: 'Harvest crafts on poedb', url: 'https://poedb.tw/us/Horticrafting' }] }
    : { id: 'bench:hint', group: 'Crafting bench', name: 'Crafting bench', sub: 'Add a mod: life, fire res, 6 link', icon: 'fas fa-hammer', sections: [{ text: ['Add the mod: "bench life", "fire res ring", "6 link", "prefixes cannot".'] }], actions: [{ label: 'Bench list on poedb', url: 'https://poedb.tw/us/Crafting_Bench' }] }
}

export function craftLookup (data: CraftData | null): Lookup {
  // Each tier's words, once: a match is within one tier's text.
  const benchHay = data?.bench.map(f => f.r.map(r => words(r[0]))) ?? []
  const harvestHay = data?.harvest.map(h => words(h[0])) ?? []
  return (raw, ctx) => {
    if (!data) return []
    const q = parseQuery(raw)
    if (!q.words.length) return q.only && !q.classes && raw.trim().split(/\s+/).length === 1 ? [hintCard(q.only)] : []
    // One letter is too little; three letters in all at least, unless a trigger word says crafting.
    if (q.words.some(w => w.length < 2 && !/\d/.test(w))) return []
    if (!q.only && q.words.join('').length < 3) return []
    const cards: LookupCard[] = []
    if (q.only !== 'harvest') {
      const find = (qw: string[], classes: string[] | null) => {
        const hits: Array<{ i: number, rank: number, tiers: CraftData['bench'][number]['r'] }> = []
        data.bench.forEach((f, i) => {
          if (!benchHay[i].some(hay => matches(hay, qw, q.ordered))) return
          const tiers = classes ? f.r.filter(r => r[2].some(c => classes.includes(data.cls[c]))) : f.r
          if (!tiers.length) return
          const name = words(f.f)
          // Words in the family's own name first, then shorter names.
          hits.push({ i, tiers, rank: (matches(name, qw) ? 0 : 200) + name.length })
        })
        return hits
      }
      let classes = q.classes
      let hits = find(q.words, classes)
      // Nothing for that item: maybe the item word was part of the mod.
      if (!hits.length && classes) {
        classes = null
        hits = find([...q.words, ...q.itemWords], null)
      }
      const on = classes ? itemText(classes).toLowerCase() : null
      hits.sort((a, b) => a.rank - b.rank).slice(0, q.only === 'bench' ? 12 : 4).forEach(h => cards.push(benchCard(data.bench[h.i], h.tiers, data, ctx, h.i, on)))
    }
    if (q.only !== 'bench' && !q.classes) {
      data.harvest
        .map((h, i) => ({ h, i }))
        .filter(x => matches(harvestHay[x.i], q.words, q.ordered))
        .sort((a, b) => a.h[0].length - b.h[0].length)
        // Every swap for an element is 8 cards (4 damage, 4 resistance): show them all.
        .slice(0, q.only === 'harvest' ? 16 : 10)
        .forEach(x => cards.push(harvestCard(x.h[0], x.h[1], data, ctx, x.i)))
    }
    return cards
  }
}
