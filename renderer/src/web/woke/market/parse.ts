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
            gaps: graphGaps(info.graph),
            ...trendPrices(info.chaos, info.graph)
          })
        }
      } catch {}
      pos = chunk.lines.indexOf(ENTRY_START, end)
    }
  }
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

// poe.ninja's 7-day graph uses null for days without a price and can be
// shorter or empty for items with little trade.
export function graphGaps (graph: unknown): number {
  if (!Array.isArray(graph)) return 0
  const DAYS = 7
  let gaps = Math.max(0, DAYS - graph.length)
  for (const v of graph.slice(-DAYS)) if (v == null) gaps++
  return Math.min(DAYS, gaps)
}

export function findDivinePrice (items: PriceItem[]): number | null {
  const divine = items.find(i => i.type === 'Currency' && i.name === 'Divine Orb' && !i.variant)
  return divine && divine.chaos >= 1 ? divine.chaos : null
}
