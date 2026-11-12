// Module switchboard: which woke modules (and a few APT features) are on.
//
// A module that is off has its widgets kept in config but not mounted, its
// hotkeys left unregistered, and it is hidden from the widget menu. Shared
// services (Client.txt reader, poe.ninja polling) only run while an enabled
// module with a placed widget needs them.
//
// Kept free of Vue component and widget imports: Config.ts imports this file.
import { BOOKMARKS_TARGET } from './item-lookup/lookup'
import type { HarvestSwapConfig } from './harvest-swap/families'
import type { DockConfig } from './dock/dock'
import type { ShortcutAction } from '@ipc/types'

export type ModuleGroup = 'economy' | 'mapping' | 'campaign' | 'builds' | 'apt'
// poll: keeps poe.ninja prices refreshing to build history (every 10 min).
// prices: reads the latest saved prices, no extra network.
// log: needs Client.txt lines.
// ocr: reads the screen with the OCR worker.
// account: the account name in Settings, shown as a prompt while it's blank.
export type ModuleNeed = 'poll' | 'prices' | 'log' | 'ocr' | 'hotkeys' | 'network' | 'account'

export interface ModuleDef {
  id: string
  name: string
  description: string
  group: ModuleGroup
  widgetTypes: string[]
  // One icon everywhere (rail, dock, settings): Font Awesome, plus game
  // art when there is some (resolved by moduleIcon in ui/game-icons.ts).
  icon: ModuleIcon
  needs: ModuleNeed[]
}

export interface ModuleIcon {
  fa: string
  // Game art: a bundled image (heist rewards and quest items the item data
  // lacks, in /images/art), a league mechanic's icon, bundled currency, or an
  // item by name.
  src?: string
  mechanic?: string
  currency?: string
  item?: string
}

export const MODULE_GROUPS: Array<{ id: ModuleGroup, label: string }> = [
  { id: 'economy', label: 'Economy' },
  { id: 'mapping', label: 'Mapping' },
  { id: 'campaign', label: 'Campaign & lab' },
  { id: 'builds', label: 'Builds & trade' },
  { id: 'apt', label: 'Price check (Awakened PoE Trade)' }
]

