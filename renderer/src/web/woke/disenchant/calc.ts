// Disenchanting uniques for Thaumaturgic Dust at Kingsmarch: which uniques
// give the most dust for what they cost.
//
// Same logic as poe-disenchant-tool (github.com/deronek/poe-disenchant-tool,
// MIT): dust at item level 84, weapons and armour at 20% quality (a few
// whetstones or scraps), jewellery either as it is or after 20 catalysts,
// whichever gives more dust per chaos, and the gold fee for an async trade.
// Written from scratch on our own price and item data.
import { isThin } from '../market/types'
import type { PriceItem } from '../market/types'

// A unique that can be disenchanted, from the item data.
export interface DustUnique {
  name: string
  base: string
  // The game's base dust number (poedb), before item level and quality.
  dust: number
  kind: 'gear' | 'jewellery'
  // Quivers and always-corrupted or mirrored uniques can't take quality.
  noQuality: boolean
  // Inventory cells (width x height).
  slots: number
}

export interface DustFactors {
  itemLevel: number
  quality: number
  influences: number
  corruptionImplicits: number
}

// Dust from the base number, as the game works it out.
export function dustFor (baseDust: number, f: DustFactors): number {
  const ilvl = Math.min(Math.max(f.itemLevel, 46), 84)
  const upTo68 = Math.min(ilvl, 68) - 46
  const levelSum = 50 + 2 * upTo68 + Math.floor(3 * upTo68 / 11) + 25 * (Math.max(ilvl, 68) - 68)
  const factors = (100 + f.quality * 2 + f.influences * 50 + f.corruptionImplicits * 50) / 100
  return Math.floor(baseDust * 5 * levelSum * factors)
}

// Gold the trade site charges to buy the item in an async trade. Listings
// are mostly at 0% quality, so that's what the list assumes.
export function goldFee (baseDust: number, f: Omit<DustFactors, 'itemLevel'> = { quality: 0, influences: 0, corruptionImplicits: 0 }): number {
  const inner = Math.round((baseDust ** 0.45 + Number.EPSILON) * 100) / 100
  const multi = 1 + 0.02 * f.quality + 0.5 * (f.influences + f.corruptionImplicits)
  return Math.floor(2000 * inner * multi)
}

export const LIST_ILVL = 84
export const CATALYSTS_FOR_Q20 = 20

export type RankMode = 'per-chaos' | 'total-cost' | 'per-slot' | 'per-gold'

export const RANK_MODES: Array<{ value: RankMode, label: string, title: string }> = [
  { value: 'per-chaos', label: 'Dust/c', title: 'Dust per chaos spent on the item (and catalysts)' },
  { value: 'total-cost', label: 'With gold', title: 'Dust per chaos, counting the gold fee at your gold value' },
  { value: 'per-slot', label: 'Per slot', title: 'Dust per chaos per inventory cell, so small items rank higher' },
  { value: 'per-gold', label: 'Per gold', title: 'Dust per gold fee, price left out' }
]

export interface DustRow {
  name: string
  base: string
  // poe.ninja price, chaos.
  chaos: number
  // Dust at item level 84 and the quality it's worked out at.
  dust: number
  quality: 0 | 20
  // Catalysts are worth buying first (jewellery only).
  catalyse: boolean
  // What you pay: the price plus the catalysts.
  cost: number
  gold: number
  slots: number
  thin: boolean
  dustPerChaos: number
}

export interface RankOptions {
  mode: RankMode
  // Chaos you'd pay for 10,000 gold.
  goldChaosPer10k: number
}

// Links and relics are priced apart and cost more; the plain item is what you
// buy to disenchant.
function isPlainVariant (variant: string): boolean {
  return !/(^|, )[56]L$/.test(variant) && variant !== 'Relic'
}

const PRICED_TYPES = new Set(['UniqueWeapon', 'UniqueArmour', 'UniqueAccessory'])

// The cheapest plain price per unique. Foulborn versions count as the same
// unique, since they disenchant the same, unless `foulborn` is false.
export function cheapestPrices (items: PriceItem[], foulborn = true): Map<string, PriceItem> {
  const out = new Map<string, PriceItem>()
  for (const item of items) {
    if (!PRICED_TYPES.has(item.type) || !isPlainVariant(item.variant) || !(item.chaos > 0)) continue
    if (!foulborn && item.name.startsWith('Foulborn ')) continue
    const name = item.name.replace(/^Foulborn /, '')
    const seen = out.get(name)
    if (!seen || item.chaos < seen.chaos) out.set(name, item)
  }
  return out
}

// The cheapest catalyst (Tainted ones only work on corrupted items).
export function cheapestCatalyst (items: PriceItem[]): number | null {
  let best: number | null = null
  for (const item of items) {
    if (item.type !== 'Currency' && item.type !== 'Catalyst') continue
    if (!/ Catalyst$/.test(item.name) || item.name.startsWith('Tainted ')) continue
    if (item.chaos > 0 && (best == null || item.chaos < best)) best = item.chaos
  }
  return best
}

