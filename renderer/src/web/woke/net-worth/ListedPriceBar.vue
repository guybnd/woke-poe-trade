<template>
  <div v-if="listing" :class="$style.bar" data-listed-bar>
    <span class="w-dim text-xs">Listed at Faustus</span>
    <template v-if="matches.length > 1">
      <WChip v-for="l in matches" :key="l.id" clickable :active="l.id === listing.id" @click="picked = l.id">{{ priceLabel(l.price) }}</WChip>
    </template>
    <span v-else class="w-num" :class="$style.ask">{{ priceLabel(listing.price) }}</span>
    <span v-if="target" class="w-warn text-xs" data-listed-bar-target>set {{ priceLabel(target) }}</span>
    <span :class="$style.sep" />
    <template v-if="suggest">
      <WButton size="sm" title="One step under the cheapest other listing loaded here" @click="save(suggest.under)">{{ priceLabel(suggest.under) }} · under cheapest</WButton>
      <WButton size="sm" title="The cheapest other listing loaded here" @click="save(suggest.match)">{{ priceLabel(suggest.match) }} · match</WButton>
    </template>
    <span v-else class="w-dim text-xs">Search to get suggestions</span>
    <input v-model.number="typed" type="number" min="0" step="any" :class="$style.input" aria-label="Your price" placeholder="Your price" @keydown.enter="saveTyped">
    <select v-model="typedCurrency" :class="$style.input" aria-label="Your price's currency">
      <option value="chaos">chaos</option>
      <option value="divine">div</option>
    </select>
    <WButton size="sm" :disabled="!(typed > 0)" @click="saveTyped">Save</WButton>
    <WButton v-if="target" size="sm" variant="ghost" title="Clear the price you set" @click="clear">Clear</WButton>
  </div>
</template>

<script setup lang="ts">
// The price check's foot when the checked item is one you have listed at
// Faustus (Guy's R1, 2026-11-24): set a new price from what the check found,
// or your own. It lands on the Listed row as a to-do; reprice in game.
import { computed, shallowRef, watch } from 'vue'
import { AppConfig } from '@/web/Config'
import type { ParsedItem } from '@/parser'
import { WButton, WChip } from '../ui'
import { lastAsks } from '../price-insight/last-asks'
import { loadPending, pendingDoc } from './pending-store'
import { soldIds } from './pending'
import { sales } from './sales-store'
import { cheapestDoc, loadCheapest, repricing, setTarget } from './cheapest-store'
import { listingsFor, namesOfText, priceLabel, suggestions, targetOpen } from './listed-target'
import type { TargetPrice } from './listed-target'

const props = defineProps<{ item: ParsedItem }>()

const league = computed(() => AppConfig().leagueId ?? '')
watch(league, (l) => { if (l) { loadPending(l).catch(() => {}); loadCheapest(l) } }, { immediate: true })

const listings = computed(() => {
  const doc = pendingDoc.value
  if (!doc || doc.league !== league.value) return []
  const sold = soldIds(doc, sales.value)
  return doc.listings.filter(l => !sold.has(l.id))
})
// Your listings of the checked item; a Listed row's Reprice picks its own
// among them (two copies of one unique at different prices).
const matches = computed(() => {
  const names = namesOfText(props.item.rawText)
  if (!names) return []
  const found = listingsFor({ ...names, rarity: props.item.rarity, mapTier: props.item.mapTier, gemLevel: props.item.gemLevel }, listings.value)
  const r = repricing.value
  const own = r && r.league === league.value ? found.find(l => l.id === r.id) : undefined
  return own ? [own] : found
})
const picked = shallowRef<string | null>(null)
watch(() => props.item, () => { picked.value = null; typed.value = 0 })
const listing = computed(() => matches.value.find(l => l.id === picked.value) ?? matches.value[0] ?? null)

const target = computed(() => {
  const l = listing.value
  const t = l && cheapestDoc.value?.league === league.value ? cheapestDoc.value.targets?.[l.id] : undefined
  return l && targetOpen(t, l) ? t : null
})

const suggest = computed(() => {
  const a = lastAsks.value
  const l = listing.value
  if (!a || a.for !== props.item || !l || !a.chaos.length) return null
  return suggestions(a.chaos[0] * Math.max(1, l.stack), a.divine)
})

const typed = shallowRef(0)
const typedCurrency = shallowRef<'chaos' | 'divine'>('divine')
watch(listing, (l) => { if (l) typedCurrency.value = l.price.currency === 'chaos' ? 'chaos' : 'divine' }, { immediate: true })

function save (p: { amount: number, currency: 'chaos' | 'divine' }) {
  const l = listing.value
  if (!l || !(p.amount > 0)) return
  const t: TargetPrice = { amount: p.amount, currency: p.currency, at: Date.now() }
  setTarget(league.value, l.id, t).catch(() => {})
}
function saveTyped () { save({ amount: typed.value, currency: typedCurrency.value }) }
function clear () {
  const l = listing.value
  if (l) setTarget(league.value, l.id, null).catch(() => {})
}
</script>

<style module>
.bar { display: flex; align-items: center; gap: var(--w-s2); flex-wrap: wrap; padding: 6px var(--w-pad); border-top: 1px solid var(--w-line); background: var(--w-panel-solid); }
.ask { color: var(--w-gold); }
.sep { flex: 1; }
.input { width: 6em; background: var(--w-panel-2); border: 1px solid var(--w-line); color: var(--w-fg); font: inherit; font-size: var(--w-fs-sm); padding: 1px 4px; }
select.input { width: auto; }
</style>
