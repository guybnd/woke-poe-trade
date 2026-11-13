// woke: the weapon/armour stat header at the top of PoE mode's filter well
// (Guy's pick F1). StatHeader.vue draws this model; FiltersBlock.vue leaves the
// header's unpicked property lines out of the list and shows its picked ones
// as their usual rows under it.
import { ARMOUR, WEAPON } from '@/parser/meta'
import type { ParsedItem } from '@/parser'
import type { FilterOrGroup, StatFilter } from '@/web/price-check/filters/interfaces'
import { FilterTag } from '@/web/price-check/filters/interfaces'
import { ADDS_CHAOS, rollFill, weaponDps } from './weapon-dps'

/** The property filters the header stands in for. */
export const HEADER_IDS = new Set([
  'item.total_dps', 'item.physical_dps', 'item.elemental_dps', 'item.aps', 'item.crit',
  'item.armour', 'item.evasion_rating', 'item.energy_shield', 'item.ward', 'item.block',
  'item.base_percentile'
])

export interface HeaderCell {
  key: string
  label: string
  /** What clicking searches, for the hover text (set by finish). */
  name?: string
  text: string
  /** 0..1 roll bar fill; null draws a grey full bar (nothing can roll it). */
  fill: number | null
  /** Swatch / bar colour (CSS). */
  color: string
  filter?: StatFilter
  /** The same on every copy of this unique unless something raised it (set by finish). */
  fixed?: boolean
}

export interface HeaderModel {
  kind: 'weapon' | 'armour'
  bigs: HeaderCell[]
  chips: HeaderCell[]
  /** Weapon only: the damage split bar and its legend. */
  split?: Array<{ key: string, share: number, color: string }>
  legend?: HeaderCell[]
}

export const COLORS = {
  phys: '#c9c4ba',
  fire: '#e0613f',
  cold: '#5f9fe0',
  lightning: '#e8c94c',
  ele: 'linear-gradient(90deg, #e0613f, #e8c94c)',
  chaos: '#c06ad8',
  armour: '#c9c4ba',
  evasion: '#6fbf73',
  es: '#7fb0e8',
  ward: '#d9a35f',
  plain: ''
}

export function isHeaderFilter (f: FilterOrGroup): f is StatFilter {
  return !f.group && f.tag === FilterTag.Property && HEADER_IDS.has(f.tradeId[0])
}

function filterFill (f: StatFilter | undefined): number | null {
  const r = f?.roll
  if (!r?.bounds) return null
  return rollFill({ value: r.value, min: r.bounds.min, max: r.bounds.max })
}

function fixed (n: number, dp: number) {
  return n.toFixed(dp)
}

/** The number a cell shows: its property filter's own value when it has one, so it matches the row. */
function shown (computed: number, f: StatFilter | undefined): number {
  return (f?.roll && isHeaderFilter(f)) ? f.roll.value : computed
}

export function buildStatHeader (item: ParsedItem, stats: readonly FilterOrGroup[]): HeaderModel | null {
  const cat = item.category
  if (cat == null) return null
  const props = new Map<string, StatFilter>()
  for (const f of stats) {
    if (isHeaderFilter(f) && !props.has(f.tradeId[0])) props.set(f.tradeId[0], f)
  }
  if (!props.size) return null

  if (WEAPON.has(cat)) {
    const d = weaponDps(item)
    const chaosFilter = stats.find((f): f is StatFilter =>
      !f.group && f.statRef === ADDS_CHAOS && f.tag !== FilterTag.Property && f.tag !== FilterTag.Pseudo)
    const parts: Array<{ key: 'phys' | 'ele' | 'chaos', label: string, roll: typeof d.phys, filter?: StatFilter }> = [
      { key: 'phys', label: 'phys', roll: d.phys, filter: props.get('item.physical_dps') },
      { key: 'ele', label: 'ele', roll: d.ele, filter: props.get('item.elemental_dps') },
      { key: 'chaos', label: 'chaos', roll: d.chaos, filter: chaosFilter }
    ]
    const present = parts.filter(p => p.roll.value > 0)
    const legend: HeaderCell[] = present.map(p => ({
      key: p.key,
      label: p.label,
      text: fixed(shown(p.roll.value, p.filter), 0),
      fill: rollFill(p.roll),
      color: COLORS[p.key],
      filter: p.filter
    }))
    // The big number searches Total DPS; a weapon with one damage type has none, so its part's filter.
    const bigFilter = props.get('item.total_dps') ?? (present.length === 1 ? present[0].filter : undefined)
    const bigs: HeaderCell[] = [{
      key: 'dps',
      label: 'DPS',
      text: fixed(shown(d.total.value, bigFilter), 0),
      fill: rollFill(d.total),
      color: COLORS.plain,
      filter: bigFilter
    }]
    const chips: HeaderCell[] = []
    const aps = props.get('item.aps')
    if (aps?.roll) chips.push({ key: 'aps', label: 'aps', text: fixed(aps.roll.value, 2), fill: rollFill(d.aps), color: COLORS.plain, filter: aps })
    const crit = props.get('item.crit')
    if (crit?.roll) chips.push({ key: 'crit', label: 'crit', text: `${fixed(crit.roll.value, 1)}%`, fill: filterFill(crit), color: COLORS.plain, filter: crit })
    const s = d.split
    const split = (['phys', 'fire', 'cold', 'lightning', 'ele', 'chaos'] as const)
      .map(key => ({ key, share: s[key], color: COLORS[key] }))
      .filter(x => x.share > 0)
    return finish({ kind: 'weapon', bigs, chips, split, legend })
  }

  if (ARMOUR.has(cat)) {
    const DEF = [
      { id: 'item.armour', key: 'armour', label: 'armour', color: COLORS.armour },
      { id: 'item.evasion_rating', key: 'evasion', label: 'evasion', color: COLORS.evasion },
      { id: 'item.energy_shield', key: 'es', label: 'ES', color: COLORS.es },
      { id: 'item.ward', key: 'ward', label: 'ward', color: COLORS.ward }
    ]
    const bigs: HeaderCell[] = []
    for (const def of DEF) {
      const f = props.get(def.id)
      if (!f?.roll) continue
      bigs.push({ key: def.key, label: def.label, text: fixed(f.roll.value, 0), fill: filterFill(f), color: def.color, filter: f })
    }
    const chips: HeaderCell[] = []
    const block = props.get('item.block')
    if (block?.roll) chips.push({ key: 'block', label: 'block', text: `${fixed(block.roll.value, 0)}%`, fill: filterFill(block), color: COLORS.plain, filter: block })
    const base = props.get('item.base_percentile')
    // Base percentile is itself a 0-100 roll.
    if (base?.roll) chips.push({ key: 'base', label: 'base', text: `${fixed(base.roll.value, 0)}%`, fill: rollFill({ value: base.roll.value, min: 0, max: 100 }), color: COLORS.plain, filter: base })
    if (!bigs.length && !chips.length) return null
    return finish({ kind: 'armour', bigs, chips })
  }

  return null
}

