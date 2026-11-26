// The in-overlay page for an item: which sites it has, their links, and what a
// hotkey does while the page is open.
import { shallowRef } from 'vue'
import type { ParsedItem } from '@/parser'

export type LookupTab = 'wiki' | 'poedb' | 'coe'

export const TAB_LABELS: Record<LookupTab, string> = {
  wiki: 'Wiki',
  poedb: 'poedb',
  coe: 'Craft of Exile'
}

// The panel's other two tabs: the saved list, and a saved page you opened from it.
export type PanelTab = LookupTab | 'bookmarks' | 'page'

export type LookupKeys = Record<LookupTab | 'bookmarks', string | null>

export interface Bookmark {
  id: number
  name: string
  url: string
}

export interface LookupRequest {
  // No item when the bookmarks hotkey opened it.
  item: ParsedItem | null
  tab: LookupTab | 'bookmarks'
  // Screen position of the hotkey press, which picks the panel's side.
  position?: { x: number, y: number }
}

// The hotkey event for opening the panel on its bookmarks, with no item.
export const BOOKMARKS_TARGET = 'item-lookup-bookmarks'

// Read by the item info widget, which shows the panel.
export const lookupRequest = shallowRef<LookupRequest | null>(null)

const POEDB_LANGS: Record<string, string> = {
  'en': 'us',
  'ru': 'ru',
  'cmn-Hant': 'tw',
  'ko': 'kr'
}

type UrlItem = Pick<ParsedItem, 'rawText'> & { info: Pick<ParsedItem['info'], 'refName'> }

export function lookupUrl (tab: LookupTab, item: UrlItem, language: string): string {
  const refName = item.info.refName
  switch (tab) {
    case 'wiki':
      // 3.30 maps copy as plain "Map", with no area: the wiki's list of maps.
      if (refName === 'Map') return 'https://www.poewiki.net/wiki/List_of_maps'
      return `https://www.poewiki.net/wiki/${encodeURIComponent(refName.replaceAll(' ', '_'))}`
    case 'poedb': {
      const slug = encodeURIComponent(refName.replaceAll("'", '').replaceAll(' ', '_'))
      return `https://poedb.tw/${POEDB_LANGS[language] ?? 'us'}/${slug}`
    }
    case 'coe':
      return `https://craftofexile.com/?game=poe1&eimport=${encodeURIComponent(item.rawText)}`
  }
}

type CraftFacts = { info: { craftable?: unknown }, isCorrupted: boolean, isMirrored?: boolean }

export function canCraft (item: CraftFacts): boolean {
  return Boolean(item.info.craftable) && !item.isCorrupted && !item.isMirrored
}

// Craft of Exile can't do anything with a corrupted or mirrored item, so it only
// gets a tab for those when you asked for it by its hotkey.
export function lookupTabs (item: CraftFacts | null, opened: LookupTab | 'bookmarks'): LookupTab[] {
  if (!item) return []
  return canCraft(item) || opened === 'coe' ? ['wiki', 'poedb', 'coe'] : ['wiki', 'poedb']
}

export type LookupKeyAction =
  { type: 'popout' } |
  { type: 'switch', tab: LookupTab | 'bookmarks' } |
  null

// The key of the tab you're on sends it to your browser; another tab's key goes
// to that tab, if the item has it.
export function lookupKeyAction (key: string, active: PanelTab, tabs: LookupTab[], keys: LookupKeys): LookupKeyAction {
  if (active === 'bookmarks' && keys.bookmarks === key) return null
  if (active !== 'page' && keys[active] === key) return { type: 'popout' }
  if (keys.bookmarks === key) return { type: 'switch', tab: 'bookmarks' }
  const tab = tabs.find(t => keys[t] === key)
  return tab ? { type: 'switch', tab } : null
}

export function isWebUrl (url: string | undefined): url is string {
  if (!url) return false
  try {
    const { protocol } = new URL(url)
    return protocol === 'https:' || protocol === 'http:'
  } catch {
    return false
  }
}

// Only web pages go out to the OS shell, whatever a page navigated to.
export function popOutUrl (current: string | undefined, fallback: string): string {
  return isWebUrl(current) ? current : fallback
}

// Saves the page, or removes it if it's already saved. A page that isn't a web
// page is never saved.
export function toggleBookmark (list: Bookmark[], url: string | undefined, title: string | undefined): Bookmark[] {
  if (!isWebUrl(url)) return list
  if (list.some(b => b.url === url)) return list.filter(b => b.url !== url)
  const name = title?.trim() || new URL(url).hostname
  return [...list, { id: Math.max(0, ...list.map(b => b.id)) + 1, name, url }]
}

export function matchBookmarks (list: Bookmark[], filter: string): Bookmark[] {
  const needle = filter.trim().toLowerCase()
  return list.filter(b => isWebUrl(b.url) && (!needle || b.name.toLowerCase().includes(needle) || b.url.toLowerCase().includes(needle)))
}

// The page gets the keyboard, so a key with no Ctrl or Alt would be taken from
// whatever you type into it. Such a key doesn't work inside the panel.
export function panelKey (key: string | null): string | null {
  if (!key) return null
  return /^F\d+$/.test(key) || /(^|\+ )(Ctrl|Alt) \+/.test(key) ? key : null
}

// A key press this soon after opening is a held key or a double tap, not a
// request to leave the overlay.
export const POP_OUT_GUARD_MS = 400
