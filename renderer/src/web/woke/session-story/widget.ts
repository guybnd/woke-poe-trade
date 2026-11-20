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
  // A click on the line closes it (the line then takes the mouse while it's under it).
  chipClick?: boolean
  // A hotkey that closes it. Registered like any hotkey: the game no longer gets that key.
  chipKey?: string | null
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
