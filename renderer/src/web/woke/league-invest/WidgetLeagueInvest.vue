<template>
  <Widget :config="config" move-handles="corners" :inline-edit="false">
    <!-- First two weeks of a league, in town and hideout: today's best buys. -->
    <DockItem :menu="dockMenu" id="league-invest" title="League investments" :show="dockShow"
      :badge="day != null ? `D${day}` : null" :wm-id="config.wmId" card-width="21rem">
      <template #card>
        <div style="padding: 4px var(--w-pad) 6px;" class="flex flex-col gap-0.5">
          <div v-for="r in ranked.slice(0, 5)" :key="opportunityKey(r.opportunity)" class="flex justify-between gap-2">
            <span v-item-tip="r.opportunity" class="flex items-center gap-1 min-w-0"><WIcon :src="art(r.opportunity)" fallback="fas fa-coins" /><span class="w-trunc">{{ r.opportunity.name }}<span v-if="r.opportunity.variant" class="w-dim"> {{ r.opportunity.variant }}</span></span></span>
            <span class="w-num whitespace-nowrap"><span class="w-up">+{{ Math.round((r.opportunity.median - 1) * 100) }}%</span>
              <span v-if="r.chaos != null" class="w-dim"> · {{ formatChaos(r.chaos, snapshot?.divine ?? null) }}</span></span>
          </div>
          <div v-if="!ranked.length" class="w-dim text-xs">No buys stand out for day {{ day }}.</div>
          <div class="w-faint text-xs mt-1">From past leagues, rise by day {{ (day ?? 0) + config.horizon }}</div>
        </div>
      </template>
    </DockItem>
    <WPanel ref="panel" :title="config.wmTitle || 'League investments'" icon="divine" width="36rem" max-height="80vh"
      :updated="snapshot?.ts ?? null" :fresh-min="40" :stale-min="180">
      <template #toolbar>
        <WField v-model="config.budgetDiv" type="number" suffix="div budget" style="width: 8.5rem;" />
        <WField v-model="config.slots" type="number" suffix="items" style="width: 6rem;" />
        <WSegmented :model-value="String(config.horizon)" title="How long to hold"
          :options="[{ value: '3', label: '3d' }, { value: '7', label: '7d' }, { value: '14', label: '14d' }]"
          @update:model-value="config.horizon = Number($event)" />
        <WChip clickable :active="config.bulkOnly" title="Only items sold in bulk at one price (currency, fragments, scarabs, cards…)"
          @click="config.bulkOnly = !config.bulkOnly">Bulk only</WChip>
        <WInfo class="ml-auto" text="Past patterns break when a patch changes drops. Prices are poe.ninja listings, not sales." />
      </template>
      <template #meta>
        <span v-if="!league">No league selected</span>
        <span class="inline-flex items-center gap-1">day
          <input :value="day ?? ''" type="number" min="0" :class="$style.dayInput"
            title="League day (0 = launch day). Clear to use the start date." @change="onDayInput"></span>
        <span v-if="config.dayOverride == null && start" class="w-faint">started {{ start }}</span>
        <span v-else-if="config.dayOverride == null" style="color: var(--w-warn);">start date unknown, enter the day</span>
        <button v-else class="w-accent hover:underline" @click="config.dayOverride = null">use start date</button>
      </template>

      <div v-if="historiesLoaded && !histories.length" :class="$style.data">
        <div class="w-dim pb-2">
          Import poe.ninja league dumps from
          <a href="https://poe.ninja/poe1/data" target="_blank" class="w-accent hover:underline">poe.ninja/poe1/data</a>
          (the .zip, or the &lt;League&gt;.items.csv and .currency.csv files). Only challenge softcore leagues are kept.
          A few past leagues ship with the app; your own imports of the same league replace them.
        </div>
        <div class="flex items-center gap-2 pb-2">
          <WButton variant="primary" size="sm" icon="fas fa-file-import" :disabled="importing" @click="fileInput?.click()">
            {{ importing ? 'Importing…' : 'Import files' }}
          </WButton>
          <span v-if="importMsg" class="text-xs" :class="importError ? 'w-down' : 'w-dim'">{{ importMsg }}</span>
          <input ref="fileInput" type="file" multiple accept=".zip,.csv" class="hidden" @change="onFiles">
        </div>
      </div>

      <WSkeleton v-if="!historiesLoaded" :rows="6" />
      <WEmpty v-else-if="note" :art="{ currency: 'divine' }">{{ note }}
        <template v-if="!histories.length" #actions>
          <WButton size="sm" variant="primary" icon="fas fa-file-import" :disabled="importing" @click="fileInput?.click()">Import files</WButton>
        </template>
      </WEmpty>
      <template v-else>
        <div v-if="plan.length" :class="$style.hero">
          <div><div :class="$style.k">Spend</div><div :class="$style.big" class="w-num">{{ fmt(planCost) }}</div></div>
          <div><div :class="$style.k">Typical after {{ config.horizon }}d</div><div :class="$style.big" class="w-num w-up">{{ fmtDiv(planExpected) }}</div></div>
          <div><div :class="$style.k">Items</div><div :class="$style.big" class="w-num">{{ plan.length }}</div></div>
        </div>
        <template v-if="plan.length">
          <div class="w-group-label">Suggested split</div>
          <div v-for="line in plan" :key="key(line.opportunity)" class="w-row" :class="$style.planGrid">
            <span v-item-tip="line.opportunity" class="w-trunc flex items-center gap-1"><WIcon :src="art(line.opportunity)" fallback="fas fa-coins" />{{ line.qty }}× {{ label(line.opportunity) }}<i v-if="line.thin" class="fas fa-exclamation-circle w-faint ml-1" :title="THIN_PLAN" /></span>
            <WPrice :chaos="line.cost" :divine="snapshot?.divine" class="w-dim" />
            <span class="w-num w-up text-right" title="Typical value at the end of the hold, in today's divines">≈ {{ fmtDiv(divOf(line.cost) * line.opportunity.median) }}</span>
          </div>
        </template>

        <div class="w-group-label">Rose most reliably from day {{ day }} to day {{ (day ?? 0) + config.horizon }}</div>
        <div class="w-row w-row--head" :class="$style.rankGrid">
          <span>Item</span><span class="text-right">Now</span><span class="text-right">Median</span><span class="text-right">Leagues</span><span class="text-right">Up days</span>
        </div>
        <div v-for="r in rows" :key="key(r.opportunity)" class="w-row" :class="$style.rankGrid" @contextmenu="rowMenu($event, r.opportunity, r.changed)">
          <span v-item-tip="r.opportunity" class="w-trunc flex items-center gap-1">
            <WIcon :src="art(r.opportunity)" fallback="fas fa-coins" />
            <i v-if="r.changed" class="fas fa-exclamation-triangle mr-1" style="color: var(--w-warn);" title="Changed this league: past leagues may not apply" />
            <i v-if="r.thin || r.opportunity.reliability < THIN_RELIABILITY" class="fas fa-exclamation-circle w-faint mr-1" :title="THIN_ROW" />{{ label(r.opportunity) }}<span class="w-faint text-xs ml-1">{{ r.opportunity.type }}</span>
            <span v-if="mixed(r.opportunity)" class="text-xs ml-1" style="color: var(--w-warn);" :title="perLeague(r.opportunity)">mixed</span>
          </span>
          <WPrice :chaos="r.chaos" :divine="snapshot?.divine" title="Price now" />
          <span class="w-num w-up text-right" :title="`Median rise in divines across past leagues\n${perLeague(r.opportunity)}`">×{{ r.opportunity.median.toFixed(r.opportunity.median >= 10 ? 0 : 1) }}</span>
          <span class="w-num w-dim text-right" title="Leagues where it rose ≥10% / leagues with data">{{ hits(r.opportunity) }}/{{ r.opportunity.leagues.length }}</span>
          <span class="w-num text-right" title="Share of days it went up">{{ Math.round(r.opportunity.upDays * 100) }}%</span>
        </div>
      </template>

    </WPanel>
  </Widget>
