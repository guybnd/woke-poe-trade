// The glance bar's run map count. The run's saved glance counts maps up to
// a stash read; maps logged since come from the map log. A map is logged
// only when the next one starts, so the cut is the newest counted map
// (`lastMapAt`), or the run's start when none was counted, the same rule
// as net-worth/runs.ts mapsIn (left after the start).
export interface GlanceCount { maps: number, startAt: number, lastMapAt?: number, at: number }

export function runMapsNow (g: GlanceCount, recent: ReadonlyArray<{ enteredAt: number, leftAt: number }>): number {
  // An older saved glance: no newest-map time, so its save time.
  const cut = g.lastMapAt ?? (g.maps > 0 ? g.at : 0)
  return g.maps + recent.filter(m => m.enteredAt > cut && m.leftAt > g.startAt).length
}
