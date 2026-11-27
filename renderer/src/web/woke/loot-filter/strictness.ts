// NeverSink's seven strictness levels and the ladder that picks one from the
// area level of the maps you've been running.
import { isMapArea } from '../shared/map-areas'
import { actFromAreaId } from '../campaign/log-parse'

export const LEVEL_NAMES = ['Soft', 'Regular', 'Semi-strict', 'Strict', 'Very strict', 'Uber strict', 'Uber plus']
export const LEVEL_SHORT = ['So', 'R', 'SS', 'S', 'VS', 'U', 'U+']

export interface LadderStep {
  // From this area level up (68 = tier 1 maps, 83 = tier 16).
  from: number
  level: number
}

export interface StrictnessAuto {
  on: boolean
  // A manual step (hotkey or button) pauses the ladder until you resume it.
  paused: boolean
  ladder: LadderStep[]
}

// Acts Regular, T1-T10 Semi-strict, T11-T15 Strict, T16+ Very strict.
export const DEFAULT_LADDER: LadderStep[] = [
  { from: 1, level: 1 },
  { from: 68, level: 2 },
  { from: 78, level: 3 },
  { from: 83, level: 4 }
]

export function defaultStrictnessAuto (): StrictnessAuto {
  return { on: true, paused: false, ladder: DEFAULT_LADDER.map(s => ({ ...s })) }
}

export function levelForArea (ladder: LadderStep[], areaLevel: number): number {
  let level = ladder[0]?.level ?? 1
  for (const step of [...ladder].sort((a, b) => a.from - b.from)) {
    if (areaLevel >= step.from) level = step.level
  }
  return level
}

// The ladder step a level range covers, as maps players say it.
export function stepLabel (ladder: LadderStep[], i: number): string {
  const sorted = [...ladder].sort((a, b) => a.from - b.from)
  const from = sorted[i].from
  const to = sorted[i + 1] ? sorted[i + 1].from - 1 : null
  const tier = (area: number) => area - 67
  if (from < 68) return 'Acts'
  if (to == null) return `T${tier(from)}+`
  return tier(from) === tier(to) ? `T${tier(from)}` : `T${tier(from)}-T${tier(to)}`
}

// Recent map area levels decide the ladder step: the highest of the last
// few, so one low map (a side quest, a lab) doesn't drop the filter back.
export const RECENT_MAPS = 3

// Zones whose level picks the step: maps and the campaign. The lab, boss
// arenas, Delve, Heist and map side areas run at their own level, so an Uber
// Lab (83) between T5 maps must not jump the filter to Very strict.
export function ladderZone (areaId: string): boolean {
  return isMapArea(areaId) || actFromAreaId(areaId) != null
}

export function pushArea (recent: number[], areaLevel: number): number[] {
  return [...recent, areaLevel].slice(-RECENT_MAPS)
}

export function ladderTarget (auto: StrictnessAuto, recent: number[]): number | null {
  if (!auto.on || auto.paused || !recent.length) return null
  return levelForArea(auto.ladder, Math.max(...recent))
}

export function clampLevel (n: number): number {
  return Math.max(0, Math.min(LEVEL_NAMES.length - 1, Math.round(n)))
}
