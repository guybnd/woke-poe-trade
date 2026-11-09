// Economy tiering: re-sorts the price-driven NeverSink groups (currency,
// cards, uniques, scarabs, essences...) from today's poe.ninja prices.
//
// The price bands come from the filter itself: each tier's band is centred on
// the median price of the items NeverSink put there, and the boundary between
// two tiers is the geometric mean of their medians. That keeps NeverSink's own
// idea of what "t2 currency" means while following the league's prices.
//
// Guards so labels don't change for bad reasons:
//  - items with gaps in their price history (thin, easy to fake) never move;
//  - items you moved yourself are locked;
//  - an item has to clear a boundary by a buffer before it moves, so a price
//    sitting on a line doesn't flip back and forth every day. Going down takes
//    a bigger move (50%) than going up (20%): a wrong step down can hide a
//    drop, and a wrong step up only costs a click;
//  - a price that jumped or crashed this week (volatile) waits;
//  - groups whose tiers aren't ordered by price are left alone.
import type { FilterBlock, FilterDoc } from './parse'
import { applyEdits, blockHasBase, blocksOf } from './edits'
import type { FilterEdit } from './edits'
import type { PriceItem } from '../market/types'
import { isThin } from '../market/types'

export interface EconomyGroup {
  // NeverSink's $type tag.
  type: string
  label: string
  // poe.ninja overview types priced for this group.
  ninja: string[]
  // Bases hold several uniques; the price is judged over all of them.
  unique?: boolean
  // Extra non-`tN` tiers that take part, with their rank.
  extraTiers?: Record<string, number>
}

const UNIQUE_TYPES = ['UniqueArmour', 'UniqueWeapon', 'UniqueAccessory', 'UniqueJewel', 'UniqueFlask', 'UniqueRelic', 'UniqueTincture']

export const ECONOMY_GROUPS: EconomyGroup[] = [
  { type: 'currency', label: 'Currency', ninja: ['Currency'] },
  { type: 'divination', label: 'Divination cards', ninja: ['DivinationCard'] },
  { type: 'uniques', label: 'Uniques', ninja: UNIQUE_TYPES, unique: true, extraTiers: { hideable: 4 } },
  { type: 'fragments->scarabs', label: 'Scarabs', ninja: ['Scarab'] },
  { type: 'fragments', label: 'Fragments', ninja: ['Fragment'] },
  { type: 'currency->essence', label: 'Essences', ninja: ['Essence'] },
  // NeverSink tiers resonators together with fossils.
  { type: 'currency->fossil', label: 'Fossils and resonators', ninja: ['Fossil', 'Resonator'] },
  { type: 'currency->oil', label: 'Oils', ninja: ['Oil'] },
  { type: 'currency->deliriumorbs', label: 'Delirium orbs', ninja: ['DeliriumOrb'] },
  { type: 'currency->trial->omen', label: 'Omens', ninja: ['Omen'] },
  { type: 'currency->trial->tattoo', label: 'Tattoos', ninja: ['Tattoo'] },
  { type: 'currency->ducats', label: 'Ducats', ninja: ['Ducat'] }
]

// What the net and the health list look at: the same, plus items that have an
// exact price but no price tiers to move between. NeverSink keeps astrolabes,
// invitations, embers and more inside other groups' rules. Gems, cluster jewels,
// maps and rares have no one price for a base, so no net can judge them.
export const NET_GROUPS: EconomyGroup[] = [
  ...ECONOMY_GROUPS.map(g => {
    if (g.type === 'currency') return { ...g, ninja: ['Currency', 'Astrolabe', 'EnshroudingCrystal', 'Artifact', 'Fragment'] }
    if (g.type === 'fragments') return { ...g, ninja: ['Fragment', 'Invitation', 'AllflameEmber'] }
    return g
  }),
  { type: 'vials', label: 'Vials', ninja: ['Vial'] },
  { type: 'corpses', label: 'Corpses', ninja: ['Corpse'] },
  { type: 'runesgrafts', label: 'Runegrafts', ninja: ['Runegraft'] },
  { type: 'miscmapitemsextra', label: 'Reliquary keys', ninja: ['Fragment'] }
]

export interface PricePoint {
  chaos: number
  thin: boolean
  // Jumped or crashed lately: a fixer's listing as often as a real move.
  volatile?: boolean
  // For uniques: which unique set the price.
  note?: string
}

// Price of a base type in one group, or null when poe.ninja has none.
export type PriceLookup = (group: EconomyGroup, base: string) => PricePoint | null

