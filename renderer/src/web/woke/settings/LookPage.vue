<template>
  <div :class="$style.page">
    <appearance-settings />

    <w-setting-section title="App icon" hint="Shown in the tray and on the overlay. The exe keeps the Eternal Orb.">
      <div :class="$style.icons">
        <label v-for="i in APP_ICONS" :key="i.id" :class="[$style.icon, { [$style.iconPicked]: appIconId(config.appIcon) === i.id }]">
          <input type="radio" name="woke-app-icon" :value="i.id" :checked="appIconId(config.appIcon) === i.id" class="sr-only" @change="config.appIcon = i.id">
          <img :src="appIconUrl(i.id)" alt="" width="32" height="32">
          <span>{{ i.label }}</span>
        </label>
      </div>
    </w-setting-section>

    <w-setting-section title="Overlay">
      <w-setting-row label="Price check window size" hint="Mainly sizes price check, map check and this settings window, text included.">
        <span class="w-num w-dim">{{ windowPct }}%</span>
        <input id="woke-window-size" type="range" min="10" max="32" step="1" :class="$style.range"
          :value="windowPx" @input="draftPx = Number(($event.target as HTMLInputElement).value)"
          @change="setFontSize(Number(($event.target as HTMLInputElement).value))">
      </w-setting-row>
      <w-setting-row label="Panel opacity" hint="How much of the game shows through panels. Text stays solid.">
        <span class="w-num w-dim">{{ panelOpacity }}%</span>
        <input id="woke-panel-opacity" type="range" :min="MIN_PANEL_OPACITY" :max="MAX_PANEL_OPACITY" step="5" :class="$style.range"
          :value="panelOpacity" @input="panelOpacity = Number(($event.target as HTMLInputElement).value)">
      </w-setting-row>
      <w-setting-row v-if="panelOpacity < MAX_PANEL_OPACITY" label="Solid when the mouse is over a panel" hint="Works while the overlay is open or the mouse is on a dock icon.">
        <w-toggle v-model="panelSolidOnHover" />
      </w-setting-row>
      <w-setting-row label="Darken the game while the overlay is open">
        <span class="w-num w-dim">{{ backdropPct }}%</span>
        <input id="woke-backdrop" type="range" min="0" :max="MAX_BACKDROP" step="5" :class="$style.range"
          :value="backdropPct" @input="setBackdrop(Number(($event.target as HTMLInputElement).value))">
      </w-setting-row>
      <w-setting-row v-if="hasBackdrop" label="Click the dark area to go back to the game">
        <w-toggle v-model="config.overlayBackgroundClose" />
      </w-setting-row>
      <w-setting-row label="Say when the overlay is ready">
        <w-toggle v-model="config.showAttachNotification" />
      </w-setting-row>
      <w-setting-row label="Put back what was on the clipboard">
        <w-toggle v-model="config.restoreClipboard" />
      </w-setting-row>
      <w-setting-row label="Game window title" show-hint hint="Only change this for a renamed game window." restart>
        <w-field v-model="config.windowTitle" />
      </w-setting-row>
    </w-setting-section>

    <dock-settings :config="config" />
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import type { Config } from '@/web/Config'
import { WField, WSettingRow, WSettingSection, WToggle } from '../ui'
import AppearanceSettings from '../ui/AppearanceSettings.vue'
import DockSettings from '../dock/DockSettings.vue'
import { APP_ICONS, appIconId, appIconUrl } from '../ui/app-icon'
import { MAX_PANEL_OPACITY, MIN_PANEL_OPACITY, panelOpacity, panelSolidOnHover } from '../ui/panel-opacity'
import { MAX_BACKDROP, backdropColour, backdropPercent } from '../ui/see-through'

const props = defineProps<{ config: Config }>()

const backdropPct = computed(() => backdropPercent(props.config.overlayBackground))
const hasBackdrop = computed(() => backdropPct.value > 0)
function setBackdrop (pct: number) { props.config.overlayBackground = backdropColour(pct) }
// Stored as the root font size in px (16 = 100%). Applied on release: this
// window resizes with it, so the slider would move under the mouse mid-drag.
const draftPx = shallowRef<number | null>(null)
const windowPx = computed(() => draftPx.value ?? props.config.fontSize)
const windowPct = computed(() => Math.round(windowPx.value / 16 * 100))
function setFontSize (v: number) {
  draftPx.value = null
  if (Number.isFinite(v) && v >= 10 && v <= 32) props.config.fontSize = v
}
</script>

<style module>
.page { display: flex; flex-direction: column; gap: var(--w-s5); }
.range { width: 12rem; accent-color: var(--w-accent); }
.icons { display: grid; grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr)); gap: var(--w-s2); padding: var(--w-s2) 0; }
.icon {
  display: flex; align-items: center; gap: var(--w-s2); padding: var(--w-s2); cursor: pointer; min-width: 0;
  border: 1px solid var(--w-line); border-radius: var(--w-r-md); background: var(--w-panel-2);
  font-size: var(--w-fs-md); line-height: 1.25;
}
.icon img { flex: none; }
.icon:hover { border-color: var(--w-line-strong); }
.icon:focus-within { outline: 1px solid var(--w-accent); }
.iconPicked { border-color: var(--w-accent); box-shadow: inset 0 0 0 1px var(--w-accent); }
</style>
