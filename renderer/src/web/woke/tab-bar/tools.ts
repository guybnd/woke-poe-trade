// Display info for the overlay tab bar: icon, name and group per widget type.
import { MODULES, MODULE_GROUPS, ModuleGroup } from '@/web/woke/modules'
import type { Anchor, WidgetMenu } from '@/web/overlay/widgets'
import { moduleIconForWidget } from '../ui/game-icons'

// Stored on the menu widget's own config. Older configs have neither field.
export interface TabBarConfig extends WidgetMenu {
  pinned?: number[]
  labels?: Record<number, string>
  // Moved to the rail layout (migrateToRail). Unset on older and new configs.
  rail?: boolean
  // Laid flat, in a row. Unset: standing up.
  railFlat?: boolean
  // Unset: the default size.
  railSize?: RailSize
  // Left by older versions, which had a "remove from bar" button. Every tool
  // is in the launcher now, so migrateToRail drops it.
  dismissed?: number[]
}

export type RailSize = 's' | 'm' | 'l' | 'xl' | 'xxl'
export const RAIL_SIZES: RailSize[] = ['s', 'm', 'l', 'xl', 'xxl']
export const RAIL_DEFAULT_SIZE: RailSize = 'xl'
export const RAIL_ZOOM: Record<RailSize, number> = { s: 0.82, m: 1, l: 1.25, xl: 1.55, xxl: 1.9 }

// One size up or down, staying at the ends.
export function stepRailSize (size: RailSize | undefined, dir: 1 | -1): RailSize {
  const i = RAIL_SIZES.indexOf(size ?? RAIL_DEFAULT_SIZE)
  return RAIL_SIZES[Math.max(0, Math.min(RAIL_SIZES.length - 1, i + dir))]
}

// A dragged pin dropped at `index` among the pins on show (before the one there,
// or last). Pins not on show, of switched-off modules, keep their places around it.
export function movePin (pinned: number[], shown: number[], id: number, index: number): number[] {
  const rest = shown.filter(x => x !== id)
  const from = shown.indexOf(id)
  // The index counts the dragged icon, still in the row.
  const at = from >= 0 && index > from ? index - 1 : index
  if (from < 0 || at === from) return pinned
  const out = pinned.filter(x => x !== id)
  const before = rest[at]
  const pos = before != null ? out.indexOf(before) : out.indexOf(rest[rest.length - 1]) + 1
  out.splice(pos, 0, id)
  return out
}

// Which way the rail should stand when dropped with the mouse here: near the top
// or bottom edge it lies flat, near a side it stands up. Near a corner, or away
// from the edges, it stays as it is (null).
export const RAIL_EDGE_PX = 48
export function railDropEdge (x: number, y: number, w: number, h: number): 'top' | 'bottom' | 'left' | 'right' | null {
  const near = (v: number, size: number) => v <= RAIL_EDGE_PX ? -1 : v >= size - RAIL_EDGE_PX ? 1 : 0
  const nx = near(x, w)
  const ny = near(y, h)
  if ((nx !== 0) === (ny !== 0)) return null
  if (ny !== 0) return ny < 0 ? 'top' : 'bottom'
  return nx < 0 ? 'left' : 'right'
}

// Pinned on the rail until the user picks their own in the launcher.
const DEFAULT_PIN_TYPES = ['woke-market-tracker', 'woke-boss-runs', 'woke-map-scan', 'woke-loot-filter']

// A window title that is only an icon ("{icon=fa-cog}"): settings and search.
export function parseWidgetTitle (wmTitle: string): { icon?: string, title: string } {
  const m = wmTitle.match(/^(?:\{icon=(?<icon>[^}]+)\}\s*)?(?<title>.*)$/)
  return { icon: m?.groups?.icon, title: m?.groups?.title ?? '' }
}

// Once per config: the bar becomes a short rail on the left edge, below the
// game's buffs. Icon-only tools stay on it, plus one of each default pin.
export function migrateToRail (
  config: TabBarConfig,
  widgets: Array<{ wmId: number, wmType: string, wmTitle: string }>
): void {
  if (config.rail) return
  const iconOnly = widgets.filter(w => {
    const { icon, title } = parseWidgetTitle(w.wmTitle)
    return !!icon && !title
  })
  const pins = DEFAULT_PIN_TYPES
    .map(type => widgets.find(w => w.wmType === type))
    .filter((w): w is typeof widgets[number] => !!w)
  config.pinned = [...iconOnly, ...pins].map(w => w.wmId)
  config.anchor = railAnchor()
  delete config.dismissed
  config.rail = true
}

