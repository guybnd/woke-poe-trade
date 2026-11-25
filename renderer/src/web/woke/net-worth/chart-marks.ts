// The Holdings chart's marks (Guy's picks, 2026-11-24): sales as small ticks
// on the bottom edge (calm S2), and your maps as columns (D).
// Pure: no Vue, no IO.
import type { ItemTipRef } from '../ui/tooltip/item-tip'

export interface ChartSale {
  at: number
  // The hover card's line: "Forbidden Flame", a rare by its base ("Sapphire Ring").
  text: string
  tip?: ItemTipRef
  // A rare's one dim fact after its base: "6L", "ilvl 86", "T16".
  fact?: string
  // "18 d", after the name.
  price?: string
  // Its inventory art and rarity colour.
  icon?: string
  colour?: string
  name?: string
  // Its price in the chart's unit (null: a currency without a price).
  div?: number | null
}

export interface ChartMap {
  from: number
  to: number
  // "Map 7 · Strand"
  name: string
  // What the refreshes after it added, in the chart's unit.
  gainDiv: number | null
}

// A tick per slot of time: about `slots` across the chart, on a round step.
// Each is its slot's dearest sale, worth the slot's total, with how many sold.
const STEPS = [5, 10, 15, 30, 60, 120, 180, 360, 720, 1440, 2880, 10080].map(m => m * 60_000)
export function slotOf (t0: number, t1: number, slots = 16): number {
  const want = Math.max(1, t1 - t0) / slots
  return STEPS.find(s => s >= want) ?? STEPS[STEPS.length - 1]
}
export type SaleSlot<T> = T & { count: number, list: T[] }
export function groupSales<T extends ChartSale> (sales: readonly T[], t0: number, t1: number, slots = 16): Array<SaleSlot<T>> {
  const step = slotOf(t0, t1, slots)
  const by = new Map<number, T[]>()
  for (const s of sales) {
    const k = Math.floor(s.at / step)
    const list = by.get(k)
    if (list) list.push(s)
    else by.set(k, [s])
  }
  return [...by.values()].map(list => {
    const top = list.reduce((a, b) => (b.div ?? -1) > (a.div ?? -1) ? b : a)
    const priced = list.filter(x => x.div != null)
    return { ...top, div: priced.length ? priced.reduce((n, x) => n + x.div!, 0) : null, count: list.length, list: [...list].sort((a, b) => (b.div ?? -1) - (a.div ?? -1)) }
  }).sort((a, b) => a.at - b.at)
}

// A read comes in the hideout after a map: the map before it, if the read
// is within this long of the map's end.
const AFTER_MS = 20 * 60_000
export function mapOf (maps: readonly ChartMap[], at: number): ChartMap | null {
  let found: ChartMap | null = null
  for (const m of maps) if (m.from <= at) found = m
  return found && at - found.to <= AFTER_MS ? found : null
}

// The value axis: round numbers inside [lo, hi], about `n` of them, on a
// 1, 2 or 5 step (Guy, 2026-11-25: "a total number axis on height").
export function valueTicks (lo: number, hi: number, n = 3): number[] {
  if (!(hi > lo)) return []
  const raw = (hi - lo) / n
  const mag = 10 ** Math.floor(Math.log10(raw))
  // The round step nearest the raw one (by ratio).
  const step = [1, 2, 5, 10].map(m => m * mag).reduce((a, b) => Math.abs(Math.log(b / raw)) < Math.abs(Math.log(a / raw)) ? b : a)
  const out: number[] = []
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Math.round(v * 1e6) / 1e6)
  return out
}

// The time axis under the chart: round times inside [t0, t1], about `n` of
// them (on the hour, midnight, ...). Local time, so midnight is yours.
const TIME_STEPS = [15, 30, 60, 120, 180, 360, 720, 1440, 2880, 10080, 20160, 40320]
export function timeTicks (t0: number, t1: number, n = 5): { at: number, day: boolean }[] {
  if (!(t1 > t0)) return []
  const want = (t1 - t0) / n / 60_000
  const min = TIME_STEPS.find(s => s >= want) ?? TIME_STEPS[TIME_STEPS.length - 1]
  const day = min >= 1440
  // Start from local midnight before t0 (a Monday for week steps) and step in
  // local time, so a daylight saving change doesn't shift the ticks off midnight.
  const d = new Date(t0)
  d.setHours(0, 0, 0, 0)
  if (min >= 10080) d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  const step = () => day ? d.setDate(d.getDate() + min / 1440) : d.setMinutes(d.getMinutes() + min)
  const out: { at: number, day: boolean }[] = []
  for (let k = 0; k < 10_000 && d.getTime() < t0; k++) step()
  for (let k = 0; k < 1000 && d.getTime() <= t1; k++) {
    out.push({ at: d.getTime(), day })
    step()
  }
  return out
}
