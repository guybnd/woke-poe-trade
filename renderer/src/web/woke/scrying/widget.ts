// The Scrying window's config. No app imports here: Config.ts adds the window
// to old configs, and the tests load it on its own.
import type { Widget, Anchor } from '@/web/overlay/widgets'
import { popupAnchor } from '../ui/window-anchor'

export const SCRYING_TYPE = 'woke-scrying'

export type ScryingWidget = Widget & {
  anchor: Anchor
  // The map picked in the list ("Necropolis Map").
  selected: string | null
  sort: 'gain' | 'payback'
  // About how many of a map's own divination cards drop in one run.
  cardsPerMap: number
  // The map you run and scry from; null: not set (counts as worth 0).
  fromMap: string | null
}

export function initScryingWidget (wmId: number): ScryingWidget {
  return {
    wmId,
    wmType: SCRYING_TYPE,
    wmTitle: 'Scrying',
    wmWants: 'hide',
    wmZorder: null,
    wmFlags: ['invisible-on-blur'],
    anchor: popupAnchor(),
    selected: null,
    sort: 'gain',
    cardsPerMap: 3,
    fromMap: null
  }
}
