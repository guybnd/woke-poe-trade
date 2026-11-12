import { ParsedItem, ItemRarity, ItemCategory } from '@/parser'
import { ModifierMechanic, ModifierType, StatCalculated, StatRoll, StatSource, statSourcesTotal, translateStatWithRoll } from '@/parser/modifiers'
import { JEWELLERY } from '@/parser/meta'
import { getPropQuality, QUALITY_CHANGING_ENCHANT } from '@/parser/calc-q20'
import { applyIncr } from '@/parser/advanced-mod-desc'
import { percentRoll, percentRollDelta, roundRoll } from './util'
import { FilterTag, ItemHasEmptyModifier, StatFilter, FilterGroup, FilterOrGroup } from './interfaces'
import { filterPseudo } from './pseudo'
import { applyRules as applyAtzoatlRules } from './pseudo/atzoatl-rules'
import { applyRules as applyMirroredTabletRules } from './pseudo/reflection-rules'
import { filterEquipmentProps, filterBasePercentile, filterMemoryStrands, BASE_PCTL_AFFECTED_IDS } from './pseudo/item-property'
import { mapProps, valdoBadMods, chartProps } from './pseudo/maps'
import { applyFlaskHybridMod } from './pseudo/flasks'
import { applyHeistRules } from './pseudo/heist'
import { filterTimelessJewelKeystones } from './pseudo/timeless-jewel'
import { decodeOils, applyAnointmentRules } from './pseudo/anointments'
import { addClusterResPseudo } from './pseudo/cluster-res'
import { StatBetter } from '@/assets/data'

export interface FiltersCreationContext {
  readonly item: ParsedItem
  readonly searchInRange: number
  filters: StatFilter[]
  groups: FilterGroup[]
  statsByType: StatCalculated[]
  /** woke: local mods folded into a property total (Energy Shield, Physical DPS...). */
  inTotal?: StatCalculated[]
}

export function createExactStatFilters (
  item: ParsedItem,
  statsByType: StatCalculated[],
  opts: { searchStatRange: number, mode?: 'props' | 'bulk' }
): StatFilter[] {
  if (
    item.info.area?.blighted ||
    item.category === ItemCategory.Invitation
  ) return []

  const keepByType = [ModifierType.Pseudo, ModifierType.Fractured, ModifierType.Enchant, ModifierType.Necropolis, ModifierType.Imbued]

  if (
    !item.influences.length &&
    !item.isFractured &&
    item.category !== ItemCategory.Tincture &&
    item.category !== ItemCategory.Idol &&
    item.category !== ItemCategory.Chart
  ) {
    keepByType.push(ModifierType.Implicit)
  }

  if (item.rarity === ItemRarity.Magic && (
    item.category !== ItemCategory.ClusterJewel &&
    item.category !== ItemCategory.Map &&
    item.category !== ItemCategory.HeistContract &&
    item.category !== ItemCategory.HeistBlueprint &&
    item.category !== ItemCategory.Chart &&
    item.category !== ItemCategory.Sentinel
  )) {
    keepByType.push(ModifierType.Explicit)
  } else if (item.rarity === ItemRarity.Rare && item.category === ItemCategory.Idol) {
    keepByType.push(ModifierType.Explicit)
  }

  if (item.category === ItemCategory.Flask) {
    keepByType.push(ModifierType.Crafted)
  }

  const ctx: FiltersCreationContext = {
    item,
    searchInRange: (opts.mode !== 'props')
      ? Math.min(2, opts.searchStatRange)
      : opts.searchStatRange,
    filters: [],
    groups: [],
    statsByType: statsByType.filter(calc => keepByType.includes(calc.type))
  }

  filterBasePercentile(ctx)
  filterMemoryStrands(ctx)
  mapProps(opts.mode === 'bulk', ctx)
  chartProps(opts.mode === 'bulk', ctx)
  valdoBadMods(ctx)

  ctx.filters.push(
    ...ctx.statsByType.map(mod => calculatedStatToFilter(mod, ctx.searchInRange, item))
  )

  if (item.info.refName === 'Chronicle of Atzoatl') {
    applyAtzoatlRules(ctx.filters)
    return ctx.filters
  }
  if (item.info.refName === 'Mirrored Tablet') {
    applyMirroredTabletRules(ctx.filters)
    return ctx.filters
  }

  for (const filter of ctx.filters) {
    if (filter.not) continue

    filter.hidden = undefined

    if (filter.tag === FilterTag.Explicit) {
      filter.disabled = !filter.sources.some(source =>
        source.modifier.info.tier != null &&
        source.modifier.info.tier <= 2
      )
    } else if (filter.tag !== FilterTag.Property && filter.tag !== FilterTag.Pseudo) {
      filter.disabled = false
    }

    if (filter.statRef === '# uses remaining') {
      filter.roll!.min = filter.roll!.value
      filter.roll!.default.min = filter.roll!.value
      filter.roll!.default.max = filter.roll!.value
    }
  }

  if (item.category === ItemCategory.ClusterJewel) {
    applyClusterJewelRules(ctx.filters, true)
  } if (
    item.category === ItemCategory.HeistContract ||
    item.category === ItemCategory.HeistBlueprint
  ) {
    applyHeistRules(ctx)
  } else if (item.category === ItemCategory.Flask) {
    applyFlaskRules(ctx.filters)
    applyFlaskHybridMod(ctx)
  } else if (
    item.category === ItemCategory.MemoryLine ||
    item.category === ItemCategory.SanctumRelic ||
    item.category === ItemCategory.Charm
  ) {
    enableAllFilters(ctx.filters)
  } else if (item.category === ItemCategory.Idol) {
    enableGoodRolledFilters(ctx.filters, 0.66)
  }

  return ctx.filters
}

