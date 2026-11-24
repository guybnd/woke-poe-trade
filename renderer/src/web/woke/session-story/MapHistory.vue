<template>
  <div ref="root" class="flex flex-col gap-2" data-map-history>
    <WBanner v-if="readError || store.mapsError.value">Couldn't read your map history: {{ readError || store.mapsError.value }}</WBanner>
    <WEmpty v-else-if="!on" :art="{ mechanic: 'map' }">
      Turn on Session story (Settings › Sessions) to keep a history of every map you run.
    </WEmpty>
    <WSkeleton v-else-if="loading" :rows="4" />
    <WEmpty v-else-if="!inView.length" :art="{ mechanic: 'map' }">
      Maps show here as you run them. They're read from the game's log.
    </WEmpty>
    <template v-else>
      <!-- The range in words, so it isn't read as tonight's figures above. -->
      <div class="flex flex-wrap items-center gap-x-3">
      <div class="w-num" data-history-summary>
        <b>{{ mapCount }}</b> <span class="w-dim">{{ mapCount === 1 ? 'map' : 'maps' }} {{ rangeText }}</span>
        <template v-if="counted.length"><span class="w-dim"> · avg</span> <b>{{ formatClock(avgMs) }}</b></template>
        <span class="w-dim"> · </span><b>{{ deaths }}</b> <span class="w-dim">{{ deaths === 1 ? 'death' : 'deaths' }}</span>
        <template v-if="diedIn"><span class="w-dim"> in</span> <b>{{ diedIn }}</b> <span class="w-dim">{{ diedIn === 1 ? 'map' : 'maps' }}</span></template>
        <template v-if="skippedCount"><span class="w-dim"> · {{ skippedCount }} {{ skippedCount === 1 ? 'vault' : 'vaults' }} not counted</span></template>
      </div>
        <!-- Filters behind one button: the mechanics met, maps with a death, and vaults. -->
        <WButton variant="ghost" size="sm" class="ml-auto" :class="{ 'w-accent': filter || showSkipped }" data-history-filter
          @click="filterMenu">{{ filterLabel }} ▾</WButton>
      </div>
      <div v-if="notSaved" class="text-xs w-dim" data-history-not-saved>
        {{ notSaved === 'range' ? 'That map is outside this range. Pick League or All above to see it.' : 'That map shows here once you start the next one.' }}
      </div>
      <div data-history-list>
        <template v-for="line in lines" :key="lineKey(line)">
          <!-- A day: its date and totals. -->
          <button v-if="line.kind === 'day'" type="button" :class="$style.day" data-history-day :data-folded="isFolded(line.at) || undefined"
            :aria-expanded="!isFolded(line.at)" @click="toggleDay(line.at)">
            <i class="fas fa-fw w-dim" :class="[$style.fold, isFolded(line.at) ? 'fa-caret-right' : 'fa-caret-down']" aria-hidden="true" />
            <span class="w-head-font w-accent" :class="$style.dayTitle">{{ dayLabel(line.at, now).title }}</span>
            <span v-if="dayLabel(line.at, now).date" class="w-dim text-xs">{{ dayLabel(line.at, now).date }}</span>
            <span class="ml-auto text-xs w-num w-dim">
              {{ line.maps }} {{ line.maps === 1 ? 'map' : 'maps' }}<template v-if="line.avgMs != null"> · avg {{ formatClock(line.avgMs) }}</template><template v-if="line.reads"> · <span :class="line.chaos >= 0 ? 'w-up' : 'w-down'">{{ dayMoney(line) }}</span></template>
            </span>
          </button>
          <!-- The character, at the top of a day and when you switch. -->
          <div v-else-if="line.kind === 'char'" :class="$style.char" class="text-xs w-num" data-history-char
            @mouseenter="tip($event, line.className ? `${line.char}, ${line.className}` : line.char)" @mouseleave="untip">
            {{ line.char }}<template v-if="line.level != null"> · Level {{ line.level }}</template>
          </div>
          <!-- A Net worth stash read: what came in since the read before. -->
          <div v-else-if="line.kind === 'read'" :class="$style.read" class="text-xs w-num" data-income-row
            @mouseenter="tip($event, readTip(line.read))" @mouseleave="untip">
            <span class="w-dim">Stash read<template v-if="line.read.maps"> · {{ line.read.maps }} {{ line.read.maps === 1 ? 'map' : 'maps' }}</template><template v-if="line.read.purchase"> · purchase<template v-if="line.read.spent"> ({{ money(line.read.spent, line.read.rate) }} spent)</template></template><template v-if="line.read.perHour != null && !line.read.purchase"> · {{ money(line.read.perHour, line.read.rate) }}/h</template></span>
            <span class="ml-auto" :class="line.read.chaos >= 0 ? 'w-up' : 'w-down'">{{ signed(line.read.chaos, line.read.rate) }}</span>
          </div>
          <div v-else class="w-row px-0" :class="[$style.grid, $style.mapRow, { [$style.sel]: isFocus(line.map) }]" data-map-row
            :data-map-at="line.map.enteredAt" v-item-tip="mapTip(line.map)" @click="emit('select', line.map.enteredAt)">
            <span class="w-dim w-num">{{ clockTime(line.map.enteredAt) }}</span>
            <span class="w-trunc" :class="{ 'w-dim': skippedRow(line.map) }">{{ line.map.name }} <span class="w-dim">{{ skippedRow(line.map) ? 'not counted' : tierText(line.map.areaLevel) }}</span><span v-for="n in line.map.npcs" :key="n" :class="$style.mech">{{ n }}</span><span v-if="line.map.levelsGained" :class="$style.mech" class="w-accent">+{{ line.map.levelsGained }} {{ line.map.levelsGained === 1 ? 'level' : 'levels' }}</span></span>
            <!-- Deaths keep their own column, so the times stay lined up. -->
            <span class="text-right w-num w-down">{{ line.map.deaths ? `✕${line.map.deaths}` : '' }}</span>
            <span class="text-right w-num">{{ formatClock(line.map.mapMs) }}</span>
          </div>
        </template>
        <button v-if="drawn.more" type="button" class="w-accent text-xs pt-1" @click="limit += PAGE">
          Show more ({{ drawn.more }} older)
        </button>
      </div>
      <div class="text-xs w-faint">The character is the last one the log saw level up, so a character switch shows from its first level-up. Kills, XP and loot aren't in the log.</div>
    </template>
  </div>
