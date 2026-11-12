<template>
  <SlotOut :entry="host" />
  <template v-for="ex in extras" :key="ex.key">
    <div :class="$style.extraHead"><i :class="dockIcon(ex.props)" /> {{ ex.props.title }}</div>
    <SlotOut :entry="ex" />
  </template>
</template>

<script setup lang="ts">
// A dock card taken off the dock: the same card, kept open where you put it.
import { defineComponent, onUnmounted, watch } from 'vue'
import type { PropType } from 'vue'
import { dockIcon, holdOpen } from '../dock/dock'
import type { DockEntry } from '../dock/dock'

const props = defineProps<{ host: DockEntry, extras: DockEntry[] }>()

// The card's widget only keeps its card up to date while someone shows it.
const held = new Set<DockEntry>()
function sync (now: DockEntry[]) {
  for (const e of held) if (!now.includes(e)) { holdOpen(e, false); held.delete(e) }
  for (const e of now) if (!held.has(e)) { holdOpen(e, true); held.add(e) }
}
watch(() => [props.host, ...props.extras], sync, { immediate: true })
onUnmounted(() => { sync([]) })

const SlotOut = defineComponent({
  props: { entry: { type: Object as PropType<DockEntry>, required: true } },
  setup (p) {
    return () => p.entry.slots.card?.() ?? null
  }
})
</script>

<style module>
.extraHead {
  padding: 4px var(--w-pad) 2px;
  border-top: 1px solid var(--w-line);
  font-size: var(--w-fs-caps);
  text-transform: var(--w-caps-case);
  letter-spacing: 0.08em;
  color: var(--w-faint);
  font-family: var(--w-caps-face);
}
</style>
