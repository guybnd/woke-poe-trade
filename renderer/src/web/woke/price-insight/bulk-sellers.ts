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

function key (l: BulkListing) {
  return `${l.accountName}|${l.priceAmount}|${l.priceCurrency}`
}

export function bulkOnly<T extends BulkListing> (listings: readonly T[]): T[] {
  const copies = new Map<string, number>()
  for (const l of listings) copies.set(key(l), (copies.get(key(l)) ?? 0) + l.listedTimes)
  return listings.filter(l => (l.stackSize ?? 0) > 1 || copies.get(key(l))! > 1)
}

/** Sellers the filter keeps: one per account and price. */
export function bulkSellerCount (listings: readonly BulkListing[]): number {
  return new Set(bulkOnly(listings).map(key)).size
}
