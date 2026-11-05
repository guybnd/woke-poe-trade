// Reads the end of Client.txt so the campaign tracker knows where you are
// right after the app starts (APT's watcher only streams new lines).
import { promises as fs } from 'fs'
import type { GameLogWatcher } from '../host-files/GameLogWatcher'

const MAX_BYTES = 256 * 1024

export async function readGameLogTail (watcher: GameLogWatcher, args: { bytes?: number } | undefined) {
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
    const want = Math.min(size, Math.max(1024, Math.min(args?.bytes ?? MAX_BYTES, MAX_BYTES)))
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
