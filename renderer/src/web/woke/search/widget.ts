// The search palette's window. Kept free of Vue component imports: shortcuts.ts
// imports this file.
import { shallowRef } from 'vue'
import type { Widget, Anchor } from '@/web/overlay/widgets'

export const SEARCH_TYPE = 'woke-search'
export const SEARCH_TARGET = 'woke-search-open'
export const SEARCH_DEFAULT_KEY = 'Ctrl + Space'
const OLD_DEFAULT_KEY = 'Alt + P'

export interface SearchWidget extends Widget {
  anchor: Anchor
  hotkey: string | null
  // The old default key has been moved to the new one, once.
  keyMoved?: boolean
  // Items you looked up, newest first.
  recent?: Array<{ type: string, name: string }>
  // What you typed when the window closed, newest first, so a quick look
  // that opened nothing is kept too.
  queries?: string[]
  // Lines you saved out of Recent, kept until you remove them: a search or an item.
  saved?: SearchLine[]
  // Result groups set apart from their defaults (groups.ts): open, folded or off.
  groups?: Record<string, 'open' | 'folded' | 'off'>
}

export function initSearchWidget (wmId: number, taken: string[] = []): SearchWidget {
  return {
    wmId,
    wmType: SEARCH_TYPE,
    wmTitle: '',
    wmWants: 'hide',
    wmZorder: 'exclusive',
    wmFlags: ['hide-on-blur', 'menu::skip'],
    anchor: { pos: 'tc', x: 50, y: 16 },
    hotkey: taken.includes(SEARCH_DEFAULT_KEY) ? null : SEARCH_DEFAULT_KEY,
    keyMoved: true
  }
}

// Once per config, so choosing the old key again later sticks. A key that's
// already in use elsewhere isn't taken over.
export function moveSearchKey (widget: SearchWidget, taken: string[]): void {
  if (widget.keyMoved) return
  widget.keyMoved = true
  if (widget.hotkey === OLD_DEFAULT_KEY && !taken.includes(SEARCH_DEFAULT_KEY)) widget.hotkey = SEARCH_DEFAULT_KEY
}

// A line of the empty box's lists: a typed search, or an item by poe.ninja type and name.
export type SearchLine = { q: string } | { type: string, name: string }
export const SAVED_MAX = 10
export function sameLine (a: SearchLine, b: SearchLine): boolean {
  return 'q' in a ? 'q' in b && a.q === b.q : !('q' in b) && a.type === b.type && a.name === b.name
}
// Takes a line out of every list it is in: Saved, the typed searches, Recent.
export function dropLine (w: Pick<SearchWidget, 'saved' | 'queries' | 'recent'>, line: SearchLine): void {
  if (w.saved?.some(s => sameLine(s, line))) w.saved = w.saved.filter(s => !sameLine(s, line))
  if ('q' in line) {
    if (w.queries?.includes(line.q)) w.queries = w.queries.filter(q => q !== line.q)
  } else if (w.recent?.some(r => sameLine(r, line))) {
    w.recent = w.recent.filter(r => !sameLine(r, line))
  }
}
// Saved, newest first: out of Recent, so it isn't listed twice.
export function saveLine (w: Pick<SearchWidget, 'saved' | 'queries' | 'recent'>, line: SearchLine): void {
  dropLine(w, line)
  w.saved = [line, ...(w.saved ?? [])].slice(0, SAVED_MAX)
}
// Back from Saved to the top of Recent.
export function unsaveLine (w: Pick<SearchWidget, 'saved' | 'queries' | 'recent'>, line: SearchLine): void {
  dropLine(w, line)
  if ('q' in line) w.queries = [line.q, ...(w.queries ?? [])].slice(0, QUERY_MAX)
  else w.recent = [{ type: line.type, name: line.name }, ...(w.recent ?? [])].slice(0, RECENT_MAX)
}

export const RECENT_MAX = 6
export const QUERY_MAX = 3
// The typed searches with this one first, or null when nothing changes. A
// search that grows from an older one ("tab", then "tabula") replaces it; a
// shorter one ("ta") leaves the longer ones be.
export function addQuery (list: readonly string[] | undefined, text: string, skip: readonly string[] = []): string[] | null {
  const q = text.replace(/\s+/g, ' ').trim()
  if (q.length < 2 || skip.includes(q)) return null
  const lower = q.toLowerCase()
  const old = list ?? []
  if (old[0] === q) return null
  const rest = old.filter(o => !lower.startsWith(o.toLowerCase()))
  return [q, ...rest].slice(0, QUERY_MAX)
}

// The palette's code loads a moment after the overlay starts, but its hotkey
// is registered from the saved config straight away. A press in between
// would reach no listener and be lost, so index.ts notes it here until the
// palette has mounted, and the palette opens on it then (if it's still fresh:
// pressedAt is when, 0 for none).
export const earlySearchPress = { mounted: false, pressedAt: 0 }
export const EARLY_PRESS_MS = 5_000

// Opens the palette from inside the overlay, on this text.
export const searchRequest = shallowRef<{ query: string } | null>(null)
