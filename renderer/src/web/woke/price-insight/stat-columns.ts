// A results column for each stat ticked in the filters, read from what the trade
// site already sends with every listing. Pure functions, no Vue.
import { ModifierType } from '@/parser/modifiers'
import { linesToStatStrings, tryParseTranslation } from '@/parser/stat-translations'
import type { ItemCategory } from '@/parser'
import type { FilterOrGroup, StatFilter } from '@/web/price-check/filters/interfaces'
import { pseudoRuleStats } from '@/web/price-check/filters/pseudo'
import { clusterResColumnStats } from '@/web/price-check/filters/pseudo/cluster-res'
import { roundRoll } from '@/web/price-check/filters/util'
import { modDomain, modText, ListingItem, ListingMod } from './listing-tip'

type Reader = (item: ListingItem) => number | undefined

function propValue (name: string): Reader {
  return (item) => {
    const raw = item.properties?.find(p => p.name === name)?.values[0]?.[0]
    if (raw == null) return undefined
    const n = parseFloat(raw)
    return Number.isFinite(n) ? n : undefined
  }
}

// `extended` holds these at 20% quality, which is what the filters search on.
const PROPERTIES: Record<string, { label: string, read: Reader }> = {
  'item.armour': { label: 'AR', read: i => i.extended?.ar },
  'item.evasion_rating': { label: 'EV', read: i => i.extended?.ev },
  'item.energy_shield': { label: 'ES', read: i => i.extended?.es },
  'item.ward': { label: 'Ward', read: i => i.extended?.ward },
  'item.block': { label: 'Block', read: propValue('Chance to Block') },
  'item.base_percentile': { label: 'Base', read: i => i.extended?.base_defence_percentile },
  'item.total_dps': { label: 'DPS', read: i => i.extended?.dps },
  'item.physical_dps': { label: 'pDPS', read: i => i.extended?.pdps },
  'item.elemental_dps': { label: 'eDPS', read: i => i.extended?.edps },
  'item.aps': { label: 'APS', read: propValue('Attacks per Second') },
  'item.crit': { label: 'Crit', read: propValue('Critical Strike Chance') }
}

const LABELS: Array<[RegExp, string]> = [
  [/total Elemental Resistance/i, 'Res'],
  [/total Resistance/i, 'Res'],
  [/Fire Resistance/i, 'Fire'],
  [/Cold Resistance/i, 'Cold'],
  [/Lightning Resistance/i, 'Light'],
  [/Chaos Resistance/i, 'Chaos'],
  [/Elemental Resistances?/i, 'Res'],
  [/maximum Life/i, 'Life'],
  [/maximum Mana/i, 'Mana'],
  [/Energy Shield per second|Regenerate .*Energy Shield/i, 'Regen'],
  [/maximum Energy Shield|increased Energy Shield/i, 'ES'],
  [/Life Regeneration|Regenerate .*Life/i, 'Regen'],
  [/Movement Speed/i, 'MS'],
  [/Attack Speed/i, 'AS'],
  [/Cast Speed/i, 'CS'],
  [/Critical Strike Multiplier/i, 'Multi'],
  [/Critical Strike Chance/i, 'Crit'],
  [/all Attributes/i, 'Attr'],
  [/Strength/i, 'Str'],
  [/Dexterity/i, 'Dex'],
  [/Intelligence/i, 'Int'],
  [/Spell Damage/i, 'Spell'],
  [/Suppress/i, 'Supp'],
  [/Stun and Block/i, 'Stun'],
  [/Auras?\b/i, 'Aura'],
  [/Explicit .*Modifier/i, 'Enchnt']
]

const LABEL_FILLER = new Set(['increased', 'reduced', 'more', 'less', 'to', 'of', 'the', 'a', 'an', 'and', 'with', 'from', 'your', 'chance', 'adds', 'added', 'additional', 'total', 'maximum', 'global', 'gain'])
const LABEL_MAX = 6

