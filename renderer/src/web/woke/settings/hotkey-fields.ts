// Every hotkey the app and the toolkit listen for, as editable fields over the
// settings window's working copy of the config. The Hotkeys page lists these;
// module pages edit the same fields, so the two can't disagree.
import type { Config } from '@/web/Config'
import type { Widget } from '@/web/overlay/widgets'
import { MODULES, isModuleOn, isWidgetTypeOn } from '../modules'
import { normalizeKey } from '../ui/hotkey-context'
import { MAP_CHECK_DEFAULT_KEY } from '../shortcuts'
import { MAP_MODS_TYPE, initMapModsWidget } from '../map-mods/widget'
import type { MapModsWidget } from '../map-mods/widget'

type W = Widget & Record<string, unknown>

export interface HotkeyField {
  id: string
  label: string
  // Group in the list (module or APT feature name).
  group: string
  // Settings page that owns it, for "Open settings".
  page: string | null
  get: () => string | null
  set: (v: string | null) => void
  required?: boolean
  noModKeys?: boolean
  // Price check: the held modifier (Ctrl / Alt) that goes with the key.
  hold?: { get: () => string, set: (v: string) => void }
  // Its module is off: the key is free while it stays off.
  off: boolean
}

function field (w: W, prop: string): Pick<HotkeyField, 'get' | 'set'> {
  return {
    get: () => (w[prop] as string | null | undefined) ?? null,
    set: (v) => { w[prop] = v }
  }
}

// Per woke widget type: [prop, label] for each simple hotkey prop.
const WOKE_KEYS: Record<string, { page: string, keys: Array<[string, string]> }> = {
  'woke-scarab-flip': { page: 'market', keys: [['stashHotkey', 'Flips: outline flips in the open stash tab']] },
  'woke-search': { page: 'market', keys: [['hotkey', 'Search items, prices, tools and settings']] },
  'woke-campaign': { page: 'campaign', keys: [['hotkeyCard', 'Campaign: keep the card open'], ['hotkeyNext', 'Campaign: step done'], ['hotkeyPrev', 'Campaign: step back']] },
  'woke-run-timer': { page: 'campaign', keys: [['hotkeyPause', 'Run timer: pause / resume'], ['hotkeySplits', 'Run timer: show / hide splits']] },
  'woke-lab': { page: 'lab', keys: [['hotkeyOverlay', 'Lab layout in the overlay'], ['hotkeyExternal', 'Lab layout in your browser']] },
  'woke-challenges': { page: 'challenges', keys: [['hotkey', 'Show / hide the challenge guide']] },
  'woke-map-mods': { page: 'map-mods', keys: [['hotkey', 'Check the hovered map'], ['regexHotkey', 'Paste the map regex']] },
  'woke-map-scan': { page: 'map-mods', keys: [['hotkey', 'Map scan on / off'], ['rollHotkey', 'Map scan: rolling mode']] },
  'woke-essence-scan': { page: 'essence-scan', keys: [['hotkey', 'Essence scan on / off'], ['onceHotkey', 'Read every essence once']] },
  'woke-loot-filter': { page: 'loot-filter', keys: [['sampleHotkey', 'Loot filter rule for the hovered item'], ['editorHotkey', 'Open the loot filter editor'], ['reloadHotkey', 'Reload the saved loot filter in game'], ['stricterHotkey', 'Loot filter one step stricter'], ['looserHotkey', 'Loot filter one step looser']] },
  'woke-farming': { page: 'farming', keys: [['lootHotkey', 'Farming: add the hovered item']] },
  'woke-trade': { page: 'trade', keys: [['stepHotkey', 'Trade: next step for the top offer'], ['busyHotkey', 'Trade: busy reply'], ['skipHotkey', 'Trade: skip to the next offer']] }
}

function moduleNameFor (wmType: string): string {
  return MODULES.find(m => m.widgetTypes.includes(wmType))?.name ?? 'Toolkit'
}

