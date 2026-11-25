// "Still cheapest?" checks (cheapest.ts), one small doc per league. A check
// runs only on a click: one trade search and one fetch of ten.
import { shallowRef } from 'vue'
import { hostRequest } from '../shared/host'
import { cheapestKey, cheapestQuery, isCheapestDoc, summarize, withCheck, withTarget } from './cheapest'
import type { TargetPrice } from './listed-target'
import type { CheapestCheck, CheapestDoc } from './cheapest'
import type { Listing } from './faustus'
import { ITEM_BY_REF } from '@/assets/data'
import { saleChaos } from './sales'
import type { Rates } from './sales'

const COLLECTION = 'net-worth'
const FETCH = 10

export const cheapestDoc = shallowRef<CheapestDoc | null>(null)
// Item ids being checked now, and the last failure of each.
export const cheapestBusy = shallowRef<ReadonlySet<string>>(new Set())
export const cheapestErrors = shallowRef<Readonly<Record<string, string>>>({})
let loadedFor: string | null = null
let loading: Promise<void> = Promise.resolve()

// Resolves once the saved doc is in (a write waits for it, so it never
// overwrites saved checks it hasn't seen).
export function loadCheapest (league: string): Promise<void> {
  if (loadedFor === league) return loading
  loadedFor = league
  cheapestDoc.value = null
  // Strict: null only when there's no file yet; a locked one throws.
  loading = (hostRequest('doc-get-strict', { collection: COLLECTION, key: cheapestKey(league) }) as Promise<unknown>)
    .then((d) => {
      if (loadedFor !== league) return
      // A check made while this loaded wins over the saved doc.
      const saved = isCheapestDoc(d) && d.league === league ? d : null
      const now = cheapestDoc.value
      cheapestDoc.value = saved && now
        ? { league, checks: { ...saved.checks, ...now.checks }, targets: { ...saved.targets, ...now.targets } }
        : now ?? saved
    })
    .catch(() => { if (loadedFor === league) loadedFor = null })
  return loading
}

// A transfigured gem searches as its normal gem plus a discriminator, as the
// price check sends it.
function transfiguredOf (l: Listing) {
  if (l.frameType !== 4) return null
  const info = ITEM_BY_REF('GEM', l.typeLine)?.[0]
  const normal = info?.gem?.normalVariant
  if (!normal || !info?.tradeDisc) return null
  const base = ITEM_BY_REF('GEM', normal)?.[0]
  return base ? { option: base.refName, discriminator: info.tradeDisc } : null
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
  if (cheapestBusy.value.has(l.id)) return
  const body = cheapestQuery(l, transfiguredOf(l))
  if (!body) return
  const mine = saleChaos(l, rates)
  if (mine == null) { setError(l.id, `No price for ${l.price.currency} yet (poe.ninja still loading?)`); return }
  setBusy(l.id, true)
  setError(l.id, null)
  try {
    const { ownAccount } = await import('./faustus-read')
    const { requestResults, requestTradeResultList } = await import('@/web/price-check/trade/pathofexile-trade')
    // Without it your own listings would count as other sellers'.
    const account = await ownAccount()
    if (!account) throw new Error('Sign in to the stash reader, or set your account name in Settings')
    const search = await requestTradeResultList(body as unknown as Parameters<typeof requestTradeResultList>[0], league, true)
    const ids = search.result.slice(0, FETCH)
    const got = ids.length ? await requestResults(search.id, ids, { accountName: account, fresh: true }) : []
    const fetched = got.map(r => {
      // A stack's price is the whole stack's (as Listed takes yours): each.
      const c = saleChaos({ price: { amount: r.priceAmount, currency: r.priceCurrency } }, rates)
      return { chaosEach: c == null ? null : c / Math.max(1, r.stackSize ?? 1), mine: r.isMine }
    })
    const check = summarize(l, mine / Math.max(1, l.stack), fetched, search.total, search.result.length <= FETCH, Date.now())
    await loadCheapest(league)
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

// The listing a Listed row's Reprice opened the price check for: the price
// check's bar picks it over a match by name.
// It holds for the next item the price check shows, opened within a few
// seconds; any other item clears it.
export const repricing = shallowRef<{ league: string, id: string, at: number } | null>(null)

// A rank from a price check of the listing (checkFromAsks), saved as its check.
export async function saveCheck (league: string, id: string, check: CheapestCheck): Promise<void> {
  await loadCheapest(league)
  if (loadedFor !== league) return
  const next = withCheck(cheapestDoc.value, league, id, check)
  cheapestDoc.value = next
  await hostRequest('doc-put', { collection: COLLECTION, key: cheapestKey(league), value: next }).catch(() => {})
}

// A new price for a listing, from the price check's bar (null: clear it).
export async function setTarget (league: string, id: string, target: TargetPrice | null): Promise<void> {
  await loadCheapest(league)
  // Not read (locked): nothing is saved over it.
  if (loadedFor !== league) return
  const next = withTarget(cheapestDoc.value?.league === league ? cheapestDoc.value : null, league, id, target)
  cheapestDoc.value = next
  await hostRequest('doc-put', { collection: COLLECTION, key: cheapestKey(league), value: next }).catch(() => {})
}