</template>
<script setup lang="ts">
// Session analytics' Map history tab: every map read from Client.txt by Session story.
import { computed, nextTick, onUnmounted, shallowRef, watch } from 'vue'
import { AppConfig } from '@/web/Config'
import { saveConfig } from '@/web/Config'
import { WBanner, WButton, WEmpty, WSkeleton, openMenu, vItemTip } from '../ui'
import type { ItemTipRef } from '../ui/tooltip/item-tip'
import { hideHelp, showHelp } from '../ui/help-tip'
import { formatChaos, formatClock } from '../ui/format'
import { inRange } from '../analytics/stats'
import type { AnalyticsRange } from '../analytics/types'
import { isWidgetTypeOn } from '../modules'
import { mapItemName, tierText } from './map-log'
import { incomeRows, interleave } from './income'
import type { IncomeRow } from './income'
import { clockTime, dayLabel, dayStart, openIndex, withDays } from './history-days'
import type { DayLine, HistoryLine } from './history-days'
import { stashGains } from '../net-worth/gains'
import type { StashGain } from '../net-worth/valuation'
import { isSkippedArea } from './skip-areas'
import type { MapRecord } from './map-log'
import { DAY_MS_EXPORT, dayKey, readAllMaps, readMapDay, useNights } from './store'
import { SESSION_STORY_TYPE } from './widget'
import type { SessionStoryWidget } from './widget'
const props = defineProps<{
  range: AnalyticsRange
  league: string
  now: number
  // A map picked on tonight's strip, by when you entered it: shown and scrolled to.
  focus?: number | null
  // The window's div / chaos switch, and today's chaos per divine for reads without their own.
  unit: 'div' | 'chaos'
  divine?: number | null
}>()
const emit = defineEmits<{ select: [enteredAt: number] }>()
const root = shallowRef<HTMLElement | null>(null)
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
// Chips: the mechanics met in the listed maps, and maps with a death.
const filter = shallowRef<string | null>(null)
// Not a name the log gives an NPC.
const DEATHS = '#deaths'
const chips = computed(() => {
  const count = new Map<string, number>()
  for (const m of maps.value) for (const n of new Set(m.npcs)) count.set(n, (count.get(n) ?? 0) + 1)
  const out = [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id, n]) => ({ id, label: id, count: n }))
  const died = maps.value.filter(m => m.deaths > 0).length
  if (died) out.push({ id: DEATHS, label: 'a death', count: died })
  // The picked chip stays while its maps are listed.
  return out
})
watch(chips, (list) => { if (filter.value && !list.some(c => c.id === filter.value)) filter.value = null })
const matches = (m: MapRecord) => !filter.value || (filter.value === DEATHS ? m.deaths > 0 : m.npcs.includes(filter.value))
// The filter button's menu: one mechanic (or maps with a death) at a time, and vaults.
const filterLabel = computed(() => {
  const c = chips.value.find(c => c.id === filter.value)
  return c ? `Only ${c.label}` : 'Filter'
})
function filterMenu (e: MouseEvent) {
  openMenu(e, [
    { label: 'All maps', checked: !filter.value, action: () => { filter.value = null } },
    ...(chips.value.length ? [{ separator: true as const, heading: 'Only maps with' }] : []),
    ...chips.value.map(c => ({ label: `${c.label} (${c.count})`, checked: filter.value === c.id, action: () => { filter.value = filter.value === c.id ? null : c.id } })),
    { separator: true as const },
    { label: 'Also list vaults', checked: showSkipped.value, action: () => { showSkipped.value = !showSkipped.value } }
  ])
}
const list = computed(() => (showSkipped.value ? inView.value : maps.value).filter(matches))
const mapCount = computed(() => maps.value.length)
const skippedCount = computed(() => showSkipped.value ? inView.value.length - maps.value.length : 0)
const PAGE = 100
const limit = shallowRef(PAGE)
// Net worth's stash reads in the same range, as their own rows between maps.
const gains = shallowRef<StashGain[]>([])
let gainsId = 0
async function readGains () {
  const id = ++gainsId
  const got = props.league ? await stashGains(props.league) : []
  if (id === gainsId) gains.value = got
}
watch(() => [props.league, on.value] as const, () => { if (on.value) readGains() }, { immediate: true })
// A read lands a few minutes after a map, and a purchase can be marked later
// on the Net worth chart: look again each minute while the tab is open.
watch(() => [store.lastSaved.value, props.now], () => { if (on.value) readGains() })
// Purchases are worked out over every read, then cut to the range.
const reads = computed(() => incomeRows(gains.value, maps.value).filter(r => inRange(r.at, props.range, props.now)))
const items = computed(() => interleave(list.value, reads.value))
// Days fold with a click on their header. Today (or the newest day) starts
// open and older days folded; a click flips a day from that.
const flipped = shallowRef<ReadonlySet<number>>(new Set())
const newestDay = computed(() => items.value.length ? dayStart(items.value[0].at) : null)
const isFolded = (day: number) => (day !== newestDay.value) !== flipped.value.has(day)
const folded = computed(() => new Set([...new Set(items.value.map(it => dayStart(it.at)))].filter(isFolded)))
function toggleDay (day: number) {
  const next = new Set(flipped.value)
  if (next.has(day)) next.delete(day)
  else next.add(day)
  flipped.value = next
}
function openDay (day: number) {
  if (isFolded(day)) toggleDay(day)
}
// Day headers add up every counted map and read of the day, whatever the filter.
const dayTotals = computed(() => interleave(maps.value, reads.value))
const drawn = computed(() => withDays(items.value, limit.value, isSkippedArea, folded.value, dayTotals.value))
// A day's stash income: in divines each read counts at its own rate, as its line does.
function dayMoney (d: DayLine): string {
  if (props.unit === 'div' && d.div != null) return `${d.div > 0 ? '+' : ''}${formatChaos(d.div, 1, 'div')}`
  return signed(d.chaos, d.rate)
}
const lines = computed(() => drawn.value.lines)
const lineKey = (l: HistoryLine) => l.kind === 'day' || l.kind === 'char' ? l.key : `${l.kind}:${l.at}`
const RANGE_TEXT: Record<AnalyticsRange, string> = { '7d': 'in 7 days', 'league': 'this league', 'all': 'in all leagues' }
const rangeText = computed(() => RANGE_TEXT[props.range])
// The strip and the log stamp a map with the same log line's time.
const isFocus = (m: MapRecord) => props.focus != null && m.enteredAt === props.focus
// A pick waits for the maps to load, then shows once (later loads don't jump back).
let pending: number | null = null
// A pick with no row: not saved yet (Session story saves a map when you start
// the next one), or outside the range or league picked above.
const notSaved = shallowRef<false | 'range' | 'later'>(false)
async function showPick () {
  const at = pending
  if (at == null || loading.value) return
  pending = null
  // A chip that hides the map lets go; then page down to it and scroll there.
  const source = showSkipped.value ? inView.value : maps.value
  if (filter.value && !source.some(m => m.enteredAt === at && matches(m))) filter.value = null
  if (!items.value.some(it => it.kind === 'map' && it.map.enteredAt === at)) {
    notSaved.value = all.value.some(m => m.enteredAt === at) || !inRange(at, props.range, props.now) ? 'range' : 'later'
    return
  }
  notSaved.value = false
  // Its day opens, then the page reaches it.
  openDay(dayStart(at))
  const idx = openIndex(items.value, folded.value, it => it.kind === 'map' && it.map.enteredAt === at)
  if (idx >= limit.value) limit.value = idx + PAGE
  await nextTick()
  root.value?.querySelector<HTMLElement>(`[data-map-at="${at}"]`)?.scrollIntoView({ block: 'nearest' })
}
watch(() => props.focus, (at) => { pending = at ?? null; notSaved.value = false; showPick() }, { immediate: true })
watch(loading, () => { showPick() })
// In the window's unit: a read's own divine rate, else today's.
const money = (chaos: number, rate: number | null) => formatChaos(chaos, rate ?? props.divine ?? null, props.unit)
const signed = (chaos: number, rate: number | null) => `${chaos > 0 ? '+' : ''}${money(chaos, rate)}`
// As the chip counts it: maps under 30 s (a quick look in) left out.
const counted = computed(() => maps.value.filter(m => m.mapMs > 30_000))
const avgMs = computed(() => counted.value.reduce((s, m) => s + m.mapMs, 0) / Math.max(1, counted.value.length))
const deaths = computed(() => maps.value.reduce((s, m) => s + m.deaths, 0))
const diedIn = computed(() => maps.value.filter(m => m.deaths > 0).length)
// The map's tooltip ("Fortress Map", or a unique map by its own name), with
// the run under it. A vault or other area that isn't counted shows just its
// name and the run.
function mapTip (m: MapRecord): ItemTipRef {
  const item = mapItemName(m.name)
  const run = [
    `Entered ${clockTime(m.enteredAt)} · ${formatClock(m.mapMs)} ${skippedRow(m) ? 'inside' : 'in the map'}${m.deaths ? ` · ${m.deaths} ${m.deaths === 1 ? 'death' : 'deaths'}` : ''}`,
    ...(m.char ? [`${m.char}${m.className ? `, ${m.className}` : ''}${m.charLevel != null ? `, level ${m.levelsGained ? `${m.charLevel} → ${m.charLevel + m.levelsGained}` : m.charLevel}` : ''}`] : []),
    ...(m.npcs.length ? [`Met ${m.npcs.join(', ')}`] : [])
  ].join('\n')
  // Maps aren't their own items in the item data, so the card is the map's
  // name and run, with its poe.ninja price when it has one.
  return skippedRow(m) ? { name: m.name, note: run, noPrice: true, noMenu: true } : { name: item, note: run, noMenu: true }
}
function readTip (r: IncomeRow): string {
  const since = r.since != null ? ` since the read at ${clockTime(r.since)}` : ''
  return r.purchase
    ? `Stash read at ${clockTime(r.at)}. Marked as a purchase: what was spent is left out of profit.`
    : `Stash read at ${clockTime(r.at)}: your stash's value changed by ${signed(r.chaos, r.rate)}${since}.`
}
// The app's own tooltip card, not the browser's.
const tipOwner = {}
function tip (e: MouseEvent, text: string) { showHelp(tipOwner, e.currentTarget as HTMLElement, text) }
function untip () { hideHelp(tipOwner) }
onUnmounted(untip)
</script>
<style module>
.grid {
  display: grid;
  grid-template-columns: 3rem minmax(0, 1fr) 1.75rem 3.25rem;
  gap: 8px;
  align-items: baseline;
}
.mapRow { cursor: pointer; }
.sel { box-shadow: inset 2px 0 0 var(--w-accent); background: var(--w-accent-soft); }
.day {
  display: flex;
  width: 100%;
  text-align: left;
  cursor: pointer;
  align-items: baseline;
  gap: 8px;
  margin-top: 8px;
  padding: 2px 0 3px;
  border-bottom: 1px solid var(--w-line-strong);
}
.day:first-child { margin-top: 0; }
.day:hover .fold { color: var(--w-fg); }
.fold { width: 1em; font-size: 0.85em; }
.dayTitle { font-size: 1.05em; }
.char { padding: 4px 0 1px; color: var(--w-accent); opacity: 0.8; }
.mech {
  display: inline-block;
  margin-left: 4px;
  padding: 0 5px;
  border: 1px solid var(--w-line);
  border-radius: var(--w-r-sm, 2px);
  font-size: var(--w-fs-xs);
  color: var(--w-dim);
  line-height: 1.4;
}
/* A stash read: a thin line between maps, not a row of its own weight. */
.read {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 0;
}
.read::before {
  content: "";
  flex: 0 0 3rem;
  border-top: 1px dashed var(--w-line-strong);
}
</style>
