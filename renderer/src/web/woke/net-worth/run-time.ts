// Where a run's time went (the dock card's time bar): maps, hideout and town,
// other zones, and away (game closed or AFK), from Client.txt's zone lines.
// Kept for the live run only and read on from the last line each time.
import { hostRequest } from '../shared/host'
import { emptyMarks, feedMarks, timeIn } from './play-time'
import type { PlayMarks, PlayState } from './play-time'

// The zone you were in at the start needs the line before it.
const LOOKBACK_MS = 6 * 3_600_000

let kept: { startAt: number, path: string | null, marks: PlayMarks } | null = null

export async function runTimeIn (startAt: number, now: number): Promise<Record<PlayState, number> | null> {
  const from = startAt - LOOKBACK_MS
  let fresh = !kept || kept.startAt !== startAt || kept.marks.lastAt == null
  let res: { path: string | null, lines: string[] }
  try {
    res = await hostRequest('game-log-range', { from: fresh ? from : kept!.marks.lastAt!, to: now, sessions: true }, 30_000)
    // The app moved to another Client.txt: start over on it.
    if (!fresh && res.path && res.path !== kept!.path) {
      fresh = true
      res = await hostRequest('game-log-range', { from, to: now, sessions: true }, 30_000)
    }
  } catch { return null }
  if (!res.path) return null
  const base = fresh ? emptyMarks(from) : kept!.marks
  kept = { startAt, path: res.path, marks: feedMarks(base, res.lines) }
  return timeIn(kept.marks.marks, startAt, now)
}
