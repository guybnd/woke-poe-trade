// The tab picker's state, apart from the window (TabPicker.vue). Main decides
// what each template picks (main/src/woke/personal/tab-choice.ts).

export type TabTemplate = 'reasonable' | 'currency' | 'league'

export interface PickerTab { id: string, index: number, name: string, type: string, colour: string | null }
export interface TabChoice { template: TabTemplate | 'custom', ids: string[], set?: string }
export interface SavedSet { name: string, ids: string[] }

// What main's stash-tab-list answers.
export interface TabList {
  league: string
  tabs: PickerTab[]
  fits: Record<TabTemplate, string[]>
  choice: TabChoice | null
  sets: SavedSet[]
}

export const TEMPLATE_LABEL: Record<TabTemplate, string> = {
  reasonable: 'Reasonable',
  currency: 'Currency only',
  league: 'This league, all'
}
export const TEMPLATE_HINT: Record<TabTemplate, string> = {
  reasonable: 'Special tabs, and tabs named $ or ~price / ~b/o. New tabs that fit join by themselves.',
  currency: 'The currency tab only.',
  league: 'Every tab. New tabs join by themselves.'
}

// What's picked: a template, a saved set, or your own ticks.
export type Picked = { kind: 'template', template: TabTemplate } | { kind: 'set', name: string } | { kind: 'custom' }

export function startingPick (list: TabList): { picked: Picked, ticked: Set<string> } {
  const known = new Set(list.tabs.map(t => t.id))
  const c = list.choice
  if (!c) return { picked: { kind: 'template', template: 'reasonable' }, ticked: new Set(list.fits.reasonable) }
  if (c.template !== 'custom') return { picked: { kind: 'template', template: c.template }, ticked: new Set(list.fits[c.template]) }
  const ticked = new Set(c.ids.filter(id => known.has(id)))
  return { picked: c.set && list.sets.some(s => s.name === c.set) ? { kind: 'set', name: c.set } : { kind: 'custom' }, ticked }
}

export function ticksFor (list: TabList, picked: Picked, current: Set<string>): Set<string> {
  if (picked.kind === 'template') return new Set(list.fits[picked.template])
  if (picked.kind === 'set') {
    const known = new Set(list.tabs.map(t => t.id))
    return new Set((list.sets.find(s => s.name === picked.name)?.ids ?? []).filter(id => known.has(id)))
  }
  return new Set(current)
}

// What to save: a template follows the tab list; ticks stay exactly those tabs.
export function choiceOf (picked: Picked, ticked: Set<string>, tabs: PickerTab[]): TabChoice {
  if (picked.kind === 'template') return { template: picked.template, ids: [] }
  const ids = tabs.filter(t => ticked.has(t.id) && !UNREADABLE.has(t.type)).map(t => t.id)
  return picked.kind === 'set' ? { template: 'custom', ids, set: picked.name } : { template: 'custom', ids }
}

const PLAIN = new Set(['NormalStash', 'PremiumStash', 'QuadStash'])
// Listed by the site, but it sends none of their items (tab-choice.ts in main).
export const UNREADABLE = new Set(['MapStash', 'UniqueStash'])

export type TabKind = 'all' | 'special' | 'plain' | 'ticked'
export const KIND_OPTIONS: Array<{ value: TabKind, label: string }> = [
  { value: 'all', label: 'All tabs' },
  { value: 'special', label: 'Special tabs' },
  { value: 'plain', label: 'Normal & quad' },
  { value: 'ticked', label: 'Ticked' }
]

export function shownTabs (tabs: PickerTab[], query: string, kind: TabKind, ticked: Set<string>): PickerTab[] {
  const q = query.trim().toLowerCase()
  return tabs.filter(t =>
    (!q || t.name.toLowerCase().includes(q)) &&
    (kind === 'all' ||
      (kind === 'special' && !PLAIN.has(t.type)) ||
      (kind === 'plain' && PLAIN.has(t.type)) ||
      (kind === 'ticked' && ticked.has(t.id))))
}

// "QuadStash" → "Quad", "DivinationCardStash" → "Divination Card".
export function typeLabel (type: string): string {
  return type.replace(/Stash$/, '').replace(/([a-z])([A-Z])/g, '$1 $2') || type
}