</template>

<script lang="ts">
import type { WidgetSpec } from '@/web/overlay/interfaces'
import { LEAGUE_INVEST_TYPE } from './widget'

export default {
  widget: {
    type: LEAGUE_INVEST_TYPE,
    instances: 'multi',
    trNameKey: 'League investments'
  } satisfies WidgetSpec
}
</script>

<script setup lang="ts">
import { popupAnchor } from '../ui/window-anchor'
import { inject, computed, shallowRef, watch } from 'vue'
import type { WidgetManager } from '@/web/overlay/interfaces'
import Widget from '@/web/overlay/Widget.vue'
import { WInfo, WPanel, WField, WSegmented, WChip, WButton, WPrice, WEmpty, WIcon, WSkeleton, openMenu, toast, vItemTip } from '../ui'
import { offerItem } from '../ui/tooltip/item-menu'
import { ninjaIcon } from '../ui/game-icons'
import { useLeagues } from '@/web/background/Leagues'
import { useMarketCollector } from '../market/collector'
import { latestSnapshots } from '../market/db'
import { formatAmount, formatChaos } from '../ui/format'
import { isThin, itemKey } from '../market/types'
import type { Snapshot } from '../market/types'
import { THIN_RELIABILITY, opportunityKey, planBudget, rankOpportunities } from './invest'
import type { Opportunity } from './invest'
import { histories, historiesLoaded, importError, importMsg, importing, onFiles, reloadHistories } from './league-data'
import { leagueDay, leagueStartDates } from './league-start'
import DockItem from '../dock/DockItem.vue'
import { dockIconEl, saveDock } from '../dock/dock'
import type { DockMenuAction } from '../dock/dock'
import { useZone } from '../shared/zone'
import { useVisibleClock } from '../shared/visible-clock'
import type { LeagueInvestWidget } from './widget'
import { changedMatchers, isChanged } from './widget'

