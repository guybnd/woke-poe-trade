// The versions table laid out as Guy picked (C, 2026-11-21): one row per
// level and quality, a Clean and a Corrupted price side by side (and the Vaal
// form's when it has one), and how far each row is from your gem.
import type { GemVersion } from './versions'

export interface VersionRow {
  level: number
  quality: number
  clean: GemVersion | null
  corrupted: GemVersion | null
  vaal: GemVersion | null
  // The row's best price minus your gem's; null when your gem has no price.
  delta: number | null
  own: boolean
  // A new level starts here: a line above it.
  firstOfLevel: boolean
}

export function versionRows (versions: GemVersion[]): VersionRow[] {
  const own = versions.find(v => v.own)?.chaos ?? null
  const byKey = new Map<string, VersionRow>()
  for (const v of versions) {
    const key = `${v.level}/${v.quality}`
    let row = byKey.get(key)
    if (!row) {
      row = { level: v.level, quality: v.quality, clean: null, corrupted: null, vaal: null, delta: null, own: false, firstOfLevel: false }
      byKey.set(key, row)
    }
    if (v.vaal) row.vaal = v
    else if (v.corrupted) row.corrupted = v
    else row.clean = v
    if (v.own) row.own = true
  }
  const rows = [...byKey.values()].sort((a, b) => a.level - b.level || a.quality - b.quality)
  rows.forEach((r, i) => {
    r.firstOfLevel = i > 0 && rows[i - 1].level !== r.level
    const best = Math.max(...[r.clean, r.corrupted, r.vaal].filter((v): v is GemVersion => v != null).map(v => v.chaos))
    r.delta = own == null ? null : best - own
  })
  return rows
}