/** A word short enough for a narrow column. The header's hover has the full text. */
export function statColumnLabel (statRef: string): string {
  for (const [match, label] of LABELS) {
    if (match.test(statRef)) return label
  }
  const words = statRef.split(/[^A-Za-z]+/).filter(w => w && !LABEL_FILLER.has(w.toLowerCase()))
  const word = words[0] ?? statRef
  return word.charAt(0).toUpperCase() + word.slice(1, LABEL_MAX)
}

export interface StatColumn {
  key: string
  label: string
  /** The filter's own wording, for the header's hover. */
  title: string
  yours: number
  /** 1: a higher number is better. -1: a lower one is. 0: neither. */
  better: 1 | -1 | 0
  dp: boolean
  source: ColumnSource
}

type ColumnSource =
  | { kind: 'property', read: Reader }
  | { kind: 'total', stats: Array<{ ref: string, multiplier?: number }>, negated: boolean }
  | { kind: 'mod', ref: string, domains: string[], negated: boolean }

function columnSource (filter: StatFilter): ColumnSource | null {
  const id = filter.tradeId[0]
  if (id == null) return null
  const property = PROPERTIES[id]
  if (property) return { kind: 'property', read: property.read }
  // Any other item.* filter (map rewards, heist jobs...) has nothing to read.
  if (id.startsWith('item.')) return null
  // A cluster jewel's resistance total is searched by its lines, not a pseudo id.
  const clusterStats = clusterResColumnStats(filter)
  if (clusterStats) return { kind: 'total', stats: clusterStats, negated: false }
  if (id.startsWith('pseudo.')) {
    const stats = pseudoRuleStats(filter.statRef)
    return stats ? { kind: 'total', stats, negated: filter.roll?.isNegated ?? false } : null
  }
  return {
    kind: 'mod',
    ref: filter.statRef,
    domains: filter.tradeId.map(tradeId => tradeId.split('.')[0]),
    negated: filter.roll?.isNegated ?? false
  }
}

/** Every ticked number filter that a listing can answer, in the filter list's order. */
export function pickStatColumns (stats: readonly FilterOrGroup[]): StatColumn[] {
  const columns: StatColumn[] = []
  for (const [index, filter] of stats.entries()) {
    if (filter.group != null) continue
    if (filter.disabled || filter.not || filter.option || !filter.roll) continue
    // A value every listing must equal adds nothing to compare.
    if (filter.roll.better === 0 && filter.roll.min === filter.roll.max) continue
    const source = columnSource(filter)
    if (!source) continue
    const id = filter.tradeId[0]
    columns.push({
      // The index: a corrupted item can have two filters on one stat.
      key: `${index}|${filter.tradeId.join('|')}|${filter.statRef}`,
      label: PROPERTIES[id]?.label ?? statColumnLabel(filter.statRef),
      title: filter.text,
      yours: filter.roll.value,
      better: filter.roll.better ?? 0,
      dp: filter.roll.dp,
      source
    })
  }
  return columns
}

interface ListingStat {
  ref: string
  domain: string
  value: number
}

const LISTS: Array<[keyof ListingItem, string]> = [
  ['implicitMods', 'implicit'],
  ['enchantMods', 'enchant'],
  ['fracturedMods', 'fractured'],
  ['craftedMods', 'crafted'],
  ['explicitMods', 'explicit'],
  ['utilityMods', 'explicit']
]

const MOD_TYPES: Record<string, ModifierType> = {
  implicit: ModifierType.Implicit,
  enchant: ModifierType.Enchant,
  fractured: ModifierType.Fractured,
  crafted: ModifierType.Crafted,
  explicit: ModifierType.Explicit
}

function parseStatLines (text: string, domain: string, category: ItemCategory | undefined, out: ListingStat[]) {
  const type = MOD_TYPES[domain] ?? ModifierType.Explicit
  const lines = linesToStatStrings(text.split('\n'))
  let line = lines.next()
  while (!line.done) {
    const found = tryParseTranslation(line.value, type, category) ??
      tryParseTranslation(line.value, ModifierType.Explicit, category)
    if (found?.roll) out.push({ ref: found.stat.ref, domain, value: found.roll.value })
    line = lines.next(Boolean(found))
  }
}

