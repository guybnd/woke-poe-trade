// A panel's z-index is its wmZorder, and bringing one to the front gives it the
// top number plus one, so the numbers only ever grow. Past 900 a panel drew over
// the dock, and past 1000 over the item tooltip, menus and toasts (the pop-up
// band is 1000-1002): a hovered row's tooltip opened behind its own window.
// Numbers above the cap are renumbered 1, 2, 3... in the same order.
import type { Widget } from './widgets'

export const ZORDER_CAP = 800

// Same order, same ties: equal numbers stay equal.
export function compactZorder (widgets: Array<Pick<Widget, 'wmZorder'>>): void {
  const ranked = [...new Set(widgets
    .map(w => w.wmZorder)
    .filter((z): z is number => typeof z === 'number'))]
    .sort((a, b) => a - b)
  const rank = new Map(ranked.map((z, i) => [z, i + 1]))
  for (const w of widgets) {
    if (typeof w.wmZorder === 'number') w.wmZorder = rank.get(w.wmZorder)!
  }
}

// After a panel comes to the front, and on load for a config already past it.
export function keepZorderUnderCap (widgets: Array<Pick<Widget, 'wmZorder'>>): void {
  if (widgets.some(w => typeof w.wmZorder === 'number' && w.wmZorder > ZORDER_CAP)) compactZorder(widgets)
}
