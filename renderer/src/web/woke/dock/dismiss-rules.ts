// When a dock icon dismissed for "this map" (or visit, lab, fight, zone) comes
// back. Pure: the zone is passed in.
import type { ZoneKind } from '../shared/zone'

// run: a map or boss fight, kept through trips to the hideout or town, ended by
// another instance. lab: until you leave the lab. zone: until you leave the area.
export type HereRule = 'run' | 'lab' | 'zone'

export interface ZoneRef {
  areaId: string
  seed: string
  kind: ZoneKind | null
}

export interface HereScope {
  rule: HereRule
  areaId: string
  seed: string
  // How it's worded, e.g. "this map".
  phrase: string
}

const BY_KIND: Partial<Record<ZoneKind, { phrase: string, rule: HereRule }>> = {
  map: { phrase: 'this map', rule: 'run' },
  boss: { phrase: 'this fight', rule: 'run' },
  lab: { phrase: 'this lab', rule: 'lab' },
  town: { phrase: 'this visit', rule: 'zone' },
  hideout: { phrase: 'this visit', rule: 'zone' }
}

export function hereScope (z: ZoneRef): HereScope {
  const known = z.kind ? BY_KIND[z.kind] : undefined
  return { rule: known?.rule ?? 'zone', phrase: known?.phrase ?? 'this zone', areaId: z.areaId, seed: z.seed }
}

export function hereEnded (s: HereScope, z: ZoneRef): boolean {
  const sameInstance = z.areaId === s.areaId && z.seed === s.seed
  switch (s.rule) {
    case 'lab': return z.kind !== 'lab'
    case 'run': return !sameInstance && z.kind !== 'town' && z.kind !== 'hideout'
    case 'zone': return !sameInstance
  }
}

// The next local midnight.
export function endOfToday (now: number): number {
  const d = new Date(now)
  d.setHours(24, 0, 0, 0)
  return d.getTime()
}

// "23 min left", "2 h left", for the bring-back list.
export function timeLeft (until: number, now: number): string {
  const min = Math.max(1, Math.ceil((until - now) / 60_000))
  return min < 60 ? `${min} min left` : `${Math.ceil(min / 60)} h left`
}
