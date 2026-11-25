// The overlay must never keep the game's clicks (main/src/windowing/OverlayWindow.ts,
// main/src/woke/hover.ts): a failsafe gives them back when the cursor is off
// every dock zone, the rescue hotkey forces it, a reload drops the old page's
// zones, and every change of state is logged with why.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from 'events'

// main's code resolves its packages from main/node_modules, so mock them there.
vi.mock('../../main/node_modules/electron-overlay-window/dist/index.js', () => import('../fake-host/stubs/electron-overlay-window'))
vi.mock('../../main/node_modules/uiohook-napi/dist/index.js', () => {
  const hook = new EventEmitter()
  return { uIOhook: hook, UiohookKey: {} }
})

// No real window in tests: the stub Electron has none to give.
if (!process.argv.includes('--no-overlay')) process.argv.push('--no-overlay')

const { OverlayWindow, WATCH_MS, RELEASE_AFTER_MS } = await import('../../main/src/windowing/OverlayWindow')
const { WokeHoverTracker } = await import('../../main/src/woke/hover')
const { uIOhook } = await import('../../main/node_modules/uiohook-napi/dist/index.js')
const { game } = await import('../fake-host/game')
const { OverlayController } = await import('../fake-host/stubs/electron-overlay-window')

type Handler = (payload: any) => void // eslint-disable-line @typescript-eslint/no-explicit-any

