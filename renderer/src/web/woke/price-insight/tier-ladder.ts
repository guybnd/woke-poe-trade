// The tiers of a price check row's mod, for the right-click menu's "Next tier
// up" and "All tiers" (Guy's picks, 2026-11-18). From public/data/mod-tiers.json
// (poedb's tier tables per item class); no trade search.

import type { ParsedItem } from '@/parser'
import { ItemRarity } from '@/parser'
import { ModifierType } from '@/parser/modifiers'
import type { StatFilter } from '@/web/price-check/filters/interfaces'
import { FilterTag } from '@/web/price-check/filters/interfaces'
import { loadModTiers, tierClassKey, tierLadder } from '@/web/woke/ui/tooltip/mod-tiers'
import { onSharedDataChange } from '@/web/woke/app/live-data'
import { isHybrid } from './pseudo-split'
import type { LadderStep, TierData } from '@/web/woke/ui/tooltip/mod-tiers'
import type { TipBase } from '@/web/woke/ui/tooltip/tip-content'

export interface RowLadder {
  steps: LadderStep[]
  /** The row's own tier. */
  mine: number
}

let data: TierData | null = null
// A newer download is read on the next right-click.
onSharedDataChange(() => { data = null })

/** The tier data, waiting at most a moment for its first read: the menu opens
 *  without tiers rather than late. */
export async function tierDataSoon (waitMs = 400): Promise<TierData | null> {
  if (data) return data
  const job = loadModTiers().then(d => { data = d; return d })
  return await Promise.race([job, new Promise<null>(resolve => setTimeout(() => resolve(null), waitMs))])
}

// "+# to maximum Life" -> "# to maximum Life", as mod-tiers.ts reads lines.
const template = (text: string) => text.replace(/[+-]?#/g, '#')

/** The row's one mod's tiers, when the data knows them and agrees with the
 *  tier the item itself shows (a disagreement means the data is out of date). */
export function rowLadder (d: TierData, item: ParsedItem, f: StatFilter): RowLadder | null {
  const roll = f.roll
  if (!roll || f.not || roll.isNegated || roll.better == null || roll.better === 0) return null
  if (f.tag === FilterTag.Property || f.sources.length !== 1 || item.rarity === ItemRarity.Unique) return null
  const { modifier, stat } = f.sources[0]
  const type = modifier.info.type
  if (type !== ModifierType.Explicit && type !== ModifierType.Fractured) return null
  // One half of a hybrid has its own tiers, which the data lists only as whole hybrids.
  if (modifier.info.tier == null || !stat.roll || isHybrid(modifier)) return null
  // One number per line: an "Adds # to #" roll is an average, not a tier's range.
  const text = template(stat.translation.string)
  if ((text.match(/#/g) ?? []).length !== 1) return null
  const base: TipBase = { ar: item.armourAR ? [1, 1] : undefined, ev: item.armourEV ? [1, 1] : undefined, es: item.armourES ? [1, 1] : undefined, wd: item.armourWARD ? [1, 1] : undefined }
  const key = tierClassKey(item.category, base)
  if (!key) return null
  const ladder = tierLadder(d, key, text, stat.roll.value, modifier.info.generation)
  if (!ladder || ladder.mine !== modifier.info.tier) return null
  return ladder
}
