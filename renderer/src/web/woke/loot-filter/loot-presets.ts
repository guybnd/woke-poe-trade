// Presets the Loot tab covers (Guy's pick, 2026-11-28: migrate them). While
// the Loot tab's rules are in the filter, the maps side of these presets
// is the Loot tab's: maps-only ones stop, the rest keep working while
// levelling (area level under 68), so they never fight the Loot tab.
import type { Presets } from './presets'
import { PRESET_TYPE } from './presets'
import type { FilterDoc } from './parse'
import { recipeStep } from './currency-weights'
import { LINE_MAX, LINE_MIN } from './currency-settings'

// What each covered preset is now, on the Loot tab (Presets tab's note).
export const LOOT_COVERS: ReadonlyArray<{ key: keyof Presets, now: string, equipment?: true }> = [
  { key: 'cheapCurrency', now: 'Loot › the line (Strictness and each step)' },
  { key: 'cheapSplinters', now: 'Loot › Currency and Fragments' },
  { key: 'cheapCards', now: 'Loot › Divination cards' },
  { key: 'cheapUniques', now: 'Loot › Uniques' },
  { key: 'lowMaps', now: 'Loot › Maps (the tier slider)' },
  { key: 'hideRgb', now: 'Loot › Recipes (R-G-B linked)' },
  { key: 'sixSockets', now: 'Loot › Recipes (6 sockets)' },
  { key: 'vendorQuality', now: 'Loot › Recipes (20% quality gems and flasks)' },
  { key: 'hideFlasks', now: 'Equipment › Flasks', equipment: true }
]

const OFF_IN_MAPS = ['cheapCurrency', 'cheapSplinters', 'cheapUniques', 'lowMaps', 'hideRgb']

// The presets as compose should use them. `loot`: the Loot tab's rules are
// in; `flasks`: Equipment scores flasks.
export function lootPresets (p: Presets, loot: boolean, flasks: boolean): Presets {
  if (!loot && !flasks) return p
  const out = { ...p } as Record<string, unknown>
  if (flasks) out.hideFlasks = { ...p.hideFlasks, on: false }
  if (!loot) return out as unknown as Presets
  for (const k of OFF_IN_MAPS) out[k] = { ...(p[k as keyof Presets] as object), on: false }
  // R-G-B at 0 on Recipes: NeverSink's chromatic rules stop in maps.
  out.hideRgb = { on: recipeStep(p.currency, 'rgb') === 0 }
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
// cheap currency line, the low maps tier, R-G-B and 6 sockets. Marked done
// in catMode (`rcmig`), like the recipes.
export function migrateLootPresets (p: Presets) {
  const c = p.currency
  const mode = c.catMode as Record<string, unknown>
  if (!c.on || mode.rcmig) return
  if (p.cheapCurrency.on) c.line = Math.min(LINE_MAX, Math.max(LINE_MIN, p.cheapCurrency.chaos))
  if (p.lowMaps.on) c.mapFrom = p.lowMaps.tier
  const next: Record<string, unknown> = { ...mode, rcmig: 1, rcrgb: p.hideRgb.on ? 0 : 1 }
  if (!p.sixSockets.on) next.rcsix = 0
  c.catMode = next as typeof c.catMode
}
