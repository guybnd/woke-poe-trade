// Which stash tabs the reader reads, per league. A template follows the tab
// list as it changes (new tabs that fit it are read); ticks you make yourself,
// and sets you save, stay exactly those tabs. Remove-only tabs never count.
import path from 'path'
import { dataDir, readJson, readJsonStrict, writeAtomic, writeQueue } from '../data-files'
import { isRemoveOnly } from './stash-parse'
import type { StashTabInfo } from './stash-parse'

export type TabTemplate = 'reasonable' | 'currency' | 'league'
export const TEMPLATES: TabTemplate[] = ['reasonable', 'currency', 'league']

export interface TabChoice {
  // A template, or 'custom': exactly `ids`.
  template: TabTemplate | 'custom'
  ids: string[]
  // The saved set it came from, if any.
  set?: string
}

export interface SavedSet { name: string, ids: string[] }

export interface LeagueTabs {
  choice: TabChoice | null
  sets: SavedSet[]
}

// Plain tabs a player fills by hand; every other type is a special tab.
const PLAIN = new Set(['NormalStash', 'PremiumStash', 'QuadStash'])
// Priced tabs: "$ ...", "~price 1 chaos", "~b/o 1 div".
const PRICED = /^\s*(\$|~price\b|~b\/o\b)/i

// The stash page lists these tabs but sends none of their items (map and
// unique tabs keep them in sub-tabs it doesn't give): reading them costs a
// call for nothing.
export const UNREADABLE = new Set(['MapStash', 'UniqueStash'])

export function isSpecialTab (tab: StashTabInfo): boolean {
  return !PLAIN.has(tab.type) && tab.type !== 'Folder'
}

export function fitsTemplate (template: TabTemplate, tab: StashTabInfo): boolean {
  if (isRemoveOnly(tab) || UNREADABLE.has(tab.type)) return false
  if (template === 'league') return tab.type !== 'Folder'
  if (template === 'currency') return tab.type === 'CurrencyStash'
  return isSpecialTab(tab) || (PLAIN.has(tab.type) && PRICED.test(tab.name))
}

// The tabs to read, in tab order. No choice yet: none.
export function chosenTabs<T extends StashTabInfo> (choice: TabChoice | null, tabs: T[]): T[] {
  if (!choice) return []
  if (choice.template === 'custom') {
    const ids = new Set(choice.ids)
    return tabs.filter(t => ids.has(t.id) && !isRemoveOnly(t) && !UNREADABLE.has(t.type))
  }
  const template = choice.template
  return tabs.filter(t => fitsTemplate(template, t))
}

// ---------- saved per league ----------

type Store = Record<string, LeagueTabs>
const file = () => path.join(dataDir('woke-personal'), 'tabs.json')
const queued = writeQueue()

function clean (v: unknown): LeagueTabs {
  const o = (v && typeof v === 'object' ? v : {}) as Partial<LeagueTabs>
  const ids = (x: unknown) => Array.isArray(x) ? x.filter((i): i is string => typeof i === 'string') : []
  const c = o.choice as Partial<TabChoice> | null | undefined
  const choice: TabChoice | null = c && (TEMPLATES.includes(c.template as TabTemplate) || c.template === 'custom')
    ? { template: c.template as TabChoice['template'], ids: ids(c.ids), ...(typeof c.set === 'string' ? { set: c.set } : {}) }
    : null
  const sets = Array.isArray(o.sets)
    ? o.sets.filter((s): s is SavedSet => !!s && typeof s.name === 'string' && !!s.name.trim()).map(s => ({ name: s.name.trim(), ids: ids(s.ids) }))
    : []
  return { choice, sets }
}

async function readStore (): Promise<Store> {
  const s = await readJson<Store>(file())
  return s && typeof s === 'object' ? s : {}
}

export async function readLeagueTabs (league: string): Promise<LeagueTabs> {
  return clean((await readStore())[league])
}

async function update (league: string, fn: (t: LeagueTabs) => LeagueTabs): Promise<LeagueTabs> {
  let out!: LeagueTabs
  await queued(async () => {
    // Strict: a file that can't be read right now must not be rewritten
    // holding only this league.
    const read = await readJsonStrict<Store | null>(file(), null)
    const store: Store = read && typeof read === 'object' ? read : {}
    out = fn(clean(store[league]))
    store[league] = out
    await writeAtomic(file(), JSON.stringify(store))
  })
  return out
}

export async function setChoice (league: string, choice: TabChoice): Promise<LeagueTabs> {
  return await update(league, t => ({ ...t, choice: clean({ choice }).choice }))
}

// Saves `ids` under `name` (replacing one of that name) and reads it from now on.
// keepChoice: put a set back (Undo of a delete) at its old place, leaving the
// choice as it is.
export async function saveSet (league: string, name: string, ids: string[], keepChoice?: { at: number }): Promise<LeagueTabs> {
  const n = name.trim().slice(0, 40)
  if (!n) return await readLeagueTabs(league)
  return await update(league, t => {
    const others = t.sets.filter(s => s.name !== n)
    const set = { name: n, ids: [...ids] }
    if (!keepChoice) return { sets: [...others, set], choice: { template: 'custom', ids: [...ids], set: n } }
    const at = Math.max(0, Math.min(others.length, Math.floor(keepChoice.at)))
    return { sets: [...others.slice(0, at), set, ...others.slice(at)], choice: t.choice }
  })
}

export async function deleteSet (league: string, name: string): Promise<LeagueTabs> {
  return await update(league, t => ({
    sets: t.sets.filter(s => s.name !== name),
    choice: t.choice?.set === name ? { template: 'custom', ids: t.choice.ids } : t.choice
  }))
}
