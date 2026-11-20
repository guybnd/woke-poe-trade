<template>
  <div data-night-card>
    <div :class="$style.head">
      <span class="w-head-font w-accent" :class="$style.title">{{ title }}</span>
      <span class="w-dim text-xs w-num">{{ formatDuration(played) }} · {{ story.maps.length }} {{ story.maps.length === 1 ? 'map' : 'maps' }}</span>
    </div>
    <div :class="$style.strip" data-night-strip>
      <span v-for="(p, i) in story.strip" :key="i" :class="p.map == null ? $style.out : $style.map"
        :style="{ flexGrow: p.ms }" :title="partTitle(p)" />
      <span v-for="(x, i) in deathMarks" :key="'d' + i" :class="$style.death" :style="{ left: `${x}%` }" title="Death" />
    </div>
    <div :class="$style.axis" class="w-num w-dim">
      <span>{{ clock(story.startedAt) }}</span>
      <span>{{ live ? 'now' : clock(story.endedAt) }}</span>
    </div>
    <div :class="$style.totals" class="w-num">
      <span v-if="story.profitChaos != null"><span class="w-dim">Profit</span> <span :class="story.profitChaos >= 0 ? 'w-up' : 'w-down'">{{ signed(story.profitChaos) }}</span></span>
      <span v-if="perHour != null"><span class="w-dim">per h</span> {{ formatChaos(perHour, story.divine) }}</span>
      <span><span class="w-dim">Hideout</span> {{ formatDuration(story.otherMs) }}</span>
      <span><span class="w-dim">Deaths</span> {{ story.deathsAt.length }}</span>
    </div>
    <div v-if="story.best" :class="$style.best" class="w-num" data-night-best>
      <span class="w-accent">★</span> {{ story.best.name }} · {{ formatChaos(story.best.chaos, story.divine) }}
    </div>
    <div v-else-if="story.profitChaos == null && !live" :class="$style.best" class="w-dim text-xs">
      Profit and best drop need the stash reader (Net worth) to read during the night.
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatChaos, formatDuration } from '../ui/format'
import type { NightStory, StripPart } from './story'

const props = defineProps<{ story: NightStory, live?: boolean, title: string }>()

const played = computed(() => props.story.endedAt - props.story.startedAt)
const perHour = computed(() => {
  const hours = played.value / 3_600_000
  return props.story.profitChaos != null && hours >= 0.25 ? props.story.profitChaos / hours : null
})
const deathMarks = computed(() => {
  const span = played.value
  return span > 0 ? props.story.deathsAt.map(at => Math.min(100, Math.max(0, (at - props.story.startedAt) / span * 100))) : []
})

function tier (level: number): string {
  return level >= 68 && level <= 83 ? `T${level - 67}` : `level ${level}`
}
function partTitle (p: StripPart): string {
  if (p.map == null) return `Out of maps · ${formatDuration(p.ms)}`
  const m = props.story.maps[p.map]
  const deaths = m.deaths ? ` · ${m.deaths} ${m.deaths === 1 ? 'death' : 'deaths'}` : ''
  return `${m.name} ${tier(m.level)} · ${formatDuration(m.mapMs)} in the map${deaths}`
}
function clock (ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}
function signed (chaos: number): string {
  return `${chaos > 0 ? '+' : ''}${formatChaos(chaos, props.story.divine)}`
}
</script>

<style module>
.head { display: flex; align-items: baseline; gap: 8px; padding: 4px var(--w-pad) 0; }
.title { flex: 1; font-size: 1.1em; }
.strip {
  position: relative;
  display: flex;
  gap: 1px;
  height: 18px;
  margin: 8px var(--w-pad) 2px;
}
.map { min-width: 2px; background: var(--w-accent); opacity: 0.75; }
.map:hover { opacity: 1; }
.out {
  min-width: 1px;
  background: repeating-linear-gradient(90deg, var(--w-line) 0 3px, transparent 3px 6px);
}
.death {
  position: absolute;
  top: -3px;
  bottom: -3px;
  width: 2px;
  background: var(--w-down);
  pointer-events: none;
}
.axis { display: flex; justify-content: space-between; padding: 0 var(--w-pad); font-size: 0.8em; }
.totals {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 12px;
  padding: 6px var(--w-pad) 0;
}
.best { padding: 3px var(--w-pad) 6px; }
</style>
