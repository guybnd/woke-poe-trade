// Which result groups the search palette shows, and how much of each (Guy's
// picks): Open shows every row, Folded its top 3 and a "+N more" row, Off
// leaves it out. Every group starts Folded. Set in the palette's cog and in
// Settings > Search.
import { matchRank } from './search'

export type GroupMode = 'open' | 'folded' | 'off'

// Rows a folded group shows before its "+N more" row.
export const GROUP_CAP = 3

// Every group a search can show, in the order they come, with its default.
// Groups not listed (a new lookup) start folded too.
export interface GroupInfo { id: string, name: string, mode: GroupMode, note?: string }
export const SEARCH_GROUPS: readonly GroupInfo[] = [
  { id: 'Other items', name: 'Other items', mode: 'folded', note: 'items with no price' },
  { id: 'Tools', name: 'Tools', mode: 'folded' },
  { id: 'Bosses', name: 'Bosses', mode: 'folded' },
  { id: 'Where it drops', name: 'Where it drops', mode: 'folded' },
  { id: 'Countdowns', name: 'Countdowns', mode: 'folded' },
  { id: 'Div card sets', name: 'Div card sets', mode: 'folded' },
  { id: 'Div cards by map', name: 'Div cards by map', mode: 'folded' },
  { id: 'Vendor recipes', name: 'Vendor recipes', mode: 'folded' },
  { id: 'Flips', name: 'Flips', mode: 'folded' },
  { id: 'Atlas', name: 'Atlas', mode: 'folded' },
  { id: 'Where to get gems', name: 'Where to get gems', mode: 'folded' },
  { id: 'Vaal it?', name: 'Vaal it?', mode: 'folded' },
  { id: 'Passive tree', name: 'Passive tree', mode: 'folded' },
  { id: 'Ring anoints', name: 'Ring anoints', mode: 'folded' },
  { id: 'Megalomaniac', name: 'Megalomaniac', mode: 'folded' },
  { id: 'Forbidden pairs', name: 'Forbidden pairs', mode: 'folded' },
  { id: 'Pantheon', name: 'Pantheon', mode: 'folded' },
  { id: 'Zones', name: 'Zones', mode: 'folded' },
  { id: 'Your saved items', name: 'Your saved items', mode: 'folded' },
  { id: 'Your sales', name: 'Your sales', mode: 'folded' },
  { id: 'Crafting bench', name: 'Crafting bench', mode: 'folded' },
  { id: 'Harvest crafts', name: 'Harvest crafts', mode: 'folded' },
  { id: 'Blood Altar', name: 'Blood Altar', mode: 'folded' },
  { id: 'Betrayal', name: 'Betrayal', mode: 'folded' },
  { id: 'Viscera', name: 'Viscera', mode: 'folded', note: 'Wickerman' },
  { id: 'Do it now', name: 'Do it now', mode: 'folded' },
  { id: 'Settings', name: 'Settings', mode: 'folded' },
  { id: 'Search the web', name: 'Search the web', mode: 'folded', note: 'poewiki and poedb' }
]
const DEFAULTS = new Map(SEARCH_GROUPS.map(g => [g.id, g.mode]))

// Always shown in full: what you searched for, and the empty box's lists.
export function isLocked (label: string): boolean {
  return label === 'Answer' || label === 'Prices' || label === 'Recent' || label === 'Saved' || label === 'Things to try' || label.startsWith('Uniques on ')
}

export function groupMode (label: string, modes: Readonly<Record<string, GroupMode>> | undefined): GroupMode {
  if (isLocked(label)) return 'open'
  const m = modes?.[label]
  return m === 'open' || m === 'folded' || m === 'off' ? m : DEFAULTS.get(label) ?? 'folded'
}

// Sets one group, keeping only the changes from the defaults.
export function withMode (modes: Readonly<Record<string, GroupMode>> | undefined, label: string, mode: GroupMode): Record<string, GroupMode> {
  const out = { ...modes }
  if ((DEFAULTS.get(label) ?? 'folded') === mode) delete out[label] // eslint-disable-line @typescript-eslint/no-dynamic-delete
  else out[label] = mode
  return out
}

export interface Section<E> { label: string, entries: E[], capped?: boolean }
export interface Shaped<E> {
  label: string
  entries: E[]
  capped?: boolean
  // Rows left out, and the first of them.
  hidden: number
  firstHidden: E | null
}

// What each section shows. `expanded` groups show everything, even when off.
// A folded group's top rows put first the ones whose name starts with the
// query ("chaos" shows Chaos Golem's Core first under Viscera). Off groups
// come back in `off` with their row counts.
export function shapeSections<E extends { name: string }> (
  query: string,
  sections: ReadonlyArray<Section<E>>,
  modes: Readonly<Record<string, GroupMode>> | undefined,
  expanded: ReadonlySet<string>
): { sections: Array<Shaped<E>>, off: Array<{ label: string, count: number }> } {
  const out: Array<Shaped<E>> = []
  const off: Array<{ label: string, count: number }> = []
  for (const s of sections) {
    if (!s.entries.length) continue
    const set = groupMode(s.label, modes)
    if (set === 'open') { out.push({ ...s, hidden: 0, firstHidden: null }); continue }
    // Folded, or off: rows named like the query first. A folded group opened
    // with "+N more" keeps that order, so the three shown stay on top.
    const named = s.entries.filter(e => matchRank(e.name, query) === 0)
    const ordered = named.length ? [...named, ...s.entries.filter(e => !named.includes(e))] : s.entries
    const opened = expanded.has(s.label)
    if (set === 'off' && !opened) { off.push({ label: s.label, count: s.entries.length }); continue }
    if (opened || s.entries.length <= GROUP_CAP) { out.push({ ...s, entries: ordered, hidden: 0, firstHidden: null }); continue }
    const rest = ordered.slice(GROUP_CAP)
    out.push({ label: s.label, entries: ordered.slice(0, GROUP_CAP), capped: s.capped, hidden: rest.length, firstHidden: rest[0] ?? null })
  }
  return { sections: out, off }
}

// The chip row: one kind of result at a time, its groups in full.
export type ChipId = 'all' | 'prices' | 'items' | 'facts' | 'tools' | 'settings' | 'web'
export const CHIPS: ReadonlyArray<{ id: ChipId, label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'prices', label: 'Prices' },
  { id: 'items', label: 'Items' },
  { id: 'facts', label: 'Facts' },
  { id: 'tools', label: 'Tools' },
  { id: 'settings', label: 'Settings' },
  { id: 'web', label: 'Web' }
]
export function chipOf (label: string): ChipId {
  if (label === 'Answer' || label === 'Prices' || label.startsWith('Uniques on ')) return 'prices'
  if (label === 'Other items') return 'items'
  if (label === 'Tools' || label === 'Do it now') return 'tools'
  if (label === 'Settings') return 'settings'
  if (label === 'Search the web') return 'web'
  return 'facts'
}
