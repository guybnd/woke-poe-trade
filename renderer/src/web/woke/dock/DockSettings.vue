<template>
  <w-setting-section title="Icon row">
    <div class="w-dim flex items-center gap-2" :class="$style.intro">
      How the icons work
      <w-info text="Small icons show while you play. Rest the mouse on one for its card. Right-click for its menu. Click one for its full window. With the overlay open, drag the row by its grip." />
    </div>
    <w-setting-row label="Open cards on hover" hint="Off: clicking an icon opens its card, and the card's Open row opens the full window.">
      <w-toggle :model-value="dock.hoverOpens !== false" @update:model-value="dock.hoverOpens = $event" />
    </w-setting-row>
    <w-setting-row label="Peek" hint="An icon grows into one line for 5 seconds when something happens: new zone, live search hit, map counted (with the glance bar off).">
      <w-toggle v-model="dock.peeks" />
    </w-setting-row>
    <w-setting-row label="What's new after updates" hint="Off: no What's new icon, no NEW seals in All tools, no count on the rail.">
      <w-toggle :model-value="!woke.newsOff" @update:model-value="setNewsOff(woke, !$event)" />
    </w-setting-row>
    <w-setting-row label="Tips" hint="A short line at the foot of a window or a tooltip for a key or click you might not know. Each one goes once you've used it. Never in a map.">
      <div class="flex items-center gap-2">
        <w-toggle :model-value="!woke.hints?.off" @update:model-value="setTipsOff(!$event)" />
        <w-button v-if="tipsUsed" size="sm" @click="tipsAgain">Show tips again</w-button>
      </div>
    </w-setting-row>
    <w-setting-row label="Stand the row on its side">
      <w-toggle v-model="dock.vertical" />
    </w-setting-row>
    <w-setting-row label="Position" hint="Default: right of the stash, at the top.">
      <w-button size="sm" @click="resetPosition">Move back</w-button>
    </w-setting-row>
    <div :class="$style.table">
      <div :class="[$style.trow, $style.thead]"><span>Icon</span><span>Show</span><span>Peek</span></div>
      <div v-for="id in rows" :key="id" :class="$style.trow">
        <span>{{ dockListName(id) }}</span>
        <w-toggle :model-value="!dock.hidden.includes(id)" @update:model-value="toggle(dock.hidden, id)" />
        <w-toggle :model-value="!dock.noPeek.includes(id)" :disabled="!dock.peeks || dock.hidden.includes(id)" @update:model-value="toggle(dock.noPeek, id)" />
      </div>
    </div>
  </w-setting-section>
</template>

<script lang="ts">
export default {
  name: 'Icon row'
}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import type { Config } from '@/web/Config'
import { WButton, WInfo, WSettingRow, WSettingSection, WToggle } from '../ui'
import { ensureWokeConfig, isWidgetTypeOn } from '../modules'
import { DEFAULT_DOCK, DOCK_ORDER, dockListName } from './dock'
import { setNewsOff } from '../tab-bar/news-off'
import type { DockConfig } from './dock'

// `config` is the settings window's working copy; changes apply as you make them.
const props = defineProps<{ config: Config }>()

function ensureDock (): DockConfig {
  const woke = ensureWokeConfig(props.config).woke
  woke.dock ??= { ...DEFAULT_DOCK, noPeek: [], hidden: [], dismissed: {} }
  woke.dock.noPeek ??= []
  woke.dock.hidden ??= []
  return woke.dock
}
ensureDock()

// Tips (shared/hints.ts), on the working copy like the rest of this page.
const tipsUsed = computed(() => !!(woke.value.hints?.done?.length || Object.keys(woke.value.hints?.shows ?? {}).length))
function setTipsOff (off: boolean) {
  const w = ensureWokeConfig(props.config).woke
  w.hints = { ...w.hints, off: off || undefined }
}
function tipsAgain () {
  const w = ensureWokeConfig(props.config).woke
  w.hints = { off: w.hints?.off }
}
const dock = computed<DockConfig>(() => props.config.woke?.dock ?? ensureDock())
const woke = computed(() => ensureWokeConfig(props.config).woke)
// Net worth comes with the opt-in stash reader: listed only while that's on.
const rows = computed(() => DOCK_ORDER.filter(id => id !== 'net-worth' || isWidgetTypeOn(props.config, 'woke-net-worth')))

function toggle (list: string[], id: string) {
  const i = list.indexOf(id)
  if (i >= 0) list.splice(i, 1)
  else list.push(id)
}

function resetPosition () {
  dock.value.x = DEFAULT_DOCK.x
  dock.value.y = DEFAULT_DOCK.y
  dock.value.vertical = false
}
</script>

<style module>
.intro { font-size: var(--w-fs-sm); padding: var(--w-s2) 0; }
.table { display: flex; flex-direction: column; padding-top: var(--w-s2); }
.trow {
  display: grid; grid-template-columns: minmax(0, 1fr) 4rem 4rem; align-items: center;
  min-height: var(--w-row-h); border-bottom: 1px solid var(--w-line-soft); font-size: var(--w-fs-md);
}
.thead { color: var(--w-dim); font-size: var(--w-fs-caps); text-transform: var(--w-caps-case); letter-spacing: 0.06em; font-family: var(--w-caps-face); }
</style>
