// A fold that stays as you left it: closed or open, across items, pages,
// windows and restarts. One shared state per key, saved in this browser's
// storage; every window sees a change at once.
//   useFold(key):    woke.fold.<key> = "1" open, "0" folded
//   useOneOpen(key): woke.fold.one.<key> = the open one's name, "" for none
import { effectScope, shallowRef, watch } from 'vue'
import type { ShallowRef } from 'vue'

const PREFIX = 'woke.fold.'
const ONE = 'woke.fold.one.'
const folds = new Map<string, ShallowRef<boolean>>()
const oneOpen = new Map<string, ShallowRef<string | null>>()
// The saving watchers outlive whichever component asked first.
const scope = effectScope(true)

function stored (key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}
function save (key: string, value: string) {
  try { localStorage.setItem(key, value) } catch {}
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key == null || e.newValue == null) return
    if (e.key.startsWith(ONE)) {
      const fold = oneOpen.get(e.key.slice(ONE.length))
      if (fold) fold.value = e.newValue || null
    } else if (e.key.startsWith(PREFIX)) {
      const fold = folds.get(e.key.slice(PREFIX.length))
      if (fold) fold.value = e.newValue === '1'
    }
  })
}

// `open`: how it starts the first time. A per-item fold names its item in
// the key ("stage:Day 1").
export function useFold (key: string, open = false): ShallowRef<boolean> {
  let fold = folds.get(key)
  if (!fold) {
    const v = stored(PREFIX + key)
    const made = shallowRef(v == null ? open : v === '1')
    scope.run(() => watch(made, (now) => { save(PREFIX + key, now ? '1' : '0') }))
    folds.set(key, made)
    fold = made
  }
  return fold
}

// One of several folds open at a time (an accordion), remembered by name;
// null when all are folded.
export function useOneOpen<K extends string> (key: string): ShallowRef<K | null> {
  let fold = oneOpen.get(key)
  if (!fold) {
    const made = shallowRef<string | null>(stored(ONE + key) || null)
    scope.run(() => watch(made, (now) => { save(ONE + key, now ?? '') }))
    oneOpen.set(key, made)
    fold = made
  }
  return fold as ShallowRef<K | null>
}
