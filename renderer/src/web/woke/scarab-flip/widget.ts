import type { Widget, Anchor } from '@/web/overlay/widgets'
import type { FlipMethodId } from './families'

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
  // Shows or clears the outlines on the open stash tab.
  stashHotkey?: string | null
}

export function stashHotkeyTarget (wmId: number): string {
  return `woke-flips-stash:${wmId}`
}
