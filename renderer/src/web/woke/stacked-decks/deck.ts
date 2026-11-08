// Stacked Deck tracking: every card PoE writes to Client.txt as you open a
// Stacked Deck, grouped into sessions, valued at poe.ninja prices.
//
// Written from scratch for woke. The idea of a deck tracker comes from
// Soothsayer; none of its code is used here.
//
// Kept free of Vue components: Config.ts imports this file.
import type { Widget, Anchor } from '@/web/overlay/widgets'

export const STACKED_DECKS_TYPE = 'woke-stacked-decks'
export const STACKED_DECK = 'Stacked Deck'
// A session ends after this long without a card.
export const IDLE_END_MS = 15 * 60_000
// The icon glows while cards keep coming.
export const ACTIVE_MS = 60_000

// The message part of a Client.txt line, e.g.
// "2026/11/08 18:04:11 1234 abc [INFO Client 4567] : Card drawn from the deck: <divination>{The Doctor}"
const CARD_LINE = /\] : Card drawn from the deck: (?:<[^>]*>)?\{?([^{}]+?)\}?\s*$/

export function parseCardLine (line: string): string | null {
  const m = CARD_LINE.exec(line)
  const name = m?.[1].trim()
  return name || null
}

// --- The live session (kept in the widget's config) ---

export interface LiveSession {
  id: string
  league: string
  startedAt: number
  lastAt: number
  // Card names in draw order: deck number N is draws[N - 1].
  draws: string[]
  // Stacked Deck price and divine rate when the session started, in chaos.
  deckChaos: number | null
  divine: number | null
}

export interface StackedDecksWidget extends Widget {
  anchor: Anchor
  session: LiveSession | null
  // Time of the last card counted (the log's own, ms), and the card lines of
  // that second, so cards drawn while the app was closed are counted at the
  // next start, and none twice.
  seenUntil: number | null
  seenLines?: string[]
  // Sessions that ended before prices or the league were known: saved once they are.
  ended?: LiveSession[]
  // Big hit: a popup at or above this many divines, and a sound if on.
  hitDiv: number
  hitPopup: boolean
  hitSound: boolean
}

export function initStackedDecks (w: Pick<StackedDecksWidget, 'session' | 'seenUntil' | 'seenLines' | 'ended' | 'hitDiv' | 'hitPopup' | 'hitSound'>) {
  w.session = null
  // Cards already in Client.txt from before are not counted.
  w.seenUntil = Date.now()
  w.seenLines = []
  w.ended = []
  w.hitDiv = 1
  w.hitPopup = true
  w.hitSound = false
}

// One for every config (Config.ts): the tracker needs nothing placed by hand.
export function initStackedDecksWidget (wmId: number): StackedDecksWidget {
  const w = {
    wmId,
    wmType: STACKED_DECKS_TYPE,
    wmTitle: 'Stacked decks',
    wmWants: 'hide',
    wmZorder: null,
    // The window shows with the overlay open; while you play, only the dock icon.
    wmFlags: ['invisible-on-blur'],
    anchor: { pos: 'tc', x: 50, y: 12 }
  } as StackedDecksWidget
  initStackedDecks(w)
  return w
}

export function newSessionId (at: number): string {
  return `deck-${at.toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`
}

export function startSession (at: number, league: string, deckChaos: number | null, divine: number | null): LiveSession {
  return { id: newSessionId(at), league, startedAt: at, lastAt: at, draws: [], deckChaos, divine }
}

export function isOver (s: LiveSession, now: number): boolean {
  return now - s.lastAt >= IDLE_END_MS
}

// Cards drawn while the app was closed count, but only from the last
// half a day: switching the module back on weeks later doesn't bring back
// old decks as a session of today's league.
export const REPLAY_MAX_MS = 12 * 3600_000

// Where the start-up replay begins: the second of the last card counted (its
// lines are skipped by seenLines), or half a day ago if that's later.
export function replaySince (seenUntil: number | null, now: number): number | null {
  if (seenUntil == null) return null
  return Math.max(seenUntil - 1000, now - REPLAY_MAX_MS)
}

// Moves the "last card counted" mark to a card line at `t` (the log's time).
// Returns false for a line already counted.
export function markSeen (w: Pick<StackedDecksWidget, 'seenUntil' | 'seenLines'>, line: string, t: number): boolean {
  const sec = Math.floor(t / 1000) * 1000
  const last = w.seenUntil != null ? Math.floor(w.seenUntil / 1000) * 1000 : null
  if (last != null && sec < last) return true
  if (last != null && sec === last) {
    if (w.seenLines?.includes(line)) return false
    w.seenLines = [...(w.seenLines ?? []), line]
    return true
  }
  w.seenUntil = sec
  w.seenLines = [line]
  return true
}

// --- Saved sessions (files next to Session analytics, main/src/woke/session-store.ts) ---

