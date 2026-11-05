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

    <w-setting-section title="Text and overlay">
      <w-setting-row label="Text size" hint="Sizes APT's windows and this one. The toolkit's panels follow Panel size above.">
        <w-field :model-value="config.fontSize" type="number" suffix="px" :class="$style.num"
          @update:model-value="setFontSize(Number($event))" />
      </w-setting-row>
      <w-setting-row label="Darken the game while the overlay is open">
        <w-toggle :model-value="hasBackdrop" @update:model-value="setBackdrop($event)" />
      </w-setting-row>
      <w-setting-row v-if="hasBackdrop" label="Click the dark area to go back to the game">
        <w-toggle v-model="config.overlayBackgroundClose" />
      </w-setting-row>
      <w-setting-row label="Say when the overlay is ready" hint="A short note after the game starts.">
        <w-toggle v-model="config.showAttachNotification" />
      </w-setting-row>
      <w-setting-row label="Put back what was on the clipboard" hint="After price check copies an item.">
        <w-toggle v-model="config.restoreClipboard" />
      </w-setting-row>
      <w-setting-row label="Game window title" hint="Only change this for a renamed game window." restart>
        <w-field v-model="config.windowTitle" />
      </w-setting-row>
    </w-setting-section>

    <dock-settings :config="config" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Config } from '@/web/Config'
import { WField, WSettingRow, WSettingSection, WToggle } from '../ui'
import AppearanceSettings from '../ui/AppearanceSettings.vue'
import DockSettings from '../dock/DockSettings.vue'
import { APP_ICONS, appIconId, appIconUrl } from '../ui/app-icon'

const props = defineProps<{ config: Config }>()

const NO_BACKDROP = 'rgba(255, 255, 255, 0)'
const DEFAULT_BACKDROP = 'rgba(129, 139, 149, 0.15)'
const hasBackdrop = computed(() => props.config.overlayBackground !== NO_BACKDROP)
function setBackdrop (on: boolean) { props.config.overlayBackground = on ? DEFAULT_BACKDROP : NO_BACKDROP }
function setFontSize (v: number) {
  if (Number.isFinite(v) && v >= 10 && v <= 32) props.config.fontSize = v
}
</script>

<style module>
.page { display: flex; flex-direction: column; gap: var(--w-s5); }
.num { width: 5.5rem; }
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
