<template>
  <!-- woke: a cluster jewel's title picks the size and type to search (Guy's pick C).
       Picking never searches: the Search button lights up for it. -->
  <div class="w-ctp" data-cluster-type>
    <button type="button" class="filter-name-label w-ctp-title" :data-rarity="item.rarity"
      :aria-expanded="open" aria-haspopup="listbox"
      @mousedown.prevent
      :title="'Search a different cluster jewel: pick its size and type'"
      @click="toggle">{{ title }}<i class="fas fa-caret-down w-ctp-caret" aria-hidden="true" /></button>
    <div v-if="open" class="w-ctp-drop" @mousedown.prevent>
      <input ref="box" v-model="query" class="w-ctp-input" type="text" spellcheck="false"
        placeholder="Type to filter…" aria-label="Filter cluster jewel types"
        role="combobox" aria-expanded="true"
        @blur="open = false" @keydown="onKey">
      <div class="w-ctp-tabs" role="tablist">
        <button v-for="s in CLUSTER_SIZES" :key="s" type="button" role="tab" tabindex="-1"
          :aria-selected="s === tab" :class="{ on: s === tab, none: !counts[s] }" :data-cluster-size="s"
          @click="tab = s">{{ s }}<span v-if="query.trim()" class="w-ctp-n">{{ counts[s] }}</span></button>
      </div>
      <div class="w-ctp-list" role="listbox">
        <div v-for="(t, i) in results" :key="t.ref" role="option" :aria-selected="i === sel"
          class="w-ctp-opt" :class="{ sel: i === sel, now: isNow(t) }" :data-cluster-opt="t.name"
          @mouseenter="sel = i" @click="pick(t)"><span class="w-ctp-opt-name">{{ t.name }}</span><span
            v-if="isOwn(t)" class="w-ctp-own">yours</span></div>
        <div v-if="!results.length" class="w-ctp-none">No {{ tab }} type matches</div>
      </div>
      <div class="w-ctp-foot"><span>Tab size</span><span>↑↓ pick</span><span>Enter choose</span></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, shallowRef, watch } from 'vue'
import type { ParsedItem } from '@/parser'
import type { FilterOrGroup, ItemFilters } from '@/web/price-check/filters/interfaces'
import { CLUSTER_SIZES, applyClusterType, clusterTypes, currentType, enchantRow, matchTypes, ownType, pickedSize, type ClusterPick, type ClusterSize } from './apply'

const props = defineProps<{ item: ParsedItem, filters: ItemFilters, stats: FilterOrGroup[], ownSize: ClusterSize }>()

// The copied jewel's type, and the size searched now. Both are kept with the
// search (apply.ts), so the picker reads them back if it is drawn again.
const open = ref(false)
const own = shallowRef<ClusterPick | undefined>()
const size = ref<ClusterSize>(props.ownSize)
watch(() => [props.item, props.filters], () => {
  own.value = ownType(props.filters, props.stats, props.ownSize)
  size.value = pickedSize(props.filters, props.ownSize)
  open.value = false
}, { immediate: true })

const now = computed(() => currentType(size.value, props.stats) ??
  (size.value === props.ownSize && own.value && enchantRow(props.stats)?.statRef === own.value.ref ? own.value : undefined))
const title = computed(() => `${size.value} Cluster Jewel · ${now.value?.name ?? 'any type'}`)

const query = ref('')
const tab = ref<ClusterSize>('Large')
const sel = ref(0)
const box = shallowRef<HTMLInputElement>()

// The copy's own type leads its size's list when the trade site no longer lists it.
const listOf = (s: ClusterSize) => {
  const list = clusterTypes(s)
  const o = own.value
  return (s === props.ownSize && o && !list.some(t => t.ref === o.ref)) ? [o, ...list] : list
}
const counts = computed(() => Object.fromEntries(CLUSTER_SIZES.map(s =>
  [s, matchTypes(listOf(s), query.value).length])) as Record<ClusterSize, number>)
const results = computed(() => matchTypes(listOf(tab.value), query.value))
watch([query, tab], () => { sel.value = 0 })
// Typing that matches nothing in this size moves to a size it does match.
watch(query, () => {
  if (counts.value[tab.value]) return
  const other = CLUSTER_SIZES.find(s => counts.value[s])
  if (other) tab.value = other
})

