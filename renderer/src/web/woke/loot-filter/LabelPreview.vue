<template>
  <span :class="$style.wrap">
    <span :class="[$style.label, { [$style.hidden]: visibility === 'Hide' }]" :style="labelStyle">{{ text }}</span>
    <span v-if="extras && visibility !== 'Hide'" :class="$style.extras">
      <span v-if="style.effect" :title="`Beam: ${style.effect.color}${style.effect.temp ? ' (temporary)' : ''}`" :class="$style.beam" :style="{ background: poeColour(style.effect.color) }" />
      <span v-if="style.icon" :title="`Minimap: ${style.icon.color} ${style.icon.shape}`" :style="{ color: poeColour(style.icon.color) }">{{ shapeGlyph(style.icon.shape) }}</span>
      <span v-if="style.sound" :title="`${soundLabel(style.sound.id)}, volume ${style.sound.volume}`" class="w-dim">
        <i :class="isCustomSound(style.sound.id) ? 'fas fa-music' : 'fas fa-volume-up'" /><template v-if="!isCustomSound(style.sound.id)"> {{ style.sound.id }}</template>
      </span>
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FilterAction } from './parse'
import { DEFAULT_BG, DEFAULT_FONT, DEFAULT_TEXT, readStyle } from './edits'
import type { Colour, StylePatch } from './edits'
import { cssColour as css } from './label-style'
import { poeColour, shapeGlyph } from './colours'
import { isCustomSound, soundLabel } from './sounds'

const props = withDefaults(defineProps<{
  text: string
  actions?: FilterAction[]
  styleOverride?: StylePatch
  visibility?: 'Show' | 'Hide' | 'Minimal'
  extras?: boolean
  // Scale: 1 for list rows, larger for the main preview.
  scale?: number
  // The game's colour for the item when no rule sets one (rarity, class).
  defaultText?: Colour
}>(), { actions: () => [], styleOverride: undefined, visibility: 'Show', extras: true, scale: 1, defaultText: undefined })

const style = computed<StylePatch>(() => ({ ...readStyle(props.actions), ...(props.styleOverride ?? {}) }))

const labelStyle = computed(() => {
  const s = style.value
  // Game font sizes run 18-45 (default 32).
  const size = s.fontSize ?? DEFAULT_FONT
  const px = (9 + (size - 18) * 0.28) * props.scale
  return {
    color: css(s.text ?? props.defaultText ?? DEFAULT_TEXT),
    background: css(s.background ?? DEFAULT_BG),
    borderColor: s.border ? css(s.border) : 'transparent',
    fontSize: `${px.toFixed(1)}px`
  }
})
</script>

<style module>
.wrap {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.label {
  display: inline-block;
  padding: 1px 7px;
  border: 1px solid transparent;
  font-family: FontinSmallCaps, FrizQuadrataC, Georgia, serif;
  white-space: nowrap;
  line-height: 1.35;
}
.hidden {
  opacity: 0.45;
  text-decoration: line-through;
}
.extras {
  display: inline-flex;
  white-space: nowrap;
  align-items: center;
  gap: 6px;
  font-size: var(--w-fs-sm);
}
.beam {
  display: inline-block;
  width: 3px;
  height: 14px;
  border-radius: var(--w-r-sm);
}
</style>
