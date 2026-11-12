// Saved strategies: their shape, folders, and the codes Import and Export use.
// No browser state here, so tests and other modules can read it.
import type { Widget, Anchor } from '@/web/overlay/widgets'
import { importList, matchesQuery, nextId, str, strList } from '../shared/library'
import { strategyRegexFolder } from '../regex-library/folder-names'
import { decodeTree } from './tree'

export const ATLAS_TYPE = 'woke-atlas-strategies'

// 3.30: Threads go in the map device, up to three types, up to 8 of each.
export const THREAD_TYPES = ['Breach', 'Ritual', 'Ultimatum', 'Expedition', 'Incursion', 'Abyss', 'Bestiary', 'Blight', 'Betrayal', 'Legion']
export const MAX_THREAD_SLOTS = 3
export const MAX_THREADS = 8

export interface ThreadSlot {
  type: string
  count: number
}

export interface AtlasStrategy {
  id: number
  name: string
  // Nested like PoB's builds folder: "Juicing/Breach". '' = the top.
  folder: string
  league: string
  tags: string[]
  treeUrl: string
  threads: ThreadSlot[]
  // What else each map costs, one per line ("1x Vaal Orb"). Named for the
  // scarabs it held before 3.30.
  scarabs: string
  // Map device, map crafting, sextants, etc.
  device: string
  // Map mod regex, from before the Regex library kept a strategy's regexes.
  regex: string
  notes: string
  // Where its regexes sit in the Regex library, claimed once and kept unique,
  // so two strategies of one name never share a list.
  regexFolder?: string
}

export interface AtlasWidget extends Widget {
  anchor: Anchor
  dataUrl: string
  selectedId: number | null
  strategies: AtlasStrategy[]
  // Folders you made, kept while empty.
  folders?: string[]
  // Folders folded shut in the list.
  closedFolders?: string[]
  // The tree panel between the list and the loadout.
  treeHidden?: boolean
  // Mechanics lit on the tree, in the order picked (that order sets colours).
  lit?: string[]
  // The mechanic list on the tree folded away.
  mechanicsHidden?: boolean
  // The loadout's Tree totals folded to one line.
  totalsFolded?: boolean
  // Tree edits not saved yet: strategy id -> the edited tree link. Kept with
  // the config, so closing the overlay loses nothing.
  drafts?: Record<string, string>
}

export function emptyStrategy (list: AtlasStrategy[]): AtlasStrategy {
  return { id: nextId(list), name: '', folder: '', league: '', tags: [], treeUrl: '', threads: [], scarabs: '', device: '', regex: '', notes: '' }
}

export function cleanFolder (folder: string): string {
  return folder.split(/[/\\]+/).map(p => p.trim()).filter(Boolean).join('/')
}

export function threadList (value: unknown): ThreadSlot[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((t): t is Record<string, unknown> => Boolean(t) && typeof t === 'object')
    .map(t => ({ type: str(t.type), count: Math.max(1, Math.min(MAX_THREADS + 2, Math.round(Number(t.count) || 1))) }))
    .filter(t => t.type)
    .slice(0, MAX_THREAD_SLOTS)
}

// Strategies saved before folders and Threads.
export function migrateAtlasWidget (w: AtlasWidget) {
  if (!Array.isArray(w.strategies)) w.strategies = []
  for (const s of w.strategies) {
    if (typeof s.folder !== 'string') s.folder = ''
    if (!Array.isArray(s.threads)) s.threads = []
    if (!Array.isArray(s.tags)) s.tags = []
  }
  if (!Array.isArray(w.folders)) w.folders = []
  if (!Array.isArray(w.closedFolders)) w.closedFolders = []
  // A draft whose strategy is gone would land on the next one given its id.
  if (w.drafts) {
    const ids = new Set(w.strategies.map(s => String(s.id)))
    w.drafts = Object.fromEntries(Object.entries(w.drafts).filter(([id]) => ids.has(id)))
  }
}

export function strategyMatches (s: AtlasStrategy, query: string): boolean {
  return matchesQuery([s.name, s.folder ?? '', s.league, s.notes, s.scarabs, s.device, ...s.tags, ...(s.threads ?? []).map(t => t.type)], query)
}

export interface FolderNode {
  path: string
  name: string
  depth: number
  strategies: AtlasStrategy[]
  // Strategies in it and every folder below.
  total: number
  children: FolderNode[]
}

// The list as nested folders: folders first (by name), then strategies in list order.
export function folderTree (strategies: AtlasStrategy[], extra: string[] = []): FolderNode {
  const root: FolderNode = { path: '', name: '', depth: -1, strategies: [], total: 0, children: [] }
  const at = (path: string): FolderNode => {
    let node = root
    let sofar = ''
    for (const part of path.split('/').filter(Boolean)) {
      sofar = sofar ? `${sofar}/${part}` : part
      let child = node.children.find(c => c.path === sofar)
      if (!child) {
        child = { path: sofar, name: part, depth: node.depth + 1, strategies: [], total: 0, children: [] }
        node.children.push(child)
      }
      node = child
    }
    return node
  }
  for (const f of extra) at(cleanFolder(f))
  for (const s of strategies) at(cleanFolder(s.folder ?? '')).strategies.push(s)
  const finish = (n: FolderNode): number => {
    n.children.sort((a, b) => a.name.localeCompare(b.name))
    n.total = n.strategies.length + n.children.reduce((sum, c) => sum + finish(c), 0)
    return n.total
  }
  finish(root)
  return root
}

