<template>
  <span :class="$style.wrap">
    <i v-if="icon" :class="[icon, $style.icon]" />
    <input :class="['w-field', $style.field, { [$style.withIcon]: icon }]" :type="type" :value="modelValue" :placeholder="placeholder"
      @input="onInput" @keydown.esc="clearOnEsc && type !== 'number' && emit('update:modelValue', '')">
    <span v-if="suffix" :class="$style.suffix">{{ suffix }}</span>
  </span>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: string | number
  type?: 'text' | 'number' | 'search'
  placeholder?: string
  icon?: string
  suffix?: string
  // Esc empties a text field. Never a number field: those are settings, and
  // Esc (to leave the overlay) used to reset them to 0.
  clearOnEsc?: boolean
}>(), { type: 'text', placeholder: undefined, icon: undefined, suffix: undefined, clearOnEsc: true })
const emit = defineEmits<{ (e: 'update:modelValue', v: string | number): void }>()

function onInput (e: Event) {
  const v = (e.target as HTMLInputElement).value
  emit('update:modelValue', props.type === 'number' ? Number(v) : v)
}
</script>

<style module>
.wrap { position: relative; display: inline-flex; align-items: center; min-width: 0; }
.field {
  width: 100%;
  min-width: 0;
  height: calc(26px * var(--w-text-scale, 1));
  padding: 0 8px;
  font-size: var(--w-fs-md);
}
.withIcon { padding-left: 26px; }
.icon { position: absolute; left: 9px; font-size: var(--w-fs-xs); color: var(--w-faint); pointer-events: none; }
.suffix { margin-left: 5px; font-size: var(--w-fs-sm); font-family: var(--w-small); color: var(--w-dim); white-space: nowrap; }
</style>
