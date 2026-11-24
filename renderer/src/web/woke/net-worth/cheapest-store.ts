// "Still cheapest?" checks (cheapest.ts), one small doc per league. A check
// runs only on a click: one trade search and one fetch of ten.
import { shallowRef } from 'vue'
import { hostRequest } from '../shared/host'
import { cheapestKey, cheapestQuery, isCheapestDoc, summarize, withCheck } from './cheapest'
import type { CheapestDoc } from './cheapest'
import type { Listing } from './faustus'
import { saleChaos } from './sales'
import type { Rates } from './sales'

const COLLECTION = 'net-worth'
const FETCH = 10

export const cheapestDoc = shallowRef<CheapestDoc | null>(null)
// Item ids being checked now, and the last failure of each.
export const cheapestBusy = shallowRef<ReadonlySet<string>>(new Set())
export const cheapestErrors = shallowRef<Readonly<Record<string, string>>>({})
let loadedFor: string | null = null

export function loadCheapest (league: string): void {
  if (loadedFor === league) return
  loadedFor = league
  cheapestDoc.value = null
  ;(hostRequest('doc-get', { collection: COLLECTION, key: cheapestKey(league) }) as Promise<unknown>)
    .then((d) => {
      if (loadedFor !== league) return
      // A check made while this loaded wins over the saved doc.
      const saved = isCheapestDoc(d) && d.league === league ? d : null
      const now = cheapestDoc.value
      cheapestDoc.value = saved && now ? { league, checks: { ...saved.checks, ...now.checks } } : now ?? saved
    })
    .catch(() => {})
}

function setBusy (id: string, on: boolean) {
  const next = new Set(cheapestBusy.value)
  if (on) next.add(id); else next.delete(id)
  cheapestBusy.value = next
}

function setError (id: string, message: string | null) {
  const rest = Object.fromEntries(Object.entries(cheapestErrors.value).filter(([k]) => k !== id))
  cheapestErrors.value = message ? { ...rest, [id]: message } : rest
}

export async function checkCheapest (league: string, l: Listing, rates: Rates): Promise<void> {
  const body = cheapestQuery(l)
  const mine = saleChaos(l, rates)
  if (!body || mine == null || cheapestBusy.value.has(l.id)) return
  setBusy(l.id, true)
  setError(l.id, null)
  try {
    const { ownAccount } = await import('./faustus-read')
    const { requestResults, requestTradeResultList } = await import('@/web/price-check/trade/pathofexile-trade')
    const account = (await ownAccount()) ?? ''
    const search = await requestTradeResultList(body as unknown as Parameters<typeof requestTradeResultList>[0], league, true)
    const ids = search.result.slice(0, FETCH)
    const got = ids.length ? await requestResults(search.id, ids, { accountName: account, fresh: true }) : []
    const fetched = got.map(r => {
      // Prices compared as listed, the way the price check shows them: a
      // stack's price note isn't split here (rare in a merchant tab).
      return { chaosEach: saleChaos({ price: { amount: r.priceAmount, currency: r.priceCurrency } }, rates), mine: r.isMine }
    })
    const check = summarize(l, mine, fetched, search.total, search.result.length <= FETCH, Date.now())
    if (loadedFor !== league) return
    const next = withCheck(cheapestDoc.value, league, l.id, check)
    cheapestDoc.value = next
    await hostRequest('doc-put', { collection: COLLECTION, key: cheapestKey(league), value: next }).catch(() => {})
  } catch (e) {
    setError(l.id, e instanceof Error ? e.message : String(e))
  } finally {
    setBusy(l.id, false)
  }
}
