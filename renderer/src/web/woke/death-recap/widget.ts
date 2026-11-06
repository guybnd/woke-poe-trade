import type { Widget, Anchor } from '@/web/overlay/widgets'

// Kept free of Vue components: Config.ts imports this file.
export const DEATH_RECAP_TYPE = 'woke-death-recap'

export interface DeathRecapWidget extends Widget {
  anchor: Anchor
}

export function initDeathRecapWidget (wmId: number): DeathRecapWidget {
  return {
    wmId,
    wmType: DEATH_RECAP_TYPE,
    wmTitle: '',
    wmWants: 'hide',
    wmZorder: null,
    // The panel shows with the overlay open; while you play, only the dock icon.
    wmFlags: ['invisible-on-blur'],
    anchor: { pos: 'tl', x: 10, y: 12 }
  }
}
