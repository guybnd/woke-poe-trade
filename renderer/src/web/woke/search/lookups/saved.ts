// Your saved items: regexes, trade searches, PoB builds and atlas strategies,
// found by name, folder or tag. Each is one result; Enter opens it in its tool.
import { REGEX_LIBRARY_TYPE, effectiveText } from '../../regex-library/widget'
import { ATLAS_FOLDER, POB_FOLDER } from '../../regex-library/folder-names'
import type { RegexEntry } from '../../regex-library/widget'
import { TRADE_SEARCHES_TYPE, folderOf as tradeFolderOf } from '../../trade-searches/widget'
import type { TradeSearchEntry } from '../../trade-searches/widget'
import { POB_BUILDS_TYPE } from '../../pob-builds/widget'
import type { PobBuildEntry } from '../../pob-builds/widget'
import { ATLAS_TYPE } from '../../atlas/strategies'
import type { AtlasStrategy } from '../../atlas/strategies'
import { matchRank } from '../search'
import type { Lookup, LookupAction, LookupCard, LookupRow, LookupSection } from './types'

export type SavedKind = 'regex' | 'trade' | 'build' | 'atlas'

export interface SavedLists {
  regex?: readonly RegexEntry[]
  trade?: readonly TradeSearchEntry[]
  builds?: readonly PobBuildEntry[]
  atlas?: readonly AtlasStrategy[]
}

const TOOL: Record<SavedKind, { type: string, name: string, kind: string, icon: string }> = {
  regex: { type: REGEX_LIBRARY_TYPE, name: 'Regex library', kind: 'Regex', icon: 'fas fa-search' },
  trade: { type: TRADE_SEARCHES_TYPE, name: 'Trade searches', kind: 'Trade search', icon: 'fas fa-search-dollar' },
  build: { type: POB_BUILDS_TYPE, name: 'PoB builds', kind: 'PoB build', icon: 'fas fa-diagram-project' },
  atlas: { type: ATLAS_TYPE, name: 'Atlas strategies', kind: 'Atlas strategy', icon: 'fas fa-globe' }
}

interface Saved {
  kind: SavedKind
  // What the tool opens it by: an entry id, or a build's file.
  id: string
  name: string
  folder: string
  // The folder as searched, when it differs from the one shown.
  findBy?: string
  tags: string[]
  card: () => Omit<LookupCard, 'id' | 'group' | 'name' | 'sub' | 'icon'>
}

const open = (kind: SavedKind, id: string): LookupAction => ({ label: `Open in ${TOOL[kind].name}`, open: { tool: TOOL[kind].type, id } })
const folderRow = (kind: SavedKind, folder: string): LookupRow => ({ label: TOOL[kind].name, value: folder || 'Top level' })
// A strategy's or a build's regexes sit under "Atlas strategies/" or
// "PoB builds/": searching "atlas" shouldn't list all of them.
export function regexFindFolder (folder: string): string {
  for (const root of [ATLAS_FOLDER, POB_FOLDER]) {
    if (folder === root) return ''
    if (folder.startsWith(`${root}/`)) return folder.slice(root.length + 1)
  }
  return folder
}

const notes = (text: string | undefined): LookupSection[] => text?.trim() ? [{ text: [text.trim()] }] : []

export function savedItems (lists: SavedLists): Saved[] {
  const out: Saved[] = []
  for (const e of lists.regex ?? []) {
    const text = effectiveText(e)
    out.push({
      kind: 'regex',
      id: String(e.id),
      name: e.name || text,
      folder: e.category,
      findBy: regexFindFolder(e.category),
      tags: e.tags,
      card: () => ({
        sections: [{ rows: [folderRow('regex', e.category)] }, { text: [text] }, ...notes(e.notes)],
        actions: [open('regex', String(e.id)), { label: 'Copy', copy: text }]
      })
    })
  }
  for (const e of lists.trade ?? []) {
    out.push({
      kind: 'trade',
      id: String(e.id),
      name: e.name || e.url,
      folder: tradeFolderOf(e),
      tags: e.tags,
      card: () => ({
        sections: [{ rows: [folderRow('trade', tradeFolderOf(e)), ...(e.openCount ? [{ label: 'Opened', value: `${e.openCount} time${e.openCount === 1 ? '' : 's'}` }] : [])] }, ...notes(e.notes)],
        actions: [open('trade', String(e.id))]
      })
    })
  }
  for (const b of lists.builds ?? []) {
    const cls = b.ascendClassName && b.ascendClassName !== 'None' ? b.ascendClassName : b.className
    out.push({
      kind: 'build',
      id: b.relPath,
      name: b.name,
      folder: b.folder,
      tags: [b.mainSkill, cls].filter(Boolean),
      card: () => ({
        sections: [{
          rows: [
            folderRow('build', b.folder),
            ...(cls ? [{ label: 'Class', value: b.level != null ? `${cls}, level ${b.level}` : cls }] : []),
            ...(b.mainSkill ? [{ label: 'Main skill', value: b.mainSkill }] : [])
          ]
        }],
        actions: [open('build', b.relPath)]
      })
    })
  }
  for (const s of lists.atlas ?? []) {
    out.push({
      kind: 'atlas',
      id: String(s.id),
      name: s.name || 'Unnamed strategy',
      folder: s.folder,
      tags: s.tags,
      card: () => ({
        sections: [{
          rows: [
            folderRow('atlas', s.folder),
            ...(s.league ? [{ label: 'League', value: s.league }] : []),
            ...(s.tags.length ? [{ label: 'Tags', value: s.tags.join(', ') }] : [])
          ]
        }, ...notes(s.notes)],
        actions: [open('atlas', String(s.id))]
      })
    })
  }
  return out
}

export function savedCard (s: Saved): LookupCard {
  return {
    id: `saved:${s.kind}:${s.id}`,
    group: 'Your saved items',
    name: s.name,
    sub: s.folder ? `${TOOL[s.kind].kind} · ${s.folder}` : TOOL[s.kind].kind,
    icon: TOOL[s.kind].icon,
    ...s.card()
  }
}

const MAX = 8

// Names first, then folders and tags: "breach" finds "Breach juice" and
// everything in a Breach folder.
export function savedLookup (items: readonly Saved[]): Lookup {
  return (query) => {
    if (query.trim().length < 3 || !items.length) return []
    const name = (r: number) => r < 0 || r > 1 ? 9 : r
    const other = (r: number) => r < 0 || r > 1 ? 9 : r + 2
    return items
      .map(s => ({ s, rank: Math.min(name(matchRank(s.name, query)), ...[s.findBy ?? s.folder, ...s.tags].map(f => other(matchRank(f, query)))) }))
      .filter(h => h.rank < 9)
      .sort((a, b) => a.rank - b.rank || a.s.name.localeCompare(b.s.name))
      .slice(0, MAX)
      .map(h => savedCard(h.s))
  }
}
