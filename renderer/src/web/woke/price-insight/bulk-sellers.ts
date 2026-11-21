// woke: "Bulk" in the price check results keeps only sellers with two or more copies
// at one price (a stack of more than one counts too), so a bulk buy has someone to ask.

export interface BulkListing {
  accountName: string
  priceAmount: number
  priceCurrency: string
  stackSize?: number
  listedTimes: number
}

/** Rows the toggle aims for before it stops pulling more result pages. */
export const BULK_ENOUGH = 10

// kind: what else two copies must share to count as one item (stats, corruption).
type Kind<T> = (l: T) => string

function key<T extends BulkListing> (l: T, kind?: Kind<T>) {
  return `${l.accountName}|${l.priceAmount}|${l.priceCurrency}|${kind?.(l) ?? ''}`
}

export function bulkOnly<T extends BulkListing> (listings: readonly T[], kind?: Kind<T>): T[] {
  const copies = new Map<string, number>()
  for (const l of listings) copies.set(key(l, kind), (copies.get(key(l, kind)) ?? 0) + l.listedTimes)
  return listings.filter(l => (l.stackSize ?? 0) > 1 || copies.get(key(l, kind))! > 1)
}

/** Sellers the filter keeps: one per account, price and kind. */
export function bulkSellerCount<T extends BulkListing> (listings: readonly T[], kind?: Kind<T>): number {
  return new Set(bulkOnly(listings, kind).map(l => key(l, kind))).size
}
