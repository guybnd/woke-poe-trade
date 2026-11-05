import type { Widget, Anchor } from '@/web/overlay/widgets'

export const SCARAB_FLIP_TYPE = 'woke-scarab-flip'

export interface ScarabFlipWidget extends Widget {
  anchor: Anchor
  tab: 'buy' | 'odds' | 'rare'
  // Percent lost when selling results below the listed price.
  sellDiscount: number
  reroll: boolean
  hideUntraded: boolean
}
