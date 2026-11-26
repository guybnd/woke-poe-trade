// How big a popup drawn outside any window (the item tooltip, title cards,
// help cards) should be: as big as the window it came from. Panels are zoomed
// by Panel size x UI size (--w-ui-scale). The windows the price check's Size
// sizes (the price check, its instant card, map check, Settings:
// data-w-window-sized) are zoomed their own way, and their text also grows
// with Size (--w-window-size, theme.css), so a popup from one takes that
// window's zoom times Size.
function rootVar (doc: Document, name: string): number {
  const win = doc.defaultView
  return (win && parseFloat(win.getComputedStyle(doc.documentElement).getPropertyValue(name))) || 1
}

export function tipZoom (target: Element): number {
  const doc = target.ownerDocument
  // Unit tests pass a stand-in with only getBoundingClientRect.
  if (!doc || typeof target.closest !== 'function') return 1
  if (!target.closest('[data-w-window-sized]')) return rootVar(doc, '--w-ui-scale')
  const zoom = (target as Element & { currentCSSZoom?: number }).currentCSSZoom
  return (typeof zoom === 'number' && zoom > 0 ? zoom : rootVar(doc, '--w-ui-scale')) * rootVar(doc, '--w-window-size')
}
