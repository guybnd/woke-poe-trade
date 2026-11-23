// Net worth state for the window: the last read from main, valued with
// poe.ninja prices, plus history and the "since last refresh" list. Loaded
// with the window or after a read, never at startup.
import { computed, shallowRef, watch } from 'vue'
import { usePoeninja } from '@/web/background/Prices'
import { hostRequest } from '../shared/host'
import { toast } from '../ui/layer'
import { ninjaPriceOf } from './prices'
import { historyRev, loadPriceHistory } from './history'
import { lastWokePrices } from '../market/hook'
import {
  addGain, baselineOf, diffStash, emptyHistory, emptyPrefs, gainOf, isUniqueFrame, recordRead, sinceYesterday, tabSetOf, valueStash
} from './valuation'
import { stashGains, gainsKey } from './gains'
import { classify, resolveSpends } from './spend'
import type { SpendMark } from './spend'
import { addPoint, keepDiff, topChanges, valueByTab } from './ledger'
import { glanceKey, glanceRates, ledgerKey } from './glance'
import type { Glance } from './glance'
import type { LedgerPoint, TabValue } from './ledger'
import type { Baseline, NetWorthHistory, PricePrefs, StashDiff, StashGain, StashTabLike, Valuation } from './valuation'
import type { ReaderStatus } from './widget'
import { emptyMarks, feedMarks, playRates, startOfDay, trimMarks, RATE_WINDOWS } from './play-time'
import type { PlayMarks, PlayRates } from './play-time'

interface CachedStash { league: string, account: string, skipped?: number, tabs: Array<StashTabLike & { id: string, colour: string | null, readAt: number | null }> }

// The window's own record, apart from the history other modules read:
// a point per refresh for the chart, recent changes, and per-tab values.
export interface Ledger {
  points: LedgerPoint[]
  diffs: StashDiff[]
  // Each tab's value at the last read and the one before (D5).
  tabChaos: { prev: Record<string, number>, last: Record<string, number> }
}
const emptyLedger = (): Ledger => ({ points: [], diffs: [], tabChaos: { prev: {}, last: {} } })

const COLLECTION = 'net-worth'
// Your prices and ignored items (Set my price, Ignore item), per league.
const prefsKey = (league: string) => `${league}-prices`

const status = shallowRef<ReaderStatus | null>(null)
const stash = shallowRef<CachedStash | null>(null)
const history = shallowRef<NetWorthHistory>(emptyHistory())
const ledgerRef = shallowRef<Ledger>(emptyLedger())
const prefs = shallowRef<PricePrefs>(emptyPrefs())
// The last counted read's items and prices: a thin item's price jump is held
// against it (valuation.ts holdJump).
const baseline = shallowRef<Baseline | null>(null)
const guardNow = () => ({ before: baseline.value, now: Date.now() })
// Every refresh's net change (gains.ts), for the purchase switch.
const gainsRef = shallowRef<StashGain[]>([])
// The league those prefs are for: none while another league loads.
let prefsFor: string | null = null
const league = shallowRef<string | null>(null)
let loadedFor: string | null = null
let busy: Promise<void> = Promise.resolve()

const ninja = usePoeninja()

// The app's saved daily prices for what's in the stash (history.ts): a
// poe.ninja spike is checked against them. Loaded once a day, or when the
// stash holds new names; the valuation reads historyRev to value again.
function loadHistory (): Promise<void> {
  const league = lastWokePrices()?.leagueId
  if (!league || !stash.value) return Promise.resolve()
  const names = stash.value.tabs.flatMap(t => t.items.map(i => isUniqueFrame(i.frame) && i.name ? i.name : i.typeLine))
  return loadPriceHistory(league, names)
}
watch([stash, () => ninja.updatedAt.value], () => { loadHistory().catch(() => {}) })

export const valuation = computed<Valuation | null>(() => {
  // Read so a new price download (or saved history) values again.
  if (historyRev.value < 0) return null
  if (ninja.updatedAt.value == null || !stash.value) return null
  return valueStash(stash.value.tabs, ninjaPriceOf(), prefs.value, guardNow())
})

export const divine = computed(() => ninja.xchgRate.value ?? null)

export const summary = computed(() => {
  const v = valuation.value
  if (!v) return null
  const now = Date.now()
  return {
    chaos: v.chaos,
    sinceYesterdayDiv: sinceYesterday(history.value, v.chaos, divine.value, now),
    perHourChaos: ratesAt(now).today.perHour,
    tabs: stash.value?.tabs.length ?? 0
  }
})

