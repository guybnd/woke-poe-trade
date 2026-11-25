import type { Widget, Anchor } from '@/web/overlay/widgets'

// The window Alt+M opens: only this shows, like APT's item info, and it closes
// when the game gets focus back.
export const MAP_CHECK_TYPE = 'woke-map-check'

export interface MapCheckWidget extends Widget {
  anchor: Anchor
  // Dragged by the user: stay there instead of following the stash/inventory side.
  moved: boolean
}

export function initMapCheckWidget (wmId: number): MapCheckWidget {
  return {
    wmId,
    wmType: MAP_CHECK_TYPE,
    wmTitle: '',
    wmWants: 'hide',
    wmZorder: 'exclusive',
    wmFlags: ['hide-on-blur', 'menu::skip'],
    anchor: { pos: 'cl', x: 50, y: 50 },
    moved: false
  }
}

// Alt+M pressed just after start, before the card's code has loaded: index.ts
// keeps the item here and the card checks it when it mounts, instead of the
// press being lost.
export interface EarlyMapCheck { clipboard: string, position: { x: number, y: number } }
export const earlyMapCheck: { mounted: boolean, press: EarlyMapCheck | null, at: number } = { mounted: false, press: null, at: 0 }
export const EARLY_CHECK_MS = 5_000
