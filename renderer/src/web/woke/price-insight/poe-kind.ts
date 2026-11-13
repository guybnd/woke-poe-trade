// PoE mode (window-style.ts): how a stat row looks as a tooltip line. The kind
// sets the colour, the game icon and the name shown on hover; the section puts
// gold separators between properties, enchants, implicits and the rest.

import { ModifierType } from '@/parser/modifiers'
import type { StatFilter } from '@/web/price-check/filters/interfaces'
import { FilterTag } from '@/web/price-check/filters/interfaces'

export type PoeKind = 'local' | 'pseudo' | 'enchant' | 'implicit' | 'explicit' | 'crafted' | 'fractured' | 'scourge' | 'foulborn'
export type PoeSection = 'property' | 'enchant' | 'implicit' | 'explicit'

export interface PoeLook {
  kind: PoeKind
  /** Shown on hover. */
  label: string
  /** A game icon before the text (influence, veiled, delve...). */
  icon?: string
  /** The red diamond of a corruption implicit. */
  corrupted?: boolean
}

const ICONS: Partial<Record<string, [string, string]>> = {
  [FilterTag.Shaper]: ['/images/influence-Shaper.png', 'Shaper'],
  [FilterTag.Elder]: ['/images/influence-Elder.png', 'Elder'],
  [FilterTag.Crusader]: ['/images/influence-Crusader.png', 'Crusader'],
  [FilterTag.Hunter]: ['/images/influence-Hunter.png', 'Hunter'],
  [FilterTag.Redeemer]: ['/images/influence-Redeemer.png', 'Redeemer'],
  [FilterTag.Warlord]: ['/images/influence-Warlord.png', 'Warlord'],
  [FilterTag.Delve]: ['/images/delve.png', 'Delve'],
  [FilterTag.Unveiled]: ['/images/veiled.png', 'Veiled'],
  [FilterTag.Incursion]: ['/images/incursion.png', 'Incursion'],
  [FilterTag.Infamous]: ['/images/mercenary.png', 'Mercenary'],
  [FilterTag.Essence]: ['/images/essence.png', 'Essence']
}

/** The item mod behind the row is fractured, whatever the row searches for. */
export function isFracturedMod (filter: StatFilter): boolean {
  return filter.tag === FilterTag.Fractured ||
    filter.sources.some(s => s.modifier.info.type === ModifierType.Fractured)
}

export function poeLook (filter: StatFilter): PoeLook {
  const tag = filter.tag
  const icon = ICONS[tag]
  if (icon) return { kind: 'explicit', label: `${icon[1]} modifier`, icon: icon[0] }
  switch (tag) {
    case FilterTag.Property: return { kind: 'local', label: 'Property' }
    // Only a total several mods add up to gets the total's colour (Guy's call);
    // one mod's total looks like that mod.
    case FilterTag.Pseudo: {
      if (filter.sources.length > 1) return { kind: 'pseudo', label: 'Pseudo total' }
      const type = filter.sources[0]?.modifier.info.type
      if (type === ModifierType.Fractured) return { kind: 'fractured', label: 'Total, from a fractured modifier' }
      if (type === ModifierType.Crafted) return { kind: 'crafted', label: 'Total, from a crafted modifier' }
      if (type === ModifierType.Implicit) return { kind: 'implicit', label: 'Total, from an implicit' }
      return { kind: 'explicit', label: 'Total, from one modifier' }
    }
    case FilterTag.Enchant: return { kind: 'enchant', label: 'Enchant' }
    case FilterTag.Crafted: return { kind: 'crafted', label: 'Crafted modifier' }
    case FilterTag.Fractured: return { kind: 'fractured', label: 'Fractured modifier' }
    case FilterTag.Scourge: return { kind: 'scourge', label: 'Scourge modifier' }
    // A unique's mod the Genesis Tree mutated: it sets the price, so it stands out.
    case FilterTag.Foulborn: return { kind: 'foulborn', label: 'Foulborn modifier' }
    case FilterTag.Corruption: return { kind: 'implicit', label: 'Corruption implicit', corrupted: true }
    case FilterTag.Synthesised: return { kind: 'implicit', label: 'Synthesised implicit' }
    case FilterTag.Eldritch: return { kind: 'implicit', label: 'Eldritch implicit' }
    case FilterTag.Implicit: return { kind: 'implicit', label: 'Implicit' }
  }
  if (isFracturedMod(filter)) return { kind: 'fractured', label: 'Fractured modifier' }
  if (filter.sources.some(s => s.modifier.info.type === ModifierType.Crafted)) return { kind: 'crafted', label: 'Crafted modifier' }
  return { kind: 'explicit', label: 'Explicit modifier' }
}

