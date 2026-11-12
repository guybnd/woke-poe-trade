// Reads your own stash tabs from pathofexile.com with your login, in main only.
// The login cookie stays in Electron's cookie store: nothing here reads its
// value, and requests just ask Electron to send the session's cookies.
//
// The first call lists the tabs and returns tab 0. A manual read then reads
// every tab; a quiet read (entering your hideout) reads the tabs read longest
// ago, a few at a time. The endpoint says nothing about which tabs changed.
import path from 'path'
import { dataDir, leagueName, readJson, writeAtomic, writeQueue } from '../data-files'
import { RateLimiter } from './rate-limit'
import { StashApiError, isRemoveOnly, parseStashReply } from './stash-parse'
import type { StashItem, StashTabInfo } from './stash-parse'

export const POE_SITE = 'https://www.pathofexile.com'

export interface HttpReply {
  status: number
  headers: Record<string, string | string[] | undefined>
  body: string
}
export type Fetcher = (url: string) => Promise<HttpReply>

export type ReadMode = 'manual' | 'auto'

export interface CachedTab extends StashTabInfo {
  readAt: number | null
  items: StashItem[]
}

export interface StashCache {
  version: 1
  league: string
  account: string
  listedAt: number
  tabs: CachedTab[]
}

export interface ReaderError {
  kind: 'signed-out' | 'rate-limited' | 'failed'
  message: string
  retryAt?: number
}

export interface ReaderStatus {
  running: boolean
  progress: { done: number, total: number } | null
  league: string | null
  account: string | null
  lastReadAt: number | null
  // Tabs not read in the last read (it stopped early, or a quiet read's budget).
  waiting: number
  error: ReaderError | null
}

export interface ReaderDeps {
  fetch: Fetcher
  now: () => number
  sleep: (ms: number) => Promise<void>
  onStatus: (s: ReaderStatus) => void
  limiter?: RateLimiter
}

// A quiet read reads this many tabs at most (the first call included).
export const AUTO_TABS = 12
// Quiet reads at most this often.
export const AUTO_EVERY_MS = 10 * 60 * 1000
// Stop rather than wait longer than this between calls.
export const MAX_WAIT_MS = 90 * 1000

const SIGNED_OUT: ReaderError = { kind: 'signed-out', message: 'Signed out of pathofexile.com. Sign in again in Settings › Game & league.' }

const cacheFile = (league: string) => path.join(dataDir('woke-personal'), 'stash', `${leagueName(league)}.json`)
const accountFile = () => path.join(dataDir('woke-personal'), 'account.json')
const queued = writeQueue()

export async function readCache (league: string): Promise<StashCache | null> {
  const c = await readJson<StashCache>(cacheFile(league))
  return c && c.version === 1 && Array.isArray(c.tabs) ? c : null
}

export async function readSavedAccount (): Promise<string | null> {
  const a = await readJson<{ account?: unknown }>(accountFile())
  return typeof a?.account === 'string' && a.account ? a.account : null
}

export async function saveAccount (account: string | null) {
  await queued(async () => { await writeAtomic(accountFile(), JSON.stringify({ account })) })
}

function stashUrl (league: string, account: string, index: number, withTabs: boolean) {
  const q = new URLSearchParams({ league, realm: 'pc', accountName: account, tabIndex: String(index), tabs: withTabs ? '1' : '0' })
  return `${POE_SITE}/character-window/get-stash-items?${q.toString()}`
}

class Stop extends Error {
  constructor (readonly error: ReaderError) { super(error.message) }
}

// Signed out: 401, a redirect (to the login page), or a 403 from the site
// itself. A 403 page from Cloudflare (HTML) or a 5xx says nothing about it.
export function isSignedOut (reply: HttpReply) {
  if (reply.status === 401 || (reply.status >= 300 && reply.status < 400)) return true
  return reply.status === 403 && !/^\s*</.test(reply.body)
}