// Each listing's mods only need parsing once, however often the table redraws.
const parsed = new WeakMap<ListingItem, ListingStat[]>()

function listingStats (item: ListingItem, category: ItemCategory | undefined): ListingStat[] {
  let stats = parsed.get(item)
  if (stats) return stats
  stats = []
  for (const [list, listDomain] of LISTS) {
    for (const mod of (item[list] ?? []) as ListingMod[]) {
      const text = modText(mod)
      // Only explicitMods mixes kinds. Elsewhere a mod's own domain can be a
      // mechanic like "eldritch", while its list says what the filters search.
      const domain = list === 'explicitMods' ? (modDomain(mod) || listDomain) : listDomain
      if (text) parseStatLines(text, domain, category, stats)
    }
  }
  parsed.set(item, stats)
  return stats
}

/** A listing's explicit-kind stats (explicit, fractured, crafted) with their numbers, for telling which of several mods it has. */
export function listingExplicitStats (item: ListingItem | undefined, category: ItemCategory | undefined): Array<{ ref: string, value: number }> {
  if (!item) return []
  return listingStats(item, category)
    .filter(stat => !['implicit', 'enchant'].includes(stat.domain))
    .map(({ ref, value }) => ({ ref, value }))
}

/** A fractured mod still counts as an explicit one on the trade site. */
function domainMatches (domains: string[], domain: string): boolean {
  if (domains.includes(domain)) return true
  return domains.includes('explicit') && !['implicit', 'enchant', 'crafted'].includes(domain)
}

function sum (values: number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) : null
}

/** This listing's number for a column, or null when it can't be read. */
export function listingStatValue (item: ListingItem | undefined, column: StatColumn, category: ItemCategory | undefined): number | null {
  if (!item) return null
  const { source } = column
  if (source.kind === 'property') return source.read(item) ?? null
  const stats = listingStats(item, category)
  const total = source.kind === 'total'
    ? sum(stats.flatMap(stat => {
        const info = source.stats.find(s => s.ref === stat.ref)
        return info ? [stat.value * (info.multiplier ?? 1)] : []
      }))
    : sum(stats
        .filter(stat => stat.ref === source.ref && domainMatches(source.domains, stat.domain))
        .map(stat => stat.value))
  // A "reduced" filter shows its number as positive, so the listing's must match.
  return (total != null && source.negated) ? -total : total
}

export function formatStatValue (value: number | null, column: StatColumn): string {
  return value == null ? '–' : String(roundRoll(value, column.dp))
}

export type StatTone = 'theirs' | 'yours' | ''

/** Who has the better number. "theirs" shows red, "yours" shows green. */
export function statTone (value: number | null, column: StatColumn): StatTone {
  if (value == null || !column.better) return ''
  // The filter's own rounding, or the same mods on a listing could look different.
  // `yours` went through it already, and a second pass can change the number.
  const diff = roundRoll(value, column.dp) - column.yours
  if (diff === 0) return ''
  return (diff > 0) === (column.better === 1) ? 'theirs' : 'yours'
}

const STAT_WIDTH = 50
const MORE_WIDTH = 22
const MIN_COLUMNS = 1
const DEFAULT_COLUMNS = 4

/** How many stat columns fit once the table's other columns have their room. */
export function statColumnsThatFit (tableWidth: number, otherColumnsWidth: number, textScale: number, total = 0): number {
  if (tableWidth <= 0) return DEFAULT_COLUMNS
  const fit = (reserved: number) => Math.floor((tableWidth - reserved * textScale) / (STAT_WIDTH * textScale))
  const all = fit(otherColumnsWidth)
  // Hiding any means room for the "+N" column as well.
  return Math.max(MIN_COLUMNS, total > all ? fit(otherColumnsWidth + MORE_WIDTH) : all)
}
