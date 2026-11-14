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
    quantity: item.areaItemQuantity,
    rarity: item.areaItemRarity,
    packSize: item.areaPackSize,
    currency: item.mapMoreCurrency,
    scarabs: item.mapMoreScarabs,
    maps: item.mapMoreMaps,
    divCards: item.mapMoreDivCards,
    goodMods: verdict.good.length
  }, config.weights)

  const props: MapCheckResult['props'] = []
  const add = (label: string, value?: number) => { if (value) props.push({ label, value }) }
  add('Quant', item.areaItemQuantity)
  add('Rarity', item.areaItemRarity)
  add('Pack', item.areaPackSize)
  add('Currency', item.mapMoreCurrency)
  add('Scarabs', item.mapMoreScarabs)
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

  return { mode, name, sub: subParts.join(' · '), verdict, juice, props, unknown, unidentified: item.isUnidentified }
}

// A RUN can't be trusted when a mod couldn't be read; hidden mods say nothing at all.
export function isUnsure (result: Pick<MapCheckResult, 'unidentified' | 'unknown' | 'verdict'>): boolean {
  return result.unidentified || (result.verdict.verdict === 'run' && result.unknown.length > 0)
}

// The checker's config, for the strip inside APT's own windows. Null when the
// widget hasn't been added from the overlay menu yet.
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
