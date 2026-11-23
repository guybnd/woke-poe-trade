import { stat, pseudoStatByRef } from '@/assets/data'
import { ItemRarity, ItemCategory } from '@/parser'
import { ModifierType } from '@/parser/modifiers'
import { FiltersCreationContext } from '../create-stat-filters'
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
