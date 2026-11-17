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

// Screen px a panel's edge can move outward before the widget grows: the gap
// to the widget's edge left by a bigger neighbour beside it (the Atlas list
// beside the tree). A neighbour past the edge (the next panel in the row) sits
// in that gap, so there is none.
export function edgeSlack (panel: Box, widget: Box, others: Box[], axis: 'x' | 'y', side: ResizeSide) {
  const across = (o: Box) => axis === 'y'
    ? o.left < panel.right - 1 && o.right > panel.left + 1
    : o.top < panel.bottom - 1 && o.bottom > panel.top + 1
  const beyond = (o: Box) => axis === 'y'
    ? (side === 'end' ? o.top >= panel.bottom - 1 : o.bottom <= panel.top + 1)
    : (side === 'end' ? o.left >= panel.right - 1 : o.right <= panel.left + 1)
  if (others.some(o => across(o) && beyond(o))) return 0
  const gap = axis === 'y'
    ? (side === 'end' ? widget.bottom - panel.bottom : panel.top - widget.top)
    : (side === 'end' ? widget.right - panel.right : panel.left - widget.left)
  // A few px is the widget's own padding, not room a neighbour left.
  return gap > 4 ? gap : 0
}

export interface ResizeAxis {
  side: ResizeSide
  // Mouse travel in screen px, positive toward the end of the axis.
  delta: number
  // The panel's size at the start of the drag, in screen px.
  size: number
  // Screen px the widget can still grow toward this side.
  room: number
  // Screen px between this panel's moving edge and the widget's edge on that
  // side, when a taller (or wider) neighbour sets the widget's size. The panel
  // grows into it without the widget growing.
  slack?: number
  scale: number
  // Smallest size in panel (zoomed) px.
  min: number
  share: number
}

// One axis of a resize: the new size in panel px, and how far the anchor must
// move (screen px) so the opposite edge stays where it is.
export function resizeAxis ({ side, delta, size, room, scale, min, share, slack = 0 }: ResizeAxis) {
  const gap = Math.max(slack, 0)
  const growth = Math.min(side === 'end' ? delta : -delta, Math.max(room, 0) + gap)
  const px = Math.max(size + growth, Math.min(min * scale, size))
  const next = Math.round(px / scale)
  const grew = next * scale - size
  // Only growth past the neighbours changes the widget's size, and so its anchor.
  const widget = gap > 0 ? Math.max(grew - gap, 0) : grew
  return { size: next, shift: side === 'end' ? share * widget : (share - 1) * widget }
}