export type UniqueRule = 'max' | 'min'

// One price per (type, name, base). 5-link, 6-link and relic lines of uniques are
// not what drops. A plain line is the price; when there are only variants
// (passives on a cluster jewel, sockets, the base it rolled on), the drop could
// be any of them, so it's judged by the best.
//  - 'market': the best with a real market, for moving tiers.
//  - 'safety': the best of all, for never hiding what might be worth it.
type VariantRule = 'market' | 'safety'

function priceFinder (items: PriceItem[], rule: VariantRule = 'market') {
  const byName = new Map<string, PriceItem[]>()
  for (const i of items) {
    if (/\b[56]L\b|links?|^relic$/i.test(i.variant)) continue
    const key = `${i.type}\u0000${i.name}`
    const list = byName.get(key)
    if (list) list.push(i)
    else byName.set(key, [i])
  }
  const best = (list: PriceItem[]) => list.reduce((a, b) => b.chaos > a.chaos ? b : a)
  return (types: string[], name: string, base?: string) => {
    for (const t of types) {
      const lines = byName.get(`${t}\u0000${name}`)
      if (!lines) continue
      const plain = lines.find(i => !i.variant)
      if (plain) return plain
      // A unique that comes on several bases is priced per base.
      const onBase = base ? lines.filter(i => i.variant.split(', ').includes(base)) : []
      const pool = onBase.length ? onBase : lines
      const solid = rule === 'market' ? pool.filter(i => !isThin(i)) : []
      return best(solid.length ? solid : pool)
    }
    return undefined
  }
}

// Everything a base can be: for uniques each unique on it, priced or not.
export function priceBreakdown (
  items: PriceItem[],
  uniquesOnBase: (base: string) => string[]
) {
  const find = priceFinder(items, 'safety')
  return (group: EconomyGroup, base: string): Array<{ name: string, chaos: number | null, thin: boolean }> => {
    const names = group.unique ? uniquesOnBase(base).filter(name => !/^Replica /.test(name)) : [base]
    return names.map(name => {
      const hit = find(group.ninja, name, base)
      return { name, chaos: hit?.chaos ?? null, thin: hit ? isThin(hit) : false }
    })
  }
}

export function priceLookup (
  items: PriceItem[],
  uniquesOnBase: (base: string) => string[],
  rule: UniqueRule = 'max',
  variants: VariantRule = 'market'
): PriceLookup {
  const find = priceFinder(items, variants)
  return (group, base) => {
    if (!group.unique) {
      const hit = find(group.ninja, base)
      return hit ? { chaos: hit.chaos, thin: isThin(hit), volatile: isVolatile(hit) } : null
    }
    // Replicas have their own NeverSink blocks above the unique tiers, so
    // they never land in them and must not set the base's price.
    const priced = uniquesOnBase(base)
      .filter(name => !/^Replica /.test(name))
      .map(name => find(group.ninja, name, base))
      .filter((x): x is PriceItem => Boolean(x))
    if (!priced.length) return null
    // "max": the base is worth what its best unique is worth, so a valuable
    // unique is never hidden because it shares a base with junk.
    const pick = priced.reduce((a, b) => (rule === 'max' ? b.chaos > a.chaos : b.chaos < a.chaos) ? b : a)
    return { chaos: pick.chaos, thin: isThin(pick), volatile: isVolatile(pick), note: priced.length > 1 ? `${pick.name}, 1 of ${priced.length}` : pick.name }
  }
}

// Tripled or fell to a third within the week, or doubled or halved in a day.
export function isVolatile (i: { chaos: number, d1?: number, d7?: number }): boolean {
  const moved = (from: number | undefined, by: number) => from != null && from > 0 && (i.chaos / from >= by || i.chaos / from <= 1 / by)
  return moved(i.d7, 3) || moved(i.d1, 2)
}

// What the net and the health list judge by: always a base's best unique, and
// every variant counts, whatever you picked for moving tiers.
export function safetyLookup (items: PriceItem[], uniquesOnBase: (base: string) => string[]): PriceLookup {
  return priceLookup(items, uniquesOnBase, 'max', 'safety')
}

// ---- tiers ----

