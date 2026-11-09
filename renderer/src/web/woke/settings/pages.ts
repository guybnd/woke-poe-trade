// The settings window's pages: General (shared settings), Modules (one page
// per module or pair of modules) and App. Each page lists the setting labels
// it holds so search can find them without rendering every page.
import { defineAsyncComponent, type Component } from 'vue'
import { CURRENCY_ICONS, MECHANIC_ICONS } from '../ui/game-icons'
import { MODULES } from '../modules'

import SettingsPricecheck from '@/web/price-check/settings-price-check.vue'
import SettingsItemcheck from '@/web/item-check/settings-item-check.vue'
import SettingsChat from '@/web/settings/chat.vue'
import SettingsDebug from '@/web/settings/debug.vue'
import PerfSettings from '../ui/PerfSettings.vue'
import DisenchantVerdictSetting from '../disenchant/DisenchantVerdictSetting.vue'
import ModulesSettings from '../switchboard/ModulesSettings.vue'
import GamePage from './GamePage.vue'
import HotkeysPage from './HotkeysPage.vue'
import LookPage from './LookPage.vue'
import ScreenPage from './ScreenPage.vue'
import InstallPage from './InstallPage.vue'
import AboutPage from './AboutPage.vue'
import CreditsPage from './CreditsPage.vue'
import { CREDIT_NAMES } from './credits'

export type PageGroup = 'general' | 'modules' | 'app'

export interface PageIcon {
  // Game art (bundled image or item art URL).
  art?: string | null
  // Item name for art from the item data.
  item?: string
  // Font Awesome fallback, and the icon for UI-only pages.
  fa: string
}

export interface SettingsPage {
  id: string
  name: string
  description: string
  group: PageGroup
  // Sub-heading inside Modules.
  sub?: string
  icon: PageIcon
  // Module switches shown on the page (and one switch in the sidebar).
  modules?: string[]
  // Widgets whose settings editor the page shows, in order.
  widgets?: string[]
  // Whole-config pages (APT's, or our shared pages), shown after the widgets.
  parts?: Component[]
  // Setting labels for search.
  find: string[]
  // Old page names that other code opens by (settings::page=…).
  aliases?: string[]
}

// A module page shows its module's icon (modules.ts), the same one the tab
// bar and dock use. Item art is looked up when drawn.
function modulePageIcon (moduleId: string): PageIcon {
  const i = MODULES.find(m => m.id === moduleId)?.icon
  if (!i) return { fa: 'fas fa-puzzle-piece' }
  if (i.item) return { item: i.item, fa: i.fa }
  if (i.mechanic) {
    const m = MECHANIC_ICONS[i.mechanic]
    return m?.item ? { item: m.item, fa: i.fa } : { art: m?.src ?? null, fa: i.fa }
  }
  if (i.currency) return { art: CURRENCY_ICONS[i.currency] ?? null, fa: i.fa }
  return { fa: i.fa }
}

