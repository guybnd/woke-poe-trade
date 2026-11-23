// Reads your Faustus (merchant tab) listings made since a run's start: one
// trade search on your own account, newest first, then fetches of ten until
// a listing is older than the start. The price check's rate limits apply.
import { AppConfig } from '@/web/Config'
import { hostRequest } from '../shared/host'
import { listingsQuery, toListing } from './faustus'
import type { FaustusRead, Listing } from './faustus'

// At most this many fetches (100 listings) a read: one search returns 100 ids.
export const MAX_FETCHES = 10

export async function ownAccount (): Promise<string | null> {
  const a = await hostRequest('stash-auth-status', { verify: false }).catch(() => null)
  return a?.account || AppConfig().accountName || null
}

// `yieldToSearches`: stop (throw) when another trade search goes out mid-read,
// so a quiet refresh never holds up a price check's fetches.
export async function readFaustus (league: string, since: number, now = Date.now(), opts?: { yieldToSearches?: boolean }): Promise<FaustusRead> {
  const account = await ownAccount()
  if (!account) throw new Error('Sign in to the stash reader, or set your account name in Settings, to read your Faustus listings')
  const { lastTradeSearchAt, requestResults, requestTradeResultList } = await import('@/web/price-check/trade/pathofexile-trade')
  const search = await requestTradeResultList(listingsQuery(account) as unknown as Parameters<typeof requestTradeResultList>[0], league, true)
  const ours = lastTradeSearchAt()
  const listings: Listing[] = []
  let older = false
  for (let i = 0; i < MAX_FETCHES && !older; i++) {
    const ids = search.result.slice(i * 10, i * 10 + 10)
    if (!ids.length) break
    if (opts?.yieldToSearches && lastTradeSearchAt() !== ours) throw new Error('Stopped for your own trade search')
    const got = await requestResults(search.id, ids, { accountName: account, fresh: true })
    for (const r of got) {
      if (r.indexedAt && Date.parse(r.indexedAt) <= since) { older = true; continue }
      const l = toListing(r)
      if (l) listings.push(l)
    }
  }
  const more = !older && search.result.length >= MAX_FETCHES * 10
  return { at: now, listings, ...(more ? { more: true } : {}) }
}
