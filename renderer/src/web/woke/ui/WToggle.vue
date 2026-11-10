<template>
  <button type="button" role="switch" :aria-checked="modelValue" :disabled="disabled"
    :class="['w-toggle', $style.wrap, { [$style.on]: modelValue, on: modelValue }]" @click="emit('update:modelValue', !modelValue)">
    <span class="w-toggle-track" :class="$style.track"><span class="w-toggle-knob" :class="$style.knob" /></span>
    <span v-if="$slots.default" :class="$style.label"><slot /></span>
  </button>
</template>

<script setup lang="ts">
// On/off switch. Use for settings that apply instantly; checkboxes stay for lists.
withDefaults(defineProps<{ modelValue: boolean, disabled?: boolean }>(), { disabled: false })
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()
</script>

<style module>
.wrap { display: inline-flex; align-items: center; gap: var(--w-s2); font-size: var(--w-fs-md); color: var(--w-fg); }
.wrap:disabled { opacity: 0.5; pointer-events: none; }
.track {
  position: relative; width: 28px; height: 16px; flex: none;
  border-radius: var(--w-r-pill); background: var(--w-panel-3); border: 1px solid var(--w-line-strong);
  transition: background var(--w-dur-in) var(--w-ease);
}
.knob {
  position: absolute; top: 2px; left: 2px; width: 10px; height: 10px; border-radius: 50%;
  background: var(--w-dim); transition: transform var(--w-dur-in) var(--w-ease), background var(--w-dur-in);
}
.on .track { background: var(--w-accent); border-color: var(--w-accent); }
.on .knob { transform: translateX(12px); background: var(--w-accent-fg); }
.wrap:focus-visible { outline: none; }
.wrap:focus-visible .track { box-shadow: 0 0 0 2px var(--w-accent-soft), 0 0 0 1px var(--w-accent); }
.label { text-align: left; }
</style>
