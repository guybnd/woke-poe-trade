import { VARIABLE_ITEMS } from './bosses'
import { formatClock } from '../ui/format'
import type { Boss, BossDrop } from './bosses'
import type { PriceItem } from '../market/types'

export interface KillDrop {
  name: string
  variant?: string
  qty: number
}

export interface KillRecord {
  ts: number
  drops: KillDrop[]
  // League the kill was logged in (missing on kills logged before it was kept).
  league?: string
}

// Player settings the calculation depends on.
export interface BossPrefs {
  runSeconds: Record<string, number>
  // Typed-in chances (0..1) by boss id and drop name; win over everything.
  rates: Record<string, Record<string, number>>
  // Drops the player added to a boss (e.g. ones missing from the list).
  extraDrops: Record<string, Array<{ name: string, variant?: string }>>
  kills: Record<string, KillRecord[]>
  // Count the entry as free (fragments you already own).
  ownEntry: boolean
  // How many runs you plan to do. Drops rarer than 1 in this many runs are
  // left out of the loot (you probably will not see one); 0 keeps every drop.
  plannedRuns: number
  // Manual include (true) / exclude (false) by boss id and drop name,
  // overriding the planned-runs rule.
  dropToggles: Record<string, Record<string, boolean>>
  // How to price items whose poe.ninja variants differ a lot (unidentified
  // jewels etc.), by item name. Default 'median' for those items.
  priceModes: Record<string, PriceMode>
  // Typed-in price in chaos (e.g. what unidentified copies sell for), by item name.
  customPrices: Record<string, number>
}

export type PriceMode = 'min' | 'median' | 'custom'

export interface VariantStats {
  min: number
  median: number
  max: number
  count: number
}

export interface Prices {
  price: (name: string, variant?: string) => number | null
  variants: (name: string) => VariantStats | null
}

export type RateSource = 'custom' | 'community' | 'mine' | 'none'

export interface DropRow {
  name: string
  variant?: string
  chance: number | null
  rateSource: RateSource
  qty: number
  price: number | null
  // chance x qty x price; 0 when either is unknown or the drop is left out.
  value: number
  included: boolean
  // Left out by the planned-runs rule (not by hand).
  tooRare: boolean
  // Variant spread on poe.ninja, for items priced by mode.
  spread: VariantStats | null
  priceMode: PriceMode | null
}

export interface BossResult {
  boss: Boss
  entry: number
  entryMissing: string[]
  loot: number
  profit: number
  perHour: number
  runSeconds: number
  drops: DropRow[]
  // Drops with a chance but no price, or a price but no chance.
  unpriced: number
  unrated: number
  hasRates: boolean
  // Has rates and a known entry cost, so the profit means something.
  ready: boolean
  kills: number
  // Average actual loot over the player's logged kills.
  myLoot: number | null
  // Drops left out of the loot (rare or switched off).
  excluded: number
}

// Prices by item name. Gems and some uniques have several variants
// (level/quality, links); take the requested one, else the plain one,
// else the cheapest, so values lean conservative.
export function priceResolver (items: PriceItem[]): Prices {
  const byName = new Map<string, PriceItem[]>()
  for (const item of items) {
    const list = byName.get(item.name)
    if (list) list.push(item)
    else byName.set(item.name, [item])
  }
  const variants = (name: string): VariantStats | null => {
    const list = byName.get(name)
    if (!list?.length) return null
    const values = list.map(i => i.chaos).sort((a, b) => a - b)
    const mid = Math.floor(values.length / 2)
    const median = values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2
    return { min: values[0], median, max: values[values.length - 1], count: values.length }
  }
  const price = (name: string, variant?: string): number | null => {
    const list = byName.get(name)
    if (!list?.length) return null
    if (variant != null) {
      const exact = list.find(i => i.variant === variant)
      if (exact) return exact.chaos
    }
    const plain = list.find(i => i.variant === '')
    if (plain) return plain.chaos
    return Math.min(...list.map(i => i.chaos))
  }
  return { price, variants }
}

// Price for a drop, honouring the player's choice for high-variance items.
export function dropPrice (d: BossDrop, prices: Prices, prefs: BossPrefs): { price: number | null, spread: VariantStats | null, mode: PriceMode | null } {
  const custom = prefs.customPrices[d.name]
  const chosen = prefs.priceModes[d.name]
  const mode: PriceMode | null = chosen ?? (d.variable ? 'median' : null)
  if (mode === 'custom' && custom != null) return { price: custom, spread: prices.variants(d.name), mode }
  if (mode === 'min' || mode === 'median' || mode === 'custom') {
    const spread = prices.variants(d.name)
    return { price: spread ? (mode === 'min' ? spread.min : spread.median) : null, spread, mode }
  }
  return { price: prices.price(d.name, d.variant), spread: null, mode: null }
}

