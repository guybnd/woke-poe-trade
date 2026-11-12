import type { Widget, Anchor } from '@/web/overlay/widgets'
import { groupByCategory, importList, matchesQuery, nextId, str, strList } from '../shared/library'

export { groupByCategory } from '../shared/library'

export const REGEX_LIBRARY_TYPE = 'woke-regex-library'

export { MAX_SEARCH_LENGTH, GAME_PATCH } from '../shared/library'

export interface RegexEntry {
  id: number
  name: string
  text: string
  category: string
  tags: string[]
  notes: string
  hotkey: string | null
  // Search for items WITHOUT this text (wraps it as "!…").
  negate?: boolean
  // The game patch the text was last saved in (GAME_PATCH); unset before stamps.
  patch?: string
}

export interface RegexLibraryWidget extends Widget {
  anchor: Anchor
  enableHotkeys: boolean
  entries: RegexEntry[]
}

export function emptyEntry (entries: RegexEntry[]): RegexEntry {
  return {
    id: nextId(entries),
    name: '',
    text: '',
    category: '',
    tags: [],
    notes: '',
    hotkey: null
  }
}

export function starterEntries (): RegexEntry[] {
  // Strings people actually use: map ones highlight maps you CAN run (the
  // "!" excludes), the rest sort a dump tab. Build longer map strings with
  // the Map regex builder.
  const base = [
    { name: 'No reflect', text: '"!eflec"', category: 'Maps', tags: ['safe'], notes: 'Highlights maps without physical or elemental reflect.' },
    { name: 'No reflect, no regen', text: '"!eflec|t regen"', category: 'Maps', tags: ['safe'], notes: 'Also skips "Players cannot Regenerate…".' },
    { name: 'Quantity 80%+', text: '"tity: \\+([89]\\d|\\d{3})%"', category: 'Maps', tags: ['juice'], notes: 'Item Quantity of 80% or more.' },
    { name: 'Pack size 30%+', text: '"ze: \\+([3-9]\\d|\\d{3})%"', category: 'Maps', tags: ['juice'], notes: 'Monster Pack Size of 30% or more.' },
    { name: 'Chaos recipe (ilvl 60-74)', text: '"m level: (6\\d|7[0-4])"', category: 'Dump sorting', tags: ['vendor'], notes: 'Item level 60 to 74, for the chaos recipe.' },
    { name: 'Unidentified', text: 'unidentified', category: 'Dump sorting', tags: ['vendor'], notes: '' },
    { name: '20% quality', text: '"quality: \\+20%"', category: 'Dump sorting', tags: ['vendor'], notes: 'Gems and flasks for the quality recipe.' }
  ]
  return base.map((e, i) => ({ id: i + 1, hotkey: null, ...e }))
}

