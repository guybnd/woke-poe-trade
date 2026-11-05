<template>
  <Widget :config="config" move-handles="corners" :inline-edit="false" :readonly="true">
    <!-- The verdict on hover, so a quick check doesn't open the panel. -->
    <DockItem id="scarab-flip" title="Scarab flip" :show="Boolean(model)" :wm-id="config.wmId">
      <template #card>
        <div v-if="model" class="flex flex-col gap-0.5" style="padding: 2px var(--w-pad) 6px;">
          <span class="w-num">{{ verdict }} · {{ verdictSub }}</span>
          <span v-if="buy[0]" class="w-dim w-num">Best supply: {{ shortScarab(buy[0].name) }}, {{ fmt(buy[0].chaos) }}, +{{ fmt(buy[0].profit) }}</span>
          <span v-if="rareCheap.length" class="w-dim"><i class="fas fa-star w-warn" /> {{ rareCheap.length }} rare and cheap</span>
        </div>
      </template>
    </DockItem>
    <WPanel :title="config.wmTitle || 'Scarab flip'" :icon="panelIcon" :updated="snapshot?.ts ?? null" :fresh-min="40" :stale-min="180" width="32rem">
      <template #tabs>
        <WTabs v-model="config.tab" :options="[
          { value: 'buy', label: 'Buy list', count: model ? buy.length : undefined },
          { value: 'odds', label: 'Odds' },
          { value: 'rare', label: 'Rare & cheap', count: model ? rareCheap.length : undefined }
        ]" />
      </template>
      <template #toolbar>
        <WSelect :model-value="String(config.sellDiscount)" title="What you lose selling results below the listed price"
          :options="[0, 5, 10, 20].map(n => ({ value: String(n), label: `Sell discount ${n}%` }))"
          @update:model-value="config.sellDiscount = Number($event)" />
        <WChip clickable :active="config.reroll" title="Vendor results worth less than a third of a recipe instead of selling them"
          @click="config.reroll = !config.reroll"><i class="fas fa-recycle" /> Reroll cheap results</WChip>
        <WChip v-if="config.tab === 'buy'" clickable :active="config.hideUntraded" :title="`Hide scarabs with under ${UNTRADED_CHAOS}c traded a day: their price means little`"
          @click="config.hideUntraded = !config.hideUntraded">Hide untraded</WChip>
      </template>
      <template #meta>
        <template v-if="model">
          <span>{{ snapshot?.league }}</span><span class="w-faint">·</span>
          <span class="w-num">{{ model.rows.length }} scarabs priced</span>
        </template>
        <span v-else>Waiting for poe.ninja prices…</span>
      </template>

      <div v-if="model" :class="$style.verdict" class="w-num">
        <b>{{ verdict }}</b>
        <span class="w-dim">{{ verdictSub }}<template v-if="buy.length"> · {{ buy.length }} of {{ model.rows.length }} scarabs qualify</template></span>
      </div>

      <WSkeleton v-if="!model" :rows="8" />

      <template v-else-if="config.tab === 'buy'">
        <WEmpty v-if="!buy.length" icon="fas fa-recycle">Nothing is cheap enough to vendor right now.</WEmpty>
        <template v-else>
          <div class="w-row w-row--head" :class="$style.buyGrid">
            <span>Scarab</span><span class="text-right">Price</span><span class="text-right" title="Return of a recipe using 3 of this scarab, minus their price">Profit / recipe</span>
            <template v-if="hasVolume"><span class="text-right" title="Scarabs traded in the last 24 hours">Traded / day</span><span class="text-right" title="Most profit a day, if you bought every scarab traded">c / day</span></template>
          </div>
          <div v-for="r in buy" :key="r.name" class="w-row" :class="$style.buyGrid" @contextmenu="rowMenu($event, r.name)">
            <ScarabName :row="r" />
            <WPrice :chaos="r.chaos" :divine="snapshot?.divine" class="text-right" />
            <span class="text-right w-up w-num">+{{ amount(r.profit) }}c</span>
            <template v-if="hasVolume">
              <span class="text-right w-dim w-num">{{ Math.round(r.tradedPerDay ?? 0) }}</span>
              <span class="text-right w-num">{{ Math.round(r.profitPerDay ?? 0) }}c</span>
            </template>
          </div>
        </template>
      </template>

      <template v-else-if="config.tab === 'odds'">
        <div :class="$style.note" class="w-num">
          <template v-if="odds.medianResult != null">Half of all recipes return {{ fmt(odds.medianResult) }} or less. </template>
          Before any rerolls, a recipe sells for {{ fmt(odds.saleValue) }} on average.
        </div>
        <div :class="$style.legend">
          <span><i :class="[$style.key, $style.chance]" />Chance of this result</span>
          <span><i :class="[$style.key, $style.value]" />Share of the value</span>
        </div>
        <div v-for="b in odds.buckets" :key="b.label" :class="$style.bucket" class="w-num">
          <span>{{ b.label }}</span>
          <div :class="$style.track">
            <div :class="[$style.fill, $style.chance]" :style="{ width: `${b.chance / oddsScale * 100}%` }" />
            <div :class="[$style.fill, $style.value]" :style="{ width: `${b.valueShare / oddsScale * 100}%` }" />
          </div>
          <span class="w-dim text-right">{{ pct(b.chance) }}</span>
          <span class="text-right" :style="{ color: 'var(--w-accent)' }">{{ pct(b.valueShare) }}</span>
        </div>
        <div class="w-group-label">Biggest sources of value</div>
        <div v-for="s in odds.sources" :key="s.name" class="w-row" :class="$style.sourceGrid" @contextmenu="rowMenu($event, s.name)">
          <span class="w-trunc" :title="s.name">{{ shortScarab(s.name) }}</span>
          <WPrice :chaos="s.chaos" :divine="snapshot?.divine" class="text-right" />
          <span class="text-right w-num w-dim">{{ pct(s.valueShare) }}</span>
        </div>
        <div v-if="odds.jackpotOneIn" :class="$style.note" class="w-num">
          A {{ JACKPOT_CHAOS }}c+ result comes about 1 in {{ Math.round(odds.jackpotOneIn) }} recipes. Without those, a recipe sells for {{ fmt(odds.withoutJackpot) }}, so {{ fmt(odds.withoutJackpot / 3) }} each is the safer buy line.
        </div>
      </template>

      <template v-else>
        <div :class="$style.note" class="w-num">
          These drop under {{ pct(RARE_SHARE) }} of the time but cost less than a third of a typical rare scarab<template v-if="model.typicalRare != null"> ({{ fmt(model.typicalRare) }})</template>, so they may rise later. Hold them rather than vendoring.
        </div>
        <WEmpty v-if="!rareCheap.length" icon="fas fa-star">No exceptionally rare scarab is cheap right now.</WEmpty>
        <template v-else>
          <div class="w-row w-row--head" :class="$style.rareGrid">
            <span>Scarab</span><span class="text-right">Price</span><span class="text-right" title="Chance per recipe or drop, from the weights">Drops</span>
            <span v-if="hasVolume" class="text-right" title="Scarabs traded in the last 24 hours">Traded / day</span>
          </div>
          <div v-for="r in rareCheap" :key="r.name" class="w-row" :class="$style.rareGrid" @contextmenu="rowMenu($event, r.name)">
            <ScarabName :row="r" />
            <WPrice :chaos="r.chaos" :divine="snapshot?.divine" class="text-right" />
            <span class="text-right w-dim w-num">1 in {{ Math.round(1 / r.share).toLocaleString('en-US') }}</span>
            <span v-if="hasVolume" class="text-right w-dim w-num">{{ Math.round(r.tradedPerDay ?? 0) }}</span>
          </div>
        </template>
      </template>

      <template #footer>
        <span :title="footerTitle">3.27 player weights, {{ model?.rows.length ?? 0 }} scarabs<template v-if="model?.unrated.length"> · {{ model.unrated.length }} with no weight left out</template></span>
      </template>
    </WPanel>
  </Widget>
