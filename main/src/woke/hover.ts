// Hover zones for woke widgets. While the game has focus the overlay window is
// click-through, so the renderer never sees mouse hover. Widgets register
// screen rects here; we watch the global mouse and tell them when it enters
// or leaves. A zone marked `activate` also makes the overlay interactive after
// the mouse rests on it briefly, and hands focus back to the game when the
// mouse leaves, so its buttons can be clicked without pressing the overlay key.
import { screen } from 'electron'
import type { Rectangle } from 'electron'
import { uIOhook } from 'uiohook-napi'
import type { UiohookMouseEvent } from 'uiohook-napi'
import type { ServerEvents } from '../server'
import type { OverlayWindow } from '../windowing/OverlayWindow'

const ACTIVATE_DWELL_MS = 120
const LEFT_BUTTON = 1

interface Zone {
  id: string
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
  private dwellTimer: ReturnType<typeof setTimeout> | null = null
  private activatedByUs = false

  constructor (
    private server: ServerEvents,
    private overlay: OverlayWindow
  ) {
    this.server.onEventAnyClient('OVERLAY->MAIN::woke-hover-zones', ({ owner, zones }) => {
      const prev = this.zones.get(owner) ?? []
      const converted: Zone[] = zones.map(z => ({
        id: z.id,
        activate: Boolean(z.activate),
        rect: toScreenRect({ x: z.x, y: z.y, width: z.width, height: z.height }),
        inside: prev.find(p => p.id === z.id)?.inside ?? false
      }))
      for (const p of prev) {
        if (p.inside && !converted.some(z => z.id === p.id)) this.emit(p.id, false)
      }
      if (converted.length) this.zones.set(owner, converted)
      else this.zones.delete(owner)
      this.flat = [...this.zones.values()].flat()
      this.updateListening()
    })
  }

  private updateListening () {
    const want = this.zones.size > 0
    if (want && !this.listening) {
      uIOhook.addListener('mousemove', this.handleMouseMove)
      uIOhook.addListener('mousedown', this.handleMouseDown)
      this.listening = true
    } else if (!want && this.listening) {
      uIOhook.removeListener('mousemove', this.handleMouseMove)
      uIOhook.removeListener('mousedown', this.handleMouseDown)
      this.listening = false
      this.leaveActivateZone()
    }
  }

  private readonly handleMouseMove = (e: UiohookMouseEvent) => {
    // Something handed focus back to the game (a trade reply typed into
    // chat): resting on the zone again makes it clickable again.
    if (this.activatedByUs && !this.overlay.isInteractable) this.activatedByUs = false
    let inActivateZone = false
    for (const zone of this.flat) {
      const inside = contains(zone.rect, e.x, e.y)
      if (inside !== zone.inside) {
        zone.inside = inside
        this.emit(zone.id, inside)
      }
      if (inside && zone.activate) inActivateZone = true
    }

    if (inActivateZone) this.enterActivateZone()
    else this.leaveActivateZone()
  }

  private readonly handleMouseDown = (e: UiohookMouseEvent) => {
    if (e.button !== LEFT_BUTTON) return
    // Bring `inside` up to date first, so a click also counts as entering.
    this.handleMouseMove(e)
    for (const zone of this.flat) {
      if (zone.inside) {
        this.server.sendEventTo('broadcast', { name: 'MAIN->OVERLAY::woke-hover-click', payload: { id: zone.id } })
      }
    }
  }

  private enterActivateZone () {
    if (this.dwellTimer || this.activatedByUs || this.overlay.isInteractable) return
    this.dwellTimer = setTimeout(() => {
      this.dwellTimer = null
      if (!this.overlay.isInteractable && this.flat.some(z => z.inside && z.activate)) {
        this.overlay.assertOverlayActive()
        this.activatedByUs = true
      }
    }, ACTIVATE_DWELL_MS)
  }

  private leaveActivateZone () {
    if (this.dwellTimer) {
      clearTimeout(this.dwellTimer)
      this.dwellTimer = null
    }
    if (this.activatedByUs) {
      this.activatedByUs = false
      if (this.overlay.isInteractable) this.overlay.assertGameActive()
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