export interface DeckCard {
  name: string
  qty: number
  // One card's price when the session ended, in chaos. null: no price.
  chaos: number | null
}

export interface DeckRecord {
  id: string
  league: string
  startedAt: number
  endedAt: number
  decks: number
  deckChaos: number | null
  divine: number | null
  cards: DeckCard[]
  // Draw order (card names), for the running chart.
  draws: string[]
}

export type PriceOf = (card: string) => number | null

export function cardCounts (draws: string[]): Map<string, number> {
  const out = new Map<string, number>()
  for (const d of draws) out.set(d, (out.get(d) ?? 0) + 1)
  return out
}

export function toRecord (s: LiveSession, endedAt: number, price: PriceOf, deckChaos: number | null, divine: number | null): DeckRecord {
  const cards = [...cardCounts(s.draws)].map(([name, qty]) => ({ name, qty, chaos: price(name) }))
  return {
    id: s.id,
    league: s.league,
    startedAt: s.startedAt,
    endedAt,
    decks: s.draws.length,
    deckChaos: s.deckChaos ?? deckChaos,
    divine: s.divine ?? divine,
    cards,
    draws: [...s.draws]
  }
}

// A saved record's own prices, for showing it as it was.
export function recordPrice (r: DeckRecord): PriceOf {
  const m = new Map(r.cards.map(c => [c.name, c.chaos]))
  return name => m.get(name) ?? null
}

// --- Totals ---

export interface CardRow {
  name: string
  qty: number
  each: number | null
  total: number
}

export interface DeckTotals {
  decks: number
  // Chaos spent on decks (decks × deck price), null when the price is unknown.
  spent: number | null
  got: number
  result: number | null
  // The result without the most valuable card drawn (one copy of it).
  withoutTop: number | null
  top: CardRow | null
  rows: CardRow[]
  // Cards without a price (counted as 0).
  unpriced: number
}

export function totals (draws: string[], price: PriceOf, deckChaos: number | null): DeckTotals {
  const rows: CardRow[] = []
  let got = 0
  let unpriced = 0
  for (const [name, qty] of cardCounts(draws)) {
    const each = price(name)
    if (each == null) unpriced += qty
    const total = (each ?? 0) * qty
    got += total
    rows.push({ name, qty, each, total })
  }
  // Most value first; same value: more copies, then name.
  rows.sort((a, b) => b.total - a.total || b.qty - a.qty || a.name.localeCompare(b.name))
  let top: CardRow | null = null
  for (const r of rows) if (r.each != null && (!top || r.each > top.each!)) top = r
  const spent = deckChaos != null ? deckChaos * draws.length : null
  const result = spent != null ? got - spent : null
  const withoutTop = result != null && top ? result - top.each! : result
  return { decks: draws.length, spent, got, result, withoutTop, top, rows, unpriced }
}

// Running result after each deck (chaos), for the line chart. Long sessions
// are thinned to about `points` points, always keeping the last.
export function runningResult (draws: string[], price: PriceOf, deckChaos: number | null, points = 120): number[] {
  const cost = deckChaos ?? 0
  const out: number[] = []
  const step = Math.max(1, Math.ceil(draws.length / points))
  let sum = 0
  for (let i = 0; i < draws.length; i++) {
    sum += (price(draws[i]) ?? 0) - cost
    if ((i + 1) % step === 0 || i === draws.length - 1) out.push(sum)
  }
  return out
}

// --- D1: what a deck gives you, from your own history ---

export interface OwnAverage {
  decks: number
  // Average chaos per deck at today's prices.
  perDeck: number
  // The same without your luckiest 1% of draws.
  perDeckTrimmed: number
}

export const MIN_OWN_DECKS = 100

// Every card you've drawn, valued at today's prices. `trimShare` of the
// draws (the most valuable ones, at least one) are left out of the trimmed number.
export function ownAverage (records: Array<Pick<DeckRecord, 'cards' | 'decks'>>, price: PriceOf, trimShare = 0.01): OwnAverage | null {
  const counts = new Map<string, number>()
  let decks = 0
  for (const r of records) {
    decks += r.decks
    for (const c of r.cards) counts.set(c.name, (counts.get(c.name) ?? 0) + c.qty)
  }
  if (!decks) return null
  const values = [...counts].map(([name, qty]) => ({ each: price(name) ?? 0, qty }))
    .sort((a, b) => b.each - a.each)
  let total = 0
  for (const v of values) total += v.each * v.qty
  let trim = Math.max(1, Math.ceil(decks * trimShare))
  if (trim >= decks) trim = decks - 1
  let trimmed = total
  let left = trim
  for (const v of values) {
    if (!left) break
    const take = Math.min(left, v.qty)
    trimmed -= v.each * take
    left -= take
  }
  return {
    decks,
    perDeck: total / decks,
    perDeckTrimmed: decks - trim > 0 ? trimmed / (decks - trim) : total / decks
  }
}

// --- C1: open or sell ---

