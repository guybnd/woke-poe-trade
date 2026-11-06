// Open trade offers, driven by Client.txt events and the replies you send.
// Pure state: the widget keeps one `TradeBook` and feeds it events.
import type { TradeEvent, TradeOffer, TradePrice } from './whispers'

export type TradeDir = 'sell' | 'buy'

// Selling: one key press per step, one chat command each.
export const SELL_STEPS = ['invite', 'trade', 'thanks', 'kick'] as const
// Buying: visit the seller, then say thanks.
export const BUY_STEPS = ['hideout', 'thanks'] as const
export type SellStep = typeof SELL_STEPS[number]
export type BuyStep = typeof BUY_STEPS[number]
export type StepId = SellStep | BuyStep

export interface Offer extends TradeOffer {
  id: string
  dir: TradeDir
  // The other player: buyer when selling, seller when buying.
  who: string
  // The whisper as sent, for "whisper again".
  body: string
  at: number
  lastAt: number
  // Same whisper again (buyers resend when you don't answer).
  repeats: number
  // Index into SELL_STEPS / BUY_STEPS of the next thing to do.
  step: number
  inArea: boolean
  // "Trade accepted" happened with this player.
  traded: boolean
  offline: boolean
  // Other whispers from them since the offer, newest last (max 3).
  messages: string[]
  // Pressed "skip": goes behind the others until something new happens.
  skippedAt: number | null
  // Last time you did something with it (sent a reply, skipped).
  actedAt: number | null
  // Closed offers stay a moment so you see what happened, then drop off.
  closedAt: number | null
  closed: 'done' | 'dismissed' | 'expired' | null
  // In a saved history record: when it was reopened, so a restart brings it back.
  reopenedAt?: number | null
  // Removed from the history but still needed to stop a restart reopening it.
  removedAt?: number | null
}

// A finished trade, for the sales log.
export interface TradeRecord {
  id: string
  dir: TradeDir
  who: string
  item: string
  qty: number
  price: TradePrice | null
  // Value when the trade happened (null when poe.ninja had no price).
  chaos: number | null
  divine: number | null
  league: string
  at: number
  // Marked by hand from the card (no "Trade accepted" seen).
  manual?: boolean
}

export interface TradeBook {
  offers: Offer[]
  // Last player we sent something to, for "That character is not online".
  lastTarget: { who: string, at: number } | null
  afk: boolean
}

export const OPEN_FOR_MS = 30 * 60_000
export const CLOSED_SHOWN_MS = 90_000
// How far back a restart reads Client.txt for offers.
export const LOG_REPLAY_MS = 30 * 60_000

export function newBook (): TradeBook {
  return { offers: [], lastTarget: null, afk: false }
}

