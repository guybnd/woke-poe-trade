<template>
  <div data-night-card :class="$style.card">
    <div :class="$style.head">
      <span class="w-head-font w-accent" :class="$style.title">{{ title }}</span>
      <span class="w-dim text-xs w-num">{{ formatDuration(played) }} · {{ story.maps.length }} {{ story.maps.length === 1 ? 'map' : 'maps' }}</span>
    </div>
    <div :class="$style.strip" data-night-strip>
      <span v-for="(p, i) in story.strip" :key="i"
        :class="[p.afk ? $style.afk : p.skipped ? $style.skipped : p.map == null ? $style.out : $style.map, { [$style.pick]: pickable && p.map != null, [$style.sel]: p.map != null && story.maps[p.map].enteredAt === selected }]"
        :style="{ flexGrow: p.ms }" @mouseenter="tip($event, partTitle(p))" @mouseleave="untip"
        @click="p.map != null && pickable && emit('pick', story.maps[p.map].enteredAt)" />
      <span v-for="(x, i) in deathMarks" :key="'d' + i" :class="$style.death" :style="{ left: `${x}%` }" />
    </div>
    <div :class="$style.axis" class="w-num w-dim">
      <span>{{ clock(story.startedAt) }}</span>
      <span>{{ live ? 'now' : clock(story.endedAt) }}</span>
    </div>
    <div :class="$style.totals" class="w-num" data-night-totals>
      <span v-if="profit" @mouseenter="tip($event, profit.from)" @mouseleave="untip"><span class="w-dim">Profit</span> <span :class="profit.chaos >= 0 ? 'w-up' : 'w-down'">{{ signed(profit.chaos) }}</span></span>
      <span v-if="perHour != null" @mouseenter="tip($event, hoursTip)" @mouseleave="untip"><span class="w-dim">per h</span> {{ formatChaos(perHour, story.divine) }}</span>
      <span v-if="story.maps.length"><span class="w-dim">Avg map</span> {{ formatClock(story.mapMs / story.maps.length) }}</span>
      <span v-if="mapsPerHour != null"><span class="w-dim">Maps/h</span> {{ mapsPerHour }}</span>
      <span @mouseenter="tip($event, HIDEOUT_TIP)" @mouseleave="untip"><span class="w-dim">Hideout</span> {{ formatDuration(story.otherMs) }}</span>
      <span v-if="(story.afkMs ?? 0) >= 60_000" @mouseenter="tip($event, AFK_TIP)" @mouseleave="untip"><span class="w-dim">AFK</span> {{ formatDuration(story.afkMs!) }}</span>
      <span v-if="story.longestBreakMs && story.longestBreakMs >= 60_000"><span class="w-dim">Longest break</span> {{ formatClock(story.longestBreakMs) }}</span>
      <span><span class="w-dim">Deaths</span> {{ story.deathsAt.length }}</span>
    </div>
    <label :class="$style.check" data-night-hub @mouseenter="tip($event, hoursTip)" @mouseleave="untip"><input v-model="leaveOutHub" type="checkbox">Leave out hideout</label>
    <div v-if="story.levelUps?.length" :class="$style.line" class="w-num" data-night-levels>
      <span v-for="l in story.levelUps" :key="l.char"><span class="w-dim">{{ story.levelUps.length > 1 ? l.char : 'Level' }}</span> {{ l.from }} → {{ l.to }}</span>
    </div>
    <div v-if="story.best" :class="$style.line" class="w-num" data-night-best>
      <span class="w-accent">★</span> {{ story.best.name }} · {{ formatChaos(story.best.chaos, story.divine) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted } from 'vue'
import { AppConfig, saveConfig } from '@/web/Config'
import { hideHelp, showHelp } from '../ui/help-tip'
import { formatChaos, formatClock, formatDuration } from '../ui/format'
import type { NightStory, StripPart } from './story'
import { SESSION_STORY_TYPE } from './widget'
import type { SessionStoryWidget } from './widget'

const props = defineProps<{
  story: NightStory
  live?: boolean
  title: string
  // Profit from Farming sessions inside the night, used when the stash reader didn't read.
  farm?: { chaos: number, sessions: number } | null
  // Map segments can be clicked (Session analytics: opens that map's row).
  pickable?: boolean
  // The map shown as picked, by when you entered it.
  selected?: number | null
}>()
const emit = defineEmits<{ pick: [enteredAt: number] }>()

// Time played: AFK left out.
const played = computed(() => props.story.endedAt - props.story.startedAt - (props.story.afkMs ?? 0))
// Per hour leaves out hideout and town unless asked, as Net worth's does. Kept
// on Session story's settings, so the dock card and Session analytics agree.
const storyConfig = () => AppConfig().widgets.find(w => w.wmType === SESSION_STORY_TYPE) as SessionStoryWidget | undefined
const leaveOutHub = computed({
  get: () => storyConfig()?.nightWithHub !== true,
  set: (on: boolean) => {
    const c = storyConfig()
    if (!c) return
    c.nightWithHub = !on
    saveConfig()
  }
})
const rateHours = computed(() => (played.value - (leaveOutHub.value ? props.story.hubMs ?? 0 : 0)) / 3_600_000)
const hoursTip = computed(() => `Per hour of ${formatDuration(rateHours.value * 3_600_000)}: ${props.story.hubMs == null ? 'hideout time not recorded for this night' : `AFK${leaveOutHub.value ? ', hideout and town' : ''} left out`}`)
const profit = computed(() => {
  if (props.story.profitChaos != null) return { chaos: props.story.profitChaos, from: 'From stash reads (Net worth)' }
  if (props.farm) return { chaos: props.farm.chaos, from: `From Farming's loot, ${props.farm.sessions} ${props.farm.sessions === 1 ? 'session' : 'sessions'}` }
  return null
})
const perHour = computed(() => {
  const hours = rateHours.value
  return profit.value && hours >= 0.25 ? profit.value.chaos / hours : null
})
const mapsPerHour = computed(() => {
  const hours = rateHours.value
  return hours >= 0.25 ? (props.story.maps.length / hours).toFixed(1) : null
})
const deathMarks = computed(() => {
  // The strip is drawn by the clock, AFK included.
  const span = props.story.endedAt - props.story.startedAt
  return span > 0 ? props.story.deathsAt.map(at => Math.min(100, Math.max(0, (at - props.story.startedAt) / span * 100))) : []
})

const HIDEOUT_TIP = "Hideout, town, vaults and anything else that isn't a map, AFK left out"
const AFK_TIP = 'AFK in the game, left out of the time played. 15 minutes AFK ends the night'

// The app's own tooltip card, not the browser's.
const tipOwner = {}
function tip (e: MouseEvent, text: string) {
  showHelp(tipOwner, e.currentTarget as HTMLElement, text)
}
function untip () { hideHelp(tipOwner) }
onUnmounted(untip)

function tier (level: number): string {
  return level >= 68 && level <= 83 ? `T${level - 67}` : `level ${level}`
}
function partTitle (p: StripPart): string {
  if (p.afk) return `AFK · ${formatClock(p.ms)}`
  if (p.skipped) return `Vault, counted as time out of maps · ${formatClock(p.ms)}`
  if (p.map == null) return `Out of maps · ${formatClock(p.ms)}`
  const m = props.story.maps[p.map]
  const deaths = m.deaths ? ` · ${m.deaths} ${m.deaths === 1 ? 'death' : 'deaths'}` : ''
  return `${m.name} ${tier(m.level)} · ${formatClock(m.mapMs)} in the map${deaths}`
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
.pick { cursor: pointer; }
.sel { opacity: 1; outline: 2px solid var(--w-fg); outline-offset: 1px; position: relative; z-index: 1; }
.out {
  min-width: 1px;
  background: repeating-linear-gradient(90deg, var(--w-line) 0 3px, transparent 3px 6px);
}
.skipped { min-width: 1px; background: var(--w-line); opacity: 0.45; }
.afk { min-width: 1px; }
.check { display: inline-flex; align-items: center; gap: 5px; padding: 3px var(--w-pad) 0; font-size: var(--w-fs-xs); color: var(--w-dim); cursor: pointer; }
.check:hover { color: var(--w-fg); }
.death {
  position: absolute;
  top: -3px;
  bottom: -3px;
  width: 2px;
  background: var(--w-down);
  pointer-events: none;
  z-index: 2;
}
.axis { display: flex; justify-content: space-between; padding: 0 var(--w-pad); font-size: 0.8em; }
.totals {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 12px;
  padding: 6px var(--w-pad) 0;
}
.line { display: flex; flex-wrap: wrap; gap: 2px 12px; padding: 3px var(--w-pad) 0; }
.card { padding-bottom: 6px; }
</style>
