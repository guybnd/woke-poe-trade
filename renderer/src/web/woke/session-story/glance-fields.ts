// The glance bar's fields and when it shows (Settings › Sessions, "While in a
// map"). Loads with the Session story chunk, not at startup: widget.ts only
// holds the saved values' types.
import type { GlanceField, GlanceShow } from './widget'

export const GLANCE_FIELDS: ReadonlyArray<{ id: GlanceField, label: string, hint: string }> = [
  { id: 'map', label: 'Map and tier', hint: 'The map you are in and its tier' },
  { id: 'time', label: 'Map time', hint: 'Its time so far; amber once past your average for it' },
  { id: 'deaths', label: 'Deaths', hint: 'Deaths in this map, once you die' },
  { id: 'mechanics', label: 'Mechanics', hint: 'Einhar, Delirium and the like, as they speak' },
  { id: 'maps', label: 'Maps', hint: "The run's maps, or tonight's with no run going" },
  { id: 'profit', label: 'Profit', hint: 'Profit at the last stash read' },
  { id: 'perHour', label: 'Per hour', hint: 'Profit per hour; the Per hour setting decides what time counts' },
  { id: 'total', label: 'Total time', hint: 'How long the run, or tonight, has gone' },
  { id: 'avg', label: 'Average map', hint: 'Your average map time in the run, or tonight' },
  { id: 'last', label: 'Last map', hint: 'Between maps: the map you just left, against your average' }
]

// Today's bar, plus the last map between maps (it only shows when the bar stays out of maps).
export const DEFAULT_GLANCE_FIELDS: readonly GlanceField[] = ['map', 'time', 'maps', 'profit', 'last']

const KNOWN = new Set<string>(GLANCE_FIELDS.map(f => f.id))
// The saved list, cleaned; undefined: the defaults. An empty list stays empty.
export function glanceFields (saved: unknown): Set<GlanceField> {
  if (!Array.isArray(saved)) return new Set(DEFAULT_GLANCE_FIELDS)
  return new Set(saved.filter((f): f is GlanceField => typeof f === 'string' && KNOWN.has(f)))
}

export const GLANCE_SHOW: Array<{ value: GlanceShow, label: string }> = [
  { value: 'map', label: 'In maps' },
  { value: 'run', label: 'While a run goes' },
  { value: 'game', label: 'All the time in game' }
]
export function glanceShow (saved: unknown): GlanceShow {
  return saved === 'run' || saved === 'game' ? saved : 'map'
}

// Whether the bar shows outside a map: a run going (either setting past "In
// maps"), or tonight going ("All the time in game").
export function glanceOutside (show: GlanceShow, runGoing: boolean, nightGoing: boolean): boolean {
  if (show === 'map') return false
  return runGoing || (show === 'game' && nightGoing)
}

// The map you just left, for the bar between maps: its time against the hour's
// average for it, or your usual map (chip.ts compareMap).
export interface LastMap { name: string, mapMs: number, diff: number | null }
export function lastMapOf (rec: { name: string, mapMs: number }, cmp: { hourAvg: number | null, usual: number | null }): LastMap {
  const base = cmp.hourAvg ?? cmp.usual
  return { name: rec.name, mapMs: rec.mapMs, diff: base != null ? rec.mapMs - base : null }
}

// Average map time over maps; null under two (one map is its own time).
export function avgMapMs (maps: ReadonlyArray<{ mapMs: number }>): number | null {
  const real = maps.filter(m => m.mapMs > 30_000)
  return real.length >= 2 ? real.reduce((s, m) => s + m.mapMs, 0) / real.length : null
}

// Per hour needs this much counted time, like Net worth's runs.
const MIN_RATE_MS = 10 * 60_000
export function perHourOf (profitChaos: number | null, ms: number): number | null {
  return profitChaos != null && ms >= MIN_RATE_MS ? profitChaos / (ms / 3_600_000) : null
}

// "2:31" for hours and minutes; under an hour "45m".
export function hoursText (ms: number): string {
  const m = Math.max(0, Math.floor(ms / 60_000))
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`
}