export function initUiModFilters (
  item: ParsedItem,
  opts: {
    searchStatRange: number
  }
): FilterOrGroup[] {
  const ctx: FiltersCreationContext = {
    item,
    filters: [],
    groups: [],
    searchInRange: (item.rarity === ItemRarity.Normal) ? 100 : opts.searchStatRange,
    statsByType: item.statsByType.map(calc => {
      if (calc.type === ModifierType.Fractured && calc.stat.trade.ids[ModifierType.Explicit]) {
        return { ...calc, type: ModifierType.Explicit }
      } else {
        return calc
      }
    })
  }

  filterEquipmentProps(ctx)
  if (item.rarity === ItemRarity.Unique) {
    filterBasePercentile(ctx)
  }
  filterMemoryStrands(ctx, 'hide_memory_strands')
  if (item.info.refName !== 'Split Personality') {
    filterPseudo(ctx)
  }
  if (item.uniqueBase?.refName === 'Timeless Jewel') {
    filterTimelessJewelKeystones(ctx)
  }

  if (!item.isCorrupted && !item.isMirrored) {
    ctx.statsByType = ctx.statsByType.filter(mod => mod.type !== ModifierType.Fractured)
    ctx.statsByType.push(...item.statsByType.filter(mod => mod.type === ModifierType.Fractured))
  }

  if (item.isVeiled) {
    ctx.statsByType = ctx.statsByType.filter(mod => mod.type !== ModifierType.Veiled)
  }

  ctx.filters.push(
    ...ctx.statsByType.map(mod => calculatedStatToFilter(mod, ctx.searchInRange, item))
  )

  if (item.isVeiled) {
    ctx.filters.forEach(filter => { filter.disabled = true })
  }

  finalFilterTweaks(ctx)
  addInTotalMods(ctx)

  return [...ctx.filters, ...ctx.groups]
}

