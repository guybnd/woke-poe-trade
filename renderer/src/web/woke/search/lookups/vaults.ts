// The 3.30 Templar Vaults in the search: "vault" or a vault's name ("zealot",
// "arkhon's vault") gives one card with all four vaults' rewards at poe.ninja
// prices, best typical pick first (Guy's pick B, 2026-11-21). The table loads
// when the palette opens (woke/vaults).
import { matchRank } from '../search'
import { nightmareMapsFor, OFFERS, shortName, typicalPick, rewardPrice } from '../../vaults/vaults'
import type { Vault, VaultTable } from '../../vaults/vaults'
import type { Lookup, LookupCard, LookupContext, LookupRow, LookupSection } from './types'

// "vaul", "vault", "vaults", "templar vaults".
const OVERVIEW = /^((templar|memory) vaults?|vaul|vaults?)$/i
// The display cases inside a vault are labelled "Forbidden Reliquary" in game.
// That's not an item, so the item search finds nothing: send it to the vaults
// card. From 6 letters ("forbid", "reliqu"); the card sits below matching
// items (Forbidden Flame, Reliquary Keys), so it never pushes them down.
const RELIQUARY = ['forbidden reliquary', 'forbidden reliquaries', 'reliquary', 'reliquaries']
const MIN_RELIQUARY = 6
const RELIQUARY_SUB = 'Forbidden Reliquary = a vault display case. Search the item on its label for its price.'
const MIN_QUERY = 4
const WIKI = 'https://www.poewiki.net/wiki/Templar_Vault'

const NOTE = `~ = estimated typical pick. GGG publishes no reward weights. You see ${OFFERS} rewards and take 1; typical = the best of ${OFFERS}, "rare" rewards a tenth as likely, rewards poe.ninja can't price (uniques, most gems, Facetor's Lens) counted as nothing, so it's a floor. Gems priced at level 1.`

function vaultSection (v: Vault, table: VaultTable, ctx: LookupContext): LookupSection {
  const typical = typicalPick(v, ctx.price)
  const maps = nightmareMapsFor(table, v)
  const rewards: LookupRow[] = v.rewards
    .map(r => ({ r, chaos: rewardPrice(r, ctx.price) }))
    .sort((a, b) => (b.chaos ?? -1) - (a.chaos ?? -1))
    .map(({ r, chaos }) => ({
      label: `${r.text}${r.rare ? ' · rare' : ''}`,
      ...(chaos != null ? { chaos } : { value: r.note ?? 'varies', dim: true }),
      ...(r.items?.length === 1 ? { item: { name: r.items[0].name } } : {})
    }))
  return {
    label: `${v.name} · ${v.quadrant}${typical != null ? ` · ~${Math.round(typical)} c typical` : ''}`,
    rows: [
      { label: `From ${v.bosses.join(', ')}${maps.length ? `; ${maps.join(' and ')} Nightmare maps` : ''}`, dim: true },
      ...rewards
    ]
  }
}

function isReliquary (query: string): boolean {
  const q = query.toLowerCase().replace(/\s+/g, ' ')
  return q.length >= MIN_RELIQUARY && RELIQUARY.some(n => n.startsWith(q))
}

function vaultsCard (table: VaultTable, ctx: LookupContext, first: Vault | null, sub?: string): LookupCard {
  const ranked = [...table.vaults].sort((a, b) => (typicalPick(b, ctx.price) ?? -1) - (typicalPick(a, ctx.price) ?? -1))
  // A searched vault leads; the rest follow, best first.
  const order = first ? [first, ...ranked.filter(v => v !== first)] : ranked
  return {
    id: 'vaults',
    group: 'Atlas',
    name: first ? first.name : 'Templar Vaults',
    title: 'Templar Vaults',
    sub: sub ?? (first ? `${first.quadrant} · all four vaults' rewards` : `Best: ${shortName(ranked[0])} · take 1 of ${OFFERS}`),
    icon: 'fas fa-dungeon',
    sections: [
      ...order.map(v => vaultSection(v, table, ctx)),
      { text: [NOTE, `Rewards from ${table.source}, read ${table.read}.`] }
    ],
    actions: [{ label: 'poewiki', url: first?.wiki ?? WIKI }]
  }
}

export function vaultLookup (table: VaultTable | null): Lookup {
  return (query, ctx) => {
    if (!table?.vaults.length) return []
    const q = query.trim()
    if (q.length < 3) return []
    if (OVERVIEW.test(q)) return [vaultsCard(table, ctx, null)]
    if (isReliquary(q)) return [vaultsCard(table, ctx, null, RELIQUARY_SUB)]
    if (q.length < MIN_QUERY) return []
    const hit = table.vaults.find(v => [v.name, shortName(v), shortName(v).replace(/'s$/, '')].some(n => { const r = matchRank(n, q); return r === 0 || r === 1 }))
    return hit ? [vaultsCard(table, ctx, hit)] : []
  }
}
