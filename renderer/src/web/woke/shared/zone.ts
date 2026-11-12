// Where you are right now, from Client.txt: one shared reading for every
// module, so dock icons can show only where they're useful.
import { effectScope, shallowReactive } from 'vue'
import { actFromAreaId, isTownLike } from '../campaign/log-parse'
import type { LogEvent } from '../campaign/log-parse'
import { followGameLog } from './game-log'
import { BOSS_ARENAS, bossAreaIds } from './boss-areas'

export { BOSS_ARENAS }

export type ZoneKind = 'campaign' | 'town' | 'hideout' | 'map' | 'lab' | 'boss' | 'other'

export interface ZoneState {
  areaId: string
  areaLevel: number | null
  // The instance's seed: the same one again when you return through a portal.
  seed: string
  // Display name from "You have entered …".
  name: string
  kind: ZoneKind | null
  // When the current instance was generated (ms), 0 if unknown.
  enteredAt: number
  // Entered while the app was watching, not read back from the log at start-up.
  live: boolean
}

const LAB_ZONES = new Set(["Aspirants' Plaza", "Aspirant's Trial"])

// Bosses an arena can hold: by its area id, or its name if the id isn't known
// (names can be shared between arenas, see boss-areas.ts).
export function arenaBosses (areaId: string, name: string): string[] {
  return bossAreaIds(areaId) ?? ((name && BOSS_ARENAS[name]) || [])
}

export function zoneKind (areaId: string, name: string): ZoneKind {
  if ((name && BOSS_ARENAS[name]) || (areaId && bossAreaIds(areaId))) return 'boss'
  if (/hideout/i.test(areaId) || /hideout/i.test(name)) return 'hideout'
  // Trials of Ascendancy inside maps (EndGame_Labyrinth_trials_*) aren't the lab.
  if ((/labyrinth/i.test(areaId) && !/_trials_/i.test(areaId)) || LAB_ZONES.has(name)) return 'lab'
  if (areaId && isTownLike(areaId)) return 'town'
  if (/^Map/i.test(areaId)) return 'map'
  if (areaId && actFromAreaId(areaId) != null) return 'campaign'
  return 'other'
}

export const zone = shallowReactive<ZoneState>({ areaId: '', areaLevel: null, seed: '', name: '', kind: null, enteredAt: 0, live: false })

function apply (ev: LogEvent | null, at: number, live: boolean) {
  if (!ev) return
  if (ev.kind === 'area') {
    zone.live = live
    zone.areaId = ev.areaId
    zone.areaLevel = ev.areaLevel
    zone.seed = ev.seed ?? ''
    zone.name = ''
    zone.enteredAt = at
    zone.kind = zoneKind(ev.areaId, '')
  } else if (ev.kind === 'zone') {
    zone.name = ev.name
    zone.kind = zoneKind(zone.areaId, ev.name)
  }
}

let started = false

// Starts listening (once) and returns the shared state. The start-up tail
// says where you were when the app started.
export function useZone (): ZoneState {
  if (started) return zone
  started = true
  // Outside any component: lives as long as the app.
  const scope = effectScope(true)
  scope.run(() => followGameLog({
    since: () => 0,
    onLines: (lines, live) => { for (const l of lines) apply(l.ev, l.at, live) }
  }))
  return zone
}

export function inZone (...kinds: ZoneKind[]): boolean {
  return zone.kind != null && kinds.includes(zone.kind)
}
