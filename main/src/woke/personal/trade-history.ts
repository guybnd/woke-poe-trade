// Your sold items, from pathofexile.com's trade history (the /trade/history
// page) with your login, in main only. GGG doesn't document this call: it is
// the one the page itself makes. It returns your latest 100 sales and nothing
// older, so each read is merged into a file kept per league.
//
// Its limit is tight and per account (5 a minute, 10 in 10 minutes, 15 in 3
// hours when this was written), and your browser shares it. So a quiet read
// (entering your hideout) runs at most every AUTO_EVERY_MS, a manual one at
// most every MANUAL_GAP_MS, and the limiter uses only part of each window.
import path from 'path'
import { dataDir, leagueName, readJson, writeAtomic, writeQueue } from '../data-files'
import { RateLimiter } from './rate-limit'
import { POE_SITE } from './stash-reader'
import type { Fetcher } from './stash-reader'

export interface Sale {
  // The site's id for the sale's item.
  id: string
  at: number
  name: string
  typeLine: string
  baseType: string
  // The game's frame: 2 rare, 3 unique, 4 gem, 5 currency, 6 card...
  frameType: number
  icon: string
  stack: number
  ilvl?: number
  corrupted?: boolean
  gemLevel?: number
  quality?: number
  mapTier?: number
  // The biggest linked group, when 5 or more (a 6L unique prices apart).
  links?: number
  price: { amount: number, currency: string }
  // Gear's mods and properties as the site sent them, for the item tooltip
  // (the trade listing tooltip reads the same shape). Left out for gems,
  // currency and cards: their tooltip comes from the name.
  tip?: Record<string, unknown>
}

export interface SalesError {
  kind: 'signed-out' | 'rate-limited' | 'failed'
  message: string
  retryAt?: number
}

export interface SalesCache {
  version: 1
  league: string
  readAt: number | null
  sales: Sale[]
}

export interface SalesReply extends SalesCache {
  error: SalesError | null
}

export type SalesReadMode = 'manual' | 'auto' | 'none'

export interface SalesDeps {
  fetch: Fetcher
  now: () => number
  limiter?: RateLimiter
  // Where the per-league files go (tests pass a temp folder).
  dir?: () => string
  signedOut?: () => void
  log?: (line: string) => void
}

// Quiet reads at most this often.
export const AUTO_EVERY_MS = 30 * 60 * 1000
// Manual reads closer together than this answer from the file: the limit
// allows 15 calls in 3 hours, shared with your browser.
export const MANUAL_GAP_MS = 5 * 60 * 1000
// Sales kept per league, newest first.
export const MAX_SALES = 5000

// Half of each window, with at least a minute between calls.
export const HISTORY_LIMITS = {
  minGapMs: 60_000,
  share: 0.5,
  assumed: [
    { max: 5, period: 60, penalty: 60 },
    { max: 10, period: 600, penalty: 120 },
    { max: 15, period: 10800, penalty: 3600 }
  ]
}

const defaultDir = () => path.join(dataDir('woke-personal'), 'sales')
const queued = writeQueue()

type Raw = Record<string, unknown>
const str = (v: unknown) => typeof v === 'string' ? v : ''
const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : undefined
// The game marks some names with <<set:MS>> style tags.
const tagless = (s: string) => s.replace(/<<[^>]*>>/g, '').trim()

// A property's first number: "21 (Max)" -> 21, "+20%" -> 20.
function property (item: Raw, name: string): number | undefined {
  const props = Array.isArray(item.properties) ? item.properties as Raw[] : []
  const p = props.find(x => x && x.name === name)
  const values = p && Array.isArray(p.values) ? p.values as unknown[][] : []
  const m = /(\d+)/.exec(str(values[0]?.[0]))
  return m ? Number(m[1]) : undefined
}

// What the tooltip draws from (listing-tip.ts listingTipItem reads only
// these). Mod objects keep their text and kind, not their tiers and rolls.
const TIP_KEYS = ['name', 'typeLine', 'baseType', 'frameType', 'rarity', 'ilvl', 'corrupted', 'mirrored', 'influences', 'sockets']
const MOD_KEYS = ['implicitMods', 'enchantMods', 'utilityMods', 'fracturedMods', 'explicitMods', 'craftedMods']
// Gems, currency, cards and quest items: the name gives their tooltip.
const NAME_TIP_FRAMES = new Set([4, 5, 6, 7, 8])
// The quality property (its name varies by kind).
const QUALITY_TYPE = 6

