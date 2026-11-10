// The poe.re window's config and page reading. No app imports here: Config.ts
// adds the window to old configs, and the tests load it on its own.
import type { Widget, Anchor } from '@/web/overlay/widgets'
import { popupAnchor } from '../ui/window-anchor'

export const POE_RE_TYPE = 'woke-poe-re'
export const POE_RE_URL = 'https://poe.re/'

export type PoeReWidget = Widget & {
  anchor: Anchor
  // The library window that last opened it: Save goes there.
  libraryId?: number
}

export function initPoeReWidget (wmId: number): PoeReWidget {
  return {
    wmId,
    wmType: POE_RE_TYPE,
    wmTitle: 'poe.re',
    wmWants: 'hide',
    wmZorder: null,
    // Not a tool of its own: the Regex library opens it, so no tab or launcher entry.
    wmFlags: ['invisible-on-blur', 'menu::skip'],
    anchor: popupAnchor()
  }
}

// Reads the string poe.re has built, and the page it's on. Runs inside the page.
export const READ_RESULT_JS = `(() => {
  const t = document.querySelector('.rrb-result-text')
  const h = document.querySelector('h1.page-header')
  return { found: !!t, text: t ? t.textContent : '', page: h ? h.textContent : '', path: location.pathname }
})()`

export interface PoeReResult {
  // poe.re's result box is on the page (empty when nothing is picked yet).
  found: boolean
  text: string
  page: string
  path: string
}

export function asResult (v: unknown): PoeReResult {
  const o = (v && typeof v === 'object') ? v as Record<string, unknown> : {}
  const s = (x: unknown) => typeof x === 'string' ? x : ''
  return { found: o.found === true, text: s(o.text).trim(), page: s(o.page).trim(), path: s(o.path) }
}

// poe.re's page (its first path segment) as a library category.
const CATEGORIES: Record<string, string> = {
  maps: 'Maps',
  vendor: 'Vendor',
  gems: 'Gems',
  items: 'Items',
  boat: 'Boat',
  expedition: 'Expedition',
  heist: 'Heist',
  beast: 'Bestiary',
  tattoo: 'Tattoo',
  runegraft: 'Runegraft',
  scarab: 'Scarab'
}

export function categoryFor (path: string): string {
  const seg = path.replace(/^\/+/, '').split(/[/?#]/)[0].toLowerCase()
  return CATEGORIES[seg] ?? 'poe.re'
}

// A name to start from: the page's heading without the "Regex" on the end.
export function suggestName (page: string, path: string): string {
  const name = page.replace(/\s*regex\s*$/i, '').trim()
  return name || categoryFor(path)
}

export function isDefaultAnchor (a: Anchor | undefined): boolean {
  const d = popupAnchor()
  return !a || (a.pos === d.pos && a.x === d.x && a.y === d.y)
}

// Next to a window: on its right if that half of the screen is free, else on its left.
export function anchorBeside (r: { left: number, top: number, right: number }, w: number, h: number): Anchor {
  const y = Math.max(0, r.top) / h * 100
  const gap = 8
  if ((r.left + r.right) / 2 <= w / 2) return { pos: 'tl', x: Math.min(r.right + gap, w) / w * 100, y }
  return { pos: 'tr', x: Math.max(r.left - gap, 0) / w * 100, y }
}

// Clipboard text that could be a search string: one line, no longer than the
// game takes. Anything else (item text, a page, a note) isn't offered.
export function clipboardSearch (text: string, max: number): string {
  const t = text.trim()
  return t && !/[\r\n]/.test(t) && t.length <= max ? t : ''
}