export const PAGES: SettingsPage[] = [
  // ---------- General ----------
  {
    id: 'game',
    name: 'Game & league',
    group: 'general',
    icon: { fa: 'fas fa-flag' },
    description: 'Set once here. Every module reads these.',
    parts: [GamePage],
    find: ['League', 'Private league', 'Trade site', 'Game language', 'Client.txt', 'Game log', 'production_Config.ini', 'Loot filter folder', 'Character', 'Account name'],
    aliases: ['settings.general']
  },
  {
    id: 'hotkeys',
    name: 'Hotkeys',
    group: 'general',
    icon: { fa: 'fas fa-keyboard' },
    description: 'Every key the app listens for. Click a key, then press the new one.',
    parts: [HotkeysPage],
    find: ['Overlay key', 'Hotkey clashes', 'Stash scroll', 'Ctrl + mouse wheel'],
    aliases: ['Hotkey list', 'settings.hotkeys']
  },
  {
    id: 'look',
    name: 'Look & icon row',
    group: 'general',
    icon: { fa: 'fas fa-paint-brush' },
    description: 'Theme, text size, panel opacity, the overlay backdrop and the row of icons you see while playing.',
    parts: [LookPage],
    find: ['Theme', 'App icon', 'Tray icon', 'Panel size', 'Font size', 'Text size', 'Price check window size', 'Window size', 'Overlay background', 'Panel opacity', 'Transparency', 'See-through', 'Darken the game', 'Restore clipboard', 'Window title', 'Overlay ready notice', 'Icon row', 'Peek', 'Dock'],
    aliases: ['Appearance', 'Icon row']
  },
  {
    id: 'screen',
    name: 'Screen reading',
    group: 'general',
    icon: { fa: 'fas fa-eye' },
    description: 'Text recognition (OCR) for the scans that read the game screen.',
    parts: [ScreenPage],
    find: ['OCR', 'Text recognition', 'Map scan', 'Essence scan']
  },
  {
    id: 'builds',
    name: 'Builds (PoB)',
    group: 'general',
    icon: modulePageIcon('pob-builds'),
    description: 'Your Path of Building folder. The build helpers and the campaign guide use the active build.',
    modules: ['pob-builds'],
    widgets: ['woke-pob-builds'],
    find: ['Path of Building', 'PoB folder', 'Builds folder', 'PoB.exe']
  },

  // ---------- Modules ----------
  {
    id: 'modules',
    name: 'All modules',
    group: 'modules',
    icon: { fa: 'fas fa-th-large' },
    description: 'Switch modules on and off, pick a preset, and see what runs in the background.',
    parts: [ModulesSettings],
    find: ['Modules', 'Presets', 'Shared services', 'Run setup again', 'Hide all toolkit panels'],
    aliases: ['Modules']
  },
  {
    id: 'price-check',
    name: 'Price check',
    group: 'modules',
    sub: 'Trade & prices',
    icon: modulePageIcon('apt-price-check'),
    description: 'Prices for the item under your cursor.',
    modules: ['apt-price-check'],
    parts: [SettingsPricecheck, DisenchantVerdictSetting, defineAsyncComponent(() => import('../harvest-swap/SwapSetting.vue'))],
    find: ['Window style', 'PoE mode', 'Disenchant or sell', 'Dust per chaos', 'Show seller', 'Fill rolls', 'Stock filter', 'Price prediction', 'Built-in browser', 'Auto search', 'Collapse listings'],
    aliases: ['price_check.name']
  },
  {
    id: 'item-info',
    name: 'Item info',
    group: 'modules',
    sub: 'Trade & prices',
    icon: modulePageIcon('apt-item-info'),
    description: 'Item details, and wiki and poedb links.',
    modules: ['apt-item-info'],
    parts: [SettingsItemcheck],
    find: ['Item info', 'Wiki', 'poedb', 'Craft of Exile'],
    aliases: ['item.info']
  },
  {
    id: 'trade-searches',
    name: 'Trade searches',
    group: 'modules',
    sub: 'Trade & prices',
    icon: modulePageIcon('trade-searches'),
    description: 'Saved trade site searches and live search alerts.',
    modules: ['trade-searches'],
    widgets: ['woke-trade-searches'],
    find: ['Saved searches', 'Live search alert', 'Open old searches in the current league']
  },
  {
    id: 'trade',
    name: 'Trades',
    group: 'modules',
    sub: 'Trade & prices',
    icon: modulePageIcon('trade'),
    description: 'Trade whispers in the icon row, one-key replies and a sales log.',
    modules: ['trade'],
    widgets: ['woke-trade'],
    find: ['Trade whispers', 'Next step', 'Busy reply', 'Invite', 'Kick', 'Sales log', 'Replies', 'Ping']
  },
  {
    id: 'market',
    name: 'Market & investments',
    group: 'modules',
    sub: 'Trade & prices',
    icon: modulePageIcon('market'),
    description: 'Movers, watchlist, league-start investments, flips and dust from poe.ninja, and Wealthy Exile.',
    modules: ['market', 'league-invest', 'scarab-flip', 'disenchant', 'wealthy-exile'],
    widgets: ['woke-market-tracker', 'woke-league-invest', 'woke-scarab-flip', 'woke-disenchant', 'woke-wealthy-exile'],
    find: ['Market', 'Watchlist', 'Investments', 'League day', 'Flips', 'Scarab flip', 'Scarab vendor recipe', 'Harvest reroll', 'Lifeforce', 'Stash outlines', 'Catalyst', 'Delirium orb', 'Disenchant', 'Thaumaturgic Dust', 'Kingsmarch', 'Gold fee', 'Wealthy Exile', 'Net worth']
  },
  {
    id: 'campaign',
    name: 'Campaign & run timer',
    group: 'modules',
    sub: 'Campaign & lab',
    icon: modulePageIcon('campaign'),
    description: 'Next steps for your act, and act splits with personal bests.',
    modules: ['campaign', 'run-timer'],
    widgets: ['woke-campaign', 'woke-run-timer'],
    find: ['League start stops', 'Library gem', 'Guide card', 'Act notes', 'Zone notes', 'Auto start', 'Sub-splits', 'Splits']
  },
  {
    id: 'lab',
    name: 'Lab & lab gems',
    group: 'modules',
    sub: 'Campaign & lab',
    icon: modulePageIcon('lab'),
    description: "Today's lab layout, and Divine Font gem values.",
    modules: ['lab', 'lab-gems'],
    widgets: ['woke-lab', 'woke-lab-gems'],
    find: ['Lab layout', 'poelab', "Aspirants' Plaza", 'Lab notes', 'Lab gems']
  },
  {
    id: 'challenges',
    name: 'Challenge guide',
    group: 'modules',
    sub: 'Campaign & lab',
    icon: modulePageIcon('challenges'),
    description: 'The league challenge guide on a hotkey, ticked from your profile.',
    modules: ['challenges'],
    widgets: ['woke-challenges'],
    find: ['Challenges', 'Challenge guide', 'Account name', 'Sync']
  },
  {
    id: 'map-mods',
    name: 'Map mods & map scan',
    group: 'modules',
    sub: 'Maps & atlas',
    icon: modulePageIcon('map-mods'),
    description: 'Danger strip for map mods, profiles and weights, the on-screen map scan, and the death recap.',
    modules: ['map-mods', 'map-scan', 'death-recap'],
    widgets: ['woke-map-mods', 'woke-map-scan'],
    find: ['Death recap', 'Map mod weights', 'Profiles', 'Danger strip', 'Map regex', 'Rolling mode', 'Alert when a map passes', 'Map check', 'Heist', 'Charts', 'T17', 'Nightmare'],
    aliases: ['map_check.name']
  },
  {
    id: 'essence-scan',
    name: 'Essence scan',
    group: 'modules',
    sub: 'Maps & atlas',
    icon: modulePageIcon('essence-scan'),
    description: 'Reads essence monoliths and flags Misery, Envy, Dread and Scorn.',
    modules: ['essence-scan'],
    widgets: ['woke-essence-scan'],
    find: ['MEDS', 'Value alert', 'Essence']
  },
  {
    id: 'atlas',
    name: 'Atlas strategies',
    group: 'modules',
    sub: 'Maps & atlas',
    icon: modulePageIcon('atlas'),
    description: 'Tree, scarabs, device and regex for each strategy.',
    modules: ['atlas'],
    widgets: ['woke-atlas-strategies'],
    find: ['Strategies', 'Atlas tree', 'Scarabs', 'Atlas data']
  },
  {
    id: 'boss-runs',
    name: 'Boss runs',
    group: 'modules',
    sub: 'Maps & atlas',
    icon: modulePageIcon('boss-runs'),
    description: 'Profit per boss kill.',
    modules: ['boss-runs'],
    widgets: ['woke-boss-runs'],
    find: ['Boss runs', 'Boss kill']
  },
  {
    id: 'farming',
    name: 'Farming & sessions',
    group: 'modules',
    sub: 'Maps & atlas',
    icon: modulePageIcon('farming'),
    description: 'Profit per hour now, and per map and strategy over time.',
    modules: ['farming', 'session-analytics'],
    widgets: ['woke-farming', 'woke-session-analytics'],
    find: ['Bulk price', 'Junk below', 'Auto pause', 'Session analytics']
  },
  {
    id: 'drop-counter',
    name: 'Drop counter',
    group: 'modules',
    sub: 'Maps & atlas',
    icon: modulePageIcon('drop-counter'),
    description: 'A tally of the drops you choose, and maps run.',
    modules: ['drop-counter'],
    widgets: ['woke-drop-counter'],
    find: ['Drop counter', 'Tally', 'Hover card', 'Maps run']
  },
  {
    id: 'stacked-decks',
    name: 'Stacked decks',
    group: 'modules',
    sub: 'Maps & atlas',
    icon: modulePageIcon('stacked-decks'),
    description: 'Cards from the Stacked Decks you open: profit, big hits, luck, and whether to open or sell them.',
    modules: ['stacked-decks'],
    widgets: ['woke-stacked-decks'],
    find: ['Stacked Deck', 'Divination card', 'Big hit', 'Open or sell', 'Prohibited Library']
  },
  {
    id: 'mechanics',
    name: 'League mechanics',
    group: 'modules',
    sub: 'Maps & atlas',
    icon: modulePageIcon('mechanics'),
    description: 'What the overlay shows for each league mechanic, when it shows it, and what you can change.',
    modules: ['mechanics'],
    widgets: ['woke-mechanics'],
    find: ['Panel follows my zone', 'Show or hide a mechanic', 'Betrayal rewards', 'Syndicate', 'Delve', 'Expedition', 'Harvest', 'Blight', 'Essence', 'Breach', 'Legion', 'Delirium', 'Ritual', 'Ultimatum', 'Sanctum', 'Heist', 'Bestiary', 'Incursion']
  },
  {
    id: 'loot-filter',
    name: 'Loot filter editor',
    group: 'modules',
    sub: 'Maps & atlas',
    icon: modulePageIcon('loot-filter'),
    description: 'Edit the NeverSink rule for an item you hover.',
    modules: ['loot-filter'],
    widgets: ['woke-loot-filter'],
    find: ['Save mode', 'Reload filter via chat', 'Area level']
  },
  {
    id: 'regex-library',
    name: 'Regex library',
    group: 'modules',
    sub: 'Tools',
    icon: modulePageIcon('regex-library'),
    description: 'Saved stash search strings, with hotkeys.',
    modules: ['regex-library'],
    widgets: ['woke-regex-library'],
    find: ['Regex', 'Stash search strings', 'Import', 'Export']
  },
  {
    id: 'chat',
    name: 'Chat commands',
    group: 'modules',
    sub: 'Tools',
    icon: { fa: 'fas fa-comment-dots' },
    description: 'Text pasted into chat with one key, like /hideout.',
    parts: [SettingsChat],
    find: ['/hideout', '/exit', 'Chat command'],
    aliases: ['settings.chat']
  },

  // ---------- App ----------
  {
    id: 'install',
    name: 'Install & updates',
    group: 'app',
    icon: { fa: 'fas fa-download' },
    description: 'Updates, starting with Windows, crash reports and the setup window.',
    parts: [InstallPage],
    find: ['Auto update', 'Start with Windows', 'Crash reports', 'Setup window', 'Version']
  },
  {
    id: 'performance',
    name: 'Performance',
    group: 'app',
    icon: { fa: 'fas fa-tachometer-alt' },
    description: 'Startup time, CPU and memory, with a report you can copy.',
    parts: [PerfSettings],
    find: ['Performance', 'CPU', 'Memory', 'Copy report'],
    aliases: ['Performance']
  },
  {
    id: 'debug',
    name: 'Troubleshooting',
    group: 'app',
    icon: { fa: 'fas fa-bug' },
    description: "The app's log, and key logging for hotkey problems.",
    parts: [SettingsDebug],
    find: ['Debug', 'Log', 'Log keys'],
    aliases: ['settings.debug']
  },
  {
    id: 'about',
    name: 'About',
    group: 'app',
    icon: { fa: 'fas fa-info-circle' },
    description: 'Version, updates and the people who support Awakened PoE Trade.',
    parts: [AboutPage],
    find: ['About', 'Patreon', 'Check for updates'],
    aliases: ['settings.about']
  },
  {
    id: 'credits',
    name: 'Credits',
    group: 'app',
    icon: { fa: 'fas fa-heart' },
    description: 'The projects this toolkit is built on, uses data from or took ideas from.',
    parts: [CreditsPage],
    find: ['Credits', 'License', ...CREDIT_NAMES]
  }
]

export const PAGE_BY_ID = new Map(PAGES.map(p => [p.id, p]))

export function pageForWidgetType (wmType: string): SettingsPage | undefined {
  return PAGES.find(p => p.widgets?.includes(wmType))
}

export function pageByName (name: string): SettingsPage | undefined {
  return PAGES.find(p => p.id === name || p.name === name || p.aliases?.includes(name))
}