// Rank of a tier inside a price group (1 = most valuable), or null when the
// tier isn't a price tier (restex, exhide, tnew, t3stackedex, t4c...).
export function tierRank (tier: string, siblings: string[], group?: EconomyGroup): number | null {
  if (group?.extraTiers?.[tier] != null) return group.extraTiers[tier]
  const m = /^t(\d+)([a-z]*)$/.exec(tier)
  if (!m) return null
  const n = Number(m[1])
  if (!m[2]) return n
  if (/stack|ex$|boss|^c$/.test(m[2])) return null
  // "t4c" next to a plain "t4" is a variant tier, not the price tier.
  if (siblings.includes(`t${n}`)) return null
  // Two suffixed tiers with one number (t3annul, t3foo): ambiguous.
  if (siblings.filter(s => new RegExp(`^t${n}[a-z]+$`).test(s)).length > 1) return null
  return n
}

// NeverSink names some currency tiers after the orb that defines them
// (t4chaos, t5alchemy, t8trans...). That orb is the tier's yardstick, not an
// item priced into it, so prices never move it out: a cheap league would
// otherwise hide every Orb of Alchemy, and Chaos Orb is the price unit itself.
// Only tiers whose namesake still lives there: NeverSink 8.x keeps Divine in
// t1exalted, Exalted in t4chaos and Scrap in t7chance, so those names are
// history and don't count.
const TIER_NAMESAKES: Record<string, string> = {
  annul: 'Orb of Annulment',
  chaos: 'Chaos Orb',
  alchemy: 'Orb of Alchemy',
  chance: 'Orb of Chance',
  trans: 'Orb of Transmutation'
}

export function isTierNamesake (type: string, tier: string, base: string): boolean {
  if (type !== 'currency') return false
  const m = /^t\d+([a-z]+)$/.exec(tier)
  return m != null && TIER_NAMESAKES[m[1]] === base
}

// Stored moves that still apply (an old move of a namesake doesn't).
export function livePriceMoves<T extends { type: string, from: string, base: string }> (moves: T[]): T[] {
  return moves.filter(m => !isTierNamesake(m.type, m.from, m.base))
}

function baseTypeValues (b: FilterBlock): string[] {
  return b.conditions.find(c => c.key === 'BaseType' && c.op === '==')?.values ?? []
}

export interface TierBand {
  tier: string
  rank: number
  // Median price of its priced items (null: none priced, so it can't anchor).
  median: number | null
  priced: number
  bases: string[]
}

export interface PriceMove {
  type: string
  base: string
  from: string
  to: string
  chaos: number
  note?: string
  // The tier it goes to is hidden at this strictness.
  hides?: boolean
  // The league it was made for. Prices don't carry over to a new one.
  league?: string
}

export interface PriceSkip {
  type: string
  base: string
  tier: string
  chaos: number
  // Where the price alone would have put it.
  wanted: string
  reason: 'thin' | 'locked' | 'volatile'
}

export interface GroupReport {
  group: EconomyGroup
  bands: TierBand[]
  // Why the group was left alone.
  skipped?: string
}

export interface RetierPlan {
  moves: PriceMove[]
  skipped: PriceSkip[]
  groups: GroupReport[]
}

export interface PlanOptions {
  // `${type}|${base}` keys of items the user placed by hand.
  locked?: Set<string>
  buffer?: number
  bufferDown?: number
  groups?: EconomyGroup[]
}

export const lockKey = (type: string, base: string) => `${type}|${base}`

function median (values: number[]): number {
  const s = [...values].sort((a, b) => a - b)
  const mid = s.length >> 1
  return s.length % 2 ? s[mid] : Math.sqrt(s[mid - 1] * s[mid])
}

