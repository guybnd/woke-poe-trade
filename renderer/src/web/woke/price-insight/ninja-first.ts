// Exchange items poe.ninja prices exactly (currency, fragments, scarabs, cards…):
// the price check shows that cached price as its verdict and searches the
// exchange only on a click, so a check spends no trade search by itself.
// Pure: no Vue or IO.

// The poe.ninja row for the exact item is exactDetailsId (price-check/trends/getDetailsId.ts).

export interface HoldOptions {
  /** Which trade API the item is searched with. */
  api: 'trade' | 'bulk'
  /** The setting (unset counts as on). */
  enabled: boolean | undefined
  /** The check was asked for from inside the overlay ("Price check" in a menu, Ctrl+Space): it wants listings. */
  live: boolean
  /** poe.ninja's chaos price for the exact item, if it has one. */
  chaos: number | null | undefined
}

/** True when the first exchange search waits for a click. */
export function holdBulkSearch (o: HoldOptions): boolean {
  return o.enabled !== false && !o.live && o.api === 'bulk' && o.chaos != null && o.chaos > 0
}