const props = defineProps<{
  config: LeagueInvestWidget
}>()

const wm = inject<WidgetManager>('wm')!

if (props.config.wmFlags[0] === 'uninitialized') {
  props.config.wmFlags = ['invisible-on-blur']
  props.config.wmTitle = 'League investments'
  props.config.anchor = popupAnchor()
  props.config.budgetDiv = 5
  props.config.slots = 5
  props.config.horizon = 7
  props.config.bulkOnly = false
  props.config.minMultiple = 1.2
  props.config.leagueStart = ''
  props.config.dayOverride = null
  wm.show(props.config.wmId)
}

const collector = useMarketCollector({ poll: true })
const leagues = useLeagues()
const league = computed(() => leagues.selectedId.value)

const snapshot = shallowRef<Snapshot | null>(null)
const apiStart = shallowRef<string | null>(null)
const fileInput = shallowRef<HTMLInputElement | null>(null)

reloadHistories()

// A slow read for the previous league must not land after a newer one.
let snapSeq = 0
watch([league, collector.revision], async () => {
  const seq = ++snapSeq
  const id = league.value
  if (!id) { snapshot.value = null; return }
  try {
    const [snap] = await latestSnapshots(id, 1)
    if (seq === snapSeq) snapshot.value = snap ?? null
  } catch { if (seq === snapSeq) snapshot.value = null }
}, { immediate: true })

watch(league, async (id) => {
  apiStart.value = null
  if (!id) return
  try {
    const startDate = (await leagueStartDates()).get(id) ?? null
    if (league.value === id) apiStart.value = startDate
  } catch {}
}, { immediate: true })

const start = computed(() => props.config.leagueStart || apiStart.value)
// The overlay runs for days: the league day moves on at midnight UTC. The
// clock is read on every zone change (the dock icon shows in town) and each
// minute while the panel is open.
const zone = useZone()
const clock = shallowRef(Date.now())
useVisibleClock(() => props.config, () => { clock.value = Date.now() }, 60_000)
watch(() => zone.enteredAt, () => { clock.value = Date.now() })
const day = computed<number | null>(() => {
  if (props.config.dayOverride != null) return props.config.dayOverride
  return start.value ? Math.max(0, leagueDay(start.value, clock.value)) : null
})

const dockShow = computed(() => day.value != null && day.value <= 14 && histories.value.length > 0 &&
  props.config.doneLeague !== league.value &&
  (zone.kind === 'town' || zone.kind === 'hideout'))

function onDayInput (e: Event) {
  const v = (e.target as HTMLInputElement).value.trim()
  const n = Math.floor(Number(v))
  // Blank or not a number: back to the day from the league start.
  props.config.dayOverride = v === '' || !Number.isFinite(n) ? null : Math.max(0, n)
}

// Live prices: exact item match, or by name for currency-like items
// (the dump lumps fragments etc. under "Currency").
const live = computed(() => {
  const exact = new Map<string, number>()
  const byName = new Map<string, number>()
  const thin = new Set<string>()
  for (const i of snapshot.value?.items ?? []) {
    exact.set(itemKey(i), i.chaos)
    if (isThin(i)) thin.add(itemKey(i))
    if (!i.variant && !byName.has(i.name)) byName.set(i.name, i.chaos)
  }
  return { exact, byName, thin }
})

function livePrice (o: Opportunity): number | null {
  if (o.links) return null
  const exact = live.value.exact.get(itemKey(o))
  if (exact != null) return exact
  if (o.type === 'Currency' && !o.variant) return live.value.byName.get(o.name) ?? null
  return null
}

const ranked = computed(() => {
  if (day.value == null || !histories.value.length) return []
  return rankOpportunities(histories.value, {
    day: day.value,
    horizon: props.config.horizon,
    minLeagues: Math.min(2, histories.value.length),
    minMultiple: props.config.minMultiple || 1.2,
    minReliability: 0.5,
    minBuyChaos: 5,
    bulkOnly: props.config.bulkOnly
  }).map(opportunity => ({
    opportunity,
    chaos: livePrice(opportunity),
    thin: live.value.thin.has(itemKey(opportunity)),
    changed: isChanged(opportunity.name, changed.value)
  })).filter(r => !(r.changed && props.config.hideChanged))
})