export function hotkeyFields (config: Config): HotkeyField[] {
  const out: HotkeyField[] = []
  const widgets = config.widgets as W[]
  const find = (type: string) => widgets.find(w => w.wmType === type)
  const many = (type: string) => widgets.filter(w => w.wmType === type)

  out.push({
    id: 'overlay',
    label: 'Show / hide the overlay',
    group: 'Overlay',
    page: null,
    off: false,
    required: true,
    get: () => config.overlayKey,
    set: (v) => { if (v) config.overlayKey = v }
  })
  const woke = config.woke
  if (woke) {
    out.push({
      id: 'hide-all',
      label: 'Hide all toolkit panels',
      group: 'Overlay',
      page: null,
      off: false,
      get: () => woke.hideAllHotkey ?? null,
      set: (v) => { woke.hideAllHotkey = v }
    })
  }

  const pc = find('price-check')
  if (pc) {
    const off = !isModuleOn(config, 'apt-price-check')
    out.push({
      id: 'pc',
      label: 'Price check',
      group: 'Price check',
      page: 'price-check',
      off,
      noModKeys: true,
      ...field(pc, 'hotkey'),
      hold: { get: () => (pc.hotkeyHold as string) || 'Ctrl', set: (v) => { pc.hotkeyHold = v } }
    })
    out.push({ id: 'pc-locked', label: 'Price check (stays open)', group: 'Price check', page: 'price-check', off, ...field(pc, 'hotkeyLocked') })
  }
  const ic = find('item-check')
  if (ic) {
    const off = !isModuleOn(config, 'apt-item-info')
    const rows: Array<[string, string]> = [['hotkey', 'Item info'], ['wikiKey', 'Open item on the wiki'], ['poedbKey', 'Open item on poedb'], ['craftOfExileKey', 'Open item on Craft of Exile'], ['stashSearchKey', 'Search similar items in stash']]
    for (const [prop, label] of rows) out.push({ id: `ic-${prop}`, label, group: 'Item info', page: 'item-info', off, ...field(ic, prop) })
  }
  const heist = find('item-search')
  if (heist) out.push({ id: 'heist', label: 'Read heist gem names', group: 'Screen reading', page: 'screen', off: !isModuleOn(config, 'apt-heist-ocr'), ...field(heist, 'ocrGemsKey') })
  const delve = find('delve-grid')
  if (delve) out.push({ id: 'delve', label: 'Delve grid', group: 'Tools', page: null, off: false, ...field(delve, 'toggleKey') })
  for (const sw of many('timer')) {
    const name = sw.wmTitle || 'Stopwatch'
    out.push({ id: `sw-${sw.wmId}-t`, label: `${name}: start / stop`, group: 'Tools', page: `widget:${sw.wmId}`, off: false, ...field(sw, 'toggleKey') })
    out.push({ id: `sw-${sw.wmId}-r`, label: `${name}: reset`, group: 'Tools', page: `widget:${sw.wmId}`, off: false, ...field(sw, 'resetKey') })
  }
  config.commands.forEach((cmd, i) => {
    out.push({
      id: `chat-${i}`,
      label: `Chat: ${cmd.text || '(empty)'}`,
      group: 'Chat commands',
      page: 'chat',
      off: false,
      get: () => cmd.hotkey,
      set: (v) => { cmd.hotkey = v }
    })
  })
  // Alt+M works before the Map mods widget exists (wokeGlobalShortcuts).
  // Fixed until then: setting it places the widget.
  if (isModuleOn(config, 'map-mods') && !find(MAP_MODS_TYPE)) {
    out.push({
      id: 'map-check-default',
      label: 'Check the hovered map',
      group: moduleNameFor(MAP_MODS_TYPE),
      page: 'map-mods',
      off: false,
      get: () => MAP_CHECK_DEFAULT_KEY,
      set: (v) => {
        const w = { wmId: Math.max(0, ...config.widgets.map(_ => _.wmId)) + 1, wmType: MAP_MODS_TYPE, wmTitle: '', wmWants: 'hide', wmZorder: null, wmFlags: [] } as unknown as MapModsWidget
        initMapModsWidget(w)
        w.hotkey = v
        config.widgets.push(w)
      }
    })
  }
  for (const w of widgets) {
    const spec = WOKE_KEYS[w.wmType]
    const off = !isWidgetTypeOn(config, w.wmType)
    const group = moduleNameFor(w.wmType)
    if (spec) {
      for (const [prop, label] of spec.keys) out.push({ id: `${w.wmId}-${prop}`, label, group, page: spec.page, off, ...field(w, prop) })
    } else if (w.wmType === 'woke-regex-library') {
      for (const e of (w.entries as Array<{ id: number, name: string, text: string, hotkey: string | null }>) ?? []) {
        out.push({
          id: `${w.wmId}-${e.id}`,
          label: `Regex: ${e.name || e.text}`,
          group,
          page: 'regex-library',
          off: off || w.enableHotkeys === false,
          get: () => e.hotkey,
          set: (v) => { e.hotkey = v }
        })
      }
    } else if (w.wmType === 'woke-trade-searches') {
      for (const e of (w.entries as Array<{ id: number, name: string, hotkeyOverlay: string | null, hotkeyExternal: string | null }>) ?? []) {
        const o = off || w.enableHotkeys === false
        out.push({ id: `${w.wmId}-${e.id}-o`, label: `${e.name || 'Search'} in the overlay`, group, page: 'trade-searches', off: o, get: () => e.hotkeyOverlay, set: (v) => { e.hotkeyOverlay = v } })
        out.push({ id: `${w.wmId}-${e.id}-x`, label: `${e.name || 'Search'} in your browser`, group, page: 'trade-searches', off: o, get: () => e.hotkeyExternal, set: (v) => { e.hotkeyExternal = v } })
      }
    }
  }
  return out
}

// The full key a field registers (price check adds its held modifier).
export function fieldKey (f: HotkeyField): string | null {
  const k = f.get()
  if (!k) return null
  return f.hold ? `${f.hold.get()} + ${k}` : k
}

// Normalised key → labels of switched-on actions using it.
export function hotkeyUses (fields: HotkeyField[]): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const f of fields) {
    const k = fieldKey(f)
    if (!k || f.off) continue
    const norm = normalizeKey(k)
    map.set(norm, [...(map.get(norm) ?? []), f.label])
  }
  return map
}
