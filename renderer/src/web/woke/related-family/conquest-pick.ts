// A keystone clicked in the price check's side list: the checked item's
// filters tick that conqueror's line alone, with no number, and search once
// (CheckedItem.vue). The side list and the filters are sibling windows' parts,
// so the click passes through here.
import { shallowRef } from 'vue'
import type { ParsedItem } from '@/parser'
import type { FilterOrGroup } from '@/web/price-check/filters/interfaces'

export const CONQUEST_TRADE_PREFIX = 'explicit.pseudo_timeless_jewel_'

// The conqueror a stat filter searches, from its trade id. Here, not with the
// keystone data, so the price check's own code stays small.
export function conquerorIdOf (tradeIds: readonly string[]): string | null {
  const id = tradeIds.find(t => t.startsWith(CONQUEST_TRADE_PREFIX))
  return id ? id.slice(CONQUEST_TRADE_PREFIX.length) : null
}

export const conquestPick = shallowRef<{ item: ParsedItem, id: string } | null>(null)

// Ticks the "One of" group's line for this conqueror alone and empties its
// numbers. False when the filters have no such line.
export function applyConquestPick (stats: FilterOrGroup[], id: string): boolean {
  for (const s of stats) {
    if (!('group' in s) || s.group !== 'one') continue
    const target = s.stats.find(f => conquerorIdOf(f.tradeId) === id)
    if (!target) continue
    s.meta.disabled = false
    s.expanded = true
    for (const f of s.stats) f.disabled = f !== target
    if (target.roll) {
      target.roll.min = ''
      target.roll.max = ''
    }
    return true
  }
  return false
}
