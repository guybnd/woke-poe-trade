// Every flip the panel prices. Recipes and costs: poewiki.net's Vendor recipe
// system and Harvest crafting pages.
import { averageWeight, buyList, familyQuotes, flipModel, flipRange, upgradeRows } from './calc'
import type { ExchangeQuotes, FlipModel, FlipOptions, FlipRecipe, FlipRow, ItemWeight, Quote, RangeRow, UpgradeRow, WeightSource } from './calc'
import { CATALYST_WEIGHTS, DEAFENING_ESSENCE_WEIGHTS, DELIRIUM_WEIGHTS, FOSSIL_WEIGHTS, RUNEGRAFT_WEIGHTS } from './family-weights'
import type { PriceItem } from '../market/types'

export type Lifeforce = 'Wild' | 'Vivid' | 'Primal'
export type FlipMethodId = 'vendor' | 'harvest' | 'upgrade'

// The wiki lists 30 lifeforce for these crafts, "proportional to stack size".
export const DEFAULT_LIFEFORCE_PER_ITEM = 30

// A typed lifeforce cost. Blank, zero or negative go back to the listed cost:
// lifeforce is never free, and an old build could save a cleared field as 0.
export function parseLifeforce (value: string | number): number | undefined {
  const cost = Number(value)
  return cost > 0 ? cost : undefined
}

export interface FlipMethod {
  id: FlipMethodId
  label: string
  // Harvest: which lifeforce it spends. Inputs: 1 per craft, 3 per recipe.
  lifeforce?: Lifeforce
  inputs: number
  excludeInput: boolean
}

export interface FlipFamily {
  id: string
  label: string
  // "orb": "9 orbs worth rerolling".
  noun: string
  // poe.ninja's overview type, which also names its exchange feed.
  ninjaType: string
  match: (name: string) => boolean
  methods: FlipMethod[]
  // Items a flip can give. Missing: everything the family matches.
  pool?: (name: string) => boolean
  weights?: Record<string, number>
  weightOf?: (name: string) => ItemWeight | null
  // Items with no measured weight take the average of the rest.
  estimateMissing?: boolean
  // Weights in the list above that are stand-ins, not measurements.
  estimated?: string[]
  rareShare: number | null
  // Lines of items from lowest tier to highest, for the 'upgrade' method.
  chains?: string[][]
  // Where the weights come from, for the footer.
  source: string
  // The same in a few words, for a row in Settings.
  sourceShort?: string
  lowConfidence?: string
  // No one has measured the odds: the panel shows each recipe's worst and best
  // result, never an average, until you set your own weights in Settings.
  unmeasured?: boolean
  // An item that opens to a random one of the family, priced as the average.
  opener?: string
}

const vendor3 = (excludeInput: boolean): FlipMethod => ({ id: 'vendor', label: 'Vendor 3 for 1', inputs: 3, excludeInput })
const harvest = (lifeforce: Lifeforce): FlipMethod => ({ id: 'harvest', label: 'Harvest reroll', lifeforce, inputs: 1, excludeInput: true })
const upgrade: FlipMethod = { id: 'upgrade', label: 'Vendor up a tier', inputs: 3, excludeInput: false }

const OIL_TIERS = ['Clear', 'Sepia', 'Amber', 'Verdant', 'Teal', 'Azure', 'Indigo', 'Violet', 'Crimson', 'Black', 'Opalescent', 'Silver', 'Golden']
const ESSENCE_TIERS = ['Whispering', 'Muttering', 'Weeping', 'Wailing', 'Screaming', 'Shrieking', 'Deafening']
// The essence sample rerolled Doubt, so it never came up as a result there. It
// takes the average weight. Hysteria, Insanity, Horror and Delirium stay out:
// they have no tier, so neither a reroll nor a tier upgrade can give them.
const SAMPLED_ESSENCES = Object.values(DEAFENING_ESSENCE_WEIGHTS)
const ESSENCE_WEIGHTS: Record<string, number> = {
  ...DEAFENING_ESSENCE_WEIGHTS,
  'Deafening Essence of Doubt': SAMPLED_ESSENCES.reduce((n, w) => n + w, 0) / SAMPLED_ESSENCES.length
}
const ESSENCE_TYPES = Object.keys(ESSENCE_WEIGHTS).map(n => n.replace('Deafening Essence of ', ''))

// poewiki's drop-disabled Delirium Orbs as of 3.30.
const RETIRED_DELIRIUM = new Set(['Abyssal', 'Challenging', 'Foreboding', 'Fossilised', 'Fragmented', 'Imperial', 'Kalguuran', 'Obscured', 'Portentous', 'Primal', 'Skittering', 'Timeless'].map(n => `${n} Delirium Orb`))