let seq = 0
function offerId (at: number): string {
  // Random too: saved in the history, so it must not repeat after a restart.
  return `${at.toString(36)}-${(seq++).toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function isOpen (o: Offer): boolean {
  return o.closed == null
}

export function stepsOf (o: Pick<Offer, 'dir'>): readonly StepId[] {
  return o.dir === 'sell' ? SELL_STEPS : BUY_STEPS
}

export function nextStep (o: Offer): StepId | null {
  return stepsOf(o)[o.step] ?? null
}

function sameOffer (o: Offer, dir: TradeDir, who: string, item: string): boolean {
  return isOpen(o) && o.dir === dir && o.who === who && o.item === item
}

function close (o: Offer, how: NonNullable<Offer['closed']>, at: number) {
  o.closed = how
  o.closedAt = at
}

// Offers in the order the keys act on them: skipped ones behind the rest, then
// buyers in your area, then the oldest whisper; buying after selling.
export function queue (book: TradeBook): Offer[] {
  return book.offers.filter(isOpen).sort((a, b) =>
    (a.dir === b.dir ? 0 : a.dir === 'sell' ? -1 : 1) ||
    ((a.skippedAt ?? 0) - (b.skippedAt ?? 0)) ||
    (Number(b.inArea) - Number(a.inArea)) ||
    (a.dir === 'sell' ? a.at - b.at : b.at - a.at))
}

export function front (book: TradeBook): Offer | null {
  return queue(book)[0] ?? null
}

export interface ApplyResult {
  // A new offer arrived (for the peek and the ping).
  added?: Offer
  // A trade finished (for the log).
  finished?: Offer
}

export function applyEvent (book: TradeBook, ev: TradeEvent): ApplyResult {
  switch (ev.kind) {
    case 'whisper-in':
    case 'whisper-out': {
      const dir: TradeDir = ev.kind === 'whisper-in' ? 'sell' : 'buy'
      if (ev.kind === 'whisper-out') book.lastTarget = { who: ev.who, at: ev.at }
      if (ev.offer) {
        const same = book.offers.find(o => sameOffer(o, dir, ev.who, ev.offer!.item))
        if (same) {
          same.lastAt = ev.at
          same.repeats++
          same.offline = false
          same.skippedAt = null
          // A relisted item: the newest whisper says what they pay now.
          same.price = ev.offer.price
          same.qty = ev.offer.qty
          same.tab = ev.offer.tab
          same.note = ev.offer.note
          same.body = ev.body
          return {}
        }
        const o: Offer = {
          ...ev.offer,
          id: offerId(ev.at),
          dir,
          who: ev.who,
          body: ev.body,
          at: ev.at,
          lastAt: ev.at,
          repeats: 0,
          step: 0,
          inArea: false,
          traded: false,
          offline: false,
          messages: [],
          skippedAt: null,
          actedAt: null,
          closedAt: null,
          closed: null
        }
        book.offers.push(o)
        return { added: o }
      }
      // A plain whisper from someone with an open offer: keep it with the offer.
      if (dir === 'sell') {
        const open = book.offers.filter(o => isOpen(o) && o.who === ev.who)
        for (const o of open) {
          o.messages = [...o.messages, ev.body].slice(-3)
          o.lastAt = ev.at
          o.skippedAt = null
        }
      }
      return {}
    }
    case 'joined':
    case 'left': {
      for (const o of book.offers) {
        if (!isOpen(o) || o.who !== ev.who) continue
        o.inArea = ev.kind === 'joined'
        if (ev.kind === 'joined') o.skippedAt = null
        if (ev.kind === 'joined' && o.dir === 'sell' && o.step < 1) o.step = 1
        // They got their item and left: nothing more to do.
        if (ev.kind === 'left' && o.traded) close(o, 'done', ev.at)
      }
      return {}
    }
    case 'trade-accepted': {
      const o = tradePartner(book, ev.at)
      if (!o) return {}
      o.traded = true
      if (o.dir === 'sell') {
        o.step = Math.max(o.step, SELL_STEPS.indexOf('thanks'))
      } else {
        o.step = Math.max(o.step, BUY_STEPS.indexOf('thanks'))
      }
      return { finished: o }
    }
    case 'offline': {
      const t = book.lastTarget
      if (!t || ev.at - t.at > 15_000) return {}
      for (const o of book.offers) if (isOpen(o) && o.who === t.who) o.offline = true
      return {}
    }
    case 'afk':
      book.afk = ev.on
      return {}
    case 'trade-cancelled':
      return {}
  }
}

// Who "Trade accepted" was with: Client.txt doesn't say. A buyer in your
// area wins (the one you sent a trade request to, else the first); else an
// offer you just asked to trade; else your latest purchase you acted on.
export function tradePartner (book: TradeBook, at: number): Offer | null {
  const open = book.offers.filter(o => isOpen(o) && !o.traded)
  const sells = open.filter(o => o.dir === 'sell')
  const inArea = sells.filter(o => o.inArea)
  const tradeIdx = SELL_STEPS.indexOf('trade')
  const requested = (list: Offer[]) => list.filter(o => o.step > tradeIdx).sort((a, b) => (b.actedAt ?? 0) - (a.actedAt ?? 0))[0]
  if (inArea.length) return requested(inArea) ?? inArea.sort((a, b) => a.at - b.at)[0]
  const recent = requested(sells.filter(o => o.actedAt != null && at - o.actedAt < 5 * 60_000))
  if (recent) return recent
  const buys = open.filter(o => o.dir === 'buy' && at - Math.max(o.lastAt, o.actedAt ?? 0) < 20 * 60_000)
  return buys.sort((a, b) => Math.max(b.lastAt, b.actedAt ?? 0) - Math.max(a.lastAt, a.actedAt ?? 0))[0] ?? null
}

// After a reply was sent for `step`: move the offer along.
export function markSent (book: TradeBook, o: Offer, step: StepId | 'busy' | 'sold' | 'still' | 'again', at: number) {
  o.actedAt = at
  o.skippedAt = null
  book.lastTarget = { who: o.who, at }
  const steps = stepsOf(o)
  const i = steps.indexOf(step as StepId)
  if (i >= 0) o.step = Math.max(o.step, i + 1)
  if (step === 'sold') close(o, 'dismissed', at)
  if (o.dir === 'sell' && step === 'kick') close(o, o.traded ? 'done' : 'dismissed', at)
  if (o.dir === 'buy' && step === 'thanks') close(o, 'done', at)
}

export function skip (o: Offer, at: number) {
  o.skippedAt = at
  o.actedAt = at
}

export function dismiss (o: Offer, at: number) {
  close(o, 'dismissed', at)
}

// Closed offers worth keeping: traded ones are in the sales log already.
export function belongsInHistory (o: Offer): boolean {
  return o.closed != null && !o.traded
}

// Puts a closed offer back in the queue where it left off, whether it's still
// in the book or only in the history. If the same offer is open again (they
// whispered once more), that one stands. Returns the open offer.
export function reopen (book: TradeBook, o: Offer, at: number): Offer {
  const same = book.offers.find(x => x.id !== o.id && sameOffer(x, o.dir, o.who, o.item))
  if (same) return same
  const live = book.offers.find(x => x.id === o.id)
  const open = live ?? { ...o, inArea: false }
  open.closed = null
  open.closedAt = null
  open.skippedAt = null
  // Fresh, or the next prune would expire it again.
  open.lastAt = at
  // Kick and Thanks close an offer past its last step; the key needs one to do.
  open.step = Math.min(open.step, stepsOf(open).length - 1)
  if (!live) book.offers.push(open)
  return open
}

// Reading Client.txt again after a restart finds whispers you already closed.
export function alreadyClosed (history: Offer[], o: Pick<Offer, 'dir' | 'who' | 'item' | 'at'>): boolean {
  return history.some(h => h.dir === o.dir && h.who === o.who && h.item === o.item && (h.closedAt ?? 0) >= o.at)
}

// Whether a whisper a restart can still read could be older than this closing.
// If not, nothing needs the record to stay closed, so it can really be deleted.
export function replayCouldReopen (o: Pick<Offer, 'closedAt'>, now: number): boolean {
  return (o.closedAt ?? 0) >= now - LOG_REPLAY_MS
}

// Marks a trade as done by hand (no "Trade accepted" seen). Returns the offer
// to log, or null if it was already logged.
export function markTraded (o: Offer, at: number): Offer | null {
  if (o.traded) {
    close(o, 'done', at)
    return null
  }
  o.traded = true
  close(o, 'done', at)
  return o
}

// Drops offers nobody touched for a while, and closed ones after a moment.
export function prune (book: TradeBook, now: number): boolean {
  let changed = false
  for (const o of book.offers) {
    if (isOpen(o) && now - Math.max(o.lastAt, o.actedAt ?? 0) > OPEN_FOR_MS) {
      close(o, 'expired', now)
      changed = true
    }
  }
  const keep = book.offers.filter(o => o.closedAt == null || now - o.closedAt < CLOSED_SHOWN_MS)
  if (keep.length !== book.offers.length) {
    book.offers = keep
    changed = true
  }
  return changed
}

export function recordFor (o: Offer, at: number, chaos: number | null, divine: number | null, manual = false): TradeRecord {
  return {
    // Stable, so replaying Client.txt after a restart doesn't log it twice.
    id: `${o.dir}:${o.who}:${o.item}:${Math.floor(at / 1000)}`,
    dir: o.dir,
    who: o.who,
    item: o.item,
    qty: o.qty,
    price: o.price,
    chaos,
    divine,
    league: o.league,
    at,
    manual: manual || undefined
  }
}
