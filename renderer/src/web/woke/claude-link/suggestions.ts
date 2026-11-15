// The Claude link on the overlay's side: the Suggestions card's list, what
// Apply does for each kind, and answers to the few questions main can't
// answer alone (atlas passives, whose data only the overlay keeps).
import { shallowRef } from 'vue'
import { MainProcess } from '@/web/background/IPC'
import { AppConfig, saveConfig } from '@/web/Config'
import { getTradeEndpoint } from '@/web/price-check/trade/common'
import { settingAllowed } from '@ipc/claude-link'
import type { ClaudeLinkState, ClaudeSuggestion } from '@ipc/claude-link'
import { hostRequest } from '../shared/host'

export const suggestions = shallowRef<ClaudeSuggestion[]>([])
export const linkState = shallowRef<ClaudeLinkState | null>(null)

let started = false

// Starts listening once (the overlay mounts the card once).
export function startClaudeLink (): () => void {
  if (started) return () => {}
  started = true
  const off = MainProcess.onEvent('MAIN->CLIENT::woke-event', ({ topic, data }) => {
    if (topic === 'claude-suggestions' && Array.isArray(data)) suggestions.value = data as ClaudeSuggestion[]
    else if (topic === 'claude-link') linkState.value = data as ClaudeLinkState
    else if (topic === 'claude-ask') answer(data as { id: string, kind: string, args: unknown }).catch(() => {})
  })
  refresh().catch(() => {})
  return () => { off.abort(); started = false }
}

export async function refresh (): Promise<void> {
  const [list, state] = await Promise.all([hostRequest('suggestions-list', null), hostRequest('claude-link-state', null)])
  suggestions.value = list
  linkState.value = state
}

export async function resolve (s: ClaudeSuggestion, status: 'applied' | 'dismissed'): Promise<void> {
  // Shown answered at once; main's list replaces it.
  suggestions.value = suggestions.value.map(x => x.id === s.id ? { ...x, status, resolvedAt: Date.now() } : x)
  await hostRequest('suggestion-resolve', { id: s.id, status })
}

// ---- Apply ----

export function tradeSearchUrl (s: ClaudeSuggestion, league: string, host: string): string {
  return `https://${host}/trade/search/${encodeURIComponent(league)}?q=${encodeURIComponent(JSON.stringify(s.query ?? {}))}`
}

// The loot filter editor registers this while it's mounted.
export type FilterApplier = (edit: Record<string, unknown>) => Promise<{ undo: () => void }>
let filterApplier: FilterApplier | null = null
export function setFilterApplier (fn: FilterApplier): () => void {
  filterApplier = fn
  return () => { if (filterApplier === fn) filterApplier = null }
}

// What Apply did, for the toast; undo when it can be taken back.
export interface Applied { message: string, undo?: () => void }

export async function apply (s: ClaudeSuggestion): Promise<Applied> {
  switch (s.kind) {
    case 'trade-search': {
      const league = s.league || AppConfig().leagueId
      if (!league) throw new Error('Pick a league in the settings first')
      window.open(tradeSearchUrl(s, league, getTradeEndpoint()))
      return { message: 'Opened on the trade site' }
    }
    case 'filter-change': {
      if (!s.edit) throw new Error('This suggestion has no filter change')
      if (!filterApplier) throw new Error('Turn on the Loot filter editor first')
      const { undo } = await filterApplier(s.edit)
      return { message: 'Added to your loot filter and saved', undo }
    }
    case 'setting': {
      if (!s.setting) throw new Error('This suggestion has no setting')
      const undo = applySetting(s.setting.key, s.setting.value)
      return { message: 'Setting changed', undo }
    }
  }
}

// Sets "<widget type>.<field>" or "app.<field>"; returns the undo.
export function applySetting (key: string, value: unknown): () => void {
  const [scope, field] = key.split('.')
  const cfg = AppConfig() as unknown as Record<string, unknown>
  const target = scope === 'app'
    ? cfg
    : (AppConfig().widgets as unknown as Array<Record<string, unknown>>).find(w => w.wmType === scope)
  if (!target || !field) throw new Error(`No such setting: ${key}`)
  const before = target[field]
  if (!settingAllowed(key, before, value)) throw new Error(`${key} can't be set to ${JSON.stringify(value)}`)
  target[field] = value
  saveConfig()
  return () => {
    target[field] = before
    saveConfig()
  }
}

// ---- questions from main ----

async function answer (ask: { id: string, kind: string, args: unknown }): Promise<void> {
  try {
    let data: unknown
    if (ask.kind === 'atlas-nodes') data = await atlasNodes(String((ask.args as { treeUrl?: unknown })?.treeUrl ?? ''))
    else throw new Error(`Unknown question: ${ask.kind}`)
    await hostRequest('claude-answer', { id: ask.id, ok: true, data: data as never })
  } catch (e) {
    await hostRequest('claude-answer', { id: ask.id, ok: false, error: e instanceof Error ? e.message : String(e) })
  }
}

// The strategy's atlas passives by name, grouped by mechanic, from the atlas
// data the Atlas strategies window last downloaded.
async function atlasNodes (treeUrl: string) {
  const { decodeTree, overview } = await import('../atlas/tree')
  const { cachedAtlasData } = await import('../atlas/widget')
  const data = cachedAtlasData()
  if (!data) throw new Error('No atlas tree data yet. Open Atlas strategies once so the app downloads it.')
  const tree = overview(decodeTree(treeUrl), data)
  return {
    points: tree.total,
    smallOrMastery: tree.small,
    unknown: tree.unknown || undefined,
    byMechanic: tree.groups.map(g => ({ mechanic: g.mechanic, nodes: g.nodes.map(n => n.kind === 'keystone' ? `${n.name} (keystone): ${n.stats.join(' / ')}` : n.name) }))
  }
}