export const FAMILIES: FlipFamily[] = [
  {
    id: 'threads',
    label: 'Threads',
    noun: 'thread',
    ninjaType: 'Thread',
    // Frayed Thread opens to a random Thread but isn't one, and has no price.
    match: name => name.endsWith(' Thread') && name !== 'Frayed Thread',
    // 3.30.0c added a vendor recipe for Threads. Taken to work like the scarab
    // one it replaces: 3 in, 1 of a different type back.
    methods: [vendor3(true)],
    // No one has measured the recipe yet: the panel shows the range of results,
    // and with your own weights, every Thread you left alone counts as 1.
    unmeasured: true,
    weightOf: () => ({ weight: 1, source: 'estimate' }),
    rareShare: null,
    sourceShort: 'None measured',
    source: 'Weights: none measured yet, so every Thread counts as equally likely.',
    lowConfidence: 'Low confidence: no measured weights yet, so the average leans on your own weights from Settings.',
    opener: 'Frayed Thread'
  },
  {
    id: 'catalysts',
    label: 'Catalysts',
    noun: 'catalyst',
    ninjaType: 'Currency',
    // Tainted, Sinistral and Dextral can't come out of a recipe or a reroll.
    match: name => name.endsWith(' Catalyst') && !/^(Tainted|Sinistral|Dextral) /.test(name),
    // The vendor recipe says only "random", so the same type can come back.
    methods: [vendor3(false), harvest('Vivid')],
    weights: CATALYST_WEIGHTS,
    sourceShort: 'PoeData 3.25',
    rareShare: null,
    source: 'Weights: PoeData.dev, 6 datasets, version 3.25.'
  },
  {
    id: 'delirium',
    label: 'Delirium',
    noun: 'orb',
    ninjaType: 'DeliriumOrb',
    // Orbs 3.30 stopped dropping can still be priced in Standard, but a
    // reroll can't give them.
    match: name => name.endsWith(' Delirium Orb') && !RETIRED_DELIRIUM.has(name),
    methods: [harvest('Primal')],
    weights: DELIRIUM_WEIGHTS,
    sourceShort: 'PoeData 3.22',
    estimateMissing: true,
    rareShare: null,
    source: 'Weights: PoeData.dev, 5 datasets, version 3.22, cut to the 11 orbs that drop in 3.30. Threaded is the renamed Skittering, with its weight.'
  },
  {
    id: 'fossils',
    label: 'Fossils',
    noun: 'fossil',
    ninjaType: 'Fossil',
    match: name => name.endsWith(' Fossil'),
    methods: [harvest('Wild')],
    weights: FOSSIL_WEIGHTS,
    sourceShort: 'PoeData 3.19',
    rareShare: 0.005,
    source: 'Weights: PoeData.dev, 9 datasets, version 3.19.'
  },
  {
    id: 'essences',
    label: 'Essences',
    noun: 'essence',
    ninjaType: 'Essence',
    match: name => name.includes('Essence of '),
    methods: [harvest('Primal'), upgrade],
    pool: name => name.startsWith('Deafening '),
    weights: ESSENCE_WEIGHTS,
    sourceShort: 'PoeData 3.20',
    estimated: ['Deafening Essence of Doubt'],
    rareShare: null,
    chains: ESSENCE_TYPES.map(type => ESSENCE_TIERS.map(tier => `${tier} Essence of ${type}`)),
    source: 'Rerolls keep the tier, so only Deafening is priced. Weights: PoeData.dev, 1 dataset, version 3.20. That sample rerolled Doubt, so Doubt uses the average weight.'
  },
  {
    id: 'oils',
    label: 'Oils',
    noun: 'oil',
    ninjaType: 'Oil',
    match: name => name.endsWith(' Oil'),
    methods: [upgrade],
    rareShare: null,
    chains: [OIL_TIERS.map(tier => `${tier} Oil`)],
    source: 'The result is known, so no weights are involved. Harvest oil rerolls are left out: there are no public colour weights.'
  },
  {
    id: 'runegrafts',
    label: 'Runegrafts',
    noun: 'runegraft',
    ninjaType: 'Runegraft',
    match: name => name.startsWith('Runegraft of '),
    methods: [vendor3(false)],
    weights: RUNEGRAFT_WEIGHTS,
    sourceShort: 'PoeData 3.27',
    estimateMissing: true,
    rareShare: null,
    source: 'Weights: PoeData.dev, 1 dataset, version 3.27.',
    lowConfidence: 'Low confidence: thin trading, one sample, and much of the average rests on a few very expensive results.'
  }
]

