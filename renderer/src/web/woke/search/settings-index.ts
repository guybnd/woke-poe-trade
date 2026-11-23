// Settings in the search palette: "Open settings", every page, and each
// setting by its label (the same `find` labels Settings' own Ctrl + F box
// searches), so "text size" jumps straight to its row.
import { MIN_QUERY, matchRank } from './search'
import type { SettingsPage } from '../settings/pages'

export interface SettingsHit {
  id: string
  name: string
  sub: string
  // null opens Settings where it was left.
  page: SettingsPage | null
  // The label to scroll to and flash on the page.
  label: string | null
}

// Words that mean the settings window itself.
// Not "config": that finds production_Config.ini.
const WORDS = ['settings', 'setting', 'options', 'option', 'preferences', 'prefs']
// A word of the query names Settings: whole, or the start of one, 4 letters on ("sett").
function isSettingsWord (w: string): boolean {
  return w.length >= 4 && WORDS.some(s => s.startsWith(w))
}

const PAGE_LIMIT = 8
const LABEL_LIMIT = 8

function words (query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean)
}

// "settings" alone lists Open settings and every page; "text size settings"
// or "hotkeys setting" search what's left once the settings word is gone.
export function settingsHits (pages: readonly SettingsPage[], query: string): SettingsHit[] {
  const all = words(query)
  if (all.join(' ').length < MIN_QUERY) return []
  const rest = all.filter(w => !isSettingsWord(w))
  const open: SettingsHit = { id: 's:open', name: 'Open settings', sub: 'Settings', page: null, label: null }
  const pageHit = (page: SettingsPage): SettingsHit => ({ id: `s:${page.id}`, name: page.name, sub: 'Settings page', page, label: null })

  const q = rest.join(' ')
  // "settings" alone, or "settings h" on the way to "settings hotkeys".
  if (q.length < MIN_QUERY) return [open, ...pages.map(pageHit)]
  const mentionsSettings = rest.length < all.length
  const out: SettingsHit[] = []
  if (mentionsSettings || matchRank('Open settings', q) === 0) out.push(open)

  const rankPage = (p: SettingsPage) => Math.min(...[p.name, ...(p.aliases ?? [])].map(n => matchRank(n, q)).filter(r => r >= 0), Infinity)
  const pageHits = pages
    .map(page => ({ page, rank: rankPage(page) }))
    .filter(r => r.rank !== Infinity)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, PAGE_LIMIT)
  out.push(...pageHits.map(r => pageHit(r.page)))

  // A label once, on its first page; a page's own name (or old name) is its page hit.
  const seen = new Set<string>()
  const labels: Array<{ hit: SettingsHit, rank: number }> = []
  for (const page of pages) {
    for (const label of page.find) {
      const k = label.toLowerCase()
      if (seen.has(k) || k === page.name.toLowerCase() || page.aliases?.some(a => a.toLowerCase() === k)) continue
      const rank = matchRank(label, q)
      if (rank < 0) continue
      seen.add(k)
      labels.push({ rank, hit: { id: `s:${page.id}:${label}`, name: label, sub: `Setting · ${page.name}`, page, label } })
    }
  }
  labels.sort((a, b) => a.rank - b.rank)
  out.push(...labels.slice(0, LABEL_LIMIT).map(l => l.hit))
  return out
}
