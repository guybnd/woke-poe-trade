// Called from APT's background/Prices.ts each time poe.ninja prices load.
// Kept dependency-free so Prices.ts can import it without import cycles.
import type { DenseChunk } from './parse'

// `at`: when poe.ninja's prices were loaded (not when a listener hears them).
type Listener = (leagueId: string, chunks: DenseChunk[], at: number) => void

const listeners = new Set<Listener>()
let last: { leagueId: string, chunks: DenseChunk[], at: number } | null = null

export function onWokePricesLoaded (fn: Listener): () => void {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

// For a widget placed after prices loaded: APT won't fetch again for 30 minutes.
// Keeps the original load time, so the replayed snapshot isn't stamped as new.
export function replayWokePrices (): void {
  if (last) notify(last.leagueId, last.chunks, last.at)
}

// The latest load, still held by APT (not a copy), for the Market window.
export function lastWokePrices (): { leagueId: string, chunks: DenseChunk[], at: number } | null {
  return last
}

export function emitWokePricesLoaded (leagueId: string, chunks: DenseChunk[]): void {
  last = { leagueId, chunks, at: Date.now() }
  notify(leagueId, chunks, last.at)
}

function notify (leagueId: string, chunks: DenseChunk[], at: number): void {
  for (const fn of listeners) {
    try { fn(leagueId, chunks, at) } catch (err) { console.error('[woke/market]', err) }
  }
}