function setup () {
  const handlers = new Map<string, Handler[]>()
  const sent: Array<{ name: string, payload: unknown }> = []
  const server = {
    onEventAnyClient (name: string, fn: Handler) { handlers.set(name, [...(handlers.get(name) ?? []), fn]) },
    sendEventTo (_to: string, e: { name: string, payload: unknown }) { sent.push(e) }
  }
  const lines: string[] = []
  const logger = { write (m: string) { lines.push(m) } }
  const poeWindow = Object.assign(new EventEmitter(), {
    isActive: true,
    hasFocus: true,
    onAttach () {},
    attach () {}
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const overlay = new OverlayWindow(server as any, logger as any, poeWindow as any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tracker = new WokeHoverTracker(server as any, overlay)
  const fromPage = (name: string, payload: unknown) => { for (const fn of handlers.get(name) ?? []) fn(payload) }
  const zones = (owner: string, list: Array<{ id: string, x: number, y: number, width: number, height: number, activate?: boolean }>) =>
    fromPage('OVERLAY->MAIN::woke-hover-zones', { owner, zones: list, dpr: 1 })
  const move = (x: number, y: number) => { game.cursor = { x, y }; uIOhook.emit('mousemove', { x, y }) }
  return { overlay, tracker, lines, sent, zones, move, poeWindow }
}

const ICON = { id: 'woke-hover-1:0', x: 100, y: 100, width: 40, height: 40, activate: true }

describe('overlay click safety', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    game.focused = true
    game.cursor = { x: 900, y: 900 }
  })
  afterEach(() => {
    vi.useRealTimers()
    uIOhook.removeAllListeners()
    // Each test's overlay listens to the shared stub; don't let it hear the next test.
    OverlayController.events.removeAllListeners()
  })

  it('takes the mouse over a dock icon and gives it back when the mouse leaves, logging both', () => {
    const { overlay, zones, move, lines } = setup()
    zones('woke-hover-1', [ICON])
    move(110, 110)
    expect(overlay.isMouseTaken).toBe(true)
    move(500, 500)
    expect(overlay.isMouseTaken).toBe(false)
    expect(lines.some(l => l.includes('mouseTaken=on') && l.includes('mouse over a dock zone'))).toBe(true)
    expect(lines.some(l => l.includes('mouseTaken=off') && l.includes('mouse left the dock zones'))).toBe(true)
  })

  it('gives the clicks back by itself when the mouse hook goes quiet with the mouse taken', () => {
    const { overlay, zones, move, lines } = setup()
    zones('woke-hover-1', [ICON])
    move(110, 110)
    expect(overlay.isMouseTaken).toBe(true)
    // The hook stops reporting: the cursor moves, nobody hears it.
    game.cursor = { x: 600, y: 600 }
    vi.advanceTimersByTime(WATCH_MS)
    expect(overlay.isMouseTaken).toBe(true)
    vi.advanceTimersByTime(RELEASE_AFTER_MS + WATCH_MS)
    expect(overlay.isMouseTaken).toBe(false)
    expect(lines.some(l => l.startsWith('warn [Overlay] Giving clicks back') && l.includes('1 click zones'))).toBe(true)
  })

  it('keeps the clicks while the cursor rests on the icon, however long', () => {
    const { overlay, zones, move } = setup()
    zones('woke-hover-1', [ICON])
    move(110, 110)
    vi.advanceTimersByTime(30_000)
    expect(overlay.isMouseTaken).toBe(true)
  })

  it('lets a card go when focus arrived on it and the cursor never shows up on a zone', () => {
    const { overlay } = setup()
    // e.g. Windows hands the overlay focus: there's no dock zone at all.
    overlay.assertCardActive()
    expect(overlay.isCardActive).toBe(true)
    expect(game.focused).toBe(false)
    vi.advanceTimersByTime(RELEASE_AFTER_MS + 2 * WATCH_MS)
    expect(overlay.isCardActive).toBe(false)
    expect(overlay.isInteractable).toBe(false)
    expect(game.focused).toBe(true)
  })

  it('does not run the failsafe while the overlay is open on purpose', () => {
    const { overlay } = setup()
    overlay.assertOverlayActive()
    vi.advanceTimersByTime(10_000)
    expect(overlay.isInteractable).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('runs no timer while the game has the clicks', () => {
    const { zones, move } = setup()
    zones('woke-hover-1', [ICON])
    move(500, 500)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('forces click-through on the rescue call and asks the page to send its zones again', () => {
    const { overlay, zones, move, sent, lines } = setup()
    zones('woke-hover-1', [ICON])
    move(110, 110)
    overlay.forceClickThrough()
    expect(overlay.isMouseTaken).toBe(false)
    expect(sent.some(e => e.name === 'MAIN->OVERLAY::woke-hover-resend')).toBe(true)
    // The stale zone is gone: resting there takes nothing.
    move(111, 111)
    expect(overlay.isMouseTaken).toBe(false)
    expect(lines.some(l => l.startsWith('warn [Overlay] Forcing click-through'))).toBe(true)
  })

  it('drops the old page zones on a reload', () => {
    const { overlay, zones, move } = setup()
    zones('woke-hover-7', [{ ...ICON, id: 'woke-hover-7:0' }])
    overlay.onPageReload?.()
    move(110, 110)
    expect(overlay.isMouseTaken).toBe(false)
    // The new page registers its own.
    zones('woke-hover-1', [ICON])
    move(112, 112)
    expect(overlay.isMouseTaken).toBe(true)
  })

  it('waits for a drag to end before letting go, since the hook reports no drag moves', () => {
    const { overlay, zones, move } = setup()
    zones('woke-hover-1', [ICON])
    move(110, 110)
    uIOhook.emit('mousedown', { x: 110, y: 110, button: 1 })
    expect(overlay.isCardActive).toBe(true)
    // Dragging a slider off the card: the cursor moves, the hook stays quiet.
    game.cursor = { x: 600, y: 600 }
    vi.advanceTimersByTime(5000)
    expect(overlay.isCardActive).toBe(true)
    uIOhook.emit('mouseup', { x: 600, y: 600, button: 1 })
    expect(overlay.isCardActive).toBe(false)
  })

  it('keeps the mouse while a pinned panel is dragged off where the press was', () => {
    const { overlay, zones, move } = setup()
    const PIN = { id: 'woke-hover-1:0', x: 100, y: 500, width: 300, height: 200, activate: true }
    zones('woke-hover-1', [PIN])
    move(150, 510)
    expect(overlay.isMouseTaken).toBe(true)
    uIOhook.emit('mousedown', { x: 150, y: 510, button: 1 })
    expect(overlay.isCardActive).toBe(true)
    // Dragged up by its title: the page sends the moved zone each frame, but the
    // hook reports no drag moves, so main still has the press point (now below it).
    for (const y of [400, 300, 200]) {
      game.cursor = { x: 150, y: y + 10 }
      zones('woke-hover-1', [{ ...PIN, y }])
      expect(overlay.isCardActive).toBe(true)
    }
    uIOhook.emit('mouseup', { x: 150, y: 210, button: 1 })
    expect(overlay.isCardActive).toBe(true)
    expect(overlay.isInteractable).toBe(true)
    move(900, 900)
    expect(overlay.isCardActive).toBe(false)
  })

  it('still gives the mouse back when the game got the press (holding to move)', () => {
    const { overlay, zones, move } = setup()
    zones('woke-hover-1', [ICON])
    move(500, 500)
    uIOhook.emit('mousedown', { x: 500, y: 500, button: 1 })
    zones('woke-hover-1', [{ ...ICON, x: 120 }])
    expect(overlay.isMouseTaken).toBe(false)
    expect(overlay.isCardActive).toBe(false)
  })

  it('gives the mouse back when the game got a press on a zone before the mouse was taken', () => {
    const { overlay, zones } = setup()
    zones('woke-hover-1', [{ ...ICON, activate: false }])
    // Swept onto the zone and pressed at once: not activated, so the game got it.
    uIOhook.emit('mousedown', { x: 110, y: 110, button: 1 })
    zones('woke-hover-1', [{ ...ICON, activate: true }])
    zones('woke-hover-1', [{ ...ICON, x: 300, activate: true }])
    expect(overlay.isMouseTaken).toBe(false)
    expect(overlay.isCardActive).toBe(false)
  })

  it('a mouse resting on an icon across a reload is still on it', () => {
    const { overlay, zones, move, sent } = setup()
    zones('woke-hover-1', [ICON])
    move(110, 110)
    overlay.giveMouse()
    overlay.onPageReload?.()
    sent.length = 0
    zones('woke-hover-1', [ICON])
    expect(overlay.isMouseTaken).toBe(true)
    expect(sent.some(e => e.name === 'MAIN->OVERLAY::woke-hover' && (e.payload as { inside: boolean }).inside)).toBe(true)
  })

  it('logs a state only when it changes', () => {
    const { zones, move, lines } = setup()
    zones('woke-hover-1', [ICON])
    move(110, 110)
    move(115, 115)
    move(120, 120)
    expect(lines.filter(l => l.includes('mouseTaken=on')).length).toBe(1)
  })
})
