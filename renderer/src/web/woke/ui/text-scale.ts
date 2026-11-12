// Text size: makes text bigger or smaller everywhere, without touching window
// or panel sizes (those are --w-ui-scale and the root font size). CSS reads
// --w-text-scale; font sizes multiply by it. Stored like the theme: per origin
// in localStorage, shared by the overlay and settings windows through the
// storage event.
import { shallowRef, watch } from 'vue'

export const MIN_TEXT_SCALE = 70
export const MAX_TEXT_SCALE = 150
const STORAGE_KEY = 'woke.textScale'

export function parseTextScale (v: string | null): number {
  const n = Number(v)
  if (!v || !Number.isFinite(n)) return 100
  return Math.min(MAX_TEXT_SCALE, Math.max(MIN_TEXT_SCALE, Math.round(n)))
}

function readStored () {
  try { return parseTextScale(localStorage.getItem(STORAGE_KEY)) } catch { return 100 }
}

export const textScale = shallowRef(readStored())

function apply (v: number) {
  document.documentElement.style.setProperty('--w-text-scale', String(v / 100))
}

apply(textScale.value)
watch(textScale, (v) => {
  apply(v)
  try { localStorage.setItem(STORAGE_KEY, String(v)) } catch {}
})
window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY) textScale.value = readStored()
})
