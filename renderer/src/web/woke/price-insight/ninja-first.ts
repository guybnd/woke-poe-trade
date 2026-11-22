// Exchange items poe.ninja prices exactly (currency, fragments, scarabs…), and
// fixed items it prices by name (cards, beasts, keys: fixedPriceItem):
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
  /** Not on the exchange but priced as a whole by poe.ninja (fixedPriceItem): holds its trade search too. */
  fixed?: boolean
}

/** True when the first exchange search waits for a click. */
export function holdBulkSearch (o: HoldOptions): boolean {
  return o.enabled !== false && !o.live && (o.api === 'bulk' || o.fixed === true) && o.chaos != null && o.chaos > 0
}

export interface FixedItemInfo {
  namespace: string
  refName: string
  craftable?: unknown
  tradeTag?: string
}

// Their price is in their text, not their name, so poe.ninja's price isn't theirs.
const PRICED_BY_TEXT = new Set(['Chronicle of Atzoatl', 'Expedition Logbook', 'Mercenary Warrant', 'Filled Coffin', 'Inscribed Ultimatum'])

/**
 * Not sold on the exchange, but one fixed thing poe.ninja prices by name
 * (Guy's picks, WOKEPOET-480): divination cards, captured beasts, and items
 * such as reliquary keys, Wombgifts, Ducats, Facetor's Lens, Forbidden Tome.
 */
export function fixedPriceItem (info: FixedItemInfo): boolean {
  if (info.tradeTag || PRICED_BY_TEXT.has(info.refName)) return false
  if (info.namespace === 'DIVINATION_CARD' || info.namespace === 'CAPTURED_BEAST') return true
  return info.namespace === 'ITEM' && !info.craftable
}
