// woke: the price check's cluster jewel picker (Guy's pick C, WOKEPOET-366). Picking a
// size and type rewrites the search the way a different jewel would: base type,
// enchant row, passive count. Notables belong to the old type, so they are unticked.
// Picking the copied jewel's own size and type puts everything back.
// Nothing here searches: the price check's Search button runs it.
import { ITEM_BY_REF, STAT_BY_REF_V2, type Stat } from '@/assets/data'
import type { FilterOrGroup, ItemFilters, StatFilter } from '@/web/price-check/filters/interfaces'
import { CLUSTER_TYPES, type ClusterSize } from './types'

export type { ClusterSize } from './types'

export const CLUSTER_SIZES: readonly ClusterSize[] = ['Small', 'Medium', 'Large']
const GRANT = 'Added Small Passive Skills grant: '
const NOTABLE = '1 Added Passive Skill is '
const PASSIVES = 'Adds # Passive Skills'
// Medium and Large only: a Small jewel never rolls it.
const EFFECT = 'Added Small Passive Skills have '
// The fewest passives a jewel of each size adds: any jewel of that size.
const MIN_PASSIVES: Record<ClusterSize, number> = { Small: 2, Medium: 4, Large: 8 }

export interface ClusterPick {
  name: string
  /** The stat's ref: one line, or two joined by a line break (Axe and Sword...). */
  ref: string
  tradeId: string[]
  /** The line as the client writes it. */
  text: string
}

const bySize = new Map<ClusterSize, ClusterPick[]>()
let builtFor: unknown = null

/** A size's types with a trade id, in the game's order (old attribute ones have none). */
export function clusterTypes (size: ClusterSize): ClusterPick[] {
  // Rebuilt when the stat data reloads (another language, a data update).
  if (builtFor !== STAT_BY_REF_V2) { bySize.clear(); builtFor = STAT_BY_REF_V2 }
  let list = bySize.get(size)
  if (!list) {
    list = []
    for (const type of CLUSTER_TYPES[size]) {
      const ref = type.enchants.join('\n')
      const found = STAT_BY_REF_V2(ref)
      const stat = (found && !('stats' in found)) ? found as Stat : undefined
      const tradeId = stat?.trade.ids.enchant
      if (!stat || !tradeId?.length) continue
      list.push({ name: type.name, ref, tradeId: [...tradeId], text: stat.matchers[0]?.string ?? ref })
    }
    bySize.set(size, list)
  }
  return list
}

export function clusterSizeOf (baseRef: string | undefined): ClusterSize | null {
  const m = /^(Small|Medium|Large) Cluster Jewel$/.exec(baseRef ?? '')
  return m ? m[1] as ClusterSize : null
}

function rows (stats: FilterOrGroup[]): StatFilter[] {
  return stats.filter((s): s is StatFilter => !('group' in s && s.group))
}

export function enchantRow (stats: FilterOrGroup[]): StatFilter | undefined {
  return rows(stats).find(s => s.statRef.startsWith(GRANT))
}

/** The type the search looks for now, if it is one of this size's. */
export function currentType (size: ClusterSize, stats: FilterOrGroup[]): ClusterPick | undefined {
  const row = enchantRow(stats)
  return row ? clusterTypes(size).find(t => t.ref === row.statRef) : undefined
}

// What the copied jewel's search had, taken before the first pick.
interface Own {
  size: ClusterSize
  baseType: string | undefined
  baseTypeTrade: string | undefined
  relaxed: boolean | undefined
  enchant: Pick<StatFilter, 'tradeId' | 'statRef' | 'text' | 'sources' | 'disabled'> | null
  /** Every row's tick, to put back. */
  ticks: Map<StatFilter, boolean>
  passives: { min: number | '' | undefined, max: number | '' | undefined } | null
}
const OWN = new WeakMap<ItemFilters, Own>()
// The size picked last, per search; the copied jewel's until a pick.
const PICKED = new WeakMap<ItemFilters, ClusterSize>()

export function pickedSize (filters: ItemFilters, own: ClusterSize): ClusterSize {
  return PICKED.get(filters) ?? own
}

/**
 * The copied jewel's type, from before any pick. A legacy type the trade site no
 * longer lists still comes back, so picking it restores the copy.
 */
export function ownType (filters: ItemFilters, stats: FilterOrGroup[], ownSize: ClusterSize): ClusterPick | undefined {
  const own = OWN.get(filters)
  const row = own ? own.enchant : enchantRow(stats)
  if (!row) return undefined
  const listed = clusterTypes(ownSize).find(t => t.ref === row.statRef)
  return listed ?? { name: row.text.replace(GRANT, ''), ref: row.statRef, tradeId: [...row.tradeId], text: row.text }
}

