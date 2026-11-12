<template>
  <w-setting-section title="Theme">
    <div :class="$style.themes">
      <label v-for="t in WOKE_THEMES" :key="t.id" :class="[$style.option, { [$style.picked]: wokeTheme === t.id }]">
        <input type="radio" name="woke-theme" :value="t.id" :checked="wokeTheme === t.id" class="sr-only" @change="wokeTheme = t.id">
        <span :class="$style.swatch" :data-theme="t.id" />
        <span :class="$style.text">
          <span>{{ t.label }}</span>
          <span class="w-dim" :class="$style.hint">{{ t.hint }}</span>
        </span>
      </label>
    </div>
    <w-setting-row label="Text size" hint="Makes text bigger or smaller everywhere. Windows keep their width.">
      <span class="w-num w-dim">{{ textScale }}%</span>
      <input id="woke-text-scale" type="range" :min="MIN_TEXT_SCALE" :max="MAX_TEXT_SCALE" step="5" :class="$style.range"
        :value="textScale" @input="textScale = Number(($event.target as HTMLInputElement).value)">
    </w-setting-row>
    <w-setting-row label="Panel size" hint="Sizes the toolkit's panels, text included.">
      <span class="w-num w-dim">{{ isAuto ? 'Auto' : `${scaleValue}%` }}</span>
      <input id="woke-ui-scale" type="range" :min="MIN_SCALE" :max="MAX_SCALE" step="5" :class="$style.range"
        :value="scaleValue" :disabled="isAuto" @input="setScale(($event.target as HTMLInputElement).value)">
    </w-setting-row>
    <w-setting-row label="Pinned size" hint="Sizes what you pinned to stay on screen while you play, apart from the rest.">
      <span class="w-num w-dim">{{ pinScale }}%</span>
      <input id="woke-pin-scale" type="range" :min="MIN_PIN_SCALE" :max="MAX_PIN_SCALE" step="5" :class="$style.range"
        :value="pinScale" @input="pinScale = Number(($event.target as HTMLInputElement).value)">
    </w-setting-row>
    <w-setting-row label="Match the game window" hint="100% at 1080p, about 135% at 1440p.">
      <w-toggle :model-value="isAuto" @update:model-value="uiScale = $event ? 'auto' : scaleValue" />
    </w-setting-row>
    <w-setting-row label="Row density" :hint="density === 'compact' ? '24 px rows, more on screen at 1440p and up.' : '28 px rows, easiest to hit mid-map.'">
      <w-segmented :model-value="density" :options="DENSITIES" @update:model-value="density = $event as Density" />
    </w-setting-row>
  </w-setting-section>
</template>

<script lang="ts">
export default {
  name: 'Appearance'
}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { wokeTheme, WOKE_THEMES } from './theme'
import { MAX_SCALE, MIN_SCALE, uiScale } from './scale'
import { MAX_TEXT_SCALE, MIN_TEXT_SCALE, textScale } from './text-scale'
import { MAX_PIN_SCALE, MIN_PIN_SCALE, pinScale } from '../pins/pins'
import WSettingRow from './WSettingRow.vue'
import WSettingSection from './WSettingSection.vue'
import WToggle from './WToggle.vue'
import WSegmented from './WSegmented.vue'
import { density } from './density'
import type { Density } from './density'

const DENSITIES = [{ value: 'comfortable', label: 'Comfortable' }, { value: 'compact', label: 'Compact' }]

const isAuto = computed(() => uiScale.value === 'auto')
// The settings window isn't the game's size, so auto shows as 100% here.
const scaleValue = computed(() => uiScale.value === 'auto' ? 100 : uiScale.value)
function setScale (v: string) {
  uiScale.value = Number(v)
}
</script>

<style module>
.themes { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--w-s2); padding: var(--w-s2) 0; }
.option {
  display: flex; align-items: center; gap: var(--w-s3); padding: var(--w-s2); cursor: pointer;
  border: 1px solid var(--w-line); border-radius: var(--w-r-md); background: var(--w-panel-2);
}
.option:hover { border-color: var(--w-line-strong); }
.picked { border-color: var(--w-accent); box-shadow: inset 0 0 0 1px var(--w-accent); }
.option:focus-within { outline: 1px solid var(--w-accent); }
.text { display: flex; flex-direction: column; line-height: 1.3; font-size: var(--w-fs-md); min-width: 0; }
.hint { font-size: var(--w-fs-sm); }
.range { width: 12rem; accent-color: var(--w-accent); }
.swatch { width: 34px; height: 22px; border-radius: var(--w-r-sm); flex: none; border: 1px solid var(--w-line-strong); }
.swatch[data-theme="hybrid"] { background: linear-gradient(135deg, #13110f 55%, #d4a64a 55%); }
.swatch[data-theme="native"] { background: linear-gradient(135deg, #0e0b08 55%, #8a6a3a 55%); }
.swatch[data-theme="modern"] { background: linear-gradient(135deg, #111216 55%, #9aa8ff 55%); }
.swatch[data-theme="classic"] { background: linear-gradient(135deg, #1a202c 55%, #4a5568 55%); }
</style>
