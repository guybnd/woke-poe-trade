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
import { cheapestDoc, loadCheapest, repricing, saveCheck, setTarget } from './cheapest-store'
import { checkFromAsks } from './cheapest'
import { saleChaos } from './sales'
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
// A Listed row's Reprice: the listing it opened this check for. Bound to the
// first item shown after the click; any later item clears it.
const REPRICE_MS = 10_000
const repricedFor = shallowRef<{ id: string, item: unknown } | null>(null)
watch(() => props.item, (item) => {
  const r = repricing.value
  if (r && r.league === league.value && Date.now() - r.at < REPRICE_MS) repricedFor.value = { id: r.id, item }
  else if (repricedFor.value?.item !== item) repricedFor.value = null
  repricing.value = null
}, { immediate: true })

// Your listings of the checked item. A check opened by name (a gem, a rolled
// unique) has no game text to match: Reprice's listing stands alone then.
const matches = computed(() => {
  const r = repricedFor.value?.item === props.item ? repricedFor.value.id : null
  const own = r ? listings.value.find(l => l.id === r) : undefined
  if (own) return [own]
  const names = namesOfText(props.item.rawText)
  if (!names) return []
  return listingsFor({ ...names, rarity: props.item.rarity, mapTier: props.item.mapTier, gemLevel: props.item.gemLevel }, listings.value)
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

// The listings this check loaded rank your price: Listed's Cheapest? column
// shows it (Guy, 2026-11-24: a search by name can't price rolls). Only for a
// listing this check is surely of: Reprice's, or one picked on a chip. A match
// by name alone may be another copy (other rolls, corrupted).
let ranked = ''
watch([lastAsks, listing], ([a, l]) => {
  if (!a || a.for !== props.item || !l || (a.total == null && !a.all)) return
  // Nothing loaded yet: no rank to give (a failed fetch would leave "1st").
  if (!a.loaded && !a.all) return
  if (!(repricedFor.value?.item === props.item || picked.value === l.id)) return
  const mine = saleChaos(l, a.divine ? { divine: a.divine } : {})
  if (mine == null) return
  const key = JSON.stringify([l.id, l.price, a.total, a.all, a.mine, a.chaos])
  if (key === ranked) return
  ranked = key
  const byName = props.item.rawText === 'VIRTUAL_ITEM'
  saveCheck(league.value, l.id, checkFromAsks(l, mine / Math.max(1, l.stack), a.chaos, a.mine, a.total, a.all, Date.now(), byName)).catch(() => {})
}, { immediate: true }) // this bar loads after the listings it ranks

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
