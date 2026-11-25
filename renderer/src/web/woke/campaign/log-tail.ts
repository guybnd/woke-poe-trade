// The last chunk of Client.txt, read once it's found, so the campaign widgets
// know where you are without waiting for a zone change.
import { hostRequest } from '../shared/host'

export interface LogTail {
  // null when Client.txt couldn't be found or opened.
  path: string | null
  lines: string[]
}

// A read in flight, shared by everyone who asks meanwhile. Once it's done the
// next ask reads again: a widget turned on later needs the lines since.
let pending: Promise<LogTail> | null = null
// The log that read was asked for, when one was named.
let pendingFor: string | null = null

async function load (): Promise<LogTail> {
  // The log watcher starts once the overlay sends its config, which can be
  // a moment after widgets mount: retry a few times before giving up.
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const tail = await hostRequest('game-log-tail', {}, 10_000)
      if (tail.path) return tail
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 2500))
  }
  return { path: null, lines: [] }
}

// `path`: a log that just opened. A read started before it (for no log
// named, or another) can still have the old log's lines: read again.
export function logTail (path?: string): Promise<LogTail> {
  if (pending && (path == null || pendingFor === path)) return pending
  const loading: Promise<LogTail> = load().finally(() => {
    if (pending === loading) pending = null
  })
  pending = loading
  pendingFor = path ?? null
  return loading
}

// "2026/11/04 12:22:37 …" at the start of every Client.txt line, local time.
export function lineTime (line: string): number | null {
  const m = /^(\d{4})\/(\d\d)\/(\d\d) (\d\d):(\d\d):(\d\d)/.exec(line)
  if (!m) return null
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime()
}

// Lines written after `since` (ms), with their timestamps. Lines from the
// same second as `since` are kept out: they were already seen live.
export function linesAfter (tail: LogTail, since: number): Array<{ line: string, at: number }> {
  const out: Array<{ line: string, at: number }> = []
  const sinceSec = Math.floor(since / 1000) * 1000
  for (const line of tail.lines) {
    const at = lineTime(line)
    if (at != null && at > sinceSec) out.push({ line, at })
  }
  return out
}