export function dustRows (uniques: DustUnique[], items: PriceItem[]): DustRow[] {
  const prices = cheapestPrices(items)
  const catalyst = cheapestCatalyst(items)
  const rows: DustRow[] = []
  for (const u of uniques) {
    const price = prices.get(u.name)
    if (!price) continue
    const plain = dustFor(u.dust, { itemLevel: LIST_ILVL, quality: 0, influences: 0, corruptionImplicits: 0 })
    const q20 = dustFor(u.dust, { itemLevel: LIST_ILVL, quality: 20, influences: 0, corruptionImplicits: 0 })
    let dust = q20
    let quality: 0 | 20 = 20
    let catalyse = false
    let cost = price.chaos
    if (u.noQuality) {
      dust = plain
      quality = 0
    } else if (u.kind === 'jewellery') {
      const withCatalysts = catalyst != null ? price.chaos + catalyst * CATALYSTS_FOR_Q20 : null
      if (withCatalysts != null && q20 / withCatalysts > plain / price.chaos) {
        catalyse = true
        cost = withCatalysts
      } else {
        dust = plain
        quality = 0
      }
    }
    rows.push({
      name: u.name,
      base: u.base,
      chaos: price.chaos,
      dust,
      quality,
      catalyse,
      cost,
      gold: goldFee(u.dust),
      slots: u.slots,
      thin: isThin(price),
      dustPerChaos: dust / cost
    })
  }
  return rows
}

export function rankValue (row: DustRow, opts: RankOptions): number {
  switch (opts.mode) {
    case 'total-cost': return row.dust / totalCost(row, opts.goldChaosPer10k)
    case 'per-slot': return row.dustPerChaos / Math.max(1, row.slots)
    case 'per-gold': return row.gold > 0 ? row.dust / row.gold : 0
    default: return row.dustPerChaos
  }
}

// The price, the catalysts and the gold fee at your gold value.
export function totalCost (row: DustRow, goldChaosPer10k: number): number {
  return row.cost + row.gold / 10_000 * Math.max(0, goldChaosPer10k)
}

export interface RowFilter {
  minDust: number
  maxGold: number | null
  maxChaos: number | null
  hideThin: boolean
  text: string
}

export function filterRows (rows: DustRow[], f: RowFilter): DustRow[] {
  const q = f.text.trim().toLowerCase()
  return rows.filter(r =>
    r.dust >= f.minDust &&
    (f.maxGold == null || r.gold <= f.maxGold) &&
    (f.maxChaos == null || r.chaos <= f.maxChaos) &&
    (!f.hideThin || !r.thin) &&
    (!q || r.name.toLowerCase().includes(q) || r.base.toLowerCase().includes(q)))
}

export function rankRows (rows: DustRow[], opts: RankOptions): DustRow[] {
  return rows
    .map(r => ({ r, v: rankValue(r, opts) }))
    .sort((a, b) => b.v - a.v || a.r.name.localeCompare(b.r.name))
    .map(x => x.r)
}

// Price check verdict: dust per chaos of the item in hand, against its price.
export interface DustVerdict {
  dustPerChaos: number
  disenchant: boolean
}

export function dustVerdict (dust: number, chaos: number | null, line: number): DustVerdict | null {
  if (!(dust > 0) || chaos == null || !(chaos > 0)) return null
  const dustPerChaos = dust / chaos
  return { dustPerChaos, disenchant: dustPerChaos >= line }
}

// A common line between "disenchant it" and "sell it", in dust per chaos.
export const DEFAULT_VERDICT_LINE = 5000

// Bases where every unique is worth disenchanting at `line` dust per chaos
// (as a 0% quality drop at `ilvl`), for a loot filter rule. A base with any
// unique that isn't, that has no price, or that has no dust number
// (`otherBases`) is left out: the rule would dress a valuable drop up as dust.
// Foulborn drops are kept out of the rule, so their prices don't count.
export function dustBases (uniques: DustUnique[], items: PriceItem[], line: number, ilvl: number, otherBases: Iterable<string> = []): string[] {
  const prices = cheapestPrices(items, false)
  const byBase = new Map<string, boolean>()
  for (const base of otherBases) byBase.set(base, false)
  for (const u of uniques) {
    const price = prices.get(u.name)
    const ok = price != null && !isThin(price) &&
      dustFor(u.dust, { itemLevel: ilvl, quality: 0, influences: 0, corruptionImplicits: 0 }) / price.chaos >= line
    byBase.set(u.base, (byBase.get(u.base) ?? true) && ok)
  }
  return [...byBase].filter(([, ok]) => ok).map(([base]) => base).sort((a, b) => a.localeCompare(b))
}
