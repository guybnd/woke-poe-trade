<template>
  <WEmpty v-if="!strategy" icon="fas fa-map">This strategy is gone. Unpin it.</WEmpty>
  <WEmpty v-else-if="atlasDataError && !atlasTree" icon="fas fa-exclamation-triangle">{{ atlasDataError }}</WEmpty>
  <WEmpty v-else-if="atlasTreeError" icon="fas fa-exclamation-triangle">{{ atlasTreeError }}</WEmpty>
  <WEmpty v-else-if="!atlasTree" icon="fas fa-spinner fa-spin">Loading…</WEmpty>
  <AtlasTree v-else bare :model="atlasTree" :tree-url="widget ? workingTree(widget, strategy) : strategy.treeUrl" :threads="strategy.threads" :lit="widget?.lit ?? []" :points-at="widget?.pointsAt?.[strategy.id] ?? null" />
</template>

<script setup lang="ts">
// A strategy's atlas tree pinned over the game: the plan and the lit
// mechanics, see-through, with clicks going through to the game's atlas.
// It follows edits made in the Atlas window.
import { computed, watch } from 'vue'
import { AppConfig } from '@/web/Config'
import { WEmpty } from '../ui'
import { ATLAS_TYPE, atlasDataState, useAtlasData, workingTree } from './widget'
import type { AtlasWidget } from './widget'
import type { Pin } from '../pins/pins'
import AtlasTree from './AtlasTree.vue'

const props = defineProps<{ pin: Pin }>()

const widget = computed(() => AppConfig().widgets.find(w => w.wmType === ATLAS_TYPE && String(w.wmId) === props.pin.data.widget) as AtlasWidget | undefined)
const strategy = computed(() => widget.value?.strategies.find(s => String(s.id) === props.pin.data.strategy) ?? null)
const { atlasDataError, atlasTree, atlasTreeError } = atlasDataState()
// Loads the tree data while there's a strategy to show, from the window's data URL.
watch(() => strategy.value ? widget.value?.dataUrl ?? '' : null, (url) => {
  if (url != null) useAtlasData(url)
}, { immediate: true })
</script>
