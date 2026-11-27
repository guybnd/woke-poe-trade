// The price check's side list: which tier your loot filter puts a checked
// unique in, drawn in that tier's look. NeverSink tiers uniques by base, so
// a plain unique's tier is its base's: the dearest unique on it is shown too.
import { ItemRarity } from '@/parser'
import type { ParsedItem } from '@/parser'
import type { LootFilterStore } from './store'
import { checkedItemFacts } from './checked-facts'
import { matchItem } from './match'
import type { FilterAction } from './parse'
import { ruleLabel } from './parse'
import { tierLabel } from './names'
import { ECONOMY_GROUPS } from './economy'
import { setterName } from './drop-uniques'
import { SAFETY_RULE_TYPE } from './safety'
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
  // A NeverSink unique tier that goes by base alone, so the other uniques on
  // the base land in it too (unless a special rule above catches them):
  // 'plain', 'foulborn' or 'replica' copies. Null for a special tier (6-link,
  // Kaom's Heart), the safety net or an own rule.
  byBase: 'plain' | 'foulborn' | 'replica' | null
  // The safety net shows what the filter would hide.
  safety: boolean
  // A plain tier's dearest unique on the base, and whether a price move says it set the tier.
  dearest: { name: string, chaos: number | null, setsTier: boolean } | null
}

const UNIQUES = ECONOMY_GROUPS.find(g => g.unique)!
// NeverSink's unique tiers: plain, Foulborn and replica copies (3.27+).
const UNIQUE_TYPE: Record<string, 'plain' | 'foulborn' | 'replica'> = {
  'uniques': 'plain',
  'uniques->foulborn': 'foulborn',
  'uniques->replicas': 'replica'
}
// What a by-base tier's rule may test besides the base.
const BASE_TIER_KEYS = new Set(['Rarity', 'BaseType', 'Class', 'Foulborn', 'Replica', 'AreaLevel'])

export function shortTier (tier: string): string {
  const m = /^t(\d+)$/.exec(tier)
  return m ? `T${m[1]}` : tierLabel(tier)
}

export function uniqueTier (store: LootFilterStore | null, item: ParsedItem | null): UniqueTier | null {
  const doc = store?.doc.value
  if (!store || !doc || !item || item.rarity !== ItemRarity.Unique) return null
  // A unique checked by name (a side list row, Search) has no copied text:
  // its base comes from the item data, which is what a base tier needs.
  const facts = checkedItemFacts(doc, item.rawText === 'VIRTUAL_ITEM' ? '' : item.rawText, item)
  const base = facts.baseType
  if (!base) return null
  const m = matchItem(doc, { ...facts, areaLevel: store.areaLevel.value ?? store.config.fallbackAreaLevel })
  const b = m.final?.block
  const tagged = Boolean(b?.type && b.tier && !b.tier.startsWith('#'))
  const kind = tagged ? UNIQUE_TYPE[b!.type!] : undefined
  const byBase = kind && b!.conditions.some(c => c.key === 'BaseType') && b!.conditions.every(c => BASE_TIER_KEYS.has(c.key)) ? kind : null
  const safety = b?.type === SAFETY_RULE_TYPE
  const own = Boolean(b?.type?.startsWith('woke->'))
  const short = !b ? 'No rule' : safety ? 'Safety net' : own ? 'Your rule' : kind ? shortTier(b.tier!) : ruleLabel(b.type ?? null, b.tier ?? null)
  return {
    short,
    where: ruleLabel(b?.type ?? null, b?.tier ?? null),
    visibility: m.visibility,
    actions: m.actions,
    // As the price check's filter chip goes to it (FilterVerdictChip.vue).
    rule: tagged ? { type: b!.type!, tier: b!.tier! } : undefined,
    base,
    byBase,
    safety,
    dearest: byBase === 'plain' ? dearestOn(store, base) : null
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
  return { name: top.name, chaos: top.chaos, setsTier: setterName(move?.note) === top.name }
}