// woke: the local mods a property total is made of (+57 to maximum Energy Shield,
// 110% increased Energy Shield...) come back as unticked rows, placed by where
// their mod sits on the item, so PoE mode reads like the game's tooltip. Added
// after the auto-ticking so nothing picks them; Standard keeps them with the
// hidden rows (FiltersBlock).
function addInTotalMods (ctx: FiltersCreationContext) {
  if (!ctx.inTotal?.length) return
  const { item } = ctx
  const modAt = new Map(item.newMods.map((mod, i) => [mod, i]))
  // A row's place on the item: its first mod's. Rows with no mod (properties) have none.
  const placeOf = (sources: StatFilter['sources']) => {
    let at = Infinity
    for (const s of sources) at = Math.min(at, modAt.get(s.modifier) ?? Infinity)
    return at
  }
  for (const calc of ctx.inTotal) {
    // An uncorrupted fractured mod also comes back as a hidden Fractured row
    // made from the same mod; this row replaces it, so the mod is listed once.
    const twin = ctx.filters.findIndex(f => f.sources === calc.sources)
    if (twin >= 0) ctx.filters.splice(twin, 1)
    const filter = calculatedStatToFilter(calc, ctx.searchInRange, item)
    filter.disabled = true
    filter.hidden = undefined
    filter.inTotal = true
    const mine = placeOf(calc.sources)
    const next = ctx.filters.findIndex(f => {
      if (f.tag === FilterTag.Property) return false
      const at = placeOf(f.sources)
      return at !== Infinity && at > mine
    })
    if (next < 0) ctx.filters.push(filter)
    else ctx.filters.splice(next, 0, filter)
  }
}

