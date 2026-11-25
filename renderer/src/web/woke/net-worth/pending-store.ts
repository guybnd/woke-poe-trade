// Your Faustus listings for the Listed view (pending.ts), one small doc per
// league. Read again on a click (Refresh), when a run's Start reads them
// anyway, and (Guy, 2026-11-23) by themselves on entering your hideout at
// most every 30 min, once you've read them yourself (autoRefreshListed).
import { shallowRef } from 'vue'
import { hostRequest } from '../shared/host'
import { glanceOfPending, isPendingDoc, mergeRead, pendingKey } from './pending'
import { AUTO_REFRESH_MS, listedGlance, pendingGlanceKey } from './pending-glance'
import type { PendingDoc } from './pending'
import type { FaustusRead } from './faustus'

const COLLECTION = 'net-worth'

export const pendingDoc = shallowRef<PendingDoc | null>(null)
export const pendingReading = shallowRef(false)
let loadedFor: string | null = null
let loading: Promise<void> | null = null
let readOk = false

export function loadPending (league: string): Promise<void> {
  if (loadedFor === league && loading) return loading
  loadedFor = league
  readOk = false
  pendingDoc.value = null
  // Strict: null only when there's no file yet; a locked one throws.
  loading = (hostRequest('doc-get-strict', { collection: COLLECTION, key: pendingKey(league) }) as Promise<unknown>)
    .then((d) => {
      if (loadedFor !== league) return
      pendingDoc.value = isPendingDoc(d) && d.league === league ? d : null
      readOk = true
    })
    .catch(() => { if (loadedFor === league) loading = null })
  return loading
}

// A Faustus read of every listing (since 0), from here or a run's Start.
// The league switched while it read: that league's doc is merged and saved
// on its own, and what's shown stays the new league's.
export async function notePendingRead (league: string, read: FaustusRead): Promise<void> {
  let next: PendingDoc
  if (loadedFor === league || loadedFor == null) {
    await loadPending(league)
    if (loadedFor !== league || !readOk) return
    next = mergeRead(pendingDoc.value, league, read)
    if (next === pendingDoc.value) return
    pendingDoc.value = next
  } else {
    const was = await (hostRequest('doc-get-strict', { collection: COLLECTION, key: pendingKey(league) }) as Promise<unknown>).catch(() => undefined)
    if (was === undefined) return
    next = mergeRead(isPendingDoc(was) && was.league === league ? was : null, league, read)
  }
  const glance = glanceOfPending(next)
  if (listedGlance.value == null || listedGlance.value.league === league) listedGlance.value = glance
  await Promise.all([
    hostRequest('doc-put', { collection: COLLECTION, key: pendingKey(league), value: next }),
    hostRequest('doc-put', { collection: COLLECTION, key: pendingGlanceKey(league), value: glance })
  ]).catch(() => {})
}

// Refresh listings: one trade search on your account. `quiet`: the hideout
// refresh, which gives way to a price check (a search of yours) mid-read.
export async function refreshPending (league: string, quiet = false): Promise<void> {
  if (pendingReading.value) return
  pendingReading.value = true
  try {
    const { readFaustus } = await import('./faustus-read')
    const read = await readFaustus(league, 0, Date.now(), quiet ? { yieldToSearches: true } : undefined)
    await notePendingRead(league, read)
  } finally {
    pendingReading.value = false
  }
}

// On entering your hideout (the shell calls this): a quiet refresh when the
// last read is 30+ min old. Never before you've read your listings once, and
// not right after a trade search of your own (a price check), so it never
// takes the price check's place in the trade site's limits.
// A failed try counts too: a rate limit or an expired sign-in doesn't retry
// on every hideout entry.
let lastAutoAt = 0
export async function autoRefreshListed (league: string, now = Date.now()): Promise<boolean> {
  if (loadedFor != null && loadedFor !== league) return false
  await loadPending(league)
  const doc = pendingDoc.value
  if (!doc || doc.league !== league || pendingReading.value) return false
  if (now - doc.readAt < AUTO_REFRESH_MS || now - lastAutoAt < AUTO_REFRESH_MS) return false
  const { lastTradeSearchAt } = await import('@/web/price-check/trade/pathofexile-trade')
  if (now - lastTradeSearchAt() < 60_000) return false
  lastAutoAt = now
  await refreshPending(league, true)
  return true
}
