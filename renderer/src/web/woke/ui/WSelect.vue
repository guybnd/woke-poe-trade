<template>
  <select :class="['w-select', $style.select]" :value="modelValue" @change="onChange">
    <option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
  </select>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string
  options: Array<{ value: string, label: string }>
}>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()
function onChange (e: Event) { emit('update:modelValue', (e.target as HTMLSelectElement).value) }
</script>

<style module>
.select {
  height: calc(26px * var(--w-text-scale, 1));
  min-width: 0;
  padding: 0 6px;
  font-size: var(--w-fs-md);
}
.select option { background: var(--w-panel-solid); }
</style>
