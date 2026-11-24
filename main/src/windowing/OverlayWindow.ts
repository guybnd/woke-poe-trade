import { BrowserWindow, dialog, shell, Menu, WebContents, screen } from 'electron'
import type { Point } from 'electron'
import { OverlayController, OVERLAY_WINDOW_OPTS } from 'electron-overlay-window'
import type { ServerEvents } from '../server'
import type { Logger } from '../RemoteLogger'
import type { GameWindow } from './GameWindow'
import { appIconFile } from '../woke/app-icon'
import { openWebLink } from '../woke/web-guard'

// The failsafe: while the window takes clicks for a dock icon or card, check the
// cursor this often, and give the clicks back to the game once it has been off
// every clickable zone this long. It only runs in that state, never in a map.
export const WATCH_MS = 500
export const RELEASE_AFTER_MS = 1500

export class OverlayWindow {
  public isInteractable = false
  // Interactable only so a hover card can be clicked: the overlay itself stays
  // closed, so the renderer isn't told about it (see assertCardActive).
  public isCardActive = false
  // Taking clicks over a dock icon or card, with the game still focused.
  public isMouseTaken = false
  // The game got focus: the hover tracker takes the mouse again if it's resting
  // on an icon, so the next click doesn't need the mouse to move first.
  public onGameActive?: () => void
  // woke: is this point (DIP) over a dock icon or card that takes clicks?
  // Set by the hover tracker, for the failsafe.
  public isOverClickZone: (p: Point) => boolean = () => false
  // The rescue hotkey forced click-through: zones may be stale, so forget them.
  public onRescue?: () => void
  // For the log when the failsafe or the hotkey steps in: the zones, the hook.
  public describeZones: () => string = () => 'no hover tracker'
  // A mouse button is held (a drag): the failsafe waits for it to come up.
  public isButtonHeld: () => boolean = () => false
  // Whether the window lets clicks through to the game, as last set.
  private clickThrough = true
  private lastState = ''
  private why = ''
  private watchTimer?: NodeJS.Timeout
  private offZoneSince = 0
  public wasUsedRecently = true
  // woke: the overlay page loaded again (a reload): what it registered is gone.
  public onPageReload?: () => void
  private window?: BrowserWindow
  private overlayKey: string = 'Shift + Space'
  private isOverlayKeyUsed = false
  // woke: keys an open panel handles while the overlay has focus.
  private panelKeys = new Set<string>()

  constructor (
    private server: ServerEvents,
    private logger: Logger,
    private poeWindow: GameWindow,
  ) {
    this.server.onEventAnyClient('OVERLAY->MAIN::focus-game', this.assertGameActive)
    this.server.onEventAnyClient('OVERLAY->MAIN::woke-panel-keys', ({ keys }) => {
      this.panelKeys = new Set(keys)
    })
    this.poeWindow.on('active-change', this.handlePoeWindowActiveChange)
    this.poeWindow.onAttach(this.handleOverlayAttached)
    // The library goes click-through whenever the game gets focus, which can
    // arrive just after the mouse moved onto an icon.
    OverlayController.events.on('focus', () => {
      if (this.isMouseTaken) this.setClickThrough(false, 'game focus, mouse still taken')
    })

    this.server.onEventAnyClient('CLIENT->MAIN::used-recently', (e) => {
      this.wasUsedRecently = e.isOverlay
    })

    if (process.argv.includes('--no-overlay')) return

    this.window = new BrowserWindow({
      icon: appIconFile('png'),
      ...OVERLAY_WINDOW_OPTS,
      width: 800,
      height: 600,
      webPreferences: {
        allowRunningInsecureContent: false,
        webviewTag: true,
        spellcheck: false
      }
    })

    this.adoptWindow(this.window)

    this.window.setMenu(Menu.buildFromTemplate([
      { role: 'editMenu' },
      { role: 'reload' },
      { role: 'toggleDevTools' }
    ]))

    // Nothing asked for focus, so Windows gave it for a click on an icon or card.
    this.window.on('focus', () => {
      if (!this.isInteractable) this.assertCardActive()
    })

    this.window.webContents.on('before-input-event', this.handleExtraCommands)
    // woke: a reload takes any open panel with it, without it saying so, and
    // its hover zones (the tracker drops them through onPageReload).
    this.window.webContents.on('did-navigate', () => {
      this.panelKeys.clear()
      this.onPageReload?.()
    })
    // woke: a crashed page can't let go of the mouse it had taken.
    this.window.webContents.on('render-process-gone', () => {
      this.forceClickThrough('overlay page crashed')
    })
    this.window.webContents.on('did-attach-webview', (_, webviewWebContents) => {
      webviewWebContents.on('before-input-event', this.handleExtraCommands)
    })

    this.window.webContents.setWindowOpenHandler((details) => {
      openWebLink((url) => shell.openExternal(url), details.url)
      return { action: 'deny' }
    })
  }

