// woke: where the price check window sits once it has been dragged or resized.
// Without a saved position it stays docked beside the game's side panel.

// x and y are the window's top left in % of the screen, so it survives a
// resolution change. w and h are CSS px; left out, the window keeps its usual
// width and fits its content.
export interface PriceWindowPosition {
  x: number
  y: number
  w?: number
  h?: number
}

export const MIN_WIDTH = 320
export const MIN_HEIGHT = 200

interface Screen { w: number, h: number }

export interface PriceWindowLayout {
  // Where the related items panel goes: 'stash' puts it to the window's right,
  // 'inventory' to its left, the same as the docked layouts.
  side: 'stash' | 'inventory'
  // Space kept between the screen edge and the window, on that side.
  gap: number
  top: number
  left: number
  width: number
  height: number | undefined
}

// The px layout for a saved position, kept on screen if the screen got smaller.
export function floatingLayout (pos: PriceWindowPosition, screen: Screen, defaultWidth: number): PriceWindowLayout {
  const width = Math.min(pos.w ?? defaultWidth, screen.w)
  const height = pos.h === undefined ? undefined : Math.min(pos.h, screen.h)
  const left = Math.max(0, Math.min(pos.x / 100 * screen.w, screen.w - width))
  const top = Math.max(0, Math.min(pos.y / 100 * screen.h, screen.h - (height ?? MIN_HEIGHT)))
  const side = left + width / 2 > screen.w / 2 ? 'inventory' : 'stash'
  return { side, gap: side === 'stash' ? left : screen.w - left - width, top, left, width, height }
}

// The area that hands the overlay the mouse when the cursor enters it, in
// window px. A window with no saved height can reach down to the screen edge.
export function floatingArea (layout: PriceWindowLayout, screen: Screen) {
  return {
    x: layout.left,
    y: layout.top,
    width: layout.width,
    height: layout.height ?? screen.h - layout.top
  }
}

// A drag's new position from the window's start box and the clamped offset.
export function movedPosition (
  saved: PriceWindowPosition | undefined,
  start: { left: number, top: number, width: number },
  dx: number,
  dy: number,
  screen: Screen
): PriceWindowPosition {
  // The same limits floatingLayout draws with, so the saved spot is the one
  // on screen and the window keeps following the cursor.
  const left = Math.max(0, Math.min(start.left + dx, screen.w - start.width))
  const top = Math.max(0, Math.min(start.top + dy, screen.h - (saved?.h ?? MIN_HEIGHT)))
  return {
    ...saved,
    x: left / screen.w * 100,
    y: top / screen.h * 100
  }
}

// A resize's new position. The top left stays put and the size stops at the
// screen edge. An axis not being resized keeps what it had.
export function resizedPosition (
  saved: PriceWindowPosition | undefined,
  start: { left: number, top: number, width: number, height: number },
  dw: number | null,
  dh: number | null,
  screen: Screen
): PriceWindowPosition {
  const next: PriceWindowPosition = {
    ...saved,
    x: start.left / screen.w * 100,
    y: start.top / screen.h * 100
  }
  if (dw !== null) {
    const room = Math.max(MIN_WIDTH, screen.w - start.left)
    next.w = Math.round(Math.min(Math.max(start.width + dw, MIN_WIDTH), room))
  }
  if (dh !== null) {
    const room = Math.max(MIN_HEIGHT, screen.h - start.top)
    next.h = Math.round(Math.min(Math.max(start.height + dh, MIN_HEIGHT), room))
  }
  return next
}
