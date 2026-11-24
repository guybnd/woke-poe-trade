import { stat, pseudoStatByRef } from '@/assets/data'
import { ItemRarity, ItemCategory } from '@/parser'
import { ModifierType } from '@/parser/modifiers'
import { FiltersCreationContext } from '../create-stat-filters'
import { FilterTag } from '../interfaces'
import { noSourcePseudoToFilter, propToFilter } from './item-property'
import { findAndResolveByRef, statToNotFilter } from './utils'

const PSEUDO = {
  MORE_THREADS: stat('More Scarabs: #%'),
  MORE_MAPS: stat('More Maps: #%'),
  MORE_DIVINATION_CARDS: stat('More Divination Cards: #%'),
  MORE_CURRENCY: stat('More Currency: #%'),
  EXPLICIT_MODIFIERS: stat('# Modifiers')
}

const VALDO_LETHAL_STATS = [
  stat('Players who Die in area are sent to the Void')
]

function areaProps (
  { disabled }: { disabled: { itemQuantity?: boolean, itemRarity?: boolean, packSize?: boolean } },
  ctx: FiltersCreationContext
): void {
  const { item } = ctx

  if (item.areaItemQuantity) {
    ctx.filters.push(propToFilter({
      ref: 'Item Quantity: +#%',
      tradeId: 'item.map_item_quantity',
      roll: { min: 0, max: Number.MAX_SAFE_INTEGER, value: item.areaItemQuantity },
      sources: [],
      disabled: disabled.itemQuantity
    }, ctx))
  }
  if (item.areaAtlasDrops) {
    // Off by default: on 2026-11-15 the trade site's Atlas Drops filter
    // (map_bonus) matched no listing at all, even at +1%, while Rarity and
    // Pack size work. Ticking it today would empty the results.
    ctx.filters.push(propToFilter({
      ref: 'Atlas Drops: +#%',
      tradeId: 'item.map_atlas_drops',
      roll: { min: 0, max: Number.MAX_SAFE_INTEGER, value: item.areaAtlasDrops },
      sources: [],
      disabled: true
    }, ctx))
  }
  if (item.areaItemRarity) {
    ctx.filters.push(propToFilter({
      ref: 'Item Rarity: +#%',
      tradeId: 'item.map_item_rarity',
      roll: { min: 0, max: Number.MAX_SAFE_INTEGER, value: item.areaItemRarity },
      sources: [],
      disabled: disabled.itemRarity
    }, ctx))
  }
  if (item.areaPackSize) {
    ctx.filters.push(propToFilter({
      ref: 'Monster Pack Size: +#%',
      tradeId: 'item.map_pack_size',
      roll: { min: 0, max: Number.MAX_SAFE_INTEGER, value: item.areaPackSize },
      sources: [],
      disabled: disabled.packSize
    }, ctx))
  }
}

export function mapProps (bulk: boolean, ctx: FiltersCreationContext): void {
  const { item } = ctx
  if (item.category !== ItemCategory.Map || item.mapCompletionReward || item.rarity === ItemRarity.Unique) return

  mapKindFilters(ctx)

  if (!bulk) {
    // woke: Rarity starts on like Pack size, More X or not (Guy, 2026-11-23: a
    // high Rarity left off looked like a mistake). APT left it off when the map
    // had More Currency / Scarabs / Div cards.
    areaProps({
      disabled: {
        itemQuantity: false,
        itemRarity: false,
        packSize: false
      }
    }, ctx)

    if (item.mapMoreMaps) {
      ctx.filters.push(noSourcePseudoToFilter({
        pseudo: pseudoStatByRef(PSEUDO.MORE_MAPS)!,
        roll: { min: 0, max: Number.MAX_SAFE_INTEGER, value: item.mapMoreMaps },
        disabled: true
      }, ctx))
    }
    if (item.mapMoreThreads) {
      ctx.filters.push(noSourcePseudoToFilter({
        pseudo: pseudoStatByRef(PSEUDO.MORE_THREADS)!,
        roll: { min: 0, max: Number.MAX_SAFE_INTEGER, value: item.mapMoreThreads },
        disabled: false
      }, ctx))
    }
    if (item.mapMoreCurrency) {
      ctx.filters.push(noSourcePseudoToFilter({
        pseudo: pseudoStatByRef(PSEUDO.MORE_CURRENCY)!,
        roll: { min: 0, max: Number.MAX_SAFE_INTEGER, value: item.mapMoreCurrency },
        disabled: false
      }, ctx))
    }
    if (item.mapMoreDivCards) {
      ctx.filters.push(noSourcePseudoToFilter({
        pseudo: pseudoStatByRef(PSEUDO.MORE_DIVINATION_CARDS)!,
        roll: { min: 0, max: Number.MAX_SAFE_INTEGER, value: item.mapMoreDivCards },
        disabled: false
      }, ctx))
    }
  }

  // 3.30 maps can carry a 9th, rare-only mod.
  const explicitMods = item.newMods.filter(mod =>
    mod.info.type === ModifierType.Explicit ||
    mod.info.type === ModifierType.Fractured)
  if (explicitMods.length >= 8) {
    ctx.filters.push(noSourcePseudoToFilter({
      pseudo: pseudoStatByRef(PSEUDO.EXPLICIT_MODIFIERS)!,
      roll: { min: 0, max: 9, value: explicitMods.length },
      disabled: false
    }, { ...ctx, searchInRange: 0 }))
  }
}

