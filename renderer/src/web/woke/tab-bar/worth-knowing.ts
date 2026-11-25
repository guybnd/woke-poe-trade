// "Worth knowing": lines in the dock's What's new card about features that
// aren't new but are easy to miss (hidden-features audit P7 and C4, Guy's
// picks). Unlike NEWS they reach everyone, new installs too:
// - from the third day the app runs (hints.since), one line a day at most;
// - a line waits until it's shown or dismissed, then the next one comes the
//   next day;
// - a line about a gesture you've already used is skipped (`retiredBy`, the
//   tip that teaches it), and so is one whose Show me can't show it here;
// - never in a map, and not with Tips or What's new switched off.
// Each line's Show me is a NEWS_DEMOS sample, a tab or a Settings page, like
// a What's new line. Small, no imports from other tools: WokeOverlay reads it at
// startup.
import type { HintsConfig } from '../shared/hints'

export interface WorthLine {
  // Starts "wk-"; stays the same for the life of the line (hints.done remembers it).
  id: string
  wmType: string
  name: string
  // One short line, no "New: ".
  note: string
  goto?: string
  settingsPage?: string
  // Skipped once this tip is retired: the player already uses the gesture.
  retiredBy?: string
  // Skipped while this What's new line is listed, so the card never says it twice.
  sameAs?: string
  // Its Show me is a price check by name (English clients only).
  byName?: true
  // Net worth: needs the stash reader on.
  reader?: true
}

export const WORTH_PREFIX = 'wk-'

export const WORTH: WorthLine[] = [
  { id: 'wk-mod-ctrl-click', wmType: 'price-check', name: 'Price check', note: 'Ctrl + Click a mod to search only that one. Right-click it for its tiers', retiredBy: 'price-check-mod-keys', byName: true },
  { id: 'wk-search-sums', wmType: 'woke-search', name: 'Search', note: 'Type 2 div + 30c in Ctrl + Space to add up prices' },
  { id: 'wk-search-drops', wmType: 'woke-search', name: 'Search', note: 'Type an item in Ctrl + Space to see where it drops' },
  { id: 'wk-own-price', wmType: 'woke-net-worth', name: 'Net worth', goto: 'holdings', note: 'Click a price with a dashed line to set your own', retiredBy: 'line-item-clicks', reader: true },
  { id: 'wk-search-map-cards', wmType: 'woke-search', name: 'Search', note: 'Type a map in Ctrl + Space for its div cards, their odds and value', sameAs: 'div-card-map-chance' },
  { id: 'wk-search-keys', wmType: 'woke-search', name: 'Search', note: 'Type "keys" in Ctrl + Space for every hotkey and mouse trick', sameAs: 'search-keys-list' },
  { id: 'wk-hotkeys', wmType: 'settings', name: 'Settings', settingsPage: 'Hotkeys', note: 'Every tool has a hotkey. Set them all on one page' }
]

// Days after hints.since before the first line.
export const WORTH_AFTER_DAYS = 2

// Local date, YYYY-MM-DD.
export function dayOf (d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function daysBetween (a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000)
}

export interface WorthContext {
  // What's new lines still listed (unseen ids).
  unseenNews: ReadonlySet<string>
  byName: boolean
  reader: boolean
  // The tool is on (or has no switch).
  toolOn: (wmType: string) => boolean
}

export function worthFits (l: WorthLine, h: HintsConfig | undefined, ctx: WorthContext): boolean {
  const done = h?.done ?? []
  if (done.includes(l.id)) return false
  if (l.retiredBy && done.includes(l.retiredBy)) return false
  if (l.sameAs && ctx.unseenNews.has(l.sameAs)) return false
  if (l.byName && !ctx.byName) return false
  if (l.reader && !ctx.reader) return false
  return ctx.toolOn(l.wmType)
}

// Brings the line of the day up to date; true when it changed the config.
// Pure apart from `h`, for tests.
export function refreshWorth (h: HintsConfig, today: string, ctx: WorthContext): boolean {
  if (h.off) return false
  if (!h.since) { h.since = today; return true }
  if (daysBetween(h.since, today) < WORTH_AFTER_DAYS) return false
  const cur = h.wk ? WORTH.find(l => l.id === h.wk!.id) : undefined
  // The current line waits until it's shown or dismissed. Its day moves on
  // with it: the next line comes the day after it went.
  if (cur && !h.done?.includes(cur.id) && worthFits(cur, h, ctx)) {
    if (h.wk!.day === today) return false
    h.wk = { id: cur.id, day: today }
    return true
  }
  if (h.wk && h.wk.day === today) return false
  const line = WORTH.find(l => worthFits(l, h, ctx))
  if (!line) {
    if (!h.wk) return false
    delete h.wk
    return true
  }
  h.wk = { id: line.id, day: today }
  return true
}

// The line to list now, if any. With `ctx`, only if it still fits (a gesture
// used since this morning drops its line).
export function worthLine (h: HintsConfig | undefined, ctx?: WorthContext): WorthLine | null {
  if (!h || h.off || !h.wk || h.done?.includes(h.wk.id)) return null
  const l = WORTH.find(l => l.id === h.wk!.id)
  return l && (!ctx || worthFits(l, h, ctx)) ? l : null
}

// A note split for display: key phrases become key chips, and "Ctrl + Space"
// becomes the search icon with the player's own search key (Guy's tips
// review). `searchKey` null (no key set) leaves the words as they are.
export type NoteBit = string | { kbd: string, search?: true }
const NOTE_KEYS = /(Ctrl \+ Space|Ctrl \+ Click|Right-click)/
export function noteBits (note: string, searchKey: string | null | undefined): NoteBit[] {
  return note.split(NOTE_KEYS).filter(Boolean).map(s => {
    if (s === 'Ctrl + Space') return searchKey ? { kbd: searchKey, search: true as const } : s
    if (s === 'Ctrl + Click' || s === 'Right-click') return { kbd: s }
    return s
  })
}
