// Geometry for keeping panels reachable: resizing from any edge, and pulling a
// panel that doesn't fit back on screen. No DOM here, so it can be tested alone.

export interface Box { left: number, top: number, right: number, bottom: number }
export type ResizeSide = 'start' | 'end'

// Panels carry a CSS zoom (the UI scale), and zoom multiplies viewport units
// too: at 135% a "75vh" panel is taller than the screen. Dividing by the scale
// makes vh and vw mean the real share of the window. Other lengths pass through.
export function unzoom (length: string): string
export function unzoom (length: string | undefined): string | undefined
export function unzoom (length: string | undefined) {
  return length && /^[\d.]+v[wh]$/.test(length.trim())
    ? `calc(${length} / var(--w-ui-scale, 1))`
    : length
}

// Below this a panel is mostly title bar, so it stays this tall and the widget
// is moved to fit instead (see fitOffset).
const MIN_ROOM_PX = 240

// The tallest a panel can be with its anchor at `y` percent of the window.
export function heightCap (pos: string, y: number) {
  const room = pos[0] === 't' ? 100 - y : pos[0] === 'b' ? y : 2 * Math.min(y, 100 - y)
  return `calc(max(${room}vh - 4px, ${MIN_ROOM_PX}px) / var(--w-ui-scale, 1))`
}

function fitAxis (start: number, end: number, screen: number) {
  if (start < 0 || end - start > screen) return 0 - start
  return end > screen ? screen - end : 0
}

// How far to shift a box so it's on screen. One too big to fit keeps its top
// left on screen, where the title bar is.
export function fitOffset (box: Box, screenW: number, screenH: number) {
  return {
    x: fitAxis(box.left, box.right, screenW),
    y: fitAxis(box.top, box.bottom, screenH)
  }
}

// Where the anchor sits along the widget on one axis: 0 at its start, 1 at its end.
export function anchorShare (pos: string, axis: 'x' | 'y') {
  const c = axis === 'x' ? pos[1] : pos[0]
  if (c === 'c') return 0.5
  return c === 'r' || c === 'b' ? 1 : 0
}

export interface ResizeAxis {
  side: ResizeSide
  // Mouse travel in screen px, positive toward the end of the axis.
  delta: number
  // The panel's size at the start of the drag, in screen px.
  size: number
  // Screen px the widget can still grow toward this side.
  room: number
  scale: number
  // Smallest size in panel (zoomed) px.
  min: number
  share: number
}

// One axis of a resize: the new size in panel px, and how far the anchor must
// move (screen px) so the opposite edge stays where it is.
export function resizeAxis ({ side, delta, size, room, scale, min, share }: ResizeAxis) {
  const growth = Math.min(side === 'end' ? delta : -delta, Math.max(room, 0))
  const px = Math.max(size + growth, Math.min(min * scale, size))
  const next = Math.round(px / scale)
  const grew = next * scale - size
  return { size: next, shift: side === 'end' ? share * grew : (share - 1) * grew }
}
