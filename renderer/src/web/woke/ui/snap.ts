// Snapping for panel drags and resizes (pick R2). While a panel moves, its
// edges stick to the screen edges, a 16px inset, and the edges of other open
// panels when within SNAP_PX, and a guide line shows what it snapped to.
import { shallowRef } from 'vue'

const SNAP_PX = 8
const INSET = 16

export interface Guide { axis: 'x' | 'y', at: number }
export const snapGuides = shallowRef<Guide[]>([])

interface Box { left: number, top: number, right: number, bottom: number }

function targets (self: Element | null) {
  const xs = [0, INSET, window.innerWidth - INSET, window.innerWidth]
  const ys = [0, INSET, window.innerHeight - INSET, window.innerHeight]
  for (const el of document.querySelectorAll('[data-w-panel]')) {
    if (self && (self.contains(el) || el.contains(self))) continue
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height) continue
    xs.push(r.left, r.right)
    ys.push(r.top, r.bottom)
  }
  return { xs, ys }
}

function nearest (edges: number[], lines: number[]): { delta: number, at: number } | null {
  let best: { delta: number, at: number } | null = null
  for (const e of edges) {
    for (const l of lines) {
      const d = l - e
      if (Math.abs(d) <= SNAP_PX && (!best || Math.abs(d) < Math.abs(best.delta))) best = { delta: d, at: l }
    }
  }
  return best
}

// Moves a panel whose start box is `rect` by (dx, dy); returns the snapped
// offset. Hold Alt to move freely.
export function snapMove (rect: Box, dx: number, dy: number, self: Element | null, free = false) {
  if (free) { snapGuides.value = []; return { dx, dy } }
  const { xs, ys } = targets(self)
  const sx = nearest([rect.left + dx, rect.right + dx, (rect.left + rect.right) / 2 + dx], xs)
  const sy = nearest([rect.top + dy, rect.bottom + dy], ys)
  const guides: Guide[] = []
  if (sx) { dx += sx.delta; guides.push({ axis: 'x', at: sx.at }) }
  if (sy) { dy += sy.delta; guides.push({ axis: 'y', at: sy.at }) }
  snapGuides.value = guides
  return { dx, dy }
}

// Snaps one moving edge (screen px) during a resize.
export function snapEdge (axis: 'x' | 'y', at: number, self: Element | null, free = false) {
  if (free) { snapGuides.value = []; return at }
  const { xs, ys } = targets(self)
  const s = nearest([at], axis === 'x' ? xs : ys)
  snapGuides.value = s ? [{ axis, at: s.at }] : []
  return s ? s.at : at
}

export function clearGuides () { snapGuides.value = [] }

// A widget past this share of the screen can't fit in most positions, so a
// drag may push it off the far edge, leaving KEEP_VISIBLE px to grab.
const BIG_SHARE = 0.5
const KEEP_VISIBLE = 160

function clampAxis (start: number, end: number, delta: number, screen: number) {
  const room = screen - end
  const big = end - start > screen * BIG_SHARE
  const max = big ? Math.max(room, screen - KEEP_VISIBLE - start, 0) : Math.max(room, 0)
  return Math.min(Math.max(delta, -start), max)
}

// Limits a drag of a widget whose start box is `rect`. The title bar can't
// leave the top or left, and smaller widgets stay fully on screen.
export function clampDrag (rect: Box, dx: number, dy: number, screenW: number, screenH: number) {
  return {
    dx: clampAxis(rect.left, rect.right, dx, screenW),
    dy: clampAxis(rect.top, rect.bottom, dy, screenH)
  }
}

// A <webview> takes the mouse once the cursor is over it, so the page would
// stop seeing mousemove and mouseup mid-drag. Call when a drag starts; the
// returned function gives the webviews their mouse back.
export function releaseWebviewsForDrag () {
  const views = [...document.querySelectorAll<HTMLElement>('webview')]
  for (const v of views) v.style.pointerEvents = 'none'
  return () => { for (const v of views) v.style.removeProperty('pointer-events') }
}
