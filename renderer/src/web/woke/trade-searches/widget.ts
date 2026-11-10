import type { Widget, Anchor } from '@/web/overlay/widgets'
import { importList, matchesQuery, nextId, str, strList } from '../shared/library'

export { groupByCategory } from '../shared/library'

export const TRADE_SEARCHES_TYPE = 'woke-trade-searches'

export interface TradeSearchEntry {
  id: number
  name: string
  url: string
  category: string
  tags: string[]
  notes: string
  // Opens the search inside the overlay's built-in browser.
  hotkeyOverlay: string | null
  // Opens the search in the system browser.
  hotkeyExternal: string | null
  // Shown first, in the Pinned view.
  pinned?: boolean
  // When it was last opened (ms) and how often, for the Recent view and sorting.
  lastOpened?: number
  openCount?: number
}

// A folder is the `category` its searches share. This only adds its place in
// the rail and its icon; a folder with no searches stays while it's listed here.
export interface TradeSearchFolder {
  name: string
  // A FOLDER_ICONS key: "item:<English name>" or "mechanic:<id>".
  icon?: string
}

export interface TradeSearchesWidget extends Widget {
  anchor: Anchor
  enableHotkeys: boolean
  entries: TradeSearchEntry[]
  // Open saved searches in the league picked in APT's settings (default on).
  followLeague?: boolean
  // Beep and flash when an open live search shows a new result (default off).
  liveAlert?: boolean
  // The folder the price check's save box last saved to.
  lastFolder?: string
  // Folder order and icons (see TradeSearchFolder).
  folders?: TradeSearchFolder[]
  // The rail's picked view ("all", "pinned", "recent", "live", "folder:<name>") and the list's sort.
  view?: string
  sort?: SearchSort
}

export type SearchSort = 'opened' | 'name' | 'count' | 'added'

export const UNCATEGORIZED = 'Uncategorized'
export const RECENT_DAYS = 7

export const FOLDER_ICONS: string[] = [
  'item:Chaos Orb', 'item:Divine Orb', 'item:Exalted Orb', 'item:Mirror of Kalandra',
  'item:Orb of Alchemy', 'item:Orb of Fusing', "item:Jeweller's Orb", 'item:Chromatic Orb',
  'item:Vaal Orb', "item:Gemcutter's Prism", 'item:Orb of Annulment', "item:Cartographer's Chisel",
  'mechanic:map', 'mechanic:essence', 'mechanic:delve', 'mechanic:expedition',
  'mechanic:delirium', 'mechanic:blight', 'mechanic:harvest', 'mechanic:legion',
  'mechanic:breach', 'mechanic:heist', 'mechanic:sanctum', 'mechanic:stash'
]

export function folderOf (entry: TradeSearchEntry): string {
  return entry.category.trim() || UNCATEGORIZED
}

// Folders in rail order: the user's order first, then any others by name.
export function folderNames (widget: Pick<TradeSearchesWidget, 'entries' | 'folders'>): string[] {
  const listed = (widget.folders ?? []).map(f => f.name)
  const seen = new Set(listed)
  const others = [...new Set(widget.entries.map(folderOf))].filter(n => !seen.has(n)).sort((a, b) => a.localeCompare(b))
  return [...listed, ...others]
}

export function folderIcon (widget: Pick<TradeSearchesWidget, 'folders'>, name: string): string | undefined {
  return widget.folders?.find(f => f.name === name)?.icon
}

export function inView (entry: TradeSearchEntry, view: string, now: number): boolean {
  switch (view) {
    case 'pinned': return Boolean(entry.pinned)
    case 'recent': return entry.lastOpened != null && now - entry.lastOpened < RECENT_DAYS * 86_400_000
    case 'live': return isLiveSearch(entry.url)
    case 'all': return true
    default: return view.startsWith('folder:') && folderOf(entry) === view.slice(7)
  }
}

export function sortEntries (entries: TradeSearchEntry[], sort: SearchSort): TradeSearchEntry[] {
  const list = [...entries]
  const byName = (a: TradeSearchEntry, b: TradeSearchEntry) => (a.name || a.url).localeCompare(b.name || b.url)
  switch (sort) {
    case 'name': return list.sort(byName)
    case 'count': return list.sort((a, b) => (b.openCount ?? 0) - (a.openCount ?? 0) || byName(a, b))
    case 'added': return list.sort((a, b) => b.id - a.id)
    default: return list.sort((a, b) => (b.lastOpened ?? 0) - (a.lastOpened ?? 0) || b.id - a.id)
  }
}

// Pinned searches lead whatever the sort.
export function pinnedFirst (entries: TradeSearchEntry[]): TradeSearchEntry[] {
  return [...entries.filter(e => e.pinned), ...entries.filter(e => !e.pinned)]
}

// Renames a folder (merging into one of that name if it exists). Returns the new name.
export function renameFolder (widget: TradeSearchesWidget, from: string, to: string): string {
  const name = to.trim()
  if (!name || name === from) return from
  for (const e of widget.entries) {
    if (folderOf(e) === from) e.category = name === UNCATEGORIZED ? '' : name
  }
  const folders = widget.folders ?? []
  const old = folders.find(f => f.name === from)
  const target = folders.find(f => f.name === name)
  if (old && target) {
    target.icon ??= old.icon
    widget.folders = folders.filter(f => f !== old)
  } else if (old) {
    old.name = name
  }
  if (widget.view === `folder:${from}`) widget.view = `folder:${name}`
  if (widget.lastFolder === from) widget.lastFolder = name
  return name
}