export function calculatedStatToFilter (
  calc: StatCalculated,
  percent: number,
  item: ParsedItem
): StatFilter {
  const { stat, sources, type } = calc
  let filter: StatFilter

  if (stat.trade.option) {
    filter = {
      tradeId: stat.trade.ids[type],
      statRef: stat.ref,
      text: sources[0].stat.translation.string,
      tag: (type === ModifierType.Enchant)
        ? FilterTag.Enchant
        : FilterTag.Variant,
      sources: sources,
      option: {
        value: sources[0].contributes!.value
      },
      disabled: false
    }
  }

  const roll = statSourcesTotal(
    calc.sources,
    (item.info.refName === 'Mirrored Tablet') ? 'max' : 'sum'
  )
  const translation = translateStatWithRoll(calc, roll)

  filter ??= {
    tradeId: stat.trade.ids[type],
    statRef: stat.ref,
    text: translation.string,
    tag: type,
    oils: decodeOils(calc),
    sources: sources,
    roll: undefined,
    disabled: true
  }

  if (calc.stat.better === StatBetter.NotComparable) {
    if (type !== ModifierType.Enchant) {
      filter.tag = FilterTag.Variant
    }
    if (!filter.oils) {
      filter.disabled = false
    }
  }

  if (
    type === ModifierType.Implicit ||
    type === ModifierType.Explicit
  ) {
    if (type === ModifierType.Explicit && item.info.unique) {
      if (item.info.unique.fixedStats) {
        const fixedStats = item.info.unique.fixedStats
        if (!fixedStats.includes(filter.statRef)) {
          filter.tag = FilterTag.Variant
        }
      } else if (sources.some(s =>
        s.modifier.info.generation === 'prefix' ||
        s.modifier.info.generation === 'suffix'
      )) {
        // recognized unveiled mods are overridden below, this is kept as fallback
        filter.tag = FilterTag.Variant
      }
    }

    const mechanic = sources.find(s => s.modifier.info.mechanic != null)?.modifier.info.mechanic
    if (mechanic) {
      filter.tag = mechanic
    }
  }

  if (roll && !filter.option) {
    if (item.rarity === ItemRarity.Magic && (
      item.isUnmodifiable || item.isCorrupted || item.isMirrored
    )) {
      percent = 0
    } else if (
      item.rarity === ItemRarity.Unique ||
      (item.rarity === ItemRarity.Magic && item.category === ItemCategory.Jewel) ||
      calc.sources.some(({ modifier }) => modifier.info.tier === 1 && modifier.info.type === ModifierType.Fractured)
    ) {
      const perfectRoll = (
        (calc.stat.better === StatBetter.PositiveRoll && roll.value >= roll.max) ||
        (calc.stat.better === StatBetter.NegativeRoll && roll.value <= roll.min)
      )
      if (perfectRoll) {
        percent = 0
      }
    }

    let goodness: number | undefined
    if (calc.stat.better !== StatBetter.NotComparable) {
      if (roll.min === roll.max) {
        goodness = 1
      } else {
        goodness = (roll.value - roll.min) / (roll.max - roll.min)
        if (calc.stat.better === StatBetter.NegativeRoll) {
          goodness = 1 - goodness
        }
      }
    }

    const dp =
    calc.stat.dp ||
    calc.sources.some(s => s.stat.stat.ref === calc.stat.ref && s.stat.roll?.dp)

    // woke: a catalyst scales the tier, but the slider spans what the trade site holds,
    // so it runs from the uncatalysed roll to this item's catalysed one: a Q20 belt with
    // a (20-25) mod shows 20 to 30, not 24 to 30.
    const reach = rollWithoutCatalyst(calc.sources, (item.info.refName === 'Mirrored Tablet') ? 'max' : 'sum')
    const filterBounds = {
      min: percentRoll(Math.min(roll.min, reach?.min ?? roll.min), -0, Math.floor, dp),
      max: percentRoll(Math.max(roll.max, reach?.max ?? roll.max), +0, Math.ceil, dp)
    }

    const filterDefault = (calc.stat.better === StatBetter.NotComparable)
      ? { min: roll.value, max: roll.value }
      : (item.rarity === ItemRarity.Unique)
          ? {
              min: percentRollDelta(roll.value, (roll.max - roll.min), -percent, Math.floor, dp),
              max: percentRollDelta(roll.value, (roll.max - roll.min), +percent, Math.ceil, dp)
            }
          : {
              min: percentRoll(roll.value, -percent, Math.floor, dp),
              max: percentRoll(roll.value, +percent, Math.ceil, dp)
            }
    filterDefault.min = Math.max(filterDefault.min, filterBounds.min)
    filterDefault.max = Math.min(filterDefault.max, filterBounds.max)

    const plain = (reach && (reach.min > roll.min || reach.max < roll.max))
      ? { min: percentRoll(reach.min, -0, Math.floor, dp), max: percentRoll(reach.max, +0, Math.ceil, dp) }
      : undefined

    filter.roll = {
      value: roundRoll(roll.value, dp),
      min: undefined,
      max: undefined,
      default: filterDefault,
      bounds: (roll.min !== roll.max && calc.stat.better !== StatBetter.NotComparable)
        ? filterBounds
        : undefined,
      plain: (roll.min !== roll.max && calc.stat.better !== StatBetter.NotComparable) ? plain : undefined,
      dp: dp,
      isNegated: false,
      tradeInvert: calc.stat.trade.inverted,
      goodness
    }

    filterFillMinMax(filter.roll, calc.stat.better)

    if (translation.negate) {
      filterAdjustmentForNegate(filter.roll)
    }

    filter.roll.better = (calc.stat.better === StatBetter.NotComparable)
      ? 0
      : (typeof filter.roll.min === 'number') ? 1 : -1
  }

  return filter
}

/**
 * woke: the stat's roll with no catalyst quality, or undefined if no catalyst raised it.
 * Sums like statSourcesTotal, from each source's own tier instead of the scaled one.
 */
