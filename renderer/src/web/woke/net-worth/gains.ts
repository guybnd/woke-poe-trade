// Stash gains for other modules (farming, session analytics, boss runs):
// session profit from what actually landed in the stash, not typed-in loot.
// Empty unless the personal stash reader is on and has read twice.
import { hostRequest } from '../shared/host'
import { gainsBetween } from './valuation'
import type { StashGain } from './valuation'

export const GAINS_COLLECTION = 'net-worth'
export const gainsKey = (league: string) => `${league}-gains`

export async function stashGains (league: string): Promise<StashGain[]> {
  const saved = await hostRequest<StashGain[] | null>('doc-get', { collection: GAINS_COLLECTION, key: gainsKey(league) }).catch(() => null)
  return Array.isArray(saved) ? saved : []
}

// Net stash change for refreshes between `from` and `to` (ms).
export async function stashGainsBetween (league: string, from: number, to: number) {
  return gainsBetween(await stashGains(league), from, to)
}