</template>

<script lang="ts">
import type { WidgetSpec } from '@/web/overlay/interfaces'
import { SCARAB_FLIP_TYPE } from './widget'

export default {
  widget: {
    type: SCARAB_FLIP_TYPE,
    instances: 'multi',
    trNameKey: 'Scarab flip'
  } satisfies WidgetSpec
}
</script>

<script setup lang="ts">
import { popupAnchor } from '../ui/window-anchor'
import { computed, defineComponent, h, inject, shallowRef, watch } from 'vue'
import type { PropType } from 'vue'
import type { WidgetManager } from '@/web/overlay/interfaces'
import Widget from '@/web/overlay/Widget.vue'
import { Host } from '@/web/background/IPC'
import { useLeagues } from '@/web/background/Leagues'
import { WPanel, WTabs, WSelect, WChip, WPrice, WEmpty, WSkeleton, openMenu, toast } from '../ui'
import { copyText } from '../ui/copy'
import { formatAmount, formatChaos } from '../ui/format'
import { gameIcon, moduleIcon } from '../ui/game-icons'
import { useMarketCollector } from '../market/collector'
import { latestSnapshots } from '../market/db'
import type { Snapshot } from '../market/types'
import DockItem from '../dock/DockItem.vue'
import { RARE_SHARE, UNTRADED_CHAOS, JACKPOT_CHAOS, buyList, flipModel, flipOdds, parseExchange, rareCheapList, scarabQuotes, shortScarab } from './calc'
import type { ExchangeQuotes, ScarabRow } from './calc'
import type { ScarabFlipWidget } from './widget'

