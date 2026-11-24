<template>
  <!-- Adds a line by hand: an item the stash didn't see, or a cost (pick A1:
       one labelled row, suggestions with art and price under the item). -->
  <button v-if="!open" type="button" :class="$style.link" class="text-xs" data-run-add @click="open = true">+ {{ label }}</button>
  <div v-else :class="$style.form" data-run-add-form @keydown.esc.stop="close">
    <div :class="$style.fields">
      <label :class="[$style.field, $style.item]"><span class="w-dim text-xs">Item</span>
        <input ref="nameEl" v-model="name" class="w-input px-1 rounded" placeholder="Type to search" spellcheck="false" autocomplete="off"
          role="combobox" :aria-expanded="listOpen" :aria-label="`${label}: item`"
          @focus="focused = true" @blur="focused = false" @input="onType" @keydown="onKey"></label>
      <label :class="$style.field"><span class="w-dim text-xs">{{ perMap ? `How many (a ${unitName})` : 'How many' }}</span>
        <input v-model.number="count" type="number" min="0" step="any" class="w-input px-1 rounded" :class="$style.num" :aria-label="`${label}: how many`"></label>
      <label :class="$style.field"><span class="w-dim text-xs">Price each</span>
        <span :class="$style.priceBox">
          <input v-model.number="each" type="number" min="0" step="any" class="w-input px-1 rounded" :class="$style.num" :aria-label="`${label}: price each`" @input="autoEach = null">
          <span v-if="divine" :class="$style.unit" role="group" aria-label="Price in">
            <button type="button" :class="{ [$style.on]: priceUnit === 'c' }" :aria-pressed="priceUnit === 'c'" @click="setUnit('c')">c</button>
            <button type="button" :class="{ [$style.on]: priceUnit === 'div' }" :aria-pressed="priceUnit === 'div'" @click="setUnit('div')">div</button>
          </span>
          <span v-else class="w-dim text-xs">c</span>
        </span></label>
      <button type="button" :class="$style.x" title="Cancel" aria-label="Cancel" @click="close"><i class="fas fa-times" /></button>
    </div>
    <!-- Our own list: the browser's datalist doesn't draw in the overlay. -->
    <div v-if="listOpen" :class="$style.list" role="listbox" data-run-add-list @mousedown.prevent>
      <div v-for="(o, i) in options" :key="o.name" role="option" :aria-selected="i === sel" :class="[$style.opt, { [$style.sel]: i === sel }]" data-run-add-option
        @mouseenter="sel = i" @click="pick(o)">
        <img v-if="o.icon" :src="o.icon" alt="" :class="$style.icon"><span v-else :class="$style.icon" />
        <span v-item-tip="{ name: o.name }" class="w-trunc">{{ o.name }}</span>
        <span v-if="o.stash != null" class="w-dim text-xs">in stash · {{ fmt(o.stash) }}</span>
        <span class="w-num text-xs" :class="$style.optPrice">{{ o.chaos != null ? priceText(o.chaos) : 'no price' }}</span>
      </div>
      <div class="w-dim text-xs" :class="$style.foot">↑↓ pick · Enter choose · prices from your stash, else poe.ninja</div>
    </div>
    <div :class="$style.actions">
      <template v-if="perMap">
        <WButton size="sm" :disabled="!ok" :title="unit === 'map' ? 'Taken off for every map' : 'Taken off for every map and boss fight'" data-run-add-per-map @click="addPerMap">Add per {{ unitName }}</WButton>
        <WButton size="sm" :disabled="!ok" title="One cost for the whole run" data-run-add-once @click="add">Add once</WButton>
      </template>
      <WButton v-else size="sm" :disabled="!ok" @click="add">Add</WButton>
      <span v-if="ok" class="w-dim w-num text-xs">{{ summary }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, shallowRef, watch } from 'vue'
import { WButton, vItemTip } from '../ui'
import { formatAmount } from '../ui/format'
import { gameIcon } from '../ui/game-icons'
import { lastWokePrices } from '../market/hook'
import { parseDenseChunks } from '../market/parse'
import type { ValuedLine } from './valuation'

// `live`: priced from the stash or poe.ninja and left as it was (a kit line
// then follows the price, pick K1).
export interface KnownItem { name: string, key: string | null, icon: string | null, chaos: number | null }
export interface AddedLine { name: string, key: string | null, icon?: string, count: number, each: number, live?: true }

