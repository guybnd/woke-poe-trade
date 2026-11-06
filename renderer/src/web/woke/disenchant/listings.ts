// Listing counts for uniques, only when you ask for them (a button in the
// panel): three poe.ninja requests, then nothing until you ask again. The
// price download the app already makes has no counts.
import { shallowRef } from 'vue'
import { Host } from '@/web/background/IPC'

const TYPES = ['UniqueWeapon', 'UniqueArmour', 'UniqueAccessory']
// Under this many listings, a cheap price may be one or two lucky listings.
export const FEW_LISTINGS = 10

export interface ListingCounts {
  league: string
  ts: number
  // Plain versions (no 5 or 6 links, no relic), Foulborn counted with the unique.
  counts: Map<string, number>
}

export const listingCounts = shallowRef<ListingCounts | null>(null)
export const listingsLoading = shallowRef(false)
export const listingsError = shallowRef<string | null>(null)
// Counting again this soon gives the same numbers: poe.ninja updates hourly.
export const RECOUNT_MS = 5 * 60 * 1000
// True for a few minutes after a count (one timer, no polling).
export const recountTooSoon = shallowRef(false)
let recountTimer: ReturnType<typeof setTimeout> | null = null

interface Line { name?: unknown, detailsId?: unknown, listingCount?: unknown }

export function readCounts (pages: Array<{ lines?: Line[] }>): Map<string, number> {
  const counts = new Map<string, number>()
  for (const page of pages) {
    for (const line of page.lines ?? []) {
      if (typeof line.name !== 'string' || typeof line.listingCount !== 'number') continue
      const id = typeof line.detailsId === 'string' ? line.detailsId : ''
      if (/-(5l|6l|relic)$/.test(id)) continue
      const name = line.name.replace(/^Foulborn /, '')
      counts.set(name, (counts.get(name) ?? 0) + line.listingCount)
    }
  }
  return counts
}

let seq = 0
export async function loadListingCounts (league: string): Promise<void> {
  const mine = ++seq
  listingsLoading.value = true
  listingsError.value = null
  try {
    const pages = await Promise.all(TYPES.map(async type => {
      const res = await Host.proxy(`poe.ninja/poe1/api/economy/stash/current/item/overview?league=${encodeURIComponent(league)}&type=${type}`)
      if (!res.ok) throw new Error(`poe.ninja answered ${res.status}`)
      return await res.json() as { lines?: Line[] }
    }))
    if (mine !== seq) return
    listingCounts.value = { league, ts: Date.now(), counts: readCounts(pages) }
    recountTooSoon.value = true
    if (recountTimer) clearTimeout(recountTimer)
    recountTimer = setTimeout(() => { recountTooSoon.value = false; recountTimer = null }, RECOUNT_MS)
  } catch (err) {
    if (mine !== seq) return
    listingsError.value = err instanceof Error ? err.message : String(err)
  } finally {
    if (mine === seq) listingsLoading.value = false
  }
}

// Counts for another league are no use.
export function countsFor (league: string | undefined): ListingCounts | null {
  const c = listingCounts.value
  return c && c.league === league ? c : null
}
