import { BrowserWindow, dialog, shell, Menu, WebContents } from 'electron'
import { OverlayController, OVERLAY_WINDOW_OPTS } from 'electron-overlay-window'
import type { ServerEvents } from '../server'
import type { Logger } from '../RemoteLogger'
import type { GameWindow } from './GameWindow'
import { appIconFile } from '../woke/app-icon'

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
  public wasUsedRecently = true
  private window?: BrowserWindow
  private overlayKey: string = 'Shift + Space'
  private isOverlayKeyUsed = false

  constructor (
    private server: ServerEvents,
    private logger: Logger,
    private poeWindow: GameWindow,
  ) {
    this.server.onEventAnyClient('OVERLAY->MAIN::focus-game', this.assertGameActive)
    this.poeWindow.on('active-change', this.handlePoeWindowActiveChange)
    this.poeWindow.onAttach(this.handleOverlayAttached)
    // The library goes click-through whenever the game gets focus, which can
    // arrive just after the mouse moved onto an icon.
    OverlayController.events.on('focus', () => {
      if (this.isMouseTaken) this.window?.setIgnoreMouseEvents(false)
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
    this.window.webContents.on('did-attach-webview', (_, webviewWebContents) => {
      webviewWebContents.on('before-input-event', this.handleExtraCommands)
    })

    this.window.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url)
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
      this.window.loadURL(url)
      this.window.webContents.openDevTools({ mode: 'detach', activate: false })
    } else {
      this.window.loadURL(url)
    }
  }

  get isGameActive () { return this.poeWindow.isActive }

  // The mouse is over a dock icon or card: the window takes clicks while the
  // game keeps focus, so keys still reach the game.
  takeMouse = () => {
    if (this.isMouseTaken || this.isInteractable || !this.isGameActive) return
    this.isMouseTaken = true
    this.window?.setIgnoreMouseEvents(false)
  }

  giveMouse = () => {
    if (!this.isMouseTaken) return
    this.isMouseTaken = false
    if (!this.isInteractable) this.window?.setIgnoreMouseEvents(true)
  }

  assertOverlayActive = () => {
    this.isMouseTaken = false
    if (this.isCardActive) {
      // The window already has focus, so only the renderer has to find out.
      this.isCardActive = false
      this.sendFocusChange(false)
    } else if (!this.isInteractable) {
      this.isInteractable = true
      OverlayController.activateOverlay()
      this.poeWindow.isActive = false
    }
  }

  // A dock icon or card was clicked: the window takes focus too, without opening
  // the overlay: other widgets, the widget menu and the dimmed background stay away.
  assertCardActive = () => {
    if (!this.isInteractable) {
      this.isMouseTaken = false
      this.isCardActive = true
      this.isInteractable = true
      OverlayController.activateOverlay()
      this.poeWindow.isActive = false
    }
  }

  // The mouse left a clicked dock icon or card. If you tabbed to another program
  // in the meantime, the game mustn't jump back in front of it.
  releaseCard = () => {
    if (!this.isCardActive) return
    if (!this.window || this.window.isFocused() || OverlayController.targetHasFocus) {
      this.assertGameActive()
    } else {
      this.isCardActive = false
      this.isInteractable = false
      this.window.setIgnoreMouseEvents(true)
    }
  }

  assertGameActive = () => {
    if (this.isInteractable) {
      this.isCardActive = false
      this.isInteractable = false
      OverlayController.focusTarget()
      this.poeWindow.isActive = true
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

    if (shiftKey && altKey) code = `Shift + Alt + ${code}`
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
    if (!isActive) this.giveMouse()
    if (isActive && this.isInteractable) {
      this.isCardActive = false
      this.isInteractable = false
    }
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