export function chartProps (bulk: boolean, ctx: FiltersCreationContext): void {
  const { item } = ctx
  if (bulk || item.category !== ItemCategory.Chart) return

  areaProps({
    disabled: {
      itemQuantity: false,
      itemRarity: false,
      packSize: false
    }
  }, ctx)

  if (item.chartSulphur) {
    ctx.filters.push(propToFilter({
      ref: "Dead Man's Sulphur: +#%",
      tradeId: 'item.chart_sulphur',
      roll: { min: 0, max: Number.MAX_SAFE_INTEGER, value: item.chartSulphur },
      sources: [],
      disabled: false
    }, ctx))
  }
}

// woke: one filter for the Void mod on every Valdo map: a void map searches
// void maps, any other searches maps without it. The Valdo strip (ValdoStrip.vue)
// switches it Any / Void / No void.
export function valdoBadMods (ctx: FiltersCreationContext): void {
  if (!ctx.item.mapCompletionReward) return

  for (const lethalStatRef of VALDO_LETHAL_STATS) {
    const has = ctx.item.statsByType.some(calc => calc.stat.ref === lethalStatRef)
    const lethalStat = findAndResolveByRef(lethalStatRef, ModifierType.Explicit, ctx.item.category)
    const filter = statToNotFilter({
      stat: lethalStat,
      type: ModifierType.Explicit,
      disabled: false
    })
    if (has) filter.not = undefined
    filter.valdoVoid = true
    ctx.filters.push(filter)
  }
}

// woke: a map's kind is its influence: none, the Originator, the Elder or Shaper (an
// Elder map also has a guardian: "occupied by The Purifier"), a conqueror's Citadel, or
// the Originator with one of those (Guy, 2026-11-24). Kinds list at
// different prices (Elder maps carry a guardian and list cheap: 807 of the T16
// Originator maps in Covens, 2026-11-24, WOKEPOET-523), so the search finds only
// this map's kind: its own influence lines are searched as "has" (they start on), and
// one "not" filter per kind it isn't is added here. The map strip's Kind switch
// turns them all off (Any kind). Nightmare and Valdo maps are other items.
export const NO_ELDER_TRADE_ID = 'implicit.stat_1792283443'
export const CITADEL_TRADE_ID = 'implicit.stat_2563183002'
export const ORIGINATOR_TRADE_ID = 'implicit.stat_2696470877'
const MAP_KINDS: Array<{ id: string, statRef: string, text: string, options?: number[] }> = [
  // 1 Shaper, 2 Elder (checked live 2026-11-24).
  { id: NO_ELDER_TRADE_ID, statRef: 'Area is influenced by The Elder', text: 'Area is influenced by The Elder or The Shaper', options: [1, 2] },
  // A conqueror's Citadel: 1 Baran, 2 Veritania, 3 Al-Hezmin, 4 Drox (stats data). The Elder's
  // guardians ("occupied by") come with the Elder, so leaving out the Elder leaves them out too.
  { id: CITADEL_TRADE_ID, statRef: "Map contains Baran's Citadel", text: "Map contains a conqueror's Citadel", options: [1, 2, 3, 4] },
  { id: ORIGINATOR_TRADE_ID, statRef: "Area is Influenced by the Originator's Memories", text: "Area is Influenced by the Originator's Memories" }
]
export const MAP_KIND_TRADE_IDS: readonly string[] = MAP_KINDS.map(k => k.id)

function mapKindFilters (ctx: FiltersCreationContext): void {
  const { item } = ctx
  if (item.info.refName !== 'Map') return
  for (const kind of MAP_KINDS) {
    const has = item.statsByType.some(calc =>
      calc.stat.trade.ids[ModifierType.Implicit]?.some(id => id === kind.id || id.startsWith(`${kind.id}|`)))
    if (has) continue
    ctx.filters.push({
      tradeId: [kind.id],
      statRef: kind.statRef,
      text: kind.text,
      tag: FilterTag.Implicit,
      sources: [],
      disabled: false,
      not: true,
      mapKind: { options: kind.options }
    })
  }
}

// woke: 3.30 map mods that come in variants. Searched as "any of them" by default
// (Guy, 2026-11-24: any Evocator does the job); the map strip narrows it to this one.
const MAP_MOD_FAMILIES = [
  { label: 'Evocator', refs: ['Area contains an Evocator of Beidat', 'Area contains an Evocator of Ghorr', "Area contains an Evocator of K'Tash"] },
  { label: 'buried Sentinel', refs: ['Area contains a buried Apex Sentinel', 'Area contains a buried Stalker Sentinel', 'Area contains a buried Pandemonium Sentinel'] }
]

export function mapModFamilies (ctx: FiltersCreationContext): void {
  for (const f of ctx.filters) {
    if (!f.mapMod && !f.mapLine) continue
    const family = MAP_MOD_FAMILIES.find(fam => fam.refs.includes(f.statRef))
    if (!family) continue
    // Two kinds on one map: each stays its own, or one Evocator would match both.
    if (ctx.filters.filter(g => (g.mapMod || g.mapLine) && family.refs.includes(g.statRef)).length > 1) continue
    // An Evocator can be a mod or (on an Originator map) an enchant: search its siblings of the same kind.
    if (!f.mapMod && f.tag !== FilterTag.Enchant && f.tag !== FilterTag.Implicit) continue
    const type = f.mapMod ? ModifierType.Explicit : f.tag as ModifierType
    const ids = family.refs.flatMap(ref => {
      try { return findAndResolveByRef(ref, type, ctx.item.category).trade.ids[type] ?? [] } catch { return [] }
    })
    if (ids.length < 2) continue
    f.anyOf = { label: family.label, ids, exact: f.tradeId }
    f.tradeId = ids
  }
}