export function poeSection (filter: StatFilter): PoeSection {
  switch (filter.tag) {
    case FilterTag.Property: return 'property'
    case FilterTag.Enchant: return 'enchant'
    case FilterTag.Implicit:
    case FilterTag.Corruption:
    case FilterTag.Synthesised:
    case FilterTag.Eldritch:
    case FilterTag.Vestigial:
      return 'implicit'
  }
  return 'explicit'
}

/** The tier the Alt tooltip shows ("T2"), or the rank an implicit or crafted mod has
 *  instead ("R3"), or '' when the mod has neither.
 *  A line several mods add up to (a total or a pseudo) shows each mod's, "T1/3" or "T1/R3",
 *  as long as every one has a tier or rank. */
export function poeTier (filter: StatFilter): string {
  // A property (Energy Shield: 1210) is the item's number, not a mod line.
  if (!filter.sources.length || filter.tag === FilterTag.Property) return ''
  const marks: string[] = []
  for (const { modifier: { info } } of filter.sources) {
    if (info.tier != null) marks.push(`T${info.tier}`)
    else if (info.rank != null) marks.push(`R${info.rank}`)
    else return ''
  }
  // Past three mods, the best tier and a plus, so the left column stays narrow.
  if (marks.length > 3) {
    const tiers = filter.sources.map(s => s.modifier.info.tier).filter((t): t is number => t != null)
    return tiers.length ? `T${Math.min(...tiers)}+` : `${marks[0]}+`
  }
  // All tiers read "T1/3"; a mix keeps each letter, "T1/R3".
  return marks.every(m => m[0] === 'T')
    ? `T${marks.map(m => m.slice(1)).join('/')}`
    : marks.join('/')
}

/** Gold, as T1 in the Alt tooltip: every mod behind the line is tier 1. */
export function isTopTier (tier: string): boolean {
  return /^T1(\/1)*$/.test(tier)
}

/** The trade ids that search only fractured copies of this mod, when the row
 *  searches any copy of it. "Fractured only" swaps the row to them. */
export function fracturedIds (filter: StatFilter): string[] | undefined {
  if (filter.tag !== FilterTag.Explicit || filter.not || filter.sources.length !== 1) return undefined
  const src = filter.sources.find(s => s.modifier.info.type === ModifierType.Fractured)
  return src?.stat.stat.trade.ids[ModifierType.Fractured]
}

const ELDRITCH_TIERS = ['Lesser', 'Greater', 'Grand', 'Exceptional', 'Exquisite', 'Perfect']

/** An eldritch implicit's altar and tier (1 Lesser … 6 Perfect), when the row is one. */
export function eldritchMark (filter: StatFilter): { source: 'exarch' | 'eater', rank: number, label: string } | null {
  if (filter.sources.length !== 1) return null
  const { eldritch, rank } = filter.sources[0].modifier.info
  if (!eldritch || rank == null) return null
  const altar = eldritch === 'exarch' ? 'Searing Exarch' : 'Eater of Worlds'
  return { source: eldritch, rank, label: `${ELDRITCH_TIERS[rank - 1] ?? `Rank ${rank}`} ${altar} implicit` }
}
