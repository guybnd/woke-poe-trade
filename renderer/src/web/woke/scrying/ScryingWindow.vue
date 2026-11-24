<template>
  <WPanel size-key="scrying" title="Scrying" :icon="itemArt({ name: 'Scrying Orb' }) ?? undefined" :updated="prices.snapshot.value?.ts ?? null" :fresh-min="40" :stale-min="180" width="60rem" max-height="80vh" :scroll="false">
    <template #toolbar>
      <WSegmented v-model="config.sort" :options="SORTS" />
      <label class="flex items-center gap-1 w-dim text-sm" title="About how many of a map's own divination cards drop in one run, with your setup">Cards per map
        <input class="w-input" :class="$style.input" style="width: 3rem;" inputmode="decimal" :value="config.cardsPerMap" data-qa="scry-cards"
          @change="setCards(($event.target as HTMLInputElement).value, $event)">
      </label>
      <label class="flex items-center gap-1 w-dim text-sm" title="The map you run and scry. Its own cards are what a scry replaces.">Your map
        <WSelect :model-value="config.fromMap ?? ''" :options="fromOptions" data-qa="scry-from" @update:model-value="config.fromMap = $event || null" />
      </label>
      <WChip clickable :active="orbBusy" data-qa="scry-price-orbs"
        title="Look up the Scrying Orb of the top maps on trade (poe.ninja doesn't price them). One search every 10 seconds, kept for an hour."
        @click="priceOrbs"><i :class="orbBusy ? 'fas fa-spinner fa-spin' : 'fas fa-search'" /> Price orbs</WChip>
    </template>
    <template v-if="!prices.snapshot.value" #banner>
      <WBanner tone="info">Waiting for poe.ninja prices.</WBanner>
    </template>

    <div :class="$style.layout" data-qa="scrying">
      <div v-if="!data || !prices.snapshot.value" :class="$style.list"><WSkeleton :rows="9" /></div>
      <div v-else :class="$style.list" class="w-scroll">
        <div v-if="!groups[0].rows.length" class="w-faint text-xs" style="padding: 4px var(--w-pad);">No map beats yours at these prices.</div>
        <template v-for="g in groups" :key="g.label">
          <div v-if="g.rows.length" class="w-group-label">{{ g.label }}</div>
          <WListItem v-for="r in g.rows" :key="r.map" :active="r.map === sel?.map" data-qa="scry-row" @select="config.selected = r.map">
            <span class="flex justify-between gap-2 w-full min-w-0">
              <span v-item-tip="{ name: r.map }" class="w-trunc" :class="{ 'w-dim': g.dim }">{{ r.label }}</span>
              <span v-if="r.gain != null" :class="r.gain > 0 ? 'w-up' : 'w-down'"><WPrice :chaos="r.gain" :divine="divine" /></span>
            </span>
            <template #sub>{{ subline(r) }}</template>
          </WListItem>
        </template>
      </div>

      <div v-if="sel" :class="$style.detail" class="w-scroll" data-qa="scry-detail">
        <div class="flex items-center gap-2" style="padding: 10px var(--w-pad) 6px;">
          <span v-item-tip="{ name: sel.map }" :class="$style.mapName" class="grow w-trunc">{{ sel.label }}</span>
          <WChip>T{{ sel.tier }}</WChip>
        </div>
        <div :class="$style.hero">
          <div><div :class="$style.k">Card value</div><div :class="$style.big"><WPrice :chaos="sel.value" :divine="divine" /></div></div>
          <div><div :class="$style.k">Gain / map</div><div :class="[$style.big, (sel.gain ?? 0) > 0 ? 'w-up' : 'w-down']"><WPrice :chaos="sel.gain" :divine="divine" /></div></div>
          <div><div :class="$style.k">Orb</div><div :class="$style.big" data-qa="scry-orb">
            <i v-if="orbs.pending(sel.map)" class="fas fa-spinner fa-spin w-dim" />
            <span v-else-if="sel.orb == null" class="w-faint text-sm">{{ orbNone(sel.map) ? 'none listed' : '?' }}</span>
            <WPrice v-else :chaos="sel.orb" :divine="divine" />
          </div></div>
          <div><div :class="$style.k">Pays back</div><div :class="$style.big">{{ sel.payback == null ? '?' : `${sel.payback} ${sel.payback === 1 ? 'map' : 'maps'}` }}</div></div>
        </div>
        <div class="flex items-center gap-2 flex-wrap" style="padding: 0 var(--w-pad) 8px;">
          <WButton size="sm" icon="fas fa-external-link-alt" :disabled="!orbUrl(sel.map)" data-qa="scry-buy" @click="buyOrb(sel.map)">Buy orb</WButton>
          <WButton v-if="sel.orb == null && !orbs.pending(sel.map) && !orbNone(sel.map)" size="sm" variant="ghost" icon="fas fa-search" @click="priceOne(sel.map)">Price this orb</WButton>
          <span v-if="sel.orbListings" class="w-faint text-xs">{{ sel.orbListings.toLocaleString() }} on trade</span>
        </div>
        <div class="w-row w-row--head" :class="$style.cardGrid"><span>Card</span><span class="text-right">Chance</span><span class="text-right">Price</span><span class="text-right">Adds</span></div>
        <div v-for="c in sel.cards" :key="c.name" class="w-row" :class="$style.cardGrid" data-qa="scry-card">
          <span v-item-tip="{ name: c.name, type: 'DivinationCard' }" class="w-trunc flex items-center gap-1"><WIcon :src="itemArt({ name: c.name, type: 'DivinationCard' }) ?? undefined" fallback="fas fa-clone" /><span class="w-trunc">{{ c.name }}</span></span>
          <span class="text-right w-dim w-num">1 in {{ c.oneIn.toLocaleString() }}</span>
          <span class="text-right"><WPrice :chaos="c.price" :divine="divine" /></span>
          <span class="text-right"><WPrice :chaos="c.adds" :divine="divine" /></span>
        </div>
        <div class="text-xs w-faint" style="padding: 8px var(--w-pad);">
          Card value: each of the map's own cards' price times its share of drops (the Prohibited Library weights, {{ data?.season ?? '' }}). Gain: {{ config.cardsPerMap }} cards a map{{ config.fromMap ? `, over ${mapLabel(config.fromMap)}'s own cards` : '' }}.
          Scrying works on non-unique maps with bonus objectives.
          <span v-if="fromUnpriced" style="color: var(--w-warn);">None of {{ mapLabel(config.fromMap!) }}'s own cards has a price, so it counts as 0 and gains read high.</span>
        </div>
      </div>
    </div>
  </WPanel>
