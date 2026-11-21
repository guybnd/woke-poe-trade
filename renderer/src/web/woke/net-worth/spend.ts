// Purchases aren't losses. Buying a 50 d item takes 50 d of currency out of
// the stash, while the item goes on your character (never read) or has no
// price, so the refresh reads −50 d. Left alone, that tanks profit per hour,
// the session total and the session story's "Farming profit".
//
// A refresh that drops by at least SPEND_MIN_DIV, nearly all of it currency
// leaving, is a purchase: it counts at most 0 toward profit. Currency coming
// back soon after (a trade that fell through) cancels the purchase instead of
// reading as profit. Either guess can be flipped per refresh. Net worth itself
// (the chart, the total) always shows what is really there. Pure: no Vue.

export const SPEND_MIN_DIV = 10
// Chaos per divine when the rate isn't known yet.
const FALLBACK_DIVINE = 150
// Currency's share of the drop for it to be a purchase.
const CASH_SHARE = 0.75
// How long after a purchase currency coming back cancels it.
export const RETURN_WINDOW_MS = 6 * 3_600_000

// 'spend': the refresh is a purchase. 'return': currency came back after one.
export type SpendKind = 'spend' | 'return'
// Your call on a refresh: 'spend' counts it as a purchase, 'counted' as it is.
export type SpendMark = 'spend' | 'counted'

export interface SpendFields {
  netChaos: number
  // The currency part of netChaos; missing on refreshes from older versions.
  cashChaos?: number
  auto?: SpendKind
  // For a return: the chaos that cancelled earlier purchases.
  back?: number
  mark?: SpendMark
  // With mark 'spend': how much you said you spent (chaos), from the chart.
  markChaos?: number
}

const bar = (divine: number | null) => SPEND_MIN_DIV * (divine && divine > 0 ? divine : FALLBACK_DIVINE)

// A purchase counts its non-currency part, at most 0: currency in a priced
// item kept in the stash is a swap, never profit. With an amount you typed,
// that much is left out (the rest of the drop still counts).
function purchaseCounts (net: number, cash: number | undefined, amount?: number): number {
  if (net >= 0) return net
  if (amount != null && amount >= 0) return Math.min(0, net + amount)
  return cash != null && cash < 0 ? Math.min(0, net - cash) : 0
}

// What a refresh adds to profit (chaos).
export function countedChaos (g: SpendFields): number {
  if (g.mark === 'counted') return g.netChaos
  if (g.mark === 'spend') return purchaseCounts(g.netChaos, g.cashChaos, g.markChaos)
  if (g.auto === 'spend') return purchaseCounts(g.netChaos, g.cashChaos)
  if (g.auto === 'return') return g.netChaos - (g.back ?? 0)
  return g.netChaos
}

// Chaos left out as spent (0 unless it counts as a purchase).
export function spentChaos (g: SpendFields): number {
  if (g.mark === 'counted' || !(g.mark === 'spend' || g.auto === 'spend')) return 0
  return Math.max(0, countedChaos(g) - g.netChaos)
}

// The switch on a refresh in the change list: what it says and the mark a
// click sets (null clears yours). Null: nothing to switch (a gain).
export function markAction (g: SpendFields): { label: string, mark: SpendMark | null } | null {
  if (g.mark === 'spend') return { label: 'Count as loss', mark: null }
  if (g.mark === 'counted') return g.auto ? { label: g.auto === 'spend' ? 'Count as purchase' : 'Count as returned', mark: null } : null
  if (g.auto === 'spend') return { label: 'Count as loss', mark: 'counted' }
  if (g.auto === 'return') return { label: 'Count as profit', mark: 'counted' }
  return g.netChaos < 0 ? { label: 'Count as purchase', mark: 'spend' } : null
}

// The guess for a new refresh, given the refreshes before it (with their
// times). `divine`: chaos per divine now.
export function classify (
  d: { netChaos: number, cashChaos?: number }, at: number,
  before: ReadonlyArray<SpendFields & { at: number }>, divine: number | null
): Pick<SpendFields, 'auto' | 'back'> {
  const net = d.netChaos
  const cash = d.cashChaos
  if (cash == null) return {}
  const min = bar(divine)
  if (net <= -min && cash <= CASH_SHARE * net) return { auto: 'spend' }
  if (net >= min && cash >= CASH_SHARE * net) {
    const open = openSpend(before, at)
    if (open > 0) return { auto: 'return', back: Math.min(net, cash, open) }
  }
  return {}
}

// What a purchase marked from the chart would leave out by default: the
// whole drop (chaos), or null when the refresh didn't lose anything.
export function defaultSpend (g: SpendFields): number | null {
  return g.netChaos < 0 ? -g.netChaos : null
}

// Spent in the window before `at` and not come back yet.
export function openSpend (before: ReadonlyArray<SpendFields & { at: number }>, at: number): number {
  let open = 0
  for (const g of before) {
    if (g.at >= at || g.at < at - RETURN_WINDOW_MS) continue
    open += spentChaos(g)
    if (g.auto === 'return' && g.mark !== 'counted') open -= g.back ?? 0
  }
  return Math.max(0, open)
}