// The account name, null when signed out, undefined when the site didn't say
// (busy, down, rate-limited): keep what we knew.
export async function fetchAccountName (fetch: Fetcher, limiter?: RateLimiter, now = Date.now): Promise<string | null | undefined> {
  const r = await fetch(`${POE_SITE}/character-window/get-account-name`)
  limiter?.update(r.status, r.headers, now())
  if (isSignedOut(r)) return null
  if (r.status !== 200) return undefined
  try {
    const name = (JSON.parse(r.body) as { accountName?: unknown }).accountName
    return typeof name === 'string' && name ? name : null
  } catch {
    return undefined
  }
}

export class StashReader {
  private limiter: RateLimiter
  private running: Promise<ReaderStatus> | null = null
  private status: ReaderStatus = { running: false, progress: null, league: null, account: null, lastReadAt: null, waiting: 0, error: null }
  league: string | null = null
  // The app's Account name setting, used when the site doesn't say.
  fallbackAccount: string | null = null
  account: string | null = null
  // Quiet reads count from the last try, so a failing one isn't retried at every hideout.
  private lastQuietTry = 0
  // A sign-out during a read must not be undone by that read finishing.
  private signOutCount = 0

  constructor (private deps: ReaderDeps) {
    this.limiter = deps.limiter ?? new RateLimiter()
  }

  get current (): ReaderStatus { return { ...this.status } }

  private set (patch: Partial<ReaderStatus>) {
    this.status = { ...this.status, ...patch }
    this.deps.onStatus(this.current)
  }

  // A league switch shows that league's last read.
  async setLeague (league: string | null) {
    if (league === this.league) return
    this.league = league
    const cache = league ? await readCache(league) : null
    const last = cache?.tabs.reduce<number | null>((m, t) => t.readAt != null && (m == null || t.readAt > m) ? t.readAt : m, null) ?? null
    this.set({ league, lastReadAt: last, waiting: 0, error: null })
  }

  // Used before the first status, from the saved account.
  restoreAccount (account: string) {
    if (this.account) return
    this.account = account
    this.set({ account })
  }

  signedOut () {
    this.account = null
    this.signOutCount++
    this.set({ account: null, error: SIGNED_OUT })
  }

  signedIn (account: string) {
    this.account = account
    this.set({ account, error: this.status.error?.kind === 'signed-out' ? null : this.status.error })
  }

  // Waits for the rate limiter, then asks; turns refusals into a Stop.
  private async get (url: string): Promise<HttpReply> {
    const wait = this.limiter.delay(this.deps.now())
    if (wait > MAX_WAIT_MS) {
      throw new Stop({ kind: 'rate-limited', message: 'pathofexile.com asked us to slow down. The rest is read later.', retryAt: this.deps.now() + wait })
    }
    if (wait > 0) await this.deps.sleep(wait)
    this.limiter.record(this.deps.now())
    const reply = await this.deps.fetch(url)
    this.limiter.update(reply.status, reply.headers, this.deps.now())
    if (reply.status === 429) {
      throw new Stop({ kind: 'rate-limited', message: 'pathofexile.com asked us to slow down. The rest is read later.', retryAt: this.limiter.blockedUntil })
    }
    if (isSignedOut(reply)) throw new Stop(SIGNED_OUT)
    if (reply.status !== 200) throw new Stop({ kind: 'failed', message: `pathofexile.com answered ${reply.status}.` })
    return reply
  }

  private parse (body: string) {
    try {
      return parseStashReply(body)
    } catch (e) {
      // Code 6: forbidden (logged out, or another account's stash).
      if (e instanceof StashApiError && e.code === 6) throw new Stop(SIGNED_OUT)
      throw new Stop({ kind: 'failed', message: e instanceof Error ? e.message : String(e) })
    }
  }

  read (mode: ReadMode): Promise<ReaderStatus> {
    if (this.running) return this.running
    const run = this.run(mode).finally(() => { this.running = null })
    this.running = run
    return run
  }

