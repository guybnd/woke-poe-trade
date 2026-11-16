import { shallowRef, watch } from 'vue'

// Whether the gem versions list is open; it stays as left for the next gem.
const STORAGE_KEY = 'woke.gemVersionsOpen'

function readStored (): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === '1' } catch { return false }
}

export const gemVersionsOpen = shallowRef(readStored())

watch(gemVersionsOpen, (v) => {
  try { localStorage.setItem(STORAGE_KEY, v ? '1' : '0') } catch {}
})
