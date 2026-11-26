<template>
  <!-- A fold's mark: a chevron pointing right when folded, down when open.
       The one fold look (WFoldHead draws it; a row that is its own fold
       button puts it first). Never ▾ ▸ › or a caret. -->
  <i class="fas fa-chevron-right w-fold-caret" :class="{ 'w-fold-caret--open': open }" aria-hidden="true" />
</template>

<script setup lang="ts">
defineProps<{ open: boolean }>()
</script>

<style>
.w-fold-caret { flex: none; width: 1em; text-align: center; font-size: 0.7em; color: var(--w-dim); transition: transform var(--w-dur-in) var(--w-ease); }
.w-fold-caret--open { transform: rotate(90deg); }
</style>
