import { reactive as deepReactive, shallowRef, toRaw } from 'vue'
import { configForDisk } from './woke/shared/config-disk'
import isDeepEqual from 'fast-deep-equal'
import { Host } from '@/web/background/IPC'
import { HostConfig, ShortcutAction } from '@ipc/types'
import type * as widget from './overlay/widgets'
import type { StashSearchWidget } from './stash-search/widget'
import { wokeGlobalShortcuts, wokeShortcutsFor } from './woke/shortcuts'
import { LOOT_FILTER_TYPE, seedLootFilterWidget } from './woke/loot-filter/widget'
import { ensureWokeConfig, renameOldDefaultTitles, filterAptShortcuts, isModuleOn, needsGameLog } from './woke/modules'
import { MAP_CHECK_TYPE, initMapCheckWidget } from './woke/map-mods/map-check'
import { DEATH_RECAP_TYPE, initDeathRecapWidget } from './woke/death-recap/widget'
import { SEARCH_TYPE, initSearchWidget, moveSearchKey } from './woke/search/widget'
import type { SearchWidget } from './woke/search/widget'
import { moveStashSearchToLibrary } from './woke/regex-library/apt-import'
import { carryRewordedRatings } from './woke/map-mods/rules'
import type { ModRating } from './woke/map-mods/rules'
import { movePopupsToNewSpot } from './woke/ui/window-anchor'
import type { WokeModulesConfig } from './woke/modules'
import type { ItemCheckWidget } from './item-check/widget'
import { BOOKMARKS_TARGET } from './woke/item-lookup/lookup'
import { registry as widgetRegistry } from './overlay/widget-registry.js'

const _config = shallowRef<Config | null>(null)
let _lastSavedConfig: Config | null = null

export function AppConfig (): Config
export function AppConfig<T extends widget.Widget> (type: string): T | undefined
export function AppConfig (type?: string) {
  if (!type) {
    return _config.value!
  } else {
    return _config.value!.widgets.find(w => w.wmType === type)
  }
}

export function updateConfig (updates: Config) {
  _config.value = deepReactive(JSON.parse(JSON.stringify(updates)))
  document.documentElement.style.fontSize = `${_config.value!.fontSize}px`
}

export function saveConfig (opts?: { isTemporary: boolean }) {
  const rawConfig = toRaw(_config.value!)
  if (rawConfig.widgets.some(w => w.wmZorder === 'exclusive' && w.wmWants === 'show')) {
    return
  }

  if (!isDeepEqual(rawConfig, _lastSavedConfig)) {
    _lastSavedConfig = JSON.parse(JSON.stringify(rawConfig))
    Host.sendEvent({
      name: 'CLIENT->MAIN::save-config',
      payload: {
        contents: JSON.stringify(AppConfig()),
        isTemporary: opts?.isTemporary ?? false
      }
    })
  }
}

// woke: for a window that can't close to save (Settings), and for quitting. The
// page isn't told, since that would swap its config and close Settings.
export function saveConfigQuietly () {
  Host.sendEvent({
    name: 'CLIENT->MAIN::save-config',
    payload: { contents: configForDisk(AppConfig()), isTemporary: false, quiet: true }
  })
}

// Runs just before the save on quit: a window with edits still on a timer.
export const beforeQuitSave = new Set<() => void>()

export function pushHostConfig () {
  Host.sendEvent({
    name: 'CLIENT->MAIN::update-host-config',
    payload: getConfigForHost()
  })
}

