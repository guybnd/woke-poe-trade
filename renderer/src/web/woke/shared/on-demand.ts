// Trade searches you ask for with a click (a gem version, a Harvest swap), and
// the Boss runs / Search quotes (trade-quotes.ts): one lane, so only one runs
// at a time and they never pile onto the rate limit together, and answers kept
// by request for a while, so asking again, or the same item again, costs
// nothing and shows at once.
import { shallowReactive } from 'vue'

// An answer is reused this long; after that a click searches again.
export const ON_DEMAND_FRESH_MS = 15 * 60 * 1000

let lane: Promise<unknown> = Promise.resolve()

// Runs `work` after every search already in the lane.
export function inLane<T> (work: () => Promise<T>): Promise<T> {
  const run = lane.then(work, work)
  lane = run.catch(() => {})
  return run
}

const answers = new Map<string, { value: unknown, ts: number }>()
const running = new Map<string, Promise<unknown>>()

// A kept answer for this request, if fresh.
export function keptAnswer<T> (key: string, now = Date.now()): T | undefined {
  const a = answers.get(key)
  if (!a || now - a.ts > ON_DEMAND_FRESH_MS) return undefined
  return a.value as T
}

// The answer for a request: kept, already running, or searched in the lane.
export function askOnce<T> (key: string, work: () => Promise<T>): Promise<T> {
  const kept = keptAnswer<T>(key)
  if (kept !== undefined) return Promise.resolve(kept)
  const already = running.get(key)
  if (already) return already as Promise<T>
  const run = inLane(work)
    .then((value) => { answers.set(key, { value, ts: Date.now() }); return value })
    .finally(() => { running.delete(key) })
  running.set(key, run)
  return run
}

export interface OnDemandRow<T> {
  state: 'loading' | 'done' | 'error'
  value?: T
  error?: string
}

// A list's rows that each search on a click: `ask(row, request, work)`;
// `rowOf(row, request)` shows a kept answer without a click.
export function useOnDemandQuote<T> () {
  const rows = shallowReactive(new Map<string, { request: string } & OnDemandRow<T>>())

  function rowOf (row: string, request?: string | null): OnDemandRow<T> | undefined {
    const r = rows.get(row)
    if (r && (request == null || r.request === request)) return r as OnDemandRow<T>
    if (request == null) return undefined
    const kept = keptAnswer<T>(request)
    return kept === undefined ? undefined : { state: 'done', value: kept }
  }

  async function ask (row: string, request: string, work: () => Promise<T>) {
    const prev = rows.get(row)
    if (prev && prev.request === request && prev.state !== 'error') return
    rows.set(row, { request, state: 'loading' })
    try {
      const value = await askOnce(request, work)
      if (rows.get(row)?.request === request) rows.set(row, { request, state: 'done', value })
    } catch (e) {
      if (rows.get(row)?.request === request) rows.set(row, { request, state: 'error', error: (e as Error).message })
    }
  }

  function clear () { rows.clear() }

  return { rowOf, ask, clear }
}

// Tests start from an empty lane.
export function resetOnDemand () {
  answers.clear()
  running.clear()
  lane = Promise.resolve()
}
