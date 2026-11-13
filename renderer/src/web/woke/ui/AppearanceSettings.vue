<template>
  <w-setting-section title="Theme">
    <div :class="$style.themes">
      <label v-for="t in LOOKS" :key="t.id" class="w-slot" :class="[$style.option, { [$style.picked]: isPicked(t) }]">
        <input type="radio" name="woke-theme" :value="t.id" :checked="isPicked(t)" class="sr-only" @change="pick(t)">
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
  <w-setting-section title="App colours">
    <w-setting-row label="Own colours for the app" hint="Settings, the tab bar and the dock in colours you pick. Tool panels keep the theme.">
      <w-toggle :model-value="appColors != null" @update:model-value="appColors = $event ? { ...DEFAULT_APP_COLORS } : null" />
    </w-setting-row>
    <template v-if="appColors">
      <w-setting-row label="Presets" stack>
        <div :class="$style.presets">
          <button v-for="p in APP_COLOR_PRESETS" :key="p.id" type="button" class="w-chip" :class="{ on: sameColors(appColors, p.colors) }"
            :aria-pressed="sameColors(appColors, p.colors)" @click="appColors = { ...p.colors }">
            <span :class="$style.dot" :style="{ background: `linear-gradient(135deg, ${p.colors.panel} 50%, ${p.colors.accent} 50%)` }" />{{ p.label }}
          </button>
        </div>
      </w-setting-row>
      <w-setting-row v-for="c in COLOUR_PICKS" :key="c.key" :label="c.label">
        <span class="w-num w-dim">{{ appColors[c.key] }}</span>
        <input type="color" :value="appColors[c.key]" :class="$style.colour" :aria-label="c.label"
          @input="setColour(c.key, ($event.target as HTMLInputElement).value)">
      </w-setting-row>
    </template>
  </w-setting-section>
</template>

<script lang="ts">
export default {
  name: 'Appearance'
}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { WOKE_LOOKS, isLookPicked, pickLook } from './theme'
import { MAX_SCALE, MIN_SCALE, uiScale } from './scale'
import { MAX_TEXT_SCALE, MIN_TEXT_SCALE, textScale } from './text-scale'
import { MAX_PIN_SCALE, MIN_PIN_SCALE, pinScale } from '../pins/pins'
import WSettingRow from './WSettingRow.vue'
import WSettingSection from './WSettingSection.vue'
import WToggle from './WToggle.vue'
import WSegmented from './WSegmented.vue'
import { density } from './density'
import type { Density } from './density'
import { appColors, APP_COLOR_PRESETS, DEFAULT_APP_COLORS, sameColors } from './app-colors'
import type { AppColors } from './app-colors'

const LOOKS = WOKE_LOOKS
const isPicked = isLookPicked
const pick = pickLook

const DENSITIES = [{ value: 'comfortable', label: 'Comfortable' }, { value: 'compact', label: 'Compact' }]

const COLOUR_PICKS: Array<{ key: keyof AppColors, label: string }> = [
  { key: 'accent', label: 'Accent' },
  { key: 'panel', label: 'Background' },
  { key: 'fg', label: 'Text' }
]
function setColour (key: keyof AppColors, value: string) {
  if (appColors.value) appColors.value = { ...appColors.value, [key]: value }
}

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
/* The game look: each theme sits in a bag slot (poe-content.css); the picked one is lit like a highlighted item. */
:global([data-woke-art]) .option:hover { border-color: #6b5434; }
:global([data-woke-art]) .picked, :global([data-woke-art]) .picked:hover {
  border-color: #a8834c; box-shadow: inset 0 0 0 1px #000, inset 0 0 14px rgba(168, 131, 76, 0.35);
}
.text { display: flex; flex-direction: column; line-height: 1.3; font-size: var(--w-fs-md); min-width: 0; }
.hint { font-size: var(--w-fs-sm); }
.range { width: 12rem; accent-color: var(--w-accent); }
.presets { display: flex; flex-wrap: wrap; gap: var(--w-s1); }
.dot { width: 12px; height: 12px; border-radius: 50%; border: 1px solid var(--w-line-strong); margin-right: 6px; flex: none; }
.colour { width: 34px; height: 22px; padding: 0; border: 1px solid var(--w-line-strong); border-radius: var(--w-r-sm); background: none; cursor: pointer; }
.swatch { width: 34px; height: 22px; border-radius: var(--w-r-sm); flex: none; border: 1px solid var(--w-line-strong); }
.swatch[data-theme="hybrid"] { background: linear-gradient(135deg, #13110f 55%, #d4a64a 55%); }
.swatch[data-theme="native"] { background: linear-gradient(135deg, #0e0b08 55%, #8a6a3a 55%); }
.swatch[data-theme="modern"] { background: linear-gradient(135deg, #111216 55%, #9aa8ff 55%); }
.swatch[data-theme="classic"] { background: linear-gradient(135deg, #1a202c 55%, #4a5568 55%); }
/* PoE 1 and PoE 2 preview with their own title bar and coin. */
.swatch[data-theme="poe1"] { background: url("/images/poe-ui/checkbox-on.png") right 2px center / 16px no-repeat, url("/images/poe-ui/titlebar-middle.png") center / auto 100%; }
.swatch[data-theme="poe2"] { background: url("/images/poe2-ui/checkbox-on.png") right 2px center / 16px no-repeat, url("/images/poe2-ui/titlebar-middle.png") center / auto 100%; }
</style>
