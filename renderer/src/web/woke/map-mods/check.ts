// Turns a parsed map/logbook into a verdict + juice score.
import { isModuleOn } from '../modules'
import { AppConfig } from '@/web/Config'
import { ItemCategory, ItemRarity } from '@/parser'
import type { ParsedItem } from '@/parser'
import { ModifierType } from '@/parser/modifiers'
import { prepareMapStat } from '@/web/map-check/prepare-map-stats'
import { heistRowOf } from './data'
import { juiceScore, modRatings, rateMods } from './rules'
import type { JuiceResult, MapVerdict, ModMode } from './rules'
import { MAP_MODS_TYPE, activeProfile, importAptOnce, initMapModsWidget } from './widget'
import { MIN_LABELS } from './regex'
import type { MinStat } from './regex'
import type { MapModsWidget } from './widget'

export function isMapLike (item: ParsedItem): boolean {
  const { category, rarity, info: { refName } } = item
  return (
    (category === ItemCategory.Map && rarity !== ItemRarity.Unique) ||
    category === ItemCategory.Invitation ||
    isHeistItem(item) ||
    category === ItemCategory.Chart ||
    refName === 'Expedition Logbook'
  )
}

function isHeistItem (item: ParsedItem): boolean {
  return item.category === ItemCategory.HeistContract || item.category === ItemCategory.HeistBlueprint
}

// A chart's implicit is its Voyage mod once charted, and until then this stat.
const VOYAGE_UNREVEALED = 'Voyage Modifier will be revealed once Charted'

// Which Map mods tab rates this item.
export function modeOfItem (item: ParsedItem): ModMode {
  if (isHeistItem(item)) return 'heist'
  return item.category === ItemCategory.Chart ? 'charts' : 'maps'
}

export interface MapCheckResult {
  mode: ModMode
  name: string
  sub: string
  verdict: MapVerdict
  // Null on heist items: nothing on them feeds the score.
  juice: JuiceResult | null
  props: Array<{ label: string, value: number }>
  unknown: string[]
  // Its mods are hidden, so the verdict means nothing yet.
  unidentified: boolean
  // The profile's minimums against this map's stats (maps tab only; empty
  // when none are set); null on anything but a map. `any`: one met minimum is enough.
  goals: { rows: RewardGoal[], any: boolean } | null
}

export interface RewardGoal {
  stat: MinStat
  label: string
  need: number
  value: number
  met: boolean
}

const GOAL_ORDER: MinStat[] = ['quantity', 'rarity', 'packSize', 'quality', 'currency', 'scarabs', 'maps', 'divCards']

// Each minimum the profile sets, with this map's value for it.
export function rewardGoals (item: ParsedItem, mins: Partial<Record<MinStat, number>>): RewardGoal[] {
  const value: Record<MinStat, number | undefined> = {
    quantity: item.areaAtlasDrops ?? item.areaItemQuantity,
    rarity: item.areaItemRarity,
    packSize: item.areaPackSize,
    quality: item.quality,
    currency: item.mapMoreCurrency,
    scarabs: item.mapMoreThreads,
    maps: item.mapMoreMaps,
    divCards: item.mapMoreDivCards
  }
  return GOAL_ORDER
    .filter(stat => (mins[stat] ?? 0) > 0)
    .map(stat => {
      const need = mins[stat]!
      const v = value[stat] ?? 0
      return { stat, label: MIN_LABELS[stat], need, value: v, met: v >= need }
    })
}

