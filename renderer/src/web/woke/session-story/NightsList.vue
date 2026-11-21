<template>
  <!-- Session analytics › Nights: one strip per night; a click shows it on top. -->
  <div class="flex flex-col" data-nights-list>
    <WEmpty v-if="!list.length" icon="fas fa-moon">
      No nights yet. A night is read from the game's log, from your first map until it goes quiet for 15 minutes.
    </WEmpty>
    <button v-for="n in list" :key="n.story.id" type="button" :class="[$style.row, { [$style.on]: selected ? n.story.id === selected : n.live }]"
      data-night-row @click="emit('open', n.story.id)">
      <span :class="$style.top">
        <span class="w-trunc">{{ n.live ? 'Tonight so far' : nightTitle(n.story) }}</span>
        <span class="w-dim w-num">{{ formatDuration(n.story.endedAt - n.story.startedAt) }} · {{ n.story.maps.length }} {{ n.story.maps.length === 1 ? 'map' : 'maps' }}</span>
        <span v-if="profitOf(n.story) != null" class="w-num" :class="profitOf(n.story)! >= 0 ? 'w-up' : 'w-down'">
          {{ formatChaos(profitOf(n.story)!, n.story.divine) }}
        </span>
      </span>
      <span :class="$style.strip" aria-hidden="true">
        <i v-for="(p, i) in n.story.strip" :key="i" :class="p.skipped ? $style.skipped : p.map == null ? $style.out : $style.map" :style="{ flexGrow: p.ms }" />
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
// Session analytics gets this through WidgetSessionStory.vue's export, like TonightBand.
import { WEmpty } from '../ui'
import { formatChaos, formatDuration } from '../ui/format'
import { nightTitle, useNightList } from './nights'

// The night picked to show on top; none: tonight.
defineProps<{ selected?: string | null }>()
const emit = defineEmits<{ open: [id: string] }>()
const { list, profitOf } = useNightList()
</script>

<style module>
.row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  padding: 6px var(--w-pad);
  text-align: left;
  border-top: 1px solid var(--w-line-soft);
}
.row:hover, .on { background: var(--w-panel-2); }
.top { display: flex; gap: 10px; align-items: baseline; min-width: 0; }
.top > :first-child { flex: 1; }
.strip { display: flex; gap: 1px; height: 6px; }
.map { min-width: 1px; background: var(--w-accent); opacity: 0.75; }
.out { min-width: 1px; background: var(--w-line); opacity: 0.6; }
.skipped { min-width: 1px; background: var(--w-line); opacity: 0.3; }
</style>
