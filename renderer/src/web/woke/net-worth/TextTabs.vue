<template>
  <!-- Small text tabs: the picked one underlined in gold. -->
  <span :class="$style.tabs" role="tablist">
    <button v-for="o in options" :key="o.value" type="button" role="tab" :aria-selected="o.value === modelValue"
      :class="[$style.tab, { [$style.on]: o.value === modelValue }]" @click="emit('update:modelValue', o.value)">{{ o.label }}</button>
  </span>
</template>

<script setup lang="ts">
defineProps<{ modelValue: string, options: ReadonlyArray<{ value: string, label: string }> }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()
</script>

<style module>
.tabs { display: inline-flex; gap: 10px; align-items: baseline; }
.tab { padding: 0 0 2px; font-family: var(--w-caps-face); text-transform: var(--w-caps-case); font-size: var(--w-fs-caps); color: var(--w-dim); border-bottom: 1px solid transparent; cursor: pointer; white-space: nowrap; }
.tab:hover { color: var(--w-fg); }
.on { color: var(--w-gold); border-bottom-color: var(--w-gold); }
</style>
