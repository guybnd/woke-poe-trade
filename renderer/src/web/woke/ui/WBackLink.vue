<template>
  <!-- A drill-down's way back: "‹ <where it goes>" as a text link, top left
       of what it replaces (as Run timer's "‹ Runs"). With `mouse`, the
       mouse's back button on the window does the same while it shows. -->
  <button ref="el" type="button" class="w-back-link" :title="title" :disabled="disabled" data-back-link @click="emit('back')">
    <i class="fas fa-chevron-left" aria-hidden="true" /><span class="w-trunc">{{ to }}</span>
  </button>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { useMouseNav } from './mouse-nav'

const props = withDefaults(defineProps<{
  // Where it goes: "Runs", "Sessions", "All decks".
  to: string
  title?: string
  disabled?: boolean
  // The mouse's back button too (on the window it is in).
  mouse?: boolean
}>(), { title: undefined, disabled: false, mouse: false })
const emit = defineEmits<{ (e: 'back'): void }>()

const el = shallowRef<HTMLElement | null>(null)
useMouseNav(() => props.mouse ? el.value?.closest('[id^="widget-"], [data-w-panel]') : null, {
  back: () => { if (!props.disabled) emit('back') }
})
</script>

<style>
.w-back-link { display: inline-flex; align-items: center; gap: 4px; min-width: 0; padding: 0; border: 0; background: none; color: var(--w-accent); font: inherit; font-size: var(--w-fs-sm); cursor: pointer; white-space: nowrap; }
.w-back-link i { font-size: 0.75em; }
.w-back-link:hover:not(:disabled), .w-back-link:focus-visible { text-decoration: underline; outline: none; }
.w-back-link:disabled { color: var(--w-faint); cursor: default; }
</style>
