// Stash gains for other modules (farming, session analytics, boss runs):
// session profit from what actually landed in the stash, not typed-in loot.
// Empty unless the personal stash reader is on and has read twice.
import { hostRequest } from '../shared/host'
import { gainsBetween } from './valuation'
import type { StashGain } from './valuation'

export const GAINS_COLLECTION = 'net-worth'
export const gainsKey = (league: string) => `${league}-gains`

export async function stashGains (league: string): Promise<StashGain[]> {
  const saved = await (hostRequest('doc-get', { collection: GAINS_COLLECTION, key: gainsKey(league) }) as Promise<StashGain[] | null>).catch(() => null)
  return Array.isArray(saved) ? saved : []
}

// For a read-change-write: throws when the file can't be read right now
// (locked), so it's never saved over with nothing. No file yet: [].
export async function stashGainsStrict (league: string): Promise<StashGain[]> {
  const saved = await (hostRequest('doc-get-strict', { collection: GAINS_COLLECTION, key: gainsKey(league) }) as Promise<unknown>)
  return Array.isArray(saved) ? saved as StashGain[] : []
}

// Net stash change for refreshes between `from` and `to` (ms).
export async function stashGainsBetween (league: string, from: number, to: number) {
  return gainsBetween(await stashGains(league), from, to)
}
