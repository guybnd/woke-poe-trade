// Turns the flat list of trade listings into table rows for the improved view:
// one row per price, with a count, an age range and how stale the row looks.
// Pure functions, no Vue, so the grouping rules can be checked in isolation.
import { DROP_LABEL, DropReason } from './insight'

export interface RowListing {
  id: string
  priceAmount: number
  priceCurrency: string
  listedTimes: number
  hasFee: boolean
  hasNote: boolean
  isMine: boolean
  accountName: string
  accountStatus: 'offline' | 'online' | 'afk'
  indexedAt?: string
  relativeDate: string
}

export type AgeBand = 'fresh' | 'aging' | 'stale'
/** The listed time's colour: under an hour, under a day, under a week, older. */
export type AgeTone = 'new' | 'day' | 'week' | 'old'

export interface ListingRow<T extends RowListing> {
  key: string
  /** First listing in the row: everything shown besides age and status is the same on all members. */
  lead: T
  members: T[]
  /** Listings in the row, counting a seller's repeated ones. */
  count: number
  sellers: number
  /** The most available seller in the row. */
  status: RowListing['accountStatus']
  /** Age of the freshest listing, which decides how the row reads: one live listing is enough to buy. */
  band: AgeBand
  /** Colour of the listed time, from the youngest listing; null when the listings carry no time. */
  tone: AgeTone | null
  /** "2h" or "2h–25d"; empty when the listings carry no time. */
  ageText: string
  dropped?: DropReason
}

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
const AGING_MS = DAY
const STALE_MS = 7 * DAY

export function ageBand (ageMs: number | null): AgeBand {
  if (ageMs == null) return 'fresh'
  if (ageMs > STALE_MS) return 'stale'
  if (ageMs > AGING_MS) return 'aging'
  return 'fresh'
}

export function ageTone (ageMs: number | null): AgeTone | null {
  if (ageMs == null) return null
  // The colour changes where the label does: "59m" is new, "1h" isn't; "23h" is today, "1d" isn't.
  if (ageMs < HOUR) return 'new'
  if (ageMs < AGING_MS) return 'day'
  if (ageMs <= STALE_MS) return 'week'
  return 'old'
}

export function shortAge (ageMs: number): string {
  if (ageMs < 60_000) return 'now'
  if (ageMs < HOUR) return `${Math.floor(ageMs / 60_000)}m`
  if (ageMs < DAY) return `${Math.floor(ageMs / HOUR)}h`
  if (ageMs < 30 * DAY) return `${Math.floor(ageMs / DAY)}d`
  return `${Math.floor(ageMs / (30 * DAY))}mo`
}

const STATUS_RANK: Record<RowListing['accountStatus'], number> = { online: 2, afk: 1, offline: 0 }

function ageOf (l: RowListing, now: number): number | null {
  if (!l.indexedAt) return null
  const t = Date.parse(l.indexedAt)
  return Number.isNaN(t) ? null : Math.max(0, now - t)
}

export interface GroupOptions<T extends RowListing> {
  now: number
  dropped?: ReadonlyMap<string, DropReason>
  /** False keeps one row per listing, for the classic view. */
  merge: boolean
  /** Everything else a row shows (seller, item level, quality...). Listings only merge when it matches. */
  detail?: (l: T) => string
}

export function groupListings<T extends RowListing> (listings: readonly T[], opts: GroupOptions<T>): Array<ListingRow<T>> {
  const groups = new Map<string, T[]>()
  listings.forEach((l, idx) => {
    const key = opts.merge
      ? [l.priceAmount, l.priceCurrency, l.hasFee, l.hasNote, l.isMine, opts.dropped?.get(l.id) ?? '', opts.detail?.(l) ?? ''].join('|')
      : `${idx}|${l.id}`
    const members = groups.get(key)
    if (members) members.push(l)
    else groups.set(key, [l])
  })
  return Array.from(groups, ([key, members]) => buildRow(key, members, opts))
}

function buildRow<T extends RowListing> (key: string, members: T[], opts: GroupOptions<T>): ListingRow<T> {
  const ages = members.map(m => ageOf(m, opts.now)).filter((a): a is number => a != null)
  const youngest = ages.length ? Math.min(...ages) : null
  const oldest = ages.length ? Math.max(...ages) : null
  const low = youngest != null ? shortAge(youngest) : ''
  const high = oldest != null ? shortAge(oldest) : ''
  return {
    key,
    lead: members[0],
    members,
    count: members.reduce((sum, m) => sum + m.listedTimes, 0),
    sellers: new Set(members.map(m => m.accountName)).size,
    status: members.reduce<RowListing['accountStatus']>((best, m) =>
      STATUS_RANK[m.accountStatus] > STATUS_RANK[best] ? m.accountStatus : best, 'offline'),
    band: ageBand(youngest),
    tone: ageTone(youngest),
    ageText: low === high ? low : `${low}–${high}`,
    dropped: opts.dropped?.get(members[0].id)
  }
}

export function rowTitle<T extends RowListing> (row: ListingRow<T>): string | undefined {
  const lines: string[] = []
  if (row.dropped) lines.push(`Ignored by the verdict: ${DROP_LABEL[row.dropped]}`)
  if (row.count > 1) {
    lines.push(`${row.count} listings from ${row.sellers} ${row.sellers === 1 ? 'seller' : 'sellers'}`)
  }
  if (row.band === 'stale') {
    lines.push(row.lead.hasFee
      ? 'Instant buyout, unsold for over a week'
      : 'Every listing here is over a week old, so it may be gone')
  }
  return lines.length ? lines.join('\n') : undefined
}

/**
 * Orders items cheapest first by their value in chaos. The trade site sorts by its
 * own currency ratios, so a 150c listing can land after a 1 div one when divines
 * are worth more than it thinks. `chaosOf` converts at poe.ninja's rate; items it
 * can't value keep the trade site's order and go after the valued ones. Without
 * a divine rate (`chaosOf` null) nothing can be compared, so the order stays.
 */
export function sortByValue<T> (items: readonly T[], chaosOf: ((item: T) => number | null) | null): T[] {
  if (!chaosOf) return [...items]
  // Unvalued items count as Infinity; two of them give NaN, which falls back to index order.
  const value = items.map(item => chaosOf(item) ?? Infinity)
  return items.map((_, i) => i).sort((a, b) => (value[a] - value[b]) || (a - b)).map(i => items[i])
}
