<template>
  <div class="flex flex-col gap-2" data-map-history>
    <WBanner v-if="store.mapsError.value">Couldn't read your map history: {{ store.mapsError.value }}</WBanner>
    <WEmpty v-else-if="!on" :art="{ mechanic: 'map' }">
      Turn on Session story (Settings › Farming &amp; sessions) to keep a history of every map you run.
    </WEmpty>
    <WEmpty v-else-if="!list.length" :art="{ mechanic: 'map' }">
      Maps show here as you run them. They're read from the game's log.
    </WEmpty>
    <template v-else>
      <div class="flex flex-wrap gap-x-3 text-xs w-dim w-num">
        <span>{{ list.length }} {{ list.length === 1 ? 'map' : 'maps' }}</span>
        <span>Average {{ formatClock(avgMs) }}</span>
        <span>{{ deaths }} {{ deaths === 1 ? 'death' : 'deaths' }}</span>
      </div>
      <div>
        <div class="w-row w-row--head px-0" :class="$style.grid">
          <span>When</span><span>Map</span><span class="text-right">Time</span><span>Character</span><span>Met</span>
        </div>
        <div v-for="m in visible" :key="m.key + m.enteredAt" class="w-row px-0" :class="$style.grid" data-map-row>
          <span class="w-dim w-num w-trunc">{{ formatSessionDate(m.enteredAt) }}</span>
          <span class="w-trunc">{{ m.name }} <span class="w-dim">{{ tierText(m.areaLevel) }}</span></span>
          <span class="text-right w-num">
            {{ formatClock(m.mapMs) }}<span v-if="m.deaths" class="w-down" :title="`${m.deaths} ${m.deaths === 1 ? 'death' : 'deaths'}`"> ✕{{ m.deaths }}</span>
          </span>
          <span class="w-trunc" :title="m.className ?? undefined">
            <template v-if="m.char">{{ m.char }}<span v-if="m.charLevel != null" class="w-dim w-num"> {{ levelText(m) }}</span></template>
            <span v-else class="w-faint">—</span>
          </span>
          <span class="w-trunc w-dim text-xs">{{ m.npcs.join(', ') }}</span>
        </div>
        <button v-if="list.length > visible.length" type="button" class="w-accent text-xs pt-1" @click="limit += PAGE">
          Show more ({{ list.length - visible.length }} older)
        </button>
      </div>
      <div class="text-xs w-faint">The character is the last one the log saw level up or die. Kills, XP and loot aren't in the log.</div>
    </template>
  </div>
</template>

<script setup lang="ts">
// Session analytics' Map history tab: every map read from Client.txt by Session story.
import { computed, shallowRef } from 'vue'
import { AppConfig } from '@/web/Config'
import { WBanner, WEmpty } from '../ui'
import { formatClock } from '../ui/format'
import { formatSessionDate, inRange } from '../analytics/stats'
import type { AnalyticsRange } from '../analytics/types'
import { isWidgetTypeOn } from '../modules'
import { tierText } from './map-log'
import type { MapRecord } from './map-log'
import { useNights } from './store'
import { SESSION_STORY_TYPE } from './widget'

const props = defineProps<{ range: AnalyticsRange, league: string, now: number }>()

const store = useNights()
const on = computed(() => isWidgetTypeOn(AppConfig(), SESSION_STORY_TYPE))
if (on.value) store.loadMaps().catch(() => {})

// "League" and "7 days" are this league's; maps saved before leagues were noted count as this one.
const list = computed(() => store.maps.value.filter(m =>
  (props.range === 'all' || !m.league || m.league === props.league) && inRange(m.enteredAt, props.range, props.now)))

const PAGE = 100
const limit = shallowRef(PAGE)
const visible = computed(() => list.value.slice(0, limit.value))

const avgMs = computed(() => list.value.reduce((s, m) => s + m.mapMs, 0) / Math.max(1, list.value.length))
const deaths = computed(() => list.value.reduce((s, m) => s + m.deaths, 0))

function levelText (m: MapRecord): string {
  return m.levelsGained ? `${m.charLevel} → ${m.charLevel! + m.levelsGained}` : String(m.charLevel)
}
</script>

<style module>
.grid {
  display: grid;
  grid-template-columns: 7.5rem minmax(0, 1.2fr) 4.5rem minmax(0, 1fr) minmax(0, 1fr);
  gap: 8px;
  align-items: baseline;
}
</style>