export function observedRates (kills: KillRecord[]): Map<string, number> {
  const seen = new Map<string, number>()
  for (const kill of kills) {
    const names = new Set(kill.drops.map(d => d.name))
    for (const name of names) seen.set(name, (seen.get(name) ?? 0) + 1)
  }
  const out = new Map<string, number>()
  for (const [name, n] of seen) out.set(name, n / kills.length)
  return out
}

// A logged drop, priced the same way as its row in the drop list.
export function killDropPrice (d: { name: string, variant?: string }, prices: Prices, prefs: BossPrefs): number | null {
  return dropPrice({ name: d.name, chance: null, variant: d.variant, variable: VARIABLE_ITEMS.has(d.name) }, prices, prefs).price
}

// The log doesn't name the tier of a shared arena, but its level does: uber
// fights are level 85, normal ones 83 or 84 (real Client.txt logs).
export function bossesAtLevel<T extends { tier: Boss['tier'] }> (bosses: T[], level: number | null): T[] {
  if (level == null) return bosses
  const tier = level >= 85 ? 'uber' : 'pinnacle'
  const match = bosses.filter(b => b.tier === tier)
  return match.length ? match : bosses
}

// For the icon's card: the most valuable first, so an expensive drop with no
// known chance isn't hidden behind cheap ones that have one.
export function cardDrops (drops: DropRow[], n: number): DropRow[] {
  return [...drops].sort((a, b) => (b.price ?? -1) - (a.price ?? -1)).slice(0, n)
}

function dropList (boss: Boss, prefs: BossPrefs): BossDrop[] {
  const list: BossDrop[] = [...boss.drops]
  const known = new Set(list.map(d => d.name))
  const add = (name: string, variant?: string) => {
    if (known.has(name)) return
    known.add(name)
    list.push({ name, chance: null, variant, variable: VARIABLE_ITEMS.has(name) })
  }
  for (const d of prefs.extraDrops[boss.id] ?? []) add(d.name, d.variant)
  for (const kill of prefs.kills[boss.id] ?? []) {
    for (const d of kill.drops) add(d.name, d.variant)
  }
  return list
}

// With this many logged kills, your own drop rates replace the community
// ones (rates are per patch and community samples age quickly).
export const OWN_RATE_KILLS = 20
// A boss with no other rates uses yours from this many kills: one kill would
// make every drop read 100% or 0%.
export const OWN_RATE_MIN_KILLS = 5

export function evaluateBoss (
  boss: Boss,
  prefs: BossPrefs,
  prices: Prices
): BossResult {
  const price = prices.price
  const toggles = prefs.dropToggles[boss.id] ?? {}
  const minChance = prefs.plannedRuns > 0 ? 1 / prefs.plannedRuns : 0
  const kills = prefs.kills[boss.id] ?? []
  const mine = observedRates(kills)
  const custom = prefs.rates[boss.id] ?? {}

  let entry = 0
  const entryMissing: string[] = []
  for (const e of boss.entry) {
    const p = price(e.name)
    if (p == null) entryMissing.push(e.name)
    else entry += p * e.qty
  }
  if (prefs.ownEntry) { entry = 0; entryMissing.length = 0 }

  let unpriced = 0
  let unrated = 0
  const drops: DropRow[] = dropList(boss, prefs).map(d => {
    let chance: number | null = null
    let rateSource: RateSource = 'none'
    if (custom[d.name] != null) {
      chance = custom[d.name]; rateSource = 'custom'
    } else if (kills.length >= OWN_RATE_KILLS) {
      chance = mine.get(d.name) ?? 0; rateSource = 'mine'
    } else if (d.chance != null) {
      chance = d.chance; rateSource = 'community'
    } else if (kills.length >= OWN_RATE_MIN_KILLS) {
      chance = mine.get(d.name) ?? 0; rateSource = 'mine'
    }
    const qty = d.qty ?? 1
    const { price: p, spread, mode } = dropPrice(d, prices, prefs)
    const tooRare = chance != null && chance > 0 && chance < minChance
    const included = toggles[d.name] ?? !tooRare
    if (chance == null) unrated++
    else if (p == null && chance > 0 && included) unpriced++
    const value = included && chance != null && p != null ? chance * qty * p : 0
    return { name: d.name, variant: d.variant, chance, rateSource, qty, price: p, value, included, tooRare, spread, priceMode: mode }
  })
  drops.sort((a, b) => b.value - a.value || (b.price ?? 0) - (a.price ?? 0))

  const loot = drops.reduce((n, d) => n + d.value, 0)
  const hasRates = drops.some(d => d.chance != null && d.chance > 0)
  const excluded = drops.filter(d => !d.included).length
  const runSeconds = prefs.runSeconds[boss.id] ?? boss.runSeconds
  const profit = loot - entry
  const perHour = runSeconds > 0 ? profit * 3600 / runSeconds : 0

  let myLoot: number | null = null
  if (kills.length) {
    let total = 0
    for (const kill of kills) {
      for (const d of kill.drops) total += (killDropPrice(d, prices, prefs) ?? 0) * d.qty
    }
    myLoot = total / kills.length
  }

  return { boss, entry, entryMissing, loot, profit, perHour, runSeconds, drops, unpriced, unrated, hasRates, ready: hasRates && !entryMissing.length, kills: kills.length, myLoot, excluded }
}

