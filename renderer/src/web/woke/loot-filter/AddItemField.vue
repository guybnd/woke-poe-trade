<template>
  <div :class="$style.wrap">
    <WField v-model="query" type="search" icon="fas fa-plus" placeholder="Add an item to this tier"
      @keydown.enter.prevent="pick(entries[hl])" @keydown.down.prevent="step(1)" @keydown.up.prevent="step(-1)" @keydown.esc="query = ''" />
    <div v-if="entries.length" ref="listEl" :class="$style.list" role="listbox">
      <template v-for="(e, i) in entries" :key="e.kind === 'family' ? `fam:${e.family.id}` : e.r.base">
      <button v-if="e.kind === 'family'" type="button" role="option" :aria-selected="i === hl" :class="[$style.row, { [$style.hl]: i === hl }]" :data-family="e.family.id"
        data-no-item-tip="family of bases, not one item" @mouseenter="hl = i" @click="pick(e)">
        <img v-if="baseIcon(e.adds[0].base)" :src="baseIcon(e.adds[0].base)!" :class="$style.art" alt="">
        <span v-else :class="$style.art" />
        <span :class="$style.text">
          <span class="w-trunc text-sm">All {{ e.family.label }}</span>
          <span class="w-dim text-xs w-trunc" :title="e.adds.map(a => a.base).join(', ')">{{ e.adds.length }} not in this tier: {{ e.adds.slice(0, 3).map(a => a.base).join(', ') }}{{ e.adds.length > 3 ? '...' : '' }}</span>
        </span>
        <span class="text-xs w-accent" :class="$style.act">Add all here</span>
      </button>
      <button v-else v-item-tip="tipFor?.(e.r.base) ?? { name: e.r.base }" type="button" role="option" :aria-selected="i === hl" :class="[$style.row, { [$style.hl]: i === hl }]"
        @mouseenter="hl = i" @click="pick(e)">
        <img v-if="baseIcon(e.r.base)" :src="baseIcon(e.r.base)!" :class="$style.art" alt="">
        <span v-else :class="$style.art" />
        <span :class="$style.text">
          <LabelPreview v-if="e.r.block" :text="e.r.base" :actions="e.r.block.actions" :visibility="e.r.block.visibility" :extras="false" style="max-width: 100%; overflow: hidden;" />
          <span v-else class="w-trunc text-sm">{{ e.r.base }}</span>
          <span class="w-dim text-xs w-trunc" :title="e.r.block ? ruleLabel(e.r.block.type, e.r.block.tier) : ''">{{ e.r.block ? `now in ${ruleLabel(e.r.block.type, e.r.block.tier)}` : 'in no rule yet' }}</span>
        </span>
        <span class="text-xs w-accent" :class="$style.act">{{ e.r.sameGroup ? 'Move here' : 'Add here' }}</span>
      </button>
      </template>
    </div>
    <div v-else-if="query.trim().length >= 2" class="w-faint text-xs" :class="$style.none">No item matches "{{ query }}".</div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { ITEMS_ITERATOR } from '@/assets/data'
import type { BaseType } from '@/assets/data'
import { WField, vItemTip } from '../ui'
import type { ItemTipRef } from '../ui'
import LabelPreview from './LabelPreview.vue'
import { addResults, addSearch } from './groups'
import { familyIndex, familyOf, matchFamilies } from './base-families'
import type { Family } from './base-families'
import type { AddResult } from './groups'
import { baseIcon } from './label-style'
import { ruleLabel } from './parse'
import type { FilterDoc } from './parse'

const props = defineProps<{ doc: FilterDoc, type: string, tier: string, tipFor?: (base: string) => ItemTipRef }>()
const emit = defineEmits<{
  (e: 'add', result: AddResult): void
  // A whole family (Talismans...): what's not in this tier yet.
  (e: 'addset', label: string, results: AddResult[]): void
}>()

type Entry = { kind: 'family', family: Family, adds: AddResult[] } | { kind: 'base', r: AddResult }

const query = ref('')
const hl = ref(0)

// Every base in the game, so an item no rule lists yet can be added too.
let gameBases: string[] | null = null
function allGameBases (): string[] {
  if (!gameBases) {
    const names = new Set<string>()
    for (const i of ITEMS_ITERATOR('"namespace":"ITEM"') as Generator<BaseType>) names.add(i.refName)
    // Game data still loading gives none: look again next time.
    if (!names.size) return []
    gameBases = [...names]
  }
  return gameBases
}

const results = computed(() => query.value.trim().length < 2 ? [] : addSearch(props.doc, props.type, props.tier, query.value, allGameBases()))
const fam = (b: string) => familyOf(b, baseIcon(b))
let famIndex: ReturnType<typeof familyIndex> | null = null
function families () {
  if (!famIndex) {
    const bases = allGameBases()
    if (!bases.length) return new Map() as ReturnType<typeof familyIndex>
    famIndex = familyIndex(bases, fam)
  }
  return famIndex
}
const entries = computed<Entry[]>(() => {
  if (!results.value.length && query.value.trim().length < 2) return []
  const index = families()
  const fams = matchFamilies(query.value, results.value.map(r => r.base), index, fam)
    .map(family => ({ kind: 'family' as const, family, adds: addResults(props.doc, props.type, props.tier, index.get(family.id)!.bases) }))
    .filter(f => f.adds.length >= 2)
  return [...fams, ...results.value.map(r => ({ kind: 'base' as const, r }))]
})
const listEl = ref<HTMLElement | null>(null)
watch(entries, async () => {
  hl.value = 0
  // The box sits low in the column: bring the results into view.
  await nextTick()
  listEl.value?.scrollIntoView({ block: 'nearest' })
})

function step (dir: 1 | -1) {
  const n = entries.value.length
  if (n) hl.value = (hl.value + dir + n) % n
}

// The box stays ready for the next one.
function pick (e: Entry | undefined) {
  if (!e) return
  if (e.kind === 'family') emit('addset', e.family.label, e.adds)
  else emit('add', e.r)
  query.value = ''
}
</script>

<style module>
.wrap { display: flex; flex-direction: column; gap: 3px; margin-top: 6px; }
.list {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--w-line-strong);
  border-radius: var(--w-r-sm);
  background: var(--w-panel-solid);
  overflow: hidden;
}
.row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 6px;
  background: none;
  border: 0;
  color: var(--w-fg);
  text-align: left;
  cursor: pointer;
  min-width: 0;
}
.hl { background: var(--w-accent-soft); }
.art { width: 18px; height: 18px; object-fit: contain; flex: none; }
.text { display: flex; flex-direction: column; gap: 1px; flex: 1; min-width: 0; align-items: flex-start; }
.act { flex: none; white-space: nowrap; }
.none { padding: 2px 4px; }
</style>