export async function initConfig () {
  Host.onEvent('MAIN->CLIENT::config-changed', (e) => {
    _lastSavedConfig = JSON.parse(e.contents) // should be a deep copy
    updateConfig(JSON.parse(e.contents))
  })

  // The setup window and browser tabs don't hold the newest settings.
  if (Host.isElectron && window.location.hash !== '#setup') {
    Host.onEvent('MAIN->CLIENT::config-flush', () => {
      for (const run of beforeQuitSave) run()
      saveConfigQuietly()
      Host.sendEvent({ name: 'CLIENT->MAIN::config-flushed', payload: undefined })
    })
  }

  const contents = await Host.getConfig()
  if (!contents) {
    updateConfig(defaultConfig())
    return
  }

  let config: Config
  try {
    config = JSON.parse(contents)
  } catch {
    updateConfig(defaultConfig())
    saveConfig({ isTemporary: true })
    return
  }

  // woke: a file from a newer version, or one the upgrade can't handle, stays
  // untouched: this run works on defaults or a best effort, saved elsewhere.
  const isNewer = config.configVersion > defaultConfig().configVersion
  try {
    updateConfig(upgradeConfig(config))
  } catch (e) {
    console.warn('[config] upgrade failed', e)
    updateConfig(defaultConfig())
    Host.configNotice.value = 'upgrade-failed'
    saveConfig({ isTemporary: true })
    return
  }
  if (isNewer) {
    Host.configNotice.value = 'newer'
    saveConfig({ isTemporary: true })
  }
}

export function poeWebApi () {
  const { language, useIntlSite } = AppConfig()
  if (useIntlSite) {
    return 'www.pathofexile.com'
  }
  switch (language) {
    case 'en': return 'www.pathofexile.com'
    case 'ru': return 'ru.pathofexile.com'
    case 'cmn-Hant': return 'pathofexile.tw'
    case 'ko': return 'poe.kakaogames.com'
  }
}

export interface Config {
  configVersion: number
  leagueId?: string
  overlayKey: string
  overlayBackground: string
  overlayBackgroundClose: boolean
  restoreClipboard: boolean
  commands: Array<{
    text: string
    hotkey: string | null
    send: boolean
  }>
  clientLog: string | null
  gameConfig: string | null
  windowTitle: string
  logKeys: boolean
  accountName: string
  stashScroll: boolean
  language: 'en' | 'ru' | 'cmn-Hant' | 'ko'
  realm: 'pc-ggg' | 'pc-garena'
  useIntlSite: boolean
  widgets: widget.Widget[]
  fontSize: number
  showAttachNotification: boolean
  woke?: WokeModulesConfig
  // woke: id from woke/ui/app-icon.ts; unset means the default.
  appIcon?: string
}

export const defaultConfig = (): Config => ({
  configVersion: 18,
  overlayKey: 'Shift + Space',
  overlayBackground: 'rgba(129, 139, 149, 0.15)',
  overlayBackgroundClose: true,
  restoreClipboard: false,
  showAttachNotification: true,
  commands: [{
    text: '/hideout',
    hotkey: 'F5',
    send: true
  }, {
    text: '/exit',
    hotkey: 'F9',
    send: true
  }, {
    text: '@last ty',
    hotkey: null,
    send: true
  }, {
    text: '/invite @last',
    hotkey: null,
    send: true
  }, {
    text: '/tradewith @last',
    hotkey: null,
    send: true
  }, {
    text: '/hideout @last',
    hotkey: null,
    send: true
  }],
  clientLog: null,
  gameConfig: null,
  windowTitle: 'Path of Exile',
  logKeys: false,
  accountName: '',
  stashScroll: true,
  language: 'en',
  realm: 'pc-ggg',
  useIntlSite: false,
  fontSize: 16,
  widgets: widgetRegistry.widgets.reduce<widget.Widget[]>((widgets, { widget }) => {
    const res: widget.Widget[] = []
    if (widget.instances === 'single') {
      res.push(widget.initInstance!())
    } else if (widget.instances === 'multi' && widget.defaultInstances != null) {
      res.push(...widget.defaultInstances())
    }
    for (const config of res) {
      // woke: the Regex library replaces APT's Stash search.
      if (config.wmType === 'stash-search') continue
      config.wmId = widgets.length + 1
      widgets.push(config)
    }
    return widgets
  }, [])
})

