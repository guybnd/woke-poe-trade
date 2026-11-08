<template>
  <!-- woke: item search lives in the search palette, and the heist gem reader
  that filled this window is gone. The widget stays so saved configs and the
  item-search tab (which opens the palette) keep working; it draws nothing. -->
</template>

<script lang="ts">
import type { WidgetSpec } from '../overlay/interfaces'
import { ItemSearchWidget } from './widget.js'

export default {
  widget: {
    type: 'item-search',
    instances: 'single',
    initInstance: (): ItemSearchWidget => {
      return {
        wmId: 0,
        wmType: 'item-search',
        wmTitle: '{icon=fa-search}',
        wmWants: 'hide',
        wmZorder: null,
        wmFlags: ['invisible-on-blur'],
        anchor: {
          pos: 'tl',
          x: 10,
          y: 20
        }
      }
    }
  } satisfies WidgetSpec
}
</script>

<script setup lang="ts">
defineProps<{
  config: ItemSearchWidget
}>()
</script>
