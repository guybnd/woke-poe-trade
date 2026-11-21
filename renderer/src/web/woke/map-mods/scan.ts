import type { Widget, Anchor } from '@/web/overlay/widgets'

export const MAP_SCAN_TYPE = 'woke-map-scan'

export interface MapScanWidget extends Widget {
  anchor: Anchor
  // Toggles scan mode on and off.
  hotkey: string | null
  // Rolling mode: lock onto the hovered map's tooltip and re-read only that.
  rollHotkey: string | null
  // Flash the badge when a reroll on the same map turns it into a "run".
  alertOnPass: boolean
}

export function scanHotkeyTarget (wmId: number): string {
  return `woke-map-scan:${wmId}`
}

export function rollHotkeyTarget (wmId: number): string {
  return `woke-map-scan:${wmId}:roll`
}

export function parseScanHotkeyTarget (target: string): { wmId: number, roll: boolean } | null {
  const m = /^woke-map-scan:(\d+)(:roll)?$/.exec(target)
  return m ? { wmId: Number(m[1]), roll: Boolean(m[2]) } : null
}

type WidgetRecord = Record<string, unknown> & { wmId: number, wmType: string }

// Map scan is part of Map mods now (WOKEPOET-458). Once per config: its keys
// and reroll alert move onto the first Map mods window (made if missing), and
// its rail pin points at Map mods. A Map scan that was switched off moves no
// keys. The old window stays in config, retired (modules.ts), never mounted.
export function foldMapScan (config: { woke?: { off: string[] }, widgets: WidgetRecord[] }): void {
  const widgets = config.widgets
  const scan = widgets.find(w => w.wmType === MAP_SCAN_TYPE) as (WidgetRecord & Partial<MapScanWidget>) | undefined
  // No Map scan: a Map mods window from before gets no scan keys (normalize),
  // a new one the defaults (initMapModsWidget).
  if (!scan) return
  const off = config.woke?.off ?? []
  const scanOn = !off.includes('map-scan')
  let mapMods = widgets.find(w => w.wmType === 'woke-map-mods')
  if (!mapMods && !scanOn) return
  if (!mapMods) {
    mapMods = { wmId: Math.max(0, ...widgets.map(w => w.wmId)) + 1, wmType: 'woke-map-mods', wmTitle: '', wmWants: 'hide', wmZorder: null, wmFlags: ['uninitialized'] }
    widgets.push(mapMods)
  }
  if (mapMods.scanHotkey === undefined) {
    // Placed but never opened: it would have set up its default keys.
    const fresh = Array.isArray(scan.wmFlags) && scan.wmFlags[0] === 'uninitialized'
    mapMods.scanHotkey = !scanOn ? null : fresh ? 'Alt + S' : (scan.hotkey ?? null)
    mapMods.scanRollHotkey = !scanOn ? null : fresh ? 'Alt + R' : (scan.rollHotkey ?? null)
    mapMods.scanAlertOnPass = typeof scan.alertOnPass === 'boolean' ? scan.alertOnPass : true
  }
  // Scanning needs Map mods on now.
  if (scanOn && config.woke && off.includes('map-mods')) config.woke.off = off.filter(id => id !== 'map-mods')
  const target = mapMods.wmId
  for (const w of widgets) {
    const pinned = w.pinned
    if (!Array.isArray(pinned) || !pinned.includes(scan.wmId)) continue
    w.pinned = pinned.includes(target)
      ? pinned.filter(id => id !== scan.wmId)
      : pinned.map(id => id === scan.wmId ? target : id)
  }
}

// Two readings closer than this (fraction of window height) are the same
// stash slot, so a reroll replaces the old reading instead of adding one.
// One quad tab cell: the most that keeps neighbouring quad maps apart (hovered
// at the same point of the cell) while still forgiving a rough return to a map.
const SAME_SLOT = 0.024

// `at` positions are fractions of the window; `aspect` is its width / height.
export function sameSlot (a: { x: number, y: number }, b: { x: number, y: number }, aspect: number): boolean {
  return Math.hypot((a.x - b.x) * aspect, a.y - b.y) < SAME_SLOT
}