const FILTER_NAMES: Record<string, string> = {
  'item.total_dps': 'Total DPS',
  'item.physical_dps': 'Physical DPS',
  'item.elemental_dps': 'Elemental DPS',
  'item.aps': 'Attacks per Second',
  'item.crit': 'Critical Strike Chance',
  'item.armour': 'Armour',
  'item.evasion_rating': 'Evasion Rating',
  'item.energy_shield': 'Energy Shield',
  'item.ward': 'Ward',
  'item.block': 'Block',
  'item.base_percentile': 'Base Percentile'
}

function isFixed (f: StatFilter) {
  return f.hidden === 'filters.hide_const_roll' || f.hidden === 'hide_variable_by_base_percentile_only'
}

/** Picking a fixed number: shows its row and searches at least this item's value. */
export function pickFixed (f: StatFilter) {
  if (!isFixed(f)) return
  f.hidden = undefined
  if (f.roll && f.roll.min == null) f.roll.min = f.roll.value
}

/**
 * Names each cell by the filter it really picks (the big DPS number of a one-type
 * weapon picks that type's filter), and makes a roll that can't vary on this item
 * (a unique's fixed line, or one only base percentile moves: no min to search) not clickable.
 */
function finish (model: HeaderModel): HeaderModel {
  for (const c of [...model.bigs, ...model.chips, ...(model.legend ?? [])]) {
    const f = c.filter
    c.name = f ? (FILTER_NAMES[f.tradeId[0]] ?? 'the chaos damage mod') : (c.key === 'dps' ? 'Total DPS' : c.label)
    // A unique's fixed number stays clickable (Guy): a corruption, enchant or
    // quality can still raise it, so "at least yours" finds those copies.
    if (f && isFixed(f)) c.fixed = true
  }
  return model
}

/** Every filter a header number picks, the chaos mod line too. */
export function headerCellFilters (model: HeaderModel | null): Set<StatFilter> {
  const out = new Set<StatFilter>()
  if (!model) return out
  for (const c of [...model.bigs, ...model.chips, ...(model.legend ?? [])]) {
    if (c.filter) out.add(c.filter)
  }
  return out
}

/** The property filters the header draws, so FiltersBlock can leave their unpicked lines out.
 *  The chaos legend entry is a mod line, which stays in the mod list. */
export function headerFilters (model: HeaderModel | null): Set<StatFilter> {
  return new Set([...headerCellFilters(model)].filter(isHeaderFilter))
}

// The order the header's numbers were picked in, so their rows open under it in that order.
let pickCounter = 0
const pickSeq = new WeakMap<StatFilter, number>()
export function notePick (f: StatFilter) {
  pickSeq.set(f, ++pickCounter)
}
/** 0 for a filter picked by default (it keeps the list's order), else its click's turn. */
export function pickOrder (f: StatFilter): number {
  return pickSeq.get(f) ?? 0
}
