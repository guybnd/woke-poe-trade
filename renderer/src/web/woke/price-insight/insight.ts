// Turns raw trade listings into a verdict: which listings to trust, a fair
// price range, and a suggested list price. Pure functions, no Vue or IO, so the
// rules can be checked in isolation.

export interface InsightListing {
  id: string
  priceAmount: number
  priceCurrency: string
  indexedAt?: string
  hasNote: boolean
  hasFee: boolean
  isMine: boolean
  accountName: string
  accountStatus: 'offline' | 'online' | 'afk'
  listedTimes: number
}

export type DropReason = 'currency' | 'mine' | 'stale' | 'fixer' | 'underbuy' | 'wall' | 'dump'

export const DROP_LABEL: Record<DropReason, string> = {
  currency: 'priced in a currency we can not convert',
  mine: 'your own listing',
  stale: 'seller offline and listing older than 3 days',
  fixer: 'far below the next listings, likely bait from a price fixer',
  underbuy: 'whisper only, far under what instant buyouts ask, likely bait from a price fixer',
  wall: 'one seller listing many copies far under everyone else, a classic price-fixing wall',
  dump: 'one of several cheap listings that all appeared in the last hour, likely a price-fixing dump'
}

/** Short tag shown on a listing row for the reasons that point at price fixing. */
export const FIX_TAG: Partial<Record<DropReason, string>> = {
  fixer: 'bait',
  underbuy: 'bait',
  wall: 'wall',
  dump: 'dump',
  stale: 'ghost'
}

/** Drop reasons that mean someone may be faking the price. */
export const FIXING_REASONS = new Set<DropReason>(['fixer', 'underbuy', 'wall', 'dump'])

export type FixRisk = 'none' | 'low' | 'medium' | 'high'

export interface FixSignal {
  kind: 'bait' | 'wall' | 'dump' | 'thin' | 'old' | 'norate' | 'snipe' | 'oneseller'
  text: string
}

export type Confidence = 'high' | 'medium' | 'low' | 'none'

export interface Insight {
  /** Listings used for the range, cheapest first, with their chaos value. */
  kept: Array<{ id: string, chaos: number, weight?: number }>
  dropped: Map<string, DropReason>
  /** Chaos value of every listing that could be converted, kept or not. */
  prices: Map<string, number>
  /** The price nobody will pay more than: the cheapest instant buyout, or the fair price if that's higher. */
  ceiling?: number | null
  /** Cheapest trusted listing, median of the cheapest few, and the top of that window. */
  range: { low: number, fair: number, high: number } | null
  /** Cheapest listing that isn't far under the rest: what the market really starts at. */
  floor?: number
  /**
   * The cheapest trusted instant buyout at or above the floor: a price anyone
   * can buy at right now. Leads the verdict when listings are thin (pick B1).
   */
  buyout?: number
  /** Price to list at to sell fast (just under the floor) and when patient (the fair price). */
  suggest: { fast: number, patient: number } | null
  confidence: Confidence
  /** How likely it is that the cheap end of the listings is fake, and why. */
  risk: FixRisk
  signals: FixSignal[]
}

export interface InsightOptions {
  /** Chaos per divine; without it divine listings can not be compared. */
  divine: number | undefined
  /** Chaos value of other currencies, keyed by trade API id. */
  otherRates?: Record<string, number>
  now?: number
}

// How far above the fair price an instant buyout can sit and still lead a thin market.
const BUYOUT_NEAR_FAIR = 1.35
const STALE_MS = 3 * 24 * 60 * 60 * 1000
// Listings still up after this long are not selling at their price.
const OLD_MS = 7 * 24 * 60 * 60 * 1000
const WINDOW = 6
const FIXER_RATIO = 0.5
const THIN_FIXER_RATIO = 0.25
// A whisper listing under this share of the cheapest instant buyout is bait
// (WOKEPOET-541): anyone can buy the buyouts now, so a real seller asks about
// that. Needs buyouts from at least 2 sellers, so one odd buyout sets nothing.
const UNDER_BUYOUT_RATIO = 0.6
const UNDER_BUYOUT_SELLERS = 2
const MAX_ROWS_PER_SELLER = 2
const MAX_BELOW_FLOOR = 2
// Chaos a bargain has to save before it's worth pointing out.
const SNIPE_MIN_SAVING = 5
// A seller's pile of copies counts as a wall when it asks less than this share
// of what other sellers ask.
const WALL_RATIO = 0.7
const WALL_COPIES = 3
// Listings this fresh and this far under the rest are a dump when there are
// at least DUMP_MIN of them.
const DUMP_AGE_MS = 60 * 60 * 1000
const DUMP_RATIO = 0.5
const DUMP_MIN = 2

