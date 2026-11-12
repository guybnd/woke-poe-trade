import type { Widget, Anchor } from '@/web/overlay/widgets'
import { MEDS } from './essences'
import { sortKeys } from '../loot-filter/hotkey-match'

export const ESSENCE_SCAN_TYPE = 'woke-essence-scan'

export interface EssenceScanWidget extends Widget {
  anchor: Anchor
  // Toggles scan mode on and off.
  hotkey: string | null
  // Reads every essence label on screen once.
  onceHotkey: string | null
  // Essence types that make a monolith worth corrupting.
  flagTypes: string[]
  // Also call out a monolith whose essences are worth at least this much
  // (chaos) in total, even with nothing flagged. 0 turns it off.
  valueAlertChaos: number
}

export function essenceHotkeyTarget (wmId: number): string {
  return `woke-essence-scan:${wmId}`
}

export function essenceOnceTarget (wmId: number): string {
  return `woke-essence-once:${wmId}`
}

export function parseEssenceHotkeyTarget (target: string): { id: number, once: boolean } | null {
  const m = /^woke-essence-(scan|once):(\d+)$/.exec(target)
  return m ? { id: Number(m[2]), once: m[1] === 'once' } : null
}

export function initEssenceScanWidget (w: EssenceScanWidget) {
  w.wmTitle = 'Essence scan'
  // The panel shows with the overlay open; while you play, its dock icon does.
  w.wmFlags = ['invisible-on-blur']
  w.anchor = { pos: 'tr', x: 98, y: 30 }
  w.hotkey = 'Alt + E'
  w.onceHotkey = null
  w.flagTypes = [...MEDS]
  w.valueAlertChaos = 50
}

// Scan mode only starts from the widget's hotkey or its Start button, so a
// module switched on with no widget did nothing at all. Seeded hidden with
// its hotkey, unless that key is already used (`taken`).
export function seedEssenceScanWidget (wmId: number, taken: string[] = []): EssenceScanWidget {
  const w = { wmId, wmType: ESSENCE_SCAN_TYPE, wmTitle: '', wmWants: 'hide', wmZorder: null, wmFlags: [] } as unknown as EssenceScanWidget
  initEssenceScanWidget(w)
  const used = new Set(taken.map(sortKeys))
  if (w.hotkey && used.has(sortKeys(w.hotkey))) w.hotkey = null
  return w
}

export function normalizeEssenceScanWidget (w: EssenceScanWidget) {
  if (!w.anchor) w.anchor = { pos: 'tr', x: 98, y: 30 }
  if (w.hotkey === undefined) w.hotkey = null
  if (w.onceHotkey === undefined) w.onceHotkey = null
  if (!Array.isArray(w.flagTypes)) w.flagTypes = [...MEDS]
  if (typeof w.valueAlertChaos !== 'number' || !Number.isFinite(w.valueAlertChaos)) w.valueAlertChaos = 50
}