// Where you were (map, hideout, closed) from Client.txt, read up to the last
// stash read: rates only look at time between reads.
const marks = shallowRef<PlayMarks>(emptyMarks())
// false while Client.txt hasn't been read or couldn't be.
const marksFromLog = shallowRef(false)
// The state at a window's start needs the zone before it: read this far back.
const LOOKBACK_MS = 2 * 3_600_000
let marksFrom: number | null = null
let marksPath: string | null = null

// Reads Client.txt zone lines new since the last time (all of them the first time).
async function readMarks (now: number) {
  const from = Math.min(startOfDay(now), now - RATE_WINDOWS[RATE_WINDOWS.length - 1].ms) - LOOKBACK_MS
  let fresh = marksFrom == null || marks.value.lastAt == null || from < marksFrom
  let res: { path: string | null, lines: string[] }
  try {
    res = await hostRequest('game-log-range', { from: fresh ? from : Math.max(marks.value.lastAt!, from), to: now, sessions: true }, 30_000)
    // The app moved to another Client.txt: start over on it.
    if (!fresh && res.path && res.path !== marksPath) {
      fresh = true
      res = await hostRequest('game-log-range', { from, to: now, sessions: true }, 30_000)
    }
  } catch {
    return
  }
  if (!res.path) { if (fresh) marksFromLog.value = false; return }
  const base = fresh ? emptyMarks(from) : marks.value
  marks.value = trimMarks(feedMarks(base, res.lines), from)
  if (fresh) marksFrom = from
  marksPath = res.path
  marksFromLog.value = true
}

// Profit per hour of play over the last 1, 2, 3 hours and today, at `now`.
// A read that just landed counts even before the caller's clock ticks past it.
// `withHub`: hideout and town time counts as play.
export function ratesAt (now: number, withHub = false): PlayRates {
  // A purchase adds at most 0 (spend.ts).
  const points = ledgerRef.value.points.map(p => ({ at: p.at, netChaos: p.netChaos == null ? null : p.counted ?? p.netChaos }))
  const at = Math.max(now, points[points.length - 1]?.at ?? 0)
  return playRates(points, marks.value.marks, at, marksFromLog.value, withHub, marks.value.maps)
}

export const lastDiff = computed(() => history.value.lastDiff)
export const ledger = computed(() => ledgerRef.value)
export const historyNow = computed(() => history.value)
export const stashNow = computed(() => stash.value)
export const leagueNow = computed(() => league.value)
// The dock icon's number, after each counted read (glance.ts).
export const glance = shallowRef<Glance | null>(null)

// Each tab's value now (live prices), in tab order.
export const tabValues = computed<TabValue[]>(() => {
  if (historyRev.value < 0) return []
  if (ninja.updatedAt.value == null || !stash.value) return []
  return valueByTab(stash.value.tabs, ninjaPriceOf(), prefs.value, guardNow())
})
export const readerStatus = computed(() => status.value)
export const gainsNow = computed(() => gainsRef.value)
export const pricesReady = computed(() => ninja.updatedAt.value != null)

async function loadLeague (id: string) {
  if (loadedFor === id) return
  loadedFor = id
  prefsFor = null
  const [saved, cache, led, own, gains, base] = await Promise.all([
    (hostRequest('doc-get', { collection: COLLECTION, key: id }) as Promise<NetWorthHistory | null>).catch(() => null),
    (hostRequest('stash-cache', { league: id }) as Promise<CachedStash | null>).catch(() => null),
    (hostRequest('doc-get', { collection: COLLECTION, key: ledgerKey(id) }) as Promise<Ledger | null>).catch(() => null),
    (hostRequest('doc-get', { collection: COLLECTION, key: prefsKey(id) }) as Promise<PricePrefs | null>).catch(() => undefined),
    stashGains(id),
    (hostRequest('doc-get', { collection: COLLECTION, key: `${id}-baseline` }) as Promise<Baseline | null>).catch(() => null)
  ])
  if (loadedFor !== id) return
  baseline.value = base
  gainsRef.value = gains
  history.value = { ...emptyHistory(), ...(saved ?? {}) }
  ledgerRef.value = { ...emptyLedger(), ...(led ?? {}) }
  prefs.value = cleanPrefs(own ?? null)
  // A failed read never gets saved over.
  prefsFor = own === undefined ? null : id
  stash.value = cache
  await readMarks(Date.now())
}

