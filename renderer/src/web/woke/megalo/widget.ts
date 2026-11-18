// The Megalomaniac searcher window's config. No app imports here: Config.ts
// adds the window to old configs, and the tests load it on its own.
import type { Widget, Anchor } from '@/web/overlay/widgets'
import { popupAnchor } from '../ui/window-anchor'
import type { SearchMode, TagEdits } from './score'

export const MEGALO_TYPE = 'woke-megalo'

export type MegaloSource = 'pob' | 'character' | 'none'

// Your changes to one notable, for one build.
// `must`: every result has it (right-click); the count or weight covers the rest.
export interface NotablePick { on?: boolean, weight?: number, must?: boolean }

export type MegaloWidget = Widget & {
  anchor: Anchor
  source: MegaloSource
  // A PoB build other than the one in use, when opened from its page.
  pobPath?: string | null
  // By build key (buildKey()): tags you added or dropped, and notables you
  // ticked, unticked or re-weighted. Each build keeps its own.
  edits: Record<string, TagEdits>
  picks: Record<string, Record<string, NotablePick>>
  mode: SearchMode
  need: number
  // Weighted sum's total; null follows the suggestion.
  minWeight: number | null
  maxDiv: number | null
}

export function initMegaloWidget (wmId: number): MegaloWidget {
  return {
    wmId,
    wmType: MEGALO_TYPE,
    wmTitle: 'Megalomaniac searcher',
    wmWants: 'hide',
    wmZorder: null,
    wmFlags: ['invisible-on-blur'],
    anchor: popupAnchor(),
    source: 'pob',
    edits: {},
    picks: {},
    mode: 'count',
    need: 2,
    minWeight: null,
    maxDiv: null
  }
}

export function buildKey (source: MegaloSource, id: string): string {
  return source === 'none' ? 'none' : `${source}:${id}`
}
