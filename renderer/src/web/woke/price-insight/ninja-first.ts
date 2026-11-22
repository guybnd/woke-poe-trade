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

export interface FixedItem {
  info: {
    namespace: string
    refName: string
    craftable?: unknown
    tradeTag?: string
  }
  // What the trade site prices some of them by, which poe.ninja's one row by name doesn't know.
  areaLevel?: number
  storedExperience?: number
  mapArea?: unknown
  itemLevel?: number
}

// Their price is in their text, not their name, so poe.ninja's price isn't theirs.
const PRICED_BY_TEXT = new Set(['Chronicle of Atzoatl', 'Expedition Logbook', 'Mercenary Warrant', 'Filled Coffin', 'Inscribed Ultimatum'])

/**
 * Not sold on the exchange, but one fixed thing poe.ninja prices by name
 * (Guy's picks, WOKEPOET-480): divination cards, captured beasts, and items
 * such as reliquary keys, Wombgifts and Ducats. Not one whose price follows an
 * area level (Forbidden Tome), stored experience (Facetor's Lens), map area
 * (Scrying Orb) or item level (corpses): poe.ninja's row by name isn't its price.
 */
export function fixedPriceItem (item: FixedItem): boolean {
  const { info } = item
  if (info.tradeTag || PRICED_BY_TEXT.has(info.refName)) return false
  // A beast's copy can show a level the search never uses.
  if (info.namespace === 'DIVINATION_CARD' || info.namespace === 'CAPTURED_BEAST') return true
  if (info.namespace !== 'ITEM' || info.craftable) return false
  if (item.areaLevel != null || (item.storedExperience ?? 0) > 0 || item.mapArea != null) return false
  // A Wombgift's level band is part of its poe.ninja row (getDetailsId).
  return item.itemLevel == null || info.refName.endsWith('Wombgift')
}
