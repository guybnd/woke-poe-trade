<template>
  <Widget :config="config" move-handles="corners" :inline-edit="false">
    <WPanel :title="config.wmTitle || 'Disenchant'" icon="/images/dust.png" :updated="snapshot?.ts ?? null" :fresh-min="40" :stale-min="180" width="40rem" resizable>
      <template #toolbar>
        <WSegmented :model-value="config.mode" :options="RANK_MODES" @update:model-value="pickMode" />
        <WField v-model="text" type="search" placeholder="Unique or base" icon="fas fa-search" style="width: 10rem;" />
        <WChip clickable :active="config.hideThin" title="Leave out uniques poe.ninja had no price for on 3 or more of the last 7 days" @click="config.hideThin = !config.hideThin">
          <i class="fas fa-exclamation-circle" /> Hide thin
        </WChip>
        <WButton size="sm" variant="ghost" icon="fas fa-layer-group" :disabled="!league || listingsLoading || tooSoon"
          :title="countsTitle" @click="countListings">
          {{ listingsLoading ? 'Counting…' : counts ? `Counted ${agoPhrase(counts.ts)}` : 'Count listings' }}
        </WButton>
        <WInfo class="ml-auto" :text="INFO" />
      </template>
      <template #meta>
        <span class="flex flex-wrap gap-2 items-center">
          <span>Dust at least</span>
          <WField :model-value="config.minDust" type="number" style="width: 6rem;" aria-label="Least dust" @update:model-value="v => config.minDust = Math.max(0, Number(v) || 0)" />
          <span>Price up to</span>
          <WField :model-value="config.maxChaos ?? ''" type="number" suffix="c" style="width: 5rem;" aria-label="Highest price in chaos" @update:model-value="v => config.maxChaos = optional(v)" />
          <span>Gold fee up to</span>
          <WField :model-value="config.maxGold ?? ''" type="number" style="width: 5.5rem;" aria-label="Highest gold fee" @update:model-value="v => config.maxGold = optional(v)" />
          <template v-if="config.mode === 'total-cost'">
            <span>10k gold is worth</span>
            <WField :model-value="config.goldChaosPer10k" type="number" suffix="c" style="width: 4.5rem;" aria-label="Chaos per 10,000 gold" @update:model-value="v => config.goldChaosPer10k = Math.max(0, Number(v) || 0)" />
          </template>
        </span>
      </template>

      <div v-if="listingsError" class="w-down" :class="$style.note">Couldn't count listings: {{ listingsError }}</div>
      <WSkeleton v-if="!snapshot" :rows="8" />
      <WEmpty v-else-if="!uniques.length" icon="fas fa-hammer" :art="{ currency: 'dust' }">The item data has no dust values, so there's nothing to rank.</WEmpty>
      <WEmpty v-else-if="!allRows.length" icon="fas fa-hammer" :art="{ currency: 'dust' }">poe.ninja has no unique prices for {{ league }} yet.</WEmpty>
      <WEmpty v-else-if="!ranked.length" icon="fas fa-hammer" :art="{ currency: 'dust' }">No unique matches these filters.</WEmpty>
      <template v-else>
        <div class="w-row w-row--head" :class="[$style.grid, { [$style.withCounts]: counts }]">
          <span>Unique</span>
          <span class="text-right">Price</span>
          <span class="text-right" title="Dust at item level 84, at the quality shown">Dust</span>
          <span class="text-right w-accent" :title="modeTitle">{{ modeLabel }}</span>
          <span class="text-right" title="Gold the trade site charges to buy it">Gold</span>
          <span v-if="counts" class="text-right" title="Listings on poe.ninja when you counted">Listed</span>
          <span />
        </div>
        <div v-for="r in shown" :key="r.name" class="w-row" :class="[$style.grid, { [$style.withCounts]: counts, [$style.done]: boughtSet.has(r.name) }]"
          @contextmenu="rowMenu($event, r)">
          <span :class="$style.named">
            <span v-item-tip="{ name: r.name }" class="w-trunc w-rarity-unique">{{ r.name }}</span>
            <span class="w-trunc w-faint text-xs">{{ r.base }}<template v-if="r.quality === 0"> · q0</template><span v-if="r.catalyse" :class="$style.cat" :title="`Buy ${CATALYSTS_FOR_Q20} catalysts for 20% quality first; the cost includes them`"> · catalyse</span><span v-if="r.thin" class="w-down" title="Thin market: poe.ninja had no price on 3 or more of the last 7 days"> · thin</span></span>
          </span>
          <WPrice :chaos="r.chaos" :divine="snapshot?.divine" class="text-right" />
          <span class="text-right w-num">{{ amount(r.dust) }}</span>
          <span class="text-right w-num w-accent">{{ amount(rankValue(r, rankOpts)) }}</span>
          <span class="text-right w-num w-dim">{{ amount(r.gold) }}</span>
          <span v-if="counts" class="text-right w-num" :class="listedClass(r.name)">{{ counts.counts.get(r.name) ?? '–' }}</span>
          <span class="flex justify-end gap-1">
            <WButton size="sm" variant="ghost" icon="fas fa-search" :title="`Open ${r.name} on the trade site, cheapest first`" :aria-label="`Trade ${r.name}`" @click="openTrade(r)" />
            <WButton size="sm" variant="ghost" :icon="boughtSet.has(r.name) ? 'fas fa-check' : 'far fa-square'"
              :title="boughtSet.has(r.name) ? 'Bought. Click to untick' : 'Tick when bought'" :aria-label="`Bought ${r.name}`" @click="toggleBought(r.name)" />
          </span>
        </div>
        <div v-if="ranked.length > limit" :class="$style.note">
          <WButton size="sm" @click="limit += PAGE">Show {{ Math.min(PAGE, ranked.length - limit) }} more of {{ ranked.length - limit }}</WButton>
        </div>
      </template>

      <template #footer>
        <span class="w-faint text-xs">{{ footer }}</span>
        <WButton v-if="boughtSet.size" size="sm" variant="ghost" class="ml-auto" @click="clearBought">Clear {{ boughtSet.size }} ticked</WButton>
      </template>
    </WPanel>
  </Widget>
