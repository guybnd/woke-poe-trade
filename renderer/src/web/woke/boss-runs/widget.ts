import type { Widget, Anchor } from '@/web/overlay/widgets'
import type { BossPrefs } from './calc'

export const BOSS_RUNS_TYPE = 'woke-boss-runs'

export type BossSort = 'hour' | 'run' | 'safe'

export interface BossRunsWidget extends Widget, BossPrefs {
  anchor: Anchor
  selected: string
  sort: BossSort
  tier: 'all' | 'uber' | 'pinnacle'
  // Thin-market poe.ninja prices count as unpriced (unset: off, so totals
  // match what the market shows).
  skipThin?: boolean
}
