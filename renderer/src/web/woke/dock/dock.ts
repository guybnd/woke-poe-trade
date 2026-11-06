// The icon dock: one row of small icons that replaces every panel that used
// to sit on screen while you play. Modules add an icon by rendering
// <DockItem> inside their widget; the dock (mounted once in the overlay)
// draws them in one row and opens each one's card after the mouse rests on it.
import { computed, markRaw, shallowReactive, shallowRef, watch } from 'vue'
import type { Slots } from 'vue'
import { AppConfig, saveConfig } from '@/web/Config'
import { ensureWokeConfig } from '../modules'
import { moduleIcon } from '../ui/game-icons'
import { Host } from '@/web/background/IPC'
import type { WidgetManager } from '@/web/overlay/interfaces'
import { zone } from '../shared/zone'
import { endOfToday, hereEnded, hereScope, timeLeft } from './dismiss-rules'
import type { HereScope } from './dismiss-rules'

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
  // A click while playing does this, instead of opening the card. Ignored when
  // hover cards are off, since a click is then the only way to open the card.
  gameClick?: () => void
  cardWidth?: string
  // Values kept on screen beside the icon.
  readouts?: Array<{ id: string, text: string, tone: 'up' | 'down' | 'dim' | null }>
  // A ring around the icon, 0 to 1.
  progress?: number | null
  // With the overlay open, a click keeps the card open until the next click.
  pinnable?: boolean
  // This icon's own rows in its right-click menu.
  menu?: DockMenuAction[]
  // A count of new things (offers, hits). When it goes up, a dismissed icon
  // comes back, unless it was dismissed for good.
  wake?: number
}

export interface DockMenuAction {
  label: string
  icon: string
  action: () => void
  disabled?: boolean
  // A switch: draws a tick when on.
  checked?: boolean
}

export interface DockEntry {
  key: number
  props: DockItemProps
  slots: Slots
  onOpen: (open: boolean) => void
  onClick: () => void
  peek: { text: string, until: number } | null
  // The card stays open: by a click with the overlay open, or by a hotkey.
  pinned: 'click' | 'key' | null
}

// Fixed order, so icons don't jump around as they come and go.
export const DOCK_ORDER = [
  'toolkit', 'trade', 'campaign', 'run-timer', 'lab', 'lab-gems', 'challenges', 'mechanics', 'farming', 'drop-counter', 'boss-runs', 'death-recap',
  'map-scan', 'essence-scan', 'trade-live', 'atlas', 'regex-library', 'market', 'league-invest', 'scarab-flip', 'wealthy-exile', 'loot-filter'
]

// Icons that grow into a line when something happens: "no pop-ups" means
// something for these.
export const DOCK_PEEKS = new Set(['campaign', 'farming', 'drop-counter', 'lab', 'loot-filter', 'trade', 'trade-live'])

export const DOCK_NAMES: Record<string, string> = {
  'toolkit': 'Toolkit health',
  'trade': 'Trades',
  'campaign': 'Campaign',
  'run-timer': 'Run timer',
  'lab': 'Labyrinth',
  'lab-gems': 'Lab gems',
  'challenges': 'Challenge guide',
  'mechanics': 'League mechanics',
  'death-recap': 'Death recap',
  'farming': 'Farming',
  'drop-counter': 'Drop counter',
  'boss-runs': 'Boss runs',
  'map-scan': 'Map scan',
  'essence-scan': 'Essence scan',
  'trade-live': 'Live search',
  'atlas': 'Atlas strategy',
  'regex-library': 'Regex library',
  'market': 'Market movers',
  'league-invest': 'Investments',
  'scarab-flip': 'Flips',
  'wealthy-exile': 'Wealthy Exile',
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
  // false: cards open only on a click. Unset: on hover too.
  hoverOpens?: boolean
  // Icons dismissed for a while: until when (ms).
  dismissed?: Record<string, number>
  // Hints on dock cards you've closed for good.
  closedTips?: string[]
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
  if (!woke.dock) woke.dock = { ...DEFAULT_DOCK, noPeek: [], hidden: [], dismissed: {} }
  if (woke.dock.noPeek == null) woke.dock.noPeek = []
  if (woke.dock.hidden == null) woke.dock.hidden = []
  if (woke.dock.dismissed == null) woke.dock.dismissed = {}
  return woke.dock
}

export function saveDock () {
  saveConfig()
}

export function tipClosed (id: string): boolean {
  return dockConfig().closedTips?.includes(id) ?? false
}

export function closeTip (id: string) {
  const d = ensureDockConfig()
  d.closedTips = [...(d.closedTips ?? []), id]
  saveDock()
}

export const PEEK_MS = 5000

let nextKey = 1
// A plain array (not a reactive Map, which would hand back the raw entries
// and lose their reactivity).
export const dockEntries = shallowRef<DockEntry[]>([])
// The icon whose card or menu opened last: opening one closes the one before.
// A pinned card stays, since you asked it to.
export const dockCardOwner = shallowRef<number | null>(null)

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
    peek: null,
    pinned: null
  })
  dockEntries.value = [...dockEntries.value, entry]
  return entry
}

