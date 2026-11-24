// woke: the bulk exchange entry a map trades under (WOKEPOET-523). Maps have no
// exchange tag in APT's data, so the price check only ever searched the 100
// cheapest single listings. The exchange lists each seller once with their stock
// (Covens, 2026-11-24: the Memory-Influenced T16 entry had sellers with 1,000+
// maps at 50-70c, past every listing the trade search showed).
// Ids from https://www.pathofexile.com/api/trade/data/static, "Maps" and
// "Shaper, Conqueror & Elder Maps".
import { ItemCategory, ItemRarity } from '@/parser'
import type { ParsedItem } from '@/parser'

const ORIGINATOR = "Area is Influenced by the Originator's Memories"
// "Area is influenced by The Elder / The Shaper" (ELDER_SHAPER_TRADE_ID in filters/pseudo/map-kind.ts).
const INFLUENCE_TRADE_ID = 'implicit.stat_1792283443'

// The implicit that puts a map in its own exchange entry.
const BY_IMPLICIT: Record<string, MapExchange> = {
  "Map contains Al-Hezmin's Citadel\nItem Quantity increases amount of Rewards Al-Hezmin drops by 20% of its value": { tag: 'al-hezmins-map', label: "Al-Hezmin's Citadel Map" },
  "Map contains Baran's Citadel\nItem Quantity increases amount of Rewards Baran drops by 20% of its value": { tag: 'barans-map', label: "Baran's Citadel Map" },
  "Map contains Drox's Citadel\nItem Quantity increases amount of Rewards Drox drops by 20% of its value": { tag: 'droxs-map', label: "Drox's Citadel Map" },
  "Map contains Veritania's Citadel\nItem Quantity increases amount of Rewards Veritania drops by 20% of its value": { tag: 'veritanias-map', label: "Veritania's Citadel Map" },
  'Map is occupied by The Enslaver': { tag: 'enslaver-map', label: 'Enslaver-Occupied Map' },
  'Map is occupied by The Eradicator': { tag: 'eradicator-map', label: 'Eradicator-Occupied Map' },
  'Map is occupied by The Constrictor': { tag: 'constrictor-map', label: 'Constrictor-Occupied Map' },
  'Map is occupied by The Purifier': { tag: 'purifier-map', label: 'Purifier-Occupied Map' }
}

const BY_BASE: Record<string, string> = {
  'Nightmare Map': 'nightmare-map',
  'Vaal Temple Map': 'vaal-temple-map',
  'Shaper Guardian Map': 'shaper-guardian-map'
}

/** The exchange's name for the entry, shown on the button. */
export interface MapExchange {
  tag: string
  label: string
}

/** The entry, with the Exchange button's hover texts. */
export interface MapExchangeView extends MapExchange {
  title: string
  backTitle: string
}

export function mapExchange (item: ParsedItem): MapExchangeView | null {
  const entry = exchangeEntry(item)
  return entry && {
    ...entry,
    title: `Search the bulk exchange's ${entry.label}: each seller once, with their stock, cheapest first. One exchange search. It can't filter by mods.`,
    backTitle: `Showing ${entry.label} on the bulk exchange. Click to go back to the listings (a trade search).`
  }
}

function exchangeEntry (item: ParsedItem): MapExchange | null {
  if (item.category !== ItemCategory.Map || item.rarity === ItemRarity.Unique || item.mapCompletionReward) return null
  // Its mods are hidden, so a guardian or the Originator's Memories could be there.
  if (item.isUnidentified) return null
  const refName = item.info.refName
  const tier = item.mapTier
  if (BY_BASE[refName]) return { tag: BY_BASE[refName], label: item.info.name }
  if (!tier) return null
  if (refName === 'Blighted Map') return { tag: `blighted-map-tier-${tier}`, label: `Blighted Map (Tier ${tier})` }
  if (refName === 'Blight-ravaged Map') {
    return tier >= 14 ? { tag: `blight-ravaged-map-tier-${tier}`, label: `Blight-ravaged Map (Tier ${tier})` } : null
  }
  if (refName !== 'Map') return null

  const implicits = new Set(item.statsByType.map(calc => calc.stat.ref))
  for (const [ref, entry] of Object.entries(BY_IMPLICIT)) {
    if (implicits.has(ref)) return entry
  }
  // Elder or Shaper influence with no guardian: no entry of its own, and not a plain map.
  if (item.statsByType.some(calc => calc.stat.trade.ids.implicit?.some(id => id.startsWith(INFLUENCE_TRADE_ID)))) return null
  if (implicits.has(ORIGINATOR)) return { tag: `zana-map-tier-${tier}`, label: `Memory-Influenced Map (Tier ${tier})` }
  return { tag: `map-tier-${tier}`, label: `Map (Tier ${tier})` }
}

/** The item as the exchange search sees it: the map, with the entry's tag. */
export function asExchangeItem (item: ParsedItem, tag: string): ParsedItem {
  return { ...item, info: { ...item.info, tradeTag: tag } }
}
