// woke: the currency chip in the price check results (beside Bulk): show only the
// listings priced in chaos, or only those priced in divines. It filters what the
// search already loaded; it never searches. Pure functions, no Vue.

export type CurrencyView = 'all' | 'chaos' | 'divine'

export const CURRENCY_STEPS: ReadonlyArray<{ value: CurrencyView, label: string, what: string }> = [
  { value: 'all', label: 'All', what: 'every currency' },
  { value: 'chaos', label: 'Chaos', what: 'chaos' },
  { value: 'divine', label: 'Divine', what: 'divines' }
]

/** Enough listings in the picked currency to stop loading pages. */
export const CURRENCY_ENOUGH = 10

/**
 * Whether the chip has a choice to offer: the search's price filter (filters.trade.currency)
 * must let both chaos and divine listings through. A search for one currency only has none.
 */
export function hasCurrencyChoice (searched: string | null | undefined): boolean {
  return searched == null || searched === 'chaos_divine'
}

export function nextCurrencyView (now: CurrencyView): CurrencyView {
  const at = CURRENCY_STEPS.findIndex(step => step.value === now)
  return CURRENCY_STEPS[(at + 1) % CURRENCY_STEPS.length].value
}

export function inCurrency (listing: { priceCurrency: string }, view: CurrencyView): boolean {
  return view === 'all' || listing.priceCurrency === view
}

export function currencyTitle (view: CurrencyView, searched: string | null | undefined): string {
  const step = CURRENCY_STEPS.find(s => s.value === view)!
  const now = view === 'all'
    ? (searched == null ? 'Showing listings in every currency.' : 'Showing listings in chaos and divines.')
    : `Showing only listings priced in ${step.what}.`
  return `${now} Click to change: All, Chaos, Divine. Filters the listings already loaded, without a new search.`
}

/** How far the opening fetch goes looking for chaos listings behind divine ones. */
export const CHAOS_HUNT_LIMIT = 50
/** Above this many divines, nobody lists in chaos anyway: no hunt (a Mageblood stays at two pages). */
export const CHAOS_HUNT_MAX_DIV = 10

/**
 * The trade site sorts a mixed chaos and divine search by its own divine rate, which
 * lags the market: when it's far under poe.ninja's, divine listings sort ahead of
 * cheaper chaos ones (2 div before 337c with a divine at 410c), and the first pages may
 * hold no chaos listing at all. While that's so, the opening fetch loads further pages
 * of the same search until a chaos listing shows; the site sorts chaos listings among
 * themselves by amount, so the first one seen is the cheapest. (The other way round, a
 * site rate over the market's, hides cheaper divine listings; that's rare and not handled.)
 */
export function chaosMayHide (listings: ReadonlyArray<{ priceCurrency: string, priceAmount: number } | null | undefined>, searched: string | null | undefined): boolean {
  if (!hasCurrencyChoice(searched)) return false
  let cheapestDiv = Infinity
  for (const l of listings) {
    if (l == null) continue
    if (l.priceCurrency === 'chaos') return false
    if (l.priceCurrency === 'divine') cheapestDiv = Math.min(cheapestDiv, l.priceAmount)
  }
  return cheapestDiv <= CHAOS_HUNT_MAX_DIV
}
