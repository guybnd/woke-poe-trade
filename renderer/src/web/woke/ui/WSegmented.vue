<template>
  <span :class="[$style.seg, 'w-seg']">
    <button v-for="opt in options" :key="opt.value" type="button"
      :aria-pressed="opt.value === modelValue"
      :class="{ [$style.on]: opt.value === modelValue }"
      @click="emit('update:modelValue', opt.value)">{{ opt.label }}</button>
  </span>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string
  options: Array<{ value: string, label: string }>
}>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()
</script>

<style module>
.seg {
  display: inline-flex;
  flex: none;
  border: 1px solid var(--w-line);
  border-radius: var(--w-radius-sm);
  overflow: hidden;
}
.seg button {
  font-size: calc(12px * var(--w-text-scale, 1));
  color: var(--w-dim);
  padding: 0 6px;
  line-height: calc(22px * var(--w-text-scale, 1));
  white-space: nowrap;
  font-family: var(--w-body);
}
.seg button:hover { color: var(--w-fg); }
.seg button + button { border-left: 1px solid var(--w-line-soft); }
.on { background: var(--w-accent-soft); color: var(--w-accent) !important; }
</style>
