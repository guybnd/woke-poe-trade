<template>
  <Teleport to="body">
    <div v-if="tip" ref="el" :class="$style.card" :style="pos" role="tooltip">
      <p v-for="(p, i) in paragraphs" :key="i" :class="{ [$style.more]: i > 0 }">{{ p }}</p>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
// Mounted once in the overlay. Draws the card behind a WInfo "?".
import { computed, inject, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import type { WidgetManager } from '@/web/overlay/interfaces'
import { helpParagraphs, helpTip as tip, hideHelp, placeHelp } from './help-tip'

const el = ref<HTMLElement | null>(null)
const placed = ref<{ left: number, top: number } | null>(null)
const paragraphs = computed(() => helpParagraphs(tip.value?.text ?? ''))

watch(tip, async (t) => {
  placed.value = null
  if (!t) return
  await nextTick()
  const card = el.value
  if (!card || tip.value !== t) return
  // With CSS zoom, left and top are in zoomed units.
  const scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--w-ui-scale')) || 1
  const r = card.getBoundingClientRect()
  const at = placeHelp(t.anchor, r, { width: window.innerWidth, height: window.innerHeight })
  placed.value = { left: at.left / scale, top: at.top / scale }
})

const pos = computed(() => placed.value
  ? { left: `${placed.value.left}px`, top: `${placed.value.top}px` }
  : { left: '0', top: '0', visibility: 'hidden' as const })

// It sits outside the panel, so nothing hides it with the panel, and the overlay
// gets no mouse events once the game has focus: closing the overlay mid-hover
// must not leave it over the game. A scroll moves the "?" away from under it.
const close = () => { hideHelp() }
const wm = inject<WidgetManager | undefined>('wm', undefined)
watch(() => wm?.active.value, close)
onMounted(() => {
  window.addEventListener('blur', close)
  window.addEventListener('scroll', close, true)
  window.addEventListener('dragstart', close, true)
})
onUnmounted(() => {
  window.removeEventListener('blur', close)
  window.removeEventListener('scroll', close, true)
  window.removeEventListener('dragstart', close, true)
  close()
})
</script>

<style module>
.card {
  position: fixed; z-index: 1002; zoom: var(--w-ui-scale, 1);
  width: 300px; padding: 8px 10px; pointer-events: none;
  background: var(--w-tip-bg); border: 1px solid var(--w-line-strong); border-radius: var(--w-r-sm);
  box-shadow: var(--w-shadow); color: var(--w-fg);
  font-size: var(--w-fs-sm); font-weight: 400; line-height: 1.45; white-space: normal; text-align: left;
}
.card p { margin: 0; }
.more { margin-top: 6px !important; color: var(--w-dim); }
</style>