function remember (filters: ItemFilters, stats: FilterOrGroup[], size: ClusterSize): Own {
  let own = OWN.get(filters)
  if (own) return own
  const list = rows(stats)
  const ench = enchantRow(stats)
  const passives = list.find(s => s.statRef === PASSIVES)
  own = {
    size,
    baseType: filters.searchExact.baseType,
    baseTypeTrade: filters.searchExact.baseTypeTrade,
    relaxed: filters.searchRelaxed?.disabled,
    enchant: ench ? { tradeId: [...ench.tradeId], statRef: ench.statRef, text: ench.text, sources: ench.sources, disabled: ench.disabled } : null,
    ticks: new Map(list.map(s => [s, s.disabled])),
    passives: passives?.roll ? { min: passives.roll.min, max: passives.roll.max } : null
  }
  OWN.set(filters, own)
  return own
}

/**
 * Sets the search to a cluster jewel of `size` with `type`'s enchant.
 * `ownSize` is the copied jewel's size.
 */
export function applyClusterType (filters: ItemFilters, stats: FilterOrGroup[], ownSize: ClusterSize, size: ClusterSize, type: ClusterPick): void {
  const own = remember(filters, stats, ownSize)
  const list = rows(stats)
  const isOwn = size === own.size && (own.enchant ? own.enchant.statRef === type.ref : false)
  PICKED.set(filters, size)

  // Base type: this size. The search names it in the same language the copy used.
  if (size === own.size) {
    filters.searchExact.baseType = own.baseType
    filters.searchExact.baseTypeTrade = own.baseTypeTrade
  } else {
    const ref = clusterRef(size)
    const base = ITEM_BY_REF('ITEM', ref)?.[0]
    filters.searchExact.baseType = base?.name ?? ref
    // The English name when the copy searched in English (the intl site off), else the client's.
    filters.searchExact.baseTypeTrade = (own.baseTypeTrade === clusterRef(own.size)) ? ref : (base?.name ?? ref)
  }
  // A picked size is searched as that size, not as any cluster jewel.
  if (filters.searchRelaxed) filters.searchRelaxed.disabled = isOwn ? !!own.relaxed : true

  // The enchant row: the copied one back, or the picked type's.
  let ench = enchantRow(stats)
  if (isOwn && !own.enchant && ench) {
    // Only reached by a copy without one: the row a pick added goes again.
    stats.splice(stats.indexOf(ench), 1)
    ench = undefined
  }
  if (!ench && !(isOwn && !own.enchant)) {
    stats.unshift({ tradeId: [], statRef: GRANT, text: '', tag: 'enchant' as StatFilter['tag'], sources: [], disabled: false })
    // Through the list again: a reactive list hands back its own copy of the row.
    ench = enchantRow(stats)!
  }
  if (!ench) {
    // The copy had no enchant row and is picked again: nothing to set.
  } else if (isOwn && own.enchant) {
    Object.assign(ench, { ...own.enchant, tradeId: [...own.enchant.tradeId] })
  } else {
    ench.tradeId = [...type.tradeId]
    ench.statRef = type.ref
    ench.text = type.text
    ench.sources = []
    ench.disabled = false
  }

  // The copy's ticks back; else no notables (they belong to the old type) and,
  // on a Small jewel, no small passive effect (it never rolls there).
  for (const s of list) {
    if (s.statRef.startsWith(GRANT) || s.statRef === PASSIVES) continue
    if (isOwn) {
      s.disabled = own.ticks.get(s) ?? s.disabled
    } else if (s.statRef.startsWith(NOTABLE) || (size === 'Small' && s.statRef.startsWith(EFFECT))) {
      s.disabled = true
    }
  }

  // Passive count: the copy's box for its own size, any count for another.
  const passives = list.find(s => s.statRef === PASSIVES)
  if (passives?.roll) {
    if (size === own.size && own.passives) {
      passives.roll.min = own.passives.min
      passives.roll.max = own.passives.max
    } else if (size !== own.size) {
      passives.roll.min = MIN_PASSIVES[size]
      passives.roll.max = ''
    }
  }
}

function clusterRef (size: ClusterSize): string {
  return `${size} Cluster Jewel`
}

/** Filters `list` by words typed, in any order, case ignored. */
export function matchTypes (list: ClusterPick[], query: string): ClusterPick[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return list
  return list.filter(t => {
    const hay = (t.name + ' ' + t.text).toLowerCase()
    return words.every(w => hay.includes(w))
  })
}