function isNow (t: ClusterPick) { return now.value?.ref === t.ref && tab.value === size.value }
function isOwn (t: ClusterPick) { return own.value?.ref === t.ref && tab.value === props.ownSize }

function toggle () {
  if (open.value) { open.value = false; return }
  query.value = ''
  tab.value = size.value
  open.value = true
  nextTick(() => {
    box.value?.focus()
    const at = results.value.findIndex(isNow)
    sel.value = Math.max(at, 0)
  })
}

function pick (t: ClusterPick) {
  applyClusterType(props.filters, props.stats, props.ownSize, tab.value, t)
  size.value = tab.value
  open.value = false
}

function onKey (e: KeyboardEvent) {
  if (e.isComposing) return
  if (e.key === 'Enter') {
    // Never the window's Enter-to-search: a pick waits for Search.
    e.preventDefault()
    const hit = results.value[sel.value]
    if (hit) pick(hit)
  } else if (e.key === 'Tab') {
    e.preventDefault()
    const live = CLUSTER_SIZES.filter(s => counts.value[s])
    if (!live.length) return
    const at = live.indexOf(tab.value)
    tab.value = live[(at + (e.shiftKey ? -1 : 1) + live.length) % live.length]
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    sel.value = Math.max(0, Math.min(sel.value + 1, results.value.length - 1))
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    sel.value = Math.max(sel.value - 1, 0)
  } else if (e.key === 'Escape') {
    e.preventDefault()
    open.value = false
  }
}
</script>

<style>
.w-ctp { position: relative; min-width: 0; display: flex; }
.w-ctp-title { cursor: pointer; text-align: left; min-width: 0; }
.w-ctp-title:hover { text-decoration: underline dotted; text-underline-offset: 4px; }
.w-ctp-caret {
  margin-left: 6px;
  font-size: calc(11px * var(--w-text-scale, 1));
  vertical-align: middle;
  color: var(--w-faint);
}
.w-ctp-title:hover .w-ctp-caret, .w-ctp-title[aria-expanded="true"] .w-ctp-caret { color: var(--w-dim); }
.w-ctp-drop {
  position: absolute; z-index: 20; top: 100%; left: 0; margin-top: 4px;
  width: 300px; max-width: calc(100vw - 32px);
  border: 1px solid var(--w-gold-fade);
  background: var(--w-panel-solid);
  box-shadow: 0 6px 16px rgba(0, 0, 0, .6);
  white-space: normal;
  font-size: calc(13px * var(--w-text-scale, 1));
}
.w-ctp-input {
  display: block; width: 100%; box-sizing: border-box;
  background: rgba(0, 0, 0, .45); border: 0; border-bottom: 1px solid var(--w-line); outline: 0;
  color: var(--w-fg); font: inherit; padding: 5px 8px;
}
.w-ctp-input::placeholder { color: var(--w-dim); font-style: italic; opacity: .8; }
.w-ctp-tabs { display: flex; border-bottom: 1px solid var(--w-line); }
.w-ctp-tabs button {
  flex: 1; padding: 3px 0 4px; color: var(--w-dim);
  border-bottom: 1px solid transparent; margin-bottom: -1px;
}
.w-ctp-tabs button.on { color: var(--w-gold-hi, var(--w-fg)); border-bottom-color: var(--w-gold); }
.w-ctp-tabs button.none { opacity: .4; }
.w-ctp-n { margin-left: 5px; font-size: .8em; color: var(--w-faint); }
.w-ctp-list { max-height: 320px; overflow-y: auto; padding: 2px 0; }
.w-ctp-opt { display: flex; align-items: baseline; gap: 8px; padding: 2px 8px; cursor: pointer; color: var(--w-fg); }
.w-ctp-opt-name { flex: 1; min-width: 0; }
.w-ctp-opt.now { color: var(--w-gold-hi, var(--w-fg)); }
.w-ctp-opt.sel { background: linear-gradient(90deg, rgba(175, 140, 80, .28), rgba(175, 140, 80, .06)); }
.w-ctp-own { flex: none; font-size: max(var(--w-fs-xs), .8em); color: var(--w-dim); }
.w-ctp-none { padding: 3px 8px; color: var(--w-dim); font-style: italic; }
.w-ctp-foot {
  display: flex; gap: 12px; padding: 3px 8px;
  border-top: 1px solid var(--w-line);
  font-size: .8em; color: var(--w-dim);
}
</style>
