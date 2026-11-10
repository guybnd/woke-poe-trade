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
      hotkeyExternal: null
    }))
}

export function exportEntries (entries: TradeSearchEntry[]): string {
  return JSON.stringify(
    entries.map(({ name, url, category, tags, notes }) => ({ name, url, category, tags, notes })),
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