  loadAppPage (port: number) {
    const url = process.env.VITE_DEV_SERVER_URL ||
      `http://localhost:${port}/index.html`

    if (!this.window) {
      shell.openExternal(url)
      return
    }

    if (process.env.VITE_DEV_SERVER_URL) {
      // woke: Vite may not be answering yet; don't sit on an error page.
      let retries = 20
      const ERR_ABORTED = -3 // A newer load replaced this one: nothing failed.
      this.window.webContents.on('did-fail-load', (_e, code, _desc, _url, isMainFrame) => {
        if (!isMainFrame || code === ERR_ABORTED || retries-- <= 0) return
        setTimeout(() => { this.window?.loadURL(url).catch(() => {}) }, 1000)
      })
      this.window.loadURL(url)
      this.window.webContents.openDevTools({ mode: 'detach', activate: false })
    } else {
      this.window.loadURL(url)
    }
  }

  get isGameActive () { return this.poeWindow.isActive }

  get isFocused () { return this.window?.isFocused() ?? true }

  // The mouse is over a dock icon or card: the window takes clicks while the
  // game keeps focus, so keys still reach the game.
  takeMouse = () => {
    if (this.isMouseTaken || this.isInteractable || !this.isGameActive) return
    this.isMouseTaken = true
    this.setClickThrough(false, 'mouse over a dock zone')
  }

  giveMouse = (why = 'mouse left the dock zones') => {
    if (!this.isMouseTaken) return
    this.isMouseTaken = false
    if (!this.isInteractable) this.setClickThrough(true, why)
    else this.noteState(why)
  }

  assertOverlayActive = () => {
    this.why = 'overlay opened'
    this.isMouseTaken = false
    if (this.isCardActive) {
      // The window already has focus, so only the renderer has to find out.
      this.isCardActive = false
      this.sendFocusChange(false)
    } else if (!this.isInteractable) {
      this.isInteractable = true
      OverlayController.activateOverlay()
      this.mirrorLibrary(false)
      this.poeWindow.isActive = false
    }
    this.noteState('overlay opened')
  }

  // A dock icon or card was clicked: the window takes focus too, without opening
  // the overlay: other widgets, the widget menu and the dimmed background stay away.
  assertCardActive = () => {
    this.why = 'dock card clicked'
    if (!this.isInteractable) {
      this.isMouseTaken = false
      this.isCardActive = true
      this.isInteractable = true
      OverlayController.activateOverlay()
      this.mirrorLibrary(false)
      this.poeWindow.isActive = false
    }
    this.noteState('dock card clicked')
  }

  // The mouse left a clicked dock icon or card. If you tabbed to another program
  // in the meantime, the game mustn't jump back in front of it.
  releaseCard = (why = 'mouse left the dock card') => {
    if (!this.isCardActive) return
    if (!this.window || this.window.isFocused() || OverlayController.targetHasFocus) {
      this.assertGameActive(why)
    } else {
      this.isCardActive = false
      this.isInteractable = false
      this.setClickThrough(true, why)
    }
  }

