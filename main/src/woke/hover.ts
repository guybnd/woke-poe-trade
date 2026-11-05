// Hover zones for woke widgets. While the game has focus the overlay window is
// click-through, so the renderer never sees mouse hover. Widgets register
// screen rects here; we watch the global mouse and tell them when it enters
// or leaves. A zone marked `activate` also takes the mouse while it's over the
// zone, so clicks land there instead of in the game. The game keeps the keyboard
// until such a click, and gets it back when the mouse leaves. None of this opens
// the overlay: see OverlayWindow.assertCardActive.
import { powerMonitor, screen } from 'electron'
import type { Rectangle } from 'electron'
import { uIOhook } from 'uiohook-napi'
import type { UiohookMouseEvent } from 'uiohook-napi'
import type { ServerEvents } from '../server'
import type { OverlayWindow } from '../windowing/OverlayWindow'

const LEFT_BUTTON = 1
const RIGHT_BUTTON = 2

interface Zone {
  id: string
  // Where the overlay said it is, and the same in screen pixels. Kept apart so
  // a display change can convert it again.
  dip: Rectangle
  rect: Rectangle
  activate: boolean
  inside?: boolean
}

export class WokeHoverTracker {
  private zones = new Map<string, Zone[]>()
  // All zones in one array, rebuilt when zones change, so the mousemove
  // handler (hundreds of calls a second with a gaming mouse) allocates nothing.
  private flat: Zone[] = []
  private listening = false
  // Holding a button means moving or casting: don't catch the mouse then.
  private heldButtons = new Set<unknown>()
  private mouseX: number | null = null
  private mouseY = 0

  constructor (
    private server: ServerEvents,
    private overlay: OverlayWindow
  ) {
    this.overlay.onGameActive = () => {
      if (this.listening && this.mouseX != null) this.update(this.mouseX, this.mouseY)
    }
    this.server.onEventAnyClient('OVERLAY->MAIN::woke-hover-zones', ({ owner, zones }) => {
      const prev = this.zones.get(owner) ?? []
      const converted: Zone[] = zones.map(z => {
        const dip = { x: z.x, y: z.y, width: z.width, height: z.height }
        return {
          id: z.id,
          activate: Boolean(z.activate),
          dip,
          rect: toScreenRect(dip),
          inside: prev.find(p => p.id === z.id)?.inside ?? false
        }
      })
      for (const p of prev) {
        if (p.inside && !converted.some(z => z.id === p.id)) this.emit(p.id, false)
      }
      if (converted.length) this.zones.set(owner, converted)
      else this.zones.delete(owner)
      this.flat = [...this.zones.values()].flat()
      this.updateListening()
      // A zone can appear or vanish under a mouse that isn't moving.
      if (this.listening && this.mouseX != null) this.update(this.mouseX, this.mouseY)
      // A reloaded overlay reuses zone ids and starts out thinking the mouse is
      // elsewhere. The mouse won't enter again, so tell it.
      for (const zone of converted) {
        if (zone.inside) this.emit(zone.id, true)
      }
    })
    // The same zone is somewhere else in screen pixels after a scale change.
    const convertAgain = () => {
      for (const zone of this.flat) zone.rect = toScreenRect(zone.dip)
      if (this.listening && this.mouseX != null) this.update(this.mouseX, this.mouseY)
    }
    screen.on('display-metrics-changed', convertAgain)
    screen.on('display-added', convertAgain)
    screen.on('display-removed', convertAgain)
    // A button let go while the hook was down would keep the dock from ever
    // catching the mouse again.
    powerMonitor.on('resume', () => { this.heldButtons.clear() })
    // A button on a card opened something that needs the real overlay (settings).
    this.server.onEventAnyClient('OVERLAY->MAIN::woke-open-overlay', () => {
      this.overlay.assertOverlayActive()
    })
  }

  private updateListening () {
    const want = this.zones.size > 0
    if (want && !this.listening) {
      uIOhook.addListener('mousemove', this.handleMouseMove)
      uIOhook.addListener('mousedown', this.handleMouseDown)
      uIOhook.addListener('mouseup', this.handleMouseUp)
      this.listening = true
    } else if (!want && this.listening) {
      uIOhook.removeListener('mousemove', this.handleMouseMove)
      uIOhook.removeListener('mousedown', this.handleMouseDown)
      uIOhook.removeListener('mouseup', this.handleMouseUp)
      this.listening = false
      this.heldButtons.clear()
      this.mouseX = null
      this.overlay.giveMouse()
      this.overlay.releaseCard()
    }
  }

  private update (x: number, y: number) {
    this.mouseX = x
    this.mouseY = y
    let inActivateZone = false
    for (const zone of this.flat) {
      const inside = contains(zone.rect, x, y)
      if (inside !== zone.inside) {
        zone.inside = inside
        this.emit(zone.id, inside)
      }
      if (inside && zone.activate) inActivateZone = true
    }

    if (!inActivateZone) {
      this.overlay.giveMouse()
      this.overlay.releaseCard()
    } else if (this.heldButtons.size === 0) {
      this.overlay.takeMouse()
    }
    return inActivateZone
  }

  private readonly handleMouseMove = (e: UiohookMouseEvent) => {
    this.update(e.x, e.y)
  }

  private readonly handleMouseUp = (e: UiohookMouseEvent) => {
    this.heldButtons.delete(e.button)
    this.update(e.x, e.y)
  }

  private readonly handleMouseDown = (e: UiohookMouseEvent) => {
    // Only if the mouse was already taken did this click reach the overlay.
    const reachedOverlay = this.overlay.isMouseTaken
    // Bring `inside` up to date first, so a click also counts as entering.
    const inActivateZone = this.update(e.x, e.y)
    this.heldButtons.add(e.button)
    if (inActivateZone && reachedOverlay) this.overlay.assertCardActive()
    // A right click needs the mouse taken: otherwise the game got it too, and it
    // may be a skill on its way past.
    if (e.button === RIGHT_BUTTON && (reachedOverlay || this.overlay.isInteractable)) {
      for (const zone of this.flat) {
        if (zone.inside) this.server.sendEventTo('broadcast', { name: 'MAIN->OVERLAY::woke-hover-context', payload: { id: zone.id } })
      }
    }
    if (e.button !== LEFT_BUTTON) return
    for (const zone of this.flat) {
      if (zone.inside) {
        this.server.sendEventTo('broadcast', { name: 'MAIN->OVERLAY::woke-hover-click', payload: { id: zone.id } })
      }
    }
  }

  private emit (id: string, inside: boolean) {
    this.server.sendEventTo('broadcast', { name: 'MAIN->OVERLAY::woke-hover', payload: { id, inside } })
  }
}

function toScreenRect (rect: Rectangle): Rectangle {
  // Same conversion as APT's WidgetAreaTracker: uiohook reports physical
  // pixels on Windows, CSS pixels elsewhere.
  if (process.platform === 'win32') {
    return screen.dipToScreenRect(null, {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    })
  }
  return rect
}

function contains (rect: Rectangle, x: number, y: number): boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height
}
