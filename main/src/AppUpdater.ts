import { app, BrowserWindow, net } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { ServerEvents } from './server'
import type { Logger } from './RemoteLogger'
import type { UpdateInfo } from '../../ipc/types'
import type { GameWindow } from './windowing/GameWindow'
import { appPrefs, canRestartApp, onPlainQuit, onRestartWithUpdate } from './woke/app-prefs'
import {
  GAME_CLOSED_GRACE_MS, NO_AUTO_INSTALL_ARG, RECHECK_MS, VERDICT_TEXT, afterEvent, describeUpdateError,
  installGate, installVerdict, installerLogFailure, installerProblem, isGameRunning, isSpawnFailure, quitInstallAllowed, relaunchArgs, stillClosed,
  type InstallVerdict, type UpdaterEvent
} from './woke/update-install'
import { Rollback, clearUpdateNote, isSkipped, takeUpdateNote, trayEntry, writeUpdateNote } from './woke/rollback'
import type { WokeRollbackState, WokeUpdateCheck } from '../../ipc/woke-ops'
import { checkLatestRelease, fromUpdaterInfo } from './woke/update-check'

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
  // woke: the player's automatic updates (setup, --no-updates, portable).
  // autoUpdater.autoDownload is this, except while a version is skipped:
  // then each newer version is downloaded by hand (onAvailable).
  private autoWanted = false
  private loggedSkip: string | null = null
  // woke: a plain restart was chosen; nothing installs on this quit.
  private plainRestart = false
  // woke: going back to the previous release (rollback.ts).
  readonly rollback: Rollback
  // woke: the tray's notifications and menu (set in main.ts).
  notify: (title: string, body: string) => void = () => {}
  onTrayChange: () => void = () => {}

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
        if (!this.downloaded || !this.gate('update')) return
        if (!this.installerOk()) return
        this.isRestarting = true
        this.logger.write(`info [AppUpdater] Installing ${this.downloaded}: asked from the overlay.`)
        this.install(false, false)
      }
    })

    // woke: electron-updater's own steps (feed, download, installer) in the
    // app's log. Its errors come with the stack.
    autoUpdater.logger = {
      info: (m?: unknown) => {
        this.logger.write(`info [AppUpdater] ${String(m)}`)
        if (this.stage === 'installing' && installerLogFailure(String(m))) this.installFailed()
      },
      warn: (m?: unknown) => { this.logger.write(`warn [AppUpdater] ${String(m)}`) },
      error: (m?: unknown) => { this.logger.write(`error [AppUpdater] ${String(m)}`) },
      debug: () => {}
    }

    // https://www.electron.build/configuration/nsis.html#portable
    this.autoWanted = !process.env.PORTABLE_EXECUTABLE_DIR

    if (!this.autoWanted || process.platform === 'darwin') {
      this.noAutoUpdatesReason = 'not-supported'
    } else if (process.argv.includes('--no-updates') || !appPrefs().autoUpdate) {
      // woke: also off when the player turned automatic updates off in setup.
      this.autoWanted = false
      this.noAutoUpdatesReason = 'disabled-by-flag'
    }

    this.rollback = new Rollback(
      (line) => { this.logger.write(line) },
      () => { this.rollbackChanged() },
      canRestartApp() && !process.env.PORTABLE_EXECUTABLE_DIR
    )
    this.applyAutoDownload()
    // A rollback waiting for the game to close installs on quit too, like an update.
    // Registered before electron-updater's own quit handler (added at the first
    // download), so this runs first: install-on-quit is settled here, at the
    // moment of quitting, and never runs alongside a rollback's installer.
    app.once('quit', () => {
      this.syncQuitInstall()
      if (this.rollback.readyFile && !this.isRestarting && !this.plainRestart) void this.rollback.install(false)
    })

    autoUpdater.on('checking-for-update', () => {
      if (!this.apply({ type: 'checking' })) return
      this.stage = 'checking for updates'
      this.info = { state: 'checking-for-update' }
    })
    autoUpdater.on('update-available', (info: { version: string }) => {
      // woke: the version gone back from (and older) stays skipped.
      const skip = this.rollback.skipped
      if (isSkipped(info.version, skip)) {
        if (this.loggedSkip !== info.version) {
          this.loggedSkip = info.version
          this.logger.write(`info [AppUpdater] Skipping ${info.version}: went back from it.`)
        }
        if (!this.downloaded) this.info = { state: 'update-not-available', checkedAt: Date.now() }
        return
      }
      if (!this.apply({ type: 'available', version: info.version })) return
      this.target = info.version
      if (this.autoWanted) this.stage = 'downloading'
      this.info = { state: 'update-available', version: info.version, noDownloadReason: this.noAutoUpdatesReason }
      // Newer than the skipped version: downloads as usual, started here
      // since autoDownload is off while skipping.
      if (skip && this.autoWanted) autoUpdater.downloadUpdate().catch(() => {})
    })
    autoUpdater.on('update-not-available', () => {
      if (!this.apply({ type: 'not-available' })) return
      this.info = { state: 'update-not-available', checkedAt: Date.now() }
    })
    autoUpdater.on('error', (err: Error) => {
      const failedInstall = this.stage === 'installing' && isSpawnFailure(err, internals().installerPath)
      this.logger.write(`error [AppUpdater] ${describeUpdateError(err, this.stage, app.getVersion(), this.target)}`)
      if (failedInstall) this.installFailed()
      if (!this.apply({ type: 'error', installing: failedInstall })) {
        // A failed check: the downloaded update is still there to install.
        if (!this.quitPending) this.stage = 'waiting to install'
        return
      }
      this.info = { state: 'error', checkedAt: Date.now() }
    })
    autoUpdater.on('update-downloaded', (info: { version: string }) => {
      this.downloaded = info.version
      // On while electron-updater registers its quit handler, right after
      // this event; then settled (off while a rollback is under way). The
      // quit listener above settles it again at the moment of quitting.
      autoUpdater.autoInstallOnAppQuit = true
      setImmediate(() => { this.syncQuitInstall() })
      this.target = info.version
      this.stage = 'waiting to install'
      this.info = this.downloadedInfo(info.version)
      this.waitForGameClosed()
    })
    // A restart asked for in Settings or the tray installs the update and
    // starts the new version, instead of racing the installer.
    // An installer that can't be read means a plain restart instead, with
    // install-on-quit off so electron-updater can't start it under the new copy.
    onRestartWithUpdate(() => {
      if (this.rollback.readyFile) {
        if (this.isRestarting) return true
        this.isRestarting = true
        this.logger.write('info [AppUpdater] Going back: restart asked for.')
        void this.installRollback(true).then((ok) => {
          if (ok) return
          // A plain restart: nothing may install under the new copy, and
          // tryInstall must not start anything while it quits.
          this.isRestarting = true
          this.plainRestart = true
          this.syncQuitInstall()
          app.relaunch({ args: relaunchArgs(process.argv, false) })
          app.quit()
        })
        return true
      }
      if (this.isRestarting) return true
      // No update, or a rollback still downloading: a plain restart.
      if (!this.downloaded || !this.gate('update')) {
        this.isRestarting = true
        this.plainRestart = true
        this.syncQuitInstall()
        return false
      }
      if (!this.installerOk()) {
        this.isRestarting = true
        this.plainRestart = true
        this.syncQuitInstall()
        return false
      }
      this.isRestarting = true
      this.logger.write(`info [AppUpdater] Installing ${this.downloaded}: restart asked for.`)
      this.install(true, true)
      return true
    })
    // An elevated copy takes over (run-as-admin.ts): quit without installing.
    // It installs on its own quit instead.
    onPlainQuit(() => {
      this.isRestarting = true
      this.plainRestart = true
      this.syncQuitInstall()
    })
    // on('download-progress') https://github.com/electron-userland/electron-builder/issues/2521
  }

  // woke: the setup window's "Install updates automatically" switch.
  setAutoDownload (on: boolean) {
    if (this.noAutoUpdatesReason === 'not-supported' || process.argv.includes('--no-updates')) return
    this.autoWanted = on
    this.applyAutoDownload()
    this.noAutoUpdatesReason = on ? null : 'disabled-by-flag'
    if (this.downloaded && this._info.state === 'update-downloaded') this.info = this.downloadedInfo(this.downloaded)
  }

  // electron-updater installs the downloaded update on quit only with this on.
  // Never while a rollback is under way: two installers would run at once.
  private syncQuitInstall () {
    autoUpdater.autoInstallOnAppQuit = quitInstallAllowed({
      downloaded: this.downloaded != null,
      rollbackActive: this.rollback.active,
      plainRestart: this.plainRestart
    })
  }

  // Update notice E: what the overlay says about a downloaded update. It only
  // installs by itself while the game is closed when automatic updates are on
  // and this run may install by itself; otherwise it says "when you quit".
  private downloadedInfo (version: string): UpdateInfo {
    return {
      state: 'update-downloaded',
      version,
      whenClosed: this.autoWanted && !this.autoInstallBlocked && canRestartApp(),
      // Restart now / Install now are hidden while going back.
      blocked: this.rollback.active
    }
  }

  private gate (job: 'update' | 'rollback'): boolean {
    const open = installGate({ job, restarting: this.isRestarting, plainRestart: this.plainRestart, rollbackActive: this.rollback.active })
    if (!open && job === 'update' && this.rollback.active && !this.isRestarting) {
      this.logger.write('info [AppUpdater] Not installing the update: going back to the previous version.')
    }
    return open
  }

  private applyAutoDownload () {
    autoUpdater.autoDownload = this.autoWanted && !this.rollback.skipped
  }

  // woke: update notice E. Once, on the first start after an update that
  // installed by itself.
  showUpdateNote () {
    const version = takeUpdateNote(app.getVersion())
    if (version) this.notify(`Updated to ${version}`, 'Installed while Path of Exile was closed. Release notes are in Settings › About.')
  }

  // ---------- Going back (Settings › About, tray) ----------

  async rollbackState (): Promise<WokeRollbackState> {
    await this.rollback.refresh()
    return this.rollback.state
  }

  startRollback (fromTray = false): WokeRollbackState {
    const target = this.rollback.previous
    const current = app.getVersion()
    if (fromTray && target) this.notify(`Going back to ${target}`, `Installs when Path of Exile is closed. ${current} will be skipped.`)
    void this.rollback.start().then(() => {
      const s = this.rollback.state
      if (s.phase === 'failed') this.notify(`Couldn't go back to ${s.target ?? 'the previous version'}`, s.error ?? '')
    })
    return this.rollback.state
  }

  cancelRollback (): WokeRollbackState {
    this.rollback.cancel()
    return this.rollback.state
  }

  undoSkip (): WokeRollbackState {
    this.rollback.undoSkip()
    this.check()
    return this.rollback.state
  }

  // The tray's entry: "Go back to X" or "Stop going back to X".
  trayRollbackItem (): { label: string, click: () => void } | null {
    const entry = trayEntry(this.rollback.state)
    if (!entry) return null
    return {
      label: entry.label,
      click: () => { if (entry.action === 'cancel') this.cancelRollback(); else this.startRollback(true) }
    }
  }

  private rollbackChanged () {
    this.applyAutoDownload()
    const ready = this.rollback.readyFile != null
    this.syncQuitInstall()
    if (this.downloaded && this._info.state === 'update-downloaded' && this._info.blocked !== this.rollback.active) {
      this.info = this.downloadedInfo(this.downloaded)
    }
    this.server.sendEventTo('broadcast', {
      name: 'MAIN->CLIENT::woke-event',
      payload: { topic: 'rollback-state', data: this.rollback.state }
    })
    this.onTrayChange()
    if (ready) this.waitForGameClosed()
  }

  // Starts the rollback's installer and quits; false (and the app keeps
  // running) when it didn't start.
  private async installRollback (runAfter: boolean): Promise<boolean> {
    this.stopWaiting()
    this.syncQuitInstall()
    const ok = await this.rollback.install(runAfter)
    if (ok) {
      app.quit()
      return true
    }
    this.isRestarting = false
    const s = this.rollback.state
    this.notify(`Couldn't go back to ${s.target ?? 'the previous version'}`, s.error ?? '')
    this.syncQuitInstall()
    if (this.downloaded) this.waitForGameClosed()
    return false
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
      if (this.downloaded || this.rollback.readyFile) {
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
      if (!this.rollback.readyFile) this.stopWaiting()
    }
    this.downloaded = next.downloaded
    // Nor on quit: a pulled release, a failed install. A newer download turns it back on.
    this.syncQuitInstall()
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
    if (!this.quitPending) {
      this.isRestarting = false
      this.stage = this.downloaded ? 'waiting to install' : 'checking for updates'
    }
  }

  // The installer didn't start: a spawn error event, or electron-updater's
  // ENOENT log line (installerLogFailure). An EACCES/UNKNOWN start is retried
  // through elevate.exe and counts only if that spawn fails too; a UAC prompt
  // the player declines can't be seen from here, and leaves the app closed.
  // If the app is already quitting for it, start
  // the app again (no installer runs, so nothing races it), without automatic
  // installs this time, so a blocked installer can't loop.
  private installFailed () {
    if (!this.quitPending && !this.isRestarting) return
    this.logger.write(`error [AppUpdater] The installer didn't start: ${internals().installerPath ?? 'no installer path'}`)
    if (this.quitPending) {
      // The app is quitting: it stays "restarting", and as a plain restart
      // nothing else (a rollback's installer on quit, tryInstall) starts
      // under the relaunched copy.
      this.plainRestart = true
      this.syncQuitInstall()
      if (canRestartApp()) {
        this.logger.write('info [AppUpdater] Starting the app again without the update.')
        app.relaunch({ args: relaunchArgs(process.argv, true) })
      }
    } else {
      this.isRestarting = false
    }
    this.quitPending = false
  }

  private waitForGameClosed () {
    if (this.recheck) return
    this.recheck = setInterval(() => { void this.tryInstall() }, RECHECK_MS)
    void this.tryInstall()
  }

  // Installs a waiting rollback (first) or downloaded update if the game is
  // closed and nobody is using the overlay; otherwise logs why not (once per
  // reason) and waits.
  private tryInstall = async () => {
    if (this.isRestarting || this.plainRestart) return
    const job = this.rollback.readyFile ? 'rollback' : this.downloaded ? 'update' : null
    if (!job || !installGate({ job, restarting: this.isRestarting, plainRestart: this.plainRestart, rollbackActive: this.rollback.active })) return
    if (job === 'update' && this.autoInstallBlocked) {
      this.logVerdict('blocked')
      return
    }
    const gameRunning = this.gameAttached ? true : await isGameRunning()
    if (gameRunning !== false) this.gameSeenAt = Date.now()
    const verdict = installVerdict({
      updateReady: true,
      // A rollback was asked for by the player.
      autoUpdate: job === 'rollback' || this.autoWanted,
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
    if (!installGate({ job, restarting: this.isRestarting, plainRestart: this.plainRestart, rollbackActive: this.rollback.active })) return
    if (job === 'rollback') {
      if (!this.rollback.readyFile) return
      this.isRestarting = true
      this.logger.write(`info [AppUpdater] Going back to ${this.rollback.state.target ?? ''}: Path of Exile is closed.`)
      await this.installRollback(true)
      return
    }
    if (!this.downloaded) return
    this.stopWaiting()
    // Left for the next normal start (or quit), which checks again.
    if (!this.installerOk()) return
    this.isRestarting = true
    this.logger.write(`info [AppUpdater] Installing ${this.downloaded}: Path of Exile is closed.`)
    // Update notice E: "Updated to X" on the next start, if it ran.
    writeUpdateNote(this.downloaded)
    this.install(true, true)
    if (!this.quitPending) clearUpdateNote()
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
    const what = this.rollback.readyFile ? `Going back to ${this.rollback.state.target ?? ''}` : `${this.downloaded ?? 'Update'} downloaded`
    this.logger.write(`info [AppUpdater] ${what}: ${text}.`)
  }

  checkAtStartup () {
    if (!this._checkedAtStartup) {
      this._checkedAtStartup = true
      this.check()
    }
  }

  // woke: "Check for updates". An installed build asks electron-updater now
  // (its events set info); a portable or development build, which updates by
  // hand, asks GitHub for the latest release.
  async checkNow (): Promise<WokeUpdateCheck> {
    const current = app.getVersion()
    if (!app.isPackaged || this.noAutoUpdatesReason === 'not-supported') {
      return await checkLatestRelease(current, async (url, init) => await net.fetch(url, init))
    }
    await this.check()
    // The version this check skipped, while it is still skipped.
    const skipped = this.loggedSkip != null && isSkipped(this.loggedSkip, this.rollback.skipped) ? this.loggedSkip : null
    return fromUpdaterInfo(this._info, current, skipped)
  }

  private check = async () => {
    try {
      await autoUpdater.checkForUpdates()
    } catch {
      // handled by event
    }
    // woke: what "Go back to X" offers.
    await this.rollback.refresh(true)
  }
}
