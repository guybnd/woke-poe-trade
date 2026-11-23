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

// Opens the palette from inside the overlay, on this text.
export const searchRequest = shallowRef<{ query: string } | null>(null)
