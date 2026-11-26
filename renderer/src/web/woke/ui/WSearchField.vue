<template>
  <!-- A list's filter box, the same on every screen: the magnifier and
       "Filter <things>". Esc empties it (WField). -->
  <WField :model-value="modelValue" type="search" icon="fas fa-search" :placeholder="placeholder ?? `Filter ${things}`" :label="label ?? placeholder ?? `Filter ${things}`"
    @update:model-value="emit('update:modelValue', String($event))" />
</template>

<script setup lang="ts">
import WField from './WField.vue'

withDefaults(defineProps<{
  modelValue: string
  // What the list holds: "bookmarks", "notables or tags".
  things: string
  // Only when the box says more than what it filters ("Filter 412 map mods").
  placeholder?: string
  label?: string
}>(), { placeholder: undefined, label: undefined })
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()
</script>
