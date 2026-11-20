import type { Widget, Anchor } from '@/web/overlay/widgets'

// Kept free of Vue components: Config.ts imports this file.
export const SESSION_STORY_TYPE = 'woke-session-story'

export interface SessionStoryWidget extends Widget {
  anchor: Anchor
}

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