</template>

<script setup lang="ts">
import { computed, inject, shallowRef, watch } from 'vue'
import type { WidgetManager } from '@/web/overlay/interfaces'
import Widget from '@/web/overlay/Widget.vue'
import { AppConfig } from '@/web/Config'
import { useLeagues } from '@/web/background/Leagues'
import { getTradeEndpoint } from '@/web/price-check/trade/common'
import { WButton, WChip, WEmpty, WField, WInfo, WPanel, WPrice, WSegmented, WSkeleton, agoPhrase, openMenu, toast, vItemTip } from '../ui'
import { copyText } from '../ui/copy'
import { popupAnchor } from '../ui/window-anchor'
import { usePriceIndex } from '../market/price-index'
import { CATALYSTS_FOR_Q20, RANK_MODES, cheapestPrices, dustRows, filterRows, rankRows, rankValue } from './calc'
import type { DustRow, RankMode } from './calc'
import { dustUniques } from './data'
import { FEW_LISTINGS, countsFor, recountTooSoon, listingsError, listingsLoading, loadListingCounts } from './listings'
import { initDisenchant, tradeLink } from './widget'
import type { DisenchantWidget } from './widget'

const props = defineProps<{
  config: DisenchantWidget
}>()

const wm = inject<WidgetManager>('wm')!

if (props.config.wmFlags[0] === 'uninitialized') {
  props.config.wmFlags = ['invisible-on-blur']
  props.config.wmTitle = 'Disenchant'
  props.config.anchor = popupAnchor()
  initDisenchant(props.config)
  wm.show(props.config.wmId)
}
props.config.bought ??= {}

const PAGE = 60
const INFO = 'Uniques ranked by Thaumaturgic Dust for what they cost, to buy and disenchant at Kingsmarch. Dust is at item level 84: weapons and armour at 20% quality, jewellery with catalysts when that gives more dust per chaos. poe.ninja prices, cheapest plain version. Logic from poe-disenchant-tool by deronek.'

// Holds the price collector while the panel is open: no polling of its own.
const index = usePriceIndex()
const snapshot = computed(() => index.snapshot.value)
const leagues = useLeagues()
const league = computed(() => leagues.selectedId.value)

const text = shallowRef('')
const limit = shallowRef(PAGE)

