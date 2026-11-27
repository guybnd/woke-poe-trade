<template>
  <span class="w-seg">
    <button v-for="opt in options" :key="opt.value" type="button"
      :aria-pressed="opt.value === modelValue" :title="opt.title" v-bind="opt.attrs"
      @click="emit('update:modelValue', opt.value)">{{ opt.label }}</button>
  </span>
</template>

<script setup lang="ts">
// The look is in controls.css (.w-seg). `attrs` goes on that option's button
// (data-* hooks, as { 'data-run-summary-tab': '' }).
defineProps<{
  modelValue: string
  options: Array<{ value: string, label: string, title?: string, attrs?: Record<string, string> }>
}>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()
</script>
