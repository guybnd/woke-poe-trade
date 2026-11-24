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

// Opens the palette from inside the overlay, on this text.
export const searchRequest = shallowRef<{ query: string } | null>(null)