const props = defineProps<{
  config: ScarabFlipWidget
}>()

const wm = inject<WidgetManager>('wm')!

if (props.config.wmFlags[0] === 'uninitialized') {
  props.config.wmFlags = ['invisible-on-blur']
  props.config.wmTitle = 'Scarab flip'
  props.config.anchor = popupAnchor()
  props.config.tab = 'buy'
  props.config.sellDiscount = 0
  props.config.reroll = false
  props.config.hideUntraded = true
  wm.show(props.config.wmId)
}

const collector = useMarketCollector({ poll: true })
const leagues = useLeagues()
const league = computed(() => leagues.selectedId.value)

const snapshot = shallowRef<Snapshot | null>(null)
const exchange = shallowRef<ExchangeQuotes | null>(null)

// The dense prices have no volume, so the exchange feed is fetched alongside
// them. If it fails the panel still works, without volume.
const EXCHANGE_MAX_AGE_MS = 20 * 60 * 1000
let exchangeAt = 0
let exchangeLeague: string | undefined

// A slow read for the previous league must not land after a newer one.
let loadSeq = 0
async function load () {
  const seq = ++loadSeq
  const id = league.value
  if (!id) { snapshot.value = null; exchange.value = null; return }
  try {
    const [snap] = await latestSnapshots(id, 1)
    if (seq === loadSeq) snapshot.value = snap ?? null
  } catch {
    if (seq === loadSeq) snapshot.value = null
  }
  // A newer load has started (league switch or revision): leave the
  // exchange to it, or this one could wipe what it just stored.
  if (seq !== loadSeq) return
  if (exchangeLeague === id && Date.now() - exchangeAt < EXCHANGE_MAX_AGE_MS) return
  if (exchangeLeague !== id) exchange.value = null
  try {
    const response = await Host.proxy(`poe.ninja/poe1/api/economy/exchange/current/overview?league=${encodeURIComponent(id)}&type=Scarab`)
    const parsed = response.ok ? parseExchange(await response.json()) : null
    if (seq === loadSeq) {
      exchange.value = parsed
      // Only a good answer is cached; after a 429 or 5xx the next load retries.
      if (response.ok) {
        exchangeLeague = id
        exchangeAt = Date.now()
      }
    }
  } catch {
    if (seq === loadSeq) exchange.value = null
  }
}
watch([league, collector.revision], load, { immediate: true })

const model = computed(() => {
  if (!snapshot.value) return null
  const quotes = scarabQuotes(snapshot.value.items, exchange.value)
  if (!quotes.size) return null
  return flipModel(quotes, { sellDiscount: props.config.sellDiscount / 100, reroll: props.config.reroll })
})

const panelIcon = moduleIcon('scarab-flip').art ?? undefined
const hasVolume = computed(() => exchange.value != null)
const buy = computed(() => model.value ? buyList(model.value, props.config.hideUntraded) : [])
const rareCheap = computed(() => model.value ? rareCheapList(model.value) : [])
const odds = computed(() => flipOdds(model.value!))
// Both bars use one scale, so a long value bar means more than a long chance bar.
const oddsScale = computed(() => Math.max(...odds.value.buckets.flatMap(b => [b.chance, b.valueShare]), 0.0001))

