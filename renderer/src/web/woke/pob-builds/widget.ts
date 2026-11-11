import type { Widget, Anchor } from '@/web/overlay/widgets'
import { hostRequest } from '../shared/host'

export const POB_BUILDS_TYPE = 'woke-pob-builds'

export interface PobBuildsWidget extends Widget {
  anchor: Anchor
  // '' = PoB's default folder (Documents/Path of Building/Builds)
  buildsDir: string
  // Path to Path of Building.exe; '' = open the file with the system default app
  pobExe: string
  pinned: string[]
  // The build other modules (e.g. the campaign tracker) should use.
  activeBuild: string | null
  // Character name -> build file. When Client.txt shows that character
  // levelling, its build becomes the active one.
  followChars: Record<string, string>
  // Characters you stopped following: no linking them by name again.
  followOff: string[]
  // Build file -> the loadout picked by hand. No entry = follow your level.
  loadouts: Record<string, LoadoutPick>
}

// Set titles, not positions: PoB can reorder sets. Sets sharing a title form
// a loadout, so a pick also takes the same-named sets of the other kinds.
export interface LoadoutPick {
  skillSet?: string
  itemSet?: string
}

export function migratePobWidget (w: PobBuildsWidget) {
  if (!w.followChars || typeof w.followChars !== 'object') w.followChars = {}
  if (!Array.isArray(w.followOff)) w.followOff = []
  if (!Array.isArray(w.pinned)) w.pinned = []
  if (w.activeBuild === undefined) w.activeBuild = null
  if (!w.loadouts || typeof w.loadouts !== 'object') w.loadouts = {}
}

// Shapes returned by main/src/woke/pob-builds.ts
export type PobStats = Partial<Record<
  'FullDPS' | 'CombinedDPS' | 'TotalDPS' | 'TotalDotDPS' | 'MinionTotalDPS' | 'Life' | 'EnergyShield' | 'Mana' | 'TotalEHP' |
  'FireResist' | 'ColdResist' | 'LightningResist' | 'ChaosResist' |
  'FireResistOverCap' | 'ColdResistOverCap' | 'LightningResistOverCap' | 'ChaosResistOverCap', number>>

export interface PobBuildEntry {
  relPath: string
  name: string
  folder: string
  mtime: number
  className: string
  ascendClassName: string
  level: number | null
  mainSkill: string
  // Older app versions don't send it.
  stats?: PobStats
}

export interface PobGem {
  name: string
  level: number | null
  quality: number | null
  enabled: boolean
  // Older app versions didn't send it; fall back to the name.
  support?: boolean
}

export interface PobSkillGroup {
  label: string
  slot: string
  enabled: boolean
  isMain: boolean
  // What grants it (an item, the tree) when no gem does. Older app versions don't send it.
  source?: string
  gems: PobGem[]
}

export interface PobTreeSpec {
  title: string
  url: string
  isActive: boolean
  // Holds nothing: a heading such as "~~~ ENDGAME ~~~" between real sets.
  divider?: boolean
  // Older app versions don't send these.
  nodes?: number[]
  jewels?: PobItem[]
  // Mastery node id -> the effect picked on it.
  masteries?: Record<number, number>
}

export interface PobSkillSet {
  title: string
  isActive: boolean
  groups: PobSkillGroup[]
  divider?: boolean
}

export type PobRarity = 'NORMAL' | 'MAGIC' | 'RARE' | 'UNIQUE' | 'RELIC' | ''

export interface PobItem {
  rarity: PobRarity
  name: string
  base: string
  sockets: string
  implicits: string[]
  mods: string[]
  // Older app versions don't send the rest.
  modKinds?: Array<'' | 'crafted' | 'fractured'>
  implicitKinds?: Array<'' | 'crafted' | 'fractured'>
  quality?: number
  armour?: number
  evasion?: number
  energyShield?: number
  ward?: number
  itemLevel?: number
  levelReq?: number
  corrupted?: boolean
  mirrored?: boolean
  influences?: string[]
}

export interface PobItemSet {
  title: string
  isActive: boolean
  slots: Array<{ slot: string, item: PobItem }>
  divider?: boolean
}

export interface PobDetails {
  className: string
  ascendClassName: string
  level: number | null
  mainSkill: string
  stats?: PobStats
  statsSet?: string
  pantheonMajor?: string
  pantheonMinor?: string
  notes: string
  notesRaw?: string
  skills: PobSkillGroup[]
  skillSets?: PobSkillSet[]
  trees: PobTreeSpec[]
  itemSets?: PobItemSet[]
}

function dirArg (cfg: PobBuildsWidget) {
  return cfg.buildsDir || undefined
}