// Removes a folder; its searches go to Uncategorized.
export function deleteFolder (widget: TradeSearchesWidget, name: string): void {
  for (const e of widget.entries) {
    if (folderOf(e) === name) e.category = ''
  }
  widget.folders = (widget.folders ?? []).filter(f => f.name !== name)
  if (widget.view === `folder:${name}`) widget.view = 'all'
  if (widget.lastFolder === name) widget.lastFolder = undefined
}

// Lists the folder in the rail order (adding it if it's only a category so far) and returns its record.
// Uncategorized is never stored: it shows only while it holds searches.
export function ensureFolder (widget: TradeSearchesWidget, name: string): TradeSearchFolder {
  const order = folderNames(widget).filter(n => n !== UNCATEGORIZED)
  if (!order.includes(name)) order.push(name)
  const byName = new Map((widget.folders ?? []).map(f => [f.name, f]))
  widget.folders = order.map(n => byName.get(n) ?? { name: n })
  return widget.folders.find(f => f.name === name)!
}

export function moveFolder (widget: TradeSearchesWidget, name: string, by: -1 | 1): void {
  ensureFolder(widget, name)
  const list = widget.folders!
  const i = list.findIndex(f => f.name === name)
  const j = i + by
  if (j < 0 || j >= list.length) return
  ;[list[i], list[j]] = [list[j], list[i]]
  widget.folders = [...list]
}

export type OpenTarget = 'overlay' | 'external'

// Target string carried by the host's `trigger-event` shortcut action.
export function hotkeyTarget (wmId: number, entryId: number, where: OpenTarget): string {
  return `woke-trade:${wmId}:${entryId}:${where}`
}

export function parseHotkeyTarget (target: string): { wmId: number, entryId: number, where: OpenTarget } | null {
  const m = /^woke-trade:(\d+):(\d+):(overlay|external)$/.exec(target)
  if (!m) return null
  return { wmId: Number(m[1]), entryId: Number(m[2]), where: m[3] as OpenTarget }
}

export function isValidUrl (url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

export function isLiveSearch (url: string): boolean {
  return /\/live\/?(\?|#|$)/.test(url)
}

export function emptyEntry (entries: TradeSearchEntry[]): TradeSearchEntry {
  return {
    id: nextId(entries),
    name: '',
    url: '',
    category: '',
    tags: [],
    notes: '',
    hotkeyOverlay: null,
    hotkeyExternal: null
  }
}

export function matchesFilter (entry: TradeSearchEntry, filter: string): boolean {
  return matchesQuery([entry.name, entry.url, entry.category, entry.notes, ...entry.tags], filter)
}

export function parseImport (json: string, existing: TradeSearchEntry[]): TradeSearchEntry[] {
  let id = nextId(existing)
  return importList(json)
    .filter(r => typeof r.url === 'string' && isValidUrl(r.url))
    .map(r => ({
      id: id++,
      name: str(r.name),
      url: str(r.url),
      category: str(r.category),
      tags: strList(r.tags),
      notes: str(r.notes),
      hotkeyOverlay: null,
      hotkeyExternal: null,
      pinned: r.pinned === true ? true : undefined
    }))
}

export function exportEntries (entries: TradeSearchEntry[]): string {
  return JSON.stringify(
    entries.map(({ name, url, category, tags, notes, pinned }) => ({ name, url, category, tags, notes, ...(pinned ? { pinned } : {}) })),
    null, 2)
}

// Official trade URLs carry the league: /trade/search/<League>/<id>, or
// /trade/exchange/<League>/<id> for bulk. Search ids keep working in a new
// league, so swapping the segment revives last league's saved searches.
const LEAGUE_IN_URL = /(\/trade\/(?:search|exchange)\/)([^/?#]+)/

export function leagueOf (url: string): string | null {
  const m = LEAGUE_IN_URL.exec(url)
  if (!m) return null
  try { return decodeURIComponent(m[2]) } catch { return m[2] }
}

export function withLeague (url: string, league: string | null | undefined): string {
  if (!league) return url
  return url.replace(LEAGUE_IN_URL, (_all, head: string) => head + encodeURIComponent(league))
}

// A readable name for a link saved from price check: the item name or base
// type from the `?q=` query, if there is one.
export function nameFromTradeUrl (url: string): string {
  try {
    const q = new URL(url).searchParams.get('q')
    if (!q) return ''
    const query = (JSON.parse(q) as { query?: { name?: unknown, type?: unknown } }).query
    const pick = (v: unknown) => typeof v === 'string' ? v : (v && typeof (v as { option?: unknown }).option === 'string') ? (v as { option: string }).option : ''
    return [pick(query?.name), pick(query?.type)].filter(Boolean).join(' ')
  } catch {
    return ''
  }
}

export const SAVED_FROM_PRICE_CHECK = 'Saved from price check'