export const MODULES: ModuleDef[] = [
  { id: 'market', name: 'Market', description: 'Movers and watchlist from poe.ninja', group: 'economy', widgetTypes: ['woke-market-tracker'], icon: { fa: 'fas fa-chart-line', currency: 'divine' }, needs: ['poll'] },
  { id: 'league-invest', name: 'Investments', description: 'League-start buys ranked from past leagues', group: 'economy', widgetTypes: ['woke-league-invest'], icon: { fa: 'fas fa-seedling', item: 'Mirror Shard' }, needs: ['poll', 'network'] },
  { id: 'lab-gems', name: 'Lab gems', description: 'Divine Font gem values by colour', group: 'economy', widgetTypes: ['woke-lab-gems'], icon: { fa: 'fas fa-gem', item: "Gemcutter's Prism" }, needs: ['poll'] },
  { id: 'scarab-flip', name: 'Flips', description: 'Vendor recipes and Harvest rerolls worth doing: scarabs, catalysts, delirium orbs and more', group: 'economy', widgetTypes: ['woke-scarab-flip'], icon: { fa: 'fas fa-recycle', item: 'Harvest Scarab' }, needs: ['poll', 'network'] },
  { id: 'disenchant', name: 'Disenchant', description: 'Uniques with the most Thaumaturgic Dust per chaos, to buy and disenchant', group: 'economy', widgetTypes: ['woke-disenchant'], icon: { fa: 'fas fa-hammer', currency: 'dust' }, needs: ['prices'] },
  { id: 'wealthy-exile', name: 'Wealthy Exile', description: 'The Wealthy Exile net worth site in an overlay window', group: 'economy', widgetTypes: ['woke-wealthy-exile'], icon: { fa: 'fas fa-wallet', src: '/images/art/crested-golden-idol.png' }, needs: ['hotkeys', 'network'] },
  { id: 'farming', name: 'Farming', description: 'Session profit per hour', group: 'economy', widgetTypes: ['woke-farming'], icon: { fa: 'fas fa-coins', currency: 'chaos' }, needs: ['log', 'prices', 'hotkeys'] },
  { id: 'drop-counter', name: 'Drop counter', description: 'A tally of the drops you choose, and maps run', group: 'economy', widgetTypes: ['woke-drop-counter'], icon: { fa: 'fas fa-hashtag', src: '/images/art/o-eternal.png' }, needs: ['log', 'prices', 'hotkeys'] },
  { id: 'stacked-decks', name: 'Stacked decks', description: 'Cards from the Stacked Decks you open: profit, big hits and luck', group: 'economy', widgetTypes: ['woke-stacked-decks'], icon: { fa: 'fas fa-layer-group', item: 'Stacked Deck' }, needs: ['log', 'prices'] },
  { id: 'session-analytics', name: 'Session analytics', description: 'Profit per map, strategy and hour over time', group: 'economy', widgetTypes: ['woke-session-analytics'], icon: { fa: 'fas fa-chart-bar', item: 'Eternal Orb' }, needs: ['prices'] },
  { id: 'boss-runs', name: 'Boss runs', description: 'Profit per boss kill', group: 'economy', widgetTypes: ['woke-boss-runs'], icon: { fa: 'fas fa-skull', mechanic: 'maven' }, needs: ['log', 'prices'] },

  { id: 'map-mods', name: 'Map mods', description: 'Danger strip on price check and map regex', group: 'mapping', widgetTypes: ['woke-map-mods'], icon: { fa: 'fas fa-map', item: 'Nightmare Map' }, needs: ['hotkeys'] },
  { id: 'map-scan', name: 'Map scan', description: 'Reads map tooltips on screen', group: 'mapping', widgetTypes: ['woke-map-scan'], icon: { fa: 'fas fa-crosshairs', mechanic: 'map' }, needs: ['ocr', 'hotkeys'] },
  { id: 'death-recap', name: 'Death recap', description: 'Where you died, and the mods of maps you checked', group: 'mapping', widgetTypes: ['woke-death-recap'], icon: { fa: 'fas fa-skull', item: 'Portal Scroll' }, needs: ['log'] },
  { id: 'essence-scan', name: 'Essence scan', description: 'Reads essence monoliths and flags MEDS', group: 'mapping', widgetTypes: ['woke-essence-scan'], icon: { fa: 'fas fa-flask', mechanic: 'essence' }, needs: ['ocr', 'hotkeys', 'prices'] },
  { id: 'loot-filter', name: 'Loot filter editor', description: 'Edit the NeverSink rule for a sampled item', group: 'mapping', widgetTypes: ['woke-loot-filter'], icon: { fa: 'fas fa-filter', item: 'Orb of Scouring' }, needs: ['log', 'hotkeys'] },
  { id: 'atlas', name: 'Atlas strategies', description: 'Tree, scarabs and regex per strategy', group: 'mapping', widgetTypes: ['woke-atlas-strategies'], icon: { fa: 'fas fa-globe', item: 'Cartography Scarab of Risk' }, needs: ['network', 'prices'] },
  { id: 'mechanics', name: 'League mechanics', description: 'Prices and picks for each league mechanic', group: 'mapping', widgetTypes: ['woke-mechanics'], icon: { fa: 'fas fa-puzzle-piece', mechanic: 'incursion' }, needs: ['log', 'prices'] },

  { id: 'campaign', name: 'Campaign', description: 'Next steps for the act you are in', group: 'campaign', widgetTypes: ['woke-campaign'], icon: { fa: 'fas fa-route', src: '/images/art/admiral-darnaws-papers.png' }, needs: ['log'] },
  { id: 'run-timer', name: 'Run timer', description: 'Act splits and personal bests', group: 'campaign', widgetTypes: ['woke-run-timer'], icon: { fa: 'fas fa-stopwatch' }, needs: ['log'] },
  { id: 'lab', name: 'Lab layouts', description: "Today's poelab layout and reset countdown", group: 'campaign', widgetTypes: ['woke-lab'], icon: { fa: 'fas fa-dungeon', mechanic: 'lab' }, needs: ['hotkeys'] },
  { id: 'challenges', name: 'Challenge guide', description: 'League challenge guide with your progress', group: 'campaign', widgetTypes: ['woke-challenges'], icon: { fa: 'fas fa-trophy', src: '/images/art/ez-myrae-tome.png' }, needs: ['hotkeys', 'network', 'account'] },

  { id: 'pob-builds', name: 'PoB builds', description: 'Your Path of Building folder', group: 'builds', widgetTypes: ['woke-pob-builds'], icon: { fa: 'fas fa-diagram-project', item: 'Enlighten Support' }, needs: [] },
  { id: 'trade-searches', name: 'Trade searches', description: 'Saved trade site searches', group: 'builds', widgetTypes: ['woke-trade-searches'], icon: { fa: 'fas fa-search-dollar', currency: 'exalted' }, needs: ['hotkeys'] },
  { id: 'trade', name: 'Trades', description: 'Trade whispers, quick replies and a sales log', group: 'builds', widgetTypes: ['woke-trade'], icon: { fa: 'fas fa-handshake', src: '/images/art/bust-of-emperor-caspiro.png' }, needs: ['log', 'hotkeys', 'prices'] },
  { id: 'regex-library', name: 'Regex library', description: 'Saved stash search strings', group: 'builds', widgetTypes: ['woke-regex-library'], icon: { fa: 'fas fa-search', mechanic: 'stash' }, needs: ['hotkeys'] },

  // APT features: only their hotkeys can be switched off.
  { id: 'apt-price-check', name: 'Price check hotkeys', description: 'Check an item under the cursor', group: 'apt', widgetTypes: [], icon: { fa: 'fas fa-coins', currency: 'chaos' }, needs: ['hotkeys'] },
  { id: 'apt-item-info', name: 'Item info hotkeys', description: 'Item info, wiki, poedb, Craft of Exile, similar items', group: 'apt', widgetTypes: [], icon: { fa: 'fas fa-info-circle', item: 'Scroll of Wisdom' }, needs: ['hotkeys'] }
]

