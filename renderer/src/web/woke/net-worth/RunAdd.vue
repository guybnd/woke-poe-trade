<template>
  <!-- Adds a line by hand: an item the stash didn't see, or a cost. -->
  <button v-if="!open" type="button" :class="$style.link" class="text-xs" data-run-add @click="open = true">+ {{ label }}</button>
  <div v-else :class="$style.form" data-run-add-form>
    <input ref="nameEl" v-model="name" :list="listId" class="w-input px-1 rounded" :class="$style.name" placeholder="Item" :aria-label="`${label}: item`" @change="priceFromName" @keydown.esc="close">
    <datalist :id="listId"><option v-for="n in names" :key="n" :value="n" /></datalist>
    <input v-model.number="count" type="number" min="0" step="1" class="w-input px-1 rounded" :class="$style.num" :aria-label="`${label}: how many`" title="How many (per map for a per-map cost)">
    <span class="w-dim">×</span>
    <input v-model.number="each" type="number" min="0" step="any" class="w-input px-1 rounded" :class="$style.num" :aria-label="`${label}: price each`" :title="`Price each, in ${divine ? 'divines' : 'chaos'}`">
    <Coin :chaos="!divine" />
    <WButton size="sm" :disabled="!ok" :title="perMap ? 'Once, for the whole run' : undefined" @click="add">{{ perMap ? 'Once' : 'Add' }}</WButton>
    <WButton v-if="perMap" size="sm" :disabled="!ok" :title="unit === 'map' ? 'Taken off for every map' : 'Taken off for every map and boss fight'" @click="addPerMap">Per {{ unit }}</WButton>
    <button type="button" :class="$style.x" title="Cancel" aria-label="Cancel" @click="close"><i class="fas fa-times" /></button>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, shallowRef, watch } from 'vue'
import { WButton } from '../ui'
import Coin from './Coin.vue'
import type { ValuedLine } from './valuation'

export interface AddedLine { name: string, key: string | null, icon?: string, count: number, each: number }

const props = defineProps<{
  names: string[]
  lines: ValuedLine[]
  divine: number | null
  label: string
  // Offers "Per map" (a typed cost) next to once.
  perMap?: boolean
  // What a run is counted in: maps, boss fights, or both ('run').
  unit?: 'map' | 'fight' | 'run'
}>()
const emit = defineEmits<{ (e: 'add' | 'per-map', v: AddedLine): void }>()

let seq = 0
const listId = `run-add-${seq++}-${Math.random().toString(36).slice(2, 7)}`
const open = shallowRef(false)
const name = shallowRef('')
const count = shallowRef(1)
const each = shallowRef(0)
const nameEl = shallowRef<HTMLInputElement | null>(null)
watch(open, (o) => { if (o) nextTick(() => nameEl.value?.focus()).catch(() => {}) })

const toDiv = (chaos: number) => props.divine ? chaos / props.divine : chaos
const fromDiv = (n: number) => props.divine ? n * props.divine : n
// "Strand Map" finds "Strand Map (T16)" too.
const lineOf = (n: string) => {
  const b = n.trim().toLowerCase()
  if (!b) return undefined
  return props.lines.find(l => l.name.toLowerCase() === b) ?? props.lines.find(l => l.name.toLowerCase().startsWith(b + ' ('))
}
function priceFromName () {
  const l = lineOf(name.value)
  if (l && !(each.value > 0)) each.value = Math.round(toDiv(l.unitChaos) * 10000) / 10000
}
const ok = computed(() => name.value.trim() !== '' && count.value > 0 && each.value >= 0 && Number.isFinite(each.value))
function line (): AddedLine {
  const l = lineOf(name.value)
  return { name: l?.name ?? name.value.trim(), key: l?.key ?? null, ...(l?.icon ? { icon: l.icon } : {}), count: Number(count.value), each: fromDiv(Number(each.value)) }
}
function add () { if (ok.value) { emit('add', line()); close() } }
function addPerMap () { if (ok.value) { emit('per-map', line()); close() } }
function close () {
  open.value = false
  name.value = ''
  count.value = 1
  each.value = 0
}
</script>

<style module>
.link { align-self: flex-start; background: none; border: 0; padding: 0; color: var(--w-accent); cursor: pointer; font: inherit; }
.link:hover { text-decoration: underline; }
.form { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; font-size: var(--w-fs-sm); }
.name { flex: 1 1 8rem; min-width: 6rem; }
.num { width: 3.8rem; }
.x { background: none; border: 0; padding: 0; color: var(--w-dim); cursor: pointer; }
.x:hover { color: var(--w-down); }
</style>