const rows = computed(() => ranked.value.slice(0, 60))
const changed = computed(() => changedMatchers(props.config.changedItems))

// Past leagues disagree: it fell in one and rose well in another.
function mixed (o: Opportunity) {
  return o.multiples.length >= 2 && Math.min(...o.multiples) < 1 && Math.max(...o.multiples) >= 1.2
}

function perLeague (o: Opportunity) {
  return o.leagues.map((l, i) => {
    const m = o.multiples[i]
    const pct = Math.round((m - 1) * 100)
    return `${l}: ${pct >= 0 ? '+' : ''}${pct}%`
  }).join('\n')
}

const THIN_ROW = 'Thin market: few trades on poe.ninja now or in past leagues. Hard to buy or sell much without moving the price.'
const THIN_PLAN = 'Thin market, so this line gets at most a third of a slot.'

const plan = computed(() => {
  const divine = snapshot.value?.divine
  if (!divine) return []
  return planBudget(ranked.value, (props.config.budgetDiv || 0) * divine, Math.max(1, props.config.slots || 1))
})
const planCost = computed(() => plan.value.reduce((s, l) => s + l.cost, 0))
const planExpected = computed(() => plan.value.reduce((s, l) => s + divOf(l.cost) * l.opportunity.median, 0))

const note = computed(() => {
  if (!histories.value.length) return 'Import at least one past league to get started (two or more give much better results).'
  if (day.value == null) return 'Enter the league day above.'
  const maxDay = Math.max(...histories.value.map(h => h.days - 1))
  if (day.value + props.config.horizon > maxDay) {
    return `The imported leagues only cover up to day ${maxDay}. Try a shorter hold.`
  }
  if (!ranked.value.length) return 'Nothing in the imported leagues rose reliably over this stretch.'
  return ''
})

const panel = shallowRef<InstanceType<typeof WPanel> | null>(null)

function art (o: Opportunity) {
  return ninjaIcon(o.type, o.name) ?? undefined
}

function rowMenu (e: MouseEvent, o: Opportunity, isChangedNow: boolean) {
  // The item strip (copy, trade, wiki…) sits on top, wherever on the row.
  offerItem(e, o)
  openMenu(e, [
    ...(isChangedNow
      ? []
      : [{
          label: 'Mark as changed this league',
          icon: 'fas fa-exclamation-triangle',
          action: () => {
            const before = props.config.changedItems ?? ''
            props.config.changedItems = [before.trimEnd(), o.name].filter(Boolean).join('\n')
            toast(`Marked ${o.name} as changed`, { anchor: panel.value?.el, undo: () => { props.config.changedItems = before } })
          }
        }])
  ])
}

function key (o: Opportunity) { return opportunityKey(o) }
function hits (o: Opportunity) { return o.multiples.filter(m => m >= 1.1).length }
function label (o: Opportunity) {
  return [o.name, o.variant, o.links].filter(Boolean).join(' ')
}
function divOf (chaos: number) { return chaos / (snapshot.value?.divine || 1) }
function fmt (chaos: number) { return formatChaos(chaos, snapshot.value?.divine ?? null) }
function fmtDiv (div: number) { return `${formatAmount(div)} div` }

// The icon's right-click menu.
const dockMenu = computed<DockMenuAction[]>(() => [{
  label: 'Done for this league',
  icon: 'fas fa-calendar-check',
  action: () => {
    const el = dockIconEl('league-invest')
    const before = props.config.doneLeague
    props.config.doneLeague = league.value ?? undefined
    saveDock()
    toast('League investments won\'t show again this league', {
      anchor: el,
      dock: true,
      undo: () => { props.config.doneLeague = before; saveDock() }
    })
  }
}])
</script>

<style module>
.data {
  padding: 4px var(--w-pad) 10px;
  border-bottom: 1px solid var(--w-line);
}
.textarea {
  width: 100%;
  padding: 4px 8px;
  font-size: var(--w-fs-md);
  color: var(--w-fg);
  background: var(--w-panel-2);
  border: 1px solid var(--w-line);
  border-radius: var(--w-r-sm);
  resize: vertical;
}
.dayInput {
  width: 3rem;
  height: 20px;
  padding: 0 4px;
  color: var(--w-fg);
  background: var(--w-panel-2);
  border: 1px solid var(--w-line);
  border-radius: var(--w-r-sm);
}
.hero {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  padding: 8px var(--w-pad);
  border-bottom: 1px solid var(--w-line);
}
.k {
  font-size: var(--w-fs-xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--w-faint);
}
.big { font-size: var(--w-fs-xl); font-weight: 500; }
.planGrid { grid-template-columns: minmax(0, 1fr) 76px 80px; }
.rankGrid { grid-template-columns: minmax(0, 1fr) 72px 56px 56px 56px; }
</style>