  assertGameActive = (why: unknown = 'back to the game') => {
    this.why = typeof why === 'string' ? why : 'back to the game'
    if (this.isInteractable) {
      this.isCardActive = false
      this.isInteractable = false
      OverlayController.focusTarget()
      this.mirrorLibrary(true)
      this.poeWindow.isActive = true
    }
    this.noteState(this.why)
  }

  // woke: the rescue hotkey. Whatever state the window is in, clicks go back to
  // the game, and the hover zones are sent again from scratch.
  forceClickThrough = (why = 'rescue hotkey') => {
    this.logger.write(`warn [Overlay] Forcing click-through (${why}); state was ${this.describeState()}; ${this.describeZones()}`)
    this.isMouseTaken = false
    // Pull the game in front only if it or the overlay is: the key also works
    // from another program, which mustn't lose focus to the game.
    if (this.isInteractable && (this.isFocused || OverlayController.targetHasFocus)) {
      this.assertGameActive(why)
    } else {
      this.isCardActive = false
      this.isInteractable = false
    }
    this.setClickThrough(true, why)
    this.onRescue?.()
  }

  // woke: every way the window starts or stops taking clicks goes through here,
  // the library's own calls included (adoptWindow), so the log has them all.
  private setClickThrough (ignore: boolean, why: string) {
    this.why = why
    if (this.window) {
      this.window.setIgnoreMouseEvents(ignore)
    } else {
      this.clickThrough = ignore
      this.noteState(why)
    }
  }

  // With no window (tests), do what the library does to the window's clicks.
  private mirrorLibrary (ignore: boolean) {
    if (!this.window) this.clickThrough = ignore
  }

  private adoptWindow (window: Pick<BrowserWindow, 'setIgnoreMouseEvents'>) {
    const set = window.setIgnoreMouseEvents.bind(window)
    window.setIgnoreMouseEvents = (ignore: boolean, options?: Electron.IgnoreMouseEventsOptions) => {
      this.clickThrough = ignore
      set(ignore, options)
      this.noteState(this.why || 'focus change')
    }
  }

  private describeState () {
    const onOff = (b: boolean) => b ? 'on' : 'off'
    return `overlay=${onOff(this.isInteractable && !this.isCardActive)} card=${onOff(this.isCardActive)} mouseTaken=${onOff(this.isMouseTaken)} clickThrough=${onOff(this.clickThrough)}`
  }

  // Log a change of state, once, with why; and run the failsafe while it's needed.
  private noteState (why: string) {
    const state = this.describeState()
    if (state !== this.lastState) {
      this.lastState = state
      this.logger.write(`info [Overlay] ${state} (${why})`)
    }
    this.why = ''
    this.armFailsafe()
  }

  // Taking clicks without the overlay open is meant to last only while the
  // cursor is on a dock icon or card. The hover tracker ends it when the mouse
  // leaves, but only if the mouse hook still reports moves: Windows drops a hook
  // that answers too slowly, and a focus change can arrive with no zone at all.
  private armFailsafe () {
    const overlayOpen = this.isInteractable && !this.isCardActive
    const needed = !this.clickThrough && !overlayOpen
    if (needed && !this.watchTimer) {
      this.offZoneSince = 0
      this.watchTimer = setInterval(this.checkCursor, WATCH_MS)
    } else if (!needed && this.watchTimer) {
      clearInterval(this.watchTimer)
      this.watchTimer = undefined
    }
  }