// Read once per price update; the item data only changes on a new download.
const uniques = computed(() => snapshot.value ? dustUniques() : [])
const allRows = computed(() => snapshot.value ? dustRows(uniques.value, snapshot.value.items) : [])
const rankOpts = computed(() => ({ mode: props.config.mode ?? 'per-chaos', goldChaosPer10k: props.config.goldChaosPer10k ?? 5 }))
const ranked = computed(() => rankRows(filterRows(allRows.value, {
  minDust: props.config.minDust || 0,
  maxGold: props.config.maxGold,
  maxChaos: props.config.maxChaos,
  hideThin: props.config.hideThin,
  text: text.value
}), rankOpts.value))
const shown = computed(() => ranked.value.slice(0, limit.value))
watch([text, () => props.config.mode, league], () => { limit.value = PAGE })

const mode = computed(() => RANK_MODES.find(m => m.value === props.config.mode) ?? RANK_MODES[0])
const modeLabel = computed(() => mode.value.label)
const modeTitle = computed(() => mode.value.title)
function pickMode (v: string) { props.config.mode = v as RankMode }

// Priced uniques the item data has no dust number for yet (a new league's).
const missing = computed(() => {
  if (!snapshot.value) return 0
  const known = new Set(uniques.value.map(u => u.name))
  let n = 0
  for (const name of cheapestPrices(snapshot.value.items).keys()) if (!known.has(name)) n++
  return n
})
const footer = computed(() => {
  if (!snapshot.value) return 'Waiting for poe.ninja prices.'
  const parts = [`${ranked.value.length} of ${allRows.value.length} uniques`]
  if (missing.value) parts.push(`${missing.value} priced without a dust number`)
  return parts.join(' · ')
})

const counts = computed(() => countsFor(league.value))
const tooSoon = computed(() => counts.value != null && recountTooSoon.value)
const countsTitle = computed(() => counts.value
  ? (tooSoon.value ? 'poe.ninja updates about hourly; you can count again in a few minutes.' : 'Count again (three poe.ninja requests). Counts never refresh on their own.')
  : `Fetch listing counts from poe.ninja (three requests, only now). Fewer than ${FEW_LISTINGS} listed shows in red.`)
function listedClass (name: string) {
  const n = counts.value?.counts.get(name)
  return n != null && n < FEW_LISTINGS ? 'w-down' : 'w-dim'
}
function countListings () {
  if (league.value) loadListingCounts(league.value).catch(() => {})
}

const boughtSet = computed(() => new Set(league.value ? props.config.bought[league.value] ?? [] : []))
function toggleBought (name: string) {
  const id = league.value
  if (!id) return
  const list = props.config.bought[id] ?? []
  props.config.bought = { ...props.config.bought, [id]: list.includes(name) ? list.filter(n => n !== name) : [...list, name] }
}
function clearBought () {
  const id = league.value
  if (!id) return
  props.config.bought = Object.fromEntries(Object.entries(props.config.bought).filter(([k]) => k !== id))
}

function openTrade (r: DustRow) {
  if (!league.value) { toast('Pick a league in the settings first'); return }
  window.open(tradeLink(league.value, r, props.config.tradeIlvl || 84, getTradeEndpoint(), AppConfig().language === 'en'))
}

function rowMenu (e: MouseEvent, r: DustRow) {
  openMenu(e, [
    { label: 'Open on the trade site', icon: 'fas fa-search', action: () => openTrade(r) },
    { label: `Copy "${r.name}"`, icon: 'far fa-copy', action: () => { copyText(r.name).then(ok => { if (ok) toast(`Copied "${r.name}"`, { ms: 1800 }) }) } }
  ])
}

function optional (v: string | number): number | null {
  const n = Number(v)
  return v === '' || !Number.isFinite(n) || n <= 0 ? null : n
}
function amount (n: number) {
  return Math.round(n).toLocaleString('en-US')
}
</script>

<style module>
.grid { grid-template-columns: minmax(0, 1fr) 58px 64px 72px 52px 56px; }
.grid.withCounts { grid-template-columns: minmax(0, 1fr) 58px 64px 72px 52px 44px 56px; }
.named { display: flex; flex-direction: column; min-width: 0; line-height: 1.25; }
.done { opacity: 0.45; }
.cat { color: var(--w-accent); }
.note { padding: 6px var(--w-pad); }
</style>
