// Kept free of Vue component imports: Config.ts imports this file,
// and components import Config.ts.
import type { ShortcutAction } from '@ipc/types'
import type { Widget } from '@/web/overlay/widgets'
import { REGEX_LIBRARY_TYPE, effectiveText } from './regex-library/widget'
import type { RegexLibraryWidget } from './regex-library/widget'
import { TRADE_SEARCHES_TYPE, hotkeyTarget } from './trade-searches/widget'
import type { TradeSearchesWidget } from './trade-searches/widget'
import { LAB_TYPE, hotkeyTarget as labHotkeyTarget } from './lab/lab'
import type { LabWidget } from './lab/lab'
import { CHALLENGES_TYPE, challengesShortcuts } from './challenges/widget'
import type { ChallengesWidget } from './challenges/widget'
import { WEALTHY_EXILE_TYPE, wealthyExileShortcuts } from './wealthy-exile/widget'
import type { WealthyExileWidget } from './wealthy-exile/widget'
import { MAP_MODS_TYPE, MAP_MODS_TARGET } from './map-mods/widget'
import type { MapModsWidget } from './map-mods/widget'
import { MAP_SCAN_TYPE, rollHotkeyTarget, scanHotkeyTarget } from './map-mods/scan'
import type { MapScanWidget } from './map-mods/scan'
import { isModuleOn, isWidgetTypeOn } from './modules'
import { ESSENCE_SCAN_TYPE, essenceHotkeyTarget, essenceOnceTarget } from './essence-scan/widget'
import type { EssenceScanWidget } from './essence-scan/widget'
import { LOOT_FILTER_TYPE, LOOT_FILTER_SAMPLE_TARGET, editorHotkeyTarget, reloadHotkeyTarget, strictnessHotkeyTarget } from './loot-filter/widget'
import type { LootFilterWidget } from './loot-filter/widget'
import { CAMPAIGN_TYPE, hotkeyTarget as campaignHotkeyTarget } from './campaign/widget'
import type { CampaignWidget } from './campaign/widget'
import { RUN_TIMER_TYPE, hotkeyTarget as timerHotkeyTarget } from './campaign/run-timer'
import type { RunTimerWidget } from './campaign/run-timer'
import { FARMING_TYPE, FARMING_LOOT_TARGET } from './farming/farming'
import type { FarmingWidget } from './farming/farming'
import { DROP_COUNTER_TYPE, DROP_COUNTER_TARGET } from './drop-counter/drop-counter'
import type { DropCounterWidget } from './drop-counter/drop-counter'
import { SCARAB_FLIP_TYPE, stashHotkeyTarget } from './scarab-flip/widget'
import { POB_BUILDS_TYPE, treeHotkeyOf, treeHotkeyTarget } from './pob-builds/widget'
import type { PobBuildsWidget } from './pob-builds/widget'
import type { ScarabFlipWidget } from './scarab-flip/widget'
import { TRADE_TYPE, hotkeyTarget as tradeHotkeyTarget } from './trade/widget'
import type { TradeWidget } from './trade/widget'

import { SEARCH_TYPE, SEARCH_TARGET } from './search/widget'
import type { SearchWidget } from './search/widget'

export const HIDE_ALL_TARGET = 'woke-hide-all'

// Default map check key, used until the Map mods widget exists.
export const MAP_CHECK_DEFAULT_KEY = 'Alt + M'

// Shortcuts that don't belong to one widget.
export function wokeGlobalShortcuts (config: { woke?: { setupDone: boolean, off: string[], hideAllHotkey?: string | null }, widgets: Widget[] }): ShortcutAction[] {
  const out: ShortcutAction[] = []
  const key = config.woke?.hideAllHotkey
  if (key) out.push({ shortcut: key, keepModKeys: true, action: { type: 'trigger-event', target: HIDE_ALL_TARGET } })
  // The map check works with the default profile before the Map mods widget
  // has been added; once it exists, its own hotkey setting takes over.
  if (isModuleOn(config, 'map-mods') && !config.widgets.some(w => w.wmType === MAP_MODS_TYPE)) {
    out.push({ shortcut: MAP_CHECK_DEFAULT_KEY, action: { type: 'copy-item', target: MAP_MODS_TARGET, focusOverlay: true } })
  }
  return out
}

// Opt-in widgets (the stash reader, personal.ts) add their hotkeys when turned on.
const extraShortcuts = new Map<string, (widget: Widget) => ShortcutAction[]>()
export function addWidgetShortcuts (wmType: string, fn: (widget: Widget) => ShortcutAction[]) {
  extraShortcuts.set(wmType, fn)
}
export function removeWidgetShortcuts (wmType: string) {
  extraShortcuts.delete(wmType)
}

