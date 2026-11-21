<template>
  <div class="flex flex-col gap-2" data-map-history>
    <WBanner v-if="readError || store.mapsError.value">Couldn't read your map history: {{ readError || store.mapsError.value }}</WBanner>
    <WEmpty v-else-if="!on" :art="{ mechanic: 'map' }">
      Turn on Session story (Settings › Farming &amp; sessions) to keep a history of every map you run.
    </WEmpty>
    <WSkeleton v-else-if="loading" :rows="4" />
    <WEmpty v-else-if="!inView.length" :art="{ mechanic: 'map' }">
      Maps show here as you run them. They're read from the game's log.
    </WEmpty>
    <template v-else>
      <div class="flex flex-wrap items-center gap-x-3 text-xs w-dim w-num">
        <span>{{ mapCount }} {{ mapCount === 1 ? 'map' : 'maps' }}<template v-if="skippedCount"> · {{ skippedCount }} {{ skippedCount === 1 ? 'vault' : 'vaults' }}</template></span>
        <span v-if="counted.length">Average {{ formatClock(avgMs) }}</span>
        <span>{{ deaths }} {{ deaths === 1 ? 'death' : 'deaths' }}</span>
        <WChip clickable :active="showSkipped" class="ml-auto" data-history-skipped
          title="Also list vaults and other areas that aren't counted as maps (Settings › Farming & sessions). They stay out of the count and average."
          @click="showSkipped = !showSkipped">Vaults</WChip>
      </div>
      <div>
        <div class="w-row w-row--head px-0" :class="$style.grid">
          <span>When</span><span>Map</span><span class="text-right">Time</span><span>Character</span><span>Met</span>
        </div>
        <div v-for="m in visible" :key="m.key + m.enteredAt" class="w-row px-0" :class="$style.grid" data-map-row>
          <span class="w-dim w-num w-trunc">{{ formatSessionDate(m.enteredAt) }}</span>
          <span class="w-trunc" :class="{ 'w-dim': skippedRow(m) }">{{ m.name }} <span class="w-dim">{{ skippedRow(m) ? 'not counted' : tierText(m.areaLevel) }}</span></span>
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
      <div class="text-xs w-faint">The character is the last one the log saw level up, so a character switch shows from its first level-up. Kills, XP and loot aren't in the log.</div>
    </template>
  </div>
</template>

<script setup lang="ts">
// Session analytics' Map history tab: every map read from Client.txt by Session story.
import { computed, shallowRef, watch } from 'vue'
import { AppConfig } from '@/web/Config'
import { saveConfig } from '@/web/Config'
import { WBanner, WChip, WEmpty, WSkeleton } from '../ui'
import { formatClock } from '../ui/format'
import { formatSessionDate, inRange } from '../analytics/stats'
import type { AnalyticsRange } from '../analytics/types'
import { isWidgetTypeOn } from '../modules'
import { tierText } from './map-log'
import { isSkippedArea } from './skip-areas'
import type { MapRecord } from './map-log'
import { DAY_MS_EXPORT, dayKey, readAllMaps, readMapDay, useNights } from './store'
import { SESSION_STORY_TYPE } from './widget'
import type { SessionStoryWidget } from './widget'

const props = defineProps<{ range: AnalyticsRange, league: string, now: number }>()

const store = useNights()
const on = computed(() => isWidgetTypeOn(AppConfig(), SESSION_STORY_TYPE))

// Read from disk while the tab is open, and let go when it closes. Seven days
// read only their own files; League and All read every day.
const all = shallowRef<MapRecord[]>([])
const loading = shallowRef(false)
const readError = shallowRef('')
let readId = 0
watch(() => [props.range, on.value] as const, async ([range]) => {
  if (!on.value) return
  const id = ++readId
  loading.value = true
  try {
    const got = range === '7d'
      ? (await Promise.all(Array.from({ length: 8 }, (_, i) => readMapDay(dayKey(props.now - i * DAY_MS_EXPORT))))).flat()
          .sort((a, b) => b.enteredAt - a.enteredAt)
      : await readAllMaps()
    if (id !== readId) return
    all.value = got
    readError.value = ''
  } catch (e) {
    if (id === readId) readError.value = e instanceof Error ? e.message : String(e)
  } finally {
    if (id === readId) loading.value = false
  }
}, { immediate: true })
// A map finished while the tab is open: add it, without reading every day again.
watch(() => store.lastSaved.value, (rec) => {
  // The newest saved copy already holds any earlier visit to the same map.
  if (rec) all.value = [rec, ...all.value.filter(m => m.key !== rec.key)]
})

// Vaults and other skipped areas: listed only when asked for, never counted.
// Kept on Session story's settings, next to the list itself.
const storyConfig = () => AppConfig().widgets.find(w => w.wmType === SESSION_STORY_TYPE) as SessionStoryWidget | undefined
const showSkipped = computed({
  get: () => storyConfig()?.historySkipped === true,
  set: (v: boolean) => {
    const c = storyConfig()
    if (!c) return
    c.historySkipped = v
    saveConfig()
  }
})
const skippedRow = (m: MapRecord) => isSkippedArea(m.name)

// "League" and "7 days" are this league's; maps saved before leagues were noted count as this one.
const inView = computed(() => all.value.filter(m =>
  (props.range === 'all' || !m.league || m.league === props.league) && inRange(m.enteredAt, props.range, props.now)))
const maps = computed(() => inView.value.filter(m => !skippedRow(m)))
const list = computed(() => showSkipped.value ? inView.value : maps.value)
const mapCount = computed(() => maps.value.length)
const skippedCount = computed(() => showSkipped.value ? inView.value.length - maps.value.length : 0)

const PAGE = 100
const limit = shallowRef(PAGE)
const visible = computed(() => list.value.slice(0, limit.value))

// As the chip counts it: maps under 30 s (a quick look in) left out.
const counted = computed(() => maps.value.filter(m => m.mapMs > 30_000))
const avgMs = computed(() => counted.value.reduce((s, m) => s + m.mapMs, 0) / Math.max(1, counted.value.length))
const deaths = computed(() => maps.value.reduce((s, m) => s + m.deaths, 0))

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
