import type { Widget, Anchor } from '@/web/overlay/widgets'
import type { FlipSort } from './calc'
import type { FlipMethodId, WeightOverrides } from './families'

// Named when the panel only did scarabs; kept so placed panels carry over.
export const SCARAB_FLIP_TYPE = 'woke-scarab-flip'

export interface ScarabFlipWidget extends Widget {
  anchor: Anchor
  tab: 'buy' | 'odds' | 'rare'
  // Percent lost when selling results below the listed price.
  sellDiscount: number
  reroll: boolean
  hideUntraded: boolean
  // Which family's tab is open, and the method picked in each family.
  family?: string
  methods?: Record<string, FlipMethodId>
  // Harvest cost per item, in lifeforce of the craft's colour.
  lifeforcePerItem?: number
  // Your own drop weights, kept through updates to the measured ones.
  weights?: WeightOverrides
  // Shows or clears the outlines on the open stash tab.
  stashHotkey?: string | null
  // Adds the whole stack's profit under each outline's per item figure. On when unset.
  stashTotals?: boolean
  // The buy list's order; profit each when unset.
  sort?: FlipSort
}

export function stashHotkeyTarget (wmId: number): string {
  return `woke-flips-stash:${wmId}`
}
