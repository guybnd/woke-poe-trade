// Client.txt lines for every module: one listener on APT's log stream, each
// line parsed once (parseLogLine), handed to every subscriber. Modules that
// need what happened while the app was closed use followGameLog, which
// replays the start-up tail first and holds live lines until it's done. If
// Client.txt can't be found yet, the same happens again once it is.
import { getCurrentScope, onScopeDispose } from 'vue'
import { Host } from '@/web/background/IPC'
import { parseLogLine } from '../campaign/log-parse'
import type { LogEvent } from '../campaign/log-parse'
import { lineTime, logTail } from '../campaign/log-tail'
import type { LogTail } from '../campaign/log-tail'

export interface LogLine {
  line: string
  // ms: arrival time for live lines, the log's own timestamp for replayed ones.
  at: number
  // Area / zone / level event, when the line is one.
  ev: LogEvent | null
}

type Batch = (lines: LogLine[]) => void

const subscribers = new Set<Batch>()
const openedSubscribers = new Set<() => void>()
let listening = false

function listen () {
  if (listening) return
  listening = true
  Host.onEvent('MAIN->CLIENT::game-log', (e) => {
    if (!subscribers.size) return
    const at = Date.now()
    const batch = e.lines.map(line => ({ line, at, ev: parseLogLine(line) }))
    for (const sub of [...subscribers]) sub(batch)
  })
  Host.onEvent('MAIN->CLIENT::game-log-opened', () => {
    for (const sub of [...openedSubscribers]) sub()
  })
}

// Stops with the calling component (or effect scope), or with the returned function.
function autoStop (stop: () => void): () => void {
  if (getCurrentScope()) onScopeDispose(stop)
  return stop
}

// Live lines, as they're written.
export function onGameLog (cb: Batch): () => void {
  listen()
  subscribers.add(cb)
  return autoStop(() => { subscribers.delete(cb) })
}

// Live lines, after replaying the start-up tail. `since()` (ms) picks which
// tail lines replay: only those written after it (null: none). `onTail` sees
// the tail (path null: Client.txt wasn't found, and it's called again when it is).
export function followGameLog (opts: {
  since: () => number | null
  onLines: (lines: LogLine[], live: boolean) => void
  onTail?: (tail: LogTail) => void
}): () => void {
  let caughtUp = false
  let stopped = false
  let loading = false
  let missing = false
  let openedWhileLoading = false
  const queued: LogLine[][] = []
  const stop = onGameLog((lines) => {
    if (caughtUp) opts.onLines(lines, true)
    else queued.push(lines)
  })
  function catchUp () {
    caughtUp = false
    loading = true
    openedWhileLoading = false
    logTail().then(tail => {
      if (stopped) return
      missing = tail.path == null
      opts.onTail?.(tail)
      const since = opts.since()
      if (since == null) return
      const sinceSec = Math.floor(since / 1000) * 1000
      const replay: LogLine[] = []
      for (const line of tail.lines) {
        const at = lineTime(line)
        if (at != null && at > sinceSec) replay.push({ line, at, ev: parseLogLine(line) })
      }
      if (replay.length) opts.onLines(replay, false)
    }).catch(() => {}).finally(() => {
      caughtUp = true
      loading = false
      if (stopped) return
      for (const lines of queued.splice(0)) opts.onLines(lines, true)
      // It may have opened after the last try saw nothing.
      if (missing && openedWhileLoading) catchUp()
    })
  }
  function onOpened () {
    if (loading) openedWhileLoading = true
    else if (missing) catchUp()
  }
  openedSubscribers.add(onOpened)
  catchUp()
  return autoStop(() => {
    stopped = true
    openedSubscribers.delete(onOpened)
    stop()
  })
}
