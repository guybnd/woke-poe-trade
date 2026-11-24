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

/** The Map mods window's config, or null when Map mods is off or not set up yet. */
export function valdoConfig (): MapModsWidget | null {
  const config = AppConfig()
  if (!isModuleOn(config, 'map-mods')) return null
  const w = config.widgets.find(w => w.wmType === MAP_MODS_TYPE) as MapModsWidget | undefined
  if (!w || w.wmFlags[0] === 'uninitialized' || !Array.isArray(w.profiles) || !w.profiles.length) return null
  return w
}

/** The active Map mods profile: the Valdo template. */
export function valdoProfile (): MapModProfile | null {
  const w = valdoConfig()
  return w ? w.profiles.find(p => p.id === w.activeProfile) ?? w.profiles[0] : null
}

// Valdo mods met so far, kept for "Add a mod". The cap keeps a list of junk
// (a misread line) from growing for ever: the oldest go first.
const SEEN_CAP = 300

/** Adds mods to the met list (numbers as "#", one per mod); returns whether it changed. */
export function rememberSeen (w: Pick<MapModsWidget, 'valdoSeen'>, texts: Iterable<string>): boolean {
  const list = [...(w.valdoSeen ?? [])]
  const keys = new Set(list.map(skipKey))
  const voidKey = skipKey(VOID_TEXT)
  let changed = false
  for (const text of texts) {
    const key = skipKey(text)
    if (!key || key === voidKey || keys.has(key)) continue
    keys.add(key)
    list.push(skipLabel(text))
    changed = true
  }
  if (!changed) return false
  w.valdoSeen = list.slice(-SEEN_CAP)
  return true
}

/** The first lines of the loaded listings' mods: TradeListing writes them, the strip remembers them. */
export const valdoListingMods = shallowRef<readonly string[]>([])

/** Every mod line of a listing, as text. */
export function listingModLines (item: ListingItem | undefined): string[] {
  const out: string[] = []
  for (const m of item?.explicitMods ?? []) {
    const first = modText(m).split('\n')[0]
    // A minions line belongs to the player mod above it.
    if (first.trim() && !first.startsWith("Players' Minions ")) out.push(first)
  }
  return out
}

/** The keys to skip now: empty when there's no profile. */
export function activeSkipKeys (): ReadonlySet<string> {
  const p = valdoProfile()
  return new Set(p ? profileSkips(p).map(s => s.key) : [])
}

/**
 * Mods set Has on the strip: only listings with every one of them show. For
 * this price check only (not saved); the strip clears it on a new item.
 */
export const valdoNeed = shallowRef<ReadonlySet<string>>(new Set())

/** Whether the listing is hidden: it has a skipped mod, or lacks a needed one. */
export function valdoHides (item: ListingItem | undefined, skip: ReadonlySet<string>, need: ReadonlySet<string>): boolean {
  if (!skip.size && !need.size) return false
  if (!item) return false
  const keys = new Set(listingKeys(item))
  // A mod set Has for this check wins over the same mod's saved Not.
  for (const k of keys) if (skip.has(k) && !need.has(k)) return true
  for (const k of need) if (!keys.has(k)) return true
  return false
}

/** What the listings below the strip hid: TradeListing writes it, the strip reads it. */
export const valdoHidden = shallowRef<{ hidden: number, loaded: number } | null>(null)

// Search's "valdo <reward>" asks for its price check to start with Any void
// (its made-up map has no Void mod, which would mean No void). Taken once,
// by the next Valdo strip, within a few seconds.
let lookupAsk = 0
export function askLookupAny (): void { lookupAsk = Date.now() }
export function takeLookupAsk (): boolean {
  const on = Date.now() - lookupAsk < 5000
  lookupAsk = 0
  return on
}

export interface ListingMark {
  label: string
  rating: 'deadly' | 'warn' | 'good'
}

const MARK_ORDER = { deadly: 0, warn: 1, good: 2 } as const

/**
 * The listing's mods the profile rates (Bad, Care, Want), worst first: shown
 * on the listing's row, so a mod you care about shows without a filter for it.
 */
export function listingMarks (item: ListingItem | undefined, profile: Pick<MapModProfile, 'ratings'> | null): ListingMark[] {
  if (!item || !profile) return []
  const rated = new Map<string, ListingMark['rating']>()
  for (const [matcher, rating] of Object.entries(profile.ratings)) {
    if (rating === 'deadly' || rating === 'warn' || rating === 'good') rated.set(skipKey(matcher), rating)
  }
  if (!rated.size) return []
  const out: ListingMark[] = []
  const seen = new Set<string>()
  for (const line of listingModLines(item)) {
    const key = skipKey(line)
    const rating = rated.get(key)
    if (!rating || seen.has(key)) continue
    seen.add(key)
    out.push({ label: skipLabel(line), rating })
  }
  return out.sort((a, b) => MARK_ORDER[a.rating] - MARK_ORDER[b.rating])
}
