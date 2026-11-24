import type { Widget, Anchor } from '@/web/overlay/widgets'

// Kept free of Vue components: Config.ts imports this file.
export const SESSION_STORY_TYPE = 'woke-session-story'

// Where the line about a map you just left shows: on the dock icon, as a
// note in the middle of the screen, or nowhere.
export type ChipPlace = 'dock' | 'center' | 'off'

export interface SessionStoryWidget extends Widget {
  anchor: Anchor
  chipPlace?: ChipPlace
  // How long the line stays, in seconds; 0: until you go into a map.
  chipSeconds?: number
  // No longer used: a click on the toast always closes it now. Old configs may hold it.
  chipClick?: boolean
  // No longer used: the corner zoomed the toast (PR 693). Old configs may hold it.
  chipScale?: number
  // The toast's size in its own px, set by dragging its corner: more room, not bigger text.
  chipSize?: { w: number, h?: number }
  // Where the toast sits (its top centre, share of the screen), set by dragging its title bar.
  chipPos?: { x: number, y: number }
  // Areas left out as maps, by the name the game logs (see skip-areas.ts); undefined: the defaults.
  skipAreas?: string[]
  // Session analytics › Map history also lists those areas (marked).
  historySkipped?: boolean
  // A hotkey that closes it. Registered like any hotkey: the game no longer gets that key.
  chipKey?: string | null
  // While in a map: a thin bar at the top with the map, its time so far and tonight's total. Off unless on.
  glance?: boolean
  // Where the glance bar sits (its top centre, share of the screen), set by dragging it.
  glancePos?: { x: number, y: number }
}

export const CHIP_CLOSE_TARGET = 'woke-session-story-chip'

export function initSessionStoryWidget (wmId: number): SessionStoryWidget {
  return {
    wmId,
    wmType: SESSION_STORY_TYPE,
    wmTitle: '',
    wmWants: 'hide',
    wmZorder: null,
    // The panel shows with the overlay open; while you play, only the dock icon.
    wmFlags: ['invisible-on-blur'],
    anchor: { pos: 'tl', x: 10, y: 12 }
  }
}