// True when the text is one search term (one quoted term, or one word), so
// it can be negated by prefixing "!".
export function canNegate (text: string): boolean {
  const t = text.trim()
  if (!t) return false
  if (/^"[^"]*"$/.test(t)) return true
  return !/[\s"]/.test(t)
}

// Typos the game reads differently from what was meant (WOKEPOET-91).
export function regexLint (text: string): string[] {
  const out: string[] = []
  if ((text.match(/"/g) ?? []).length % 2) out.push('Unbalanced quote: the game reads everything after it as one term.')
  if ([...text.matchAll(/"([^"]*)"/g)].some(m => m[1] !== m[1].trim())) out.push('A quoted term starts or ends with a space, which the game searches for too.')
  if (/\S {2,}\S/.test(text)) out.push('Two spaces in a row: one is enough between terms.')
  return out
}

// What actually goes into the stash search box.
export function effectiveText (entry: { text: string, negate?: boolean }): string {
  const t = entry.text.trim()
  if (!entry.negate || !canNegate(t)) return entry.text
  const inner = t.startsWith('"') ? t.slice(1, -1) : t
  return inner.startsWith('!') ? `"${inner}"` : `"!${inner}"`
}

export function matchesFilter (entry: RegexEntry, filter: string): boolean {
  return matchesQuery([entry.name, entry.text, entry.category, entry.notes, ...entry.tags], filter)
}

// Accepts our JSON export, or plain text: one string per line, optionally
// "name = string" (or name<TAB>string). Lines starting with # are skipped.
export function parseImport (input: string, existing: RegexEntry[]): RegexEntry[] {
  const trimmed = input.trim()
  // A search string can start with a bracket too ("[89]\d%"): only an array of
  // objects, or an object, is an export.
  if (/^(\[\s*[{\]]|\{)/.test(trimmed)) return parseJsonImport(trimmed, existing)
  let id = nextId(existing)
  const out: RegexEntry[] = []
  for (const raw of trimmed.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#') || line.startsWith('//')) continue
    const m = /^(.+?)(?:\t+| = )(.+)$/.exec(line)
    const name = m ? m[1].trim() : ''
    const text = m ? m[2].trim() : line
    if (!text) continue
    out.push({ id: id++, name, text, category: 'Imported', tags: [], notes: '', hotkey: null })
  }
  if (!out.length) throw new Error('Nothing to import: paste one search string per line')
  return out
}

function parseJsonImport (json: string, existing: RegexEntry[]): RegexEntry[] {
  let id = nextId(existing)
  return importList(json)
    .filter(r => typeof r.text === 'string' && r.text)
    .map(r => ({
      id: id++,
      name: str(r.name),
      text: str(r.text),
      category: str(r.category),
      tags: strList(r.tags),
      notes: str(r.notes),
      hotkey: null,
      negate: r.negate === true,
      ...(typeof r.patch === 'string' && r.patch ? { patch: r.patch } : {})
    }))
}

export function exportEntries (entries: RegexEntry[]): string {
  return JSON.stringify(
    entries.map(({ name, text, category, tags, notes, negate, patch }) => ({ name, text, category, tags, notes, ...(negate ? { negate } : {}), ...(patch ? { patch } : {}) })),
    null, 2)
}

// ---- folders: a category with "/" in it nests, as "Atlas strategies/Juicing/Breach" ----

export interface CategoryFolder { path: string, name: string, count: number }
export interface CategoryGroup { category: string, label: string, entries: RegexEntry[] }

export function categoryLabel (category: string): string {
  return category.split('/').map(p => p.trim()).filter(Boolean).join(' › ')
}

// What the list shows inside folder `at` ('' = the top): the folders one level
// down, with how many entries each holds in all, and the entries right here.
// At the top, categories with no "/" are groups as before.
export function categoryView (entries: RegexEntry[], at: string): { folders: CategoryFolder[], groups: CategoryGroup[] } {
  const folders = new Map<string, CategoryFolder>()
  const here: RegexEntry[] = []
  const prefix = at ? at + '/' : ''
  for (const e of entries) {
    const cat = e.category.split('/').map(p => p.trim()).filter(Boolean).join('/')
    if (at && cat !== at && !cat.startsWith(prefix)) continue
    const rest = at ? (cat === at ? '' : cat.slice(prefix.length)) : cat
    if (rest.includes('/')) {
      const name = rest.split('/')[0]
      const path = prefix + name
      const f = folders.get(path) ?? { path, name, count: 0 }
      f.count++
      folders.set(path, f)
    } else {
      here.push(e)
    }
  }
  const groups: CategoryGroup[] = at
    ? (() => {
        // Inside a folder: its own entries first, then entries one level down
        // whose category is a leaf, under that leaf's name.
        const out = new Map<string, RegexEntry[]>()
        for (const e of here) {
          const cat = e.category.split('/').map(p => p.trim()).filter(Boolean).join('/')
          out.set(cat, [...(out.get(cat) ?? []), e])
        }
        return [...out].map(([category, list]) => ({ category, label: category === at ? '' : category.slice(prefix.length), entries: list }))
      })()
    : groupByCategory(here).map(g => ({ ...g, label: g.category }))
  return { folders: [...folders.values()].sort((a, b) => a.name.localeCompare(b.name)), groups }
}
