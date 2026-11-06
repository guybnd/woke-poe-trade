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
  if (!Array.isArray(w.pinned)) w.pinned = []
  if (w.activeBuild === undefined) w.activeBuild = null
  if (!w.loadouts || typeof w.loadouts !== 'object') w.loadouts = {}
}

// Shapes returned by main/src/woke/pob-builds.ts
export interface PobBuildEntry {
  relPath: string
  name: string
  folder: string
  mtime: number
  className: string
  ascendClassName: string
  level: number | null
  mainSkill: string
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
    hostRequest<{ relPath: string }>('pob-import', { dir: dirArg(cfg), input })
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

export function describe (b: { className: string, ascendClassName: string, level: number | null, mainSkill: string }): string {
  return [
    b.mainSkill,
    b.ascendClassName || b.className,
    b.level != null ? `lvl ${b.level}` : ''
  ].filter(Boolean).join(' · ')
}
