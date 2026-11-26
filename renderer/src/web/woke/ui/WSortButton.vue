<template>
  <!-- A saved list's sort: the icon in the panel's actions, a menu of the
       list's orders. Lit when the list isn't in your own order. -->
  <button type="button" class="w-icon-btn" :class="{ 'w-icon-btn--on': modelValue !== manual }" :title="`Sort: ${current}`"
    :aria-label="`Sort: ${current}`" aria-haspopup="menu" data-sort-button @click="open"><i class="fas fa-sort-amount-down" /></button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { openMenu } from './layer'

const props = withDefaults(defineProps<{
  modelValue: string
  options: Array<{ value: string, label: string }>
  // The value that is your own order (not lit). Most lists call it 'manual'.
  manual?: string
}>(), { manual: 'manual' })
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const current = computed(() => props.options.find(o => o.value === props.modelValue)?.label ?? props.options[0]?.label ?? '')
function open (e: MouseEvent) {
  const el = e.currentTarget as HTMLElement
  const r = el.getBoundingClientRect()
  openMenu({ x: r.left, y: r.bottom, from: el }, props.options.map(o => ({
    label: o.label,
    icon: o.value === props.modelValue ? 'fas fa-check' : undefined,
    action: () => { if (o.value !== props.modelValue) emit('update:modelValue', o.value) }
  })))
}
</script>
