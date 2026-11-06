import type { Widget, Anchor } from '@/web/overlay/widgets'
import type { RankMode } from './calc'

export const DISENCHANT_TYPE = 'woke-disenchant'

export interface DisenchantWidget extends Widget {
  anchor: Anchor
  mode: RankMode
  // Chaos you'd pay for 10,000 gold, for the "With gold" ranking.
  goldChaosPer10k: number
  minDust: number
  maxGold: number | null
  maxChaos: number | null
  hideThin: boolean
  // Lowest item level in trade links. Dust assumes 84; lower gives less.
  tradeIlvl: number
  // Ticked as bought, per league, so a new league starts clean.
  bought: Record<string, string[]>
}

export function initDisenchant (w: DisenchantWidget) {
  w.mode = 'per-chaos'
  w.goldChaosPer10k = 5
  w.minDust = 0
  w.maxGold = null
  w.maxChaos = null
  w.hideThin = false
  w.tradeIlvl = 84
  w.bought = {}
}

export function tradeLink (league: string, row: { name: string, base: string }, ilvl: number, host: string, english: boolean): string {
  const query = {
    query: {
      status: { option: 'online' },
      name: row.name,
      ...(english ? { type: row.base } : {}),
      filters: { misc_filters: { filters: { ilvl: { min: ilvl } } } }
    },
    sort: { price: 'asc' }
  }
  return `https://${host}/trade/search/${encodeURIComponent(league)}?q=${encodeURIComponent(JSON.stringify(query))}`
}
