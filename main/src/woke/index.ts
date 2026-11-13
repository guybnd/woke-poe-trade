// Main-process side of woke modules: one request/response channel,
// with handlers registered by op name.
import { net } from 'electron'
import type { ServerEvents } from '../server'
import type { Logger } from '../RemoteLogger'
import type { GameWindow } from '../windowing/GameWindow'
import { deleteBuild, duplicateBuild, importBuild, listBuilds, moveBuild, openBuild, readBuild, renameBuild, restoreBuild, showBuild } from './pob-builds'
import { timelessRewrites } from './pob-timeless'
import { listFilters, readFilter, writeFilter, showFilterFolder, listSounds, readSound, installSound } from './loot-filter'
import { cachedNeverSink, downloadNeverSink, latestNeverSink, pruneNeverSink, readNeverSink } from './neversink'
import { ScreenScanner, MAP_SCAN, ESSENCE_SCAN, checkOcr, readAllEssenceLabels, readAreaMods } from './map-scan'
import { WokeHoverTracker } from './hover'
import { readStashTab } from './stash-read'
import { StashWatch } from './stash-watch'
import { TreeOverlay } from './tree-overlay'
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
import { deathRecapHandlers } from './death-recap-store'
import { docHandlers } from './data-files'
import { browsePath, pathStat } from './settings-files'
import { cachedLiveData, checkLiveData } from './live-data'
import { initPersonal } from './personal'
import type { WokeHandler, WokeHandlers, WokeOp } from '../../../ipc/woke-ops'

// Typed by ipc/woke-ops.ts. Partial: some are added later (setup window,
// screen readers, the stash reader while it's on).
const handlers: Partial<WokeHandlers> = {
  'pob-list': listBuilds,
  'pob-read': readBuild,
  'pob-open': openBuild,
  'pob-show': showBuild,
  'pob-import': importBuild,
  'pob-rename': renameBuild,
  'pob-move': moveBuild,
  'pob-duplicate': duplicateBuild,
  'pob-delete': deleteBuild,
  'pob-restore': restoreBuild,
  'pob-timeless': timelessRewrites,
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
  ...deathRecapHandlers,
  ...docHandlers
}

// For main-process parts set up outside initWoke (setup window, crash reports).
export function registerWokeHandler<K extends WokeOp> (op: K, handler: WokeHandler<K>): void {
  (handlers as Record<K, WokeHandler<K>>)[op] = handler
}

export function initWoke (server: ServerEvents, logger: Logger, poeWindow: GameWindow, gameLog: GameLogWatcher): void {
  registerWokeHandler('game-log-tail', async (args) => await readGameLogTail(gameLog, args ?? undefined))
  // Follow the running game's Client.txt (another drive, another Steam
  // library) instead of a stale copy in a default folder.
  poeWindow.onAttach(() => { gameLog.gameStarted().catch(() => {}) })
  for (const kind of [MAP_SCAN, ESSENCE_SCAN]) {
    const scanner = new ScreenScanner(server, logger, poeWindow, kind)
    const topic = kind.topic
    registerWokeHandler(`${topic}-start`, async () => await scanner.start())
    registerWokeHandler(`${topic}-stop`, async () => scanner.stop())
    registerWokeHandler(`${topic}-reread`, async () => scanner.reread())
    registerWokeHandler(`${topic}-status`, async () => ({ running: scanner.isRunning, paused: scanner.isPaused, rolling: scanner.isRolling, auto: scanner.isAuto }))
    registerWokeHandler(`${topic}-auto-start`, async () => await scanner.autoStart())
    registerWokeHandler(`${topic}-auto-stop`, async () => scanner.autoStop())
    if (kind.canRoll && topic === 'map-scan') registerWokeHandler('map-scan-roll', async () => await scanner.roll())
  }
  registerWokeHandler('essence-scan-once', async () => await readAllEssenceLabels(poeWindow))
  registerWokeHandler('area-mods-read', async (args) => await readAreaMods(poeWindow, Number(args?.delayMs) || 0))
  const stashWatch = new StashWatch(() => {
    server.sendEventTo('broadcast', { name: 'MAIN->CLIENT::woke-event', payload: { topic: 'stash-clear', data: null } })
  })
  registerWokeHandler('stash-read', async () => {
    const { width, height } = poeWindow.bounds
    if (!width || !height) return { found: false }
    const t0 = performance.now()
    const res = readStashTab(poeWindow.screenshot(), width, height)
    perfRecord('Stash outlines: read', performance.now() - t0)
    if (res.found) stashWatch.start()
    return res
  })
  registerWokeHandler('stash-watch-stop', async () => { stashWatch.stop(); return null })

  const treeOverlay = new TreeOverlay(poeWindow, (data) => {
    server.sendEventTo('broadcast', { name: 'MAIN->CLIENT::woke-event', payload: { topic: 'tree-overlay', data } })
  })
  registerWokeHandler('tree-overlay-points', async (args) => { treeOverlay.setPoints(args); return null })
  registerWokeHandler('tree-overlay-fit', async (args) => treeOverlay.hasPoints ? treeOverlay.fit(args) : { ok: false, reason: 'no-points' })
  registerWokeHandler('tree-overlay-stop', async () => { treeOverlay.stop(); return null })
  registerWokeHandler('tree-overlay-tip', async (on) => { treeOverlay.watchTreeKey(on === true); return null })

  // The stash reader: off unless the player turned it on (or personal.flag).
  // Off, nothing is registered but these three answers.
  const personalOps = new Set<WokeOp>()
  const personal = initPersonal({
    register: (op, handler) => {
      // Never over an always-on handler: turning it off would remove that one.
      if (Object.prototype.hasOwnProperty.call(handlers, op)) {
        logger.write(`error [personal] ${op} is taken`)
        return
      }
      registerWokeHandler(op, handler)
      personalOps.add(op)
    },
    unregister: (op) => {
      if (personalOps.delete(op)) delete handlers[op] // eslint-disable-line @typescript-eslint/no-dynamic-delete
    },
    broadcast: (topic, data) => { server.sendEventTo('broadcast', { name: 'MAIN->CLIENT::woke-event', payload: { topic, data } }) },
    logger,
    gameLog
  })
  registerWokeHandler('personal-flag', async () => personal.state())
  registerWokeHandler('personal-set', async (args) => await personal.setOn(args?.on === true))
  registerWokeHandler('experimental-set', async (args) => await personal.setUnlocked(args?.unlocked === true))

  server.onEventAnyClient('CLIENT->MAIN::woke-request', ({ id, op, args }) => {
    // Own keys only: an op like "constructor" must not reach Object.prototype.
    // The op and args come over a socket: the types in woke-ops.ts are what
    // the overlay sends, and handlers still check what they rely on.
    const handler = Object.prototype.hasOwnProperty.call(handlers, op)
      ? handlers[op] as ((args: unknown) => Promise<unknown>) | undefined
      : undefined
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
