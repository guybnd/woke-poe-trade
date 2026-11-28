// The price check's "Base" step: price the item as its base. It ticks the
// exact base type, item level, influence and quality over 20, and unticks every
// mod except the ones that come with the base: fractured mods, synthesised
// implicits, Exceptional or better eldritch implicits, and a corrupted item's
// corruption implicits. A second click puts the earlier ticks back.
import type { ParsedItem } from '@/parser'
import { ModifierMechanic, ModifierType } from '@/parser/modifiers'
import { rawClone } from '@/web/woke/raw-clone'
import type { FilterOrGroup, ItemFilters, StatFilter } from '@/web/price-check/filters/interfaces'
import { FilterTag } from '@/web/price-check/filters/interfaces'

// Exceptional (4) and up: worth keeping; lower tiers are cheap to reroll.
const ELDRITCH_KEEP_RANK = 4
const ILVL_CAP = 86

/** True when the row is part of the base: it stays ticked. */
export function keepOnBase (f: StatFilter, item: ParsedItem): boolean {
  // Totals like Armour bake in quality and the base roll; hidden rows can't be seen.
  if (f.not || f.hidden || f.tag === FilterTag.Property) return false
  if (f.fracLead) return true
  const infos = f.sources.map(s => s.modifier.info)
  // Every part of the row must come with the base: a total that also counts an
  // explicit mod (say an implicit plus a crafted resistance) is not the base.
  return infos.length > 0 && infos.every(i =>
    i.type === ModifierType.Fractured ||
    i.mechanic === ModifierMechanic.Synthesised ||
    (i.eldritch != null && (i.rank ?? 0) >= ELDRITCH_KEEP_RANK) ||
    (item.isCorrupted && i.mechanic === ModifierMechanic.Corruption))
}

type Roll = NonNullable<StatFilter['roll']>

export interface BaseSnapshot {
  filters: Partial<ItemFilters>
  rows: Array<{ f: StatFilter, disabled: boolean, min: Roll['min'], max: Roll['max'] }>
}

const TOUCHED = ['searchRelaxed', 'itemLevel', 'influences', 'quality', 'rarity', 'linkedSockets',
  'whiteSockets', 'socketColours', 'addedMods'] as const

export function rows (stats: FilterOrGroup[]): StatFilter[] {
  return stats.flatMap(s => s.group ? [s.meta, ...s.stats] : [s])
}

export function applyBasePreset (item: ParsedItem, filters: ItemFilters, stats: FilterOrGroup[]): BaseSnapshot {
  const snap: BaseSnapshot = {
    filters: rawClone(Object.fromEntries(TOUCHED.filter(k => filters[k] !== undefined).map(k => [k, filters[k]]))) as Partial<ItemFilters>,
    rows: rows(stats).map(f => ({ f, disabled: f.disabled, min: f.roll?.min, max: f.roll?.max }))
  }

  // The exact base, not "any gloves".
  if (filters.searchRelaxed) filters.searchRelaxed.disabled = true
  if (filters.itemLevel && item.itemLevel) {
    filters.itemLevel.value = Math.min(item.itemLevel, ILVL_CAP)
    filters.itemLevel.disabled = false
  }
  for (const inf of filters.influences ?? []) inf.disabled = false
  if (filters.quality) {
    const over = (item.quality ?? 0) > 20
    if (over) filters.quality.value = item.quality!
    filters.quality.disabled = !over
  }
  // A junk rare sells as its base: any rarity.
  if (filters.rarity) {
    filters.rarity.value = 'nonunique'
    filters.rarity.disabled = false
  }
  if (filters.linkedSockets) filters.linkedSockets.disabled = (item.sockets?.linked ?? 0) < 6
  if (filters.whiteSockets) filters.whiteSockets.disabled = true
  for (const c of Object.values(filters.socketColours ?? {})) c.disabled = true
  for (const m of filters.addedMods ?? []) m.disabled = true

  for (const s of stats) {
    if (s.group) {
      s.meta.disabled = true
      for (const f of s.stats) f.disabled = true
    } else {
      s.disabled = !keepOnBase(s, item)
    }
  }
  return snap
}

export function restoreBasePreset (filters: ItemFilters, snap: BaseSnapshot) {
  for (const k of TOUCHED) {
    if (k in snap.filters) Object.assign(filters, { [k]: rawClone(snap.filters[k]) })
  }
  for (const r of snap.rows) {
    r.f.disabled = r.disabled
    if (r.f.roll) {
      r.f.roll.min = r.min
      r.f.roll.max = r.max
    }
  }
}

/** What the Base step changes, to tell when a later edit undid it. */
export function baseSignature (filters: ItemFilters, stats: FilterOrGroup[]): string {
  return JSON.stringify([{ ...filters, trade: undefined }, stats.flatMap(s => s.group ? [s.meta, ...s.stats] : [s]).map(f => [f.disabled, f.roll?.min, f.roll?.max])])
}

export interface BaseState { snap: BaseSnapshot, sig: string }

export function isBaseOn (state: BaseState, filters: ItemFilters, stats: FilterOrGroup[]): boolean {
  return state.sig === baseSignature(filters, stats)
}

/** A click on Base: on, or back to the old ticks when it's on. */
export function toggleBase (state: BaseState | null, item: ParsedItem, filters: ItemFilters, stats: FilterOrGroup[]): BaseState | null {
  if (state && isBaseOn(state, filters, stats)) {
    restoreBasePreset(filters, state.snap)
    return null
  }
  const snap = applyBasePreset(item, filters, stats)
  return { snap, sig: baseSignature(filters, stats) }
}
