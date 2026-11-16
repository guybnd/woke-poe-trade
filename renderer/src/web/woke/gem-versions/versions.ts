// A gem's other versions (level / quality / corrupted, and its Vaal form) with
// their poe.ninja prices, and the price check filters that search one of them.
// Nothing here searches: a trade search runs only when a row is clicked.
import type { BaseType } from '@/assets/data'
import { ITEM_BY_REF } from '@/assets/data'
import type { ParsedItem } from '@/parser'
import type { ItemFilters } from '@/web/price-check/filters/interfaces'
import { rawClone } from '@/web/woke/raw-clone'

export interface NinjaGemRow {
  name: string
  variant?: string
  chaos: number
}

export interface GemVersion {
  /** poe.ninja's variant text, e.g. "21/20c". */
  key: string
  vaal: boolean
  level: number
  quality: number
  corrupted: boolean
  chaos: number
  own: boolean
}

const VARIANT = /^(\d+)(?:\/(\d+))?(c)?$/

export function parseVariant (variant: string | undefined): { level: number, quality: number, corrupted: boolean } | null {
  const m = VARIANT.exec(variant ?? '')
  if (!m) return null
  return { level: Number(m[1]), quality: m[2] ? Number(m[2]) : 0, corrupted: m[3] === 'c' }
}

export interface GemForms {
  base: BaseType
  vaal: BaseType | undefined
}

/** The gem's normal and Vaal forms, whichever of them was copied. */
export function gemForms (item: ParsedItem): GemForms | null {
  if (!item.info.gem) return null
  const named = [item.info, item.vaalGem].filter((b): b is BaseType => b != null)
  const vaalNamed = named.find(b => b.gem?.vaal)
  const baseNamed = named.find(b => !b.gem?.vaal)
  const base = baseNamed ??
    (vaalNamed ? ITEM_BY_REF('GEM', vaalNamed.refName.replace(/^Vaal /, ''))?.[0] : undefined)
  if (!base) return null
  const vaal = vaalNamed ?? ITEM_BY_REF('GEM', `Vaal ${base.refName}`)?.[0]
  return { base, vaal: vaal?.gem?.vaal ? vaal : undefined }
}

function order (a: GemVersion, b: GemVersion): number {
  return Number(a.vaal) - Number(b.vaal) ||
    a.level - b.level ||
    a.quality - b.quality ||
    Number(a.corrupted) - Number(b.corrupted)
}

/** Every priced version, normal form first, then the Vaal form; the copied gem's own version marked. */
export function listVersions (
  baseRows: NinjaGemRow[],
  vaalRows: NinjaGemRow[],
  own: { vaal: boolean, variant: string | undefined }
): GemVersion[] {
  const out: GemVersion[] = []
  for (const [rows, vaal] of [[baseRows, false], [vaalRows, true]] as const) {
    for (const row of rows) {
      const v = parseVariant(row.variant)
      if (!v || !(row.chaos > 0)) continue
      out.push({ key: row.variant!, vaal, ...v, chaos: row.chaos, own: vaal === own.vaal && row.variant === own.variant })
    }
  }
  return out.sort(order)
}

/**
 * The price check's filters, changed to search one version: at least its level
 * and quality (the cheapest listings are then that version), corrupted or not.
 */
export function versionFilters (filters: ItemFilters, v: GemVersion, forms: GemForms): ItemFilters {
  const f = rawClone(filters)
  f.searchRelaxed = undefined
  const exact = f.searchExact
  const vaal = forms.vaal
  if (v.vaal && vaal) {
    if (exact.sub) {
      exact.sub = { ...exact.sub, disabled: false }
    } else if (exact.baseType !== vaal.name) {
      exact.sub = { baseType: vaal.name, baseTypeTrade: vaal.name, disabled: false }
    }
  } else if (!v.vaal) {
    if (exact.sub) {
      exact.sub = { ...exact.sub, disabled: true }
    } else if (vaal && exact.baseType === vaal.name) {
      // The copied gem's own name is its Vaal form: search the normal one by name.
      f.searchExact = { baseType: forms.base.name, baseTypeTrade: forms.base.name }
    }
  }
  f.gemLevel = { value: v.level, disabled: v.level <= 1 }
  f.quality = { value: v.quality, disabled: v.quality <= 0 }
  f.corrupted = { search: v.corrupted ? 'corrupted' : 'not-corrupted' }
  if (v.corrupted && v.level >= 20) {
    f.imbuedGem = { disabled: true }
  } else {
    delete f.imbuedGem
  }
  return f
}
