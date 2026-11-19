import { ModifierType, StatCalculated } from '@/parser/modifiers'
import type { ParsedItem } from '@/parser'
import type { StatFilter } from '../interfaces'

const OILS = [
  'Prismatic Oil',
  'Clear Oil',
  'Sepia Oil',
  'Amber Oil',
  'Verdant Oil',
  'Teal Oil',
  'Azure Oil',
  'Indigo Oil',
  'Violet Oil',
  'Crimson Oil',
  'Black Oil',
  'Opalescent Oil',
  'Silver Oil',
  'Golden Oil'
]

export function decodeOils (calc: StatCalculated): string[] | undefined {
  if (calc.type !== ModifierType.Enchant) return

  let encoded: string | undefined
  if (calc.stat.anointments) {
    if (calc.stat.anointments.length === 1) {
      encoded = calc.stat.anointments[0].oils
    } else {
      encoded = calc.stat.anointments.find(anoint =>
        anoint.roll === calc.sources[0].stat.roll?.value)?.oils
    }
  }
  if (!encoded) return

  return oilNames(encoded).reverse() // [Golden Oil ... Clear Oil]
}

// The oils of an encoded recipe ("1,8,10"), lowest tier first. Undefined when
// an index isn't a known oil.
export function oilNames (encoded: string): string[] {
  return encoded
    .split(',')
    .map(Number)
    .sort((a, b) => a - b)
    .map(idx => OILS[idx])
}

// The oils that anoint a passive notable onto an amulet, lowest tier first,
// from the "Allocates <notable>" enchant's recipe. Undefined when it can't
// be anointed.
export function notableOils (name: string, statByRef: (ref: string) => unknown): string[] | undefined {
  const ref = `Allocates ${name}`
  type AnointStat = { ref?: string, anointments?: Array<{ oils: string }> }
  const found = statByRef(ref) as (AnointStat & { stats?: AnointStat[] }) | undefined
  // Some languages group stats that share a translation; the ref index is a
  // hash, so make sure it found this stat.
  const stat = found?.stats ? found.stats.find(s => s.ref === ref) : found
  if (stat?.ref !== ref) return
  const encoded = stat.anointments?.[0]?.oils
  if (!encoded) return
  const oils = oilNames(encoded)
  return oils.length === 3 && oils.every(Boolean) ? oils : undefined
}

export function applyAnointmentRules (filters: StatFilter[], item: ParsedItem) {
  const anointment = filters.find(filter => filter.oils)
  if (!anointment) return

  if (item.talismanTier) {
    anointment.disabled = false
  } else if (!item.isCorrupted && !item.isMirrored) {
    const oils = anointment.oils!
    if (oils[0] !== 'Golden Oil' && oils[0] !== 'Silver Oil') {
      anointment.hidden = 'filters.hide_anointment'
      anointment.disabled = true
    }
  }
}