export function checkMap (item: ParsedItem, config: MapModsWidget): MapCheckResult {
  const profile = activeProfile(config)
  const isChart = item.category === ItemCategory.Chart
  const rated = (type: ModifierType) => type === ModifierType.Explicit || (isChart && type === ModifierType.Implicit)
  const calcs = item.statsByType
    .filter(calc => rated(calc.type) && calc.stat.ref !== VOYAGE_UNREVEALED)
  const stats = calcs.map(calc => prepareMapStat(calc))
  const mode = modeOfItem(item)
  const ratings = { ...modRatings(profile, mode) }
  // A mod with no number shows as its stat's first wording, which may not be
  // the one the map has ("Area contains a Mirage" reads as the older Empowered
  // Mirage line). A rating on any wording of the stat counts.
  stats.forEach(({ matcher }, i) => {
    if (ratings[matcher]) return
    const other = calcs[i].stat.matchers.find(m => ratings[m.string])
    if (other) ratings[matcher] = ratings[other.string]
  })
  if (mode === 'heist') {
    // A row rates both wordings of its mod.
    for (const { matcher } of stats) {
      const rating = ratings[heistRowOf(matcher) ?? matcher]
      if (rating) ratings[matcher] = rating
    }
  }
  const verdict = rateMods(stats, { ...profile, ratings })

  const juice = isHeistItem(item) ? null : juiceScore({
    quantity: item.areaAtlasDrops ?? item.areaItemQuantity,
    rarity: item.areaItemRarity,
    packSize: item.areaPackSize,
    currency: item.mapMoreCurrency,
    scarabs: item.mapMoreThreads,
    maps: item.mapMoreMaps,
    divCards: item.mapMoreDivCards,
    goodMods: verdict.good.length
  }, config.weights)

  const props: MapCheckResult['props'] = []
  const add = (label: string, value?: number) => { if (value) props.push({ label, value }) }
  add('Drops', item.areaAtlasDrops)
  add('Quant', item.areaItemQuantity)
  add('Rarity', item.areaItemRarity)
  add('Pack', item.areaPackSize)
  add('Currency', item.mapMoreCurrency)
  add('Threads', item.mapMoreThreads)
  add('Maps', item.mapMoreMaps)
  add('Div cards', item.mapMoreDivCards)

  const name = item.info.area?.blighted
    ? item.info.name
    : (item.mapArea?.name ?? item.info.name)
  const subParts: string[] = []
  if (item.mapTier) subParts.push(`T${item.mapTier}`)
  if (item.rarity === ItemRarity.Rare) subParts.push('Rare')
  if (item.rarity === ItemRarity.Magic) subParts.push('Magic')
  if (item.isCorrupted) subParts.push('Corrupted')
  subParts.push(`${stats.length} mods`)

  const unknown = item.unknownModifiers
    .filter(mod => rated(mod.type))
    .map(mod => mod.text)

  // Only maps carry these stats: invitations and logbooks get no rewards block.
  const goals = mode === 'maps' && item.category === ItemCategory.Map
    ? { rows: rewardGoals(item, profile.mins), any: !!profile.minsAny }
    : null

  return { mode, name, sub: subParts.join(' · '), verdict, juice, props, unknown, unidentified: item.isUnidentified, goals }
}

// A Safe verdict can't be trusted when a mod couldn't be read; hidden mods say nothing at all.
export function isUnsure (result: Pick<MapCheckResult, 'unidentified' | 'unknown' | 'verdict'>): boolean {
  return result.unidentified || (result.verdict.verdict === 'run' && result.unknown.length > 0)
}

// The checker's config, for the strip inside APT's own windows. Null when the
// widget hasn't been added from the overlay menu yet.
// The trade filter behind each number chip on the map strip (pseudo/maps.ts).
export const PROP_TRADE_ID: Record<string, string> = {
  Drops: 'item.map_atlas_drops',
  Quant: 'item.map_item_quantity',
  Rarity: 'item.map_item_rarity',
  Pack: 'item.map_pack_size'
}

export function findMapModsConfig (): MapModsWidget | null {
  // Switched off in Settings → Modules: no strip in price check / map check.
  if (!isModuleOn(AppConfig(), 'map-mods')) return null
  const w = AppConfig().widgets.find(w => w.wmType === MAP_MODS_TYPE) as MapModsWidget | undefined
  if (!w || w.wmFlags[0] === 'uninitialized' || !Array.isArray(w.profiles)) return null
  return w
}

// Alt+M works before the Map mods widget has been added (see
// wokeGlobalShortcuts). The first check then sets the widget up with the
// default profile, so ratings made from the verdict card are kept.
export function ensureMapModsConfig (): MapModsWidget | null {
  if (!isModuleOn(AppConfig(), 'map-mods')) return null
  const widgets = AppConfig().widgets
  let w = widgets.find(w => w.wmType === MAP_MODS_TYPE) as MapModsWidget | undefined
  if (!w) {
    w = {
      wmId: Math.max(0, ...widgets.map(_ => _.wmId)) + 1,
      wmType: MAP_MODS_TYPE,
      wmTitle: '',
      wmWants: 'hide',
      wmZorder: null,
      wmFlags: ['uninitialized']
    } as unknown as MapModsWidget
    widgets.push(w)
    w = widgets[widgets.length - 1] as MapModsWidget
  }
  if (w.wmFlags[0] === 'uninitialized' || !Array.isArray(w.profiles)) initMapModsWidget(w)
  importAptOnce(w)
  return w
}

// APT's item info window shows this for maps, invitations, logbooks, heist items
// and charts (null: not one of those, or the Map mods module is off).
export function wokeMapCheck (item: ParsedItem): { result: MapCheckResult, config: MapModsWidget } | null {
  if (!isMapLike(item)) return null
  const config = findMapModsConfig()
  return config ? { result: checkMap(item, config), config } : null
}
