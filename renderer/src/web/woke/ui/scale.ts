// Toolkit panel size. 'auto' picks a size from the window height (the
// overlay window is the game window's size), so panels aren't huge at 1080p
// or tiny at 4K. Stored like the theme: per origin in localStorage, shared by
// the overlay and settings windows through the storage event.
import { watch } from 'vue'
import { storedPref } from './stored-pref'
import { uiSize } from './ui-size'

export const MIN_SCALE = 70
export const MAX_SCALE = 160

export type UiScale = 'auto' | number

function parseScale (v: string | null): UiScale {
  const n = Number(v)
  return v && v !== 'auto' && Number.isFinite(n) ? Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(n))) : 'auto'
}

export const uiScale = storedPref<UiScale>('woke.uiScale', parseScale)

// 1080p -> 100%, 1440p -> 135%, 2160p (no Windows scaling) -> 160%.
// 1080p stays at 100% so the smallest text is a real 11px (charter P19).
export function autoScale (height = window.innerHeight): number {
  const pct = Math.round(height / 1080 * 100 / 5) * 5
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, pct))
}

// Panel size alone, before UI size multiplies it.
export function baseScale (): number {
  return uiScale.value === 'auto' ? autoScale() : uiScale.value
}

export function effectiveScale (): number {
  return baseScale() * uiSize.value / 100
}

function apply () {
  document.documentElement.style.setProperty('--w-ui-scale', String(effectiveScale() / 100))
}

apply()
watch(uiSize, apply)
watch(uiScale, apply)
window.addEventListener('resize', () => { if (uiScale.value === 'auto') apply() })
