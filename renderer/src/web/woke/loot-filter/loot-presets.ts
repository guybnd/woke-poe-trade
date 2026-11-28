// Presets the Loot tab covers (Guy's pick, 2026-11-28: migrate them). While
// the Loot tab's rules are in the filter, the maps side of these presets
// is the Loot tab's: maps-only ones stop, the rest keep working while
// levelling (area level under 68), so they never fight the Loot tab.
import type { Presets } from './presets'
import { PRESET_TYPE } from './presets'
import type { FilterDoc } from './parse'
import { recipeStep } from './currency-weights'
import { LINE_MAX, LINE_MIN } from './currency-settings'
import type { CStep } from './currency-settings'

// What each covered preset is now, on the Loot tab (Presets tab's note).
export const LOOT_COVERS: ReadonlyArray<{ key: keyof Presets, now: string, equipment?: true }> = [
  { key: 'cheapCurrency', now: 'Loot › the line (Strictness and each step)' },
  { key: 'cheapSplinters', now: 'Loot › Currency and Fragments' },
  { key: 'cheapCards', now: 'Loot › Divination cards' },
  { key: 'cheapUniques', now: 'Loot › Uniques' },
  { key: 'lowMaps', now: 'Loot › Maps (the tier slider)' },
  { key: 'hideRgb', now: 'Loot › Recipes (R-G-B linked)' },
  { key: 'sixSockets', now: 'Loot › Recipes (6 sockets)' },
  { key: 'vendorQuality', now: 'Loot › Recipes (20% quality gems and flasks)' }
]

const OFF_IN_MAPS = ['cheapCurrency', 'cheapSplinters', 'cheapUniques', 'lowMaps', 'hideRgb']

// The presets as compose should use them. `loot`: the Loot tab's rules are
// in. (Hide flasks keeps working with Equipment on: Equipment › Flasks
// scores utility flasks only, and its rules come first anyway.)
// `rgb`: the R-G-B recipe's step as it applies (its price's, unless picked).
export function lootPresets (p: Presets, loot: boolean, rgb: CStep = recipeStep(p.currency, 'rgb')): Presets {
  if (!loot) return p
  const out = { ...p } as Record<string, unknown>
  for (const k of OFF_IN_MAPS) out[k] = { ...(p[k as keyof Presets] as object), on: false }
  // R-G-B at 0 on Recipes: NeverSink's chromatic rules stop in maps.
  out.hideRgb = { on: rgb === 0 }
  return out as unknown as Presets
}

// The levelling side of the covered presets that work everywhere (cheap
// cards, 6 sockets, the vendor quality rules): only under area level 68.
const LEVELLING = /^(cheapcards|sixsockets|vendorflasks|vendorgems)/
export function levellingOnly (doc: FilterDoc) {
  for (const b of doc.blocks) {
    if (b.type !== PRESET_TYPE || !LEVELLING.test(b.tier ?? '')) continue
    b.conditions = [...b.conditions, { key: 'AreaLevel', op: '<', count: null, values: ['68'] }]
    b.dirty = true
  }
}

// The first time the Loot tab is on, the covered presets' settings carry
// over (Guy's pick: "your old setting carries over the first time"): the
// cheap currency line, the low maps tier, and Hide R-G-B (R-G-B Off). Marked
// done in catMode (`rcmig` 2), like the recipes. A line or maps tier already
// moved off its default is yours and stays. The other recipes follow their
// reward's price (Guy 2026-11-28), so an untouched preset pins nothing; a
// carry-over from before (`rcmig` 1) that pinned R-G-B Small or 6 sockets Off
// from presets left at their defaults is undone once. `migratedPresets` is
// the same without writing, so a filter saved before the Loot tab is opened
// gets it too.
const LINE_DEFAULT = 0.2
const MIGRATED = 2
export function migratedPresets (p: Presets): Presets {
  const c = p.currency
  const mode = c.catMode as Record<string, unknown>
  if (!c.on || mode.rcmig === MIGRATED) return p
  const drop = (k: string, v: unknown) => mode.rcmig && mode[k] === v
  const next: Record<string, unknown> = Object.fromEntries(Object.entries(mode).filter(([k]) => !(k === 'rcrgb' && !p.hideRgb.on && drop(k, 1)) && !(k === 'rcsix' && !p.sixSockets.on && drop(k, 0))))
  next.rcmig = MIGRATED
  if (!mode.rcmig && p.hideRgb.on) next.rcrgb = 0
  return {
    ...p,
    currency: {
      ...c,
      line: !mode.rcmig && p.cheapCurrency.on && c.line === LINE_DEFAULT ? Math.min(LINE_MAX, Math.max(LINE_MIN, p.cheapCurrency.chaos)) : c.line,
      mapFrom: !mode.rcmig && p.lowMaps.on && c.mapFrom === 1 ? p.lowMaps.tier : c.mapFrom,
      catMode: next as typeof c.catMode
    }
  }
}
export function migrateLootPresets (p: Presets) {
  const m = migratedPresets(p)
  if (m === p) return
  p.currency.line = m.currency.line
  p.currency.mapFrom = m.currency.mapFrom
  p.currency.catMode = m.currency.catMode
}
