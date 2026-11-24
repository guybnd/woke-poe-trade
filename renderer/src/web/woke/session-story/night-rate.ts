// A night's time for its per hour, under the Per hour setting
// (shared/rate-time.ts): the night card and its Ctrl+Space answer agree.
// A night ends when the game closes, so "closed" never falls inside one.
import type { RateTime } from '../shared/rate-time'
import type { NightStory } from './story'

type Night = Pick<NightStory, 'startedAt' | 'endedAt' | 'afkMs' | 'hubMs'>

// Time played: AFK left out.
export const playedMs = (s: Night) => s.endedAt - s.startedAt - (s.afkMs ?? 0)

export function nightRateMs (s: Night, time: RateTime): number {
  if (time === 'all') return s.endedAt - s.startedAt
  return playedMs(s) - (time === 'play' ? s.hubMs ?? 0 : 0)
}
