<template>
  <!-- A fold's heading: the chevron, then the label (slot, or `label`).
       With `fold` it keeps its state in ui/fold.ts (stays as you left it, in
       every window and across restarts); else v-model holds it. -->
  <button type="button" class="w-fold-head" :aria-expanded="isOpen" data-fold-head @click="toggle">
    <WFoldCaret :open="isOpen" /><slot :open="isOpen">{{ label }}</slot>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useFold } from './fold'
import WFoldCaret from './WFoldCaret.vue'

const props = withDefaults(defineProps<{
  // ui/fold.ts key ("deck-cheap", "stage:Day 1"); off: v-model holds the state.
  fold?: string
  // How a `fold` starts the first time.
  startOpen?: boolean
  modelValue?: boolean
  label?: string
}>(), { fold: undefined, startOpen: false, modelValue: undefined, label: '' })
const emit = defineEmits<{ (e: 'update:modelValue', open: boolean): void }>()

const stored = computed(() => props.fold ? useFold(props.fold, props.startOpen) : null)
const isOpen = computed(() => props.modelValue ?? stored.value?.value ?? false)
function toggle () {
  const next = !isOpen.value
  if (stored.value) stored.value.value = next
  emit('update:modelValue', next)
}
</script>

<style>
.w-fold-head { display: flex; align-items: center; gap: 6px; width: 100%; min-width: 0; padding: 0; border: 0; background: none; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.w-fold-head:hover .w-fold-caret, .w-fold-head:focus-visible .w-fold-caret { color: var(--w-gold); }
.w-fold-head:focus-visible { outline: 1px solid var(--w-gold); outline-offset: 1px; }
</style>
