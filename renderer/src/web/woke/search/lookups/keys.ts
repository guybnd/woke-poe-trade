// "keys" (or "hotkeys", "shortcuts", "tips"): every hotkey you have set, then
// the mouse tricks the windows' "?" lists teach, in one place
// (hidden-features audit, P5).
import type { Lookup, LookupRow } from './types'

const WORDS = ['keys', 'hotkeys', 'shortcuts', 'keyboard shortcuts', 'tips', 'mouse', 'key list']

export interface SetKey {
  label: string
  group: string
  keys: string
}

// What a player can do with the mouse and keys anywhere, beyond the hotkeys.
export const GESTURES: Array<[string, string]> = [
  ['Right-click an item', 'Wiki, trade, copy, price check, more'],
  ['Ctrl + Click a mod', 'Price check: search only that mod'],
  ['Alt + Click a mod', 'Price check: leave it out'],
  ['Right-click a mod', 'Price check: tiers, split, fractured only'],
  ['Click a dashed number', 'Your own price or count (Net worth, decks)'],
  ['Wheel over a number', 'Step it up or down'],
  ['Double-click a title', 'Minimize, or back to its size'],
  ['Alt while resizing', 'No snapping'],
  ['Right-click a dock icon', 'Its menu'],
  ['Wheel over a dock icon', 'Change what it shows'],
  ['Drag a popup', 'With the overlay open; its spot is kept'],
  ['Type in the overlay', 'Opens this search'],
  ['Ctrl + V in this search', 'Price an item you copied'],
  ['F2 / Delete in a saved list', 'Rename / remove (with Undo)'],
  ['Ctrl / Shift + Click a saved row', 'Pick several']
]

export function wantsKeys (query: string): boolean {
  const q = query.trim().toLowerCase().replace(/\s+/g, ' ')
  return WORDS.includes(q)
}

// `setKeys`: the hotkeys you have set, read when asked.
export function keysLookup (setKeys: () => SetKey[]): Lookup {
  return (query) => {
    if (!wantsKeys(query)) return []
    const keys = setKeys()
    const rows: LookupRow[] = keys.map(k => ({ label: k.label, value: k.keys }))
    return [{
      id: 'keys',
      group: 'Answer',
      name: 'Keys and mouse',
      sub: `${keys.length} hotkeys set · ${GESTURES.length} mouse tricks`,
      icon: 'fas fa-keyboard',
      sections: [
        ...(rows.length ? [{ label: 'Your hotkeys', rows }] : []),
        { label: 'Mouse and keys', rows: GESTURES.map(([label, value]) => ({ label, value })) }
      ],
      actions: [{ label: 'Change hotkeys', search: 'hotkeys settings' }]
    }]
  }
}
