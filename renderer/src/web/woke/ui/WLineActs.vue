<template>
  <!-- A profit line's hover actions (pick A4): ⊘ leave out (or ↺ count it
       again) and ⋯ for the rest. The row needs the w-line class. -->
  <span class="w-line-acts" :class="$style.acts">
    <button v-if="canLeaveOut" type="button" :class="$style.act" :title="out ? COUNT_AGAIN : `${LEAVE_OUT}: it stops counting`" :aria-label="out ? `${COUNT_AGAIN}: ${name}` : `${LEAVE_OUT} ${name}`" :aria-pressed="out" data-line-out
      @click.stop="emit('out', !out)"><i :class="out ? 'fas fa-undo' : 'fas fa-ban'" /></button>
    <button v-if="hasMore" type="button" :class="$style.act" title="More" :aria-label="`More for ${name}`" aria-haspopup="menu" data-line-more @click.stop="openMore"><i class="fas fa-ellipsis-h" /></button>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { openMenu } from './layer'
import type { MenuEntry, MenuItemHead } from './layer'
import { COUNT_AGAIN, LEAVE_OUT } from './line-item'

const props = withDefaults(defineProps<{
  name: string
  out?: boolean
  canLeaveOut?: boolean
  // The ⋯ menu (lineMenu), the same one right-click opens.
  entries: MenuEntry[]
  // The item header over the menu (itemMenuHead), as right-click shows it.
  head?: ((e: MouseEvent) => MenuItemHead | null) | null
}>(), { out: false, canLeaveOut: true, head: null })
const emit = defineEmits<{ (e: 'out', on: boolean): void }>()

// The menu keeps Leave out too (right-click has no ⊘); ⋯ shows only when it
// holds something more.
const hasMore = computed(() => props.entries.some(e => !('label' in e) || (e.label !== LEAVE_OUT && e.label !== COUNT_AGAIN)))
function openMore (e: MouseEvent) {
  const el = e.currentTarget as HTMLElement
  const r = el.getBoundingClientRect()
  // Enter or Space clicks at 0,0: the item header (and a price check from it)
  // opens beside the button instead.
  const at = e.detail === 0 || (e.screenX === 0 && e.screenY === 0)
    ? new MouseEvent('click', { clientX: r.right, clientY: r.bottom, screenX: window.screenX + r.right, screenY: window.screenY + r.bottom })
    : e
  openMenu({ x: r.right, y: r.bottom, from: el }, props.entries, props.head?.(at) ?? undefined)
}
</script>

<style module>
.acts { display: inline-flex; justify-content: flex-end; gap: 6px; }
.act { background: none; border: 0; padding: 0 1px; color: var(--w-dim); cursor: pointer; font-size: var(--w-fs-xs); line-height: 1; }
.act:hover, .act:focus-visible { color: var(--w-gold); outline: none; }
</style>
