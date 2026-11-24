// woke: a map's kind is its influence (Guy, 2026-11-24): none (normal), the Elder or the
// Shaper (an Elder map also carries a guardian, "occupied by The Purifier"), a conqueror's
// Citadel, and each of those with the Originator's Memories or without. Kinds list at
// different prices (Elder maps list cheap: 807 of the T16 Originator maps in Covens,
// 2026-11-24, WOKEPOET-523), so a map's search finds only its own kind; the map strip's
// Kind menu picks another kind, Any Originator or Any kind.
//
// Three filters, one per family, stand in for the map's influence lines (which leave
// the filters). Each family is searched as has (some of its options), not (none of
// them) or not at all (the filter off). Nightmare and Valdo maps are other items.
import { ModifierType } from '@/parser/modifiers'
import type { ParsedItem } from '@/parser'
import type { StatFilter } from '../interfaces'
import { FilterTag } from '../interfaces'

export type KindFamily = 'elder' | 'citadel' | 'originator'
export type FamilyPick = { has: number[] | true } | 'not' | 'off'

export const ELDER_SHAPER_TRADE_ID = 'implicit.stat_1792283443'
export const CITADEL_TRADE_ID = 'implicit.stat_2563183002'
export const ORIGINATOR_TRADE_ID = 'implicit.stat_2696470877'

export const KIND_FAMILIES: Record<KindFamily, { id: string, text: string, options?: number[] }> = {
  // 1 Shaper, 2 Elder (checked live 2026-11-24).
  elder: { id: ELDER_SHAPER_TRADE_ID, text: 'Area is influenced by The Elder or The Shaper', options: [1, 2] },
  // 1 Baran, 2 Veritania, 3 Al-Hezmin, 4 Drox (stats data).
  citadel: { id: CITADEL_TRADE_ID, text: "Map contains a conqueror's Citadel", options: [1, 2, 3, 4] },
  originator: { id: ORIGINATOR_TRADE_ID, text: "Area is Influenced by the Originator's Memories" }
}
export const MAP_KIND_TRADE_IDS: readonly string[] = Object.values(KIND_FAMILIES).map(f => f.id)
const FAMILY_OF: Record<string, KindFamily> = Object.fromEntries(
  (Object.keys(KIND_FAMILIES) as KindFamily[]).map(k => [KIND_FAMILIES[k].id, k]))

// The map's influence lines, replaced by the family filters. The Elder's guardian ("Map is
// occupied by The Purifier") stays a line of its own: each guardian sells at its own price.
const INFLUENCE_LINE = /^(Area is influenced by|Map contains \S+ Citadel)/i
export function isInfluenceLine (statRef: string): boolean {
  return INFLUENCE_LINE.test(statRef)
}

// What the map is: the option of each family it has.
export interface MapKind { elder?: number, citadel?: number, originator: boolean }
export function mapKindOf (item: ParsedItem): MapKind {
  const kind: MapKind = { originator: false }
  for (const calc of item.statsByType) {
    for (const id of calc.stat.trade.ids[ModifierType.Implicit] ?? []) {
      const [base, option] = id.split('|')
      const fam = FAMILY_OF[base]
      if (fam === 'originator') kind.originator = true
      else if (fam && option) kind[fam] = Number(option)
    }
  }
  return kind
}

export interface KindChoice { key: string, label: string, picks: Record<KindFamily, FamilyPick> }

const not = 'not' as const
// The menu: Guy's list of map kinds, then Any Originator and Any kind.
export function kindChoices (own: MapKind): KindChoice[] {
  const citadel = { has: own.citadel ? [own.citadel] : KIND_FAMILIES.citadel.options! }
  const orig = (on: boolean): FamilyPick => on ? { has: true } : not
  // Two columns in the menu: each kind without the Originator, then with it.
  const bases: Array<[string, string, Pick<Record<KindFamily, FamilyPick>, 'elder' | 'citadel'>]> = [
    ['normal', 'Normal', { elder: not, citadel: not }],
    ['elder', 'Elder', { elder: { has: [2] }, citadel: not }],
    ['shaper', 'Shaper', { elder: { has: [1] }, citadel: not }],
    ['citadel', own.citadel ? CONQUEROR_NAME[own.citadel] : 'Conqueror', { elder: not, citadel }]
  ]
  const rows: KindChoice[] = []
  for (const [key, label, picks] of bases) {
    rows.push(
      { key, label, picks: { ...picks, originator: orig(false) } },
      { key: `${key} Originator`, label: key === 'normal' ? 'Originator' : `${label} Originator`, picks: { ...picks, originator: orig(true) } }
    )
  }
  rows.push(
    { key: 'any-originator', label: 'Any Originator', picks: { elder: 'off', citadel: 'off', originator: { has: true } } },
    { key: 'any', label: 'Any kind', picks: { elder: 'off', citadel: 'off', originator: 'off' } }
  )
  return rows
}
export const CONQUEROR_NAME: Record<number, string> = { 1: 'Baran', 2: 'Veritania', 3: 'Al-Hezmin', 4: 'Drox' }

// The kind this map is, as a menu key.
export function ownKindKey (own: MapKind): string {
  const base = own.elder === 2 ? 'elder' : own.elder === 1 ? 'shaper' : own.citadel ? 'citadel' : 'normal'
  return `${base}${own.originator ? ' Originator' : ''}`
}

// The three filters, set to this map's own kind.
export function mapKindFilters (item: ParsedItem): StatFilter[] {
  const own = mapKindOf(item)
  const choice = kindChoices(own).find(c => c.key === ownKindKey(own))!
  return (Object.keys(KIND_FAMILIES) as KindFamily[]).map(family => {
    const f: StatFilter = {
      tradeId: [KIND_FAMILIES[family].id],
      statRef: KIND_FAMILIES[family].text,
      text: KIND_FAMILIES[family].text,
      tag: FilterTag.Implicit,
      sources: [],
      disabled: false,
      mapKind: { family, pick: 'off' }
    }
    setPick(f, choice.picks[family])
    return f
  })
}

export function setPick (f: StatFilter, pick: FamilyPick): void {
  f.mapKind!.pick = pick
  f.disabled = pick === 'off'
}
export function pickOf (f: StatFilter): FamilyPick {
  return f.disabled ? 'off' : f.mapKind!.pick
}
export function samePick (a: FamilyPick, b: FamilyPick): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

// The trade query: has goes into the and group (several options: a count of at least
// one), not into the not group once per option (an option stat with no option matches nothing).
type QFilter = { id: string, value?: { option?: number }, disabled?: boolean }
export function kindToQuery (f: StatFilter): { and: QFilter[], count: QFilter[] | null, not: QFilter[] } {
  const fam = KIND_FAMILIES[f.mapKind!.family]
  const pick = pickOf(f)
  const out = { and: [] as QFilter[], count: null as QFilter[] | null, not: [] as QFilter[] }
  if (pick === 'off') return out
  if (pick === 'not') {
    out.not = fam.options ? fam.options.map(option => ({ id: fam.id, value: { option } })) : [{ id: fam.id }]
  } else if (pick.has === true || !fam.options) {
    out.and = [{ id: fam.id }]
  } else if (pick.has.length === 1) {
    out.and = [{ id: fam.id, value: { option: pick.has[0] } }]
  } else {
    out.count = pick.has.map(option => ({ id: fam.id, value: { option } }))
  }
  return out
}
