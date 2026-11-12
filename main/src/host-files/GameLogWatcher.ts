import { promises as fs, watchFile, unwatchFile, type Stats } from 'fs'
import { execFile } from 'child_process'
import path from 'path'
import { app } from 'electron'
import { findGameLogs } from '../woke/game-log-finder'
import { ServerEvents } from '../server'
import { Logger } from '../RemoteLogger'

export const POSSIBLE_PATH =
  (process.platform === 'win32') ? [
    'C:\\Program Files (x86)\\Grinding Gear Games\\Path of Exile\\logs\\Client.txt',
    'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Path of Exile\\logs\\Client.txt'
  ] : (process.platform === 'linux') ? [
    path.join(app.getPath('home'), '.wine/drive_c/Program Files (x86)/Grinding Gear Games/Path of Exile/logs/Client.txt'),
    path.join(app.getPath('home'), '.local/share/Steam/steamapps/common/Path of Exile/logs/Client.txt')
  ] : (process.platform === 'darwin') ? [
    path.join(app.getPath('home'), 'Library/Caches/com.GGG.PathOfExile/Logs/Client.txt')
  ] : []

// woke: the game can be installed anywhere (another Steam library, another
// drive), so ask the running game where it is. Runs once at startup and once
// each time the game window appears, never on a timer.
export function runningGameLog (): Promise<string | null> {
  if (process.platform !== 'win32') return Promise.resolve(null)
  return new Promise((resolve) => {
    execFile('powershell', ['-NoProfile', '-NonInteractive', '-Command',
      '(Get-Process PathOfExile* -ErrorAction SilentlyContinue | Select-Object -First 1).Path'
    ], { windowsHide: true, timeout: 10_000 }, (err, stdout) => {
      const exe = err ? '' : stdout.trim()
      resolve(exe ? path.join(path.dirname(exe), 'logs', 'Client.txt') : null)
    })
  })
}

// A log the game just started is tiny. A big "new" file is the old one seen
// wrongly (a volatile file id, say) or a restored copy, and replaying it would
// feed the run timer, farming and trade months of old events as if live.
const NEW_LOG_MAX_BYTES = 1024 * 1024

// Waiting for a log we've never read. Its existing lines aren't new, however
// short it is: the overlay reads them from the tail when told it's open.
const NEVER_READ = -1

export function startOffset (now: { ino: number, size: number }, lastIno: number, lastOffset: number): number {
  if (lastIno === NEVER_READ) return now.size
  if (now.ino === lastIno && now.size >= lastOffset) return lastOffset
  return now.size > NEW_LOG_MAX_BYTES ? now.size : 0
}

export class GameLogWatcher {
  private _wantedPath: string | null = null
  // woke: the running game's log, once gameStarted has chosen it.
  private _runningLog: string | null = null
  // woke: main-side listener for new lines (the personal stash reader's
  // hideout check). Unset unless that feature is on.
  onLines: ((lines: string[]) => void) | null = null
  get actualPath () { return this._state?.path ?? null }
  private _state: {
    offset: number
    path: string
    // null: the file was deleted, and we're waiting for a new one.
    file: fs.FileHandle | null
    ino: number
    isReading: boolean
    readBuff: Buffer
  } | null = null

  constructor (
    private server: ServerEvents,
    private logger: Logger,
  ) {}

  // woke: stop tailing when no enabled module reads the log.
  async stop () {
    this._wantedPath = null
    await this.close()
  }

  async restart (logFile: string) {
    if (this._wantedPath === logFile) return
    this._wantedPath = logFile
    this._runningLog = null
    await this.close()

    if (!logFile.length) {
      // woke: an old install's Client.txt used to win for good when the app
      // started before the game. Now the newest one on this PC is only a
      // stand-in until the game starts (gameStarted).
      const guessedPath = await runningGameLog() ?? (await findGameLogs({ quick: true }))[0]?.path ?? null
      if (this._wantedPath !== logFile || guessedPath == null) return
      // The game started during that search: its log beats a guess.
      if (this._runningLog) return
      logFile = guessedPath
    }
    await this.open(logFile)
  }

  // woke: the game window appeared. With the path left on auto, follow the
  // running game's own Client.txt if it isn't the one being read.
  async gameStarted () {
    if (this._wantedPath !== '') return
    const found = await runningGameLog()
    if (!found || this._wantedPath !== '' || found === this.actualPath) return
    // Not written yet is fine (a fresh install): open waits for it.
    this._runningLog = found
    this.logger.write(`info [GameLogWatcher] Switching to the running game's log: ${found}`)
    await this.close()
    await this.open(found)
  }

  private async close () {
    if (!this._state) return
    unwatchFile(this._state.path)
    const { file } = this._state
    this._state = null
    await file?.close()
  }