export function rollWithoutCatalyst (
  sources: StatSource[],
  mode: 'sum' | 'max' = 'sum'
): StatRoll | undefined {
  if (!sources.some(s => s.contributes && s.modifier.info.rollIncr && s.stat.roll && !s.stat.roll.unscalable)) {
    return undefined
  }
  return statSourcesTotal(sources.map(s => {
    const raw = s.stat.roll
    const scaled = applyIncr(s.modifier.info, s.stat)?.roll
    if (!s.contributes || !raw || !scaled) return s
    // Pseudo totals multiply a source (all resistances count three times): keep that.
    const multi = (scaled.max !== 0)
      ? s.contributes.max / scaled.max
      : (scaled.min !== 0) ? s.contributes.min / scaled.min : 1
    return { ...s, contributes: { value: raw.value * multi, min: raw.min * multi, max: raw.max * multi } }
  }), mode)
}

const ABYSS_SOCKETS = 'Has # Abyssal Sockets'
// Uniques whose variants differ only in abyssal socket count (unique tips data).
export const VARIABLE_ABYSS_SOCKETS = new Set([
  'Bubonic Trail',
  'Lightpoacher',
  'Tombfist',
  'Shroud of the Lightless',
  'Command of the Pit',
  'Hale Negator'
])

function hideNotVariableStat (filter: StatFilter, item: ParsedItem) {
  if (item.rarity !== ItemRarity.Unique || (
    filter.tag !== FilterTag.Explicit &&
    filter.tag !== FilterTag.Property
  )) return

  // woke: these uniques drop with different socket counts, and the game text shows no range,
  // so the count looks fixed. It sets the price, so search the exact count.
  if (filter.roll && filter.statRef === ABYSS_SOCKETS && VARIABLE_ABYSS_SOCKETS.has(item.info.refName)) {
    filter.roll.min = filter.roll.value
    filter.roll.max = filter.roll.value
    filter.disabled = false
    return
  }

  // always show stat increased by Catalyst
  if (item.quality && JEWELLERY.has(item.category!) &&
    filter.sources.some(source =>
      source.modifier.info.rollIncr &&
      source.stat.roll && !source.stat.roll.unscalable)
  ) return

  // always show scalable stat on corrupted item
  const hasRollAndScalable = filter.sources.some(source => source.stat.roll && !source.stat.roll.unscalable)
  if (item.isCorrupted && hasRollAndScalable) {
    const isVvoCorrupted = item.newMods.some(mod => mod.stats.some(stat => stat.roll?.generation === 'volatile'))
    if (!isVvoCorrupted) {
      // some stat not being reduced compared to other VVO corrupted items can be important
      filter.disabled = false
    }
    return
  }

  if (!filter.roll) {
    filter.hidden = 'filters.hide_const_roll'
    filter.disabled = true
  } else if (!filter.roll.bounds) {
    filter.roll.min = undefined
    filter.roll.max = undefined
    filter.hidden = 'filters.hide_const_roll'
    filter.disabled = true
  } else if (
    BASE_PCTL_AFFECTED_IDS.includes(filter.tradeId[0]) &&
    filter.sources.every(source => source.stat.roll?.min === source.stat.roll?.max) &&
    getPropQuality(item) < 21
  ) {
    filter.roll.min = undefined
    filter.roll.max = undefined
    filter.hidden = 'hide_variable_by_base_percentile_only'
    filter.disabled = true
  }

  if (item.isFoulborn && filter.tag === FilterTag.Explicit) {
    // some mod not being replaced with foulborn one can be important
    filter.disabled = false
  }
}

function filterFillMinMax (
  roll: NonNullable<StatFilter['roll']>,
  better: StatBetter
) {
  switch (better) {
    case StatBetter.PositiveRoll:
      roll.min = roll.default.min
      break
    case StatBetter.NegativeRoll:
      roll.max = roll.default.max
      break
    case StatBetter.NotComparable:
      roll.min = roll.default.min
      roll.max = roll.default.max
      break
  }
}

