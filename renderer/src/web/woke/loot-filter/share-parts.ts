// The parts of a profile a share code can carry, and how to take some parts
// from one profile's presets into another's. One function serves both ends:
// sharing some parts is mergeParts(defaults, mine, parts); importing them is
// mergeParts(mine, theirs, parts). Settings added later follow on their own:
// an unknown Loot field keyed by section goes with that section's page, any
// other one with All loot, an unknown preset with Presets.
import type { Presets } from './presets'
import { defaultPresets, normalizePresets } from './presets'
import type { CurrencySettings } from './currency-settings'
import { ALL_CATEGORIES, RECIPES, kindOf } from './currency-weights'

export const SHARE_PARTS = [
  { key: 'loot', label: 'All loot: ruler, steps, bias' },
  { key: 'currency', label: 'Currency' },
  { key: 'fragments', label: 'Fragments' },
  { key: 'cards', label: 'Cards' },
  { key: 'uniques', label: 'Uniques' },
  { key: 'gems', label: 'Gems' },
  { key: 'maps', label: 'Maps' },
  { key: 'jewels', label: 'Jewels' },
  { key: 'league', label: 'League' },
  { key: 'gear', label: 'Gear, rare weights, recipes' },
  { key: 'presets', label: 'Looks, sounds, presets' },
  { key: 'changes', label: 'NeverSink changes, own rules' }
] as const

export type SharePart = typeof SHARE_PARTS[number]['key']
export const ALL_PARTS: SharePart[] = SHARE_PARTS.map(p => p.key)
export const isSharePart = (x: unknown): x is SharePart => ALL_PARTS.includes(x as SharePart)

// Item name → its Loot section, from the filter in use. Unknown names go with All loot.
export type CatOf = (name: string) => string | undefined

const CAT_IDS = new Set(ALL_CATEGORIES.map(c => c.id))
const KINDS = new Set(['currency', 'fragments', 'cards', 'uniques', 'gems', 'maps', 'jewels', 'league'])
const RECIPE_IDS = new Set<string>(RECIPES.map(r => r.id))

function pageOfCat (cat: string): SharePart {
  const k = kindOf(cat)
  return k === 'gold' ? 'currency' : k
}

// The page a key of a per-section record belongs to ('all' and anything
// unknown: All loot).
export function partOfKey (k: string): SharePart {
  // Recipe steps are saved as 'rc<id>', with 'rcmig' marking their move there.
  if (k === 'rcmig' || (k.startsWith('rc') && RECIPE_IDS.has(k.slice(2)))) return 'gear'
  if (CAT_IDS.has(k) || k === 'gold') return pageOfCat(k)
  if (KINDS.has(k)) return k as SharePart
  return 'loot'
}

// Loot fields that belong to one page rather than All loot.
const FIELD_PAGE: Partial<Record<keyof CurrencySettings, SharePart>> = {
  mapFrom: 'maps',
  gold: 'currency',
  sizeCut: 'uniques',
  chaseLook: 'uniques',
  notAvg: 'uniques'
}
// Never shared: worked out on the fly.
const SKIP_FIELDS = new Set(['sizeOn'])
// Loot fields keyed by section even though they look like plain objects of
// settings: none so far. Fields keyed by step ('steps') are All loot.
const BY_STEP = new Set(['steps'])

const GEAR_PRESETS = new Set(['gear', 'weights', 'lowTiers', 'hideGear', 'weapons', 'chaosRecipe', 'sixSockets', 'msBoots', 'hideRgb', 'vendorQuality', 'hideFlasks'])

export function partOfPreset (k: string): SharePart | null {
  if (k === 'currency') return null
  // The Jewels page's "cluster jewels follow poe.ninja".
  if (k === 'clusterPrices') return 'jewels'
  return GEAR_PRESETS.has(k) ? 'gear' : 'presets'
}

const clone = <T>(x: T): T => x === undefined ? x : JSON.parse(JSON.stringify(x))
const isRecord = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v)