export function railAnchor (): Anchor {
  return { pos: 'tl', x: 0, y: 10.5 }
}

// Copied item text has separator lines, in every game language. Anything else
// pasted into the launcher is just a search.
export function looksLikeItem (text: string): boolean {
  return /^-{8}\s*$/m.test(text)
}

// APT's own windows; toolkit modules use their module icon (modules.ts).
const APT_ICONS: Record<string, string> = {
  'settings': 'fa-cog',
  'image-strip': 'fa-images',
  'timer': 'fa-stopwatch'
}

// APT's icon-only windows have no name of their own to show on hover.
export const ICON_TOOL_NAMES: Record<string, string> = {
  'settings': 'Settings',
  'item-search': 'Item search'
}

export function artFor (wmType: string): string | null {
  return moduleIconForWidget(wmType)?.art ?? null
}

export function iconFor (wmType: string): string {
  const mod = moduleIconForWidget(wmType)
  if (mod) return mod.fa.replace(/^fa[srb] /, '')
  return APT_ICONS[wmType] ?? 'fa-window-maximize'
}

// Only APT's own multi widgets may have several copies (each holds different
// content). Every woke module is one tool, so adding it again opens the one
// already placed.
export function allowsCopies (wmType: string): boolean {
  return !wmType.startsWith('woke-')
}

export type LauncherState = 'placed' | 'available' | 'off' | 'dock'

export interface LauncherEntry<T> {
  key: string
  wmType: string
  name: string
  icon: string
  art: string | null
  state: LauncherState
  tab: T | null
}

// Every tool for the launcher, in module order: each placed window, or one
// entry for a tool with none on the overlay.
export function launcherEntries<T extends { wmId: number, wmType: string, name: string, icon: string, art: string | null }> (
  specs: Array<{ type: string, name: string }>,
  tabs: T[],
  isOff: (wmType: string) => boolean,
  isDockOnly: (wmType: string) => boolean
): Array<LauncherEntry<T>> {
  const order = MODULES.flatMap(m => m.widgetTypes)
  const rank = (type: string) => {
    const i = order.indexOf(type)
    return i < 0 ? order.length : i
  }
  const sorted = [...specs].sort((a, b) => rank(a.type) - rank(b.type))
  const known = new Set(sorted.map(s => s.type))
  const placed = (tab: T): LauncherEntry<T> => ({
    key: `w${tab.wmId}`, wmType: tab.wmType, name: tab.name, icon: tab.icon, art: tab.art, state: 'placed', tab
  })
  const entries = sorted.flatMap((spec): Array<LauncherEntry<T>> => {
    const mine = tabs.filter(tab => tab.wmType === spec.type)
    if (mine.length) return mine.map(placed)
    return [{
      key: `t${spec.type}`,
      wmType: spec.type,
      name: spec.name,
      icon: iconFor(spec.type),
      art: artFor(spec.type),
      state: isOff(spec.type) ? 'off' : isDockOnly(spec.type) ? 'dock' : 'available',
      tab: null
    }]
  })
  return [...entries, ...tabs.filter(tab => !known.has(tab.wmType)).map(placed)]
}

export interface ModuleGroupOf<T> {
  label: string
  items: T[]
}

// Every group, even an empty one, so a filtered launcher keeps its columns.
export function groupByModule<T extends { wmType: string }> (items: T[]): Array<ModuleGroupOf<T>> {
  const groupOf = new Map<string, ModuleGroup>()
  for (const m of MODULES) for (const t of m.widgetTypes) groupOf.set(t, m.group)
  const groups: Array<ModuleGroupOf<T>> = MODULE_GROUPS
    .filter(g => g.id !== 'apt')
    .map(g => ({ label: g.label, items: items.filter(i => groupOf.get(i.wmType) === g.id) }))
  groups.push({ label: 'Overlay', items: items.filter(i => !groupOf.has(i.wmType)) })
  return groups
}
