<template>
  <span class="w-seg">
    <button v-for="opt in options" :key="opt.value" type="button"
      :aria-pressed="opt.value === modelValue"
      @click="emit('update:modelValue', opt.value)">{{ opt.label }}</button>
  </span>
</template>

<script setup lang="ts">
// The look is in controls.css (.w-seg).
defineProps<{
  modelValue: string
  options: Array<{ value: string, label: string }>
}>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()
</script>
