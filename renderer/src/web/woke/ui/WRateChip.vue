<template>
  <!-- A map mod's rating as a word chip: Bad (red), Care (yellow), Want (green),
       "–" when not rated. The one look on every screen that rates mods.
       Click steps to the next rating, right-click picks one. -->
  <button v-if="clickable" type="button" class="w-rate" :class="`w-rate--${rating}`" :title="title"
    :aria-label="`Rating: ${RATE_TITLE[rating]}. Click for ${RATE_TITLE[next]}`" :data-map-rate="rating"
    @click.stop="emit('rate', next)" @contextmenu.stop.prevent="pick">{{ RATE_WORD[rating] }}</button>
  <span v-else class="w-rate" :class="`w-rate--${rating}`" :title="RATE_TITLE[rating]" :data-map-rate="rating">{{ RATE_WORD[rating] }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { nextModRating, RATE_TITLE, RATE_WORD } from '../map-mods/rules'
import type { ModRating } from '../map-mods/rules'
import { openMenu } from './layer'

const props = withDefaults(defineProps<{
  rating: ModRating
  clickable?: boolean
  // The profile a change is saved to, named on hover.
  saveTo?: string
}>(), { clickable: true, saveTo: '' })
const emit = defineEmits<{ (e: 'rate', rating: ModRating): void }>()

const next = computed(() => nextModRating(props.rating))
const title = computed(() => `${RATE_TITLE[props.rating]}. Click for the next: Bad, Care, Want, none; right-click to pick${props.saveTo ? `. Saved to ${props.saveTo}` : ''}.`)

const ORDER: ModRating[] = ['deadly', 'warn', 'good', 'ok']
function pick (e: MouseEvent) {
  openMenu(e, ORDER.map(r => ({
    label: r === 'ok' ? 'Not rated' : RATE_WORD[r],
    icon: r === props.rating ? 'fas fa-check' : undefined,
    action: () => { if (r !== props.rating) emit('rate', r) }
  })))
}
</script>

<style>
.w-rate { flex: none; display: inline-block; width: 3.4em; padding: 0 2px; text-align: center; font-size: var(--w-fs-xs); line-height: 1.5;
  border: 1px solid transparent; border-radius: var(--w-r-sm); color: var(--w-dim); background: none; white-space: nowrap; }
button.w-rate { cursor: pointer; }
button.w-rate:hover, button.w-rate:focus-visible { border-color: var(--w-line-strong); color: var(--w-fg); outline: none; }
.w-rate--deadly { color: var(--w-down); border-color: color-mix(in srgb, var(--w-down) 55%, transparent); background: color-mix(in srgb, var(--w-down) 14%, transparent); }
.w-rate--warn { color: var(--w-warn); border-color: color-mix(in srgb, var(--w-warn) 55%, transparent); background: color-mix(in srgb, var(--w-warn) 14%, transparent); }
.w-rate--good { color: var(--w-up); border-color: color-mix(in srgb, var(--w-up) 55%, transparent); background: color-mix(in srgb, var(--w-up) 14%, transparent); }
button.w-rate--deadly:hover { color: var(--w-down); }
button.w-rate--warn:hover { color: var(--w-warn); }
button.w-rate--good:hover { color: var(--w-up); }
</style>
