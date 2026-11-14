// Client.txt lines between two times, for rebuilding a past run's timeline.
// The log is in time order, so the start is found by halving the file
// rather than reading it all (it grows past 250 MB). Only the lines a run
// timeline uses come back: zone, level-up and death lines.
import { promises as fs } from 'fs'
import { createReadStream } from 'fs'
import readline from 'readline'

// "2026/11/04 18:00:01 ..." in local time, as the game writes it.
const TIME_RE = /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2}) /
const WANTED_RE = /Generating level \d+ area "|\] : You have entered |\] : \S+ \([^)]+\) is now level \d+|\] : \S+ has been slain\./

// A run is a few days at most; past this many lines something is wrong.
const MAX_LINES = 50_000
const PROBE_BYTES = 8 * 1024

export function logLineTime (line: string): number | null {
  const m = TIME_RE.exec(line)
  if (!m) return null
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime()
}

// Time of the first whole line starting after `pos`, or null at the end.
async function timeAfter (file: fs.FileHandle, pos: number, size: number): Promise<number | null> {
  const len = Math.min(PROBE_BYTES, size - pos)
  if (len <= 0) return null
  const buf = Buffer.alloc(len)
  await file.read(buf, 0, len, pos)
  const lines = buf.toString('utf8').split('\n')
  // The first piece is the tail of a line cut in half, unless at the start.
  for (const line of pos === 0 ? lines : lines.slice(1)) {
    const t = logLineTime(line)
    if (t != null) return t
  }
  return null
}

// A file position at or before the first line written at `from`.
export async function findStart (path: string, from: number): Promise<number> {
  const file = await fs.open(path, 'r')
  try {
    const { size } = await file.stat()
    let lo = 0
    let hi = size
    while (hi - lo > PROBE_BYTES) {
      const mid = Math.floor((lo + hi) / 2)
      const t = await timeAfter(file, mid, size)
      if (t == null || t >= from) hi = mid
      else lo = mid
    }
    return lo
  } finally {
    await file.close()
  }
}

export async function readLogRange (path: string | null, from: number, to: number): Promise<{ path: string | null, lines: string[] }> {
  if (!path || !Number.isFinite(from) || !Number.isFinite(to) || to < from) return { path, lines: [] }
  let start: number
  try {
    start = await findStart(path, from)
  } catch {
    return { path: null, lines: [] }
  }
  const lines: string[] = []
  const stream = createReadStream(path, { start, encoding: 'utf8' })
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity })
  try {
    for await (const raw of rl) {
      const t = logLineTime(raw)
      if (t == null) continue
      if (t < from) continue
      if (t > to) break
      if (WANTED_RE.test(raw)) lines.push(raw.trimEnd())
      if (lines.length >= MAX_LINES) break
    }
  } finally {
    rl.close()
    stream.destroy()
  }
  return { path, lines }
}
