// Turns the lines read from the game's own map mod list into mods. The list ends
// with totals that aren't mods of their own, and "Area is corrupted".
import type { TooltipMatcher } from '../map-mods/tooltip-parse'
import type { ModLine } from './death-log'

const NOT_A_MOD = /(increased|more) (quantity|rarity|pack size)|increased pack size|more .* found in this area|area is corrupted/i

export function parseAreaModLines (lines: string[], matcher: TooltipMatcher): { mods: ModLine[], weak: string[] } {
  const parsed = matcher.parse(lines.filter(l => l && !NOT_A_MOD.test(l)))
  return { mods: parsed?.mods ?? [], weak: parsed?.weak ?? [] }
}