export function toChaos (amount: number, currency: string, opts: InsightOptions): number | null {
  if (!(amount > 0)) return null
  if (currency === 'chaos') return amount
  if (currency === 'divine') return opts.divine ? amount * opts.divine : null
  const rate = opts.otherRates?.[currency]
  return rate ? amount * rate : null
}

function median (values: number[]): number {
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

// How much a listing says about what the item really sells for: sellers who
// are online and listed recently are the ones actually trading.
const STATUS_WEIGHT: Record<InsightListing['accountStatus'], number> = { online: 1, afk: 0.7, offline: 0.4 }
const DAY_MS = 24 * 60 * 60 * 1000

export function listingWeight (l: Pick<InsightListing, 'accountStatus' | 'indexedAt'>, now: number): number {
  let w = STATUS_WEIGHT[l.accountStatus] ?? 0.5
  if (l.indexedAt) {
    const age = now - Date.parse(l.indexedAt)
    if (age > 7 * DAY_MS) w *= 0.6
    else if (age > DAY_MS) w *= 0.8
  }
  return w
}

// Median where each listing counts by its weight; rows sorted by price.
export function weightedMedian (rows: Array<{ chaos: number, weight: number }>): number {
  const total = rows.reduce((s, r) => s + r.weight, 0)
  if (!(total > 0)) return median(rows.map(r => r.chaos))
  let acc = 0
  for (const r of rows) {
    acc += r.weight
    if (acc >= total / 2) return r.chaos
  }
  return rows[rows.length - 1].chaos
}

// `instant` is a merchant tab listing, which anyone can buy without the seller's
// say: a real offer at that price, so it can't be bait, a wall or a dump.
type KeptRow = { id: string, chaos: number, weight: number, account: string, copies: number, age: number | null, instant: boolean }

export function buildInsight (listings: InsightListing[], opts: InsightOptions): Insight {
  const now = opts.now ?? Date.now()
  const dropped = new Map<string, DropReason>()
  const prices = new Map<string, number>()
  let kept: KeptRow[] = []

  for (const l of listings) {
    if (l.isMine) { dropped.set(l.id, 'mine'); continue }
    const chaos = toChaos(l.priceAmount, l.priceCurrency, opts)
    if (chaos == null) { dropped.set(l.id, 'currency'); continue }
    prices.set(l.id, chaos)
    const age = l.indexedAt ? now - Date.parse(l.indexedAt) : null
    if (l.accountStatus === 'offline' && !l.hasFee && age != null && age > STALE_MS) {
      dropped.set(l.id, 'stale'); continue
    }
    kept.push({
      id: l.id,
      chaos,
      weight: listingWeight(l, now),
      account: l.accountName,
      copies: l.listedTimes ?? 1,
      age: age != null && Number.isFinite(age) ? age : null,
      instant: l.hasFee
    })
  }
  kept.sort((a, b) => a.chaos - b.chaos)

  kept = dropWalls(kept, dropped)
  kept = dropDumps(kept, dropped)

  // Peel off bait listings from the bottom: a listing that costs less than half
  // of what the next few ask is almost never real.
  const thinMarket = kept.length === 3
  while (kept.length >= 4) {
    const next = median(kept.slice(1, 1 + WINDOW).map(k => k.chaos))
    if (kept[0].instant || kept[0].chaos >= next * FIXER_RATIO) break
    dropped.set(kept[0].id, 'fixer')
    kept = kept.slice(1)
  }
  // With only three to go on, it takes a much bigger gap to the very next one.
  if (thinMarket && !kept[0].instant && kept[0].chaos < kept[1].chaos * THIN_FIXER_RATIO) {
    dropped.set(kept[0].id, 'fixer')
    kept = kept.slice(1)
  }

  // Whisper listings far under the instant buyouts, wherever they sit. Only
  // while they're under half the listings: when most sellers ask that, it's
  // the market, and the buyouts are the ones asking more.
  const buyouts = kept.filter(k => k.instant)
  if (new Set(buyouts.map(k => k.account)).size >= UNDER_BUYOUT_SELLERS) {
    const line = buyouts[0].chaos * UNDER_BUYOUT_RATIO
    const under = kept.filter(k => !k.instant && k.chaos < line)
    if (under.length * 2 < kept.length) {
      for (const k of under) dropped.set(k.id, 'underbuy')
      kept = kept.filter(k => !under.includes(k))
    }
  }

  const { risk, signals } = fixRisk(kept, dropped, listings)

  // Leaving these out could hide the real price, so say so.
  const noRate = opts.divine ? 0 : listings.filter(l => !l.isMine && l.priceCurrency === 'divine' && l.priceAmount > 0).length
  if (noRate) {
    signals.push({ kind: 'norate', text: `${noRate} ${noRate === 1 ? 'listing' : 'listings'} in divines left out: there's no divine rate for this league` })
  }

  if (!kept.length) {
    return { kept: [], dropped, prices, range: null, suggest: null, confidence: 'none', risk, signals }
  }

  // A real buyout far under the rest is a bargain for someone, not a price to
  // match, and a stash listing left there says even less.
  let floorIdx = 0
  let bargain = false
  // They have to be a small minority: two of four is a split market, not outliers.
  const maxBelow = Math.min(MAX_BELOW_FLOOR, Math.floor(kept.length / 3))
  while (floorIdx < maxBelow) {
    const rest = kept.slice(floorIdx + 1, floorIdx + 1 + WINDOW).map(k => k.chaos)
    const next = rest.length >= 3 ? median(rest) : rest[0]
    if (kept[floorIdx].chaos >= next * (kept.length >= 4 ? FIXER_RATIO : THIN_FIXER_RATIO)) break
    const row = kept[floorIdx]
    if (row.instant && row.age != null && row.age <= OLD_MS) bargain = true
    floorIdx++
  }
  const floor = kept[floorIdx].chaos

  // A seller's stash pile is one opinion, however many rows it fills. Buyouts
  // are real offers, so they all count towards the price.
  const windowRows = capPerSeller(kept, true).slice(0, WINDOW)
  const window = windowRows.map(k => k.chaos)
  const range = { low: window[0], fair: weightedMedian(windowRows), high: window[window.length - 1] }
  const spread = range.high / floor

  // Agreement needs sellers, though: 8 rows at 2 each is at least 4 of them.
  const opinions = capPerSeller(kept, false).length
  let confidence: Confidence
  if (opinions >= 8 && spread <= 2) confidence = 'high'
  else if (opinions >= 4 && spread <= 4) confidence = 'medium'
  else confidence = 'low'
  if (noRate) confidence = 'low'

  const oldOnly = windowRows.every(k => k.age != null && k.age > OLD_MS)
  if (oldOnly && windowRows.every(k => k.instant)) {
    // Anyone could have bought these, and nobody has. That's a real answer.
    signals.push({ kind: 'old', text: 'These can be bought instantly and none has sold in over a week, so it\'s unlikely to sell for more' })
  } else if (oldOnly) {
    // Agreeing listings prove nothing when none of them is known to be for sale.
    confidence = 'low'
    signals.push({ kind: 'old', text: 'The cheapest listings are all over a week old, so this may not be what it really sells for' })
  }

  const instant = kept.filter(k => k.instant).map(k => k.chaos)
  // Only near what the trusted listings ask: one buyout far above a wall of
  // whispers isn't the price.
  const buyout = kept.find(k => k.instant && k.chaos >= floor && k.chaos <= range.fair * BUYOUT_NEAR_FAIR)?.chaos
  const ceiling = instant.length ? Math.max(Math.min(...instant), range.fair) : null

  if (bargain) {
    const cheapest = kept.find(k => k.instant)!
    // Saving a fraction of a chaos on a junk item isn't worth a line.
    // Measured from the floor: a fresh bargain can pull the fair price down to itself.
    if (floor - cheapest.chaos >= SNIPE_MIN_SAVING) {
      const shown = cheapest.chaos < 0.1 ? 'under 0.1' : cheapest.chaos < 10 ? Math.round(cheapest.chaos * 10) / 10 : Math.round(cheapest.chaos)
      signals.push({ kind: 'snipe', text: `An instant buyout at ${shown}c sits far under the rest, so it may be worth buying` })
    }
  }

  return {
    kept: kept.map(k => ({ id: k.id, chaos: k.chaos, weight: k.weight })),
    dropped,
    prices,
    range,
    floor,
    ceiling,
    buyout,
    suggest: {
      // Just under the floor. Under 10c a whole chaos is too big a cut, so match it.
      fast: floor >= 10 ? floor * 0.97 : floor,
      patient: Math.max(range.fair, floor)
    },
    confidence,
    risk,
    signals
  }
}

function capPerSeller (rows: KeptRow[], keepBuyouts: boolean): KeptRow[] {
  const seen = new Map<string, number>()
  return rows.filter(row => {
    if (keepBuyouts && row.instant) return true
    const n = seen.get(row.account) ?? 0
    seen.set(row.account, n + 1)
    return n < MAX_ROWS_PER_SELLER
  })
}

// One seller with a pile of copies at the bottom, far under what other
// sellers ask: the pile is there to drag the price down, not to sell.
function dropWalls (kept: KeptRow[], dropped: Map<string, DropReason>): KeptRow[] {
  const bottom = kept.slice(0, WINDOW)
  const walls = new Set<string>()
  // A seller's copies can be on separate rows when their stats differ.
  const pile = (row: KeptRow) => kept
    .filter(k => !k.instant && k.account === row.account && k.chaos === row.chaos)
    .reduce((copies, k) => copies + k.copies, 0)
  for (const row of bottom) {
    if (row.instant || pile(row) < WALL_COPIES) continue
    const others = kept.filter(k => k.account !== row.account).slice(0, WINDOW).map(k => k.chaos)
    if (others.length < 3) continue
    if (row.chaos < median(others) * WALL_RATIO) walls.add(row.account)
  }
  if (!walls.size) return kept
  return kept.filter(k => {
    // Every listing of that seller under the line goes, not only the pile.
    if (k.instant || !walls.has(k.account)) return true
    const others = kept.filter(o => !walls.has(o.account)).slice(0, WINDOW).map(o => o.chaos)
    if (k.chaos >= median(others) * WALL_RATIO) return true
    dropped.set(k.id, 'wall')
    return false
  })
}

// Several listings that all appeared within the last hour, far under the
// listings that were already there.
function dropDumps (kept: KeptRow[], dropped: Map<string, DropReason>): KeptRow[] {
  const older = kept.filter(k => k.age == null || k.age > DUMP_AGE_MS).slice(0, WINDOW).map(k => k.chaos)
  if (older.length < 3) return kept
  const line = median(older) * DUMP_RATIO
  const dump = kept.filter(k => !k.instant && k.age != null && k.age <= DUMP_AGE_MS && k.chaos < line)
  if (dump.length < DUMP_MIN) return kept
  const ids = new Set(dump.map(d => d.id))
  for (const id of ids) dropped.set(id, 'dump')
  return kept.filter(k => !ids.has(k.id))
}

function fixRisk (kept: KeptRow[], dropped: Map<string, DropReason>, listings: InsightListing[]): { risk: FixRisk, signals: FixSignal[] } {
  const signals: FixSignal[] = []
  const count = (r: DropReason) => {
    let n = 0
    for (const [id, reason] of dropped) {
      if (reason !== r) continue
      n += listings.find(l => l.id === id)?.listedTimes ?? 1
    }
    return n
  }
  const walls = count('wall')
  const dumps = count('dump')
  const bait = count('fixer') + count('underbuy')
  if (walls) {
    const ids = Array.from(dropped).filter(([, r]) => r === 'wall').map(([id]) => id)
    const sellers = new Set(listings.filter(l => ids.includes(l.id)).map(l => l.accountName))
    signals.push({ kind: 'wall', text: sellers.size === 1 ? `One seller listed ${walls} copies far under everyone else` : `${sellers.size} sellers listed ${walls} copies far under everyone else` })
  }
  if (dumps) signals.push({ kind: 'dump', text: `${dumps} cheap listings all appeared in the last hour` })
  if (bait) {
    const under = count('underbuy')
    const text = under === bait
      ? (bait === 1 ? 'One whisper listing far under the instant buyouts: likely bait' : `${bait} whisper listings far under the instant buyouts: likely bait`)
      : (bait === 1 ? 'One bait listing far under the rest' : `${bait} bait listings far under the rest`)
    signals.push({ kind: 'bait', text })
  }
  const sellers = new Set(kept.map(k => k.account)).size
  if (kept.length > 0 && kept.length < 4 && sellers <= 2 && kept.some(k => !k.instant)) {
    signals.push({ kind: 'thin', text: 'Few listings from one or two sellers: easy to fake, check by hand' })
  } else if (kept.length >= 4 && sellers === 1) {
    signals.push({ kind: 'oneseller', text: `All ${kept.length} listings are from one seller: check by hand` })
  }

  const LEVELS: FixRisk[] = ['none', 'low', 'medium', 'high']
  let level = 0
  if (walls || dumps) level = 3
  else if (bait >= 2) level = 2
  else if (bait === 1) level = 1
  if (signals.some(s => s.kind === 'thin')) level = Math.min(level + 1, 3)
  const risk = LEVELS[level]
  return { risk, signals }
}

export interface NotePrice { amount: number, currency: 'chaos' | 'divine' }

/** Rounds a chaos value to a price a player would type, in chaos or divines. */
export function notePrice (chaos: number, divine: number | undefined): NotePrice {
  if (divine && chaos >= divine) {
    const div = chaos / divine
    const amount = div >= 20 ? Math.floor(div) : Math.floor(div * 10) / 10
    return { amount: Math.max(amount, 1), currency: 'divine' }
  }
  let amount: number
  if (chaos >= 100) amount = Math.floor(chaos / 5) * 5
  else if (chaos >= 2) amount = Math.floor(chaos)
  else amount = 1
  return { amount, currency: 'chaos' }
}

export function noteText (p: NotePrice): string {
  return `~b/o ${p.amount} ${p.currency}`
}
