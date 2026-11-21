<template>
  <!-- Tonight's card: on the dock and on top of Session analytics. -->
  <NightCard v-if="shown" :story="shown.story" :live="shown.live" :farm="farmOf(shown.story)" :title="shown.live ? 'Tonight so far' : nightTitle(shown.story)" />
</template>

<script setup lang="ts">
// Session analytics gets this through WidgetSessionStory.vue's export.
import NightCard from './NightCard.vue'
import { nightTitle, useNightList } from './nights'

const { shown, farmOf } = useNightList()
</script>
