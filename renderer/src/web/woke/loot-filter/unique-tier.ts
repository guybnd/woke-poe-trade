// The price check's side list: which tier your loot filter puts a checked
// unique in, drawn in that tier's look. NeverSink tiers uniques by base, so
// the tier is the base's: the dearest unique on it is shown with it.
import { ItemRarity } from '@/parser'
import type { ParsedItem } from '@/parser'
import type { LootFilterStore } from './store'
import { checkedItemFacts } from './checked-facts'
import { matchItem } from './match'
import type { FilterAction } from './parse'
import { ruleLabel, tierName } from './parse'
import { tierLabel } from './names'
import { ECONOMY_GROUPS } from './economy'
import { setterName } from './drop-uniques'
import type { RuleRef } from './open-rule'

export interface UniqueTier {
  // The tier in a few letters: "T1", or the tier's name ("Can be hidden").
  short: string
  // The rule in full: "All uniques › Tier 1".
  where: string
  visibility: 'Show' | 'Hide' | 'Minimal'
  // The look the game draws, every matching rule's actions merged.
  actions: FilterAction[]
  rule?: RuleRef
  base: string
  // A NeverSink unique tier that goes by base alone: every unique on the base
  // lands in it (not a special tier like 6-link or Kaom's Heart, the safety
  // net, an own rule).
  byBase: boolean
  // The dearest unique on the base, and whether a price move says it set the tier.
  dearest: { name: string, chaos: number | null, setsTier: boolean } | null
}

const UNIQUES = ECONOMY_GROUPS.find(g => g.unique)!
// NeverSink's unique tiers: plain, Foulborn and replica copies (3.27+).
const UNIQUE_TYPE = /^uniques(->(foulborn|replicas))?$/
// What a by-base tier's rule may test besides the base.
const BASE_TIER_KEYS = new Set(['Rarity', 'BaseType', 'Class', 'Foulborn', 'Replica', 'AreaLevel'])

export function shortTier (tier: string): string {
  const m = /^t(\d+)$/.exec(tier)
  return m ? `T${m[1]}` : tierLabel(tier)
}

export function uniqueTier (store: LootFilterStore | null, item: ParsedItem | null): UniqueTier | null {
  const doc = store?.doc.value
  if (!store || !doc || !item || item.rarity !== ItemRarity.Unique) return null
  if (item.rawText === 'VIRTUAL_ITEM' || item.rollsFromData) return null
  const facts = checkedItemFacts(doc, item.rawText, item)
  const base = facts.baseType
  if (!base) return null
  const m = matchItem(doc, { ...facts, areaLevel: store.areaLevel.value ?? store.config.fallbackAreaLevel })
  const b = m.final?.block
  const tagged = Boolean(b?.type && b.tier && !b.tier.startsWith('#'))
  const unique = Boolean(tagged && UNIQUE_TYPE.test(b!.type!))
  const byBase = unique && b!.conditions.some(c => c.key === 'BaseType') && b!.conditions.every(c => BASE_TIER_KEYS.has(c.key))
  const short = !b ? 'No rule' : unique ? shortTier(b.tier!) : tierName(b)
  const where = ruleLabel(b?.type ?? null, b?.tier ?? null)
  return {
    short,
    where,
    visibility: m.visibility,
    actions: m.actions,
    rule: tagged && !b!.type!.startsWith('woke->') ? { type: b!.type!, tier: b!.tier! } : undefined,
    base,
    byBase,
    dearest: byBase ? dearestOn(store, base) : null
  }
}

function dearestOn (store: LootFilterStore, base: string): UniqueTier['dearest'] {
  const list = store.prices.breakdown.value(UNIQUES, base)
  let top: { name: string, chaos: number | null } | null = null
  for (const u of list) if (u.chaos != null && (!top || u.chaos > (top.chaos ?? -1))) top = u
  if (!top) return null
  // Only a price move says which unique set the tier (DropUniques.vue).
  const cfg = store.config.priceTiers
  const league = store.prices.currentLeague.value
  const move = cfg.on
    ? cfg.moves.find(mv => mv.type === UNIQUES.type && mv.base === base && (!mv.league || !league || mv.league === league))
    : undefined
  return { ...top, setsTier: setterName(move?.note) === top.name }
}
