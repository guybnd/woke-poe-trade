// Nightmare (Tier 17) map bosses as Boss runs entries: the map is the entry,
// the uber fragments the boss drops are the loot.
//
// Facts (read 2026-11-20, 3.30 Covens):
// - poe.ninja lists one row, "Nightmare Map", for every T17, so all five
//   share one entry price.
// - Which fragments each boss favours: maxroll's 3.30 Nightmare Boss Rush
//   table, backed by poedb item pages (Reality Fragment from Abomination,
//   Cosmic Fragment from Citadel).
// - GGG publishes no rates. The wiki (3.25) says a boss drops 1 to 3
//   fragments, each 80% from the favoured ones, and fragment count grows with
//   the map's Atlas Drops. So chances here are estimates built from a
//   fragments-a-kill setting; typed rates and the kill log replace them.
// - Each boss has its own unique (upstream item-drop.json lists the five for
//   Nightmare Map; 3.28/3.29 guides and a 3.25 forum list pair them with
//   maps). A 3.29 guide (aoeah) says each drops at 5%, unconfirmed for 3.30.
import type { Boss, BossDrop } from './bosses'

export const NIGHTMARE_SOURCE = {
  label: 'maxroll 3.30 Nightmare Boss Rush, wiki fragment rule, 5% unique (3.29 guide)',
  url: 'https://maxroll.gg/poe/currency/tier-17-boss-rushing'
}

export const NIGHTMARE_MAP = 'Nightmare Map'

// Every uber fragment a Nightmare boss can drop (poe.ninja Fragment names).
export const UBER_FRAGMENTS = [
  'Reality Fragment',
  'Awakening Fragment',
  'Decaying Fragment',
  'Blazing Fragment',
  'Devouring Fragment',
  'Cosmic Fragment',
  'Synthesising Fragment',
  'Lonely Fragment',
  'Traumatic Fragment',
  'Reverent Fragment'
]

interface NightmareMap {
  id: string
  name: string
  favoured: string[]
  // The boss's own unique (poe.ninja name).
  unique: string
}

export const NIGHTMARE_MAPS: NightmareMap[] = [
  { id: 'nightmare-abomination', name: 'Abomination Map', favoured: ['Reality Fragment', 'Awakening Fragment'], unique: "Malachai's Mark" },
  { id: 'nightmare-citadel', name: 'Citadel Map', favoured: ['Cosmic Fragment', 'Synthesising Fragment'], unique: 'Manastorm' },
  { id: 'nightmare-fortress', name: 'Fortress Map', favoured: ['Decaying Fragment', 'Synthesising Fragment'], unique: 'Yoke of Suffering' },
  { id: 'nightmare-sanctuary', name: 'Sanctuary Map', favoured: ['Traumatic Fragment', 'Reverent Fragment', 'Lonely Fragment'], unique: 'The Dark Seer' },
  { id: 'nightmare-ziggurat', name: 'Ziggurat Map', favoured: ['Devouring Fragment', 'Blazing Fragment'], unique: 'Wraithlord' }
]

export const DEFAULT_FRAGMENTS_PER_KILL = 2
// Share of fragments that come from the favoured ones (wiki).
export const FAVOURED_SHARE = 0.8
export const NIGHTMARE_RUN_SECONDS = 240
// Chance of the boss's unique a kill, percent (aoeah, 3.29).
export const UNIQUE_CHANCE = 5

// Expected copies of each fragment per kill.
export function expectedFragments (map: NightmareMap, perKill: number): Map<string, number> {
  const others = UBER_FRAGMENTS.filter(f => !map.favoured.includes(f))
  const out = new Map<string, number>()
  for (const f of UBER_FRAGMENTS) {
    const share = map.favoured.includes(f)
      ? FAVOURED_SHARE / map.favoured.length
      : (1 - FAVOURED_SHARE) / others.length
    out.set(f, share * perKill)
  }
  return out
}

export function nightmareBosses (perKill: number | undefined): Boss[] {
  const n = perKill != null && Number.isFinite(perKill) && perKill > 0 ? perKill : DEFAULT_FRAGMENTS_PER_KILL
  return NIGHTMARE_MAPS.map(map => {
    const expected = expectedFragments(map, n)
    const estimates: Record<string, number> = {}
    const drops: BossDrop[] = UBER_FRAGMENTS.map(name => {
      const e = expected.get(name)!
      // A chance can't pass 100%: above one copy a kill, the rest goes in qty.
      if (e > 1) {
        estimates[name] = 100
        return { name, chance: null, qty: Math.round(e * 100) / 100, estimateQty: true }
      }
      estimates[name] = e * 100
      return { name, chance: null }
    })
    estimates[map.unique] = UNIQUE_CHANCE
    drops.push({ name: map.unique, chance: null })
    return {
      id: map.id,
      name: map.name,
      tier: 'nightmare' as const,
      entry: [{ name: NIGHTMARE_MAP, qty: 1 }],
      runSeconds: NIGHTMARE_RUN_SECONDS,
      drops,
      estimates,
      estimateSource: NIGHTMARE_SOURCE,
      source: null
    }
  })
}

export function isNightmare (boss: Pick<Boss, 'tier'>): boolean {
  return boss.tier === 'nightmare'
}
