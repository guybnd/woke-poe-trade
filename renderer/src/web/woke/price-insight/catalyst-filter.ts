// The price check's Q tag (Guy's pick C): a stat row a catalyst raised shows
// "Q20", and clicking it switches the item's catalyst quality filter, so the
// search only finds items with the same catalyst at that quality or more. The
// trade site filters the item, not single lines, so every tag shares one filter.

import { computed, inject, InjectionKey, provide, Ref } from 'vue'
import type { FilterOrGroup, StatFilter } from '@/web/price-check/filters/interfaces'

export interface CatalystFilter {
  /** The item's catalyst quality filter, if it has one. */
  filter: Ref<StatFilter | undefined>
  toggle: () => void
}

const KEY: InjectionKey<CatalystFilter> = Symbol('woke-catalyst-filter')

const isFilter = (s: FilterOrGroup): s is StatFilter => !('group' in s && s.group)

export function catalystQualityFilter (stats: FilterOrGroup[]): StatFilter | undefined {
  return stats.filter(isFilter).find(f => f.sources[0]?.stat.stat.jewelleryQuality != null)
}

/**
 * The percent a catalyst raised this row by, or undefined if it didn't. A total
 * counts only when every mod behind it was raised: "total maximum Life" from an
 * uncatalysed Life prefix and a catalysed Strength suffix gets no tag.
 */
export function raisedBy (filter: StatFilter): number | undefined {
  let out: number | undefined
  for (const source of filter.sources) {
    if (!source.stat.roll || source.stat.roll.unscalable) continue
    const incr = source.modifier.info.rollIncr
    if (!incr) return undefined
    out = Math.max(out ?? 0, incr)
  }
  return out
}

/** The quality the tag names: the filter's minimum once it's edited, else the raise. */
export function tagQuality (filter: StatFilter, quality: StatFilter): number | undefined {
  const raised = raisedBy(filter)
  if (raised == null) return undefined
  return typeof quality.roll?.min === 'number' ? quality.roll.min : raised
}

export function toggleCatalyst (stats: FilterOrGroup[]): void {
  const filter = catalystQualityFilter(stats)
  if (filter) filter.disabled = !filter.disabled
}

export function provideCatalystFilter (stats: Ref<FilterOrGroup[]>): CatalystFilter {
  const out: CatalystFilter = {
    filter: computed(() => catalystQualityFilter(stats.value)),
    toggle: () => toggleCatalyst(stats.value)
  }
  provide(KEY, out)
  return out
}

export function useCatalystFilter (): CatalystFilter | undefined {
  return inject(KEY, undefined)
}
