<template>
  <i class="fas fa-info-circle w-faint" :title="text" :aria-label="text" role="img" />
</template>

<script setup lang="ts">
// A long explanation, kept out of the panel until someone asks for it.
defineProps<{ text: string }>()
</script>
