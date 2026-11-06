// Turns the lines read from the game's own map mod list into mods. The list ends
// with totals that aren't mods of their own, and "Area is corrupted". Misread
// totals can pass as a mod's wording, so the matched mod is checked as well.
import type { TooltipMatcher } from '../map-mods/tooltip-parse'
import type { ModLine } from './death-log'

const TOTAL_LINE = /(quantity|rarity) of items found|pack size|more .* found in this area|area is corrupted/i

export function parseAreaModLines (lines: string[], matcher: TooltipMatcher): { mods: ModLine[], weak: string[] } {
  const parsed = matcher.parse(lines.filter(l => l && !TOTAL_LINE.test(l)))
  return {
    mods: (parsed?.mods ?? []).filter(m => !TOTAL_LINE.test(m.matcher)),
    weak: parsed?.weak ?? []
  }
}
