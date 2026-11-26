// A setting kept in this browser's localStorage: one shared ref per key, saved
// on every change, and kept in step across the overlay and settings windows
// (they share an origin) through the storage event. `read` turns what's stored
// (null when nothing is) into a value, falling back to the default; `write`
// turns it back, null to remove the key.
import { shallowRef, watch } from 'vue'
import type { ShallowRef } from 'vue'

function stored (key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}

export function storedPref<T> (key: string, read: (raw: string | null) => T, write: (v: T) => string | null = String): ShallowRef<T> {
  const pref = shallowRef<T>(read(stored(key)))
  watch(pref, (v) => {
    try {
      const raw = write(v)
      if (raw == null) localStorage.removeItem(key)
      else localStorage.setItem(key, raw)
    } catch {}
  })
  // Unit tests run without a window.
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key === key) pref.value = read(stored(key))
    })
  }
  return pref
}
