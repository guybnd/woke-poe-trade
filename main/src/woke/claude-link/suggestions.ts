// Suggestions Claude sent, kept until Guy applies or dismisses them.
// Pure parts (makeSuggestion, trimList) have no Electron, for tests.
import type { ClaudeSuggestion, SettingValue, SuggestionKind } from '../../../../ipc/claude-link'

// Old answered rows go first once the list is longer than this.
export const MAX_SUGGESTIONS = 100
// More open rows than this and Claude is told to wait.
export const MAX_OPEN = 20

const FILTER_KINDS = new Set(['move', 'style', 'visibility', 'group', 'stack', 'item'])

function text (v: unknown, field: string, max: number, required = true): string {
  if (v == null || v === '') {
    if (required) throw new Error(`${field} is required`)
    return ''
  }
  if (typeof v !== 'string') throw new Error(`${field} must be text`)
  return v.trim().slice(0, max)
}

function plainObject (v: unknown, field: string): Record<string, unknown> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new Error(`${field} must be an object`)
  // Through JSON: no functions, getters or prototypes survive.
  const json = JSON.stringify(v)
  if (json.length > 20000) throw new Error(`${field} is too big`)
  return JSON.parse(json) as Record<string, unknown>
}

export function makeSuggestion (
  kind: SuggestionKind,
  args: Record<string, unknown>,
  id: string,
  now: number,
  checkSetting: (key: string, value: unknown) => string | null
): ClaudeSuggestion {
  const base: ClaudeSuggestion = {
    id,
    kind,
    title: text(args.title, 'title', 120),
    why: text(args.why, 'why', 400, false),
    createdAt: now,
    status: 'new',
    resolvedAt: null
  }
  switch (kind) {
    case 'trade-search': {
      const query = plainObject(args.query, 'query')
      if (typeof query.query !== 'object' || query.query === null) throw new Error('query needs the trade site\'s "query" object, as in { "query": { ... }, "sort": { "price": "asc" } }')
      return { ...base, query, league: text(args.league, 'league', 80, false) || undefined }
    }
    case 'filter-change': {
      const edit = plainObject(args.edit, 'edit')
      if (typeof edit.kind !== 'string' || !FILTER_KINDS.has(edit.kind)) throw new Error(`edit.kind must be one of ${[...FILTER_KINDS].join(', ')}`)
      if (typeof edit.type !== 'string' || !edit.type) throw new Error('edit.type is the NeverSink $type tag, e.g. "currency"')
      delete edit.id
      return { ...base, edit }
    }
    case 'setting': {
      const key = text(args.key, 'key', 120)
      const value = args.value
      const problem = checkSetting(key, value)
      if (problem) throw new Error(problem)
      return { ...base, setting: { key, value: value as SettingValue } }
    }
  }
}

// Newest last; drops the oldest answered rows past the limit, never open ones.
export function trimList (list: ClaudeSuggestion[]): ClaudeSuggestion[] {
  let extra = list.length - MAX_SUGGESTIONS
  if (extra <= 0) return list
  return list.filter(s => {
    if (extra > 0 && s.status !== 'new') { extra--; return false }
    return true
  })
}

// What Claude gets back about its suggestions: no payloads, just the outcome.
export function outcome (s: ClaudeSuggestion) {
  return { id: s.id, kind: s.kind, title: s.title, status: s.status, createdAt: new Date(s.createdAt).toISOString(), resolvedAt: s.resolvedAt ? new Date(s.resolvedAt).toISOString() : null }
}
