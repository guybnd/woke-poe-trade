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
export { cleanEdit } from './clean-edit'

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
    else if (ask.kind === 'trade-search') data = await tradeSearch(ask.args as { query?: unknown, league?: unknown, count?: unknown })
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

// A trade search for Claude (Guy picked T2): through the price check's own
// rate limiter and cache, and refused rather than queued when the limit is
// close, so it never slows his own checks. Prices only: no names, no whispers.
// One every 10 seconds at most, on top of the limiter, so a chatty Claude
// leaves room for the player's own checks.
export const CLAUDE_SEARCH_GAP_MS = 10_000
let lastSearchAt = 0

async function tradeSearch (args: { query?: unknown, league?: unknown, count?: unknown }) {
  const wait = lastSearchAt + CLAUDE_SEARCH_GAP_MS - Date.now()
  if (wait > 0) throw new Error(`Wait ${Math.ceil(wait / 1000)} s: AI apps get one trade search every 10 s`)
  const body = args?.query as { query?: Record<string, unknown>, sort?: unknown } | undefined
  if (!body || typeof body.query !== 'object' || body.query === null) throw new Error('query needs the trade site query object')
  const league = (typeof args.league === 'string' && args.league) || AppConfig().leagueId
  if (!league) throw new Error('No league is picked in the app settings')
  const count = Math.min(10, Math.max(1, Math.floor(Number(args.count) || 10)))
  const request = {
    query: { status: { option: 'securable' }, stats: [], ...body.query },
    sort: body.sort ?? { price: 'asc' }
  }
  const { requestTradeResultList, requestResults } = await import('@/web/price-check/trade/pathofexile-trade')
  lastSearchAt = Date.now()
  const found = await requestTradeResultList(request as never, league)
  const listings = found.result.length
    ? await requestResults(found.id, found.result.slice(0, count), { accountName: AppConfig().accountName })
    : []
  return {
    league,
    total: found.total,
    url: `https://${getTradeEndpoint()}/trade/search/${encodeURIComponent(league)}/${found.id}`,
    listings: listings.map(l => ({
      price: l.priceAmount,
      currency: l.priceCurrency,
      stack: l.stackSize,
      itemLevel: l.itemLevel,
      quality: l.quality,
      gemLevel: l.level,
      corrupted: l.corrupted || undefined,
      listed: l.relativeDate,
      mine: l.isMine || undefined,
      mods: l.tipItem ? [...l.tipItem.implicits, ...l.tipItem.mods] : undefined
    }))
  }
}
