import { app, BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { ServerEvents } from './server'
import type { Logger } from './RemoteLogger'
import type { UpdateInfo } from '../../ipc/types'
import type { GameWindow } from './windowing/GameWindow'
import { appPrefs, canRestartApp, onRestartWithUpdate } from './woke/app-prefs'
import {
  GAME_CLOSED_GRACE_MS, NO_AUTO_INSTALL_ARG, RECHECK_MS, VERDICT_TEXT, afterEvent, describeUpdateError,
  installVerdict, installerProblem, isGameRunning, stillClosed, type InstallVerdict, type UpdaterEvent
} from './woke/update-install'

// electron-updater keeps these protected; read only, for the checks below.
interface UpdaterInternals { installerPath?: string | null, quitAndInstallCalled?: boolean }
const internals = () => autoUpdater as unknown as UpdaterInternals

export class AppUpdater {
  private _checkedAtStartup = false
  private isRestarting = false
  private _info: UpdateInfo = { state: 'initial' }
  // woke: what the updater was doing, and towards which version, for the log.
  private stage = 'checking for updates'
  private target: string | null = null
  // woke: installing while the game is closed (update-install.ts).
  private gameAttached = false
  private gameSeenAt = Date.now()
  private recheck: ReturnType<typeof setInterval> | undefined
  private lastVerdict: InstallVerdict | 'blocked' | null = null
  // woke: the version downloaded and waiting to install. Kept apart from
  // info, so a later failed check doesn't hide it (afterEvent).
  private downloaded: string | null = null
  // woke: an install has started and the app is quitting for it.
  private quitPending = false
  // woke: an installer failed to start last run: install on quit only.
  private autoInstallBlocked = process.argv.includes(NO_AUTO_INSTALL_ARG)

  public noAutoUpdatesReason:
    Extract<UpdateInfo, { state: 'update-available' }>['noDownloadReason'] = null

  get info () { return this._info }
  set info (info: UpdateInfo) {
    this._info = info
    this.server.sendEventTo('broadcast', {
      name: 'MAIN->CLIENT::updater-state',
      payload: info
    })
  }

  constructor (
    private server: ServerEvents,
    private logger: Logger
  ) {
    // woke: every 6 hours (APT: 16); the feed is this fork's GitHub releases
    // (publish settings in electron-builder.yml).
    setInterval(this.check, 6 * 60 * 60 * 1000)

    this.server.onEventAnyClient('CLIENT->MAIN::user-action', ({ action }) => {
      if (action === 'check-for-update') {
        this.check()
      } else if (action === 'update-and-restart') {
        // woke: quitting now waits for a save, so a second click can land before
        // it's done, and would start the installer twice.
        if (this.isRestarting || !this.downloaded) return
        if (!this.installerOk()) return
        this.isRestarting = true
        this.logger.write(`info [AppUpdater] Installing ${this.downloaded}: asked from the overlay.`)
        this.install(false, false)
      }
    })

    // woke: electron-updater's own steps (feed, download, installer) in the
    // app's log. Its errors come with the stack.
    autoUpdater.logger = {
      info: (m?: unknown) => { this.logger.write(`info [AppUpdater] ${String(m)}`) },
      warn: (m?: unknown) => { this.logger.write(`warn [AppUpdater] ${String(m)}`) },
      error: (m?: unknown) => { this.logger.write(`error [AppUpdater] ${String(m)}`) },
      debug: () => {}
    }

    // https://www.electron.build/configuration/nsis.html#portable
    autoUpdater.autoDownload = !process.env.PORTABLE_EXECUTABLE_DIR

    if (!autoUpdater.autoDownload || process.platform === 'darwin') {
      this.noAutoUpdatesReason = 'not-supported'
    } else if (process.argv.includes('--no-updates') || !appPrefs().autoUpdate) {
      // woke: also off when the player turned automatic updates off in setup.
      autoUpdater.autoDownload = false
      this.noAutoUpdatesReason = 'disabled-by-flag'
    }

    autoUpdater.on('checking-for-update', () => {
      if (!this.apply({ type: 'checking' })) return
      this.stage = 'checking for updates'
      this.info = { state: 'checking-for-update' }
    })
    autoUpdater.on('update-available', (info: { version: string }) => {
      if (!this.apply({ type: 'available', version: info.version })) return
      this.target = info.version
      if (autoUpdater.autoDownload) this.stage = 'downloading'
      this.info = { state: 'update-available', version: info.version, noDownloadReason: this.noAutoUpdatesReason }
    })
    autoUpdater.on('update-not-available', () => {
      if (!this.apply({ type: 'not-available' })) return
      this.info = { state: 'update-not-available', checkedAt: Date.now() }
    })
    autoUpdater.on('error', (err: Error) => {
      const installing = this.stage === 'installing'
      this.logger.write(`error [AppUpdater] ${describeUpdateError(err, this.stage, app.getVersion(), this.target)}`)
      if (installing) this.installFailed()
      if (!this.apply({ type: 'error', installing })) {
        // A failed check: the downloaded update is still there to install.
        this.stage = 'waiting to install'
        return
      }
      this.info = { state: 'error', checkedAt: Date.now() }
    })
    autoUpdater.on('update-downloaded', (info: { version: string }) => {
      this.downloaded = info.version
      this.target = info.version
      this.stage = 'waiting to install'
      this.info = { state: 'update-downloaded', version: info.version }
      this.waitForGameClosed()
    })
    // A restart asked for in Settings or the tray installs the update and
    // starts the new version, instead of racing the installer.
    // An installer that can't be read means a plain restart instead.
    onRestartWithUpdate(() => {
      if (!this.downloaded) return false
      if (this.isRestarting) return true
      if (!this.installerOk()) return false
      this.isRestarting = true
      this.logger.write(`info [AppUpdater] Installing ${this.downloaded}: restart asked for.`)
      this.install(true, true)
      return true
    })
    // on('download-progress') https://github.com/electron-userland/electron-builder/issues/2521
  }

  // woke: the setup window's "Install updates automatically" switch.
  setAutoDownload (on: boolean) {
    if (this.noAutoUpdatesReason === 'not-supported' || process.argv.includes('--no-updates')) return
    autoUpdater.autoDownload = on
    this.noAutoUpdatesReason = on ? null : 'disabled-by-flag'
  }

  // woke: the game window, the quick signal that the game is open. The process
  // check below still runs, since the window is only found by its title.
  watchGame (poeWindow: GameWindow) {
    poeWindow.onAttach(() => {
      this.gameAttached = true
      this.gameSeenAt = Date.now()
    })
    poeWindow.onDetach(() => {
      this.gameAttached = false
      this.gameSeenAt = Date.now()
      if (this.downloaded) {
        setTimeout(() => { void this.tryInstall() }, GAME_CLOSED_GRACE_MS + 5_000)
      }
    })
  }

  // Applies an updater event to the waiting download; false when the event
  // mustn't replace what the overlay shows (the update is still ready).
  private apply (ev: UpdaterEvent): boolean {
    const next = afterEvent(this.downloaded, ev)
    if (this.downloaded && !next.downloaded) {
      this.logger.write(`info [AppUpdater] ${this.downloaded} no longer waits to install.`)
      this.stopWaiting()
    }
    this.downloaded = next.downloaded
    return next.show
  }

  private installerOk (): boolean {
    const problem = installerProblem(internals().installerPath)
    if (problem) this.logger.write(`error [AppUpdater] Not installing ${this.downloaded ?? 'the update'}: ${problem}.`)
    return problem == null
  }

  // electron-updater spawns the installer without waiting and quits right
  // away, so a failed spawn arrives as an error while the app is quitting.
  private install (silent: boolean, runAfter: boolean) {
    this.stage = 'installing'
    this.quitPending = false
    try {
      autoUpdater.quitAndInstall(silent, runAfter)
    } catch (e) {
      this.logger.write(`error [AppUpdater] ${describeUpdateError(e, this.stage, app.getVersion(), this.target)}`)
    }
    // Set only once the installer has been started; a refusal before that
    // (no installer) doesn't quit.
    this.quitPending = internals().quitAndInstallCalled === true
    if (!this.quitPending) this.isRestarting = false
  }

  // The installer didn't start. If the app is already quitting for it, start
  // the app again (no installer runs, so nothing races it), without automatic
  // installs this time, so a blocked installer can't loop.
  private installFailed () {
    this.logger.write(`error [AppUpdater] The installer didn't start: ${internals().installerPath ?? 'no installer path'}`)
    this.isRestarting = false
    if (this.quitPending && canRestartApp()) {
      this.logger.write('info [AppUpdater] Starting the app again without the update.')
      const args = process.argv.slice(1).filter(a => a !== NO_AUTO_INSTALL_ARG)
      app.relaunch({ args: [...args, NO_AUTO_INSTALL_ARG] })
    }
    this.quitPending = false
  }

  private waitForGameClosed () {
    if (this.recheck) return
    this.recheck = setInterval(() => { void this.tryInstall() }, RECHECK_MS)
    void this.tryInstall()
  }

  // Installs a downloaded update if the game is closed and nobody is using the
  // overlay; otherwise logs why not (once per reason) and waits.
  private tryInstall = async () => {
    if (!this.downloaded || this.isRestarting) return
    if (this.autoInstallBlocked) {
      this.logVerdict('blocked')
      return
    }
    const gameRunning = this.gameAttached ? true : await isGameRunning()
    if (gameRunning !== false) this.gameSeenAt = Date.now()
    const verdict = installVerdict({
      updateReady: this.downloaded != null,
      autoUpdate: autoUpdater.autoDownload,
      canRestart: canRestartApp(),
      installing: this.isRestarting,
      gameRunning,
      gameSeenAt: this.gameSeenAt,
      appFocused: BrowserWindow.getFocusedWindow() != null,
      now: Date.now()
    })
    this.logVerdict(verdict)
    if (verdict !== 'install') return
    // Once more, right before: the game may have started in the meantime.
    const again = await isGameRunning()
    if (!stillClosed(gameRunning, again, this.gameAttached)) {
      this.gameSeenAt = Date.now()
      this.logVerdict('game-running')
      return
    }
    if (!this.downloaded || this.isRestarting) return
    this.stopWaiting()
    // Left for the next normal start (or quit), which checks again.
    if (!this.installerOk()) return
    this.isRestarting = true
    this.logger.write(`info [AppUpdater] Installing ${this.downloaded}: Path of Exile is closed.`)
    this.install(true, true)
  }

  private stopWaiting () {
    clearInterval(this.recheck)
    this.recheck = undefined
  }

  private logVerdict (verdict: InstallVerdict | 'blocked') {
    if (verdict === this.lastVerdict) return
    this.lastVerdict = verdict
    const text = verdict === 'blocked'
      ? 'the installer failed to start last time, installs on quit'
      : VERDICT_TEXT[verdict]
    this.logger.write(`info [AppUpdater] ${this.downloaded ?? 'Update'} downloaded: ${text}.`)
  }

  checkAtStartup () {
    if (!this._checkedAtStartup) {
      this._checkedAtStartup = true
      this.check()
    }
  }

  private check = async () => {
    try {
      await autoUpdater.checkForUpdates()
    } catch {
      // handled by event
    }
  }
}