function upgradeConfig (_config: Config): Config {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const config = _config as Omit<Config, 'widgets'> & { widgets: Array<Record<string, any>> }

  if (config.configVersion < 3) {
    config.widgets.push({
      ...defaultConfig().widgets.find(w => w.wmType === 'image-strip')!,
      wmId: Math.max(0, ...config.widgets.map(_ => _.wmId)) + 1,
      wmZorder: null
    })

    config.widgets.push({
      ...defaultConfig().widgets.find(w => w.wmType === 'delve-grid')!,
      wmId: Math.max(0, ...config.widgets.map(_ => _.wmId)) + 1,
      wmZorder: null
    })

    config.widgets.find(w => w.wmType === 'menu')!
      .alwaysShow = false

    config.configVersion = 3
  }

  if (config.configVersion < 4) {
    config.widgets.find(w => w.wmType === 'price-check')!
      .chaosPriceThreshold = 0.05

    const mapCheck = config.widgets.find(w => w.wmType === 'map-check')!
    ;(mapCheck as any).selectedStats.forEach((e: any) => {
      e.matcher = e.matchRef
      e.matchRef = undefined
    })

    {
      const widgets = config.widgets.filter(w => w.wmType === 'image-strip')!
      widgets.forEach((imgStrip: any) => {
        imgStrip.images.forEach((e: any, idx: number) => {
          e.id = idx
        })
      })
    }

    config.configVersion = 4
  }

  if (config.configVersion < 5) {
    config.commands.forEach(cmd => {
      cmd.send = true
    })

    config.configVersion = 5
  }

  if (config.configVersion < 6) {
    config.widgets.find(w => w.wmType === 'price-check')!
      .showRateLimitState = ((config as any).logLevel === 'debug')
    config.widgets.find(w => w.wmType === 'price-check')!
      .apiLatencySeconds = 2

    config.configVersion = 6
  }

  if (config.configVersion < 7) {
    const mapCheck = config.widgets.find(w => w.wmType === 'map-check')!
    mapCheck.wmType = 'item-check'
    mapCheck.maps = { selectedStats: mapCheck.selectedStats }
    mapCheck.selectedStats = undefined

    ;(config as any).itemCheckKey = (config as any).mapCheckKey || null
    ;(config as any).mapCheckKey = undefined

    config.configVersion = 7
  }

  if (config.configVersion < 8) {
    const itemCheck = config.widgets.find(w => w.wmType === 'item-check')!
    ;(itemCheck as ItemCheckWidget).maps.showNewStats = false
    itemCheck.maps.selectedStats = (itemCheck as ItemCheckWidget).maps.selectedStats.map(entry => ({
      matcher: entry.matcher,
      decision:
        (entry as any).valueDanger ? 'danger'
          : (entry as any).valueWarning ? 'warning'
              : (entry as any).valueDesirable ? 'desirable'
                  : 'seen'
    }))

    config.configVersion = 8
  }

  if (config.configVersion < 9) {
    config.widgets.find(w => w.wmType === 'price-check')!
      .collapseListings = 'api'

    config.widgets.find(w => w.wmType === 'price-check')!
      .smartInitialSearch = true
    config.widgets.find(w => w.wmType === 'price-check')!
      .lockedInitialSearch = true

    config.widgets.find(w => w.wmType === 'price-check')!
      .activateStockFilter = false

    config.configVersion = 9
  }

  if (config.configVersion < 10) {
    config.widgets.push({
      ...defaultConfig().widgets.find(w => w.wmType === 'settings')!,
      wmId: Math.max(0, ...config.widgets.map(_ => _.wmId)) + 1
    })

    const priceCheck = config.widgets.find(w => w.wmType === 'price-check')!
    priceCheck.hotkey = (config as any).priceCheckKey
    priceCheck.hotkeyHold = (config as any).priceCheckKeyHold
    priceCheck.hotkeyLocked = (config as any).priceCheckLocked
    priceCheck.showSeller = (config as any).showSeller
    priceCheck.searchStatRange = (config as any).searchStatRange
    priceCheck.showCursor = (config as any).priceCheckShowCursor

    if (priceCheck.chaosPriceThreshold === 0.05) {
      priceCheck.chaosPriceThreshold = 0
    }

    config.configVersion = 10
  }

  if (config.configVersion < 11) {
    config.widgets.find(w => w.wmType === 'price-check')!
      .requestPricePrediction = false

    config.configVersion = 11
  }

  if (config.configVersion < 12) {
    const afterSettings = config.widgets.findIndex(w => w.wmType === 'settings')
    config.widgets.splice(afterSettings + 1, 0, {
      ...defaultConfig().widgets.find(w => w.wmType === 'item-search')!,
      wmWants: 'show',
      wmId: Math.max(0, ...config.widgets.map(_ => _.wmId)) + 1
    })

    config.realm = 'pc-ggg'
    if (config.language === 'zh_TW' as string) {
      config.language = 'cmn-Hant'
    }

    config.configVersion = 12
  }

  if (config.configVersion < 13) {
    config.showAttachNotification = true

    config.configVersion = 13
  }

  if (config.configVersion < 14) {
    const imgWidgets = config.widgets.filter(w => w.wmType === 'image-strip') as widget.ImageStripWidget[]
    imgWidgets.forEach((imgStrip) => {
      imgStrip.images.forEach((e) => {
        e.url = e.url.startsWith('app-file://')
          ? e.url.slice('app-file://'.length)
          : e.url
      })
    })

    const itemCheck = config.widgets.find(w => w.wmType === 'item-check') as ItemCheckWidget
    itemCheck.wikiKey = (config as any).wikiKey
    itemCheck.poedbKey = null
    itemCheck.craftOfExileKey = (config as any).craftOfExileKey
    itemCheck.stashSearchKey = null

    config.configVersion = 14
  }

  if (config.configVersion < 15) {
    const priceCheck = config.widgets.find(w => w.wmType === 'price-check') as widget.PriceCheckWidget
    priceCheck.builtinBrowser = false

    const itemCheck = config.widgets.find(w => w.wmType === 'item-check') as ItemCheckWidget
    itemCheck.maps.profile = 1
    for (const stat of itemCheck.maps.selectedStats) {
      const p1decision =
        (stat.decision === 'danger') ? 'd'
          : (stat.decision === 'warning') ? 'w'
              : (stat.decision === 'desirable') ? 'g' : 's'

      stat.decision = `${p1decision}--`
    }

    config.configVersion = 15
  }

  if (config.configVersion < 16) {
    const delve = config.widgets.find(w => w.wmType === 'delve-grid') as widget.DelveGridWidget
    delve.toggleKey = (config as any).delveGridKey

    const itemCheck = config.widgets.find(w => w.wmType === 'item-check') as ItemCheckWidget
    itemCheck.hotkey = (config as any).itemCheckKey

    if (itemCheck.maps.profile === undefined) {
      itemCheck.maps.profile = 1
      itemCheck.maps.selectedStats = []
    }

    config.configVersion = 16
  }

  if (config.logKeys === undefined) {
    config.logKeys = false
  }

  const priceCheck = config.widgets.find(w => w.wmType === 'price-check') as widget.PriceCheckWidget
  if (priceCheck.merchantOnly === undefined) {
    priceCheck.merchantOnly = true
  }
  if (priceCheck.defaultCurrency === undefined) {
    priceCheck.defaultCurrency = null
  }

  for (const widget of config.widgets) {
    if (widget.wmType === 'stash-search') {
      (widget as StashSearchWidget).enableHotkeys ??= true
    }
  }

  if (config.configVersion < 17) {
    for (const widget of config.widgets) {
      for (let i = 0; i < widget.wmFlags.length; ++i) {
        if (widget.wmFlags[i] === 'skip-menu') {
          widget.wmFlags[i] = 'menu::skip'
        }
      }
    }

    const itemSearch = config.widgets.find(w => w.wmType === 'item-search') as widget.Widget
    itemSearch.wmTitle = '{icon=fa-search}'
    const settings = config.widgets.find(w => w.wmType === 'settings') as widget.Widget
    settings.wmTitle = '{icon=fa-cog}'

    // make sure icon for settings comes first in the widget menu
    config.widgets.sort((a, b) => {
      if (a.wmType === 'settings') return -1
      if (b.wmType === 'settings') return 1
      return 0
    })

    config.configVersion = 17
  }

  if (config.configVersion < 18) {
    config.useIntlSite = (config.language === 'cmn-Hant' && config.realm === 'pc-ggg')

    config.configVersion = 18
  }
  // woke: item lookup bookmarks.
  {
    const itemCheck = config.widgets.find(w => w.wmType === 'item-check') as ItemCheckWidget
    itemCheck.bookmarksKey ??= null
    itemCheck.bookmarks ??= []
  }
  // woke: single-instance windows are only created on a fresh config.
  if (!config.widgets.some(w => w.wmType === MAP_CHECK_TYPE)) {
    config.widgets.push(initMapCheckWidget(Math.max(0, ...config.widgets.map(w => w.wmId)) + 1))
  }
  if (!config.widgets.some(w => w.wmType === DEATH_RECAP_TYPE)) {
    config.widgets.push(initDeathRecapWidget(Math.max(0, ...config.widgets.map(w => w.wmId)) + 1))
    // New to this config: stays off for anyone who has Map mods off, like "Price check only".
    const woke = config as unknown as { woke?: WokeModulesConfig, widgets: Array<{ wmType: string }> }
    if (!isModuleOn(woke, 'map-mods')) ensureWokeConfig(woke).woke.off.push('death-recap')
  }
  // woke: the search hotkey. A key you already use elsewhere isn't taken over.
  {
    const taken = [...JSON.stringify(config).matchAll(/"((?:[A-Z][a-z]+ \+ )+\w+)"/g)].map(m => m[1])
    taken.push(`${priceCheck.hotkeyHold} + ${priceCheck.hotkey}`)
    const search = config.widgets.find(w => w.wmType === SEARCH_TYPE)
    if (search) moveSearchKey(search as unknown as SearchWidget, taken)
    else config.widgets.push(initSearchWidget(Math.max(0, ...config.widgets.map(w => w.wmId)) + 1, taken))
  }
  // woke: the filter rule hotkey works without adding the editor first.
  // Once only, so one you removed stays removed.
  const modules = config as unknown as { woke?: WokeModulesConfig, widgets: Array<{ wmType: string }> }
  if (!modules.woke?.lootFilterSeeded && isModuleOn(modules, 'loot-filter')) {
    if (!config.widgets.some(w => w.wmType === LOOT_FILTER_TYPE)) {
      const taken = [...JSON.stringify(config).matchAll(/"((?:[A-Z][a-z]+ \+ )+\w+)"/g)].map(m => m[1])
      taken.push(`${priceCheck.hotkeyHold} + ${priceCheck.hotkey}`)
      config.widgets.push(seedLootFilterWidget(Math.max(0, ...config.widgets.map(w => w.wmId)) + 1, taken))
    }
    ensureWokeConfig(modules).woke.lootFilterSeeded = true
  }
  // woke: map mod ratings follow mods the game has reworded.
  for (const w of config.widgets as Array<{ wmType: string, profiles?: Array<{ ratings?: Record<string, ModRating> }> }>) {
    if (w.wmType !== 'woke-map-mods') continue
    for (const p of w.profiles ?? []) if (p.ratings) carryRewordedRatings(p.ratings)
  }
  // woke: Stash search strings move into the Regex library.
  moveStashSearchToLibrary(config.widgets as Array<Record<string, any> & { wmId: number, wmType: string }>)
  // woke: each tool has one name now.
  renameOldDefaultTitles(config.widgets as Array<{ wmType: string, wmTitle?: string }>)
  // woke: panels still on their old default spot open in the new one.
  movePopupsToNewSpot(config.widgets as Array<Record<string, any> & { wmType: string }>)
  /* eslint-enable */

  return config as unknown as Config
}