export const pobApi = {
  list: (cfg: PobBuildsWidget) =>
    hostRequest<{ dir: string, builds: PobBuildEntry[] }>('pob-list', { dir: dirArg(cfg) }),
  read: (cfg: PobBuildsWidget, relPath: string) =>
    hostRequest<PobDetails>('pob-read', { dir: dirArg(cfg), relPath }),
  open: (cfg: PobBuildsWidget, relPath: string) =>
    hostRequest<void>('pob-open', { dir: dirArg(cfg), relPath, pobExe: cfg.pobExe || undefined }),
  show: (cfg: PobBuildsWidget, relPath: string) =>
    hostRequest<void>('pob-show', { dir: dirArg(cfg), relPath }),
  import: async (cfg: PobBuildsWidget, input: string) =>
    hostRequest<{ relPath: string }>('pob-import', { dir: dirArg(cfg), input }),
  rename: (cfg: PobBuildsWidget, relPath: string, name: string) =>
    hostRequest<{ relPath: string }>('pob-rename', { dir: dirArg(cfg), relPath, name }),
  move: (cfg: PobBuildsWidget, relPath: string, folder: string) =>
    hostRequest<{ relPath: string }>('pob-move', { dir: dirArg(cfg), relPath, folder }),
  duplicate: (cfg: PobBuildsWidget, relPath: string) =>
    hostRequest<{ relPath: string }>('pob-duplicate', { dir: dirArg(cfg), relPath }),
  delete: (cfg: PobBuildsWidget, relPath: string) =>
    hostRequest<{ xml: string }>('pob-delete', { dir: dirArg(cfg), relPath }),
  restore: (cfg: PobBuildsWidget, relPath: string, xml: string) =>
    hostRequest<void>('pob-restore', { dir: dirArg(cfg), relPath, xml })
}

// After a build file moves: every setting that names it follows it. `to` null
// forgets it (deleted). Returns what to put back for Undo.
export function moveBuildRefs (w: PobBuildsWidget, from: string, to: string | null): () => void {
  // Undo puts back only this build's references, so other changes made since stay.
  const at = to ?? from
  const pinAt = w.pinned.indexOf(from)
  const wasActive = w.activeBuild === from
  const chars = Object.entries(w.followChars).filter(([, rel]) => rel === from).map(([c]) => c)
  const before = w.loadouts[from]
  const undo = () => {
    w.pinned = w.pinned.filter(p => p !== at)
    if (pinAt >= 0) w.pinned = [...w.pinned.slice(0, pinAt), from, ...w.pinned.slice(pinAt)]
    if (wasActive && (w.activeBuild === at || w.activeBuild == null)) w.activeBuild = from
    w.followChars = { ...Object.fromEntries(Object.entries(w.followChars).filter(([c, rel]) => !(chars.includes(c) && rel === at))), ...Object.fromEntries(chars.map(c => [c, from])) }
    const rest = Object.fromEntries(Object.entries(w.loadouts).filter(([rel]) => rel !== at))
    w.loadouts = before ? { ...rest, [from]: before } : rest
  }
  w.pinned = to ? w.pinned.map(p => p === from ? to : p) : w.pinned.filter(p => p !== from)
  if (w.activeBuild === from) w.activeBuild = to
  w.followChars = Object.fromEntries(Object.entries(w.followChars)
    .flatMap(([c, rel]) => rel !== from ? [[c, rel]] : to ? [[c, to]] : []))
  const pick = w.loadouts[from]
  const loadouts = Object.fromEntries(Object.entries(w.loadouts).filter(([rel]) => rel !== from))
  w.loadouts = pick && to ? { ...loadouts, [to]: pick } : loadouts
  return undo
}

export function buildMatches (b: PobBuildEntry, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [b.name, b.folder, b.className, b.ascendClassName, b.mainSkill]
    .some(f => f.toLowerCase().includes(q))
}

// Pinned first (in pin order), then most recently saved.
export function sortBuilds (builds: PobBuildEntry[], pinned: string[]): PobBuildEntry[] {
  return [...builds].sort((a, b) => {
    const pa = pinned.indexOf(a.relPath)
    const pb = pinned.indexOf(b.relPath)
    if (pa !== -1 || pb !== -1) {
      if (pa === -1) return 1
      if (pb === -1) return -1
      return pa - pb
    }
    return b.mtime - a.mtime
  })
}

export interface BuildGroup {
  // The folder under the builds folder; '' for builds directly in it.
  folder: string
  label: string
  builds: PobBuildEntry[]
}

// Pinned builds first, then a group per folder with the latest saved on top.
export function groupBuilds (builds: PobBuildEntry[], pinned: string[]): BuildGroup[] {
  const sorted = sortBuilds(builds, pinned)
  const pins = sorted.filter(b => pinned.includes(b.relPath))
  const byFolder = new Map<string, PobBuildEntry[]>()
  for (const b of sorted) {
    if (pinned.includes(b.relPath)) continue
    // The top folder: subfolders of a league stay with that league.
    const top = b.folder.split('/')[0]
    byFolder.set(top, [...(byFolder.get(top) ?? []), b])
  }
  const groups = [...byFolder.entries()].map(([folder, list]) => ({ folder, label: folder || 'Other', builds: list }))
  // Sorted by latest save, so each group's first build is its latest.
  groups.sort((a, b) => b.builds[0].mtime - a.builds[0].mtime)
  return pins.length ? [{ folder: PINNED_GROUP, label: 'Pinned', builds: pins }, ...groups] : groups
}

export const PINNED_GROUP = '\0pinned'

export function describe (b: { className: string, ascendClassName: string, level: number | null, mainSkill: string }): string {
  return [
    b.mainSkill,
    b.ascendClassName || b.className,
    b.level != null ? `lvl ${b.level}` : ''
  ].filter(Boolean).join(' · ')
}
