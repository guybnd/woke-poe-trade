import type { RateLimiter } from './RateLimiter'

const CACHE_TTL = 300

// The same query gives the same key whatever order its fields were set in
// (object-hash did this; a sorted JSON string is all the cache needs).
function keyOf (value: unknown): string {
  return JSON.stringify(value, (_k, v: unknown) => v && typeof v === 'object' && !Array.isArray(v)
    ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0))
    : v)
}

export class Cache {
  private cached = new Map<string, unknown>()
  private timers = new Map<string, ReturnType<typeof setTimeout>>()

  get<T = unknown> (key: unknown): T | undefined {
    const _key = keyOf(key)
    return this.cached.get(_key) as T | undefined
  }

  set<T = unknown> (key: unknown, value: T, ttl: number): void {
    const _key = keyOf(key)
    this.cached.set(_key, value)

    clearTimeout(this.timers.get(_key))
    this.timers.set(_key, setTimeout(() => {
      this.cached.delete(_key)
      this.timers.delete(_key)
    }, ttl * 1000))
  }

  clear (): void {
    for (const timer of this.timers.values()) clearTimeout(timer)
    this.timers.clear()
    this.cached.clear()
  }

  static deriveTtl (...limits: RateLimiter[]): number {
    return (limits.length) ? CACHE_TTL : 0
  }
}
