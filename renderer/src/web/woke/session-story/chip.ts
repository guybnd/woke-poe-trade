// The map line: what a finished map is compared with, and its text. Kept out
// of map-log.ts so it loads with the Session story window, not at startup.
import { tierText, usualMapMs } from './map-log'
import type { MapRecord } from './map-log'

export interface MapCompare {
  // The same map's runs in the hour before this one, and their mean time.
  hourAvg: number | null
  hourRuns: number
  // The map run just before this one (any map), and its time.
  prev: { name: string, mapMs: number } | null
  // Your last USUAL_OF maps, any map, when there's no hour of this one.
  usual: number | null
  // This map's runs in the hour, oldest first, ending with this one (at most 6).
  runs: number[]
  // The fastest of those runs, this one included.
  best: number
}

const HOUR_MS = 3_600_000

// What a finished map is compared with. `recent`: saved maps, newest first,
// without this one. Quick looks in (under 30 s) don't count.
export function compareMap (rec: MapRecord, recent: readonly MapRecord[]): MapCompare {
  const others = recent.filter(m => m.key !== rec.key && m.mapMs > 30_000 && m.enteredAt < rec.enteredAt)
  const same = others.filter(m => m.name === rec.name && rec.enteredAt - m.enteredAt <= HOUR_MS)
  const prev = others[0] ?? null
  return {
    hourAvg: same.length ? same.reduce((s, m) => s + m.mapMs, 0) / same.length : null,
    hourRuns: same.length,
    prev: prev ? { name: prev.name, mapMs: prev.mapMs } : null,
    usual: same.length ? null : usualMapMs(others),
    runs: [...same.slice(0, 5).map(m => m.mapMs).reverse(), rec.mapMs],
    best: Math.min(rec.mapMs, ...same.map(m => m.mapMs))
  }
}

function signedClock (diff: number, clock: (ms: number) => string): string {
  if (Math.abs(diff) < 1000) return '='
  return `${diff < 0 ? '▼' : '▲'}${clock(Math.abs(diff))}`
}

// The chip: "Fortress T16 · 1:51" then "1h avg 2:03 (4) ▼0:12 · Last 1:45 ▲0:06 · 1 death · Einhar".
export function chipLines (rec: MapRecord, cmp: MapCompare, clock: (ms: number) => string): string[] {
  const head = `${rec.name} ${tierText(rec.areaLevel)} · ${clock(rec.mapMs)}`
  const parts: string[] = []
  if (cmp.hourAvg != null) parts.push(`1h avg ${clock(cmp.hourAvg)} (${cmp.hourRuns}) ${signedClock(rec.mapMs - cmp.hourAvg, clock)}`)
  else if (cmp.usual != null) parts.push(`Usual ${clock(cmp.usual)} ${signedClock(rec.mapMs - cmp.usual, clock)}`)
  if (cmp.prev) parts.push(`Last${cmp.prev.name === rec.name ? '' : ` (${cmp.prev.name})`} ${clock(cmp.prev.mapMs)} ${signedClock(rec.mapMs - cmp.prev.mapMs, clock)}`)
  if (rec.deaths) parts.push(`${rec.deaths} ${rec.deaths === 1 ? 'death' : 'deaths'}`)
  if (rec.npcs.length) parts.push(rec.npcs.join(', '))
  if (rec.levelsGained && rec.charLevel != null) parts.push(`Level ${rec.charLevel + rec.levelsGained}`)
  return parts.length ? [head, parts.join(' · ')] : [head]
}
