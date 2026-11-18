// NeverSink's "cluster jewels by price" rules ([2705], $type->jewels->clustereco)
// follow poe.ninja: each rule is one size, passive count and item level band,
// and names the passive types (EnchantmentPassiveNode) worth showing there.
// NeverSink ships that list frozen at its release; this rewrites it from
// today's prices, with your own picks on top.
import { CLUSTER_TYPES } from '../cluster-type/types'
import type { ClusterSize } from '../cluster-type/types'
import type { FilterBlock, FilterDoc } from './parse'
import { numberChecks } from './numbers'

export const CLUSTER_PRICE_TYPE = 'jewels->clustereco'

// One poe.ninja ClusterJewel line: name is the enchant text, variant
// "8 passives", levelRequired the item level it rolled at (1, 50, 68, 75, 84).
export interface NinjaClusterLine {
  name: string
  baseType: string
  variant: string
  levelRequired: number
  chaosValue: number
  listingCount?: number
}

export interface ClusterPrice {
  size: ClusterSize
  passives: number
  ilvl: number
  node: string
  chaos: number
  listings: number
}

// Your say per passive type and size: always top, always good, or never.
export type ClusterPin = 'top' | 'good' | 'never'

export interface ClusterPriceSettings {
  on: boolean
  // Worth at least this many chaos: the top rule (t1), then the good one (t2).
  top: number
  good: number
  // `${size}|${node}` → pin.
  pins: Record<string, ClusterPin>
}

export const DEFAULT_CLUSTER_PRICES: ClusterPriceSettings = { on: true, top: 100, good: 15, pins: {} }

// Fewer listings than this and a price is a guess.
export const MIN_LISTINGS = 5

const PREFIX = 'Added Small Passive Skills grant: '

// Enchant text as poe.ninja writes it ("Minions deal 10% increased Damage")
// → the game's passive type name ("Minion Damage"), which the filter uses.
const NODE_OF_TEXT: Map<string, { size: ClusterSize, node: string }> = (() => {
  const m = new Map<string, { size: ClusterSize, node: string }>()
  for (const size of Object.keys(CLUSTER_TYPES) as ClusterSize[]) {
    for (const t of CLUSTER_TYPES[size]) {
      const lines = t.enchants.map(e => e.replace(PREFIX, ''))
      m.set(`${size}|${lines.join(', ')}`, { size, node: t.name })
      m.set(`${size}|${[...lines].reverse().join(', ')}`, { size, node: t.name })
    }
  }
  return m
})()

export function sizeOf (baseType: string): ClusterSize | null {
  const m = /^(Small|Medium|Large) Cluster Jewel$/.exec(baseType)
  return m ? m[1] as ClusterSize : null
}

export function readClusterLines (lines: NinjaClusterLine[]): ClusterPrice[] {
  const out: ClusterPrice[] = []
  for (const l of lines) {
    const size = sizeOf(l.baseType)
    const passives = Number(/^(\d+) passives?$/.exec(l.variant ?? '')?.[1])
    if (!size || !passives || typeof l.chaosValue !== 'number' || typeof l.levelRequired !== 'number') continue
    const hit = NODE_OF_TEXT.get(`${size}|${l.name}`)
    if (!hit) continue
    out.push({ size, passives, ilvl: l.levelRequired, node: hit.node, chaos: l.chaosValue, listings: l.listingCount ?? 0 })
  }
  return out
}

// The poe.ninja band an item level falls in: its rows are at 1, 50, 68, 75, 84.
export function ninjaBand (ilvl: number, bands: number[]): number | null {
  const below = bands.filter(b => b <= ilvl)
  return below.length ? Math.max(...below) : null
}

// Passive counts each size rolls with.
const PASSIVES: Record<ClusterSize, [number, number]> = { Small: [2, 3], Medium: [4, 6], Large: [8, 12] }

export interface RuleKey {
  size: ClusterSize
  // The passive counts it catches (Medium "<= 5" is 4 and 5), highest first.
  passives: number[]
  // Lowest item level.
  ilvl: number
}

// A price rule's own numbers: size, passive counts, lowest item level.
export function ruleKey (b: Pick<FilterBlock, 'conditions'>): RuleKey | null {
  const base = b.conditions.find(c => c.key === 'BaseType')?.values
  const size = base?.length === 1 ? sizeOf(base[0]) : null
  if (!size) return null
  const nums = numberChecks(b.conditions).filter(c => c.key === 'EnchantmentPassiveNum')
  if (!nums.length) return null
  let [lo, hi] = PASSIVES[size]
  for (const c of nums) {
    if (c.bound === 'exact') { lo = Math.max(lo, c.value); hi = Math.min(hi, c.value) }
    if (c.bound === 'min') lo = Math.max(lo, c.value)
    if (c.bound === 'max') hi = Math.min(hi, c.value)
  }
  if (lo > hi) return null
  const passives: number[] = []
  for (let n = hi; n >= lo; n--) passives.push(n)
  const ilvl = numberChecks(b.conditions).find(c => c.key === 'ItemLevel' && c.bound === 'min')?.value ?? 1
  return { size, passives, ilvl }
}

// What a passive type is worth on a rule: the best over the counts it catches.
export function priceOnRule (prices: ClusterPrice[], key: RuleKey, node: string): number | null {
  const bands = [...new Set(prices.map(p => p.ilvl))]
  const band = ninjaBand(key.ilvl, bands)
  const hits = prices.filter(p => p.size === key.size && key.passives.includes(p.passives) && p.ilvl === band && p.node === node && p.listings >= MIN_LISTINGS)
  return hits.length ? Math.max(...hits.map(p => p.chaos)) : null
}

