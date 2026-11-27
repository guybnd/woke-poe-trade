<template>
  <!-- A filter that leaves nothing: 'Nothing matches "x"' and a Clear search
       button, the same on every screen. The slot adds a line after it (why
       some things have no row at all). -->
  <WEmpty icon="fas fa-search" data-no-match>
    Nothing matches "{{ query.trim() }}"<template v-if="$slots.default">. <slot /></template>
    <template #actions><WButton size="sm" @click="emit('clear')">Clear search</WButton></template>
  </WEmpty>
</template>

<script setup lang="ts">
import WButton from './WButton.vue'
import WEmpty from './WEmpty.vue'

defineProps<{ query: string }>()
const emit = defineEmits<{ (e: 'clear'): void }>()
</script>
