// Spaces calls to pathofexile.com's stash endpoint by the limits it sends back.
//
// Every reply carries X-Rate-Limit-Rules (e.g. "Account,Ip"), and per rule
// X-Rate-Limit-<Rule> ("45:60:60,240:240:900" = hits:period:penalty) and
// X-Rate-Limit-<Rule>-State ("3:60:0,10:240:0" = hits so far:period:penalty
// left). A 429 also has Retry-After. We stay well under every window, and stop
// rather than wait long: the next read picks up where this one stopped.
// Pure: the clock is passed in, so it is tested without waiting.

export interface RateWindow { max: number, period: number, penalty: number }
export interface RateWindowState { hits: number, period: number, active: number }
export interface RateRule { name: string, windows: RateWindow[], state: RateWindowState[] }

type Headers = Record<string, string | string[] | undefined>

function header (headers: Headers, name: string): string | undefined {
  const want = name.toLowerCase()
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() !== want) continue
    const v = headers[key]
    return Array.isArray(v) ? v[0] : v
  }
  return undefined
}

function triples (text: string | undefined): Array<[number, number, number]> {
  if (!text) return []
  const out: Array<[number, number, number]> = []
  for (const part of text.split(',')) {
    const nums = part.trim().split(':').map(Number)
    if (nums.length === 3 && nums.every(n => Number.isFinite(n) && n >= 0)) out.push(nums as [number, number, number])
  }
  return out
}

export function parseRateHeaders (headers: Headers): RateRule[] {
  const names = (header(headers, 'x-rate-limit-rules') ?? '').split(',').map(s => s.trim()).filter(Boolean)
  return names.map(name => ({
    name,
    windows: triples(header(headers, `x-rate-limit-${name}`)).map(([max, period, penalty]) => ({ max, period, penalty })),
    state: triples(header(headers, `x-rate-limit-${name}-state`)).map(([hits, period, active]) => ({ hits, period, active }))
  }))
}

// Seconds, or an HTTP date.
export function parseRetryAfter (value: string | undefined, now: number): number | null {
  if (!value) return null
  const secs = Number(value)
  if (Number.isFinite(secs) && secs >= 0) return now + secs * 1000
  const at = Date.parse(value)
  return Number.isFinite(at) ? Math.max(at, now) : null
}

export interface LimiterOptions {
  // Never closer together than this.
  minGapMs: number
  // Use this share of each window, leaving room for the browser and other tools.
  share: number
  // Windows assumed before the first reply says otherwise.
  assumed: RateWindow[]
}

export const DEFAULT_LIMITS: LimiterOptions = {
  minGapMs: 2000,
  share: 0.6,
  assumed: [{ max: 30, period: 60, penalty: 60 }]
}

// Windows this long or shorter set the pace between calls; longer ones only cap the count.
const PACE_WINDOW_S = 120

export class RateLimiter {
  private windows: RateWindow[]
  private reported: Array<{ hits: number, period: number, at: number }> = []
  private calls: number[] = []
  blockedUntil = 0

  constructor (private opts: LimiterOptions = DEFAULT_LIMITS) {
    this.windows = opts.assumed
  }

  private allowed (w: { max: number }) {
    return Math.max(1, Math.floor(w.max * this.opts.share))
  }

  // Call right before sending.
  record (now: number) {
    this.calls.push(now)
    const longest = Math.max(PACE_WINDOW_S, ...this.windows.map(w => w.period)) * 1000
    this.calls = this.calls.filter(t => t > now - longest)
  }

  // Call with every reply, including errors.
  update (status: number, headers: Headers, now: number) {
    const rules = parseRateHeaders(headers)
    const windows = rules.flatMap(r => r.windows)
    if (windows.length) this.windows = windows
    const states = rules.flatMap(r => r.state)
    if (states.length) this.reported = states.map(s => ({ hits: s.hits, period: s.period, at: now }))
    for (const s of states) {
      if (s.active > 0) this.blockedUntil = Math.max(this.blockedUntil, now + s.active * 1000)
    }
    if (status === 429) {
      const retry = parseRetryAfter(header(headers, 'retry-after'), now)
      // No Retry-After: assume the longest penalty we know of.
      const fallback = now + Math.max(60, ...this.windows.map(w => w.penalty)) * 1000
      this.blockedUntil = Math.max(this.blockedUntil, retry ?? fallback)
    }
  }

  // How long to wait before the next call (0 = go now).
  delay (now: number): number {
    if (this.blockedUntil > now) return this.blockedUntil - now
    let gap = this.opts.minGapMs
    for (const w of this.windows) {
      if (w.period <= PACE_WINDOW_S) gap = Math.max(gap, Math.ceil(w.period * 1000 / this.allowed(w)))
    }
    const last = this.calls[this.calls.length - 1]
    let wait = last == null ? 0 : Math.max(0, last + gap - now)
    for (const w of this.windows) {
      const span = w.period * 1000
      const mine = this.calls.filter(t => t > now - span)
      const theirs = this.reported.find(r => r.period === w.period && r.at > now - span)
      const used = Math.max(mine.length, theirs?.hits ?? 0)
      if (used < this.allowed(w)) continue
      // Free again when the oldest call in the window drops out of it. Hits we
      // didn't make (another tool) are counted from when we were told.
      const frees = mine.length >= (theirs?.hits ?? 0) && mine.length
        ? mine[mine.length - this.allowed(w)] ?? mine[0]
        : theirs!.at
      wait = Math.max(wait, frees + span - now)
    }
    return wait
  }
}
