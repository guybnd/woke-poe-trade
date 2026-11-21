// The 3.30 Templar Vaults in the search: "vault" lists all four (an overview
// card, then each vault); a vault's name ("zealot", "arkhon's vault") gives
// that vault's rewards at poe.ninja prices. The table loads when the palette
// opens (woke/vaults).
import { matchRank } from '../search'
import { nightmareMapsFor, OFFERS, shortName, topReward, typicalPick, rewardPrice, DEFAULT_NIGHTMARE_VAULT_CHANCE, NIGHTMARE_VAULT_SOURCE } from '../../vaults/vaults'
import type { Vault, VaultTable } from '../../vaults/vaults'
import type { Lookup, LookupCard, LookupContext, LookupRow } from './types'

// "vaul", "vault", "vaults", "templar vaults": the overview and all four.
const OVERVIEW = /^((templar|memory) vaults?|vaul|vaults?)$/i
const MIN_QUERY = 4
const WIKI = 'https://www.poewiki.net/wiki/Templar_Vault'

const NOTE = `~ = estimated. GGG publishes no reward weights or vault spawn chance. You see ${OFFERS} rewards and take 1; typical = the best of ${OFFERS}, with "rare" rewards a tenth as likely and ones poe.ninja can't price counted as nothing. Gems priced at level 1.`

function vaultCard (v: Vault, table: VaultTable, ctx: LookupContext): LookupCard {
  const nightmare = nightmareMapsFor(table, v)
  const typical = typicalPick(v, ctx.price)
  const rewards: LookupRow[] = v.rewards
    .map(r => ({ r, chaos: rewardPrice(r, ctx.price) }))
    .sort((a, b) => (b.chaos ?? -1) - (a.chaos ?? -1))
    .map(({ r, chaos }) => ({
      label: `${r.text}${r.rare ? ' · rare' : ''}`,
      ...(chaos != null ? { chaos } : { value: r.note ?? 'varies', dim: true }),
      ...(r.items?.length === 1 ? { item: { name: r.items[0].name } } : {})
    }))
  return {
    id: `vault:${v.id}`,
    group: 'Atlas',
    name: v.name,
    sub: `${v.quadrant} · ${typical != null ? `~${Math.round(typical)} c typical` : 'rewards vary'}`,
    icon: 'fas fa-dungeon',
    sections: [
      {
        rows: [
          { label: 'Quadrant', value: v.quadrant },
          { label: 'Spawns from', value: v.bosses.join(', ') },
          ...(nightmare.length ? [{ label: 'And Nightmare maps', value: `${nightmare.join(', ')} · ~${DEFAULT_NIGHTMARE_VAULT_CHANCE}% of runs` }] : []),
          { label: '~Typical pick', chaos: typical }
        ]
      },
      { label: `Reliquary rewards (take 1 of ${OFFERS})`, rows: rewards },
      { text: [NOTE, `Nightmare maps: ${NIGHTMARE_VAULT_SOURCE}; each spawns its boss's quadrant vault.`] }
    ],
    actions: [{ label: 'poewiki', url: v.wiki }]
  }
}

function overviewCard (table: VaultTable, ctx: LookupContext): LookupCard {
  const ranked = table.vaults
    .map(v => ({ v, typical: typicalPick(v, ctx.price), top: topReward(v, ctx.price) }))
    .sort((a, b) => (b.typical ?? -1) - (a.typical ?? -1))
  return {
    id: 'vault:all',
    group: 'Atlas',
    name: 'Templar Vaults',
    sub: ranked[0]?.typical != null ? `Best: ${ranked[0].v.name}` : 'Four vaults, take 1 of 4',
    icon: 'fas fa-dungeon',
    sections: [
      {
        table: {
          head: ['Vault · bosses', 'Top reward', '~Typical'],
          priceAt: 2,
          rows: ranked.map(({ v, typical, top }) => ({
            cells: [
              { text: shortName(v), sub: `${v.quadrant} · ${v.bosses.join(', ')}` },
              top ? { text: top.reward.text, sub: `${Math.round(top.chaos)} c${top.reward.rare ? ' · rare' : ''}` } : 'varies'
            ],
            chaos: typical
          }))
        }
      },
      { text: [NOTE, `Rewards from ${table.source}, read ${table.read}.`] }
    ],
    actions: [{ label: 'poewiki', url: WIKI }]
  }
}

export function vaultLookup (table: VaultTable | null): Lookup {
  return (query, ctx) => {
    if (!table) return []
    const q = query.trim()
    if (q.length < 3) return []
    if (OVERVIEW.test(q)) return [overviewCard(table, ctx), ...table.vaults.map(v => vaultCard(v, table, ctx))]
    if (q.length < MIN_QUERY) return []
    const hits = table.vaults.filter(v => [v.name, shortName(v), shortName(v).replace(/'s$/, '')].some(n => { const r = matchRank(n, q); return r === 0 || r === 1 }))
    return hits.map(v => vaultCard(v, table, ctx))
  }
}