// After a read: value it, count it once, and diff it against the read before.
async function countRead (id: string, readAt: number) {
  if (history.value.countedReadAt != null && history.value.countedReadAt >= readAt) return
  stash.value = await (hostRequest('stash-cache', { league: id }) as Promise<CachedStash | null>).catch(() => stash.value)
  // Counted with the saved prices a spike is checked against.
  await loadHistory()
  const v = valuation.value
  if (!v || loadedFor !== id) return
  // A tab never read counts as empty: until every tab has been read once, a
  // later read would book its contents as new. Nothing is counted till then.
  if (!stash.value?.tabs.length || stash.value.tabs.some(t => t.readAt == null)) return
  const baseKey = `${id}-baseline`
  const tabsKey = `${id}-baseline-tabs`
  // The tabs read: a different choice (tab picker) isn't a gain or a loss.
  const tabs = tabSetOf(stash.value.tabs)
  const [before, beforeTabs] = await Promise.all([
    (hostRequest('doc-get', { collection: COLLECTION, key: baseKey }) as Promise<Baseline | null>).catch(() => null),
    (hostRequest('doc-get', { collection: COLLECTION, key: tabsKey }) as Promise<string | null>).catch(() => null)
  ])
  const since = history.value.countedReadAt
  let next = recordRead(history.value, v, divine.value, readAt)
  let diff: StashDiff | null = null
  let gain: StashGain | null = null
  if (before && beforeTabs === tabs) {
    diff = diffStash(before, v, readAt)
    next = { ...next, lastDiff: diff }
    // Every refresh's net change, for session profit elsewhere (gains.ts),
    // with the guess whether it's a purchase (spend.ts).
    const old = await stashGains(id)
    gain = gainOf(diff, since, divine.value, classify(diff, divine.value))
    const gains = addGain(old, gain)
    gainsRef.value = gains
    await hostRequest('doc-put', { collection: COLLECTION, key: gainsKey(id), value: gains }).catch(() => {})
  } else if (beforeTabs != null && beforeTabs !== tabs) {
    // Other tabs now: today's rate starts again from this read, so the
    // tabs added or dropped don't read as profit or loss per hour.
    next = { ...next, today: { day: next.today.day, points: next.today.points.slice(-1) } }
  }
  history.value = next
  // The chart's point, the change view, and per-tab values.
  const led = ledgerRef.value
  const tabNow = Object.fromEntries(tabValues.value.map(t => [t.id, t.chaos]))
  const nextLedger: Ledger = {
    points: withSpends(addPoint(led.points, { at: readAt, chaos: v.chaos, divine: divine.value, byCategory: { ...v.byCategory }, netChaos: diff?.netChaos ?? null, top: topChanges(diff) }), gainsRef.value),
    diffs: diff ? keepDiff(led.diffs, diff) : led.diffs,
    tabChaos: { prev: led.tabChaos.last, last: tabNow }
  }
  // Zone lines up to this read first, so the window never shows the new
  // point with old zones.
  await readMarks(Date.now())
  ledgerRef.value = nextLedger
  const todayDiv = sinceYesterday(next, v.chaos, divine.value, readAt)
  const g = glanceAt(id, readAt, v.chaos, diff?.netChaos ?? null, todayDiv != null && divine.value ? todayDiv * divine.value : null)
  await hostRequest('doc-put', { collection: COLLECTION, key: glanceKey(id), value: g }).catch(() => {})
  await hostRequest('doc-put', { collection: COLLECTION, key: id, value: next }).catch(() => {})
  await hostRequest('doc-put', { collection: COLLECTION, key: ledgerKey(id), value: nextLedger }).catch(() => {})
  const nextBase = baselineOf(v)
  if (loadedFor === id) baseline.value = nextBase
  await hostRequest('doc-put', { collection: COLLECTION, key: baseKey, value: nextBase }).catch(() => {})
  await hostRequest('doc-put', { collection: COLLECTION, key: tabsKey, value: tabs }).catch(() => {})
}

// The dock icon's number at a read (Ctrl+Space reads the saved one).
function glanceAt (id: string, at: number, chaos: number, netChaos: number | null, todayChaos: number | null): Glance {
  const rates = ratesAt(at)
  const g: Glance = { league: id, at, chaos, netChaos, divine: divine.value, perHourChaos: rates.today.perHour, rates: glanceRates(rates), todayChaos }
  glance.value = g
  return g
}

