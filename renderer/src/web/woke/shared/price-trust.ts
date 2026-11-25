// poe.ninja prices that may be fake: the step and one-day checks Net worth,
// the price check and every window that shows a poe.ninja price share.
// Pure: no Vue or IO, and small, so windows loaded at startup can use it.
import { graphGaps, pricedOnlyToday } from '../market/parse'
import { THIN_GAPS } from '../market/types'

export type Category = 'currency' | 'fragments' | 'cards' | 'gear' | 'other'

// ---------- price jumps in thin markets ----------
// One fake listing can set a thin item's poe.ninja price: The Witch read
// 7,075c (really 0.2c) for two hours. A thin item whose price jumps to 5x the
// last read's, and by at least 1c, keeps the last read's price for up to 6
// hours. It takes the new price sooner once poe.ninja's comes back down or
// the market stops being thin. Backtested on 3 days of poe.ninja prices: 2 in
// 3 fakes were gone within 6 hours; a real rise shows up at most 6 hours late.
//
// A price poe.ninja has on only one of the last 7 days, at 10c or more, is
// worse: The Web dropped off poe.ninja, came back at 28,886c (really 2c) and
// stayed for over a day; an Alteration Shard read 214c for 29 hours. Such a
// price doesn't count at all while it's 5x or more over the item's last solid
// price (ref), or there is none, until poe.ninja prices it on a second day.
// In 3 days of prices every card that did this was fake, and real one-day
// prices (maps, scrying orbs) stayed near their earlier price.
export const HOLD_RATIO = 5
export const HOLD_MIN_JUMP = 1
export const HOLD_MS = 6 * 3_600_000
export const ONE_DAY_MIN = 10

// A spike: a sudden step up from an item's usual price. Rain Tempter was 1c
// every day of the app's saved history, then poe.ninja priced it at 20,140c
// (98 div). poe.ninja's own line only showed +2,362%, because it ran from an
// earlier fake (818c), and the card was thin, so the 6-hour jump rule let it
// through. The price is checked against the app's saved daily prices (up to
// 14 days, history.ts); poe.ninja's % line, anchored at today's price, is only
// the fallback when the app has none. A step to 5x or more the last day
// before it counts at the median of the days before the step (2+ of them
// priced; 3+ for gear) until it has held 3 priced days (within half of today's).
// A step of 50x or more never counts on time alone: only once under 2 of the
// window's days are left from before it. A steady climb (under 5x a day)
// is never a step. Gear priced from poe.ninja's line alone lets go after 6
// hours, like a jump: its lines are sparse.
export const SPIKE_MIN_DAYS = 2
export const SPIKE_MIN_DAYS_GEAR = 3
export const SPIKE_KEEP_DAYS = 3
export const SPIKE_NEVER_RATIO = 50

export type HoldKind = 'jump' | 'one-day' | 'spike'

// poe.ninja's line as chaos per day, today last, from today's price: the line
// is % change from one reference day, so day / today is the price ratio.
export function graphChaos (chaos: number, graph: Array<number | null> | undefined): Array<number | null> {
  if (!Array.isArray(graph) || !graph.length) return []
  const today = graph[graph.length - 1]
  if (typeof today !== 'number' || !(1 + today / 100 > 0)) return []
  return graph.map(v => typeof v === 'number' && 1 + v / 100 > 0 ? chaos * (1 + v / 100) / (1 + today / 100) : null)
}

// A step up in a price series (today last, = chaos): 'confirmed' once it has
// held 3 priced days, else the price to count instead. null: no step.
export function seriesStep (chaos: number, series: Array<number | null>, minDays = SPIKE_MIN_DAYS): number | 'confirmed' | null {
  const priced = series.filter((v): v is number => typeof v === 'number' && v > 0)
  if (priced.length < 2) return null
  // The days at the new price, today back to the step (gaps skipped).
  let start = priced.length - 1
  while (start > 0 && priced[start - 1] >= chaos / 2) start--
  const before = priced.slice(0, start)
  if (!before.length || before.length < minDays) return null
  const last = before[before.length - 1]
  if (!(last > 0) || chaos < last * HOLD_RATIO) return null
  const sorted = [...before].sort((a, b) => a - b)
  const mid = sorted.length >> 1
  const base = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  if (!(base > 0) || chaos < base * HOLD_RATIO || chaos - base < HOLD_MIN_JUMP) return null
  if (chaos >= base * SPIKE_NEVER_RATIO) return base
  return priced.length - start >= SPIKE_KEEP_DAYS ? 'confirmed' : base
}

export function graphStep (chaos: number, graph: Array<number | null> | undefined, minDays = SPIKE_MIN_DAYS): number | 'confirmed' | null {
  return seriesStep(chaos, graphChaos(chaos, graph), minDays)
}

// The price to count instead of a spike on poe.ninja's line, or null.
export function graphSpike (chaos: number, graph: Array<number | null> | undefined, minDays = SPIKE_MIN_DAYS): number | null {
  const step = graphStep(chaos, graph, minDays)
  return typeof step === 'number' ? step : null
}

// poe.ninja's line has today's price (within half) on its last 3 priced days.
function lineHeld (chaos: number, graph: Array<number | null> | undefined): boolean {
  const days = graphChaos(chaos, graph).filter((v): v is number => v != null)
  return days.length >= SPIKE_KEEP_DAYS && days.slice(-SPIKE_KEEP_DAYS).every(v => v >= chaos / 2)
}

