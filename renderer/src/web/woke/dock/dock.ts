// The icon dock: one row of small icons that replaces every panel that used
// to sit on screen while you play. Modules add an icon by rendering
// <DockItem> inside their widget; the dock (mounted once in the overlay)
// draws them in one row and opens each one's card after the mouse rests on it.
import { computed, markRaw, shallowReactive, shallowRef, watch } from 'vue'
import type { Slots } from 'vue'
import { AppConfig, saveConfig } from '@/web/Config'
import { ensureWokeConfig } from '../modules'
import { moduleIcon } from '../ui/game-icons'

export type DockTone = 'accent' | 'up' | 'down' | 'warn'
export type DockLed = 'on' | 'warn' | 'error'

export interface DockItemProps {
  // Module id, used for ordering and the per-module peek switch.
  id: string
  // Font Awesome class, e.g. "fas fa-route". Left out: the module's icon.
  icon?: string
  // Game art (image URL); `icon` is the fallback when it's missing or fails.
  // Left out (undefined): the module's art; null: none.
  art?: string | null
  title: string
  show: boolean
  badge?: string | number | null
  tone?: DockTone
  led?: DockLed | null
  // Show this item's card inside another item's card (by id) when that one
  // is in the dock, instead of an icon of its own.
  into?: string
  // Widget to open when the icon is clicked with the overlay open.
  wmId?: number
  cardWidth?: string
  // The card has buttons: resting on it makes the overlay clickable (and
  // hands focus back to the game when the mouse leaves).
  interactive?: boolean
}

export interface DockEntry {
  key: number
  props: DockItemProps
  slots: Slots
  onOpen: (open: boolean) => void
  onClick: () => void
  peek: { text: string, until: number } | null
}

// Fixed order, so icons don't jump around as they come and go.
export const DOCK_ORDER = [
  'toolkit', 'trade', 'campaign', 'run-timer', 'lab', 'lab-gems', 'challenges', 'mechanics', 'farming', 'boss-runs',
  'map-scan', 'essence-scan', 'trade-live', 'atlas', 'regex-library', 'market', 'league-invest', 'scarab-flip', 'loot-filter'
]

export const DOCK_NAMES: Record<string, string> = {
  'toolkit': 'Toolkit health',
  'trade': 'Trades',
  'campaign': 'Campaign tracker',
  'run-timer': 'Run timer',
  'lab': 'Labyrinth',
  'lab-gems': 'Lab gems',
  'challenges': 'Challenge guide',
  'mechanics': 'League mechanics',
  'farming': 'Farming profit',
  'boss-runs': 'Boss runs',
  'map-scan': 'Map scan',
  'essence-scan': 'Essence scan',
  'trade-live': 'Live search',
  'atlas': 'Atlas strategy',
  'regex-library': 'Regex library',
  'market': 'Market movers',
  'league-invest': 'Investments',
  'scarab-flip': 'Scarab flip',
  'loot-filter': 'Loot filter'
}

export interface DockConfig {
  // Top-left of the row, in % of the screen.
  x: number
  y: number
  vertical: boolean
  // Icons grow into one line for a few seconds when something happens.
  peeks: boolean
  // Modules whose peek is switched off.
  noPeek: string[]
  // Modules whose icon is switched off.
  hidden: string[]
}

export const DEFAULT_DOCK: DockConfig = {
  // Right of the stash and inventory, above where you fight.
  x: 35,
  y: 1.2,
  vertical: false,
  peeks: true,
  noPeek: [],
  hidden: []
}

export function dockConfig (): DockConfig {
  return AppConfig().woke?.dock ?? DEFAULT_DOCK
}

// The dock's own settings, created if missing. Called outside any computed:
// by the dock on mount and before every change it makes. Settings and the
// setup window replace the config object, and a fresh config has no `woke`
// yet, so a drag must not edit DEFAULT_DOCK (lost on save) instead.
export function ensureDockConfig (): DockConfig {
  const woke = ensureWokeConfig(AppConfig()).woke
  if (!woke.dock) woke.dock = { ...DEFAULT_DOCK, noPeek: [], hidden: [] }
  if (woke.dock.noPeek == null) woke.dock.noPeek = []
  if (woke.dock.hidden == null) woke.dock.hidden = []
  return woke.dock
}

export function saveDock () {
  saveConfig()
}

export const PEEK_MS = 5000

let nextKey = 1
// A plain array (not a reactive Map, which would hand back the raw entries
// and lose their reactivity).
export const dockEntries = shallowRef<DockEntry[]>([])

// The icon and art an item shows: its own, else its module's (by id).
export function dockIcon (p: DockItemProps): string {
  return p.icon ?? moduleIcon(p.id).fa
}
export function dockArt (p: DockItemProps): string | null {
  return p.art !== undefined ? p.art : moduleIcon(p.id).art
}

export function registerDockEntry (props: DockItemProps, slots: Slots, onOpen: (open: boolean) => void, onClick: () => void): DockEntry {
  const entry = shallowReactive<DockEntry>({
    key: nextKey++,
    props,
    slots: markRaw(slots),
    onOpen,
    onClick,
    peek: null
  })
  dockEntries.value = [...dockEntries.value, entry]
  return entry
}

export function unregisterDockEntry (entry: DockEntry) {
  dockEntries.value = dockEntries.value.filter(e => e.key !== entry.key)
}

function orderOf (id: string) {
  const i = DOCK_ORDER.indexOf(id)
  return i < 0 ? DOCK_ORDER.length : i
}

export interface DockGroup {
  host: DockEntry
  // Items whose card is shown inside the host's card.
  extras: DockEntry[]
}

// What the dock shows: visible items in a fixed order, with "into" items
// folded into their host when it's there.
export const dockGroups = computed<DockGroup[]>(() => {
  const hidden = dockConfig().hidden
  const shown = dockEntries.value.filter(e => e.props.show && !hidden.includes(e.props.id))
  const hosts = shown.filter(e => !e.props.into || !shown.some(h => h.props.id === e.props.into && !h.props.into))
  const groups = hosts
    .sort((a, b) => orderOf(a.props.id) - orderOf(b.props.id) || a.key - b.key)
    .map(host => ({ host, extras: shown.filter(e => e !== host && e.props.into === host.props.id && hosts.every(h => h !== e)) }))
  return groups
})

export function peeksOn (id: string): boolean {
  const d = dockConfig()
  return d.peeks && !d.noPeek.includes(id)
}

// Panels show only with the overlay open; their dock icon covers play.
export function hideWhilePlaying (config: { wmFlags: string[] }) {
  if (config.wmFlags[0] === 'uninitialized') return
  if (!config.wmFlags.includes('invisible-on-blur')) config.wmFlags = [...config.wmFlags, 'invisible-on-blur']
}

// Ticks `fn` every `ms` while `on()` is true (a dock card is open, say).
export function tickWhile (on: () => boolean, fn: () => void, ms: number): () => void {
  let timer: ReturnType<typeof setInterval> | undefined
  const stop = watch(on, (yes) => {
    clearInterval(timer)
    timer = undefined
    if (yes) { fn(); timer = setInterval(fn, ms) }
  }, { immediate: true })
  return () => { stop(); clearInterval(timer) }
}
