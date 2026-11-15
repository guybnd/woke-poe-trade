<template>
  <Widget :config="config" move-handles="corners" :inline-edit="false">
    <!-- Nothing is drawn while closed. -->
    <WPanel v-if="isOpen" ref="panel" :title="config.wmTitle || 'Market'" icon="divine" :updated="loadedAt" :fresh-min="40" :stale-min="180"
      width="46rem" max-height="80vh" :scroll="false" fill>
      <template #actions>
        <WButton size="sm" icon="fas fa-chart-line" title="Price moves and your watchlist, in their own window" @click="openMovers">Movers</WButton>
      </template>

      <div :class="$style.split">
        <nav :class="[$style.side, 'w-scroll']" aria-label="Categories">
          <template v-for="g in groups" :key="g.label">
            <div class="w-group-label" :class="$style.sec">{{ g.label }}</div>
            <button v-for="c in g.categories" :key="c.type" type="button" :class="[$style.cat, { [$style.on]: c.type === category?.type }]"
              :aria-current="c.type === category?.type ? 'true' : undefined" @click="pick(c.type)">
              <span class="w-trunc">{{ c.label }}</span><span :class="$style.n">{{ c.count }}</span>
            </button>
          </template>
          <WSkeleton v-if="!groups.length && waiting" :rows="10" />
        </nav>

        <div :class="$style.main">
          <div :class="$style.tools">
            <WField v-model="query" icon="fas fa-search" :placeholder="category ? `Filter ${category.label}` : 'Filter'" class="grow" />
            <WSegmented v-model="unit" title="Show values in chaos or divines" :options="[{ value: 'chaos', label: 'c' }, { value: 'div', label: 'div' }]" />
            <WCorruptedFilter v-if="category?.type === 'SkillGem'" v-model="corrupted" />
            <WChip clickable :active="config.hideThin" title="Leave out items poe.ninja had no price for on 3 or more of the last 7 days. Their prices are easy to fake."
              @click="config.hideThin = !config.hideThin">Skip low confidence</WChip>
          </div>

          <div :class="[$style.rows, 'w-scroll']">
            <WSkeleton v-if="!category && waiting" :rows="12" />
            <WEmpty v-else-if="!category" :art="{ currency: 'divine' }">{{ leagueId ? 'No poe.ninja prices for this league yet.' : 'Select a league in Settings.' }}</WEmpty>
            <template v-else>
              <div class="w-row w-row--head" :class="$style.grid">
                <button type="button" :class="$style.sortBtn" @click="sortBy('name')">Name<i v-if="config.sort === 'name'" :class="sortIcon" /></button>
                <button type="button" :class="[$style.sortBtn, $style.right]" @click="sortBy('value')">Value<i v-if="config.sort === 'value'" :class="sortIcon" /></button>
                <button type="button" :class="[$style.sortBtn, $style.right]" title="poe.ninja's price line and change over the last 7 days" @click="sortBy('change')">Last 7 days<i v-if="config.sort === 'change'" :class="sortIcon" /></button>
              </div>
              <WEmpty v-if="!shown.length" icon="fas fa-search">No {{ category.label.toLowerCase() }} match<template v-if="query.trim()"> "{{ query.trim() }}"</template>.</WEmpty>
              <div v-for="r in shown" :key="r.key" v-item-tip="r" class="w-row" :class="$style.grid">
                <span class="w-trunc inline-flex items-center gap-2" :class="rarityClass(r.type)">
                  <WIcon :src="ninjaIcon(r.type, r.name) ?? undefined" size="md" />
                  <span class="w-trunc">{{ r.name }}<span v-if="r.variant" class="w-dim ml-1">{{ r.variant }}</span></span>
                </span>
                <span :class="$style.value">
                  <WPrice :chaos="r.chaos" :divine="divine" :unit="mainUnit(r)" />
                  <WPrice v-if="subUnit(r)" :chaos="r.chaos" :divine="divine" :unit="subUnit(r)!" class="w-faint" :class="$style.sub" />
                </span>
                <span :class="$style.trend">
                  <template v-if="r.change != null">
                    <WSpark v-if="r.trend.length >= 2" :values="r.trend" :width="64" />
                    <WDelta :value="r.change / 100" :class="$style.delta" />
                  </template>
                  <span v-else class="w-faint text-xs">Not enough data</span>
                </span>
              </div>
              <div v-if="filtered.length > ROW_LIMIT" class="w-faint text-xs" :class="$style.note">
                First {{ ROW_LIMIT }} of {{ filtered.length }}. Filter to find the rest.
              </div>
            </template>
          </div>
          <div v-if="category" class="w-faint text-xs" :class="$style.note">
            {{ filtered.length }} of {{ rows.length }} {{ rows.length === 1 ? 'item' : 'items' }} · poe.ninja<template v-if="divine"> · Divine {{ Math.round(divine) }}c</template>
          </div>
        </div>
      </div>
    </WPanel>
  </Widget>