function filterAdjustmentForNegate (
  roll: NonNullable<StatFilter['roll']>
) {
  roll.tradeInvert = !roll.tradeInvert
  roll.isNegated = true
  const swap = structuredClone(roll)

  if (swap.bounds && roll.bounds) {
    roll.bounds.min = -1 * swap.bounds.max
    roll.bounds.max = -1 * swap.bounds.min
  }
  if (swap.plain && roll.plain) {
    roll.plain.min = -1 * swap.plain.max
    roll.plain.max = -1 * swap.plain.min
  }

  roll.default.min = -1 * swap.default.max
  roll.default.max = -1 * swap.default.min

  roll.value = -1 * swap.value
  roll.min = (typeof swap.max === 'number')
    ? -1 * swap.max
    : undefined
  roll.max = (typeof swap.min === 'number')
    ? -1 * swap.min
    : undefined
}

function finalFilterTweaks (ctx: FiltersCreationContext) {
  const { item } = ctx

  if (item.category === ItemCategory.ClusterJewel && item.rarity !== ItemRarity.Unique) {
    applyClusterJewelRules(ctx.filters, false)
    addClusterResPseudo(ctx.filters, item, ctx.searchInRange)
  } else if (item.category === ItemCategory.Flask) {
    applyFlaskRules(ctx.filters)
    applyFlaskHybridMod(ctx)
  }

  const hasEmptyModifier = showHasEmptyModifier(ctx)
  if (hasEmptyModifier !== false) {
    ctx.filters.push({
      tradeId: ['item.has_empty_modifier'],
      text: '1 Empty or Crafted Modifier',
      statRef: '1 Empty or Crafted Modifier',
      disabled: true,
      hidden: 'filters.hide_empty_mod',
      tag: FilterTag.Pseudo,
      sources: [],
      option: {
        value: hasEmptyModifier
      }
    })
  }

  if (item.category === ItemCategory.Amulet || item.category === ItemCategory.Ring) {
    applyAnointmentRules(ctx.filters, ctx.item)
  }

  for (const filter of ctx.filters) {
    hideNotVariableStat(filter, item)

    if (filter.tag === FilterTag.Enchant) {
      if (QUALITY_CHANGING_ENCHANT.includes(filter.statRef)) {
        filter.hidden = 'hide_enchant_meta_stat'
      }
    } else if (filter.tag === FilterTag.Fractured) {
      const mod = ctx.item.statsByType.find(mod => mod.stat.ref === filter.statRef)!
      if (mod.stat.trade.ids[ModifierType.Explicit]) {
        // hide only if fractured mod has corresponding explicit variant
        filter.hidden = 'filters.hide_for_crafting'
      }
    } else if (filter.sources[0]?.stat.stat.jewelleryQuality) {
      filter.hidden = 'hide_jewellery_quality'
    } else if (filter.tag === FilterTag.Implicit) {
      if (item.rarity === ItemRarity.Unique && !item.isCorrupted && item.category !== ItemCategory.Jewel) {
        // hide not Corrupted, Vestigial implicits etc., that were not consumed by pseudo stats
        filter.hidden = 'hide_unique_base_implicit'
        filter.disabled = true
      }
    } else if (
      filter.tag === FilterTag.Foulborn ||
      filter.tag === FilterTag.Vestigial ||
      filter.tag === FilterTag.Variant
    ) {
      filter.disabled = false
    }
  }

  tickTopTierMods(ctx.filters, item)

  const basePercentile = ctx.filters.find(fitler => fitler.tradeId[0] === 'item.base_percentile')
  if (basePercentile && item.rarity === ItemRarity.Unique) {
    const hasVisibleArmourProp = ctx.filters.some(filter =>
      BASE_PCTL_AFFECTED_IDS.includes(filter.tradeId[0]) &&
      !filter.hidden)
    if (hasVisibleArmourProp) {
      basePercentile.hidden = 'hide_redundant'
      basePercentile.disabled = true
    }
  }

  if (item.rarity === ItemRarity.Unique) {
    tickUniqueStandouts(ctx.filters, item)
    // woke: a good armour base rarely sets a unique's price, and ticking it hides the cheap ones.
    if (basePercentile) basePercentile.disabled = true
  }
}

