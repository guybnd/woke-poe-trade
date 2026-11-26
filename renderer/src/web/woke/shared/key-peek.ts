// "Next time: Alt + M on a map": opening a tool from the rail when it has a
// key of its own peeks that key under the window's title for a moment
// (hidden-features audit, P4). Gone for good once the tool is opened from the
// game (its key used), or after a few peeks. Tools with no key say nothing.
import { shallowRef } from 'vue'
import { retireHint, takeShow } from './hints'

// Per tool: the widget prop holding its key, what the key does, and the
// window types whose opening from the game means the key was used.
const PEEKS: Record<string, { prop: string, what: string, usedBy: string[] }> = {
  // Alt+M opens the map check card, not this window.
  'woke-map-mods': { prop: 'hotkey', what: 'on a map checks it', usedBy: ['woke-map-check'] },
  'woke-challenges': { prop: 'hotkey', what: 'from the game', usedBy: ['woke-challenges'] },
  // Alt+F (the sample) opens the same window, so opening it from the game
  // doesn't say the editor key was used: peeks run out instead.
  'woke-loot-filter': { prop: 'editorHotkey', what: 'from the game', usedBy: [] }
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

// A window opened. `fromGame`: the overlay wasn't up, so a key opened it. A
// window that only a key opens (the map check) counts either way.
export function keyUsed (wmType: string, fromGame: boolean): void {
  for (const [tool, p] of Object.entries(PEEKS)) {
    if (p.usedBy.includes(wmType) && (fromGame || wmType !== tool)) retireHint(hintId(tool))
  }
}
