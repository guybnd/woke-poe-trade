// The Regex library replaced APT's Stash search widget. This moves the
// strings saved there into the library (once, when the config loads) and
// drops the old widgets. Plain config objects, no Vue.
import { REGEX_LIBRARY_TYPE, starterEntries } from './widget'
import type { RegexEntry } from './widget'
import { popupAnchor } from '../ui/window-anchor'

interface StashSearchLike {
  wmType: string
  wmTitle?: string
  entries?: Array<{ name?: string, text?: string, hotkey?: string | null }>
}
type WidgetLike = Record<string, unknown> & { wmId: number, wmType: string }

// APT's starter strings: moved only if the user gave them a name or a hotkey.
const APT_DEFAULTS = new Set([
  '"Pack Size: +3"', 'Reflect', '"Cannot Leech Life"', '"Cannot Leech Mana"',
  'Currency', '"Divination Card"', 'Fossil', '"Map Tier"', '"Map Device" "Rarity: Normal"', 'Tane Laboratory'
])

// Returns how many strings moved. Mutates `widgets`.
export function moveStashSearchToLibrary (widgets: WidgetLike[]): number {
  const old = widgets.filter(w => w.wmType === 'stash-search') as unknown as StashSearchLike[]
  if (!old.length) return 0

  let library = widgets.find(w => w.wmType === REGEX_LIBRARY_TYPE) as unknown as { entries: RegexEntry[], wmFlags?: string[] } | undefined
  const moved: RegexEntry[] = []
  const have = new Set((library?.entries ?? []).map(e => e.text.trim()))
  let id = Math.max(0, ...(library?.entries ?? []).map(e => e.id)) + 1
  for (const w of old) {
    for (const e of w.entries ?? []) {
      const text = (e.text ?? '').trim()
      if (!text || have.has(text)) continue
      if (APT_DEFAULTS.has(text) && !e.name && !e.hotkey) continue
      have.add(text)
      moved.push({
        id: id++,
        name: e.name ?? '',
        text,
        category: (w.wmTitle ?? '').trim() || 'Stash search',
        tags: [],
        notes: '',
        hotkey: e.hotkey ?? null
      })
    }
  }

  if (moved.length) {
    if (!library) {
      const fresh = {
        wmId: Math.max(0, ...widgets.map(w => w.wmId)) + 1,
        wmType: REGEX_LIBRARY_TYPE,
        wmTitle: 'Regex library',
        wmWants: 'hide',
        wmZorder: null,
        wmFlags: ['invisible-on-blur'],
        anchor: popupAnchor(),
        enableHotkeys: true,
        entries: starterEntries()
      }
      widgets.push(fresh)
      library = fresh as unknown as { entries: RegexEntry[] }
      const startId = Math.max(0, ...library.entries.map(e => e.id)) + 1
      moved.forEach((e, i) => { e.id = startId + i })
    }
    library.entries = [...library.entries, ...moved]
  }

  for (let i = widgets.length - 1; i >= 0; i--) {
    if (widgets[i].wmType === 'stash-search') widgets.splice(i, 1)
  }
  return moved.length
}