export function wokeShortcutsFor (widget: Widget, config: { woke?: { setupDone: boolean, off: string[], hideAllHotkey?: string | null }, widgets: Widget[] }): ShortcutAction[] {
  // Modules that are switched off register no hotkeys.
  if (!isWidgetTypeOn(config, widget.wmType)) return []
  if (widget.wmType === SEARCH_TYPE) {
    // Every key is released first: with Ctrl still down, the first letter typed
    // would be Ctrl + R (reload) or Ctrl + W (close).
    const key = (widget as SearchWidget).hotkey
    return key ? [{ shortcut: key, action: { type: 'trigger-event', target: SEARCH_TARGET, focusOverlay: true } }] : []
  }
  if (widget.wmType === REGEX_LIBRARY_TYPE) {
    const lib = widget as RegexLibraryWidget
    if (!lib.enableHotkeys) return []
    return lib.entries
      .filter(entry => entry.hotkey && entry.text)
      .map(entry => ({
        shortcut: entry.hotkey!,
        action: { type: 'stash-search', text: effectiveText(entry) }
      }))
  }
  if (widget.wmType === TRADE_SEARCHES_TYPE) {
    const searches = widget as TradeSearchesWidget
    if (!searches.enableHotkeys) return []
    const actions: ShortcutAction[] = []
    for (const entry of searches.entries) {
      if (!entry.url) continue
      if (entry.hotkeyOverlay) {
        actions.push({
          shortcut: entry.hotkeyOverlay,
          keepModKeys: true,
          action: { type: 'trigger-event', target: hotkeyTarget(widget.wmId, entry.id, 'overlay') }
        })
      }
      if (entry.hotkeyExternal) {
        actions.push({
          shortcut: entry.hotkeyExternal,
          keepModKeys: true,
          action: { type: 'trigger-event', target: hotkeyTarget(widget.wmId, entry.id, 'external') }
        })
      }
    }
    return actions
  }
  if (widget.wmType === LAB_TYPE) {
    const lab = widget as LabWidget
    const actions: ShortcutAction[] = []
    if (lab.hotkeyOverlay) {
      actions.push({ shortcut: lab.hotkeyOverlay, keepModKeys: true, action: { type: 'trigger-event', target: labHotkeyTarget(widget.wmId, 'overlay') } })
    }
    if (lab.hotkeyExternal) {
      actions.push({ shortcut: lab.hotkeyExternal, keepModKeys: true, action: { type: 'trigger-event', target: labHotkeyTarget(widget.wmId, 'external') } })
    }
    return actions
  }
  const extra = extraShortcuts.get(widget.wmType)
  if (extra) return extra(widget)
  if (widget.wmType === CHALLENGES_TYPE) return challengesShortcuts(widget as ChallengesWidget)
  if (widget.wmType === WEALTHY_EXILE_TYPE) return wealthyExileShortcuts(widget as WealthyExileWidget)
  if (widget.wmType === MAP_MODS_TYPE) {
    const mapMods = widget as MapModsWidget
    const actions: ShortcutAction[] = []
    if (mapMods.hotkey) {
      actions.push({ shortcut: mapMods.hotkey, action: { type: 'copy-item', target: MAP_MODS_TARGET, focusOverlay: true } })
    }
    if (mapMods.regexHotkey && mapMods.regexText) {
      actions.push({ shortcut: mapMods.regexHotkey, action: { type: 'stash-search', text: mapMods.regexText } })
    }
    return actions
  }
  if (widget.wmType === FARMING_TYPE) {
    const farming = widget as FarmingWidget
    if (!farming.lootHotkey) return []
    return [{ shortcut: farming.lootHotkey, action: { type: 'copy-item', target: FARMING_LOOT_TARGET } }]
  }
  if (widget.wmType === DROP_COUNTER_TYPE) {
    const counter = widget as DropCounterWidget
    if (!counter.hotkey) return []
    return [{ shortcut: counter.hotkey, action: { type: 'copy-item', target: DROP_COUNTER_TARGET } }]
  }
  if (widget.wmType === MAP_SCAN_TYPE) {
    const scan = widget as MapScanWidget
    const actions: ShortcutAction[] = []
    if (scan.hotkey) {
      actions.push({ shortcut: scan.hotkey, keepModKeys: true, action: { type: 'trigger-event', target: scanHotkeyTarget(widget.wmId) } })
    }
    if (scan.rollHotkey) {
      actions.push({ shortcut: scan.rollHotkey, keepModKeys: true, action: { type: 'trigger-event', target: rollHotkeyTarget(widget.wmId) } })
    }
    return actions
  }
  if (widget.wmType === POB_BUILDS_TYPE) {
    const key = treeHotkeyOf(widget as PobBuildsWidget)
    return key ? [{ shortcut: key, keepModKeys: true, action: { type: 'trigger-event', target: treeHotkeyTarget() } }] : []
  }
  if (widget.wmType === SCARAB_FLIP_TYPE) {
    const key = (widget as ScarabFlipWidget).stashHotkey
    return key ? [{ shortcut: key, keepModKeys: true, action: { type: 'trigger-event', target: stashHotkeyTarget(widget.wmId) } }] : []
  }
  if (widget.wmType === ESSENCE_SCAN_TYPE) {
    const scan = widget as EssenceScanWidget
    const out: ShortcutAction[] = []
    if (scan.hotkey) out.push({ shortcut: scan.hotkey, keepModKeys: true, action: { type: 'trigger-event', target: essenceHotkeyTarget(widget.wmId) } })
    if (scan.onceHotkey) out.push({ shortcut: scan.onceHotkey, keepModKeys: true, action: { type: 'trigger-event', target: essenceOnceTarget(widget.wmId) } })
    return out
  }
  if (widget.wmType === LOOT_FILTER_TYPE) {
    const lf = widget as LootFilterWidget
    const actions: ShortcutAction[] = []
    if (lf.sampleHotkey) {
      // keepModKeys: an item your filter hides only has a ground label while
      // Alt is down; letting go of it before the copy would lose the item.
      actions.push({ shortcut: lf.sampleHotkey, keepModKeys: true, action: { type: 'copy-item', target: LOOT_FILTER_SAMPLE_TARGET, focusOverlay: true } })
    }
    if (lf.editorHotkey) {
      actions.push({ shortcut: lf.editorHotkey, keepModKeys: true, action: { type: 'trigger-event', target: editorHotkeyTarget(widget.wmId), focusOverlay: true } })
    }
    if (lf.reloadHotkey && lf.reloadViaChat) {
      // Every key is released first, so a held Alt can't change what gets typed.
      actions.push({ shortcut: lf.reloadHotkey, action: { type: 'trigger-event', target: reloadHotkeyTarget(widget.wmId) } })
    }
    // Strictness steps only mean something with NeverSink from GitHub.
    if (lf.neversink?.on) {
      if (lf.stricterHotkey) actions.push({ shortcut: lf.stricterHotkey, keepModKeys: true, action: { type: 'trigger-event', target: strictnessHotkeyTarget(widget.wmId, 'stricter') } })
      if (lf.looserHotkey) actions.push({ shortcut: lf.looserHotkey, keepModKeys: true, action: { type: 'trigger-event', target: strictnessHotkeyTarget(widget.wmId, 'looser') } })
    }
    return actions
  }
  if (widget.wmType === CAMPAIGN_TYPE) {
    const c = widget as CampaignWidget
    const actions: ShortcutAction[] = []
    for (const [key, action] of [[c.hotkeyCard, 'card'], [c.hotkeyNext, 'next'], [c.hotkeyPrev, 'prev']] as const) {
      if (key) actions.push({ shortcut: key, keepModKeys: true, action: { type: 'trigger-event', target: campaignHotkeyTarget(widget.wmId, action) } })
    }
    return actions
  }
  if (widget.wmType === RUN_TIMER_TYPE) {
    const t = widget as RunTimerWidget
    const actions: ShortcutAction[] = []
    for (const [key, action] of [[t.hotkeyPause, 'pause'], [t.hotkeySplits, 'splits']] as const) {
      if (key) actions.push({ shortcut: key, keepModKeys: true, action: { type: 'trigger-event', target: timerHotkeyTarget(widget.wmId, action) } })
    }
    return actions
  }
  if (widget.wmType === TRADE_TYPE) {
    // Every key is released before the reply is typed, so a held Ctrl or
    // Alt can't turn the chat line into something else.
    const t = widget as TradeWidget
    const actions: ShortcutAction[] = []
    for (const [key, what] of [[t.stepHotkey, 'step'], [t.busyHotkey, 'busy'], [t.skipHotkey, 'skip']] as const) {
      if (key) actions.push({ shortcut: key, action: { type: 'trigger-event', target: tradeHotkeyTarget(widget.wmId, what) } })
    }
    return actions
  }
  return []
}
