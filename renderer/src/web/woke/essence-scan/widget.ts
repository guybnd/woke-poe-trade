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
  // Scan mode starts by itself when you enter a map and stops in town and
  // hideout. The hotkey still stops it for the rest of that map. Off by
  // default: the scan's OCR worker holds about 430 MB while it runs.
  autoInMaps: boolean
  // In maps, the dock icon stays while the scan is off, so you can see and
  // start it.
  iconWhenOff: boolean
}

// Shared by every essence scan panel (there can be more than one).
// stoppedSeed: the map instance you stopped the scan in by hand.
// failedSeed: the map instance where starting it failed.
export const autoScan: { stoppedSeed: string | null, failedSeed: string | null } = { stoppedSeed: null, failedSeed: null }

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
  w.autoInMaps = false
  w.iconWhenOff = true
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

// Puts a seeded widget on `config` when there's none. Returns whether it did.
// `priceCheckKey` is the price check's held + pressed key, kept out of reach.
export function addEssenceScanWidget<W extends object> (config: { widgets: W[] }, priceCheckKey: string | null): boolean {
  if (config.widgets.some(w => (w as unknown as Widget).wmType === ESSENCE_SCAN_TYPE)) return false
  const taken = [...JSON.stringify(config).matchAll(/"((?:[A-Z][a-z]+ \+ )+\w+)"/g)].map(m => m[1])
  if (priceCheckKey) taken.push(priceCheckKey)
  const wmId = Math.max(0, ...config.widgets.map(w => (w as unknown as Widget).wmId)) + 1
  config.widgets.push(seedEssenceScanWidget(wmId, taken) as unknown as W)
  return true
}

export function normalizeEssenceScanWidget (w: EssenceScanWidget) {
  if (!w.anchor) w.anchor = { pos: 'tr', x: 98, y: 30 }
  if (w.hotkey === undefined) w.hotkey = null
  if (w.onceHotkey === undefined) w.onceHotkey = null
  if (!Array.isArray(w.flagTypes)) w.flagTypes = [...MEDS]
  if (typeof w.valueAlertChaos !== 'number' || !Number.isFinite(w.valueAlertChaos)) w.valueAlertChaos = 50
  if (typeof w.autoInMaps !== 'boolean') w.autoInMaps = false
  if (typeof w.iconWhenOff !== 'boolean') w.iconWhenOff = true
}
