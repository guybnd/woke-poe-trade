// Show me (tab-bar/goto.ts) asking one window's Listed view for a filter chip.
// Kept a few seconds only: a Listed view that isn't there to take it (no
// league yet) mustn't pick it up on a later visit.
import { shallowReactive } from 'vue'

export type ListedAsk = 'stale'
const asks = shallowReactive(new Map<number, { f: ListedAsk, at: number }>())

export function askListed (wmId: number, f: ListedAsk): void {
  asks.set(wmId, { f, at: Date.now() })
}

export function takeListedAsk (wmId: number): ListedAsk | null {
  const a = asks.get(wmId)
  if (!a) return null
  asks.delete(wmId)
  return Date.now() - a.at < 5000 ? a.f : null
}

export function hasListedAsk (wmId: number): boolean {
  return asks.has(wmId)
}
