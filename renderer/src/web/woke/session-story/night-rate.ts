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

// The live night ends at its last log line: carried on to `now`, so its time
// keeps moving while the log is quiet. Out of maps that time is hideout time;
// while you're AFK (it writes nothing) it's AFK.
export function nightUpTo<T extends Night & Pick<NightStory, 'afkSince'>> (n: T, now: number, inMap: boolean): T {
  const more = Math.max(0, now - n.endedAt)
  const afk = n.afkSince != null
  return { ...n, endedAt: n.endedAt + more, afkMs: (n.afkMs ?? 0) + (afk ? more : 0), hubMs: (n.hubMs ?? 0) + (inMap || afk ? 0 : more) }
}