</template>

<script setup lang="ts">
// The Scrying window: which map's Scrying Orb adds the most per map you run,
// against what the orb costs on trade. Laid out like Boss runs.
import { computed, onBeforeUnmount, shallowRef, watch } from 'vue'
import { poeWebApi } from '@/web/Config'
import { WBanner, WButton, WChip, WIcon, WListItem, WPanel, WPrice, WSegmented, WSelect, WSkeleton, itemArt, toast, vItemTip } from '../ui'
import { usePriceIndex } from '../market/price-index'
import { loadCardDrops, mapLabel } from '../card-drops/card-drops'
import type { CardDropData } from '../card-drops/card-drops'
import { fromValue, orbTradeUrl, rankScry, scryRows, scryableMaps } from './scry'
import type { ScryRow } from './scry'
import { areaDisc, useOrbPrices } from './orb-prices'
import type { ScryingWidget } from './widget'

const props = defineProps<{ config: ScryingWidget }>()
const config = props.config

const SORTS = [{ value: 'gain', label: 'Gain / map' }, { value: 'payback', label: 'Pays back' }]
// Price orbs looks up this many of the top maps.
const PRICE_TOP = 8

const data = shallowRef<CardDropData | null>(null)
loadCardDrops().then(d => { data.value = d }).catch(() => {})

const prices = usePriceIndex()
const divine = computed(() => prices.snapshot.value?.divine ?? null)
const league = computed(() => prices.snapshot.value?.league ?? '')
const orbs = useOrbPrices()

// Card prices: poe.ninja's card rows through the fake-price guard (the price
// index counts a fake at its usual price, or not at all).
const cardPrice = computed(() => {
  const byName = new Map<string, number>()
  for (const i of prices.snapshot.value?.items ?? []) {
    if (i.type === 'DivinationCard' && !byName.has(i.name)) byName.set(i.name, i.chaos)
  }
  return (name: string) => byName.get(name) ?? null
})

const canScry = (map: string) => areaDisc(map) != null

const rows = computed<ScryRow[]>(() => {
  if (!data.value || !prices.snapshot.value) return []
  const forLeague = league.value
  return scryRows(data.value, cardPrice.value, {
    cardsPerMap: config.cardsPerMap,
    fromMap: config.fromMap,
    canScry,
    orbPrice: map => orbs.get(forLeague, map)
  })
})

