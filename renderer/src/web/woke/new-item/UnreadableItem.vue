<template>
  <!-- woke: what to do with an item price check can't read (Guy's pick A,
       WOKEPOET-105): search it on trade by name where the text allows, and
       copy what the game copied. -->
  <div class="flex gap-2 flex-wrap" style="margin: 0 1rem;">
    <WButton v-if="query && league && !unsupported" size="sm" variant="primary" icon="fas fa-external-link-alt" @click="search">Search on trade</WButton>
    <WButton size="sm" :icon="copied ? 'fas fa-check' : 'far fa-copy'" @click="copy(rawText)">{{ copied ? 'Copied' : 'Copy text' }}</WButton>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { poeWebApi } from '@/web/Config'
import { WButton, useCopy } from '../ui'
import { newItemQuery, newItemTradeUrl } from './query'

const props = defineProps<{
  rawText: string
  league: string | null
  // A known item price check doesn't price (sentinels): no search either.
  unsupported?: boolean
}>()

// Read from English text only; other languages name the lines differently.
const query = computed(() => newItemQuery(props.rawText))
const { copied, copy } = useCopy()

function search () {
  if (query.value && props.league) window.open(newItemTradeUrl(props.league, query.value, poeWebApi()))
}
</script>