export interface Preset {
  id: string
  label: string
  // Woke modules switched on; APT features are left as they are.
  on: string[] | 'all'
}

export const PRESETS: Preset[] = [
  { id: 'everything', label: 'Everything', on: 'all' },
  { id: 'mapper', label: 'Mapper', on: ['market', 'farming', 'drop-counter', 'stacked-decks', 'session-analytics', 'boss-runs', 'map-mods', 'map-scan', 'death-recap', 'essence-scan', 'loot-filter', 'atlas', 'mechanics', 'trade-searches', 'trade', 'regex-library'] },
  { id: 'leveling', label: 'Leveling', on: ['campaign', 'run-timer', 'lab', 'challenges', 'pob-builds', 'regex-library'] },
  { id: 'trader', label: 'Trader', on: ['market', 'league-invest', 'lab-gems', 'scarab-flip', 'disenchant', 'stacked-decks', 'wealthy-exile', 'trade-searches', 'trade', 'regex-library'] },
  { id: 'price-check-only', label: 'Price check only', on: [] }
]

// Stored in config.json as `woke`.
export interface WokeModulesConfig {
  setupDone: boolean
  off: string[]
  // Hides (and shows again) every toolkit panel at once.
  hideAllHotkey?: string | null
  // The loot filter editor has been put on the overlay once (Config.ts).
  lootFilterSeeded?: boolean
  // Icon dock position and switches (dock/dock.ts).
  dock?: DockConfig
  // Price check: dust per chaos and a "disenchant it" verdict for uniques,
  // at `line` dust per chaos or more. Off unless switched on.
  disenchantVerdict?: { on: boolean, line: number }
  // Price check: swappable-mod families switched on or off, and the highlight limit (harvest-swap/).
  harvestSwap?: HarvestSwapConfig
  // The league list from the last launch that read it, and every league seen,
  // so a failed read keeps a league and a new one can be offered (Leagues.ts).
  leagues?: { list: string[], known: string[] }
}

interface ConfigLike {
  woke?: WokeModulesConfig
  widgets: Array<{ wmType: string }>
}