// The tab already says the family, so rows can drop it.
export function shortName (name: string): string {
  return name
    .replace(/ (Delirium Orb|Fossil|Catalyst|Thread)$/, '')
    .replace(/^(\S+) Essence of /, '$1 ')
    .replace(/^Runegraft of (the )?/, '')
}

export function familyById (id: string | undefined): FlipFamily {
  return FAMILIES.find(f => f.id === id) ?? FAMILIES[0]
}

// A stash tab the reader knows but Flips no longer prices (the old Scarab tab).
export function knownFamily (id: string | undefined): FlipFamily | null {
  return FAMILIES.find(f => f.id === id) ?? null
}

// The families poe.ninja prices in this league. League items like Runegrafts
// come and go, so a family with no prices gets
// no tab. With no prices at all yet, every family stays, so the panel can still
// say what it is waiting for.
export function pricedFamilies (items: PriceItem[] | null | undefined): FlipFamily[] {
  if (!items?.length) return FAMILIES
  const priced = FAMILIES.filter(f => items.some(i => i.type === f.ninjaType && f.match(i.name)))
  return priced.length ? priced : FAMILIES
}

// The picked family, or the first priced one when the picked one has no prices.
export function shownFamily (id: string | undefined, families: FlipFamily[]): FlipFamily {
  return families.find(f => f.id === id) ?? families[0] ?? familyById(id)
}

// Chaos for one Harvest craft on one item, or null with no lifeforce price.
export function harvestCost (method: FlipMethod, lifeforcePerItem: number, items: PriceItem[], currency: Map<string, Quote> | null): number | null {
  if (!method.lifeforce) return 0
  const name = `${method.lifeforce} Crystallised Lifeforce`
  const chaos = currency?.get(name)?.chaos ?? items.find(i => i.name === name)?.chaos
  return chaos ? chaos * Math.max(0, lifeforcePerItem) : null
}

// Your own weights, by family and item name. 0: it never comes up.
export type WeightOverrides = Record<string, Record<string, number>>

function measuredWeight (family: FlipFamily, name: string): ItemWeight | null {
  if (family.weightOf) return family.weightOf(name)
  const weight = family.weights?.[name]
  if (weight == null) return null
  return { weight, source: family.estimated?.includes(name) ? 'estimate' : 'sample' }
}

function ownWeight (own: Record<string, number> | undefined, name: string): number | null {
  const weight = own?.[name]
  return typeof weight === 'number' && Number.isFinite(weight) && weight >= 0 ? weight : null
}

export function flipRecipe (family: FlipFamily, method: FlipMethod, cost: number, own?: Record<string, number>): FlipRecipe {
  return {
    inputs: method.inputs,
    cost,
    excludeInput: method.excludeInput,
    rareShare: family.rareShare,
    estimateMissing: family.estimateMissing,
    listedOf: name => measuredWeight(family, name),
    weightOf: (name) => {
      const weight = ownWeight(own, name)
      return weight != null ? { weight, source: 'yours' } : measuredWeight(family, name)
    }
  }
}

export type Exchanges = Map<string, ExchangeQuotes | null>

// What the panel and Ctrl+Space say instead of an average.
export const RANGE_NOTE = 'No one has measured the odds yet, so this shows the worst and best result, not an average. Set your own weights in Settings for one.'

// True when the family's odds are unmeasured and you haven't set any of your own.
export function rangeOnly (family: FlipFamily, own?: Record<string, number>): boolean {
  if (!family.unmeasured) return false
  return !Object.keys(own ?? {}).some(name => ownWeight(own, name) != null)
}

export type FlipResult =
  | { kind: 'pool', model: FlipModel, quotes: Map<string, Quote>, cost: number }
  // Unmeasured odds: each input's cost against its worst and best result.
  | { kind: 'range', rows: RangeRow[], quotes: Map<string, Quote>, cost: number }
  | { kind: 'upgrade', rows: UpgradeRow[] }
  // A Harvest flip with no lifeforce price to work out its cost.
  | { kind: 'no-cost' }
  // The family has prices, but none this flip can use.
  | { kind: 'no-pool' }

