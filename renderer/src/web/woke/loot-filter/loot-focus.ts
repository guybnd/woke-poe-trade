// Where a jump to the Loot tab lands (Alt+F's "Open on the Loot tab", a
// rule's tier): which class, and which item to scroll to.
import { kindOf } from './currency-weights'
import { LEAGUE_SECTIONS } from './league-classes'
import { gemBand } from './gem-classes'

export type LootClassId = 'currency' | 'fragments' | 'cards' | 'uniques' | 'gems' | 'maps' | 'jewels' | 'league'

// "cat:<category>:<item>", the map floor, a league section, a unique special.
export function lootFocus (tier: string | null | undefined): { cls: LootClassId, item: string | null } | null {
  if (!tier) return null
  const m = /^cat:([a-z]+):(.*)$/.exec(tier)
  if (m) return { cls: kindOf(m[1]), item: m[2] || null }
  if (tier === 'mapfloor') return { cls: 'maps', item: null }
  if (LEAGUE_SECTIONS.some(s => s.id === tier)) return { cls: 'league', item: null }
  if (tier.startsWith('u-')) return { cls: 'uniques', item: null }
  return null
}

// A gem's row on the Loot tab: the most valuable of its poe.ninja bands it
// falls in ("Arc 20/20"), as the rules go loudest first.
export function gemItemFor<T extends { name: string, bt?: string, chaos: number }> (items: readonly T[], gem: string, g: { level: number, quality: number, corrupted: boolean }): T | null {
  return items
    .filter(i => i.bt === gem)
    .filter(i => {
      const b = gemBand(i.name.slice(gem.length + 1))
      return b != null && g.level >= b.level && g.quality >= b.quality && (!b.corrupted || g.corrupted)
    })
    .sort((a, b) => b.chaos - a.chaos)[0] ?? null
}
