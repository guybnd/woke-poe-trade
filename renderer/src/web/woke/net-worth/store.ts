// Net worth state for the window: the last read from main, valued with
// poe.ninja prices, plus history and the "since last refresh" list. Loaded
// with the window or after a read, never at startup.
import { computed, shallowRef, watch } from 'vue'
import { usePoeninja } from '@/web/background/Prices'
import { hostRequest } from '../shared/host'
import { ninjaPriceOf } from './prices'
import {
  addGain, baselineOf, diffStash, emptyHistory, gainOf, perHourToday, recordRead, sinceYesterday, valueStash
} from './valuation'
import { stashGains, gainsKey } from './gains'
import type { Baseline, NetWorthHistory, StashTabLike, Valuation } from './valuation'
import type { ReaderStatus } from './widget'

interface CachedStash { league: string, account: string, tabs: Array<StashTabLike & { readAt: number | null }> }

const COLLECTION = 'net-worth'

const status = shallowRef<ReaderStatus | null>(null)
const stash = shallowRef<CachedStash | null>(null)
const history = shallowRef<NetWorthHistory>(emptyHistory())
const league = shallowRef<string | null>(null)
let loadedFor: string | null = null
let busy: Promise<void> = Promise.resolve()

const ninja = usePoeninja()

export const valuation = computed<Valuation | null>(() => {
  // Read so a new price download values again.
  if (ninja.updatedAt.value == null || !stash.value) return null
  return valueStash(stash.value.tabs, ninjaPriceOf())
})

export const divine = computed(() => ninja.xchgRate.value ?? null)

export const summary = computed(() => {
  const v = valuation.value
  if (!v) return null
  const now = Date.now()
  return {
    chaos: v.chaos,
    sinceYesterdayDiv: sinceYesterday(history.value, v.chaos, divine.value, now),
    perHourChaos: perHourToday(history.value, now),
    tabs: stash.value?.tabs.length ?? 0
  }
})

export const lastDiff = computed(() => history.value.lastDiff)
export const readerStatus = computed(() => status.value)
export const pricesReady = computed(() => ninja.updatedAt.value != null)

async function loadLeague (id: string) {
  if (loadedFor === id) return
  loadedFor = id
  const [saved, cache] = await Promise.all([
    hostRequest<NetWorthHistory | null>('doc-get', { collection: COLLECTION, key: id }).catch(() => null),
    hostRequest<CachedStash | null>('stash-cache', { league: id }).catch(() => null)
  ])
  if (loadedFor !== id) return
  history.value = { ...emptyHistory(), ...(saved ?? {}) }
  stash.value = cache
}

// After a read: value it, count it once, and diff it against the read before.
async function countRead (id: string, readAt: number) {
  if (history.value.countedReadAt != null && history.value.countedReadAt >= readAt) return
  stash.value = await hostRequest<CachedStash | null>('stash-cache', { league: id }).catch(() => stash.value)
  const v = valuation.value
  if (!v || loadedFor !== id) return
  // A tab never read counts as empty: until every tab has been read once, a
  // later read would book its contents as new. Nothing is counted till then.
  if (!stash.value?.tabs.length || stash.value.tabs.some(t => t.readAt == null)) return
  const baseKey = `${id}-baseline`
  const before = await hostRequest<Baseline | null>('doc-get', { collection: COLLECTION, key: baseKey }).catch(() => null)
  const since = history.value.countedReadAt
  let next = recordRead(history.value, v, divine.value, readAt)
  if (before) {
    const diff = diffStash(before, v, readAt)
    next = { ...next, lastDiff: diff }
    // Every refresh's net change, for session profit elsewhere (gains.ts).
    const gains = addGain(await stashGains(id), gainOf(diff, since, divine.value))
    await hostRequest('doc-put', { collection: COLLECTION, key: gainsKey(id), value: gains }).catch(() => {})
  }
  history.value = next
  await hostRequest('doc-put', { collection: COLLECTION, key: id, value: next }).catch(() => {})
  await hostRequest('doc-put', { collection: COLLECTION, key: baseKey, value: baselineOf(v) }).catch(() => {})
}

function queue (fn: () => Promise<void>) {
  busy = busy.then(fn).catch((e) => { console.warn('[net-worth]', e) })
  return busy
}

// Called by the widget with every status from main.
export function onStatus (s: ReaderStatus) {
  status.value = s
  const id = league.value
  // A status for another league (switched mid-read) isn't this league's read.
  if (!id || s.league !== id || s.running || s.lastReadAt == null) return
  const readAt = s.lastReadAt
  queue(async () => {
    await loadLeague(id)
    if (!pricesReady.value) ninja.queuePricesFetch()
    await countRead(id, readAt)
  })
}

export function setLeague (id: string | null) {
  league.value = id
  if (id) queue(async () => { await loadLeague(id) })
}

// Prices arriving after a read count that read.
watch(pricesReady, (ready) => {
  if (ready && status.value) onStatus(status.value)
})

export function wantPrices () {
  ninja.queuePricesFetch()
}