export type Verdict = 'open' | 'luck' | 'sell'

// "open": a deck gives more than its price even without lucky hits.
// "luck": only with them. "sell": not even with them.
export function openOrSell (avg: { perDeck: number, perDeckTrimmed: number }, deckChaos: number): Verdict {
  if (avg.perDeckTrimmed > deckChaos) return 'open'
  if (avg.perDeck > deckChaos) return 'luck'
  return 'sell'
}

// --- D2: community card weights ---

export interface Weights {
  patch: string
  samples: number
  weights: Record<string, number>
}

export interface Expected {
  // Chaos per deck, by the weights.
  perDeck: number
  // Weight share of cards without a price (counted as 0).
  unpricedShare: number
  // Value of one draw and its chance, for simulating luck.
  values: Float64Array
  chances: Float64Array
}

export function expectedValue (w: Weights, price: PriceOf): Expected | null {
  const names = Object.keys(w.weights)
  let sum = 0
  for (const n of names) sum += w.weights[n]
  if (!sum) return null
  const values = new Float64Array(names.length)
  const chances = new Float64Array(names.length)
  let perDeck = 0
  let unpriced = 0
  names.forEach((n, i) => {
    const p = price(n)
    const chance = w.weights[n] / sum
    if (p == null) unpriced += chance
    values[i] = p ?? 0
    chances[i] = chance
    perDeck += chance * (p ?? 0)
  })
  return { perDeck, unpricedShare: unpriced, values, chances }
}

// The weights are known to under-predict what decks give (Soothsayer
// measured about a quarter). With enough of your own decks, the ratio of
// what you got to what the weights expect corrects them; otherwise they're
// used as they are. Kept within a sane range so one lucky streak can't run away.
export const MIN_CALIBRATION_DECKS = 500

export function calibration (own: OwnAverage | null, expected: Expected | null): number {
  if (!own || !expected || own.decks < MIN_CALIBRATION_DECKS || expected.perDeck <= 0) return 1
  // Like for like: both are plain averages over every draw.
  return Math.min(1.6, Math.max(0.7, own.perDeck / expected.perDeck))
}

// --- C3: luck ---

// Seeded, so the same session always shows the same percentile.
function rng (seed: number) {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13; s >>>= 0
    s ^= s >>> 17
    s ^= s << 5; s >>>= 0
    return s / 4294967296
  }
}

// Share of simulated sessions of `decks` decks that got less than `got`
// chaos from their cards (0–1), by the weights scaled by `scale`.
// Simulated card draws are capped; past this many decks a session's total is
// close enough to a normal curve.
export const MAX_SIMULATED_DECKS = 5000

function normalBelow (z: number): number {
  // Abramowitz and Stegun 7.1.26, good to about 1e-7.
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2)
  const erf = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z / 2)
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2
}

export function luckPercentile (e: Expected, decks: number, got: number, scale = 1, seed = 1): number | null {
  if (decks <= 0 || !e.values.length) return null
  if (decks > MAX_SIMULATED_DECKS) {
    let mean = 0
    let sq = 0
    for (let i = 0; i < e.values.length; i++) { mean += e.chances[i] * e.values[i]; sq += e.chances[i] * e.values[i] ** 2 }
    const sd = Math.sqrt(Math.max(0, sq - mean * mean) * decks)
    if (!sd) return got / scale >= mean * decks ? 1 : 0
    return normalBelow((got / scale - mean * decks) / sd)
  }
  // Cumulative chances, for picking a card by binary search.
  const cum = new Float64Array(e.chances.length)
  let acc = 0
  for (let i = 0; i < e.chances.length; i++) { acc += e.chances[i]; cum[i] = acc }
  const rand = rng(seed)
  const trials = Math.max(200, Math.min(2000, Math.floor(2_000_000 / decks)))
  const target = got / scale
  let below = 0
  let equal = 0
  for (let t = 0; t < trials; t++) {
    let sum = 0
    for (let d = 0; d < decks; d++) {
      const x = rand() * acc
      let lo = 0
      let hi = cum.length - 1
      while (lo < hi) {
        const mid = (lo + hi) >> 1
        if (cum[mid] < x) lo = mid + 1
        else hi = mid
      }
      sum += e.values[lo]
    }
    if (sum < target - 1e-9) below++
    else if (Math.abs(sum - target) <= 1e-9) equal++
  }
  return (below + equal / 2) / trials
}

export function luckText (p: number): string {
  const pct = Math.round(p * 100)
  if (pct >= 50) return `Luckier than ${Math.min(99, pct)}% of sessions like it`
  return `Unluckier than ${Math.min(99, 100 - pct)}% of sessions like it`
}

// --- Big hits ---

export function isBigHit (chaos: number | null, divine: number | null, hitDiv: number): boolean {
  if (chaos == null || !divine || hitDiv <= 0) return false
  return chaos >= hitDiv * divine
}
