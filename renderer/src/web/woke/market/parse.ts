import { SKIPPED_TYPES, typeForSlug } from './types'
import type { PriceItem } from './types'

// The shape APT keeps after splitting poe.ninja's dense overview:
// one chunk per category, each holding many `{"name":…,"variant":…,"chaos":…,"graph":[…]}` objects.
export interface DenseChunk {
  ns: string
  url: string
  lines: string
}

const ENTRY_START = '{"name":'

export function parseDenseChunks (chunks: DenseChunk[]): PriceItem[] {
  const out: PriceItem[] = []
  const graphs: unknown[] = []
  for (const chunk of chunks) {
    const type = typeForSlug(chunk.url)
    if (!type || SKIPPED_TYPES.has(type)) continue

    let pos = chunk.lines.indexOf(ENTRY_START)
    while (pos !== -1) {
      // Entries contain no nested objects (graph is a flat array), so the
      // first closing brace ends the entry. APT's own lookup relies on this too.
      const end = chunk.lines.indexOf('}', pos)
      if (end === -1) break
      try {
        const info = JSON.parse(chunk.lines.slice(pos, end + 1)) as {
          name?: unknown, variant?: unknown, chaos?: unknown, graph?: unknown
        }
        if (typeof info.name === 'string' && typeof info.chaos === 'number' && Number.isFinite(info.chaos)) {
          out.push({
            type,
            name: info.name,
            variant: typeof info.variant === 'string' ? info.variant : '',
            chaos: info.chaos,
            gaps: 0,
            ...trendPrices(info.chaos, info.graph)
          })
          graphs.push(info.graph)
        }
      } catch {}
      pos = chunk.lines.indexOf(ENTRY_START, end)
    }
  }
  // Gaps only count inside the days the league has prices for, or every
  // item reads as thin in a league's first week.
  const days = leagueDays(graphs)
  for (let i = 0; i < out.length; i++) out[i].gaps = graphGaps(graphs[i], days)
  return out
}

// poe.ninja's graph is 7 daily values: % change since a week ago, today last.
function trendPrices (chaos: number, graph: unknown): { d1?: number, d7?: number } {
  if (!Array.isArray(graph) || graph.length !== 7) return {}
  const today = 1 + graph[6] / 100
  const yesterday = 1 + graph[5] / 100
  if (typeof graph[6] !== 'number' || today <= 0) return {}
  return {
    d7: chaos / today,
    ...(typeof graph[5] === 'number' && yesterday > 0 ? { d1: chaos * yesterday / today } : {})
  }
}

const GRAPH_DAYS = 7

// Days poe.ninja has priced this item, from its first priced day to today.
export function graphHistory (graph: unknown): number {
  if (!Array.isArray(graph)) return 0
  const tail = graph.slice(-GRAPH_DAYS)
  const first = tail.findIndex(v => v != null)
  return first === -1 ? 0 : tail.length - first
}

// How many of the last 7 days the league has prices for: the longest history
// among the items. Under 7 in a league's first week.
export function leagueDays (graphs: Iterable<unknown>): number {
  let days = 0
  for (const g of graphs) {
    days = Math.max(days, graphHistory(g))
    if (days === GRAPH_DAYS) break
  }
  return days
}

// Days the league has prices for, read from Divine Orb's graph (it trades
// every day). 7 when the feed has no Divine Orb.
export function feedDays (chunks: DenseChunk[]): number {
  for (const chunk of chunks) {
    if (typeForSlug(chunk.url) !== 'Currency') continue
    const pos = chunk.lines.indexOf('{"name":"Divine Orb"')
    if (pos === -1) continue
    const end = chunk.lines.indexOf('}', pos)
    try {
      const days = graphHistory((JSON.parse(chunk.lines.slice(pos, end + 1)) as { graph?: unknown }).graph)
      if (days > 0) return days
    } catch {}
  }
  return GRAPH_DAYS
}

// poe.ninja's 7-day graph uses null for days without a price and can be
// shorter or empty for items with little trade. Only the last `days` days
// count, so days before the league started aren't gaps; the count is then
// scaled to 7 days so the thin threshold (3 of 7) still works in a league's
// first days: on day 2, priced only today reads as 4 of 7.
export function graphGaps (graph: unknown, days = GRAPH_DAYS): number {
  if (!Array.isArray(graph)) return 0
  const window = Math.min(GRAPH_DAYS, Math.max(0, Math.floor(days)))
  if (window === 0) return 0
  const tail = graph.slice(-window)
  let gaps = window - tail.length
  for (const v of tail) if (v == null) gaps++
  return Math.round(gaps * GRAPH_DAYS / window)
}

export function findDivinePrice (items: PriceItem[]): number | null {
  const divine = items.find(i => i.type === 'Currency' && i.name === 'Divine Orb' && !i.variant)
  return divine && divine.chaos >= 1 ? divine.chaos : null
}
