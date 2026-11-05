import type { Widget, Anchor } from '@/web/overlay/widgets'

export const ANALYTICS_TYPE = 'woke-session-analytics'

// A loot line as saved with a finished session: priced once, when the
// session ended, so the numbers don't move with today's prices.
export interface SavedLoot {
  type: string
  name: string
  variant: string
  qty: number
  // Sell value of one (after the bulk discount and junk rule), in chaos.
  // null: poe.ninja had no price.
  chaos: number | null
}

// One map instance.
export interface MapRun {
  areaId: string
  // "Strand", from Client.txt's "You have entered" line (or the area id).
  name: string
  level: number
  enteredAt: number
  // Time inside the map (all visits to this instance) and time elsewhere
  // (hideout, town) until the next map.
  mapMs: number
  otherMs: number
  loot: SavedLoot[]
  // Left out of the averages by the player (e.g. a once-a-league drop).
  excluded?: boolean
}

export interface SessionRecord {
  id: string
  league: string
  strategy: string
  startedAt: number
  endedAt: number
  durationMs: number
  // Maps counted (may be more than runs: maps added with + have no detail).
  maps: number
  costPerMapChaos: number
  // Loot not tied to a map (added before the first map) and typed-in chaos.
  loot: SavedLoot[]
  extraChaos: number
  divine: number | null
  runs: MapRun[]
  // Brought over from Farming's old history: totals only.
  imported?: { costChaos: number, lootChaos: number }
}

export type AnalyticsUnit = 'div' | 'chaos'
export type AnalyticsRange = '7d' | 'league' | 'all'

export interface AnalyticsWidget extends Widget {
  anchor: Anchor
  unit: AnalyticsUnit
  range: AnalyticsRange
  // Include boss kills from Boss runs as their own rows.
  bosses: boolean
}
