// Valdo map skips: mods a build can't run, so a Valdo map's price check hides
// the loaded listings that have one. The trade site searches only a Valdo map's
// Void mod, so the rest are read from each listing here, with no extra search.
//
// The list lives on the active Map mods profile, so each profile (one per
// build) is its own template. It fills itself from the profile's "can't run"
// map mods; a skip added on the Valdo strip is kept in valdoSkip, and an
// automatic one switched off in valdoKeep.
import { shallowRef } from 'vue'
import { AppConfig } from '@/web/Config'
import { isModuleOn } from '../modules'
import type { ListingItem, ListingMod } from '../price-insight/listing-tip'
import type { MapModProfile } from '../map-mods/rules'
import type { MapModsWidget } from '../map-mods/widget'

// As map-mods/widget.ts names it (not imported: TradeListing loads this up front).
const MAP_MODS_TYPE = 'woke-map-mods'

/** The Void mod is set Any / Void / No void on the strip, never skipped here. */
export const VOID_TEXT = 'Players who Die in area are sent to the Void'

/**
 * A mod line as a key: numbers read "#", so "Players deal 10% less Damage per
 * Equipped Item" and "#% less" are one mod. Only a mod's first line counts
 * ("…per Equipped Item" has a minions line under it).
 */
export function skipKey (text: string): string {
  return text.split('\n')[0]
    .replace(/ — Unscalable Value$/, '')
    .replace(/[+-]?\d+(?:\.\d+)?/g, '#')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/** A key as the strip shows it: the text with numbers as "#", first letter up. */
export function skipLabel (text: string): string {
  const line = text.split('\n')[0].replace(/ — Unscalable Value$/, '').replace(/[+-]?\d+(?:\.\d+)?/g, '#').trim()
  return line.charAt(0).toUpperCase() + line.slice(1)
}

export interface SkipEntry {
  key: string
  label: string
  /** From the profile's "can't run" map mods, not added on the strip. */
  auto: boolean
}

/** The profile's skips, automatic ones first, by label within each. */
export function profileSkips (profile: Pick<MapModProfile, 'ratings' | 'valdoSkip' | 'valdoKeep'>): SkipEntry[] {
  const keep = new Set(profile.valdoKeep ?? [])
  const out = new Map<string, SkipEntry>()
  const voidKey = skipKey(VOID_TEXT)
  for (const [matcher, rating] of Object.entries(profile.ratings)) {
    if (rating !== 'deadly') continue
    const key = skipKey(matcher)
    if (key === voidKey || keep.has(key) || out.has(key)) continue
    out.set(key, { key, label: skipLabel(matcher), auto: true })
  }
  for (const text of profile.valdoSkip ?? []) {
    const key = skipKey(text)
    if (key === voidKey || out.has(key)) continue
    out.set(key, { key, label: skipLabel(text), auto: false })
  }
  return [...out.values()]
}

export function isSkipped (profile: Pick<MapModProfile, 'ratings' | 'valdoSkip' | 'valdoKeep'>, text: string): boolean {
  const key = skipKey(text)
  return profileSkips(profile).some(s => s.key === key)
}

/** Skip or stop skipping a mod on the profile. */
export function setSkipped (profile: MapModProfile, text: string, on: boolean): void {
  const key = skipKey(text)
  if (key === skipKey(VOID_TEXT)) return
  const auto = Object.entries(profile.ratings).some(([m, r]) => r === 'deadly' && skipKey(m) === key)
  const added = (profile.valdoSkip ?? []).filter(t => skipKey(t) !== key)
  const kept = (profile.valdoKeep ?? []).filter(k => k !== key)
  if (on) {
    // An automatic one switched back on needs only its keep removed.
    if (!auto) added.push(skipLabel(text))
  } else if (auto) {
    kept.push(key)
  }
  profile.valdoSkip = added.length ? added : undefined
  profile.valdoKeep = kept.length ? kept : undefined
}

function modText (m: ListingMod): string {
  return typeof m === 'string' ? m : m.description ?? ''
}

/** The listing's mods as keys, every line of each mod. */
function listingKeys (item: ListingItem): string[] {
  const out: string[] = []
  for (const m of item.explicitMods ?? []) {
    for (const line of modText(m).split('\n')) {
      if (line.trim()) out.push(skipKey(line))
    }
  }
  return out
}

/** The first skipped mod on the listing, by key, or null. */
export function skippedBy (item: ListingItem | undefined, keys: ReadonlySet<string>): string | null {
  if (!item || !keys.size) return null
  return listingKeys(item).find(k => keys.has(k)) ?? null
}

/** The active Map mods profile, or null when Map mods is off or not set up yet. */
export function valdoProfile (): MapModProfile | null {
  const config = AppConfig()
  if (!isModuleOn(config, 'map-mods')) return null
  const w = config.widgets.find(w => w.wmType === MAP_MODS_TYPE) as MapModsWidget | undefined
  if (!w || w.wmFlags[0] === 'uninitialized' || !Array.isArray(w.profiles) || !w.profiles.length) return null
  return w.profiles.find(p => p.id === w.activeProfile) ?? w.profiles[0]
}

/** The keys to skip now: empty when there's no profile. */
export function activeSkipKeys (): ReadonlySet<string> {
  const p = valdoProfile()
  return new Set(p ? profileSkips(p).map(s => s.key) : [])
}

/** What the listings below the strip hid: TradeListing writes it, the strip reads it. */
export const valdoHidden = shallowRef<{ hidden: number, loaded: number } | null>(null)