// woke: most of a unique's rolls barely move its price, and ticking them all hides the
// cheap copies. A unique starts from its name alone, plus what sets this copy apart:
// corruption implicits, foulborn, vestigial and variant mods (left as set above), and
// rolls near the top of their range.
export const UNIQUE_HIGH_ROLL = 0.9
const UNIQUE_ROLL_TAGS = new Set<FilterTag>([
  FilterTag.Explicit,
  FilterTag.Implicit,
  FilterTag.Pseudo,
  FilterTag.Property
])
const UNIQUE_KEEP_IDS = new Set(['item.memory_strands', 'item.base_percentile'])

const UNIQUE_STANDOUT_MECHANICS = new Set<ModifierMechanic | undefined>([
  ModifierMechanic.Corruption,
  ModifierMechanic.Foulborn,
  ModifierMechanic.Vestigial
])

function tickUniqueStandouts (filters: StatFilter[], item: ParsedItem) {
  for (const filter of filters) {
    if (filter.hidden) continue
    // A total (all resistances) can swallow a corruption or foulborn mod; it carries it.
    if (filter.tag === FilterTag.Corruption ||
      filter.sources.some(s => UNIQUE_STANDOUT_MECHANICS.has(s.modifier.info.mechanic))) {
      filter.disabled = false
      continue
    }
    if (!UNIQUE_ROLL_TAGS.has(filter.tag)) continue
    // Which mod the foulborn one replaced sets the price, so its other mods stay as set.
    if (item.isFoulborn && filter.tag === FilterTag.Explicit) continue
    if (UNIQUE_KEEP_IDS.has(filter.tradeId[0])) continue
    if (filter.statRef === ABYSS_SOCKETS && VARIABLE_ABYSS_SOCKETS.has(item.info.refName)) continue
    const goodness = filter.roll?.bounds ? filter.roll.goodness : undefined
    filter.disabled = !(goodness != null && goodness >= UNIQUE_HIGH_ROLL)
  }
}

// woke: a rare's best mods are what sets its price, so they start ticked.
const MAX_TICKED_ON_RARE = 4

const CLUSTER_NOTABLE = '1 Added Passive Skill is '

function isTopTierSource (filter: StatFilter, source: StatFilter['sources'][number]) {
  const { type, tier } = source.modifier.info
  if (!(type === ModifierType.Explicit || type === ModifierType.Fractured) || tier == null || tier > 2) return false
  // A hybrid's tier is about its main stat, not the one along for the ride.
  const { stats } = source.modifier
  if (stats.length > 1 && stats[0].stat.ref !== source.stat.stat.ref) return false
  // Strength in a life total says nothing about the life.
  return !(/Life|Mana/.test(filter.statRef) && /Strength|Intelligence|Attributes/.test(source.stat.stat.ref))
}

export function isTopTierFilter (filter: StatFilter, item: ParsedItem): boolean {
  if (filter.tag === FilterTag.Property) return false
  // A cluster jewel's worth is in its notables; its other rolls are filler.
  if (item.category === ItemCategory.ClusterJewel) return filter.statRef.startsWith(CLUSTER_NOTABLE)
  return filter.sources.some(source => isTopTierSource(filter, source))
}

function bestTier (filter: StatFilter): number {
  return Math.min(9, ...filter.sources.filter(source => isTopTierSource(filter, source)).map(s => s.modifier.info.tier!))
}

function tickTopTierMods (filters: StatFilter[], item: ParsedItem) {
  if (item.rarity !== ItemRarity.Rare || item.isVeiled) return

  filters
    .filter(f => !f.hidden && isTopTierFilter(f, item))
    .sort((a, b) => (bestTier(a) - bestTier(b)) || ((b.roll?.goodness ?? 1) - (a.roll?.goodness ?? 1)))
    .slice(0, MAX_TICKED_ON_RARE)
    .forEach(f => { f.disabled = false })

  // Default totals give way to top mods. Properties like DPS don't count.
  const ticked = filters.filter(f => !f.disabled && !f.hidden && f.tag !== FilterTag.Property)
  const extra = ticked.filter(f => f.tag === FilterTag.Pseudo && !isTopTierFilter(f, item))
  extra.slice(0, Math.max(ticked.length - MAX_TICKED_ON_RARE, 0)).forEach(f => { f.disabled = true })
}