export interface Luck {
  // Share of runs whose loot is worth more than the entry.
  beatEntry: number
  medianProfit: number
  // Share of expected loot that comes from the single most valuable drop.
  topShare: number
  topName: string | null
  // Runs it takes on average to see the top drop once.
  runsForTop: number | null
  // Expected profit with the top drop taken out.
  profitWithoutTop: number
}

// Small seeded PRNG so the luck numbers do not jitter between renders.
function mulberry32 (seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

// Simulates runs treating each drop as independent. Real pinnacle drops are
// not fully independent (a boss drops a fixed number of uniques), so this
// is a rough guide to how swingy a boss is, not an exact distribution.
export function luck (r: BossResult, runs = 4000): Luck {
  const rated = r.drops.filter(d => d.included && d.chance != null && d.chance > 0 && d.price != null)
  const top = rated[0] ?? null
  const rand = mulberry32(0x5eed)
  const profits: number[] = []
  let wins = 0
  for (let i = 0; i < runs; i++) {
    let loot = 0
    for (const d of rated) {
      if (rand() < d.chance!) loot += d.price! * d.qty
    }
    if (loot > r.entry) wins++
    profits.push(loot - r.entry)
  }
  profits.sort((a, b) => a - b)
  return {
    beatEntry: runs ? wins / runs : 0,
    medianProfit: profits.length ? profits[Math.floor(profits.length / 2)] : -r.entry,
    topShare: top && r.loot > 0 ? top.value / r.loot : 0,
    topName: top?.name ?? null,
    runsForTop: top?.chance ? 1 / top.chance : null,
    profitWithoutTop: r.profit - (top?.value ?? 0)
  }
}

export function formatRunTime (seconds: number): string {
  return formatClock(Math.round(seconds) * 1000)
}

// Accepts "4:30", "4.5" (minutes) or "270s".
export function parseRunTime (text: string): number | null {
  const t = text.trim()
  let m = /^(\d+):(\d{1,2})$/.exec(t)
  if (m) return Number(m[1]) * 60 + Number(m[2])
  m = /^(\d+)s$/.exec(t)
  if (m) return Number(m[1])
  const n = Number(t)
  return Number.isFinite(n) && n > 0 ? Math.round(n * 60) : null
}

// Base types for the unidentified uniques, which the trade search needs.
const UNIQUE_BASES: Record<string, string> = {
  'Impossible Escape': 'Viridian Jewel',
  'Thread of Hope': 'Crimson Jewel',
  "Watcher's Eye": 'Prismatic Jewel',
  'Forbidden Flesh': 'Cobalt Jewel',
  'Forbidden Flame': 'Crimson Jewel',
  'Sublime Vision': 'Prismatic Jewel',
  "Atziri's Splendour": 'Sacrificial Garb',
  "Doryani's Invitation": 'Heavy Belt'
}

// Official trade search for unidentified copies of a unique, cheapest first.
export function unidentifiedTradeUrl (league: string, name: string): string {
  const query = {
    query: {
      status: { option: 'online' },
      name,
      ...(UNIQUE_BASES[name] ? { type: UNIQUE_BASES[name] } : {}),
      filters: { misc_filters: { filters: { identified: { option: 'false' } } } }
    },
    sort: { price: 'asc' }
  }
  return `https://www.pathofexile.com/trade/search/${encodeURIComponent(league)}?q=${encodeURIComponent(JSON.stringify(query))}`
}
