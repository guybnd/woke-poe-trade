// How far to trust poe.ninja's price for one item, on the instant card (Ctrl+D)
// and the price check's cached verdict (WOKEPOET-534). The same checks Net
// worth uses before it counts a price (net-worth/valuation.ts holdJump), here
// without a last read to compare with: a price poe.ninja has on one day only
// (checked against the last saved daily price, not Net worth's last solid
// read), a sudden step up from the item's usual price, or a thin market.
// Pure: no Vue or IO.
import { HOLD_RATIO } from '../shared/price-trust'
import type { NinjaDoubt } from '../shared/price-trust'

// The checks themselves live in shared/price-trust.ts.
export { ninjaDoubt, categoryOfType } from '../shared/price-trust'
export type { NinjaDoubt, TrustInput } from '../shared/price-trust'

/**
 * Saved daily prices (date, chaos) as the days before `today`, oldest first,
 * the last `days` of them. undefined when the newest is older than `freshDays`:
 * an old price would make a real rise since look like a spike.
 */
export function dailySeries (rows: Array<{ date: string, chaos: number }>, today: string, days = 14, freshDays = 2): Array<number | null> | undefined {
  const byDate = new Map<string, number>()
  for (const r of rows) if (r.date < today && r.chaos > 0) byDate.set(r.date, r.chaos)
  if (!byDate.size) return undefined
  const todayMs = Date.parse(`${today}T00:00:00Z`)
  const out: Array<number | null> = []
  for (let i = days; i >= 1; i--) {
    const d = new Date(todayMs - i * 86_400_000).toISOString().slice(0, 10)
    out.push(byDate.get(d) ?? null)
  }
  let newest = -1
  out.forEach((v, i) => { if (v != null) newest = i })
  if (newest < 0 || days - newest > freshDays) return undefined
  return out
}

/** The line under the price, in the app's words. `price` formats chaos. */
export function doubtText (d: NinjaDoubt, price: (chaos: number) => string): string {
  if (d.kind === 'spike') return `Usually ${price(d.usual)}. A sudden step like this is often a few fake listings.`
  if (d.kind === 'one-day') {
    return d.usual != null
      ? `Usually ${price(d.usual)}. poe.ninja priced it today only, which has been fake before.`
      : 'poe.ninja priced it today only, with no earlier price to check. Prices like this have been fake.'
  }
  return `Thin market: poe.ninja had no price on ${d.gaps} of the last 7 days, so one listing can set it.`
}

/**
 * Ctrl+Space's saved prices have no line, only the price a day and a week
 * ago: a step of 5x or more over a day ago (a week ago without it), and 1c
 * or more, gets the same doubt as a spike. undefined: no such step.
 */
export function savedStep (chaos: number, d1?: number, d7?: number): number | undefined {
  // A day ago, else a week ago: a step that has held since yesterday isn't a
  // sudden one, and a steady rise over the week is never a step.
  const usual = typeof d1 === 'number' && d1 > 0 ? d1 : typeof d7 === 'number' && d7 > 0 ? d7 : undefined
  if (usual == null || !(chaos > 0)) return undefined
  return chaos >= usual * HOLD_RATIO && chaos - usual >= 1 ? usual : undefined
}