// Whether a module's icon has its place in the row now, even if dismissed for a
// while (the run timer stays out of the row while the campaign icon is away).
export function dockIconShowing (id: string): boolean {
  return !dockConfig().hidden.includes(id) && dockEntries.value.some(e => e.props.id === id && e.props.show)
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
  const shown = dockEntries.value.filter(e => e.props.show && !hidden.includes(e.props.id) && !isDismissed(e.props.id))
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

// ---- Dismissing ----
// Dismissed for this map (or visit, lab, zone): gone with a restart, so kept here.
const dismissedHere = shallowRef<Record<string, HereScope>>({})
// Moves on when a timed dismissal runs out, for whatever reads isDismissed.
const dismissClock = shallowRef(Date.now())

export function isDismissed (id: string): boolean {
  if (dismissedHere.value[id]) return true
  const until = dockConfig().dismissed?.[id]
  return until != null && until > dismissClock.value
}

export type DismissFor = 'here' | '30min' | 'today' | 'always'

export interface DismissUndo { restore: () => void, phrase: string }

function without<T> (map: Record<string, T>, ids: string[]): Record<string, T> {
  return Object.fromEntries(Object.entries(map).filter(([id]) => !ids.includes(id)))
}

// `ids`: an icon and any others folded into its card.
export function dismissIcons (ids: string[], what: DismissFor, now = Date.now()): DismissUndo {
  const d = ensureDockConfig()
  const had = <T>(map: Record<string, T>) => Object.fromEntries(Object.entries(map).filter(([id]) => ids.includes(id)))
  const before = { here: had(dismissedHere.value), timed: had(d.dismissed ?? {}), hidden: d.hidden.filter(id => ids.includes(id)) }
  let phrase = 'for good'
  dismissClock.value = now
  if (what === 'here') {
    const scope = hereScope(zone)
    phrase = `for ${scope.phrase}`
    dismissedHere.value = { ...dismissedHere.value, ...Object.fromEntries(ids.map(id => [id, scope])) }
  } else if (what === 'always') {
    d.hidden = [...new Set([...d.hidden, ...ids])]
    dismissedHere.value = without(dismissedHere.value, ids)
    d.dismissed = without(d.dismissed ?? {}, ids)
  } else {
    phrase = what === '30min' ? 'for 30 minutes' : 'for today'
    const until = what === '30min' ? now + 30 * 60_000 : endOfToday(now)
    d.dismissed = { ...d.dismissed, ...Object.fromEntries(ids.map(id => [id, until])) }
  }
  saveDock()
  return {
    phrase,
    restore: () => {
      const cur = ensureDockConfig()
      dismissedHere.value = { ...without(dismissedHere.value, ids), ...before.here }
      cur.dismissed = { ...without(cur.dismissed ?? {}, ids), ...before.timed }
      cur.hidden = [...cur.hidden.filter(id => !ids.includes(id)), ...before.hidden]
      saveDock()
    }
  }
}

// Back in the row, however it was dismissed.
export function restoreIcon (id: string) {
  const d = ensureDockConfig()
  dismissedHere.value = without(dismissedHere.value, [id])
  d.dismissed = without(d.dismissed ?? {}, [id])
  d.hidden = d.hidden.filter(x => x !== id)
  saveDock()
}

// Something new happened: back in the row, unless dismissed for good.
export function wakeIcon (id: string) {
  if (dismissedHere.value[id]) dismissedHere.value = without(dismissedHere.value, [id])
  if (dockConfig().dismissed?.[id] != null) {
    const d = ensureDockConfig()
    d.dismissed = without(d.dismissed ?? {}, [id])
    saveDock()
  }
}

export interface DismissedIcon { id: string, name: string, left: string }

// What the row's grip can bring back.
export function dismissedIcons (now = Date.now()): DismissedIcon[] {
  const d = dockConfig()
  const out: DismissedIcon[] = []
  for (const id of DOCK_ORDER) {
    const name = DOCK_NAMES[id] ?? id
    const here = dismissedHere.value[id]
    const until = d.dismissed?.[id]
    if (d.hidden.includes(id)) out.push({ id, name, left: 'always' })
    else if (here) out.push({ id, name, left: here.phrase })
    else if (until != null && until > now) out.push({ id, name, left: timeLeft(until, now) })
  }
  return out
}

// Ends dismissals as you move between areas and as their time runs out. Called
// by the dock, which is mounted once.
export function runDismissals (): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined
  // The area line comes first and has no name yet; the kind can still change.
  const stopZone = watch(() => [zone.areaId, zone.seed, zone.kind, zone.name], () => {
    if (!zone.name) return
    const left = Object.entries(dismissedHere.value).filter(([, s]) => !hereEnded(s, zone))
    if (left.length !== Object.keys(dismissedHere.value).length) dismissedHere.value = Object.fromEntries(left)
  })
  const stopTimer = watch([() => dockConfig().dismissed, dismissClock], ([timed]) => {
    clearTimeout(timer)
    const times = Object.values(timed ?? {}).filter(t => t > Date.now())
    if (!times.length) return
    timer = setTimeout(() => { dismissClock.value = Date.now() }, Math.min(...times) - Date.now() + 50)
  }, { immediate: true })
  return () => { stopZone(); stopTimer(); clearTimeout(timer) }
}

// A window opened from a card or a menu: those clicks don't open the overlay,
// and a window that only shows with it open needs it.
export function openOverlay () {
  Host.sendEvent({ name: 'OVERLAY->MAIN::woke-open-overlay', payload: undefined })
}
export function showWithOverlay (wm: WidgetManager, wmId: number) {
  openOverlay()
  wm.show(wmId)
}

export function openSettingsPage (wm: WidgetManager, page: string) {
  const settings = wm.widgets.value.find(w => w.wmType === 'settings')
  if (!settings) return
  wm.setFlag(settings.wmId, `settings::page=${page}`, true)
  showWithOverlay(wm, settings.wmId)
}

// Where an undo note from a menu sits: over the icon.
export function dockIconEl (id: string): Element | null {
  return document.querySelector(`[data-dock="${id}"]`)
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
