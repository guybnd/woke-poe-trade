<template>
  <DockItem id="whats-new" icon="fas fa-gift" :art="null" title="What's new" :show="lines.length > 0"
    :badge="lines.length" :wake="lines.length" card-width="24rem" pinnable :menu="dockMenu">
    <template #card>
      <div :class="$style.body" data-no-item-tip="Tool names, not items">
        <div v-for="n in lines" :key="n.id" :class="$style.line" data-whats-new-line>
          <div :class="$style.text">
            <span :class="$style.name">{{ n.name }}</span>
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
import type { WidgetManager } from '@/web/overlay/interfaces'
import { AppConfig, pushHostConfig } from '@/web/Config'
import { ensureWokeConfig, isWidgetTypeOn } from '../modules'
import { markNewsSeen, unseenNews } from '../tab-bar/news'
import type { NewsItem } from '../tab-bar/news'
import { WButton } from '../ui'
import { personalOn } from '../personal'
import DockItem from './DockItem.vue'
import { openSettingsPage, showWithOverlay } from './dock'
import type { DockMenuAction } from './dock'

const wm = inject<WidgetManager>('wm')!
const lines = computed(() => unseenNews(AppConfig().woke))
// "New: a Planner tab…" reads "A Planner tab…" under the tool's name.
function sentence (note: string) {
  const s = note.replace(/^New: /, '')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function markSeen (items: NewsItem[]) {
  markNewsSeen(ensureWokeConfig(AppConfig()).woke, items.map(n => n.id))
}

// Its window, placed first if it isn't yet. A tool that's off (Net worth's
// reader too) goes to its switch in Settings, which asks first where it should.
function show (n: NewsItem) {
  markSeen([n])
  const off = !isWidgetTypeOn(AppConfig(), n.wmType) || (n.wmType === 'woke-net-worth' && !personalOn.value)
  if (n.settingsPage || off) {
    openSettingsPage(wm, n.settingsPage ?? 'All modules')
    return
  }
  let w = wm.widgets.value.find(w => w.wmType === n.wmType)
  if (!w) {
    wm.create(n.wmType)
    w = wm.widgets.value.reduce((a, b) => (a.wmId > b.wmId ? a : b))
  }
  const wmId = w.wmId
  nextTick(() => nextTick(() => {
    showWithOverlay(wm, wmId)
    pushHostConfig()
  }))
}

const dockMenu = computed<DockMenuAction[]>(() => [
  { label: 'Dismiss all', icon: 'fas fa-check', action: () => { markSeen(lines.value) } }
])
</script>

<style module>
.body { display: flex; flex-direction: column; gap: 6px; padding: 6px var(--w-pad) 8px; }
.line { display: flex; align-items: center; gap: 4px; }
.text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.name { color: var(--w-accent); font-family: var(--w-head); letter-spacing: var(--w-head-track); }
.foot { display: flex; align-items: center; gap: 6px; justify-content: space-between; }
</style>