function slimMod (m: unknown): unknown {
  if (typeof m === 'string') return m
  if (!m || typeof m !== 'object') return undefined
  const r = m as Raw
  const out: Raw = {}
  if (typeof r.description === 'string') out.description = r.description
  if (typeof r.domain === 'string') out.domain = r.domain
  if (r.flags && typeof r.flags === 'object') out.flags = r.flags
  return out
}

// Only gear with mods: without any, the tooltip is the name's.
export function tipOf (item: Raw): Record<string, unknown> | undefined {
  if (NAME_TIP_FRAMES.has(num(item.frameType) ?? -1)) return undefined
  const out: Record<string, unknown> = {}
  let mods = 0
  for (const k of MOD_KEYS) {
    const list = Array.isArray(item[k]) ? (item[k] as unknown[]).map(slimMod).filter(x => x !== undefined) : []
    if (list.length) { out[k] = list; mods += list.length }
  }
  if (!mods) return undefined
  for (const k of TIP_KEYS) if (item[k] !== undefined) out[k] = item[k]
  const props = Array.isArray(item.properties) ? (item.properties as Raw[]).filter(x => x && x.type === QUALITY_TYPE) : []
  if (props.length) out.properties = props
  return out
}

function biggestLinks (sockets: unknown): number {
  if (!Array.isArray(sockets)) return 0
  const groups = new Map<number, number>()
  for (const s of sockets as Raw[]) {
    const g = num(s?.group)
    if (g != null) groups.set(g, (groups.get(g) ?? 0) + 1)
  }
  return Math.max(0, ...groups.values())
}

export function parseSale (e: unknown): Sale | null {
  if (!e || typeof e !== 'object') return null
  const r = e as Raw
  const item = (r.item && typeof r.item === 'object' ? r.item : null) as Raw | null
  const price = (r.price && typeof r.price === 'object' ? r.price : null) as Raw | null
  const at = Date.parse(str(r.time))
  const amount = num(price?.amount)
  const currency = str(price?.currency)
  const id = str(r.item_id) || str(item?.id)
  if (!item || !id || !Number.isFinite(at) || amount == null || !(amount > 0) || !currency) return null
  const sale: Sale = {
    id,
    at,
    name: tagless(str(item.name)),
    typeLine: tagless(str(item.typeLine)),
    baseType: tagless(str(item.baseType) || str(item.typeLine)),
    frameType: num(item.frameType) ?? 0,
    icon: str(item.icon),
    stack: Math.max(1, num(item.stackSize) ?? 1),
    price: { amount, currency }
  }
  const ilvl = num(item.ilvl)
  if (ilvl) sale.ilvl = ilvl
  if (item.corrupted === true) sale.corrupted = true
  const level = property(item, 'Level')
  if (sale.frameType === 4 && level) sale.gemLevel = level
  const quality = property(item, 'Quality')
  if (quality) sale.quality = quality
  const tier = property(item, 'Map Tier')
  if (tier) sale.mapTier = tier
  const links = biggestLinks(item.sockets)
  if (links >= 5) sale.links = links
  const tip = tipOf(item)
  if (tip) sale.tip = tip
  return sale
}

export function parseHistory (body: string): Sale[] | null {
  let j: unknown
  try { j = JSON.parse(body) } catch { return null }
  const list = j && typeof j === 'object' ? (j as Raw).result : null
  if (!Array.isArray(list)) return null
  return list.map(parseSale).filter((s): s is Sale => s != null)
}

// New sales in, by id and time (an item sold again is another sale);
// newest first; the oldest past MAX_SALES dropped.
const saleKey = (s: Sale) => `${s.id}|${s.at}`
export function mergeSales (old: Sale[], fresh: Sale[]): Sale[] {
  const byId = new Map(old.map(s => [saleKey(s), s]))
  for (const s of fresh) byId.set(saleKey(s), s)
  return [...byId.values()].sort((a, b) => b.at - a.at).slice(0, MAX_SALES)
}

const emptyCache = (league: string): SalesCache => ({ version: 1, league, readAt: null, sales: [] })

export class TradeHistory {
  private limiter: RateLimiter
  private running: Promise<SalesReply> | null = null
  private runningLeague: string | null = null
  // When a call last went out (index.ts tells the overlay after one).
  lastFetchAt = 0
  private lastTry = 0
  private lastAuto = 0
  private error: SalesError | null = null
  private errorLeague: string | null = null
  private stopped = false

