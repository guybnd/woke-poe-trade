// Text size: makes text bigger or smaller everywhere, without touching window
// or panel sizes (those are --w-ui-scale and the root font size). CSS reads
// --w-text-scale; font sizes multiply by it. Stored like the theme: per origin
// in localStorage, shared by the overlay and settings windows through the
// storage event.
import { watch } from 'vue'
import { storedPref } from './stored-pref'

export const MIN_TEXT_SCALE = 70
export const MAX_TEXT_SCALE = 150

export function parseTextScale (v: string | null): number {
  const n = Number(v)
  if (!v || !Number.isFinite(n)) return 100
  return Math.min(MAX_TEXT_SCALE, Math.max(MIN_TEXT_SCALE, Math.round(n)))
}

export const textScale = storedPref('woke.textScale', parseTextScale)

function apply (v: number) {
  document.documentElement.style.setProperty('--w-text-scale', String(v / 100))
  // Text size alone: the windows Size sizes multiply it (theme.css [data-w-sized]).
  document.documentElement.style.setProperty('--w-text-user', String(v / 100))
}

apply(textScale.value)
watch(textScale, apply)
