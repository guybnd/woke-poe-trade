// Helpers shared after the consolidation audit: they must give exactly what
// the copies they replaced gave.
import { beforeAll, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { localDay, median, medianOrNull, seededRandom } from '@/web/woke/shared/numbers'

// The copies the helpers replaced, as they were.
function oldMulberry (seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function oldRng (seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('numbers', () => {
  it('median: middle value, mean of the two middle ones, NaN or null for none', () => {
    expect(median([3, 1, 2])).toBe(2)
    expect(median([4, 1, 3, 2])).toBe(2.5)
    expect(median([])).toBeNaN()
    expect(medianOrNull([])).toBeNull()
    expect(medianOrNull([5])).toBe(5)
    const xs = [3, 1, 2]
    median(xs)
    expect(xs).toEqual([3, 1, 2])
  })

  it('seededRandom gives the same numbers as both old copies', () => {
    for (const seed of [0, 1, 5, 42, 7919 * 3 + 68, 2 ** 31 + 5, -3]) {
      const a = seededRandom(seed)
      const b = oldMulberry(seed)
      const c = oldRng(seed)
      for (let i = 0; i < 50; i++) {
        const v = a()
        expect(v).toBe(b())
        expect(v).toBe(c())
      }
    }
  })

  it('localDay: local YYYY-MM-DD from a time or a date', () => {
    const d = new Date(2026, 0, 5, 23, 59)
    expect(localDay(d)).toBe('2026-01-05')
    expect(localDay(d.getTime())).toBe('2026-01-05')
  })
})

const store = new Map<string, string>()
const listeners: Array<(e: { key: string | null }) => void> = []
beforeAll(() => {
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v) },
    removeItem: (k: string) => { store.delete(k) }
  };
  (globalThis as Record<string, unknown>).window = {
    addEventListener: (type: string, fn: (e: { key: string | null }) => void) => { if (type === 'storage') listeners.push(fn) }
  }
})

describe('storedPref', () => {
  it('reads what is stored, saves a change, removes on null and follows other windows', async () => {
    const { storedPref } = await import('@/web/woke/ui/stored-pref')
    store.set('t.n', '7')
    const n = storedPref('t.n', v => Number(v ?? 1))
    expect(n.value).toBe(7)
    n.value = 9
    await nextTick()
    expect(store.get('t.n')).toBe('9')

    const c = storedPref<{ a: number } | null>('t.c', v => v ? JSON.parse(v) : null, v => v ? JSON.stringify(v) : null)
    expect(c.value).toBeNull()
    c.value = { a: 1 }
    await nextTick()
    expect(store.get('t.c')).toBe('{"a":1}')
    c.value = null
    await nextTick()
    expect(store.has('t.c')).toBe(false)

    // Another window changed it.
    store.set('t.n', '3')
    for (const l of listeners) l({ key: 't.n' })
    expect(n.value).toBe(3)
  })
})