  // A quiet read when one is due (entering the hideout).
  readIfDue (): Promise<ReaderStatus> | null {
    if (!this.league || this.running) return null
    if (this.status.error?.kind === 'signed-out') return null
    const now = this.deps.now()
    const last = Math.max(this.status.lastReadAt ?? 0, this.lastQuietTry)
    if (now - last < AUTO_EVERY_MS) return null
    if (this.status.error?.retryAt != null && this.status.error.retryAt > now) return null
    this.lastQuietTry = now
    return this.read('auto')
  }

  private async run (mode: ReadMode): Promise<ReaderStatus> {
    const league = this.league
    if (!league) {
      this.set({ error: { kind: 'failed', message: 'No league set.' } })
      return this.current
    }
    this.set({ running: true, progress: null, error: null })
    const signOuts = this.signOutCount
    // Switched league or signed out meanwhile: this run's result isn't news.
    const stale = () => this.league !== league || this.signOutCount !== signOuts
    const report = (patch: Partial<ReaderStatus>) => {
      this.set(stale() ? { running: false, progress: null } : patch)
    }
    let cache: StashCache | null = null
    let changed = false
    let waiting = 0
    try {
      let account = this.account
      if (!account) {
        account = await fetchAccountName(this.deps.fetch, this.limiter, this.deps.now) ?? null
        if (account) this.signedIn(account)
      }
      account ??= this.fallbackAccount
      if (!account) throw new Stop(SIGNED_OUT)

      const old = await readCache(league)
      const kept = old && old.account === account ? old : null
      const now = this.deps.now()

      const first = this.parse((await this.get(stashUrl(league, account, 0, true))).body)
      // No tab list in the reply: keep the one we had.
      const listed = first.tabs ?? kept?.tabs.map(({ readAt: _r, items: _i, ...t }) => t) ?? []
      const byId = new Map((kept?.tabs ?? []).map(t => [t.id, t]))
      const tabs: CachedTab[] = listed.map(t => ({ ...t, readAt: byId.get(t.id)?.readAt ?? null, items: byId.get(t.id)?.items ?? [] }))
      cache = { version: 1, league, account, listedAt: now, tabs }
      changed = true
      if (tabs.length) {
        tabs[0].items = first.items
        tabs[0].readAt = this.deps.now()
      }

      let todo = tabs.slice(1)
      if (mode === 'auto') {
        todo = todo
          .filter(t => t.readAt == null || !isRemoveOnly(t))
          .sort((a, b) => (a.readAt ?? 0) - (b.readAt ?? 0))
        waiting = Math.max(0, todo.length - (AUTO_TABS - 1))
        todo = todo.slice(0, AUTO_TABS - 1)
      }
      const total = todo.length + 1
      this.set({ progress: { done: 1, total } })
      for (let i = 0; i < todo.length; i++) {
        const tab = todo[i]
        try {
          const reply = this.parse((await this.get(stashUrl(league, account, tab.index, false))).body)
          tab.items = reply.items
          tab.readAt = this.deps.now()
        } catch (e) {
          waiting += todo.length - i
          throw e
        }
        if (!stale()) this.set({ progress: { done: i + 2, total } })
      }
      report({ running: false, progress: null, lastReadAt: this.deps.now(), waiting, error: null })
    } catch (e) {
      const error: ReaderError = e instanceof Stop ? e.error : { kind: 'failed', message: e instanceof Error ? e.message : String(e) }
      if (error.kind === 'signed-out') this.account = null
      // Tabs read before the stop still count.
      const anyRead = cache?.tabs.some(t => t.readAt != null && t.readAt >= (cache?.listedAt ?? 0))
      report({ running: false, progress: null, waiting, error, account: this.account, lastReadAt: anyRead ? this.deps.now() : this.status.lastReadAt })
    } finally {
      if (cache && changed) {
        const toSave = cache
        await queued(async () => { await writeAtomic(cacheFile(league), JSON.stringify(toSave)) })
      }
    }
    return this.current
  }
}