export function getConfigForHost (): HostConfig {
  const actions: ShortcutAction[] = []

  const config = AppConfig()
  const priceCheck = AppConfig('price-check') as widget.PriceCheckWidget
  if (priceCheck.hotkey) {
    actions.push({
      shortcut: `${priceCheck.hotkeyHold} + ${priceCheck.hotkey}`,
      action: { type: 'copy-item', target: 'price-check', focusOverlay: false },
      keepModKeys: true
    })
  }
  if (priceCheck.hotkeyLocked) {
    actions.push({
      shortcut: priceCheck.hotkeyLocked,
      action: { type: 'copy-item', target: 'price-check', focusOverlay: true }
    })
  }
  actions.push({
    shortcut: config.overlayKey,
    action: { type: 'toggle-overlay' },
    keepModKeys: true
  })
  const itemCheck = AppConfig('item-check') as ItemCheckWidget
  if (itemCheck.wikiKey) {
    actions.push({
      shortcut: itemCheck.wikiKey,
      action: { type: 'copy-item', target: 'open-wiki', focusOverlay: true }
    })
  }
  if (itemCheck.craftOfExileKey) {
    actions.push({
      shortcut: itemCheck.craftOfExileKey,
      action: { type: 'copy-item', target: 'open-craft-of-exile', focusOverlay: true }
    })
  }
  if (itemCheck.poedbKey) {
    actions.push({
      shortcut: itemCheck.poedbKey,
      action: { type: 'copy-item', target: 'open-poedb', focusOverlay: true }
    })
  }
  if (itemCheck.bookmarksKey) {
    actions.push({
      shortcut: itemCheck.bookmarksKey,
      action: { type: 'trigger-event', target: BOOKMARKS_TARGET, focusOverlay: true }
    })
  }
  if (itemCheck.stashSearchKey) {
    actions.push({
      shortcut: itemCheck.stashSearchKey,
      action: { type: 'copy-item', target: 'search-similar' }
    })
  }
  if (itemCheck.hotkey) {
    actions.push({
      shortcut: itemCheck.hotkey,
      action: { type: 'copy-item', target: 'item-check', focusOverlay: true }
    })
  }
  const delveGrid = AppConfig('delve-grid') as widget.DelveGridWidget
  if (delveGrid.toggleKey) {
    actions.push({
      shortcut: delveGrid.toggleKey,
      action: { type: 'trigger-event', target: 'delve-grid' },
      keepModKeys: true
    })
  }
  for (const command of config.commands) {
    if (command.hotkey) {
      actions.push({
        shortcut: command.hotkey,
        action: { type: 'paste-in-chat', text: command.text, send: command.send }
      })
    }
  }
  actions.push(...wokeGlobalShortcuts(config))
  for (const widget of config.widgets) {
    actions.push(...wokeShortcutsFor(widget, config))
    if (widget.wmType === 'stash-search') {
      const stashSearch = widget as StashSearchWidget
      if (!stashSearch.enableHotkeys) continue

      for (const entry of stashSearch.entries) {
        if (entry.hotkey) {
          actions.push({
            shortcut: entry.hotkey,
            action: { type: 'stash-search', text: entry.text }
          })
        }
      }
    } else if (widget.wmType === 'timer') {
      const stopwatch = widget as widget.StopwatchWidget
      if (stopwatch.toggleKey) {
        actions.push({
          shortcut: stopwatch.toggleKey,
          keepModKeys: true,
          action: {
            type: 'trigger-event',
            target: `stopwatch-start-stop:${widget.wmId}`
          }
        })
      }
      if (stopwatch.resetKey) {
        actions.push({
          shortcut: stopwatch.resetKey,
          keepModKeys: true,
          action: {
            type: 'trigger-event',
            target: `stopwatch-reset:${widget.wmId}`
          }
        })
      }
    }
  }

  return {
    shortcuts: filterAptShortcuts(config, actions),
    restoreClipboard: config.restoreClipboard,
    clientLog: config.clientLog,
    gameConfig: config.gameConfig,
    stashScroll: config.stashScroll,
    overlayKey: config.overlayKey,
    logKeys: config.logKeys,
    windowTitle: config.windowTitle,
    language: config.language,
    wokeGameLog: needsGameLog(config),
    appIcon: config.appIcon
  }
}
