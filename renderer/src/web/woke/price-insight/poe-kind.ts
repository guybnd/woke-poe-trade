// PoE mode (window-style.ts): how a stat row looks as a tooltip line. The kind
// sets the colour, the game icon and the name shown on hover; the section puts
// gold separators between properties, enchants, implicits and the rest.

import { ModifierType } from '@/parser/modifiers'
import type { StatFilter } from '@/web/price-check/filters/interfaces'
import { FilterTag } from '@/web/price-check/filters/interfaces'

export type PoeKind = 'local' | 'pseudo' | 'enchant' | 'implicit' | 'explicit' | 'crafted' | 'fractured' | 'scourge'
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
    case FilterTag.Pseudo: return { kind: 'pseudo', label: 'Pseudo total' }
    case FilterTag.Enchant: return { kind: 'enchant', label: 'Enchant' }
    case FilterTag.Crafted: return { kind: 'crafted', label: 'Crafted modifier' }
    case FilterTag.Fractured: return { kind: 'fractured', label: 'Fractured modifier' }
    case FilterTag.Scourge: return { kind: 'scourge', label: 'Scourge modifier' }
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
    case FilterTag.Foulborn:
      return 'implicit'
  }
  return 'explicit'
}

/** The tier the Alt tooltip shows, or '' when the mod has none. */
export function poeTier (filter: StatFilter): string {
  if (filter.tag === FilterTag.Pseudo || filter.sources.length !== 1) return ''
  const tier = filter.sources[0].modifier.info.tier
  return tier != null ? `T${tier}` : ''
}

/** The trade ids that search only fractured copies of this mod, when the row
 *  searches any copy of it. "Fractured only" swaps the row to them. */
export function fracturedIds (filter: StatFilter): string[] | undefined {
  if (filter.tag !== FilterTag.Explicit || filter.not || filter.sources.length !== 1) return undefined
  const src = filter.sources.find(s => s.modifier.info.type === ModifierType.Fractured)
  return src?.stat.stat.trade.ids[ModifierType.Fractured]
}