  private readonly checkCursor = () => {
    // The hook reports no moves during a drag, and a drag (a slider, a resize
    // grip) can leave the zone: let go only once the button is up.
    if (this.isButtonHeld() || this.isOverClickZone(screen.getCursorScreenPoint())) {
      this.offZoneSince = 0
      return
    }
    const now = Date.now()
    if (!this.offZoneSince) {
      this.offZoneSince = now
      return
    }
    if (now - this.offZoneSince < RELEASE_AFTER_MS) return
    const why = 'failsafe: cursor off every dock zone'
    this.logger.write(`warn [Overlay] Giving clicks back to the game (${why}); state was ${this.describeState()}; ${this.describeZones()}`)
    this.giveMouse(why)
    this.releaseCard(why)
    // Neither of those applied (focus arrived with no card): let clicks through anyway.
    if (!this.clickThrough && !(this.isInteractable && !this.isCardActive)) {
      this.setClickThrough(true, why)
    }
  }

  toggleActiveState = () => {
    this.isOverlayKeyUsed = true
    if (this.isInteractable && !this.isCardActive) {
      this.assertGameActive()
    } else {
      this.assertOverlayActive()
    }
  }

  // woke: the player picked another icon.
  refreshIcon () {
    if (process.platform !== 'darwin') this.window?.setIcon(appIconFile('png'))
  }

  updateOpts (overlayKey: string, windowTitle: string) {
    this.overlayKey = overlayKey
    this.poeWindow.attach(this.window, windowTitle)
  }

  private handleExtraCommands = (event: Electron.Event, input: Electron.Input) => {
    if (input.type !== 'keyDown') return

    let { code, control: ctrlKey, shift: shiftKey, alt: altKey } = input

    if (code.startsWith('Key')) {
      code = code.slice('Key'.length)
    } else if (code.startsWith('Digit')) {
      code = code.slice('Digit'.length)
    }

    if (ctrlKey && shiftKey && altKey) code = `Ctrl + Shift + Alt + ${code}`
    else if (shiftKey && altKey) code = `Shift + Alt + ${code}`
    else if (ctrlKey && shiftKey) code = `Ctrl + Shift + ${code}`
    else if (ctrlKey && altKey) code = `Ctrl + Alt + ${code}`
    else if (altKey) code = `Alt + ${code}`
    else if (ctrlKey) code = `Ctrl + ${code}`
    else if (shiftKey) code = `Shift + ${code}`

    switch (code) {
      case 'Escape':
      case 'Ctrl + W': {
        event.preventDefault()
        process.nextTick(this.assertGameActive)
        break
      }
      case this.overlayKey: {
        event.preventDefault()
        process.nextTick(this.toggleActiveState)
        break
      }
      default: {
        if (!this.panelKeys.has(code)) break
        event.preventDefault()
        if (!input.isAutoRepeat) {
          this.server.sendEventTo('broadcast', {
            name: 'MAIN->OVERLAY::woke-panel-key',
            payload: { key: code }
          })
        }
      }
    }
  }

  private handleOverlayAttached = (hasAccess?: boolean) => {
    if (hasAccess === false) {
      this.logger.write('error [Overlay] PoE is running with administrator rights')

      dialog.showErrorBox(
        'PoE window - No access',
        // ----------------------
        'Path of Exile is running with administrator rights.\n' +
        '\n' +
        'You need to restart Woke PoE Trade with administrator rights.'
      )
    } else {
      this.server.sendEventTo('broadcast', {
        name: 'MAIN->OVERLAY::overlay-attached',
        payload: undefined
      })
    }
  }

  private handlePoeWindowActiveChange = (isActive: boolean) => {
    if (!isActive) this.giveMouse('game lost focus')
    if (isActive && this.isInteractable) {
      this.isCardActive = false
      this.isInteractable = false
    }
    this.noteState(isActive ? 'game focused' : 'game lost focus')
    this.sendFocusChange(isActive)
    if (isActive) this.onGameActive?.()
  }

  private sendFocusChange (game: boolean) {
    this.server.sendEventTo('broadcast', {
      name: 'MAIN->OVERLAY::focus-change',
      payload: {
        game,
        overlay: this.isInteractable && !this.isCardActive,
        usingHotkey: this.isOverlayKeyUsed
      }
    })
    this.isOverlayKeyUsed = false
  }
}
