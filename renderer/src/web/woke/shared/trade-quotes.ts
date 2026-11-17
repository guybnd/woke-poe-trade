// Prices from official trade for items poe.ninja can't price: uniques whose
// value is unknown until identified, and boss drops with no poe.ninja row.
//
// Every lookup spends the same rate limit as price checks, so they run one at a
// time, well spaced, only for what's on screen (the Boss runs panel, a boss
// arena's card, the item picked in Search), and the results are kept a while.
import { shallowRef } from 'vue'
import { inLane } from './on-demand'

export interface TradeQuote {
  chaos: number
  listings: number
}

// Refetched when older than this; still shown (over poe.ninja) until a day old.
const FRESH_MS = 60 * 60 * 1000
export const SHOW_MS = 24 * 60 * 60 * 1000
const RETRY_MS = 5 * 60 * 1000
// At most 6 searches a minute, against the site's limit of 15.
const GAP_MS = 10_000
// Longer after a failure, so a rate limit penalty doesn't drain the whole queue.
const FAILED_GAP_MS = 60_000
const TIMEOUT_MS = 30_000

export interface StoredQuote {
  // null = looked and found no listings.
  chaos: number | null
  listings: number
  ts: number
}
export type Stored = Record<string, Record<string, StoredQuote>>

export function quoteFromListings (
  listings: Array<{ priceAmount: number, priceCurrency: string }>,
  divine: number,
  // Needed before the price counts; a thin market shouldn't beat poe.ninja.
  minListings = 1
): number | null {
  const chaos = listings
    .map(l => l.priceCurrency === 'chaos' ? l.priceAmount : l.priceCurrency === 'divine' ? l.priceAmount * divine : null)
    .filter((n): n is number => n != null && n > 0)
    .sort((a, b) => a - b)
  if (!chaos.length || chaos.length < minListings) return null
  // The middle of the cheapest few, so a bait listing doesn't set the price.
  const mid = Math.floor(chaos.length / 2)
  return chaos.length % 2 ? chaos[mid] : (chaos[mid - 1] + chaos[mid]) / 2
}

export interface TradePriceDeps {
  lookup: (league: string, name: string, divine: number) => Promise<{ chaos: number | null, listings: number }>
  read: () => Stored
  write: (data: Stored) => void
  now?: () => number
}

export function createTradePrices (deps: TradePriceDeps) {
  const now = deps.now ?? Date.now
  const stored = shallowRef<Stored>(deps.read())
  const inFlight = shallowRef<ReadonlySet<string>>(new Set())
  const failedAt = new Map<string, number>()
  let queue: string[] = []
  // Asked for one at a time (an item picked in Search): kept when a panel
  // replaces or stops its own list, until looked up.
  let asked: string[] = []
  let league = ''
  let divine = 0
  let busy = false
  let timer: ReturnType<typeof setTimeout> | null = null
  // Survives the panel closing, so reopening it can't skip the gap.
  let nextAt = 0

  function setPending () {
    inFlight.value = new Set(queue)
  }

  function get (forLeague: string, name: string): TradeQuote | null {
    const q = stored.value[forLeague]?.[name]
    if (!q || q.chaos == null || now() - q.ts > SHOW_MS) return null
    return { chaos: q.chaos, listings: q.listings }
  }

  function due (forLeague: string, name: string): boolean {
    const q = stored.value[forLeague]?.[name]
    if (q && now() - q.ts < FRESH_MS) return false
    const failed = failedAt.get(`${forLeague}|${name}`)
    return failed == null || now() - failed >= RETRY_MS
  }

  function save (forLeague: string, name: string, quote: { chaos: number | null, listings: number }) {
    const next: Stored = { ...stored.value }
    next[forLeague] = { ...next[forLeague], [name]: { ...quote, ts: now() } }
    stored.value = next
    deps.write(next)
  }

  // A request that never answers mustn't stop every later lookup.
  async function withTimeout<T> (work: Promise<T>): Promise<T> {
    let timeout: ReturnType<typeof setTimeout> | undefined
    const expired = new Promise<never>((_resolve, reject) => {
      timeout = setTimeout(() => { reject(new Error('Timed out')) }, TIMEOUT_MS)
    })
    try {
      return await Promise.race([work, expired])
    } finally {
      clearTimeout(timeout)
    }
  }

  async function step () {
    if (busy || timer != null || !queue.length) return
    const wait = nextAt - now()
    if (wait > 0) {
      timer = setTimeout(() => {
        timer = null
        step().catch(() => {})
      }, wait)
      return
    }
    busy = true
    const name = queue[0]
    const forLeague = league
    nextAt = now() + GAP_MS
    try {
      save(forLeague, name, await inLane(() => withTimeout(deps.lookup(forLeague, name, divine))))
    } catch {
      failedAt.set(`${forLeague}|${name}`, now())
      nextAt = now() + FAILED_GAP_MS
    }
    busy = false
    // A new request can have replaced the queue during the lookup. If it's for
    // another league, the same name there still needs its own lookup.
    if (league === forLeague) {
      queue = queue.filter(n => n !== name)
      asked = asked.filter(n => n !== name)
    }
    setPending()
    await step()
  }

  // Replaces what's queued; the opened boss goes first each time it changes.
  function request (forLeague: string, forDivine: number, names: string[]) {
    // Names asked for in another league are that league's.
    if (forLeague !== league) asked = []
    league = forLeague
    divine = forDivine
    queue = [...new Set([...asked, ...names])].filter(name => due(forLeague, name))
    setPending()
    step().catch(() => {})
  }

  // One name, first in line, without dropping what's already queued.
  function ask (forLeague: string, forDivine: number, name: string) {
    if (forLeague !== league) { queue = []; asked = [] }
    league = forLeague
    divine = forDivine
    if (!due(forLeague, name)) return
    asked = [name, ...asked.filter(n => n !== name)]
    queue = [name, ...queue.filter(n => n !== name)]
    setPending()
    step().catch(() => {})
  }

  // Drops the panel's list; names asked for one at a time still get looked up.
  function stop () {
    queue = queue.filter(n => asked.includes(n))
    setPending()
    if (queue.length) return
    if (timer != null) clearTimeout(timer)
    timer = null
  }

  function pending (name: string): boolean {
    return inFlight.value.has(name)
  }

  return { get, pending, request, ask, stop }
}