const moduleByWidget = new Map<string, ModuleDef>()
for (const m of MODULES) for (const t of m.widgetTypes) moduleByWidget.set(t, m)

// Personal-only modules (personal.ts) join the list at startup, before the
// overlay mounts, and only when main says personal.flag is there.
export function addModule (def: ModuleDef, after?: string) {
  if (MODULES.some(m => m.id === def.id)) return
  const at = after ? MODULES.findIndex(m => m.id === after) : -1
  MODULES.splice(at >= 0 ? at + 1 : MODULES.length, 0, def)
  for (const t of def.widgetTypes) moduleByWidget.set(t, def)
}

export function isModuleOn (config: ConfigLike, id: string): boolean {
  return !config.woke?.off.includes(id)
}

// Core APT widgets (no module) are always on.
export function isWidgetTypeOn (config: ConfigLike, wmType: string): boolean {
  const m = moduleByWidget.get(wmType)
  return !m || isModuleOn(config, m.id)
}

export function widgetCount (config: ConfigLike, m: ModuleDef): number {
  return config.widgets.filter(w => m.widgetTypes.includes(w.wmType)).length
}

// A module "runs" when it is on and at least one of its widgets is placed.
export function isModuleRunning (config: ConfigLike, m: ModuleDef): boolean {
  if (!isModuleOn(config, m.id)) return false
  return m.group === 'apt' || widgetCount(config, m) > 0
}

export function modulesNeeding (config: ConfigLike, need: ModuleNeed): ModuleDef[] {
  return MODULES.filter(m => m.needs.includes(need) && isModuleRunning(config, m))
}

export function applyPreset (config: ConfigLike & { woke: WokeModulesConfig }, preset: Preset) {
  const aptOff = config.woke.off.filter(id => id.startsWith('apt-'))
  const wokeOff = preset.on === 'all'
    ? []
    : MODULES.filter(m => m.group !== 'apt' && !(preset.on as string[]).includes(m.id)).map(m => m.id)
  config.woke.off = [...aptOff, ...wokeOff]
}

export function setModuleOn (config: ConfigLike & { woke: WokeModulesConfig }, id: string, on: boolean) {
  const off = config.woke.off.filter(x => x !== id)
  if (!on) off.push(id)
  config.woke.off = off
}

// Default titles that saved configs may still hold. A title you typed stays.
const OLD_DEFAULT_TITLES: Record<string, string> = {
  'woke-farming|Farming profit': 'Farming',
  'woke-market-tracker|Market tracker': 'Market',
  'woke-map-mods|Map mod checker': 'Map mods',
  'woke-campaign|Campaign tracker': 'Campaign',
  'woke-run-timer|Campaign run timer': 'Run timer'
}

export function renameOldDefaultTitles (widgets: Array<{ wmType: string, wmTitle?: string }>) {
  for (const w of widgets) {
    const title = OLD_DEFAULT_TITLES[`${w.wmType}|${w.wmTitle}`]
    if (title) w.wmTitle = title
  }
}

export function ensureWokeConfig<T extends ConfigLike> (config: T): T & { woke: WokeModulesConfig } {
  config.woke ??= { setupDone: false, off: [] }
  return config as T & { woke: WokeModulesConfig }
}

// Drops hotkeys of APT features that are switched off.
export function filterAptShortcuts (config: ConfigLike, actions: ShortcutAction[]): ShortcutAction[] {
  const priceCheck = isModuleOn(config, 'apt-price-check')
  const itemInfo = isModuleOn(config, 'apt-item-info')
  const ITEM_INFO_TARGETS = ['item-check', 'open-wiki', 'open-craft-of-exile', 'open-poedb', 'search-similar']
  return actions.filter(({ action }) => {
    if (action.type === 'copy-item' && action.target === 'price-check') return priceCheck
    if (action.type === 'copy-item' && ITEM_INFO_TARGETS.includes(action.target)) return itemInfo
    if (action.type === 'trigger-event' && action.target === BOOKMARKS_TARGET) return itemInfo
    return true
  })
}

// Whether main should tail Client.txt. Before setup is done every module counts as on.
export function needsGameLog (config: ConfigLike): boolean {
  return modulesNeeding(config, 'log').length > 0
}