export function allFolders (strategies: AtlasStrategy[], extra: string[] = []): string[] {
  const out = new Set<string>()
  for (const f of [...extra, ...strategies.map(s => s.folder ?? '')]) {
    const parts = cleanFolder(f).split('/').filter(Boolean)
    for (let i = 1; i <= parts.length; i++) out.add(parts.slice(0, i).join('/'))
  }
  return [...out].sort((a, b) => a.localeCompare(b))
}

// A folder moved or renamed: `from` and everything under it now sit at `to`.
export function movedFolder (folder: string, from: string, to: string): string {
  const f = cleanFolder(folder)
  if (f === from) return to
  if (f.startsWith(from + '/')) return cleanFolder(`${to}/${f.slice(from.length + 1)}`)
  return f
}

// Strategy codes (Import and Export) are in strategy-code.ts, loaded when used.
export const CODE_PREFIX = 'woke-atlas:'

export function isStrategyCode (text: string): boolean {
  return text.trim().startsWith(CODE_PREFIX)
}

export function parseStrategiesImport (json: string, existing: AtlasStrategy[]): AtlasStrategy[] {
  let id = nextId(existing)
  return importList(json)
    .filter(r => typeof r.name === 'string' || typeof r.treeUrl === 'string')
    .map(r => ({
      id: id++,
      name: str(r.name) || 'Imported strategy',
      folder: cleanFolder(str(r.folder)),
      league: str(r.league),
      tags: strList(r.tags),
      treeUrl: str(r.treeUrl),
      threads: threadList(r.threads),
      scarabs: str(r.scarabs),
      device: str(r.device),
      regex: str(r.regex),
      notes: str(r.notes)
    }))
}

export function exportStrategies (list: AtlasStrategy[]): string {
  return JSON.stringify(list.map(({ name, folder, league, tags, treeUrl, threads, scarabs, device, regex, notes }) =>
    ({ name, folder, league, tags, treeUrl, threads, scarabs, device, regex, notes })), null, 2)
}

// ---- each strategy's own folder in the Regex library ----

export function regexFolderOf (s: Pick<AtlasStrategy, 'regexFolder' | 'folder' | 'name'>): string {
  return s.regexFolder || strategyRegexFolder(s)
}

// The folder this strategy's name and place call for, or "<name> (2)" and on
// when another strategy holds it or `taken` says it's in use.
export function freeRegexFolder (s: AtlasStrategy, strategies: AtlasStrategy[], taken: (folder: string) => boolean = () => false): string {
  const base = strategyRegexFolder(s)
  const owned = new Set(strategies.filter(o => o.id !== s.id && o.regexFolder).map(o => o.regexFolder!))
  for (let i = 1; ; i++) {
    const f = i === 1 ? base : `${base} (${i})`
    if (!owned.has(f) && !taken(f)) return f
  }
}

// Strategies saved before regex folders: each claims one, in list order, so
// the first of two same-named strategies keeps the regexes already there.
export function claimRegexFolders (strategies: AtlasStrategy[]) {
  for (const s of strategies) {
    if (!s.regexFolder) s.regexFolder = freeRegexFolder(s, strategies)
  }
}

// ---- unsaved tree edits ----

// The tree being worked on: the unsaved edit if there is one, else the saved tree.
export function workingTree (w: Pick<AtlasWidget, 'drafts'>, s: Pick<AtlasStrategy, 'id' | 'treeUrl'>): string {
  return w.drafts?.[s.id] ?? s.treeUrl
}

export function isDirty (w: Pick<AtlasWidget, 'drafts'>, s: Pick<AtlasStrategy, 'id' | 'treeUrl'>): boolean {
  const d = w.drafts?.[s.id]
  return d != null && d !== s.treeUrl
}

// Two links to the same tree: same passives and picked types, in any order.
export function sameTree (a: string, b: string): boolean {
  if (a === b) return true
  try {
    const x = decodeTree(a)
    const y = decodeTree(b)
    const key = (t: typeof x) => [[...t.nodes].sort((m, n) => m - n).join(','), t.masteries.map(m => `${m.node}:${m.effect}`).sort().join(',')].join('|')
    return key(x) === key(y)
  } catch {
    return false
  }
}

// An edit: kept as a draft, or dropped once it's back to the saved tree.
export function setDraft (w: AtlasWidget, s: AtlasStrategy, url: string) {
  const rest = Object.fromEntries(Object.entries(w.drafts ?? {}).filter(([id]) => id !== String(s.id)))
  w.drafts = sameTree(url, s.treeUrl) ? rest : { ...rest, [s.id]: url }
}

// Removing strategies takes their drafts with them (so a new strategy given
// the same id starts clean); Undo puts them back.
export function takeDrafts (w: AtlasWidget, ids: Iterable<number>): Record<string, string> {
  const want = new Set([...ids].map(String))
  const taken = Object.fromEntries(Object.entries(w.drafts ?? {}).filter(([id]) => want.has(id)))
  if (Object.keys(taken).length) w.drafts = Object.fromEntries(Object.entries(w.drafts ?? {}).filter(([id]) => !want.has(id)))
  return taken
}

export function restoreDrafts (w: AtlasWidget, taken: Record<string, string>) {
  if (!Object.keys(taken).length) return
  w.drafts = { ...taken, ...(w.drafts ?? {}) }
}

export function dropDraft (w: AtlasWidget, s: Pick<AtlasStrategy, 'id'>) {
  if (w.drafts?.[s.id] == null) return
  w.drafts = Object.fromEntries(Object.entries(w.drafts).filter(([id]) => id !== String(s.id)))
}

export function saveDraft (w: AtlasWidget, s: AtlasStrategy) {
  const d = w.drafts?.[s.id]
  if (d == null) return
  s.treeUrl = d
  dropDraft(w, s)
}
