// Where a jump to the Loot tab lands (Alt+F's "Open on the Loot tab", a
// rule's tier): which class, and which item to scroll to.
import { kindOf } from './currency-weights'
import { LEAGUE_SECTIONS } from './league-classes'
import { gemBand } from './gem-classes'
import type { FilterCondition } from './parse'

export type LootClassId = 'currency' | 'gold' | 'fragments' | 'cards' | 'uniques' | 'gems' | 'maps' | 'jewels' | 'league' | 'special' | 'recipes' | 'levelling'

// "cat:<category>:<item>", the map floor, Recipes, a league section, a unique special.
export function lootFocus (tier: string | null | undefined): { cls: LootClassId, item: string | null } | null {
  if (!tier) return null
  const m = /^cat:([a-z]+):(.*)$/.exec(tier)
  if (m) return { cls: kindOf(m[1]), item: m[2] || null }
  if (tier === 'mapfloor') return { cls: 'maps', item: null }
  if (tier === 'recipes') return { cls: 'recipes', item: null }
  if (tier === 'levelling') return { cls: 'levelling', item: null }
  if (LEAGUE_SECTIONS.some(s => s.id === tier)) return { cls: 'league', item: null }
  if (tier.startsWith('u-')) return { cls: 'uniques', item: null }
  return null
}

const BAND_KEYS = ['GemLevel', 'Quality', 'Corrupted']
const bandSig = (cs: readonly FilterCondition[]) => JSON.stringify(cs.filter(c => BAND_KEYS.includes(c.key)).map(c => [c.key, c.op, c.values]))

// A gem's row on the Loot tab ("Arc 20/20"): the band whose rule caught it
// (`rule`: that rule's conditions), else the most valuable band it falls in.
export function gemItemFor<T extends { name: string, bt?: string, chaos: number, conds?: FilterCondition[] }> (items: readonly T[], gem: string, g: { level: number, quality: number, corrupted: boolean }, rule?: readonly FilterCondition[] | null): T | null {
  const mine = items.filter(i => i.bt === gem)
  if (rule?.some(c => c.key === 'GemLevel')) {
    const sig = bandSig(rule)
    const hit = mine.find(i => i.conds && bandSig(i.conds) === sig)
    if (hit) return hit
  }
  return mine
    .filter(i => {
      const b = gemBand(i.name.slice(gem.length + 1))
      return b != null && g.level >= b.level && g.quality >= b.quality && (!b.corrupted || g.corrupted)
    })
    .sort((a, b) => b.chaos - a.chaos)[0] ?? null
}

// The item Alt+F is on, as the Loot tab lists it: the one whose own
// conditions (Foulborn True, 6 links, BlightedMap...) the rule that caught
// it carries, else the plain item of that name. "Foulborn Kaom's Heart" and
// "Simple Robe, 6-link" are rows of their own, never the plain base's.
const condKey = (c: FilterCondition) => JSON.stringify([c.key, c.op === '=' || c.op === '==' ? '' : c.op, c.values.map(String)])
// A unique's row is never a magic, rare or white item's, though they share
// its base (a magic Crimson Jewel isn't the unique Crimson Jewel).
export function notItsRarity (i: { type?: string }, rarity: string | null | undefined): boolean {
  return i.type === 'uniques' && rarity != null && rarity !== 'Unique'
}

// A row of several bases (jewels, special gear) fits any of them: a magic
// Crimson Jewel is the "Magic or white jewel" row, whose `bt` names only its
// first base, never the unique Crimson Jewel row (Guy 2026-11-28).
export function itemFor<T extends { name: string, bt?: string, bts?: string[], conds?: FilterCondition[] }> (items: readonly T[], name: string, rule?: readonly FilterCondition[] | null): T | null {
  const has = new Set((rule ?? []).map(condKey))
  const own = (i: T) => (i.bt ?? i.name) === name ? 1 : 0
  const fits = items
    .filter(i => ((i.bt ?? i.name) === name || i.bts?.includes(name)) && i.conds?.length && i.conds.every(c => has.has(condKey(c))))
    // On a tie the row of this one base wins ("Simple Robe, 6-link" over
    // "Any unique, 6-link").
    .sort((a, b) => (b.conds?.length ?? 0) - (a.conds?.length ?? 0) || own(b) - own(a))
  return fits[0] ?? items.find(i => i.name === name && !i.conds?.length) ?? null
}