function applyClusterJewelRules (filters: StatFilter[], exact: boolean) {
  for (const filter of filters) {
    if (filter.statRef === '# Added Passive Skills are Jewel Sockets') {
      filter.hidden = 'filters.hide_const_roll'
      filter.disabled = true
    }

    // https://www.poewiki.net/wiki/Cluster_Jewel#Optimal_passive_skill_amounts
    if (filter.statRef === 'Adds # Passive Skills') {
      filter.disabled = false

      // 4 is [_, 5]
      if (filter.roll!.value === 4) {
        filter.roll!.max = 5
      // 5 is [5, 5] (and [_, 5] for Rare jewel)
      } else if (filter.roll!.value === 5 && exact) {
        filter.roll!.min = filter.roll!.default.min
      // 3, 6, 10, 11, 12 are [n, _]
      } else if (
        filter.roll!.value === 3 ||
        filter.roll!.value === 6 ||
        filter.roll!.value === 10 ||
        filter.roll!.value === 11 ||
        filter.roll!.value === 12
      ) {
        filter.roll!.min = filter.roll!.default.min
        filter.roll!.max = undefined
      }
      // else 2, 5(Rare), 8, 9 are [_ , n]
    }
  }
}

function applyFlaskRules (filters: StatFilter[]) {
  const usedEnkindling = filters.find(filter => filter.statRef === 'Gains no Charges during Flask Effect')
  for (const filter of filters) {
    if (filter.tag === FilterTag.Enchant && !usedEnkindling) {
      filter.hidden = 'hide_harvest_and_instilling'
      filter.disabled = true
    }
  }
}

// TODO
// +1 Prefix Modifier allowed
// -1 Suffix Modifier allowed
function showHasEmptyModifier (ctx: FiltersCreationContext): ItemHasEmptyModifier | false {
  const { item } = ctx

  if (
    item.rarity !== ItemRarity.Rare ||
    item.isCorrupted ||
    item.isMirrored
  ) return false

  const randomMods = item.newMods.filter(mod =>
    mod.info.type === ModifierType.Explicit ||
    mod.info.type === ModifierType.Fractured ||
    mod.info.type === ModifierType.Veiled ||
    mod.info.type === ModifierType.Crafted)

  const craftedMod = randomMods.find(mod => mod.info.type === ModifierType.Crafted)

  if (
    (randomMods.length === 5 && !craftedMod) ||
    (randomMods.length === 6 && craftedMod)
  ) {
    let prefixes = randomMods.filter(mod => mod.info.generation === 'prefix').length
    let suffixes = randomMods.filter(mod => mod.info.generation === 'suffix').length

    if (craftedMod) {
      if (craftedMod.info.generation === 'prefix') {
        prefixes -= 1
      } else {
        suffixes -= 1
      }
    }

    if (prefixes === 2) return ItemHasEmptyModifier.Prefix
    if (suffixes === 2) return ItemHasEmptyModifier.Suffix
  }

  return false
}

function enableAllFilters (filters: StatFilter[]) {
  for (const filter of filters) {
    if (!filter.hidden) {
      filter.disabled = false
    }
  }
}

function enableGoodRolledFilters (filters: StatFilter[], abovePct: number) {
  for (const filter of filters) {
    if (filter.hidden) continue
    if (!filter.roll || filter.roll.goodness == null) {
      filter.disabled = false
      continue
    }

    if (filter.roll.goodness >= abovePct) {
      filter.disabled = false
    }
  }
}
