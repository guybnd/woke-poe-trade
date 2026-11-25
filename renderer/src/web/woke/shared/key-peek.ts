// "Next time: Alt + M on a map": opening a tool from the rail when it has a
// key of its own peeks that key under the window's title for a moment
// (hidden-features audit, P4). Gone for good once the tool is opened from the
// game (its key used), or after a few peeks. Tools with no key say nothing.
import { shallowRef } from 'vue'
import { retireHint, takeShow } from './hints'

// Per tool: the widget prop holding its key, and what the key does it on.
const PEEKS: Record<string, { prop: string, what: string }> = {
  'woke-map-mods': { prop: 'hotkey', what: 'on a map' },
  'woke-challenges': { prop: 'hotkey', what: 'from the game' },
  'woke-loot-filter': { prop: 'editorHotkey', what: 'from the game' },
  'woke-lab': { prop: 'hotkeyOverlay', what: 'from the game' }
}
const SHOWS = 3
const MS = 3000

export interface KeyPeek { wmId: number, keys: string, what: string }
export const keyPeek = shallowRef<KeyPeek | null>(null)
let timer: ReturnType<typeof setTimeout> | undefined

const hintId = (wmType: string) => `key-peek:${wmType}`

// The tool's key, or null when it has none (or isn't one that peeks).
export function peekFor (widget: { wmType: string } & Record<string, unknown>): { keys: string, what: string } | null {
  const spec = PEEKS[widget.wmType]
  const keys = spec ? widget[spec.prop] : null
  return spec && typeof keys === 'string' && keys ? { keys, what: spec.what } : null
}

// Opened from the rail.
export function peekKey (widget: { wmId: number, wmType: string } & Record<string, unknown>): void {
  const p = peekFor(widget)
  if (!p || !takeShow(hintId(widget.wmType), SHOWS)) return
  keyPeek.value = { wmId: widget.wmId, ...p }
  clearTimeout(timer)
  timer = setTimeout(() => { keyPeek.value = null }, MS)
}

// Opened some other way than the overlay (its key from the game).
export function keyUsed (wmType: string): void {
  if (PEEKS[wmType]) retireHint(hintId(wmType))
}
