// Reads the end of Client.txt so the campaign tracker knows where you are
// right after the app starts (APT's watcher only streams new lines).
// With `since` (ms), it reads from the first line written then, so a long
// gap (trade chat fills 256 KB fast) still catches up the run timer,
// campaign and stacked decks (Guy's pick, 2026-11-26).
import { promises as fs } from 'fs'
import type { GameLogWatcher } from '../host-files/GameLogWatcher'
import { findStart } from './game-log-range'

const MAX_BYTES = 256 * 1024
// Past this a gap is days of play: the newest part is kept.
const MAX_SINCE_BYTES = 8 * 1024 * 1024

export async function readGameLogTail (watcher: GameLogWatcher, args: { bytes?: number, since?: number } | undefined) {
  const path = watcher.actualPath
  if (!path) return { path: null, lines: [] as string[] }
  let file: fs.FileHandle
  try {
    file = await fs.open(path, 'r')
  } catch {
    // The watcher is waiting for this file to appear.
    return { path: null, lines: [] as string[] }
  }
  try {
    const { size } = await file.stat()
    let want = Math.min(size, Math.max(1024, Math.min(args?.bytes ?? MAX_BYTES, MAX_BYTES)))
    const since = Number(args?.since)
    if (Number.isFinite(since) && since > 0) {
      const at = await findStart(path, since).catch(() => null)
      if (at != null) want = Math.max(want, Math.min(size - at, MAX_SINCE_BYTES))
    }
    const buf = Buffer.alloc(want)
    await file.read(buf, 0, want, size - want)
    const lines = buf.toString('utf8').split('\n').map(l => l.trim()).filter(l => l.length)
    // The first line is usually cut in half.
    if (want < size) lines.shift()
    return { path, lines }
  } finally {
    await file.close()
  }
}
