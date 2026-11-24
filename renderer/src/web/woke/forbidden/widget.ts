// The Forbidden pair finder window's config. No app imports here: Config.ts
// adds the window to old configs, and the tests load it on its own.
import type { Widget, Anchor } from '@/web/overlay/widgets'
import { popupAnchor } from '../ui/window-anchor'
import type { ClassName } from './notables'

export const FORBIDDEN_TYPE = 'woke-forbidden'

export type ForbiddenSource = 'pob' | 'character' | 'class'

export type ForbiddenWidget = Widget & {
  anchor: Anchor
  source: ForbiddenSource
  // A PoB build other than the one in use, when opened from its page.
  pobPath?: string | null
  // The class "Pick a class" shows.
  pickClass: ClassName
  // A notable to scroll to and mark (from the search palette).
  focus?: string | null
}

export function initForbiddenWidget (wmId: number): ForbiddenWidget {
  return {
    wmId,
    wmType: FORBIDDEN_TYPE,
    wmTitle: 'Forbidden pair finder',
    wmWants: 'hide',
    wmZorder: null,
    wmFlags: ['invisible-on-blur'],
    anchor: popupAnchor(),
    source: 'pob',
    pickClass: 'Witch'
  }
}
