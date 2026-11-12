<template>
  <img :src="chaos ? '/images/chaos.png' : '/images/divine.png'" :alt="chaos ? 'c' : 'd'" :title="title" :class="$style.coin">
</template>

<script setup lang="ts">
// The unit after a number in the Net worth window: the game's divine or
// chaos icon, sized to the text around it (as the price check shows prices).
defineProps<{ chaos?: boolean, title?: string }>()
</script>

<style module>
.coin { display: inline-block; width: 1.15em; height: 1.15em; object-fit: contain; vertical-align: -0.2em; margin-left: 0.15em; }
</style>
