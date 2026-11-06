// What a click on an icon does while you play. With hover cards off, a click is
// the only way to open the card, so it does that first.
export function clickWhilePlaying (icon: { gameClick?: unknown, wmId?: number }, hoverOpens: boolean | undefined): 'card' | 'game' | 'window' {
  if (hoverOpens === false) return 'card'
  if (icon.gameClick) return 'game'
  return icon.wmId != null ? 'window' : 'card'
}