// One flip priced with the current prices and options; null with no prices.
export function priceFlip (
  family: FlipFamily,
  method: FlipMethod,
  items: PriceItem[],
  exchanges: Exchanges,
  options: FlipOptions,
  lifeforcePerItem: number,
  weights?: WeightOverrides,
  hideUntraded = true
): FlipResult | null {
  const all = familyQuotes(items, family.ninjaType, family.match, exchanges.get(family.ninjaType) ?? null)
  if (!all.size) return null
  if (method.id === 'upgrade') {
    return { kind: 'upgrade', rows: upgradeRows(all, family.chains ?? [], options.sellDiscount) }
  }
  const quotes = family.pool ? new Map([...all].filter(([name]) => family.pool!(name))) : all
  if (!quotes.size) return { kind: 'no-pool' }
  const cost = harvestCost(method, lifeforcePerItem, items, exchanges.get('Currency') ?? null)
  if (cost == null) return { kind: 'no-cost' }
  if (rangeOnly(family, weights?.[family.id])) {
    return { kind: 'range', rows: flipRange(quotes, { inputs: method.inputs, cost, excludeInput: method.excludeInput }, options.sellDiscount, hideUntraded), quotes, cost }
  }
  return { kind: 'pool', model: flipModel(quotes, options, flipRecipe(family, method, cost, weights?.[family.id])), quotes, cost }
}

export interface BestFlip {
  family: FlipFamily
  method: FlipMethod
  name: string
  // The item to buy, when the name describes a recipe.
  item: string
  profitEach: number
  // Null when the family's volume feed is missing.
  profitPerDay: number | null
}

// The flip with the biggest supply of profit, for the dock card. Without volume
// a flip ranks by its profit per item, below any flip that has volume. Low-confidence
// families stay out.
export function bestFlip (items: PriceItem[], exchanges: Exchanges, options: FlipOptions, lifeforcePerItem: number, weights?: WeightOverrides): BestFlip | null {
  let best: BestFlip | null = null
  const beats = (a: BestFlip, b: BestFlip) => {
    if ((a.profitPerDay != null) !== (b.profitPerDay != null)) return a.profitPerDay != null
    return a.profitPerDay != null ? a.profitPerDay > b.profitPerDay! : a.profitEach > b.profitEach
  }
  for (const family of FAMILIES) {
    if (family.lowConfidence) continue
    for (const method of family.methods) {
      const flip = priceFlip(family, method, items, exchanges, options, lifeforcePerItem, weights)
      if (flip?.kind !== 'pool' && flip?.kind !== 'upgrade') continue
      const rows = flip.kind === 'pool' ? flip.model.rows : flip.rows
      const top = buyList<FlipRow | UpgradeRow>(rows, true)[0]
      if (!top) continue
      const candidate = { family, method, name: top.name, item: 'from' in top ? top.from : top.name, profitEach: top.profitEach, profitPerDay: top.profitPerDay }
      if (!best || beats(candidate, best)) best = candidate
    }
  }
  return best
}

// Part of a family's sampled weight on items poe.ninja doesn't price, which
// therefore sit out of the pool. High means the average may be off.
export function unpricedShare (family: FlipFamily, priced: Map<string, Quote>): number {
  if (!family.weights) return 0
  let total = 0
  let missing = 0
  for (const [name, weight] of Object.entries(family.weights)) {
    total += weight
    if (!priced.has(name)) missing += weight
  }
  return total ? missing / total : 0
}

export interface WeightRow {
  name: string
  // Null: no weight, so it sits out of the flip.
  percent: number | null
  source: WeightSource | null
}

// A family's items with the weight each one flips with. Null: it sits out.
function familyWeights (family: FlipFamily, names: string[], own?: Record<string, number>) {
  const recipe = flipRecipe(family, family.methods[0], 0, own)
  const live = names.filter(name => family.match(name) && (!family.pool || family.pool(name))).sort((a, b) => a.localeCompare(b, 'en'))
  const known = live.map(name => ({ name, found: recipe.weightOf(name) }))
  const rated = known.flatMap(k => k.found ? [k.name] : [])
  const average = family.estimateMissing && rated.length ? averageWeight(rated, recipe) : null
  return known.map(({ name, found }) => ({
    name,
    weight: found?.weight ?? average,
    source: found?.source ?? (average != null ? 'estimate' as const : null)
  }))
}

// What the Settings list shows: each item as a share of the results.
export function weightRows (family: FlipFamily, names: string[], own?: Record<string, number>): WeightRow[] {
  const items = familyWeights(family, names, own)
  const total = items.reduce((n, i) => n + (i.weight ?? 0), 0)
  return items.map(({ name, weight, source }) => ({ name, source, percent: weight != null && total > 0 ? weight / total * 100 : null }))
}

// The weight that makes `name` this share of the results, under 100%, the rest staying as they are.
export function weightForPercent (family: FlipFamily, names: string[], own: Record<string, number> | undefined, name: string, percent: number): number {
  const others = familyWeights(family, names, own).reduce((n, i) => n + (i.name === name ? 0 : i.weight ?? 0), 0)
  return percent * others / (100 - percent)
}
