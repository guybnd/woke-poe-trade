import { isProxy, toRaw } from 'vue'

/** A deep copy of reactive state. structuredClone throws on a Vue proxy anywhere
 *  inside the value (a split row holds its total's sources), so every level is
 *  unwrapped first. */
export function rawClone<T> (value: T): T {
  return structuredClone(unwrap(value, new WeakMap())) as T
}

function unwrap (v: unknown, seen: WeakMap<object, unknown>): unknown {
  if (v === null || typeof v !== 'object') return v
  const raw = isProxy(v) ? toRaw(v) : v
  if (seen.has(raw)) return seen.get(raw)
  if (Array.isArray(raw)) {
    const out: unknown[] = []
    seen.set(raw, out)
    for (const x of raw) out.push(unwrap(x, seen))
    return out
  }
  const proto = Object.getPrototypeOf(raw)
  if (proto !== Object.prototype && proto !== null) return raw
  const out: Record<string, unknown> = {}
  seen.set(raw, out)
  for (const [k, x] of Object.entries(raw)) out[k] = unwrap(x, seen)
  return out
}