</template>

<script lang="ts">
import { widgetMarketBrowserSpec } from '../widget-specs'

export default { widget: widgetMarketBrowserSpec }
</script>

<script setup lang="ts">
import { computed, inject, onScopeDispose, shallowRef, watch } from 'vue'
import type { WidgetManager } from '@/web/overlay/interfaces'
import Widget from '@/web/overlay/Widget.vue'
import { useLeagues } from '@/web/background/Leagues'
import { usePoeninja } from '@/web/background/Prices'
import { popupAnchor } from '../ui/window-anchor'
import { WButton, WChip, WDelta, WEmpty, WField, WIcon, WPanel, WPrice, WSegmented, WSkeleton, WSpark, ninjaIcon, vItemTip } from '../ui'
import WCorruptedFilter from '../ui/WCorruptedFilter.vue'
import { rarityClass } from '../search/search'
import { lastWokePrices, onWokePricesLoaded } from './hook'
import type { DenseChunk } from './parse'
import { categoryGroups, filterRows, parseCategory, sortRows } from './browser'
import type { MarketBrowserWidget, MarketRow, MarketSort } from './browser'
import { MARKET_TRACKER_TYPE } from './widget'
import { isCorrupted, isThin } from './types'
import type { CorruptedFilter } from './types'

const props = defineProps<{ config: MarketBrowserWidget }>()
const wm = inject<WidgetManager>('wm')!

if (props.config.wmFlags[0] === 'uninitialized') {
  props.config.wmFlags = ['invisible-on-blur']
  props.config.wmTitle = 'Market'
  props.config.anchor = popupAnchor()
  props.config.category = 'Currency'
  props.config.sort = 'value'
  props.config.desc = true
  props.config.unit = 'chaos'
  props.config.hideThin = false
  props.config.corrupted = 'any'
  // Whoever places it (the launcher) opens it; placed hidden, it costs nothing.
}

// Only while the window is open: nothing is read or parsed while it's closed.
// Hiding with the overlay keeps what it has, so reopening costs nothing.
const isOpen = computed(() => props.config.wmWants === 'show')

const leagues = useLeagues()
const leagueId = computed(() => leagues.selectedId.value)
const poeninja = usePoeninja()

// The prices APT holds; not a copy.
const chunks = shallowRef<DenseChunk[] | null>(null)
const loadedAt = shallowRef<number | null>(null)
// Skeleton only while a download runs; a failed or skipped one shows the note.
const waiting = computed(() => !chunks.value && !!leagueId.value && poeninja.isLoading.value)

function take (league: string, list: DenseChunk[], at: number) {
  if (league !== leagueId.value) return
  chunks.value = list
  loadedAt.value = at
}
let stop: (() => void) | null = null
watch([isOpen, leagueId], ([open]) => {
  stop?.()
  stop = null
  chunks.value = null
  loadedAt.value = null
  if (!open) return
  stop = onWokePricesLoaded(take)
  const last = lastWokePrices()
  if (last) take(last.leagueId, last.chunks, last.at)
}, { immediate: true })
onScopeDispose(() => { stop?.() })
// Each time it comes on screen: APT skips this while its prices are fresh.
watch(() => isOpen.value && wm.active.value, (shown) => {
  if (shown) poeninja.queuePricesFetch()
}, { immediate: true })

const groups = computed(() => chunks.value ? categoryGroups(chunks.value) : [])
const category = computed(() => {
  const all = groups.value.flatMap(g => g.categories)
  return all.find(c => c.type === props.config.category) ?? all[0] ?? null
})
const rows = computed<MarketRow[]>(() => category.value ? parseCategory(category.value.type, category.value.chunk) : [])
const divine = computed(() => chunks.value ? poeninja.xchgRate.value || null : null)

