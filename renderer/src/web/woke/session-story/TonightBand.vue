<template>
  <!-- Tonight's card: on the dock and on top of Session analytics. -->
  <NightCard v-if="shown" :story="shown.story" :live="shown.live" :farm="farmOf(shown.story)" :title="shown.live ? 'Tonight so far' : nightTitle(shown.story)"
    :pickable="pickable" :selected="selected" @pick="emit('pick', $event)" />
</template>

<script setup lang="ts">
// Session analytics gets this through WidgetSessionStory.vue's export.
import { computed } from 'vue'
import NightCard from './NightCard.vue'
import { nightTitle, useNightList } from './nights'

const props = defineProps<{
  pickable?: boolean
  selected?: number | null
  // A saved night picked in Session analytics › Nights; none: tonight or the last night.
  nightId?: string | null
}>()
const emit = defineEmits<{ pick: [enteredAt: number] }>()
const nights = useNightList()
const farmOf = nights.farmOf
const shown = computed(() => (props.nightId && nights.list.value.find(n => n.story.id === props.nightId)) || nights.shown.value)
</script>