// t1, t2 from NeverSink's tier name ("n12_i84_t1").
export function rankOf (tier: string | null | undefined): 1 | 2 | null {
  const m = /_t([12])$/.exec(tier ?? '')
  return m ? Number(m[1]) as 1 | 2 : null
}

export interface ClusterRulePlan {
  block: FilterBlock
  rank: 1 | 2
  nodes: string[]
  // What each named type is worth there (null: picked by you, unpriced).
  prices: Record<string, number | null>
}

// For each price rule, which passive types it should name.
export function planClusterRules (doc: FilterDoc, prices: ClusterPrice[], s: ClusterPriceSettings): ClusterRulePlan[] {
  const bands = [...new Set(prices.map(p => p.ilvl))].sort((a, b) => a - b)
  const out: ClusterRulePlan[] = []
  for (const block of doc.blocks) {
    if (block.type !== CLUSTER_PRICE_TYPE) continue
    const rank = rankOf(block.tier)
    const key = ruleKey(block)
    if (!rank || !key) continue
    const band = ninjaBand(key.ilvl, bands)
    const priceOf = new Map<string, number>()
    for (const p of prices) {
      if (p.size !== key.size || !key.passives.includes(p.passives) || p.ilvl !== band || p.listings < MIN_LISTINGS) continue
      priceOf.set(p.node, Math.max(priceOf.get(p.node) ?? 0, p.chaos))
    }
    const nodes = new Set<string>()
    // No usable price for this rule at all (a band poe.ninja hasn't priced,
    // only thin listings, a league's first days): that isn't "worth nothing",
    // so NeverSink's own list stands, with your picks on it.
    if (!priceOf.size) {
      for (const node of block.conditions.find(c => c.key === 'EnchantmentPassiveNode')?.values ?? []) {
        if (!s.pins[`${key.size}|${node}`]) nodes.add(node)
      }
    }
    // t2 lists t1's types too, as NeverSink does: a top rule you turn off
    // leaves its types to the good one, not to the plain cluster rules.
    for (const [node, chaos] of priceOf) {
      if (s.pins[`${key.size}|${node}`]) continue
      if (rank === 1 ? chaos >= s.top : chaos >= s.good) nodes.add(node)
    }
    for (const [k, pin] of Object.entries(s.pins)) {
      const [size, node] = k.split('|')
      if (size !== key.size) continue
      if ((pin === 'top' && (rank === 1 || rank === 2)) || (pin === 'good' && rank === 2)) nodes.add(node)
    }
    const list = [...nodes].sort((a, b) => a.localeCompare(b))
    out.push({ block, rank, nodes: list, prices: Object.fromEntries(list.map(n => [n, priceOf.get(n) ?? null])) })
  }
  return out
}

// Rewrites the price rules in `doc`: each names what its plan says, and one
// with nothing to name is commented out (an empty list is a syntax error).
// Returns how many rules changed.
export function applyClusterPrices (doc: FilterDoc, prices: ClusterPrice[], s: ClusterPriceSettings): number {
  if (!s.on || !prices.length) return 0
  let changed = 0
  for (const p of planClusterRules(doc, prices, s)) {
    const b = p.block
    // Off with a list of its own: the strictness level turned it off, not an
    // empty list. That stays as NeverSink has it.
    if (b.disabled && b.raw.some(l => /EnchantmentPassiveNode\s/.test(l))) continue
    const was = JSON.stringify([b.disabled, b.conditions.find(c => c.key === 'EnchantmentPassiveNode')?.values ?? []])
    if (!p.nodes.length) {
      b.disabled = true
    } else {
      const c = b.conditions.find(x => x.key === 'EnchantmentPassiveNode')
      if (c) c.values = p.nodes
      else b.conditions.push({ key: 'EnchantmentPassiveNode', op: '==', count: null, values: p.nodes })
      b.disabled = false
    }
    if (JSON.stringify([b.disabled, b.conditions.find(c => c.key === 'EnchantmentPassiveNode')?.values ?? []]) !== was) {
      b.dirty = true
      changed++
    }
  }
  return changed
}

export function normalizeClusterPrices (v: unknown): ClusterPriceSettings {
  const d = DEFAULT_CLUSTER_PRICES
  const x = (v && typeof v === 'object' ? v : {}) as Partial<ClusterPriceSettings>
  const num = (n: unknown, dflt: number) => typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.min(100000, n) : dflt
  const pins: Record<string, ClusterPin> = {}
  if (x.pins && typeof x.pins === 'object') {
    for (const [k, p] of Object.entries(x.pins)) {
      // Only the game's own passive types: a pin's name goes into the filter.
      const [size, node] = k.split('|') as [ClusterSize, string]
      if ((p === 'top' || p === 'good' || p === 'never') && (size in PASSIVES) && nodesOf(size).includes(node)) pins[k] = p
    }
  }
  const top = num(x.top, d.top)
  return { on: typeof x.on === 'boolean' ? x.on : d.on, top, good: Math.min(num(x.good, d.good), top), pins }
}

// Every passive type a size can have, for the pick list.
export function nodesOf (size: ClusterSize): string[] {
  return CLUSTER_TYPES[size].map(t => t.name).filter(n => !/\(Legacy\)$/.test(n))
}
