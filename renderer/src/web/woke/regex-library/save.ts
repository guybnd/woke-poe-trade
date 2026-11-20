// "Save to library" for search strings other modules build (map regex, gear
// colours, atlas strategies): every string you keep lives in the Regex library.
import { AppConfig, saveConfig, pushHostConfig } from '@/web/Config'
import { isModuleOn } from '../modules'
import { REGEX_LIBRARY_TYPE, starterEntries, GAME_PATCH } from './widget'
import type { RegexEntry, RegexLibraryWidget } from './widget'
import { popupAnchor } from '../ui/window-anchor'

export type SaveResult = 'saved' | 'exists' | 'module-off'

// `libraryId`: the library window to save into (the first one when it's gone or not given).
export function saveToRegexLibrary (entry: { name: string, text: string, category: string }, libraryId?: number): SaveResult {
  const config = AppConfig()
  if (!isModuleOn(config, 'regex-library')) return 'module-off'
  const text = entry.text.trim()
  let lib = (config.widgets.find(w => w.wmType === REGEX_LIBRARY_TYPE && w.wmId === libraryId) ??
    config.widgets.find(w => w.wmType === REGEX_LIBRARY_TYPE)) as RegexLibraryWidget | undefined
  if (!lib) {
    config.widgets.push({
      wmId: Math.max(0, ...config.widgets.map(w => w.wmId)) + 1,
      wmType: REGEX_LIBRARY_TYPE,
      wmTitle: 'Regex library',
      wmWants: 'hide',
      wmZorder: null,
      wmFlags: ['invisible-on-blur'],
      anchor: popupAnchor(),
      enableHotkeys: true,
      entries: starterEntries()
    } as RegexLibraryWidget)
    lib = config.widgets[config.widgets.length - 1] as RegexLibraryWidget
  }
  if (!Array.isArray(lib.entries)) lib.entries = []
  if (lib.entries.some(e => e.text.trim() === text)) return 'exists'
  const next: RegexEntry = {
    id: Math.max(0, ...lib.entries.map(e => e.id)) + 1,
    name: entry.name,
    text,
    category: entry.category,
    tags: [],
    notes: '',
    hotkey: null,
    patch: GAME_PATCH
  }
  lib.entries = [...lib.entries, next]
  saveConfig()
  pushHostConfig()
  return 'saved'
}

function libraryEntryFor (text: string): RegexEntry | undefined {
  const config = AppConfig()
  if (!isModuleOn(config, 'regex-library')) return undefined
  const clean = text.trim()
  for (const w of config.widgets) {
    if (w.wmType !== REGEX_LIBRARY_TYPE) continue
    const hit = (w as RegexLibraryWidget).entries?.find(e => e.text.trim() === clean)
    if (hit) return hit
  }
  return undefined
}

// The name a search string is already saved under, if it is.
export function savedRegexName (text: string): string | null {
  return libraryEntryFor(text)?.name ?? null
}

// Renames the saved entry holding this exact string.
export function renameSavedRegex (text: string, name: string): boolean {
  const hit = libraryEntryFor(text)
  if (!hit || !name.trim()) return false
  hit.name = name.trim()
  saveConfig()
  pushHostConfig()
  return true
}

// Puts a new search string into a saved entry, keeping its name, folder,
// notes and hotkey.
export function replaceSavedRegex (entry: RegexEntry, text: string): boolean {
  const clean = text.trim()
  if (!clean || !isModuleOn(AppConfig(), 'regex-library')) return false
  entry.text = clean
  entry.patch = GAME_PATCH
  saveConfig()
  pushHostConfig()
  return true
}

export const SAVE_MESSAGE: Record<SaveResult, string> = {
  'saved': 'Saved to the Regex library',
  'exists': 'Already in the Regex library',
  'module-off': 'Turn on the Regex library in Settings → Modules to save searches'
}
