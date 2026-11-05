// Main-process side of woke modules: one request/response channel,
// with handlers registered by op name.
import { net } from 'electron'
import type { ServerEvents } from '../server'
import type { Logger } from '../RemoteLogger'
import type { GameWindow } from '../windowing/GameWindow'
import { importBuild, listBuilds, openBuild, readBuild, showBuild } from './pob-builds'
import { listFilters, readFilter, writeFilter, showFilterFolder, listSounds, readSound, installSound } from './loot-filter'
import { cachedNeverSink, downloadNeverSink, latestNeverSink, pruneNeverSink, readNeverSink } from './neversink'
import { ScreenScanner, MAP_SCAN, ESSENCE_SCAN, checkOcr, readAllEssenceLabels } from './map-scan'
import { WokeHoverTracker } from './hover'
import { readScarabTab } from './stash-read'
import { StashWatch } from './stash-watch'
import { perfRecord } from './perf'
import type { OverlayWindow } from '../windowing/OverlayWindow'
import type { GameLogWatcher } from '../host-files/GameLogWatcher'
import { readGameLogTail } from './game-log-tail'
import { perfSnapshot, startProcessSampler } from './perf'
import { hotkeyFailures } from './hotkey-failures'
import { marketHandlers } from './market-store'
import { labLayoutImage } from './lab-layout'
import { sessionHandlers } from './session-store'
import { tradeLogHandlers } from './trade-log'
import { docHandlers } from './data-files'
import { browsePath, pathStat } from './settings-files'
import { cachedLiveData, checkLiveData } from './live-data'

type Handler = (args: any) => Promise<unknown> // eslint-disable-line @typescript-eslint/no-explicit-any

const handlers: Record<string, Handler> = {
  'pob-list': listBuilds,
  'pob-read': readBuild,
  'pob-open': openBuild,
  'pob-show': showBuild,
  'pob-import': importBuild,
  'filter-list': listFilters,
  'filter-read': readFilter,
  'filter-write': writeFilter,
  'filter-folder': showFilterFolder,
  'filter-sounds': listSounds,
  'filter-sound-read': readSound,
  'filter-sound-install': installSound,
  'ns-latest': async () => await latestNeverSink(),
  'ns-download': downloadNeverSink,
  'ns-read': readNeverSink,
  'ns-cached': async () => await cachedNeverSink(),
  'ns-prune': pruneNeverSink,
  'perf-stats': async () => perfSnapshot(),
  'ocr-check': async () => checkOcr(),
  'hotkey-failures': async () => hotkeyFailures(),
  'lab-layout-image': labLayoutImage,
  'path-stat': pathStat,
  'live-data-cached': cachedLiveData,
  'live-data-check': async (args) => await checkLiveData(args, async (url, signal) => await net.fetch(url, { signal })),
  'browse-path': browsePath,
  ...marketHandlers,
  ...sessionHandlers,
  ...tradeLogHandlers,
  ...docHandlers
}

// For main-process parts set up outside initWoke (setup window, crash reports).
export function registerWokeHandler (op: string, handler: Handler): void {
  handlers[op] = handler
}

export function initWoke (server: ServerEvents, logger: Logger, poeWindow: GameWindow, gameLog: GameLogWatcher): void {
  handlers['game-log-tail'] = async (args) => await readGameLogTail(gameLog, args)
  // Follow the running game's Client.txt (another drive, another Steam
  // library) instead of a stale copy in a default folder.
  poeWindow.onAttach(() => { gameLog.gameStarted().catch(() => {}) })
  for (const kind of [MAP_SCAN, ESSENCE_SCAN]) {
    const scanner = new ScreenScanner(server, logger, poeWindow, kind)
    handlers[`${kind.topic}-start`] = async () => await scanner.start()
    handlers[`${kind.topic}-stop`] = async () => scanner.stop()
    handlers[`${kind.topic}-reread`] = async () => scanner.reread()
    handlers[`${kind.topic}-status`] = async () => ({ running: scanner.isRunning, paused: scanner.isPaused, rolling: scanner.isRolling })
    if (kind.canRoll) handlers[`${kind.topic}-roll`] = async () => await scanner.roll()
  }
  handlers['essence-scan-once'] = async () => await readAllEssenceLabels(poeWindow)
  const stashWatch = new StashWatch(() => {
    server.sendEventTo('broadcast', { name: 'MAIN->CLIENT::woke-event', payload: { topic: 'stash-clear', data: null } })
  })
  handlers['stash-read'] = async () => {
    const { width, height } = poeWindow.bounds
    if (!width || !height) return { found: false }
    const t0 = performance.now()
    const res = readScarabTab(poeWindow.screenshot(), width, height)
    perfRecord('Stash outlines: read', performance.now() - t0)
    if (res.found) stashWatch.start()
    return res
  }
  handlers['stash-watch-stop'] = async () => { stashWatch.stop(); return null }

  server.onEventAnyClient('CLIENT->MAIN::woke-request', ({ id, op, args }) => {
    // Own keys only: an op like "constructor" must not reach Object.prototype.
    const handler = Object.prototype.hasOwnProperty.call(handlers, op) ? handlers[op] : undefined
    const reply = (payload: { ok: boolean, data?: unknown, error?: string }) => {
      server.sendEventTo('broadcast', { name: 'MAIN->CLIENT::woke-response', payload: { id, ...payload } })
    }
    if (!handler) {
      reply({ ok: false, error: `Unknown op: ${op}` })
      return
    }
    Promise.resolve()
      .then(async () => await handler(args))
      .then(data => reply({ ok: true, data }))
      .catch((err: unknown) => {
        logger.write(`error [woke] ${op}: ${String(err)}`)
        reply({ ok: false, error: err instanceof Error ? err.message : String(err) })
      })
  })

  startProcessSampler(() => poeWindow.isActive)
}

// Needs the overlay window, which main.ts creates later than initWoke runs.
export function initWokeOverlay (server: ServerEvents, overlay: OverlayWindow): void {
  new WokeHoverTracker(server, overlay) // eslint-disable-line no-new
}