const verdict = computed(() => {
  const m = model.value
  if (!m) return ''
  // Each row's break-even leaves its own type out of the pool, so one
  // pool-wide "buy under" price would disagree with the list below.
  const n = buy.value.length
  return n ? `${n} scarab${n === 1 ? '' : 's'} worth vendoring` : 'Nothing worth buying right now'
})
const verdictSub = computed(() => model.value ? `A recipe returns ${fmt(model.value.recipeValue)} on average` : '')

const footerTitle = computed(() => {
  const tiers = model.value?.rows.filter(r => r.weightSource === 'tier').length ?? 0
  const left = model.value?.unrated.join(', ')
  return [
    'Weights: 33,333 vendor rolls from version 3.27, linked from the PoE Wiki, so they may have drifted. Very rare scarabs rest on only a few rolls.',
    tiers ? `${tiers} scarabs use the average weight of their wiki rarity tier.` : '',
    left ? `No weight, left out: ${left}.` : '',
    hasVolume.value ? 'Prices and volume: poe.ninja exchange.' : 'Prices: poe.ninja. Volume is missing because the exchange feed did not load.'
  ].filter(Boolean).join('\n')
})

const ScarabName = defineComponent({
  props: { row: { type: Object as PropType<ScarabRow>, required: true } },
  setup (p) {
    return () => {
      const icon = gameIcon(p.row.name)
      return h('span', { class: 'flex items-center gap-1 min-w-0', title: p.row.name }, [
        icon ? h('img', { src: icon, style: 'width: 20px; height: 20px; object-fit: contain; flex: none;', alt: '', loading: 'lazy', decoding: 'async', draggable: 'false' }) : null,
        h('span', { class: 'w-trunc' }, shortScarab(p.row.name)),
        p.row.rareCheap
          ? h('i', { class: 'fas fa-star w-warn', style: 'flex: none; font-size: 11px;', title: 'Exceptionally rare and cheap: it may rise later, so think before vendoring it' })
          : null
      ])
    }
  }
})

function rowMenu (e: MouseEvent, name: string) {
  openMenu(e, [{
    label: `Copy "${name}"`,
    gameIcon: gameIcon(name) ?? undefined,
    icon: 'far fa-copy',
    keys: 'Ctrl + C',
    action: () => {
      copyText(name).then(ok => { if (ok) toast(`Copied "${name}"`, { ms: 1800 }) })
    }
  }])
}

function fmt (chaos: number) { return formatChaos(chaos, snapshot.value?.divine ?? null) }
function amount (chaos: number) { return formatAmount(chaos) }
function pct (p: number) {
  const v = p * 100
  return `${v < 1 ? Number(v.toFixed(2)) : Math.round(v)}%`
}
</script>

<style module>
.verdict { display: flex; flex-direction: column; gap: 2px; padding: 8px var(--w-pad); background: var(--w-accent-soft); border-bottom: 1px solid var(--w-line); }
.verdict b { font-size: var(--w-fs-lg); font-weight: 600; }
.buyGrid { grid-template-columns: minmax(0, 1fr) 62px 76px 64px 56px; }
.rareGrid { grid-template-columns: minmax(0, 1fr) 62px 76px 64px; }
.sourceGrid { grid-template-columns: minmax(0, 1fr) 76px 44px; }
.note { padding: 8px var(--w-pad); color: var(--w-dim); font-size: var(--w-fs-sm); white-space: normal; overflow-wrap: anywhere; }
.legend { display: flex; flex-wrap: wrap; gap: 4px 16px; padding: 0 var(--w-pad) 6px; color: var(--w-dim); font-size: var(--w-fs-sm); }
.key { display: inline-block; width: 10px; height: 7px; border-radius: 2px; margin-right: 4px; }
.bucket { display: grid; grid-template-columns: 58px minmax(0, 1fr) 40px 40px; gap: 8px; align-items: center; padding: 3px var(--w-pad); }
.track { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.fill { height: 7px; border-radius: 2px; min-width: 1px; }
.chance { background: var(--w-dim); }
.value { background: var(--w-accent); }
</style>
