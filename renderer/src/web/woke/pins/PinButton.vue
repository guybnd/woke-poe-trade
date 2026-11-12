<template>
  <button type="button" class="w-icon-btn w-focusable" :class="[$style.pin, { 'w-icon-btn--on': on }]"
    :title="on ? 'Unpin' : title" :aria-label="on ? 'Unpin' : title" :aria-pressed="on" @click.stop="toggle">
    <i class="fas fa-thumbtack" />
  </button>
</template>

<script setup lang="ts">
// Pins or unpins one thing. The pin starts beside the button.
import { computed } from 'vue'
import { isPinned, removePin, addPin } from './pins'
import type { Pin } from './pins'

const props = withDefaults(defineProps<{
  make: () => Omit<Pin, 'opacity' | 'spots'>
  title?: string
}>(), { title: 'Pin: keep this on screen while you play' })

const id = computed(() => props.make().id)
const on = computed(() => isPinned(id.value))

function toggle (e: MouseEvent) {
  if (on.value) { removePin(id.value); return }
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const x = Math.min(80, (r.right + 8) / window.innerWidth * 100)
  addPin({ ...props.make(), at: { x, y: r.top / window.innerHeight * 100 } })
}
</script>

<style module>
.pin { font-size: var(--w-fs-xs); }
</style>