  constructor (private deps: SalesDeps) {
    this.limiter = deps.limiter ?? new RateLimiter(HISTORY_LIMITS)
  }

  private file (league: string) {
    return path.join((this.deps.dir ?? defaultDir)(), `${leagueName(league)}.json`)
  }

  async cache (league: string): Promise<SalesCache> {
    const c = await readJson<SalesCache>(this.file(league))
    return c && c.version === 1 && Array.isArray(c.sales) ? c : emptyCache(league)
  }

  private async reply (league: string): Promise<SalesReply> {
    // A wait that's over isn't news any more.
    const e = this.error
    const over = e?.kind === 'rate-limited' && e.retryAt != null && e.retryAt <= this.deps.now()
    return { ...await this.cache(league), error: this.errorLeague === league && !over ? e : null }
  }

  stop () { this.stopped = true }

  // 'none' answers from the file. 'auto' reads when the last quiet read is
  // AUTO_EVERY_MS old; 'manual' when the last read is MANUAL_GAP_MS old.
  async read (league: string, mode: SalesReadMode): Promise<SalesReply> {
    // A read under way for this league answers this one too; one for
    // another league leaves this one to the file.
    if (this.running) return this.runningLeague === league ? await this.running : await this.reply(league)
    const now = this.deps.now()
    if (this.stopped || mode === 'none') return await this.reply(league)
    if (mode === 'auto' && now - this.lastAuto < AUTO_EVERY_MS) return await this.reply(league)
    if (mode === 'manual' && now - this.lastTry < MANUAL_GAP_MS) return await this.reply(league)
    const wait = this.limiter.delay(now)
    if (wait > 0) {
      // A quiet read just skips; a manual one says when it can.
      if (mode === 'manual') this.setError(league, { kind: 'rate-limited', message: 'pathofexile.com asks to wait before reading your sales again.', retryAt: now + wait })
      return await this.reply(league)
    }
    this.runningLeague = league
    this.running = this.fetch(league, mode).finally(() => { this.running = null; this.runningLeague = null })
    return await this.running
  }

  private setError (league: string, error: SalesError | null) {
    this.error = error
    this.errorLeague = league
  }

  private async fetch (league: string, mode: SalesReadMode): Promise<SalesReply> {
    const now = this.deps.now()
    this.lastTry = now
    this.lastFetchAt = now
    // Any read counts for the quiet ones: a hideout right after a Refresh doesn't call again.
    this.lastAuto = now
    this.limiter.record(now)
    let r
    try {
      r = await this.deps.fetch(`${POE_SITE}/api/trade/history/${encodeURIComponent(league)}`)
    } catch (e) {
      this.setError(league, { kind: 'failed', message: (e as Error).message || 'pathofexile.com did not answer.' })
      return await this.reply(league)
    }
    this.limiter.update(r.status, r.headers, this.deps.now())
    if (this.stopped) return await this.reply(league)
    // Only a 401 or a redirect to the login: this call's 403s say nothing
    // about the login, and signing out would stop the whole stash reader.
    if (r.status === 401 || (r.status >= 300 && r.status < 400)) {
      this.setError(league, { kind: 'signed-out', message: 'Signed out of pathofexile.com. Sign in again in Settings › Game & league.' })
      this.deps.signedOut?.()
      return await this.reply(league)
    }
    if (r.status === 429) {
      this.setError(league, { kind: 'rate-limited', message: 'pathofexile.com asks to wait before reading your sales again.', retryAt: this.limiter.blockedUntil || undefined })
      return await this.reply(league)
    }
    if (r.status !== 200) {
      this.deps.log?.(`warn [trade-history] HTTP ${r.status}`)
      const message = r.status === 400 ? `pathofexile.com has no trade history for ${league}.` : `pathofexile.com answered ${r.status}.`
      this.setError(league, { kind: 'failed', message })
      return await this.reply(league)
    }
    const fresh = parseHistory(r.body)
    if (!fresh) {
      this.setError(league, { kind: 'failed', message: "pathofexile.com's reply wasn't trade history." })
      return await this.reply(league)
    }
    const next = await queued(async () => {
      const old = await this.cache(league)
      const c: SalesCache = { version: 1, league, readAt: this.deps.now(), sales: mergeSales(old.sales, fresh) }
      await writeAtomic(this.file(league), JSON.stringify(c))
      return c
    })
    this.setError(league, null)
    return { ...next, error: null }
  }
}