const props = defineProps<{
  // Items the run already knows (its tally), with their stash key and price.
  known: KnownItem[]
  lines: ValuedLine[]
  divine: number | null
  label: string
  // Offers "Add per map" (a typed cost) next to "Add once".
  perMap?: boolean
  // What a run is counted in: maps, boss fights, or both ('run').
  unit?: 'map' | 'fight' | 'run'
}>()
const emit = defineEmits<{ (e: 'add' | 'per-map', v: AddedLine): void }>()

const open = shallowRef(false)
const name = shallowRef('')
const count = shallowRef<number | ''>(1)
const each = shallowRef<number | ''>('')
const priceUnit = shallowRef<'c' | 'div'>('c')
// The price picked from the list, in chaos (null: typed by you).
const autoEach = shallowRef<number | null>(null)
const picked = shallowRef<Option | null>(null)
const nameEl = shallowRef<HTMLInputElement | null>(null)
const focused = shallowRef(false)
const typed = shallowRef(false)
const sel = shallowRef(0)
watch(open, (o) => { if (o) nextTick(() => nameEl.value?.focus()).catch(() => {}) })

const unitName = computed(() => props.unit === 'run' ? 'map or fight' : (props.unit ?? 'map'))
const fmt = (n: number) => formatAmount(n)
const inUnit = (chaos: number) => priceUnit.value === 'div' && props.divine ? chaos / props.divine : chaos
const fromUnit = (n: number) => priceUnit.value === 'div' && props.divine ? n * props.divine : n
const round = (n: number) => Math.round(n * 10000) / 10000
const priceText = (chaos: number) => props.divine && chaos >= props.divine ? `${fmt(chaos / props.divine)} div` : `${chaos < 10 ? round(chaos) : fmt(chaos)}c`
function setUnit (u: 'c' | 'div') {
  if (u === priceUnit.value) return
  // A live price converts from its chaos value (it stays live).
  const chaos = autoEach.value ?? (each.value === '' ? null : fromUnit(Number(each.value)))
  priceUnit.value = u
  if (chaos != null) each.value = round(inUnit(chaos))
}

interface Option { name: string, key: string | null, icon: string | null, chaos: number | null, stash: number | null }
// poe.ninja's item names and prices, parsed once per price download.
let ninjaAt = -1
let ninja: Array<{ name: string, chaos: number }> = []
function ninjaItems () {
  const last = lastWokePrices()
  if (!last) return ninja
  if (last.at !== ninjaAt) {
    ninjaAt = last.at
    ninja = parseDenseChunks(last.chunks.filter(c => c.ns === 'ITEM')).filter(p => !p.variant && p.chaos > 0).map(p => ({ name: p.name, chaos: p.chaos }))
  }
  return ninja
}
const stashOf = (n: string) => props.lines.find(l => l.name.toLowerCase() === n.toLowerCase())
const options = computed<Option[]>(() => {
  const q = name.value.trim().toLowerCase()
  if (q.length < 2) return []
  const seen = new Set<string>()
  const out: Array<Option & { rank: number }> = []
  const push = (o: Option) => {
    const n = o.name.toLowerCase()
    if (seen.has(n)) return
    const at = n.indexOf(q)
    if (at < 0) return
    seen.add(n)
    out.push({ ...o, rank: (at === 0 ? 0 : 2) + (o.stash != null ? 0 : 1) })
  }
  for (const l of props.lines) if (!l.state) push({ name: l.name, key: l.key, icon: l.icon || gameIcon(l.name), chaos: l.unitChaos > 0 ? l.unitChaos : null, stash: l.count })
  for (const k of props.known) push({ name: k.name, key: k.key, icon: k.icon || gameIcon(k.name), chaos: k.chaos != null && k.chaos > 0 ? k.chaos : null, stash: null })
  for (const p of ninjaItems()) push({ name: p.name, key: null, icon: gameIcon(p.name), chaos: p.chaos, stash: null })
  return out.sort((a, b) => a.rank - b.rank || a.name.length - b.name.length).slice(0, 8)
})
const listOpen = computed(() => focused.value && typed.value && options.value.length > 0)
watch(options, () => { sel.value = 0 })

