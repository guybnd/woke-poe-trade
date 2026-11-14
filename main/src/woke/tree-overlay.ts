// Build tree over the game's passive tree. Reads the screen to find where the
// tree sits (tree-fit.ts) and follows the mouse while you drag it. Only looks
// at the screen; no input goes to the game.
import { uIOhook, UiohookKey } from 'uiohook-napi'
import type { UiohookKeyboardEvent, UiohookMouseEvent } from 'uiohook-napi'
import type { GameWindow } from '../windowing/GameWindow'
import { fitTree, litProbes, MIN_SCORE, readScreen } from './tree-fit'
import type { TreeFit, TreePoints } from './tree-fit'
import { perfRecord } from './perf'
import { insideGame, TreeDrag } from './tree-drag'

export type TreeOverlayEvent =
  | { kind: 'move', dx: number, dy: number }
  // Something changed what's on screen: hide, and fit again (the renderer
  // asks once its drawing is off the screen, so the capture can't see it).
  | { kind: 'settle' }
  | { kind: 'hide' }
  // P pressed in game while the tip is wanted (see watchTreeKey).
  | { kind: 'tree-key' }

const MODIFIERS = new Set<number>([
  UiohookKey.Ctrl, UiohookKey.CtrlRight,
  UiohookKey.Alt, UiohookKey.AltRight,
  UiohookKey.Shift, UiohookKey.ShiftRight,
  UiohookKey.Meta, UiohookKey.MetaRight
])

// After the last scroll or key, wait this long for the game to redraw.
const SETTLE_MS = 160

export class TreeOverlay {
  private pts: TreePoints | null = null
  private last: TreeFit | null = null
  private watching = false
  private down: { x: number, y: number } | null = null
  private moved = false
  private settleTimer: ReturnType<typeof setTimeout> | undefined
  private lastMove = 0
  private pending = { dx: 0, dy: 0 }
  private readonly drag = new TreeDrag()

  constructor (
    private readonly poeWindow: GameWindow,
    private readonly emit: (e: TreeOverlayEvent) => void
  ) {}

  setPoints (args: { x: number[], y: number[], r: number[] }) {
    this.pts = { x: Float32Array.from(args.x), y: Float32Array.from(args.y), r: Float32Array.from(args.r) }
    this.last = null
  }

  get hasPoints () { return this.pts != null }

  // fresh: ignore the last fit (a new press of the hotkey).
  fit (args: { probes: number[][], fresh?: boolean }) {
    if (!this.pts) return { ok: false as const, reason: 'no-points' }
    const { width, height } = this.poeWindow.bounds
    if (!width || !height) return { ok: false as const, reason: 'no-game' }
    // No focus check: a click on a dock card gives the overlay focus, and the
    // game still shows underneath.
    const t0 = performance.now()
    const shot = this.poeWindow.screenshot()
    const t1 = performance.now()
    const scr = readScreen(shot, width, height)
    const fit = fitTree(scr, this.pts, args.fresh ? null : this.last)
    const t2 = performance.now()
    perfRecord('Tree overlay: fit', t2 - t0)
    if (!fit || fit.score < MIN_SCORE) {
      this.last = null
      this.stopWatching()
      return { ok: false as const, reason: 'no-tree', ms: Math.round(t2 - t0) }
    }
    this.last = fit
    this.drag.fitted(fit, width, height)
    const lit = litProbes(shot, width, height, fit, (args.probes ?? []).map(p => Float32Array.from(p)))
    this.startWatching()
    return {
      ok: true as const,
      fit,
      lit,
      width,
      height,
      ms: { capture: Math.round(t1 - t0), fit: Math.round(t2 - t1) }
    }
  }

  stop () {
    this.last = null
    this.stopWatching()
  }

  // The one-time "press the hotkey" tip: tells the renderer when P (the
  // game's passive tree key) is pressed in game. Only a key listener; on
  // until the renderer has shown the tip.
  private tipOn = false
  watchTreeKey (on: boolean) {
    if (on === this.tipOn) return
    this.tipOn = on
    if (on) uIOhook.on('keydown', this.onTreeKey)
    else uIOhook.removeListener('keydown', this.onTreeKey)
  }

  private readonly onTreeKey = (e: UiohookKeyboardEvent) => {
    if (e.keycode !== UiohookKey.P || e.altKey || e.ctrlKey || e.shiftKey || e.metaKey) return
    if (!this.poeWindow.hasFocus || this.watching) return
    this.emit({ kind: 'tree-key' })
  }

  private startWatching () {
    if (this.watching) return
    this.watching = true
    uIOhook.on('mousedown', this.onDown)
    uIOhook.on('mouseup', this.onUp)
    uIOhook.on('mousemove', this.onMove)
    uIOhook.on('wheel', this.onWheel)
    uIOhook.on('keydown', this.onKey)
  }

  private stopWatching () {
    if (!this.watching) return
    this.watching = false
    clearTimeout(this.settleTimer)
    this.down = null
    uIOhook.removeListener('mousedown', this.onDown)
    uIOhook.removeListener('mouseup', this.onUp)
    uIOhook.removeListener('mousemove', this.onMove)
    uIOhook.removeListener('wheel', this.onWheel)
    uIOhook.removeListener('keydown', this.onKey)
  }

  private readonly onDown = (e: UiohookMouseEvent) => {
    // Left button drags the tree; anything else just gets checked after.
    if (e.button !== 1) return
    // A drag on another monitor or window isn't on the tree.
    if (!insideGame(this.poeWindow.bounds, e.x, e.y)) return
    clearTimeout(this.settleTimer)
    this.down = { x: e.x, y: e.y }
    this.moved = false
    this.pending = { dx: 0, dy: 0 }
    this.drag.start()
  }

  private readonly onMove = (e: UiohookMouseEvent) => {
    if (!this.down) return
    const dx = e.x - this.down.x
    const dy = e.y - this.down.y
    if (!this.moved && Math.abs(dx) + Math.abs(dy) < 3) return
    this.moved = true
    // Stops at the tree's edges, where the game's tree stops too.
    const step = this.drag.move(dx, dy)
    this.pending.dx += step.dx
    this.pending.dy += step.dy
    this.down = { x: e.x, y: e.y }
    // About one message per frame is plenty.
    const now = Date.now()
    if (now - this.lastMove < 14) return
    this.lastMove = now
    this.emit({ kind: 'move', ...this.pending })
    this.pending = { dx: 0, dy: 0 }
  }

  private readonly onUp = (e: UiohookMouseEvent) => {
    if (e.button !== 1 || !this.down) return
    this.down = null
    if (this.pending.dx || this.pending.dy) this.emit({ kind: 'move', ...this.pending })
    this.pending = { dx: 0, dy: 0 }
    // A click may have taken or refunded a point: look again either way.
    this.settleSoon(this.moved ? 60 : SETTLE_MS)
  }

  private readonly onWheel = () => {
    this.emit({ kind: 'hide' })
    this.settleSoon(SETTLE_MS)
  }

  private readonly onKey = (e: UiohookKeyboardEvent) => {
    if (MODIFIERS.has(e.keycode)) return
    // Most keys close the tree or open something over it.
    this.emit({ kind: 'hide' })
    this.settleSoon(SETTLE_MS)
  }

  private settleSoon (ms: number) {
    clearTimeout(this.settleTimer)
    this.settleTimer = setTimeout(() => { this.emit({ kind: 'settle' }) }, ms)
  }
}