function mergeCurrency (base: CurrencySettings, from: CurrencySettings, parts: ReadonlySet<SharePart>, catOf: CatOf): CurrencySettings {
  const b = base as unknown as Record<string, unknown>
  const f = from as unknown as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const k of new Set([...Object.keys(b), ...Object.keys(f)])) {
    if (SKIP_FIELDS.has(k)) continue
    if (k === 'items') {
      const items: Record<string, unknown> = {}
      const take = (src: Record<string, unknown>, mine: boolean) => {
        for (const [n, e] of Object.entries(src ?? {})) {
          const page = partOfKey(catOf(n) ?? '')
          if (parts.has(page) !== mine) items[n] = clone(e)
        }
      }
      take(b.items as Record<string, unknown>, true)
      take(f.items as Record<string, unknown>, false)
      out.items = items
      continue
    }
    const page = FIELD_PAGE[k as keyof CurrencySettings]
    if (page || BY_STEP.has(k) || !(isRecord(b[k]) || isRecord(f[k])) || k === 'faint') {
      const src = parts.has(page ?? 'loot') ? f : b
      if (src[k] !== undefined) out[k] = clone(src[k])
      continue
    }
    // Keyed by section or page: each key goes with its own page.
    const rec: Record<string, unknown> = {}
    const bk = isRecord(b[k]) ? b[k] as Record<string, unknown> : {}
    const fk = isRecord(f[k]) ? f[k] as Record<string, unknown> : {}
    for (const key of new Set([...Object.keys(bk), ...Object.keys(fk)])) {
      const src = parts.has(partOfKey(key)) ? fk : bk
      if (src[key] !== undefined) rec[key] = clone(src[key])
    }
    out[k] = rec
  }
  return out as unknown as CurrencySettings
}

// `base` with the given parts taken from `from`. Edits, own rules and locked
// tiers ('changes') aren't presets: the caller moves those.
export function mergeParts (base: Presets, from: Presets, parts: Iterable<SharePart>, catOf: CatOf): Presets {
  const set = new Set(parts)
  const b = base as unknown as Record<string, unknown>
  const f = from as unknown as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const k of new Set([...Object.keys(b), ...Object.keys(f)])) {
    const part = partOfPreset(k)
    if (part == null) continue
    const src = set.has(part) ? f : b
    if (src[k] !== undefined) out[k] = clone(src[k])
  }
  out.currency = mergeCurrency(base.currency, from.currency, set, catOf)
  return normalizePresets(out as Partial<Presets>)
}

// What each page holds that differs from a fresh profile, for the picker's counts.
export function partCounts (p: Presets, catOf: CatOf, changes = 0): Record<SharePart, number> {
  const d = defaultPresets()
  const counts = Object.fromEntries(ALL_PARTS.map(k => [k, 0])) as Record<SharePart, number>
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
  const r = p as unknown as Record<string, unknown>
  const dr = d as unknown as Record<string, unknown>
  for (const k of Object.keys(r)) {
    const part = partOfPreset(k)
    if (part && !same(r[k], dr[k])) counts[part]++
  }
  const c = p.currency as unknown as Record<string, unknown>
  const dc = d.currency as unknown as Record<string, unknown>
  for (const k of Object.keys(c)) {
    if (SKIP_FIELDS.has(k)) continue
    if (k === 'items') {
      for (const n of Object.keys(p.currency.items)) counts[partOfKey(catOf(n) ?? '')]++
      continue
    }
    const page = FIELD_PAGE[k as keyof CurrencySettings]
    if (page || BY_STEP.has(k) || !isRecord(c[k]) || k === 'faint') {
      if (!same(c[k], dc[k])) counts[page ?? 'loot']++
      continue
    }
    const dk = isRecord(dc[k]) ? dc[k] as Record<string, unknown> : {}
    for (const [key, v] of Object.entries(c[k] as Record<string, unknown>)) {
      if (!same(v, dk[key])) counts[partOfKey(key)]++
    }
  }
  counts.changes = changes
  return counts
}
