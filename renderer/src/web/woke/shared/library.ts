// Helpers shared by the "saved list" modules (regex library, trade searches).

export interface Categorized {
  category: string
}

export function matchesQuery (fields: string[], query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return fields.some(field => field.toLowerCase().includes(q))
}

export function groupByCategory<T extends Categorized> (entries: T[]): Array<{ category: string, entries: T[] }> {
  const groups = new Map<string, T[]>()
  for (const entry of entries) {
    const key = entry.category.trim() || 'Uncategorized'
    const list = groups.get(key)
    if (list) list.push(entry)
    else groups.set(key, [entry])
  }
  return Array.from(groups, ([category, entries]) => ({ category, entries }))
}

export function nextId (entries: Array<{ id: number }>): number {
  return Math.max(0, ...entries.map(e => e.id)) + 1
}

export function parseTags (value: string): string[] {
  return value.split(',').map(t => t.trim()).filter(Boolean)
}

// Accepts either an array or `{ entries: [...] }`.
export function importList (json: string): Array<Record<string, unknown>> {
  const data: unknown = JSON.parse(json)
  const list = Array.isArray(data)
    ? data
    : (data && typeof data === 'object' && Array.isArray((data as { entries?: unknown }).entries))
        ? (data as { entries: unknown[] }).entries
        : null
  if (!list) throw new Error('Expected a JSON array of entries')
  return list.filter((r): r is Record<string, unknown> => Boolean(r) && typeof r === 'object')
}

export function str (value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export function strList (value: unknown): string[] {
  return Array.isArray(value) ? value.filter((t): t is string => typeof t === 'string') : []
}

// PoE's in-game search box accepts at most 250 characters (50 before 3.21).
export const MAX_SEARCH_LENGTH = 250

// The game patch now. Saved search strings are stamped with it, so one
// written for an older patch (when mods were worded differently) shows it.
// Raise it each league.
export const GAME_PATCH = '3.30'
