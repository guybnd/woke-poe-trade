<template>
  <w-setting-section title="Size">
    <w-setting-row label="UI size" hint="Makes everything bigger or smaller together: panels, the price check, pinned things, menus and tooltips. Fine-tune each part below.">
      <span class="w-num w-dim">{{ shownSize }}%</span>
      <input id="woke-ui-size" type="range" :min="MIN_UI_SIZE" :max="MAX_UI_SIZE" :step="UI_SIZE_STEP" :class="$style.range"
        :value="shownSize" @input="draftSize = Number(($event.target as HTMLInputElement).value)"
        @change="setSize(Number(($event.target as HTMLInputElement).value))">
    </w-setting-row>
    <button id="woke-size-fine-tune" type="button" :class="$style.more" :aria-expanded="fineTune" @click="toggleFineTune">
      <i :class="fineTune ? 'fas fa-chevron-down' : 'fas fa-chevron-right'" /> Fine-tune each part
    </button>
    <div v-if="fineTune" :class="$style.parts">
      <w-setting-row label="Text size" hint="Makes text bigger or smaller everywhere. Windows keep their width.">
        <span class="w-num w-dim">{{ textScale }}%</span>
        <input id="woke-text-scale" type="range" :min="MIN_TEXT_SCALE" :max="MAX_TEXT_SCALE" step="5" :class="$style.range"
          :value="textScale" @input="textScale = Number(($event.target as HTMLInputElement).value)">
      </w-setting-row>
      <w-setting-row label="Panel size" hint="Sizes the toolkit's panels, text included.">
        <span class="w-num w-dim">{{ isAuto ? 'Auto' : `${scaleValue}%` }}</span>
        <input id="woke-ui-scale" type="range" :min="MIN_SCALE" :max="MAX_SCALE" step="5" :class="$style.range"
          :value="scaleValue" :disabled="isAuto" @input="uiScale = Number(($event.target as HTMLInputElement).value)">
      </w-setting-row>
      <w-setting-row label="Match the game window" hint="Panel size 100% at 1080p, about 135% at 1440p.">
        <w-toggle :model-value="isAuto" @update:model-value="uiScale = $event ? 'auto' : scaleValue" />
      </w-setting-row>
      <w-setting-row label="Price check window size" hint="Mainly sizes price check, map check and this settings window, text included.">
        <span class="w-num w-dim">{{ windowPct }}%</span>
        <input id="woke-window-size" type="range" min="10" max="32" step="1" :class="$style.range"
          :value="windowPx" @input="draftPx = Number(($event.target as HTMLInputElement).value)"
          @change="setFontSize(Number(($event.target as HTMLInputElement).value))">
      </w-setting-row>
      <w-setting-row label="Pinned size" hint="Sizes what you pinned to stay on screen while you play, apart from the rest.">
        <span class="w-num w-dim">{{ pinScale }}%</span>
        <input id="woke-pin-scale" type="range" :min="MIN_PIN_SCALE" :max="MAX_PIN_SCALE" step="5" :class="$style.range"
          :value="pinScale" @input="pinScale = Number(($event.target as HTMLInputElement).value)">
      </w-setting-row>
    </div>
  </w-setting-section>
</template>

<script setup lang="ts">
// Settings > Look: UI size, and the four sizes it multiplies, folded away.
import { computed, shallowRef } from 'vue'
import type { Config } from '@/web/Config'
import WSettingRow from './WSettingRow.vue'
import WSettingSection from './WSettingSection.vue'
import WToggle from './WToggle.vue'
import { MAX_SCALE, MIN_SCALE, uiScale } from './scale'
import { MAX_TEXT_SCALE, MIN_TEXT_SCALE, textScale } from './text-scale'
import { MAX_UI_SIZE, MIN_UI_SIZE, UI_SIZE_STEP, clampUiSize, uiSize } from './ui-size'
import { MAX_PIN_SCALE, MIN_PIN_SCALE, pinScale } from '../pins/pins'

const props = defineProps<{ config: Config }>()

// UI size and the price check window size both resize this window (the root
// font size), so they apply on release: mid-drag the slider would move under
// the mouse.
const draftSize = shallowRef<number | null>(null)
const shownSize = computed(() => draftSize.value ?? uiSize.value)
function setSize (v: number) {
  draftSize.value = null
  if (Number.isFinite(v)) uiSize.value = clampUiSize(v)
}

const draftPx = shallowRef<number | null>(null)
const windowPx = computed(() => draftPx.value ?? props.config.fontSize)
const windowPct = computed(() => Math.round(windowPx.value / 16 * 100))
function setFontSize (v: number) {
  draftPx.value = null
  if (Number.isFinite(v) && v >= 10 && v <= 32) props.config.fontSize = v
}

const isAuto = computed(() => uiScale.value === 'auto')
// The settings window isn't the game's size, so auto shows as 100% here.
const scaleValue = computed(() => uiScale.value === 'auto' ? 100 : uiScale.value)

const FINE_TUNE_KEY = 'woke.sizeFineTune'
function readFineTune () {
  try { return localStorage.getItem(FINE_TUNE_KEY) === '1' } catch { return false }
}
const fineTune = shallowRef(readFineTune())
function toggleFineTune () {
  fineTune.value = !fineTune.value
  try { localStorage.setItem(FINE_TUNE_KEY, fineTune.value ? '1' : '0') } catch {}
}
</script>

<style module>
.range { width: 12rem; accent-color: var(--w-accent); }
.more {
  display: inline-flex; align-items: center; gap: var(--w-s2); padding: var(--w-s2) 0;
  font-size: var(--w-fs-md); color: var(--w-accent);
}
.more i { width: 10px; font-size: calc(10px * var(--w-text-scale, 1)); }
.more:hover { color: var(--w-fg); }
.more:focus-visible { outline: 1px solid var(--w-accent); }
.parts { padding-left: var(--w-s4); border-left: 1px solid var(--w-line); }
</style>
