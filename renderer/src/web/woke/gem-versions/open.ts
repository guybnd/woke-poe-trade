import { shallowRef, watch } from 'vue'

// Whether the gem versions list is open: open unless folded, and it stays as
// left for the next gem. A new key, so a list folded under the old
// closed-by-default rule opens again.
const STORAGE_KEY = 'woke.gemVersionsFolded'

function readStored (): boolean {
  try { return localStorage.getItem(STORAGE_KEY) !== '1' } catch { return true }
}

export const gemVersionsOpen = shallowRef(readStored())

watch(gemVersionsOpen, (v) => {
  try { localStorage.setItem(STORAGE_KEY, v ? '0' : '1') } catch {}
})
