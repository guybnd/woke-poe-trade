// The glance bar's run map count: the run's saved glance counts maps up to
// when it was saved (a stash read); maps finished since come from the map log.
export function runMapsNow (savedMaps: number, savedAt: number, recent: ReadonlyArray<{ enteredAt: number }>): number {
  return savedMaps + (savedAt > 0 ? recent.filter(m => m.enteredAt > savedAt).length : 0)
}
