// The 3.30 Templar Vaults (Zealot's, Scholar's, Arkhon's, Machinist's): what
// each one's reliquaries can give, priced from poe.ninja. The table is
// public/data/league/vaults.json (scripts/build-vault-data.mjs, from poewiki),
// fetched on first use and never bundled, so a league's changes reach players
// without a release.
//
// Facts (poewiki, read 2026-11-21):
// - A vault has four reliquaries; you take one reward.
// - A vault can spawn after a pinnacle boss kill in its quadrant, in the boss's
//   own arena (not Maven's invitations or Valdo maps).
// - Nightmare (T17) maps spawn them too, which the wiki doesn't say (Guy,
//   2026-11-21). How often depends on how you play, so the app shows no
//   rate. His Client.txt, Nov 4-21: the vault was always the map boss's
//   quadrant vault: Fortress
//   -> Zealot's 102/182, Abomination -> Arkhon's 5/11, Ziggurat -> Scholar's
//   1/2. Citadel -> Zealot's and Sanctuary -> Machinist's follow the same rule
//   (their favoured fragments' fights) but weren't seen yet.
// - GGG publishes no reward weights and no spawn chance. So "typical pick"
//   below is an estimate: the best of four offers, every reward equally likely
//   except the ones the wiki says turn up rarely (a tenth as likely), and
//   rewards poe.ninja can't price counted as nothing.
import { dataFileUrl, onSharedDataChange } from '../app/live-data'
import { BOSSES } from '../boss-runs/bosses'
import { NIGHTMARE_MAPS } from '../boss-runs/nightmare'

export interface VaultReward {
  text: string
  kind: string
  // The wiki says it turns up rarely.
  rare?: boolean
  // poe.ninja names; several are averaged (you get one of them).
  items?: Array<{ name: string, variant?: string }>
  qty?: number
  note?: string
}

export interface Vault {
  // Area id, as Client.txt logs it.
  id: string
  name: string
  quadrant: string
  // Pinnacle bosses that can spawn it (wiki names).
  bosses: string[]
  wiki: string
  rewards: VaultReward[]
}

export interface VaultTable {
  source: string
  read: string
  note: string
  vaults: Vault[]
}

export const OFFERS = 4
export const RARE_WEIGHT = 0.1

let job: Promise<VaultTable | null> | null = null
onSharedDataChange(() => { job = null })

// Null when the file can't be read; a later call tries again.
export function loadVaults (): Promise<VaultTable | null> {
  job ??= fetch(dataFileUrl('league/vaults.json'))
    .then(res => res.ok ? res.json() : Promise.reject(new Error(`vaults.json: ${res.status}`)))
    .then((d: VaultTable) => Array.isArray(d?.vaults) ? d : Promise.reject(new Error('vaults.json: no vaults')))
    .catch((e) => {
      console.warn('[vaults] No vault table', e)
      job = null
      return null
    })
  return job
}

export type PriceOf = (name: string, variant?: string) => number | null

// A reward's worth in chaos: its items' average price times how many. Null
// when poe.ninja has none of them.
export function rewardPrice (r: VaultReward, price: PriceOf): number | null {
  if (!r.items?.length) return null
  const each = r.items.map(i => price(i.name, i.variant)).filter((p): p is number => p != null)
  if (!each.length) return null
  return each.reduce((a, b) => a + b, 0) / each.length * (r.qty ?? 1)
}

// ~Typical pick: the expected best of OFFERS rewards, drawn by weight (see the
// note at the top). An estimate, never data.
export function typicalPick (v: Vault, price: PriceOf): number | null {
  const pool = v.rewards.map(r => ({ c: rewardPrice(r, price) ?? 0, w: r.rare ? RARE_WEIGHT : 1 }))
  const total = pool.reduce((s, p) => s + p.w, 0)
  if (!total || pool.every(p => p.c === 0)) return null
  const values = [...new Set(pool.map(p => p.c))].sort((a, b) => a - b)
  let ev = 0
  let prev = 0
  for (const x of values) {
    const atMost = pool.filter(p => p.c <= x).reduce((s, p) => s + p.w, 0) / total
    const cdf = Math.pow(atMost, OFFERS)
    ev += x * (cdf - prev)
    prev = cdf
  }
  return ev
}

// The best-priced reward, rare or not.
export function topReward (v: Vault, price: PriceOf): { reward: VaultReward, chaos: number } | null {
  let best: { reward: VaultReward, chaos: number } | null = null
  for (const reward of v.rewards) {
    const chaos = rewardPrice(reward, price)
    if (chaos != null && (!best || chaos > best.chaos)) best = { reward, chaos }
  }
  return best
}

// "The Maven", "Sirus, Awakener of Worlds", "Uber Sirus" -> "maven", "sirus".
function bossKey (name: string): string {
  return name.replace(/^Uber (?!Elder$)/, '').replace(/^The /, '').replace(/,.*$/, '').trim().toLowerCase()
}

export function vaultForBoss (table: VaultTable, boss: string): Vault | null {
  const key = bossKey(boss)
  return table.vaults.find(v => v.bosses.some(b => bossKey(b) === key)) ?? null
}

// The vault whose quadrant a fragment's uber fight is in (Boss runs' entries),
// e.g. Reality Fragment -> Uber Maven -> Arkhon's Vault.
export function vaultForFragment (table: VaultTable, fragment: string): Vault | null {
  const boss = BOSSES.find(b => b.tier === 'uber' && b.entry.some(e => e.name === fragment))
  return boss ? vaultForBoss(table, boss.name) : null
}

// Vaults that can give an item, by its poe.ninja name (Arkhon's: Nightmare Map).
export function vaultsGiving (table: VaultTable, name: string): Vault[] {
  return table.vaults.filter(v => v.rewards.some(r => r.items?.some(i => i.name === name)))
}

// "Zealot's Vault" -> "Zealot's".
export function shortName (v: Vault): string {
  return v.name.replace(/ Vault$/, '')
}

// The vault a Nightmare map spawns: its boss's quadrant, found through the
// fragments the boss favours (Fortress: Decaying -> Uber Elder -> Zealot's).
export function vaultForNightmare (table: VaultTable, mapId: string): Vault | null {
  const map = NIGHTMARE_MAPS.find(m => m.id === mapId)
  if (!map) return null
  for (const f of map.favoured) {
    const v = vaultForFragment(table, f)
    if (v) return v
  }
  return null
}

// The Nightmare maps that spawn a vault ("Fortress, Citadel").
export function nightmareMapsFor (table: VaultTable, v: Vault): string[] {
  return NIGHTMARE_MAPS.filter(m => vaultForNightmare(table, m.id)?.id === v.id).map(m => m.name.replace(/ Map$/, ''))
}
