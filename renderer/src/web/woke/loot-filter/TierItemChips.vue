<template>
  <div class="flex flex-wrap gap-1">
    <span v-for="b in items" :key="b" :class="$style.chipWrap">
      <WChip clickable :active="picked.includes(b)" :draggable="draggable ? 'true' : undefined" :title="chipTitle"
        @click="emit('pick', b, $event)" @contextmenu="emit('menu', $event, b)"
        @dragstart="emit('dragstart', b, $event)" @dragend="emit('dragend')">
        <span v-item-tip="tip(b)" class="flex items-center gap-1">
          <img v-if="baseIcon(b)" :src="baseIcon(b)!" :class="$style.chipArt" alt="">
          <span :class="{ [$style.here]: b === current }">{{ b }}</span>
          <span v-if="priceOf(b) != null" class="w-num" :class="$style[`p_${priceGrade(priceOf(b), minChaos)}`]">{{ priceText(priceOf(b)!) }}</span>
          <i v-if="locked?.(b)" class="fas fa-lock w-faint" style="font-size: 0.75em;" title="You put it here, so prices won't move it" />
        </span>
      </WChip>
      <button v-if="removable" type="button" :class="$style.chipX" :title="locked?.(b) ? 'Back to where it was' : 'Take it off this tier'" :aria-label="`Take ${b} off this tier`" @click="emit('remove', b)"><i aria-hidden="true" class="fas fa-times" /></button>
    </span>
  </div>
</template>

<script setup lang="ts">
// The items a tier lists by name: art, today's price, click to pick.
// The editor's Rules tab and the item panel's "Whole tier" both use it.
import { WChip, vItemTip } from '../ui'
import type { ItemTipRef } from '../ui/tooltip/item-tip'
import { baseIcon } from './label-style'
import { priceGrade } from './health'

defineProps<{
  items: string[]
  picked: string[]
  priceOf: (base: string) => number | null
  minChaos: number
  tip: (base: string) => ItemTipRef | null
  chipTitle: string
  // Moved here by you (shows a lock).
  locked?: (base: string) => boolean
  // The item you're looking at, marked in the list.
  current?: string
  draggable?: boolean
  removable?: boolean
}>()

const emit = defineEmits<{
  (e: 'pick', base: string, ev: MouseEvent): void
  (e: 'menu', ev: MouseEvent, base: string): void
  (e: 'dragstart', base: string, ev: DragEvent): void
  (e: 'dragend'): void
  (e: 'remove', base: string): void
}>()

const priceText = (chaos: number) => chaos >= 10 ? `${Math.round(chaos)}c` : (chaos < 0.1 ? '<0.1c' : `${Math.round(chaos * 10) / 10}c`)
</script>

<style module>
.chipArt { width: 16px; height: 16px; object-fit: contain; flex: none; }
.chipWrap { display: inline-flex; align-items: center; }
.here { text-decoration: underline; text-underline-offset: 3px; }
.p_high { color: var(--w-accent); }
.p_mid { color: var(--w-dim); }
.p_trash { color: var(--w-down); }
.p_unknown { color: var(--w-faint); }
.chipX {
  background: none;
  border: 0;
  padding: 0 4px 0 2px;
  color: var(--w-faint);
  font-size: 0.75em;
  cursor: pointer;
}
.chipX:hover { color: var(--w-fg); }
</style>
