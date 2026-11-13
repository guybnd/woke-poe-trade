// The sales log, shared by the trade assistant (writes) and Session analytics
// (reads). Files live in the main process (main/src/woke/trade-log.ts).
import { shallowRef } from 'vue'
import { createGlobalState } from '@vueuse/core'
import { hostRequest } from '../shared/host'
import { replayCouldReopen } from './book'
import type { Offer, TradeRecord } from './book'

export const useTradeLog = createGlobalState(() => {
  const trades = shallowRef<TradeRecord[]>([])
  const loaded = shallowRef(false)
  const error = shallowRef('')
  let loading: Promise<void> | null = null

  function load (force = false): Promise<void> {
    if (loading && !force) return loading
    loading = (hostRequest('trades-list', {}) as Promise<TradeRecord[]>)
      .then(list => {
        trades.value = list.sort((a, b) => b.at - a.at)
        loaded.value = true
        error.value = ''
      })
      .catch((err: Error) => {
        error.value = err.message
        loading = null
      })
    return loading
  }

  async function add (t: TradeRecord): Promise<void> {
    const plain = JSON.parse(JSON.stringify(t)) as TradeRecord
    trades.value = [plain, ...trades.value.filter(x => x.id !== plain.id)].sort((a, b) => b.at - a.at)
    await hostRequest('trades-add', { trade: plain })
  }

  async function remove (t: TradeRecord): Promise<void> {
    trades.value = trades.value.filter(x => x.id !== t.id)
    await hostRequest('trades-delete', { id: t.id, league: t.league })
  }

  return { trades, loaded, error, load, add, remove }
})

// Offers closed without a trade (dismissed, sold elsewhere, ran out), kept until
// you remove them, so a wrong click is never final. Newest first.
export const useOfferHistory = createGlobalState(() => {
  const offers = shallowRef<Offer[]>([])
  const byClosed = (a: Offer, b: Offer) => (b.closedAt ?? 0) - (a.closedAt ?? 0)
  // Deleted here while a read may still be on its way with them in it.
  const deleted = new Set<string>()

  async function load (): Promise<void> {
    const list = await (hostRequest('offer-history-list', {}) as Promise<Offer[]>)
    // Anything added while this was on its way wins.
    const mine = new Set(offers.value.map(o => o.id))
    offers.value = [...offers.value, ...list.filter(o => !mine.has(o.id) && !deleted.has(o.id))].sort(byClosed)
    // Removed offers a restart can no longer bring back have done their job.
    for (const o of offers.value) {
      if (o.removedAt != null && !replayCouldReopen(o, Date.now())) remove(o.id).catch(() => {})
    }
  }

  function get (id: string): Offer | undefined {
    return offers.value.find(o => o.id === id)
  }

  async function add (o: Offer): Promise<void> {
    const plain = JSON.parse(JSON.stringify(o)) as Offer
    delete plain.reopenedAt
    delete plain.removedAt
    deleted.delete(plain.id)
    offers.value = [plain, ...offers.value.filter(x => x.id !== plain.id)].sort(byClosed)
    try {
      await hostRequest('offer-history-add', { offer: plain })
    } catch (err) {
      // Not in memory either, so the next offer to close tries it again.
      offers.value = offers.value.filter(x => x !== plain)
      throw err
    }
  }

  // The record stays until the offer closes again, so a restart can't lose it.
  async function markReopened (id: string, at: number): Promise<void> {
    const rec = get(id)
    if (!rec) return
    const plain = { ...rec, reopenedAt: at, removedAt: null }
    offers.value = offers.value.map(x => x.id === id ? plain : x)
    await hostRequest('offer-history-add', { offer: plain })
  }

  // After a restart: back to a plain old record.
  function forgetReopened (id: string) {
    offers.value = offers.value.map(x => x.id === id ? { ...x, reopenedAt: null } : x)
  }

  async function remove (id: string): Promise<void> {
    deleted.add(id)
    offers.value = offers.value.filter(x => x.id !== id)
    await hostRequest('offer-history-delete', { id })
  }

  // Your own removal of a row. While a restart could still read its whisper, a
  // hidden record stays to keep the offer closed; after that it's deleted.
  async function discard (o: Offer, at: number): Promise<void> {
    const before = get(o.id)
    const others = offers.value.filter(x => x.id !== o.id)
    try {
      if (replayCouldReopen(o, at)) {
        const plain = JSON.parse(JSON.stringify(o)) as Offer
        delete plain.reopenedAt
        plain.removedAt = at
        offers.value = [plain, ...others].sort(byClosed)
        await hostRequest('offer-history-add', { offer: plain })
      } else {
        deleted.add(o.id)
        offers.value = others
        await hostRequest('offer-history-delete', { id: o.id })
      }
    } catch (err) {
      // Only this row goes back: others may have changed meanwhile.
      deleted.delete(o.id)
      const rest = offers.value.filter(x => x.id !== o.id)
      offers.value = before ? [before, ...rest].sort(byClosed) : rest
      throw err
    }
  }

  return { offers, load, get, add, markReopened, forgetReopened, remove, discard }
})

const DAY_MS = 24 * 3_600_000

export interface TradeTotals {
  // Chaos in from sales, out on purchases.
  sold: number
  spent: number
  sales: number
  buys: number
  // Trades without a price on poe.ninja (left out of the sums).
  unpriced: number
}

export function tradeTotals (list: TradeRecord[]): TradeTotals {
  const t: TradeTotals = { sold: 0, spent: 0, sales: 0, buys: 0, unpriced: 0 }
  for (const r of list) {
    if (r.chaos == null) t.unpriced++
    if (r.dir === 'sell') { t.sales++; t.sold += r.chaos ?? 0 } else { t.buys++; t.spent += r.chaos ?? 0 }
  }
  return t
}

export function tradesInRange (list: TradeRecord[], range: '7d' | 'league' | 'all' | 'today', league: string, now: number): TradeRecord[] {
  if (range === 'all') return list
  if (range === 'league') return list.filter(t => t.league === league)
  if (range === '7d') return list.filter(t => now - t.at < 7 * DAY_MS)
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  return list.filter(t => t.at >= start.getTime())
}