// The points' purchase fields from the gains, worked out in time order
// (spend.ts): a flip moves the refreshes after it too.
function withSpends (points: LedgerPoint[], gains: StashGain[]): LedgerPoint[] {
  const share = resolveSpends(gains)
  return points.map(p => {
    const r = share.get(p.at)
    // Older than the oldest gain kept: left as it was.
    if (!r) return p
    const c = Math.round(r.counted * 10) / 10
    const counted = p.netChaos != null && c !== p.netChaos ? c : undefined
    const spent = r.spent ? Math.round(r.spent * 10) / 10 : undefined
    if (p.counted === counted && p.spent === spent) return p
    const next = { ...p }
    delete next.counted
    delete next.spent
    if (counted != null) next.counted = counted
    if (spent != null) next.spent = spent
    return next
  })
}

// Your call on a refresh (null: back to the guess), and with 'spend' how much
// you spent (chaos; left out: the whole drop, or its currency part). Saves the
// gain and the chart point, so profit per hour, the session and the session
// story follow.
export function setSpendMark (at: number, mark: SpendMark | null, amountChaos?: number) {
  const id = loadedFor
  if (!id) return
  queue(async () => {
    if (loadedFor !== id) return
    const gains = await stashGains(id)
    const i = gains.findIndex(g => g.at === at)
    if (i < 0) return
    const g: StashGain = { ...gains[i], mark: mark ?? undefined }
    if (!mark) delete g.mark
    if (mark === 'spend' && amountChaos != null && Number.isFinite(amountChaos) && amountChaos >= 0) g.markChaos = amountChaos
    else delete g.markChaos
    const nextGains = gains.map((x, j) => j === i ? g : x)
    try {
      await hostRequest('doc-put', { collection: COLLECTION, key: gainsKey(id), value: nextGains })
    } catch {
      toast("Couldn't save that. Try again")
      return
    }
    gainsRef.value = nextGains
    const led = ledgerRef.value
    const nextLedger = { ...led, points: withSpends(led.points, nextGains) }
    ledgerRef.value = nextLedger
    await hostRequest('doc-put', { collection: COLLECTION, key: ledgerKey(id), value: nextLedger }).catch(() => {})
    // The saved dock number follows, when this was the last read.
    const last = glance.value
    if (last && last.league === id) {
      const saved = glanceAt(id, last.at, last.chaos, last.netChaos, last.todayChaos ?? null)
      await hostRequest('doc-put', { collection: COLLECTION, key: glanceKey(id), value: saved }).catch(() => {})
    }
  })
}

function cleanPrefs (p: PricePrefs | null): PricePrefs {
  const prices: Record<string, number> = {}
  for (const [k, c] of Object.entries(p?.prices ?? {})) if (typeof c === 'number' && Number.isFinite(c) && c >= 0) prices[k] = c
  return { prices, ignored: Array.isArray(p?.ignored) ? p.ignored.filter(k => typeof k === 'string') : [] }
}

export const pricePrefs = computed(() => prefs.value)

// A failed read is tried again (before the next save or read).
async function retryPrefs (id: string) {
  if (prefsFor === id || loadedFor !== id) return
  const own = await (hostRequest('doc-get', { collection: COLLECTION, key: prefsKey(id) }) as Promise<PricePrefs | null>).catch(() => undefined)
  if (own === undefined || loadedFor !== id) return
  prefs.value = cleanPrefs(own)
  prefsFor = id
}

// false: not loaded (yet), nothing changed.
function savePrefs (next: PricePrefs): boolean {
  const id = prefsFor
  if (!id || id !== loadedFor) {
    if (loadedFor) { const l = loadedFor; queue(() => retryPrefs(l)) }
    return false
  }
  const before = prefs.value
  prefs.value = next
  queue(async () => {
    try {
      await hostRequest('doc-put', { collection: COLLECTION, key: prefsKey(id), value: next })
    } catch {
      // Not saved: put it back, unless something else changed it since.
      if (prefs.value === next && prefsFor === id) prefs.value = before
      toast("Couldn't save that. Try again")
    }
  })
  return true
}

// Your price for one (chaos), or null for poe.ninja's again.
export function setMyPrice (key: string, chaos: number | null): boolean {
  const prices = Object.fromEntries(Object.entries(prefs.value.prices).filter(([k]) => k !== key))
  if (chaos != null && Number.isFinite(chaos) && chaos >= 0) prices[key] = chaos
  return savePrefs({ ...prefs.value, prices })
}

export function setIgnored (key: string, on: boolean): boolean {
  const rest = prefs.value.ignored.filter(k => k !== key)
  return savePrefs({ ...prefs.value, ignored: on ? [...rest, key] : rest })
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
    await retryPrefs(id)
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
