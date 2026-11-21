// UI size: one setting that makes everything bigger or smaller together. It
// multiplies the sizes the user can fine-tune: Panel size (panel zoom,
// scale.ts), the price check (a zoom on its content, --w-ui-size) and Pinned
// size (pins.ts). Text size stays apart: it is the fine-tune for text.
// Always a zoom, never the root font size: rem lengths inside a zoomed panel
// would get it twice.
// Stored like the theme: per origin in localStorage, shared by the overlay and
// settings windows through the storage event.
import { shallowRef, watch } from 'vue'

export const MIN_UI_SIZE = 70
export const MAX_UI_SIZE = 160
export const UI_SIZE_STEP = 5
const STORAGE_KEY = 'woke.uiSize'

export function parseUiSize (v: string | null): number {
  const n = Number(v)
  if (!v || !Number.isFinite(n)) return 100
  return clampUiSize(n)
}

export function clampUiSize (n: number): number {
  return Math.min(MAX_UI_SIZE, Math.max(MIN_UI_SIZE, Math.round(n / UI_SIZE_STEP) * UI_SIZE_STEP))
}

function readStored () {
  try { return parseUiSize(localStorage.getItem(STORAGE_KEY)) } catch { return 100 }
}

export const uiSize = shallowRef(readStored())

export function uiZoom (): number {
  return uiSize.value / 100
}

// One step bigger or smaller (Ctrl+Space, the toolbar's menu).
export function nudgeUiSize (steps: number) {
  uiSize.value = clampUiSize(uiSize.value + steps * UI_SIZE_STEP)
}

function apply (v: number) {
  if (typeof document !== 'undefined') document.documentElement.style.setProperty('--w-ui-size', String(v / 100))
}
apply(uiSize.value)
watch(uiSize, (v) => {
  apply(v)
  try { localStorage.setItem(STORAGE_KEY, String(v)) } catch {}
})
// Config.ts imports this, and unit tests run without a window.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) uiSize.value = readStored()
  })
}
