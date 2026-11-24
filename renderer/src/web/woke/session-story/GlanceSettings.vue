<template>
  <!-- The glance bar's own settings: in Settings › Sessions, the dock card's
       gear, and the popover under the bar's cog. -->
  <span class="w-dim">Bar shows</span>
  <WSegmented v-model="show" :options="GLANCE_SHOW" data-glance-show />
  <span class="w-dim">On the bar</span>
  <div :class="$style.fields" data-glance-fields>
    <WToggle v-for="f in GLANCE_FIELDS" :key="f.id" :model-value="fields.has(f.id)" :title="f.hint"
      @update:model-value="setField(f.id, $event)">{{ f.label }}</WToggle>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { saveConfig } from '@/web/Config'
import WSegmented from '../ui/WSegmented.vue'
import WToggle from '../ui/WToggle.vue'
import type { GlanceField, GlanceShow, SessionStoryWidget } from './widget'
import { GLANCE_FIELDS, GLANCE_SHOW, glanceFields, glanceShow } from './glance-fields'

const props = defineProps<{
  config: SessionStoryWidget
  // Saved at once (the bar's popover); in Settings the page saves it.
  live?: boolean
}>()

const show = computed({
  get: () => glanceShow(props.config.glanceShow),
  set: (v: GlanceShow) => {
    props.config.glanceShow = v
    if (props.live) saveConfig()
  }
})
// Kept in the bar's own order, whatever order they were ticked in.
const fields = computed(() => glanceFields(props.config.glanceFields))
function setField (id: GlanceField, on: boolean) {
  const next = new Set(fields.value)
  if (on) next.add(id)
  else next.delete(id)
  props.config.glanceFields = GLANCE_FIELDS.map(f => f.id).filter(f => next.has(f))
  if (props.live) saveConfig()
}
</script>

<style module>
.fields { display: grid; grid-template-columns: repeat(2, auto); gap: 2px 12px; }
</style>
