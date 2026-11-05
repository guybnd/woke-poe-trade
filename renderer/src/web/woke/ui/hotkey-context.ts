// Lets every hotkey cell in the settings window show clashes without each one
// rebuilding the whole key list: the settings shell provides it.
import { RESERVED_SHORTCUTS } from '@ipc/KeyToCode'
import { inject, provide } from 'vue'
import type { ComputedRef, Ref } from 'vue'

export interface HotkeyContext {
  // Normalised key → labels of every action on it (switched-on modules only).
  uses: ComputedRef<Map<string, string[]>>
  // Normalised keys another program holds.
  failed: ComputedRef<Set<string>>
  // Normalised key → what PoE uses it for.
  poeBinds: Ref<Map<string, string>>
}

const KEY = Symbol('woke-hotkeys')
export function provideHotkeyContext (ctx: HotkeyContext) { provide(KEY, ctx) }
export function useHotkeyContext (): HotkeyContext | null { return inject<HotkeyContext | null>(KEY, null) }

// Main never registers these (see RESERVED_SHORTCUTS), so say so. Takes the whole
// key, with any hold key already joined on.
export function reservedKeyNote (key: string): string | null {
  return RESERVED_SHORTCUTS.includes(key) ? "The game uses this key, so it won't work here" : null
}

export function poeBindNote (action: string): string {
  return `PoE uses this key: ${action}. While the game has focus, this hotkey wins.`
}

export function normalizeKey (key: string): string {
  const parts = key.split('+').map(p => p.trim().toLowerCase()).filter(Boolean)
  const mods = ['ctrl', 'shift', 'alt'].filter(m => parts.includes(m))
  const rest = parts.filter(p => !mods.includes(p))
  return [...mods, ...rest].join(' + ')
}