const ranked = computed(() => rankScry(rows.value, config.sort))
const groups = computed(() => [
  { label: 'Worth scrying', rows: ranked.value.good, dim: false },
  { label: 'Not worth it', rows: ranked.value.losing, dim: true },
  { label: 'No card prices', rows: ranked.value.noData, dim: true }
])

const sel = computed(() => rows.value.find(r => r.map === config.selected) ?? ranked.value.good[0] ?? rows.value[0] ?? null)

// Any tiered map can be the one you run: it needs no orb of its own.
const fromOptions = computed(() => [
  { value: '', label: 'Not set' },
  ...(data.value ? scryableMaps(data.value).map(m => ({ value: m, label: mapLabel(m) })) : [])
])

const fromUnpriced = computed(() => !!data.value && !!config.fromMap && fromValue(data.value, config.fromMap, cardPrice.value) == null)

function subline (r: ScryRow): string {
  const parts: string[] = []
  if (r.orb != null) parts.push(r.payback != null ? `orb pays back in ${r.payback} ${r.payback === 1 ? 'map' : 'maps'}` : 'orb never pays back')
  if (r.top) parts.push(`${r.top.name} 1 in ${r.top.oneIn.toLocaleString()}`)
  return parts.join(' · ')
}

function setCards (text: string, e: Event) {
  const n = Number(text.trim().replace(',', '.'))
  const rounded = Math.round(n * 10) / 10
  if (Number.isFinite(rounded) && rounded > 0 && rounded <= 50) config.cardsPerMap = rounded
  else (e.target as HTMLInputElement).value = String(config.cardsPerMap)
}

function orbNone (map: string) {
  return orbs.noneListed(league.value, map)
}

function orbUrl (map: string): string | null {
  const disc = areaDisc(map)
  return disc && league.value ? orbTradeUrl(league.value, disc) : null
}

function buyOrb (map: string) {
  const url = orbUrl(map)
  if (url) window.open(url)
}

// Trade lookups only on a click: the queries use English names, which the
// regional trade sites won't match.
function canSearch (): boolean {
  if (poeWebApi() !== 'www.pathofexile.com') { toast('Needs the international trade site'); return false }
  return !!league.value && !!divine.value
}

function priceOrbs () {
  if (!canSearch()) return
  const top = [...ranked.value.good].sort((a, b) => b.gain! - a.gain!).slice(0, PRICE_TOP).map(r => r.map)
  const first = sel.value && ranked.value.good.includes(sel.value) ? [sel.value.map] : []
  const names = [...new Set([...first, ...top])]
  if (!names.length) { toast('No map to price'); return }
  if (names.every(m => orbs.get(league.value, m) || orbs.noneListed(league.value, m))) { toast('Looked up within the hour'); return }
  orbs.request(league.value, divine.value!, names)
}

function priceOne (map: string) {
  if (!canSearch()) return
  orbs.ask(league.value, divine.value!, map)
}

const orbBusy = computed(() => rows.value.some(r => orbs.pending(r.map)))

// Closing the window stops the list (a single asked orb still finishes).
watch(() => config.wmWants, (w) => { if (w !== 'show') orbs.stop() })
onBeforeUnmount(() => orbs.stop())
</script>

<style module>
.layout { display: flex; min-height: 0; height: 32rem; }
.list { width: 16rem; flex: none; border-right: 1px solid var(--w-line); padding-bottom: 8px; }
.detail { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.mapName { font-family: var(--w-head); font-size: var(--w-fs-xl); letter-spacing: var(--w-head-track); }
.hero { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; padding: 0 var(--w-pad) 8px; }
.k { font-size: var(--w-fs-caps); text-transform: var(--w-caps-case); letter-spacing: 0.08em; color: var(--w-faint); font-family: var(--w-caps-face); }
.big { font-family: var(--w-num); font-size: var(--w-fs-xl); font-weight: 500; display: flex; align-items: center; min-height: 1.6em; }
.cardGrid { grid-template-columns: minmax(0, 1fr) 80px 80px 70px; }
.input {
  height: 24px;
  padding: 0 6px;
  font-size: var(--w-fs-md);
  color: var(--w-fg);
  background: var(--w-panel-2);
  border: 1px solid var(--w-line);
  border-radius: var(--w-r-sm);
}
.input:focus { outline: none; border-color: var(--w-accent); }
</style>
