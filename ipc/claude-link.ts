// The Claude link's shared shapes: what main stores for a suggestion and what
// the overlay shows. Main and the overlay both check settings with
// settingAllowed, so Claude can't reach a setting the overlay wouldn't apply.

export type SuggestionKind = 'trade-search' | 'filter-change' | 'setting'
export type SuggestionStatus = 'new' | 'applied' | 'dismissed'
export type SettingValue = string | number | boolean

export interface ClaudeSuggestion {
  id: string
  kind: SuggestionKind
  // One line, shown as the row's name.
  title: string
  // Why Claude suggests it, one or two lines.
  why: string
  createdAt: number
  status: SuggestionStatus
  resolvedAt: number | null
  // trade-search: the trade site's query ({ query, sort }) and its league.
  query?: Record<string, unknown>
  league?: string
  // filter-change: one loot filter edit, as the editor stores it (without id).
  edit?: Record<string, unknown>
  // setting: "<widget type>.<field>" or "app.<field>", and the new value.
  setting?: { key: string, value: SettingValue }
}

export interface ClaudeLinkState {
  on: boolean
  // Listening now (on, and the port opened).
  running: boolean
  url: string | null
  token: string
  error: string | null
  // The last calls, newest first.
  calls: Array<{ at: number, tool: string, ok: boolean }>
}

// Settings Claude may suggest: plain values only (on/off, numbers, words),
// never hotkeys, folders, files, accounts, links or chat commands.
const NEVER = /hotkey|key$|keys$|dir$|folder|path|file|exe|account|url|link|command|log|realm|language|token|secret|cookie|sessid/i

// Fields every widget has that are the window manager's, not settings.
export const WIDGET_OWN_FIELDS = new Set(['wmId', 'wmType', 'wmTitle', 'wmWants', 'wmZorder', 'wmFlags'])
// App fields that would break the overlay or its link to the game.
const OFF_LIMITS = new Set(['configVersion', 'windowTitle', 'uninitialized'])

export function settingAllowed (key: string, current: unknown, value: unknown): boolean {
  const m = /^([\w-]+)\.(\w+)$/.exec(key)
  if (!m) return false
  if (NEVER.test(m[2]) || WIDGET_OWN_FIELDS.has(m[2]) || OFF_LIMITS.has(m[2])) return false
  const t = typeof current
  if (t !== 'boolean' && t !== 'number' && t !== 'string') return false
  if (typeof value !== t) return false
  if (t === 'number' && !Number.isFinite(value as number)) return false
  if (t === 'string' && (value as string).length > 200) return false
  return true
}

// The scalar settings of a config: "app.<field>" for the top level and
// "<widget type>.<field>" for the first widget of each type.
export function listSettings (config: { widgets?: unknown, [k: string]: unknown }): Record<string, SettingValue> {
  const out: Record<string, SettingValue> = {}
  const add = (prefix: string, obj: Record<string, unknown>) => {
    for (const [field, v] of Object.entries(obj)) {
      const key = `${prefix}.${field}`
      if (settingAllowed(key, v, v)) out[key] = v as SettingValue
    }
  }
  add('app', config)
  const seen = new Set<string>()
  for (const w of Array.isArray(config.widgets) ? config.widgets : []) {
    if (typeof w !== 'object' || w === null) continue
    const type = (w as { wmType?: unknown }).wmType
    if (typeof type !== 'string' || seen.has(type)) continue
    seen.add(type)
    add(type, w as Record<string, unknown>)
  }
  return out
}
