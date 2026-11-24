<template>
  <DockItem id="whats-new" icon="fas fa-gift" :art="gameIcon(DOCK_ART_ITEMS.whatsNew)" title="What's new" :show="lines.length > 0"
    :badge="lines.length" :wake="lines.length" card-width="24rem" pinnable :menu="dockMenu">
    <template #card>
      <div :class="$style.body">
        <div v-for="n in lines" :key="n.id" :class="$style.line" data-whats-new-line>
          <div :class="$style.text">
            <span :class="$style.name" data-no-item-tip="A tool's name, not an item"><ToolIcon :art="artFor(n.wmType)" :icon="iconFor(n.wmType)" :class="$style.toolIcon" />{{ n.name }}</span>
            <span>{{ sentence(n.note) }}</span>
          </div>
          <w-button size="sm" variant="ghost" data-whats-new-show @click="show(n)">Show me</w-button>
          <w-button size="sm" variant="ghost" icon="fas fa-times" title="Dismiss" data-whats-new-dismiss @click="markSeen([n])" />
        </div>
        <div :class="$style.foot">
          <span class="w-faint text-xs">With the overlay open, click the icon to keep this card up.</span>
          <w-button size="sm" variant="ghost" data-whats-new-dismiss-all @click="markSeen(lines)">Dismiss all</w-button>
        </div>
      </div>
    </template>
  </DockItem>
</template>

<script setup lang="ts">
// After an update, the dock lists what's new until each line is dismissed or
// shown (tab-bar/news.ts). A fresh install has seen it all, so it never shows there.
import { computed, inject, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { registry } from '@/web/overlay/widget-registry'
import type { WidgetManager } from '@/web/overlay/interfaces'
import { AppConfig, pushHostConfig, saveConfigQuietly } from '@/web/Config'
import { MODULES, ensureWokeConfig, isWidgetTypeOn, setModuleOn } from '../modules'
import { markNewsSeen, unseenNews } from '../tab-bar/news'
import type { NewsItem } from '../tab-bar/news'
import { WButton } from '../ui'
import { DOCK_ART_ITEMS, gameIcon } from '../ui/game-icons'
// Each line's title shows its tool's icon, as All tools and the dock do.
import ToolIcon from '../tab-bar/ToolIcon.vue'
import { artFor, iconFor } from '../tab-bar/tools'
import { personalOn } from '../personal'
import { requestGoto } from '../tab-bar/goto'
import DockItem from './DockItem.vue'
import { openSettingsPage, showWithOverlay } from './dock'
import { moduleSettingsPage } from '../tab-bar/tools'
import type { DockMenuAction } from './dock'

const wm = inject<WidgetManager>('wm')!
const { t } = useI18n()
// The tool's name as Settings lists it (TabBar's typeName).
function typeName (wmType: string): string {
  const spec = registry.widgets.find(w => w.widget.type === wmType)?.widget
  return spec?.trNameKey ? t(spec.trNameKey) : wmType
}
const lines = computed(() => unseenNews(AppConfig().woke))
// "New: a Planner tab…" reads "A Planner tab…" under the tool's name.
function sentence (note: string) {
  const s = note.replace(/^New: /, '')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Saved now: a click in game (its menu, a pinned card) has no blur to save
// on, and an open Settings window holds back the usual save.
function markSeen (items: NewsItem[]) {
  markNewsSeen(ensureWokeConfig(AppConfig()).woke, items.map(n => n.id))
  saveConfigQuietly()
}

// Its window on the line's tab, placed first if it isn't yet. A switched-off
// tool is turned on, as the launcher does. Net worth's reader goes to its
// switch in Settings instead, since turning it on asks first.
function show (n: NewsItem) {
  markSeen([n])
  if (!n.settingsPage && n.wmType !== 'woke-net-worth' && !isWidgetTypeOn(AppConfig(), n.wmType)) {
    const config = ensureWokeConfig(AppConfig())
    for (const m of MODULES) if (m.widgetTypes.includes(n.wmType)) setModuleOn(config, m.id, true)
  }
  const off = !isWidgetTypeOn(AppConfig(), n.wmType) || (n.wmType === 'woke-net-worth' && !personalOn.value)
  if (n.settingsPage || off) {
    openSettingsPage(wm, n.settingsPage ?? 'All modules')
    return
  }
  let w = wm.widgets.value.find(w => w.wmType === n.wmType)
  // A dock-only tool has no window: its own page in Settings, as the rail does.
  if (w?.wmFlags.includes('menu::skip')) {
    openSettingsPage(wm, moduleSettingsPage(n.wmType, typeName))
    return
  }
  if (!w) {
    wm.create(n.wmType)
    w = wm.widgets.value.reduce((a, b) => (a.wmId > b.wmId ? a : b))
    forgetRailSlot(w.wmId)
  }
  const wmId = w.wmId
  // On the tab the line is about (goto.ts).
  if (n.goto) requestGoto(wmId, n.goto)
  nextTick(() => nextTick(() => {
    showWithOverlay(wm, wmId)
    pushHostConfig()
  }))
}

// Ids get reused: a removed window's rail pin and label mustn't carry over
// (as TabBar's placeNew does).
function forgetRailSlot (wmId: number) {
  const rail = AppConfig().widgets.find(w => w.wmType === 'menu') as { pinned?: number[], labels?: Record<number, string> } | undefined
  if (!rail) return
  if (rail.pinned) rail.pinned = rail.pinned.filter(id => id !== wmId)
  if (rail.labels?.[wmId] != null) rail.labels = Object.fromEntries(Object.entries(rail.labels).filter(([id]) => Number(id) !== wmId))
}

const dockMenu = computed<DockMenuAction[]>(() => [
  { label: 'Dismiss all', icon: 'fas fa-check', action: () => { markSeen(lines.value) } }
])
</script>

<style module>
.body { display: flex; flex-direction: column; gap: 6px; padding: 6px var(--w-pad) 8px; }
.line { display: flex; align-items: center; gap: 4px; }
.text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.toolIcon { --w-icon-md: 16px; --w-fs-lg: var(--w-fs-md); }
.name { display: flex; align-items: center; gap: 5px; color: var(--w-accent); font-family: var(--w-head); letter-spacing: var(--w-head-track); }
.foot { display: flex; align-items: center; gap: 6px; justify-content: space-between; }
</style>