// The step check on the app's saved prices when it has enough of them, else
// on poe.ninja's line. `saved`: which one it used.
export function priceStep (chaos: number, p: { graph?: Array<number | null>, history?: Array<number | null>, category?: Category }): { step: number | 'confirmed' | null, saved: boolean } {
  const minDays = p.category === 'gear' ? SPIKE_MIN_DAYS_GEAR : SPIKE_MIN_DAYS
  const saved = (p.history ?? []).filter(v => typeof v === 'number' && v > 0).length >= minDays
  if (saved) {
    const step = seriesStep(chaos, [...p.history!, chaos], minDays)
    // poe.ninja has had it 3 days too (a day the app saved nothing): real,
    // unless it's a 50x step.
    if (typeof step === 'number' && chaos < step * SPIKE_NEVER_RATIO && lineHeld(chaos, p.graph)) return { step: 'confirmed', saved }
    return { step, saved }
  }
  return { step: graphStep(chaos, p.graph, minDays), saved }
}

export type NinjaDoubt =
  /** poe.ninja priced it today and on none of the days before. */
  | { kind: 'one-day', usual: number | null }
  /** A step of 5x or more over its usual price that hasn't held 3 days. */
  | { kind: 'spike', usual: number }
  /** No price on 3+ of the last 7 days: one fake listing can set it. */
  | { kind: 'thin', gaps: number }

export interface TrustInput {
  chaos: number
  /** poe.ninja's 7-day line, % change, today last. */
  graph?: Array<number | null>
  /** Days the league has prices for (market/parse feedDays): a new league isn't all thin. */
  days?: number
  /** The app's saved daily prices for the days before today, oldest first (net-worth/history.ts). */
  history?: Array<number | null>
  category?: Category
}

/** Why poe.ninja's price may be wrong, or null when nothing points that way. */
export function ninjaDoubt (p: TrustInput): NinjaDoubt | null {
  if (!(p.chaos > 0)) return null
  const history = p.history?.some(v => typeof v === 'number' && v > 0) ? p.history : undefined
  // Gear trades on so few days that a one-day price there is usually real (valuation.ts).
  if (p.category !== 'gear' && p.chaos >= ONE_DAY_MIN && pricedOnlyToday(p.graph, p.days)) {
    const last = history ? [...history].reverse().find((v): v is number => typeof v === 'number' && v > 0) ?? null : null
    if (last == null || p.chaos >= last * HOLD_RATIO) return { kind: 'one-day', usual: last }
  }
  const { step } = priceStep(p.chaos, { graph: p.graph, history, category: p.category })
  if (typeof step === 'number') return { kind: 'spike', usual: step }
  // Confirmed (held 3 days): a real price, thin or not.
  if (step === 'confirmed') return null
  // Gear's lines are mostly gaps even when its price is real: no thin mark there.
  if (p.category === 'gear') return null
  const gaps = graphGaps(p.graph, p.days)
  if (gaps >= THIN_GAPS) return { kind: 'thin', gaps }
  return null
}

/** poe.ninja's market type to Net worth's category, for the rules above. */
export function categoryOfType (type: string | undefined): Category | undefined {
  if (!type) return undefined
  if (type === 'DivinationCard') return 'cards'
  if (type.startsWith('Unique') || type === 'SkillGem') return 'gear'
  if (type === 'Currency' || type === 'Omen') return 'currency'
  return 'other'
}

// A poe.ninja price a window doesn't count as is, and what it counts instead.
export interface HeldPrice {
  // poe.ninja's price.
  ninja: number
  // What counts instead (null: no earlier price, so nothing).
  chaos: number | null
  // drop-rate: more than a common card can be worth (stacked-decks/guard.ts).
  kind: 'one-day' | 'spike' | 'drop-rate'
}

// The price to count for a poe.ninja row, from its own 7-day line: a price on
// one day only (10c+) counts as nothing, a sudden 5x step at the usual price
// until it holds (Thirst for Knowledge read 14,139c, Rain Tempter 20,140c).
// A thin market alone is kept: most cheap items are thin. `days`: the days the
// league has prices for (market/parse feedDays or leagueDays).
export function heldPrice (chaos: number, graph: Array<number | null> | undefined, days: number | undefined, category?: Category): HeldPrice | null {
  const d = ninjaDoubt({ chaos, graph, days, category })
  if (d?.kind === 'one-day') return { ninja: chaos, chaos: d.usual, kind: 'one-day' }
  if (d?.kind === 'spike') return { ninja: chaos, chaos: d.usual, kind: 'spike' }
  return null
}

// The line a window shows beside a held price. `price` formats chaos.
export function heldWhy (h: HeldPrice): string {
  return h.kind === 'one-day' ? 'on the one day it had a price' : h.kind === 'drop-rate' ? 'far more than a card this common can be worth' : 'a sudden step from its usual price'
}

export function heldText (h: HeldPrice, price: (chaos: number) => string): string {
  const why = heldWhy(h)
  return `poe.ninja: ${price(h.ninja)}, ${why}. Prices like that have been a few fake listings, so ${h.chaos != null ? `it counts at its usual ${price(h.chaos)}` : 'it counts as nothing'} until the price holds.`
}
