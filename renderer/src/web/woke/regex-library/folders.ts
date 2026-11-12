// Regexes other tools keep in the Regex library, in a folder of their own:
// "Atlas strategies/Juicing/Breach threads", "PoB builds/3.30/RF Jugg". The
// entries live in the library, so an edit in either place is the same edit.
import { AppConfig, pushHostConfig, saveConfig } from '@/web/Config'
import { isModuleOn } from '../modules'
import { REGEX_LIBRARY_TYPE, emptyEntry } from './widget'
import type { RegexEntry, RegexLibraryWidget } from './widget'
import { saveToRegexLibrary } from './save'
import type { SaveResult } from './save'
import { joinFolder } from './folder-names'
export { ATLAS_FOLDER, POB_FOLDER, joinFolder, strategyRegexFolder, buildRegexFolder } from './folder-names'

function libraries (): RegexLibraryWidget[] {
  return AppConfig().widgets.filter(w => w.wmType === REGEX_LIBRARY_TYPE) as RegexLibraryWidget[]
}

export function libraryOn (): boolean {
  return isModuleOn(AppConfig(), 'regex-library')
}

function norm (category: string): string {
  return joinFolder(category)
}

// The entries filed right in this folder, from every library window.
export function regexesIn (folder: string): RegexEntry[] {
  const want = norm(folder)
  return libraries().flatMap(l => (l.entries ?? []).filter(e => norm(e.category) === want))
}

// Files a regex in this folder. The same text elsewhere in the library doesn't
// count: only a copy already in this folder makes it 'exists'.
export function addRegex (folder: string, name: string, text: string): SaveResult {
  const category = norm(folder)
  const clean = text.trim()
  const lib = libraries()[0]
  // No library window yet: the plain save makes one.
  if (!lib || !libraryOn()) return saveToRegexLibrary({ name, text: clean, category })
  if (regexesIn(category).some(e => e.text.trim() === clean)) return 'exists'
  if (!Array.isArray(lib.entries)) lib.entries = []
  lib.entries = [...lib.entries, { ...emptyEntry(lib.entries), name, text: clean, category }]
  saveConfig()
  pushHostConfig()
  return 'saved'
}

// One folder's entries to another, exactly that folder (not what's under it:
// a strategy's folder can share its path with a folder of strategies).
export function moveRegexCategory (from: string, to: string): number {
  const a = norm(from)
  const b = norm(to)
  if (!a || a === b) return 0
  let moved = 0
  for (const l of libraries()) {
    if (!(l.entries ?? []).some(e => norm(e.category) === a)) continue
    l.entries = l.entries.map(e => {
      if (norm(e.category) !== a) return e
      moved++
      return { ...e, category: b }
    })
  }
  if (moved) {
    saveConfig()
    pushHostConfig()
  }
  return moved
}

// Rewrites one entry in place, in whichever library holds it.
export function updateRegex (id: number, change: Partial<Pick<RegexEntry, 'name' | 'text'>>, folder: string) {
  for (const l of libraries()) {
    const at = (l.entries ?? []).findIndex(e => e.id === id && norm(e.category) === norm(folder))
    if (at < 0) continue
    l.entries = l.entries.map((e, i) => i === at ? { ...e, ...change } : e)
    saveConfig()
    pushHostConfig()
    return
  }
}

// Takes one entry out; returns what puts it back.
export function removeRegex (id: number, folder: string): () => void {
  for (const l of libraries()) {
    const at = (l.entries ?? []).findIndex(e => e.id === id && norm(e.category) === norm(folder))
    if (at < 0) continue
    const gone = l.entries[at]
    l.entries = l.entries.filter((_, i) => i !== at)
    saveConfig()
    pushHostConfig()
    return () => {
      l.entries = [...l.entries.slice(0, at), { ...gone, id: l.entries.some(e => e.id === gone.id) ? emptyEntry(l.entries).id : gone.id }, ...l.entries.slice(at)]
      saveConfig()
      pushHostConfig()
    }
  }
  return () => {}
}

// A strategy or folder renamed or moved: its regexes, and those of everything
// under it, follow. Returns how many moved.
export function moveRegexFolder (from: string, to: string): number {
  const a = norm(from)
  const b = norm(to)
  if (!a || a === b) return 0
  let moved = 0
  for (const l of libraries()) {
    if (!(l.entries ?? []).some(e => { const c = norm(e.category); return c === a || c.startsWith(a + '/') })) continue
    l.entries = l.entries.map(e => {
      const c = norm(e.category)
      if (c === a) { moved++; return { ...e, category: b } }
      if (c.startsWith(a + '/')) { moved++; return { ...e, category: joinFolder(b, c.slice(a.length + 1)) } }
      return e
    })
  }
  if (moved) {
    saveConfig()
    pushHostConfig()
  }
  return moved
}
