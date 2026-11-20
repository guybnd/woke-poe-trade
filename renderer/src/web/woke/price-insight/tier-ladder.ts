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
import { boundAt, isHybrid, shareScale } from './pseudo-split'
import type { MenuEntry } from '@/web/woke/ui/layer'
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

// Every tier of the row's mod; a click sets the min (or max) to that tier's
// worst roll. Here rather than in stat-actions.ts so it loads with the first
// right-click, not at startup.
export function tiersMenu (at: { x: number, y: number, from?: Element | null }, f: StatFilter, steps: Array<{ tier: number, min: number, max: number }>, mine: number, setBound: (v: number) => void, openMenu: (at: { x: number, y: number }, items: MenuEntry[]) => void) {
  const lowerBetter = f.roll?.better === -1
  const items: MenuEntry[] = [{ separator: true, heading: lowerBetter ? 'Max from tier' : 'Min from tier' }]
  // In the row's units: a total counts its mod more than once (all resistances x3).
  const k = shareScale(f)
  const shown = (v: number) => Math.round(v * k * 100) / 100
  for (const s of steps) {
    const range = s.min === s.max ? `${shown(s.min)}` : `${shown(s.min)}–${shown(s.max)}`
    items.push({ label: `T${s.tier}  ${range}`, checked: s.tier === mine, action: () => setBound(boundAt(f, s.min, s.max)) })
  }
  openMenu(at, items)
}

// Menu-only helpers, here so they load with the first right-click.
/** A min (or, where lower is better, a max) a tenth looser than the roll:
 *  rounded the way that still lets the roll itself match. None when that is
 *  the roll itself or 0 (a roll of 1, which would read "any"). */
export function looseBound (f: StatFilter): number | null {
  const roll = f.roll
  if (!roll || roll.better == null || roll.better === 0 || !roll.value) return null
  // Looser by a tenth of its size, so a negative roll (-12% Fire Resistance) moves away from zero too.
  const delta = Math.abs(roll.value) * 0.1
  // Rounded first: 50 * 1.1 is 55.000000000000007, which ceil makes 56.
  const v = Math.round((roll.better === -1 ? roll.value + delta : roll.value - delta) * 1e6) / 1e6
  const step = roll.dp ? 10 : 1
  const out = roll.better === -1 ? Math.ceil(v * step) / step : Math.floor(v * step) / step
  return (out === roll.value || out === 0) ? null : out
}

/** Text for the game's stash search box that finds items with this mod: the
 *  longest run of words in the mod text, quoted, within the box's 50 characters. */
export function stashSearch (text: string): string | null {
  const runs = text.split(/[#\d.+\-%()]+/).map(s => s.trim().replace(/\s+/g, ' ')).filter(s => /[a-z]/i.test(s))
  if (!runs.length) return null
  let best = runs.reduce((a, b) => (b.length > a.length ? b : a)).toLowerCase()
  if (best.length > 48) best = best.slice(0, 48).replace(/\s+\S*$/, '')
  return `"${best}"`
}
