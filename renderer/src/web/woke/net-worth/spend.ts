// Purchases aren't losses. Buying a 50 d item takes 50 d of currency out of
// the stash, while the item goes on your character (never read) or has no
// price, so the refresh reads −50 d. Left alone, that tanks profit per hour,
// the session total and the session story's "Farming profit".
//
// A refresh that drops by at least SPEND_MIN_DIV, nearly all of it currency
// leaving, is a purchase: it counts at most 0 toward profit. Any losing
// refresh can be marked as one by hand, with how much was spent. A gain soon
// after that is about the purchase's size (the currency back from a trade
// that fell through, or the bought item put in the stash) cancels it instead
// of reading as profit. Each call can be flipped per refresh. Net worth itself
// (the chart, the total) always shows what is really there. Pure: no Vue.

export const SPEND_MIN_DIV = 10
// Chaos per divine when the rate isn't known yet.
const FALLBACK_DIVINE = 150
// Currency's share of the drop for it to be a purchase.
const CASH_SHARE = 0.75
// How long after a purchase a gain of about its size cancels it, and what
// "about its size" is (share of what's still out).
export const RETURN_WINDOW_MS = 2 * 3_600_000
const RETURN_MIN = 0.5
const RETURN_MAX = 1.15
// Smaller purchases are never cancelled: a loot refresh would match them.
const RETURN_FLOOR_DIV = 5

// The guess: 'spend' is a purchase.
export type SpendKind = 'spend'
// Your call on a refresh: 'spend' counts it as a purchase, 'counted' as it
// is (a purchase that wasn't one, or a gain that's profit after all).
export type SpendMark = 'spend' | 'counted'

export interface SpendFields {
  at: number
  netChaos: number
  // The currency part of netChaos; missing on refreshes from older versions.
  cashChaos?: number
  auto?: SpendKind
  mark?: SpendMark
  // With mark 'spend': how much you said you spent (chaos), from the chart.
  markChaos?: number
  // The read's divines (for its rate) and its biggest new item (chaos).
  netDivine?: number | null
  topAddChaos?: number
}

// What a refresh adds to profit, the chaos left out as spent, and the chaos
// that cancelled an earlier purchase.
export interface Resolved { counted: number, spent: number, back: number }

const bar = (divine: number | null) => SPEND_MIN_DIV * (divine && divine > 0 ? divine : FALLBACK_DIVINE)

// The guess for a new refresh. `divine`: chaos per divine now.
export function classify (d: { netChaos: number, cashChaos?: number }, divine: number | null): Pick<SpendFields, 'auto'> {
  const cash = d.cashChaos
  if (cash == null) return {}
  return d.netChaos <= -bar(divine) && cash <= CASH_SHARE * d.netChaos ? { auto: 'spend' } : {}
}

export function isPurchase (g: SpendFields): boolean {
  return g.mark === 'spend' || (g.auto === 'spend' && g.mark !== 'counted')
}

// A purchase counts its non-currency part, at most 0: currency in a priced
// item kept in the stash is a swap, never profit. With an amount you typed,
// that much is left out (the rest of the drop still counts).
function purchaseCounts (g: SpendFields): number {
  const net = g.netChaos
  if (net >= 0) return net
  if (g.mark === 'spend' && g.markChaos != null && g.markChaos >= 0) return Math.min(0, net + g.markChaos)
  return g.cashChaos != null && g.cashChaos < 0 ? Math.min(0, net - g.cashChaos) : 0
}

// Chaos per divine at that read, from its own numbers.
const rateOf = (g: SpendFields) => g.netDivine && g.netChaos ? g.netChaos / g.netDivine : FALLBACK_DIVINE

// A gain that looks like a purchase coming back: mostly currency (a trade
// that fell through), or one item worth most of it (the bought item stashed).
function looksBack (g: SpendFields): boolean {
  if (g.cashChaos != null && g.cashChaos >= CASH_SHARE * g.netChaos) return true
  return g.topAddChaos != null && g.topAddChaos >= 0.5 * g.netChaos
}

// Every refresh's share of profit, worked out in time order (so flipping one
// call moves the ones after it too). Keyed by the read's time.
export function resolveSpends (gains: readonly SpendFields[]): Map<number, Resolved> {
  const out = new Map<number, Resolved>()
  const open: Array<{ at: number, left: number }> = []
  for (const g of [...gains].sort((a, b) => a.at - b.at)) {
    if (isPurchase(g)) {
      const counted = purchaseCounts(g)
      const spent = Math.max(0, counted - g.netChaos)
      if (spent >= RETURN_FLOOR_DIV * rateOf(g)) open.push({ at: g.at, left: spent })
      out.set(g.at, { counted, spent, back: 0 })
      continue
    }
    let back = 0
    if (g.netChaos > 0 && g.mark !== 'counted' && looksBack(g)) {
      // The oldest purchase still out, in the window, that this gain is about
      // the size of. One gain closes it: nothing else can match it after.
      const o = open.find(x => x.left > 0 && x.at >= g.at - RETURN_WINDOW_MS && x.at < g.at &&
        g.netChaos >= RETURN_MIN * x.left && g.netChaos <= RETURN_MAX * x.left)
      if (o) {
        back = Math.min(g.netChaos, o.left)
        o.left = 0
      }
    }
    out.set(g.at, { counted: g.netChaos - back, spent: 0, back })
  }
  return out
}

// The switch on a refresh: what it says and the mark a click sets (null
// clears yours). Null: nothing to switch. `r`: its resolved share.
export function markAction (g: SpendFields, r: Resolved | undefined): { label: string, mark: SpendMark | null } | null {
  if (g.mark === 'spend') return { label: 'Not a purchase', mark: null }
  if (g.mark === 'counted') {
    if (g.auto === 'spend') return { label: 'Count as purchase', mark: null }
    return g.netChaos > 0 ? { label: 'Cancel the purchase', mark: null } : null
  }
  if (g.auto === 'spend') return { label: 'Not a purchase', mark: 'counted' }
  if (r && r.back > 0) return { label: 'Count as profit', mark: 'counted' }
  return g.netChaos < 0 ? { label: 'Count as purchase', mark: 'spend' } : null
}
