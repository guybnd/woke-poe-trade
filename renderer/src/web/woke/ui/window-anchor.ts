// Where a widget sits while minimized. The title bar stays put when it
// collapses, and the panel comes back exactly as it was if the bar wasn't
// moved. If it was, the panel opens toward the free side of the screen.
export interface WidgetAnchor { pos: string, x: number, y: number }
export interface MinimizedState { anchor: WidgetAnchor, pinned: WidgetAnchor }
interface Box { left: number, top: number, right: number, bottom: number }

const isLeft = (r: Box, w: number) => (r.left + r.right) / 2 <= w / 2
const isTop = (r: Box, h: number) => (r.top + r.bottom) / 2 <= h / 2

// Which panel edge the bar keeps. A panel wholly on one half of the screen
// keeps that side's edge, whatever its anchor says (a bar restored on the right
// half leaves the panel anchored right after it's dragged back to the left).
// A panel across the middle keeps its left edge, where the title is, if that
// edge is the nearer one. If the right edge is nearer, a panel anchored left
// still keeps its left edge: Atlas strategies opened on the left reaches the
// screen's right edge with its tree open, and its bar jumped over there. A
// drag never changes the anchor's side, so going by the anchor alone would
// send a panel restored on the right and dragged back left to its right end.
function pinsLeft (anchor: WidgetAnchor, rect: Box, w: number) {
  if (rect.right <= w / 2) return true
  if (rect.left >= w / 2) return false
  if (rect.left <= w - rect.right) return true
  return anchor.pos[1] === 'l'
}

export function minimizeAnchor (anchor: WidgetAnchor, rect: Box, w: number, h: number): MinimizedState {
  const left = pinsLeft(anchor, rect, w)
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

// Opening a window on purpose (a dock card's Open, a hotkey, a launcher row)
// also brings it back from minimized: a title bar alone isn't what was asked
// for. Each mounted Widget registers how to restore itself; the window
// manager's show() calls it.
const restorers = new Map<number, () => void>()
export function onRestoreRequest (wmId: number, restore: () => void) {
  restorers.set(wmId, restore)
  return () => { if (restorers.get(wmId) === restore) restorers.delete(wmId) }
}
export function requestRestore (wmId: number) {
  restorers.get(wmId)?.()
}

// Panels opened from the rail or the dock open here: the empty left side of
// the screen, beside the rail and clear of an icon row kept on the far
// left (it draws above panels). A new object each time, because Widget moves a
// panel by writing into its anchor.
export function popupAnchor (): WidgetAnchor {
  return { pos: 'tl', x: 10, y: 12 }
}

// Where those panels used to open. A saved anchor can't say whether the panel
// was ever dragged, but one still exactly on its old spot wasn't, so it follows
// the new default. HUD-style widgets aren't listed and keep their own spots.
const OLD_POPUP_ANCHORS: Record<string, WidgetAnchor[]> = {
  'woke-session-analytics': [{ pos: 'tc', x: 50, y: 12 }],
  'woke-atlas-strategies': [{ pos: 'tl', x: 20, y: 15 }],
  'woke-boss-runs': [{ pos: 'cc', x: 50, y: 50 }],
  'woke-challenges': [{ pos: 'tl', x: 15, y: 8 }],
  'woke-farming': [{ pos: 'tl', x: 60, y: 30 }],
  'woke-lab': [{ pos: 'tl', x: 30, y: 20 }],
  'woke-lab-gems': [{ pos: 'tl', x: 45, y: 20 }],
  'woke-league-invest': [{ pos: 'tl', x: 50, y: 20 }],
  'woke-loot-filter': [{ pos: 'cc', x: 50, y: 45 }],
  'woke-market-tracker': [{ pos: 'tl', x: 40, y: 20 }],
  'woke-pob-builds': [{ pos: 'tl', x: 25, y: 20 }],
  'woke-scarab-flip': [{ pos: 'tl', x: 45, y: 20 }],
  'woke-regex-library': [{ pos: 'tl', x: 30, y: 30 }, { pos: 'tl', x: 35, y: 30 }],
  'woke-trade-searches': [{ pos: 'tl', x: 30, y: 25 }]
}

// A minimized panel's anchor is where its title bar was pinned, so it is left alone.
export function movePopupsToNewSpot (widgets: Array<{ wmType: string, anchor?: WidgetAnchor, wokeMinimized?: unknown }>) {
  for (const w of widgets) {
    const { anchor } = w
    if (!anchor || w.wokeMinimized) continue
    const old = OLD_POPUP_ANCHORS[w.wmType]
    if (old?.some(a => a.pos === anchor.pos && a.x === anchor.x && a.y === anchor.y)) w.anchor = popupAnchor()
  }
}
