<template>
  <!-- Tonight's card: on the dock and on top of Session analytics. -->
  <NightCard v-if="shown" :story="shown.story" :live="shown.live" :farm="farmOf(shown.story)" :title="shown.live ? 'Tonight so far' : nightTitle(shown.story)" />
</template>

<script setup lang="ts">
// Session analytics loads this with import(): it stays in Session story's own
// chunk, which is already loaded whenever Session story is on.
import NightCard from './NightCard.vue'
import { nightTitle, useNightList } from './nights'

const { shown, farmOf } = useNightList()
</script>