const query = shallowRef('')
const unit = computed({
  get: () => props.config.unit ?? 'chaos',
  set: (v: string) => { props.config.unit = v === 'div' ? 'div' : 'chaos' }
})
const corrupted = computed({
  get: () => props.config.corrupted ?? 'any',
  set: (v: CorruptedFilter) => { props.config.corrupted = v }
})

const ROW_LIMIT = 200
// Sorted once per category or sort; typing only filters.
const sorted = computed(() => sortRows(rows.value, props.config.sort ?? 'value', props.config.desc ?? true))
const filtered = computed(() => {
  let list = filterRows(sorted.value, query.value)
  if (props.config.hideThin) list = list.filter(r => !isThin(r))
  if (category.value?.type === 'SkillGem' && corrupted.value !== 'any') {
    const want = corrupted.value === 'only'
    list = list.filter(r => isCorrupted(r) === want)
  }
  return list
})
const shown = computed(() => filtered.value.slice(0, ROW_LIMIT))

function pick (type: string) {
  props.config.category = type
  query.value = ''
}
function sortBy (sort: MarketSort) {
  if (props.config.sort === sort) props.config.desc = !props.config.desc
  else {
    props.config.sort = sort
    props.config.desc = sort !== 'name'
  }
}
const sortIcon = computed(() => ['fas ml-1 text-xs', props.config.desc ? 'fa-caret-down' : 'fa-caret-up'])

// The main value in the chosen unit; the other one under it once it's worth a divine.
function mainUnit (r: MarketRow): 'chaos' | 'div' {
  return unit.value === 'div' && divine.value && r.name !== 'Divine Orb' ? 'div' : 'chaos'
}
function subUnit (r: MarketRow): 'chaos' | 'div' | null {
  if (!divine.value || r.name === 'Divine Orb' || r.chaos < divine.value) return null
  return mainUnit(r) === 'div' ? 'chaos' : 'div'
}

function openMovers () {
  const movers = wm.widgets.value.find(w => w.wmType === MARKET_TRACKER_TYPE)
  if (movers) {
    wm.show(movers.wmId)
    wm.bringToTop(movers.wmId)
  } else {
    wm.create(MARKET_TRACKER_TYPE)
  }
}
</script>

<style module>
.split { display: flex; min-height: 0; height: 100%; }
.side {
  width: 12.5rem; flex: none; overflow-y: auto; padding: var(--w-s1);
  display: flex; flex-direction: column; gap: 1px; border-right: 1px solid var(--w-line);
}
.sec { padding: var(--w-s2) var(--w-s2) 2px; }
.cat {
  display: flex; align-items: center; gap: var(--w-s2); width: 100%; min-height: var(--w-row-h);
  padding: 0 var(--w-s2); border-radius: var(--w-r-sm); text-align: left; color: var(--w-dim);
}
.cat:hover { background: var(--w-accent-soft); color: var(--w-fg); }
.cat:focus-visible { outline: 1px solid var(--w-accent); }
.on { background: var(--w-accent-soft); box-shadow: inset 2px 0 0 var(--w-accent); color: var(--w-fg); }
.n { margin-left: auto; font-family: var(--w-num); font-size: var(--w-fs-xs); color: var(--w-faint); }
.main { flex: 1; min-width: 0; display: flex; flex-direction: column; min-height: 0; }
.tools { display: flex; flex-wrap: wrap; align-items: center; gap: var(--w-s2); padding: var(--w-s2) var(--w-pad); }
.rows { flex: 1; min-height: 0; overflow-y: auto; }
.grid { grid-template-columns: minmax(0, 1fr) 6.5rem 8.5rem; }
.sortBtn { display: inline-flex; align-items: center; gap: 2px; color: inherit; font: inherit; }
.right { justify-content: flex-end; }
.value { display: flex; flex-direction: column; align-items: flex-end; line-height: 1.15; }
.sub { font-size: var(--w-fs-xs); }
.trend { display: flex; align-items: center; justify-content: flex-end; gap: var(--w-s2); }
.delta { min-width: 3.2rem; text-align: right; }
.note { padding: var(--w-s1) var(--w-pad); }
</style>
