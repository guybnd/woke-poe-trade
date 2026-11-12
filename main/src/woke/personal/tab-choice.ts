// Which stash tabs the reader reads, per league. A template follows the tab
// list as it changes (new tabs that fit it are read); ticks you make yourself,
// and sets you save, stay exactly those tabs. Remove-only tabs never count.
import path from 'path'
import { dataDir, readJson, writeAtomic, writeQueue } from '../data-files'
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

export function isSpecialTab (tab: StashTabInfo): boolean {
  return !PLAIN.has(tab.type) && tab.type !== 'Folder'
}

export function fitsTemplate (template: TabTemplate, tab: StashTabInfo): boolean {
  if (isRemoveOnly(tab)) return false
  if (template === 'league') return tab.type !== 'Folder'
  if (template === 'currency') return tab.type === 'CurrencyStash'
  return isSpecialTab(tab) || (PLAIN.has(tab.type) && PRICED.test(tab.name))
}

// The tabs to read, in tab order. No choice yet: none.
export function chosenTabs<T extends StashTabInfo> (choice: TabChoice | null, tabs: T[]): T[] {
  if (!choice) return []
  if (choice.template === 'custom') {
    const ids = new Set(choice.ids)
    return tabs.filter(t => ids.has(t.id) && !isRemoveOnly(t))
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
    const store = await readStore()
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
export async function saveSet (league: string, name: string, ids: string[]): Promise<LeagueTabs> {
  const n = name.trim().slice(0, 40)
  if (!n) return await readLeagueTabs(league)
  return await update(league, t => ({
    sets: [...t.sets.filter(s => s.name !== n), { name: n, ids: [...ids] }],
    choice: { template: 'custom', ids: [...ids], set: n }
  }))
}

export async function deleteSet (league: string, name: string): Promise<LeagueTabs> {
  return await update(league, t => ({
    sets: t.sets.filter(s => s.name !== name),
    choice: t.choice?.set === name ? { template: 'custom', ids: t.choice.ids } : t.choice
  }))
}
