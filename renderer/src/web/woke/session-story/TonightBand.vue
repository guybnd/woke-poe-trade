<template>
  <!-- Tonight's card: on the dock and on top of Session analytics. -->
  <NightCard v-if="shown" :story="shown.story" :live="shown.live" :farm="farmOf(shown.story)" :title="shown.live ? 'Tonight so far' : nightTitle(shown.story)"
    :pickable="pickable" :selected="selected" @pick="emit('pick', $event)" />
</template>

<script setup lang="ts">
// Session analytics gets this through WidgetSessionStory.vue's export.
import NightCard from './NightCard.vue'
import { nightTitle, useNightList } from './nights'

defineProps<{ pickable?: boolean, selected?: number | null }>()
const emit = defineEmits<{ pick: [enteredAt: number] }>()
const { shown, farmOf } = useNightList()
</script>