function onType () {
  typed.value = true
  picked.value = null
  // The price was filled in for the last item: it goes with it.
  if (autoEach.value != null) { each.value = ''; autoEach.value = null }
}
function pick (o: Option) {
  // A name the run knows but nothing priced: the stash line for it, if any.
  const l = o.chaos == null ? stashOf(o.name) : null
  const chaos = o.chaos ?? (l && l.unitChaos > 0 ? l.unitChaos : null)
  picked.value = { ...o, key: o.key ?? l?.key ?? null, chaos }
  name.value = o.name
  typed.value = false
  if (chaos != null) {
    priceUnit.value = props.divine && chaos >= props.divine ? 'div' : 'c'
    each.value = round(inUnit(chaos))
    autoEach.value = chaos
  }
}
function onKey (e: KeyboardEvent) {
  if (!listOpen.value) {
    if (e.key === 'Enter' && ok.value) { e.preventDefault(); if (props.perMap) addPerMap(); else add() }
    return
  }
  if (e.key === 'ArrowDown') { e.preventDefault(); sel.value = (sel.value + 1) % options.value.length } else if (e.key === 'ArrowUp') { e.preventDefault(); sel.value = (sel.value - 1 + options.value.length) % options.value.length } else if (e.key === 'Enter') { e.preventDefault(); const o = options.value[sel.value]; if (o) pick(o) } else if (e.key === 'Escape') { e.stopPropagation(); typed.value = false }
}

const ok = computed(() => name.value.trim() !== '' && count.value !== '' && Number(count.value) > 0 && each.value !== '' && Number(each.value) >= 0 && Number.isFinite(Number(each.value)))
function line (): AddedLine {
  const p = picked.value?.name.toLowerCase() === name.value.trim().toLowerCase() ? picked.value : null
  const l = p ? null : stashOf(name.value.trim())
  const eachChaos = fromUnit(Number(each.value))
  const live = autoEach.value != null && Math.abs(round(inUnit(autoEach.value)) - Number(each.value)) < 1e-9
  const icon = p?.icon ?? l?.icon ?? gameIcon(name.value.trim())
  return {
    name: p?.name ?? l?.name ?? name.value.trim(),
    key: p?.key ?? l?.key ?? null,
    ...(icon ? { icon } : {}),
    count: Number(count.value),
    each: live ? autoEach.value! : eachChaos,
    ...(live ? { live: true as const } : {})
  }
}
const summary = computed(() => {
  const total = Number(count.value) * fromUnit(Number(each.value))
  const live = autoEach.value != null ? ' · live price' : ''
  return props.perMap ? `${priceText(total)} a ${unitName.value}${live}` : `${priceText(total)}${live}`
})
function add () { if (ok.value) { emit('add', line()); close() } }
function addPerMap () { if (ok.value) { emit('per-map', line()); close() } }
function close () {
  open.value = false
  name.value = ''
  count.value = 1
  each.value = ''
  priceUnit.value = 'c'
  autoEach.value = null
  picked.value = null
  typed.value = false
}
</script>

<style module>
.link { align-self: flex-start; background: none; border: 0; padding: 0; color: var(--w-accent); cursor: pointer; font: inherit; }
.link:hover { text-decoration: underline; }
.form { display: flex; flex-direction: column; gap: 4px; font-size: var(--w-fs-sm); border: 1px solid var(--w-line); padding: 4px 6px; margin-top: 2px; }
.fields { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 4px 8px; }
.field { display: flex; flex-direction: column; gap: 1px; }
.item { flex: 1 1 9rem; min-width: 7rem; }
.num { width: 4.6rem; }
.priceBox { display: inline-flex; align-items: center; gap: 4px; }
.unit { display: inline-flex; border: 1px solid var(--w-line); }
.unit button { background: none; border: 0; padding: 0 6px; font: inherit; font-size: var(--w-fs-xs); color: var(--w-dim); cursor: pointer; }
.unit button.on { background: var(--w-line-strong); color: var(--w-gold); }
.list { display: flex; flex-direction: column; border: 1px solid var(--w-line-strong); background: var(--w-panel); }
.opt { display: grid; grid-template-columns: 18px minmax(0, 1fr) auto auto; gap: 6px; align-items: center; padding: 1px 4px; cursor: pointer; }
.opt.sel { background: var(--w-line); }
.optPrice { text-align: right; min-width: 3rem; }
.icon { width: 18px; height: 18px; object-fit: contain; }
.foot { padding: 1px 4px; border-top: 1px solid var(--w-line); }
.actions { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; }
.x { background: none; border: 0; padding: 0 0 4px; color: var(--w-dim); cursor: pointer; margin-left: auto; }
.x:hover { color: var(--w-down); }
</style>
