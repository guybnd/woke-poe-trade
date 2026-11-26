// Small number helpers every tool uses the same way.

// The middle value (the mean of the two middle ones for an even count); NaN
// for none. Doesn't change `values`.
export function median (values: readonly number[]): number {
  if (!values.length) return NaN
  const s = [...values].sort((a, b) => a - b)
  const mid = s.length >> 1
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

// The same as median, but null for none.
export function medianOrNull (values: readonly number[]): number | null {
  return values.length ? median(values) : null
}

// A seeded random number generator (mulberry32): the same seed gives the same
// numbers, from 0 up to (not including) 1, so a sample or a mock-up doesn't
// jump between draws.
export function seededRandom (seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// A local calendar day as YYYY-MM-DD.
export function localDay (at: number | Date): string {
  const d = new Date(at)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
