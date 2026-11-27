// The Watcher's Eye finder window's config. No app imports here: Config.ts
// adds the window to old configs, and the tests load it on its own.
import type { Widget, Anchor } from '@/web/overlay/widgets'
import { popupAnchor } from '../ui/window-anchor'
import type { WePick } from './mods'

export const WATCHERS_EYE_TYPE = 'woke-watchers-eye'

export type WatchersEyeWidget = Widget & {
  anchor: Anchor
  // Auras ticked by hand, on top of the PoB build's.
  auras: string[]
  // The build's auras you unticked.
  offAuras: string[]
  // The mods picked, with a minimum roll when one is set.
  picks: WePick[]
  // "Any N" of the picks instead of all of them (trade site only).
  atLeast: number | null
  // An aura or mod asked for from the search palette ("aura:Grace", "mod:<id>").
  focus?: string | null
}

export function initWatchersEyeWidget (wmId: number): WatchersEyeWidget {
  return {
    wmId,
    wmType: WATCHERS_EYE_TYPE,
    wmTitle: "Watcher's Eye finder",
    wmWants: 'hide',
    wmZorder: null,
    wmFlags: ['invisible-on-blur'],
    anchor: popupAnchor(),
    auras: [],
    offAuras: [],
    picks: [],
    atLeast: null
  }
}
