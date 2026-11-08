'use strict'

// woke: must stay the first import (pins the data folder, migrates old data).
import './woke/user-data'
import { app, powerMonitor, session, shell } from 'electron'
import { uIOhook } from 'uiohook-napi'
import os from 'node:os'
import { startServer, eventPipe, httpRoutes, configFlushed } from './server'
import { Logger } from './RemoteLogger'
import { GameWindow } from './windowing/GameWindow'
import { OverlayWindow } from './windowing/OverlayWindow'
import { GameConfig } from './host-files/GameConfig'
import { Shortcuts } from './shortcuts/Shortcuts'
import { AppUpdater } from './AppUpdater'
import { AppTray, DEFAULT_OVERLAY_KEY } from './AppTray'
import { OverlayVisibility } from './windowing/OverlayVisibility'
import { GameLogWatcher } from './host-files/GameLogWatcher'
import { HttpProxy } from './proxy'
import { initWoke, initWokeOverlay, registerWokeHandler } from './woke'
import { gameFilterSetting } from './woke/neversink'
import { perfMark } from './woke/perf'
import { startCrashReporting, attachCrashLogger } from './woke/crash-reports'
import { initSetup, maybeOpenSetup, openSetupWindow, refreshSetupIcon, savedAppIcon } from './woke/setup'
import { setAppIcon } from './woke/app-icon'
import { saveBeforeQuit } from './woke/quit-flush'
import { guardWebContents } from './woke/web-guard'

if (!app.requestSingleInstanceLock()) {
  app.exit()
}

// woke: crash reports (saved locally, offered for reporting next launch).
startCrashReporting()

if (process.platform !== 'darwin') {
  app.disableHardwareAcceleration()
}
app.enableSandbox()

saveBeforeQuit(eventPipe, configFlushed)

let tray: AppTray | undefined

app.on('second-instance', () => { tray?.notifyAlreadyRunning() })

app.on('ready', async () => {
  perfMark('app ready')
  // woke: before any window: webviews locked down, links only to the browser.
  guardWebContents(app, session.defaultSession, (url) => shell.openExternal(url))
  setAppIcon(savedAppIcon())
  const appTray = new AppTray(eventPipe)
  tray = appTray
  const logger = new Logger(eventPipe)
  attachCrashLogger(logger)
  const gameLogWatcher = new GameLogWatcher(eventPipe, logger)
  const gameConfig = new GameConfig(eventPipe, logger)
  const poeWindow = new GameWindow()
  const appUpdater = new AppUpdater(eventPipe, logger)
  const _httpProxy = new HttpProxy(httpRoutes, logger)
  initWoke(eventPipe, logger, poeWindow, gameLogWatcher)
  registerWokeHandler('game-binds', async () => gameConfig.binds)
  // woke: what the tray says, and the one thing a player has to change themselves.
  let warnedFullscreen = false
  poeWindow.onAttach((hasAccess) => {
    appTray.setStatus(hasAccess === false ? 'needs-admin' : 'attached')
    gameConfig.refresh().then(() => {
      if (!gameConfig.isExclusiveFullscreen || warnedFullscreen) return
      warnedFullscreen = true
      appTray.notify('The overlay can\'t show over this game', 'Path of Exile is in Fullscreen. Switch to Windowed Fullscreen in its Options, under Graphics.')
    }).catch(() => {})
  })
  poeWindow.onDetach(() => { appTray.setStatus('waiting') })
  // Says it worked only once the page has actually taken the new key.
  let resetWaiting: ReturnType<typeof setTimeout> | undefined
  eventPipe.onEventAnyClient('CLIENT->MAIN::update-host-config', (cfg) => {
    if (!resetWaiting || cfg.overlayKey !== DEFAULT_OVERLAY_KEY) return
    clearTimeout(resetWaiting)
    resetWaiting = undefined
    appTray.notify('Overlay key reset', `Press ${DEFAULT_OVERLAY_KEY} in game to open the overlay.`)
  })
  appTray.onResetOverlayKey = () => {
    clearTimeout(resetWaiting)
    resetWaiting = setTimeout(() => {
      resetWaiting = undefined
      appTray.notify('Overlay key not reset', 'The overlay isn\'t responding. Quit and start the app again, then try this again.')
    }, 3000)
    eventPipe.sendEventTo('broadcast', { name: 'MAIN->CLIENT::woke-event', payload: { topic: 'reset-overlay-key', data: { key: DEFAULT_OVERLAY_KEY } } })
  }
  registerWokeHandler('game-filter', async () => await gameFilterSetting(gameConfig.actualPath))
  initSetup(appUpdater)
  appTray.onRunSetup = openSetupWindow

  setTimeout(
    async () => {
      const overlay = new OverlayWindow(eventPipe, logger, poeWindow)
      perfMark('overlay window created')
      new OverlayVisibility(eventPipe, overlay, gameConfig)
      initWokeOverlay(eventPipe, overlay)
      const shortcuts = await Shortcuts.create(logger, overlay, poeWindow, gameConfig, eventPipe)
      perfMark('hotkeys ready')
      eventPipe.onEventAnyClient('CLIENT->MAIN::update-host-config', (cfg) => {
        overlay.updateOpts(cfg.overlayKey, cfg.windowTitle)
        shortcuts.updateActions(cfg.shortcuts, cfg.stashScroll, cfg.logKeys, cfg.restoreClipboard, cfg.language)
        if (cfg.wokeGameLog === false) gameLogWatcher.stop()
        else gameLogWatcher.restart(cfg.clientLog ?? '')
        gameConfig.readConfig(cfg.gameConfig ?? '')
        appUpdater.checkAtStartup()
        appTray.overlayKey = cfg.overlayKey
        if (setAppIcon(cfg.appIcon)) {
          appTray.refreshIcon()
          overlay.refreshIcon()
          refreshSetupIcon()
        }
      })
      uIOhook.start()
      // woke: after sleep the keyboard and mouse hook can be dead, which stops
      // the dock, Alt to hide and everything else watching input.
      const restartHook = (triesLeft: number) => {
        try {
          uIOhook.stop()
          uIOhook.start()
        } catch (e) {
          logger.write(`error [main] Couldn't restart the input hook: ${String(e)}`)
          if (triesLeft > 0) setTimeout(() => { restartHook(triesLeft - 1) }, 5000)
        }
      }
      powerMonitor.on('resume', () => {
        logger.write('info [main] Back from sleep, restarting the input hook.')
        restartHook(3)
      })
      const port = await startServer(appUpdater, logger)
      perfMark('server listening')
      // TODO: move up (currently crashes)
      logger.write(`info ${os.type()} ${os.release} / v${app.getVersion()}`)
      overlay.loadAppPage(port)
      perfMark('overlay page requested')
      appTray.serverPort = port
      maybeOpenSetup(port)
    },
    // fixes(linux): window is black instead of transparent
    process.platform === 'linux' ? 1000 : 0
  )
})