  private async open (logFile: string) {
    // woke: restart, stop and gameStarted can overlap. A file opened for a
    // path that is no longer wanted is closed again, and one open landing
    // after another replaces it instead of leaking its handle and watcher.
    const wanted = this._wantedPath
    try {
      const file = await fs.open(logFile, 'r')
      const stats = await file.stat()
      if (this._wantedPath !== wanted) {
        await file.close()
        return
      }
      await this.close()
      if (this._state || this._wantedPath !== wanted) {
        await file.close()
        return
      }
      watchFile(logFile, { interval: 450 }, this.handleFileChange.bind(this))
      this._state = {
        path: logFile,
        file: file,
        ino: stats.ino,
        offset: stats.size,
        isReading: false,
        readBuff: Buffer.allocUnsafe(64 * 1024),
      }
      this.announce(logFile)
    } catch {
      this.logger.write('error [GameLogWatcher] Failed to watch file.')
      // woke: not there yet (a set path, before the game first runs). Same as
      // a deleted log: wait for it.
      if (this._state || this._wantedPath !== wanted) return
      watchFile(logFile, { interval: 450 }, this.handleFileChange.bind(this))
      this._state = {
        path: logFile,
        file: null,
        ino: NEVER_READ,
        offset: 0,
        isReading: false,
        readBuff: Buffer.allocUnsafe(64 * 1024),
      }
    }
  }

  // woke: the overlay stops asking after a few seconds, so say when there's a
  // log to read. Before any lines from it, so they arrive after this.
  private announce (path: string) {
    this.server.sendEventTo('broadcast', {
      name: 'MAIN->CLIENT::game-log-opened',
      payload: { path }
    })
  }

  private handleFileChange (curr: Stats) {
    const state = this._state
    if (!state) return

    // woke: a stale handle reads nothing forever, so the log appeared to stop
    // until a restart. Deleted (or a failed stat, which looks the same): let go
    // of it so the game can make a new one. Looks cleared or swapped: reopen,
    // and reopen decides where to read from.
    if (curr.nlink === 0) {
      if (state.file) this.reopen(state, false)
      return
    }
    if (!state.file && state.isReading) return // A reopen is under way.
    const swapped = state.ino !== 0 && curr.ino !== 0 && curr.ino !== state.ino
    if (!state.file || curr.size < state.offset || swapped) {
      this.reopen(state, true)
      return
    }

    if (!state.isReading) {
      state.isReading = true
      this.readToEOF()
    }
  }

  // A read still going on the old state notices it's been replaced and stops.
  private reopen (state: NonNullable<GameLogWatcher['_state']>, openAgain: boolean) {
    // Its own buffer: a read still going on the old state writes into the old one.
    const next: typeof state = { ...state, file: null, isReading: openAgain, readBuff: Buffer.allocUnsafe(state.readBuff.length) }
    this._state = next
    state.file?.close().catch(() => {})
    if (!openAgain) return
    let opened: fs.FileHandle | undefined
    fs.open(state.path, 'r').then(async (file) => {
      opened = file
      const stats = await file.stat()
      if (this._state !== next) {
        await file.close()
        return
      }
      next.offset = startOffset(stats, next.ino, next.offset)
      if (next.ino !== stats.ino || stats.size < state.offset) {
        this.logger.write(`info [GameLogWatcher] ${state.path} changed, following the new file.`)
      }
      next.file = file
      next.ino = stats.ino
      this.announce(next.path)
      this.readToEOF()
    }).catch(() => {
      opened?.close().catch(() => {})
      // Gone again already. The next change tries again.
      if (this._state === next) next.isReading = false
    })
  }

  private async readToEOF () {
    const state = this._state
    if (!state) return

    const { file, readBuff, offset } = state
    if (!file) {
      state.isReading = false
      return
    }
    let bytesRead: number
    try {
      ({ bytesRead } = await file.read(readBuff, 0, readBuff.length, offset))
    } catch {
      // woke: the file was closed meanwhile (switched to the running game's log).
      state.isReading = false
      return
    }
    if (this._state !== state) return

    if (bytesRead) {
      // woke: only whole lines. A chunk can end mid-line (or mid-character);
      // the rest is read with the next chunk instead of arriving as a broken line.
      let used = readBuff.lastIndexOf(10, bytesRead - 1) + 1
      if (used === 0) {
        if (bytesRead < readBuff.length) {
          // Half a line at the end of the file: wait for the game to finish it.
          state.isReading = false
          return
        }
        used = bytesRead
      }
      const str = readBuff.toString('utf8', 0, used)
      const lines = str.split('\n').map(line => line.trim()).filter(line => line.length)
      this.server.sendEventTo('broadcast', {
        name: 'MAIN->CLIENT::game-log',
        payload: { lines }
      })
      try { this.onLines?.(lines) } catch {}
      state.offset += used
      this.readToEOF()
    } else {
      state.isReading = false
    }
  }
}