export function planRetier (doc: FilterDoc, lookup: PriceLookup, opts: PlanOptions = {}): RetierPlan {
  const buffer = opts.buffer ?? 0.2
  const bufferDown = opts.bufferDown ?? opts.buffer ?? 0.5
  const locked = opts.locked ?? new Set<string>()
  const plan: RetierPlan = { moves: [], skipped: [], groups: [] }

  for (const group of opts.groups ?? ECONOMY_GROUPS) {
    const blocks = blocksOf(doc, group.type).filter(b => !b.disabled && b.tier && baseTypeValues(b).length)
    if (!blocks.length) continue
    const tierNames = [...new Set(blocks.map(b => b.tier!))]
    const bands: TierBand[] = []
    const home = new Map<string, TierBand>()
    for (const tier of tierNames) {
      const rank = tierRank(tier, tierNames, group)
      if (rank == null) continue
      bands.push({ tier, rank, median: null, priced: 0, bases: [] })
    }
    bands.sort((a, b) => a.rank - b.rank)
    // A base belongs to the most valuable price tier that lists it.
    for (const band of bands) {
      for (const b of blocks) {
        if (b.tier !== band.tier) continue
        for (const base of baseTypeValues(b)) {
          if (home.has(base)) continue
          home.set(base, band)
          band.bases.push(base)
        }
      }
    }
    const prices = new Map<string, PricePoint>()
    for (const base of home.keys()) {
      const p = lookup(group, base)
      if (p && p.chaos > 0) prices.set(base, p)
    }
    for (const band of bands) {
      const values = band.bases.map(b => prices.get(b)).filter(p => p && !p.thin).map(p => p!.chaos)
      band.priced = values.length
      band.median = values.length ? median(values) : null
    }
    const report: GroupReport = { group, bands }
    plan.groups.push(report)

    // Anchors: priced tiers, most valuable first, with falling medians.
    // A tier that breaks the order isn't sorted by price and is left out.
    const anchors: TierBand[] = []
    for (const band of bands) {
      if (band.median == null) continue
      const prev = anchors[anchors.length - 1]
      if (prev && band.median >= prev.median!) continue
      anchors.push(band)
    }
    if (anchors.length < 2) {
      report.skipped = 'Not enough priced tiers to compare'
      continue
    }
    // boundary[i] sits between anchors[i] and anchors[i + 1].
    const boundary = anchors.slice(0, -1).map((a, i) => Math.sqrt(a.median! * anchors[i + 1].median!))
    const bandFor = (chaos: number) => {
      const i = boundary.findIndex(b => chaos >= b)
      return i < 0 ? anchors.length - 1 : i
    }

    for (const [base, price] of prices) {
      const band = home.get(base)!
      const cur = anchors.indexOf(band)
      if (cur < 0 || isTierNamesake(group.type, band.tier, base)) continue
      const up = bandFor(price.chaos / (1 + buffer))
      const down = bandFor(price.chaos * (1 + bufferDown))
      const target = up < cur ? up : (down > cur ? down : cur)
      if (target === cur) continue
      const to = anchors[target].tier
      if (locked.has(lockKey(group.type, base))) {
        plan.skipped.push({ type: group.type, base, tier: band.tier, chaos: price.chaos, wanted: to, reason: 'locked' })
      } else if (price.thin) {
        plan.skipped.push({ type: group.type, base, tier: band.tier, chaos: price.chaos, wanted: to, reason: 'thin' })
      } else if (price.volatile) {
        plan.skipped.push({ type: group.type, base, tier: band.tier, chaos: price.chaos, wanted: to, reason: 'volatile' })
      } else {
        const toBlocks = blocks.filter(b => b.tier === to)
        const hides = toBlocks.length > 0 && toBlocks.every(b => b.visibility === 'Hide')
        plan.moves.push({ type: group.type, base, from: band.tier, to, chaos: price.chaos, note: price.note, ...(hides ? { hides } : {}) })
      }
    }
  }
  plan.moves.sort((a, b) => b.chaos - a.chaos)
  return plan
}

// ---- stored moves ----

// Folds new moves into the stored list. A move back to where NeverSink had
// the item drops the entry.
export function mergeMoves (stored: PriceMove[], next: PriceMove[]): PriceMove[] {
  const out = [...stored]
  for (const m of next) {
    const i = out.findIndex(o => o.type === m.type && o.base === m.base)
    if (i < 0) { out.push(m); continue }
    // The stored move didn't put it where it is now (it gave way to a NeverSink
    // update), so this one starts from there.
    if (out[i].to !== m.from) { out[i] = m; continue }
    const first = out[i].from
    if (first === m.to) out.splice(i, 1)
    else out[i] = { ...m, from: first }
  }
  return out
}

// Applies stored price moves to a fresh parse. A move only holds while the item
// is still where it moved it from: when NeverSink has re-tiered it (an update),
// NeverSink's newer call wins and the next plan looks at it again.
// A move that took a tier's namesake out (stored before that was refused) is
// dropped.
export function applyPriceMoves (doc: FilterDoc, moves: PriceMove[]): number {
  const edits: FilterEdit[] = livePriceMoves(moves)
    .filter(m => blocksOf(doc, m.type).some(b => (b.tier === m.from || b.tier === m.to) && blockHasBase(b, m.base)))
    .map((m, i) => ({ id: -1 - i, kind: 'move', type: m.type, base: m.base, from: m.from, to: m.to }))
  return applyEdits(doc, edits).filter(s => s.ok).length
}

// Keys of items the user moved or gave their own rule.
export function lockedByEdits (edits: FilterEdit[], extra: string[] = []): Set<string> {
  const out = new Set(extra)
  for (const e of edits) {
    if (e.kind === 'move') out.add(lockKey(e.type, e.base))
  }
  return out
}
