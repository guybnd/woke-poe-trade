// Saved strategies: their shape, folders, and the codes Import and Export use.
// No browser state here, so tests and other modules can read it.
import type { Widget, Anchor } from '@/web/overlay/widgets'
import { importList, matchesQuery, nextId, str, strList } from '../shared/library'

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

// ---- strategy codes: what Export copies and Import reads ----

const CODE_PREFIX = 'woke-atlas:'

export interface SharedRegex { name: string, text: string }
export interface SharedStrategy extends Omit<AtlasStrategy, 'id'> { regexes: SharedRegex[] }

function toBase64 (text: string): string {
  let bin = ''
  for (const b of new TextEncoder().encode(text)) bin += String.fromCharCode(b)
  return btoa(bin)
}

function fromBase64 (b64: string): string {
  const bin = atob(b64.replace(/\s+/g, ''))
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

// One strategy or a whole folder; folders inside it are kept relative to `base`.
export function strategyCode (list: Array<AtlasStrategy & { regexes?: SharedRegex[] }>, base = ''): string {
  const strip = (folder: string) => {
    const f = cleanFolder(folder)
    if (!base) return ''
    return f === base ? '' : f.startsWith(base + '/') ? f.slice(base.length + 1) : ''
  }
  const rows = list.map(s => ({ ...Object.fromEntries(Object.entries(s).filter(([k]) => k !== 'id')), folder: strip(s.folder) }))
  return CODE_PREFIX + toBase64(JSON.stringify({ v: 1, strategies: rows }))
}

export function isStrategyCode (text: string): boolean {
  return text.trim().startsWith(CODE_PREFIX)
}

export function readStrategyCode (text: string): SharedStrategy[] {
  let data: unknown
  try {
    data = JSON.parse(fromBase64(text.trim().slice(CODE_PREFIX.length)))
  } catch {
    throw new Error("That strategy code can't be read. Copy it again.")
  }
  const rows = (data && typeof data === 'object' && Array.isArray((data as { strategies?: unknown }).strategies))
    ? (data as { strategies: unknown[] }).strategies
    : []
  const out: SharedStrategy[] = []
  for (const r of rows) {
    if (!r || typeof r !== 'object') continue
    const o = r as Record<string, unknown>
    out.push({
      name: str(o.name) || 'Imported strategy',
      folder: cleanFolder(str(o.folder)),
      league: str(o.league),
      tags: strList(o.tags),
      treeUrl: str(o.treeUrl),
      threads: threadList(o.threads),
      scarabs: str(o.scarabs),
      device: str(o.device),
      regex: str(o.regex),
      notes: str(o.notes),
      regexes: Array.isArray(o.regexes)
        ? o.regexes.filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === 'object')
            .map(x => ({ name: str(x.name), text: str(x.text) })).filter(x => x.text)
        : []
    })
  }
  if (!out.length) throw new Error('That strategy code has no strategies in it.')
  return out
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
