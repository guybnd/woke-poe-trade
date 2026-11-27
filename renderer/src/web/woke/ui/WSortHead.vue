<template>
  <!-- A sortable column heading, the same in every table: the label, and an
       arrow on the sorted column. Click sorts by it, again flips it. A th around
       it sets aria-sort itself. -->
  <button type="button" class="w-sort-head" :class="{ 'w-sort-head--on': active, 'w-sort-head--end': align === 'right' }"
    :aria-label="active ? `${label}, sorted ${desc ? 'descending' : 'ascending'}` : `Sort by ${label}`" @click.stop="emit('sort')"
    ><template v-if="align === 'right' && active"><i :class="arrow" aria-hidden="true" /></template><slot>{{ label }}</slot><template v-if="align !== 'right' && active"><i :class="arrow" aria-hidden="true" /></template></button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  label: string
  active: boolean
  desc?: boolean
  // A right-aligned (number) column puts the arrow on the left, beside its neighbour.
  align?: 'left' | 'right'
}>(), { desc: true, align: 'left' })
const emit = defineEmits<{ (e: 'sort'): void }>()

const arrow = computed(() => props.desc ? 'fas fa-caret-down' : 'fas fa-caret-up')
</script>

<style>
.w-sort-head { display: inline-flex; align-items: center; gap: 3px; padding: 0; border: 0; background: none; color: inherit; font: inherit; letter-spacing: inherit; text-transform: inherit; cursor: pointer; white-space: nowrap; }
.w-sort-head--end { justify-content: flex-end; }
.w-sort-head:hover, .w-sort-head:focus-visible { color: var(--w-fg); outline: none; }
.w-sort-head--on { color: var(--w-accent); }
.w-sort-head i { font-size: 0.85em; }
</style>
