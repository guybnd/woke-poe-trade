<template>
  <img v-if="url && !failed" :src="url" :alt="label" :title="label" :class="['w-game-icon', $style.icon]" :style="box"
    loading="lazy" draggable="false" @error="failed = true">
  <i v-else-if="fa" :class="[fa, $style.fa]" :style="box" :title="label" />
  <span v-else :class="$style.blank" :style="box" :title="label" />
</template>

<script setup lang="ts">
// Game art for currency, items, gems and league mechanics (P18). Pass one of
// `currency`, `item` (+ `ns`), `mechanic` or a direct `src`. Sizes follow the
// icon grid: sm 16, md 20, lg 24. Falls back to a Font Awesome icon if the art
// is missing or fails to load, or an empty box of the same size so rows stay aligned.
import { computed, ref, watch } from 'vue'
import type { BaseType } from '@/assets/data/interfaces'
import { CURRENCY_ICONS, gameIcon, mechanicIcon } from './game-icons'

const props = withDefaults(defineProps<{
  currency?: string
  item?: string
  ns?: BaseType['namespace']
  mechanic?: string
  src?: string
  size?: 'sm' | 'md' | 'lg'
  title?: string
  fallback?: string
}>(), { currency: undefined, item: undefined, ns: 'ITEM', mechanic: undefined, src: undefined, size: 'sm', title: undefined, fallback: undefined })

const failed = ref(false)
const resolved = computed(() => {
  if (props.src) return { src: props.src, fa: props.fallback }
  if (props.currency) return { src: CURRENCY_ICONS[props.currency] ?? gameIcon(props.currency), fa: props.fallback }
  if (props.item) return { src: gameIcon(props.item, props.ns), fa: props.fallback }
  if (props.mechanic) { const m = mechanicIcon(props.mechanic); return { src: m.src, fa: props.fallback ?? m.fa } }
  return { src: null, fa: props.fallback }
})
watch(() => resolved.value.src, () => { failed.value = false })

const url = computed(() => resolved.value.src)
const fa = computed(() => resolved.value.fa)
const label = computed(() => props.title ?? props.item ?? props.currency ?? props.mechanic ?? '')
const box = computed(() => {
  const v = `var(--w-icon-${props.size})`
  return { width: v, height: v }
})
</script>

<style module>
.icon { display: inline-block; vertical-align: middle; }
.blank { display: inline-block; flex: none; }
/* Doubled so it beats Font Awesome's own display on .fas, which leaves the glyph in the box's top left. */
.fa.fa { display: inline-grid; place-items: center; font-size: calc(var(--w-icon-sm) * 0.75); color: var(--w-dim); flex: none; }
</style>
