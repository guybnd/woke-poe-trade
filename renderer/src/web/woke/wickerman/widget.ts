import type { Widget, Anchor } from '@/web/overlay/widgets'

// Kept free of Vue components: widget-specs.ts imports this file.
export const WICKERMAN_TYPE = 'woke-wickerman'

export interface WickermanWidget extends Widget {
  anchor: Anchor
  // 'all' or a Wickerman slot.
  slot: string
}
