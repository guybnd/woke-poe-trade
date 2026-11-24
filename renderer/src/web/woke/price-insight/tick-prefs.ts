// "Always tick" / "Never tick" a mod, from the price check's right-click menu
// (Guy's pick, 2026-11-18): remembered per mod in the price check's settings
// and laid over every new price check's ticks. It changes only what the first
// search looks for; it never searches by itself.

import { AppConfig, saveConfigQuietly } from '@/web/Config'
import type { PriceCheckWidget } from '@/web/overlay/widgets'
import type { FilterOrGroup, StatFilter } from '@/web/price-check/filters/interfaces'

export type TickPref = 'on' | 'off'

// The row's kind and stat: a ring's life total and an explicit life line are
// different rows.
export const tickKey = (f: StatFilter) => `${f.tag}|${f.statRef}`

function widget (): PriceCheckWidget | undefined {
  return AppConfig<PriceCheckWidget>('price-check')
}

export function tickPref (f: StatFilter): TickPref | undefined {
  return widget()?.wokeTickPrefs?.[tickKey(f)]
}

/** Remembers it (undefined forgets) and ticks the row to match now. */
export function setTickPref (f: StatFilter, pref: TickPref | undefined) {
  const w = widget()
  if (!w) return
  const key = tickKey(f)
  const prefs = Object.fromEntries(Object.entries(w.wokeTickPrefs ?? {}).filter(([k]) => k !== key))
  if (pref) prefs[key] = pref
  w.wokeTickPrefs = prefs
  if (pref) f.disabled = (pref === 'off')
  // Quietly: the price check is an exclusive window, and saveConfig waits
  // until no such window shows.
  saveConfigQuietly()
}

/** Ticks or unticks every row with a remembered choice. Excluded rows keep
 *  their tick (it is the exclusion); rows the price check keeps off on purpose
 *  stay off: a local line its total already counts, a hidden row. */
export function applyTickPrefs (stats: FilterOrGroup[]) {
  const prefs = widget()?.wokeTickPrefs
  if (!prefs) return
  for (const s of stats) {
    if ('group' in s && s.group) continue
    const f = s as StatFilter
    if (f.not || f.inTotal || f.hidden || f.mapKind) continue
    const pref = prefs[tickKey(f)]
    if (pref) f.disabled = (pref === 'off')
  }
}
