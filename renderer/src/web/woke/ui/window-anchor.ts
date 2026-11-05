// Where a widget sits while minimized. The title bar stays put when it
// collapses, and the panel comes back exactly as it was if the bar wasn't
// moved. If it was, the panel opens toward the free side of the screen.
export interface WidgetAnchor { pos: string, x: number, y: number }
export interface MinimizedState { anchor: WidgetAnchor, pinned: WidgetAnchor }
interface Box { left: number, top: number, right: number, bottom: number }

const isLeft = (r: Box, w: number) => (r.left + r.right) / 2 <= w / 2
const isTop = (r: Box, h: number) => (r.top + r.bottom) / 2 <= h / 2

export function minimizeAnchor (anchor: WidgetAnchor, rect: Box, w: number, h: number): MinimizedState {
  const left = isLeft(rect, w)
  return {
    anchor: { ...anchor },
    pinned: { pos: left ? 'tl' : 'tr', x: (left ? rect.left : rect.right) / w * 100, y: rect.top / h * 100 }
  }
}

export function restoreAnchor (state: MinimizedState, current: WidgetAnchor, rect: Box, w: number, h: number): WidgetAnchor {
  const p = state.pinned
  if (current.pos === p.pos && current.x === p.x && current.y === p.y) return { ...state.anchor }
  const left = isLeft(rect, w)
  const top = isTop(rect, h)
  return {
    pos: (top ? 't' : 'b') + (left ? 'l' : 'r'),
    x: (left ? rect.left : rect.right) / w * 100,
    y: (top ? rect.top : rect.bottom) / h * 100
  }
}
