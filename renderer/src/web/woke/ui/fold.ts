// A fold that stays as you left it: closed or open, across items, pages,
// windows and restarts. One shared state per key, saved in this browser's
// storage (`woke.fold.<key>`); every window sees a change at once.
import { shallowRef, watch } from 'vue'
import type { ShallowRef } from 'vue'

const PREFIX = 'woke.fold.'
const folds = new Map<string, ShallowRef<boolean>>()

function read (key: string, open: boolean): boolean {
  try {
    const v = localStorage.getItem(PREFIX + key)
    return v == null ? open : v === '1'
  } catch { return open }
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (!e.key?.startsWith(PREFIX)) return
    const fold = folds.get(e.key.slice(PREFIX.length))
    if (fold && e.newValue != null) fold.value = e.newValue === '1'
  })
}

// `open`: how it starts the first time. A per-item fold names its item in
// the key ("stage:Day 1").
export function useFold (key: string, open = false): ShallowRef<boolean> {
  let fold = folds.get(key)
  if (!fold) {
    fold = shallowRef(read(key, open))
    watch(fold, (v) => {
      try { localStorage.setItem(PREFIX + key, v ? '1' : '0') } catch {}
    })
    folds.set(key, fold)
  }
  return fold
}

// One of several folds open at a time (an accordion), remembered by name;
// null when all are folded.
const oneOpen = new Map<string, ShallowRef<string | null>>()

export function useOneOpen<K extends string> (key: string): ShallowRef<K | null> {
  let fold = oneOpen.get(key)
  if (!fold) {
    let start: string | null = null
    try { start = localStorage.getItem(PREFIX + key) || null } catch {}
    const made = shallowRef<string | null>(start)
    watch(made, (v) => {
      try { localStorage.setItem(PREFIX + key, v ?? '') } catch {}
    })
    oneOpen.set(key, made)
    fold = made
  }
  return fold as ShallowRef<K | null>
}
