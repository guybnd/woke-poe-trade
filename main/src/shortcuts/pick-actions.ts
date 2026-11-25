// woke: two actions on one key used to lose both. The first one stays, so a clash
// costs one action; the settings window already warns about it. Opening the
// overlay always wins, since it's the way back to the settings. A test-only entry
// comes last because registering one unregisters its key again.
export interface PickableAction {
  shortcut: string
  action: { type: string }
}

function rank (entry: PickableAction): number {
  if (entry.action.type === 'toggle-overlay') return 2
  return entry.action.type === 'test-only' ? 0 : 1
}

// "Shift + Alt + F" and "Alt + Shift + F" are one key.
const MODS = ['ctrl', 'shift', 'alt']
export function keyId (shortcut: string): string {
  const parts = shortcut.split('+').map(p => p.trim().toLowerCase()).filter(Boolean)
  return [...MODS.filter(m => parts.includes(m)), ...parts.filter(p => !MODS.includes(p))].join(' + ')
}

export function pickActions<T extends PickableAction> (actions: T[], onDropped: (shortcut: string) => void): T[] {
  const kept = new Map<string, T>()
  for (const entry of actions) {
    const key = keyId(entry.shortcut)
    const had = kept.get(key)
    if (!had) {
      kept.set(key, entry)
      continue
    }
    onDropped(entry.shortcut)
    if (rank(entry) > rank(had)) kept.set(key, entry)
  }
  return [...kept.values()]
}
