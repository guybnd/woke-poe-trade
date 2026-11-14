<template>
  <!-- woke: mods the item doesn't have, searched for on top of its own (Guy's pick B).
       Adding, ticking or typing a number never searches: it waits for Search. -->
  <div class="w-add" data-add-mod>
    <template v-if="mods.length">
      <div class="w-add-sec">Added</div>
      <div v-for="(mod, i) in mods" :key="mod.kind + '|' + mod.statRef"
        class="w-add-row" :class="{ 'w-add-off': mod.disabled }" data-added-mod>
        <button type="button" class="w-add-check" role="checkbox" :aria-checked="!mod.disabled"
          :title="mod.disabled ? 'Search with this mod' : 'Leave this mod out of the search'"
          @click="mod.disabled = !mod.disabled">
          <i :class="mod.disabled ? 'far fa-square' : 'fas fa-check-square'" />
        </button>
        <span class="w-add-kind" :title="kindOf(mod.kind).title">{{ kindOf(mod.kind).label }}</span>
        <span class="w-add-text" :class="`w-poe-k-${mod.kind}`">{{ mod.statRef }}</span>
        <input class="w-roll-input w-add-num" type="number" placeholder="min" aria-label="Min"
          :value="mod.min" @input="setNum(mod, 'min', $event)">
        <input class="w-roll-input w-add-num" type="number" placeholder="max" aria-label="Max"
          :value="mod.max" @input="setNum(mod, 'max', $event)">
        <button type="button" class="w-add-x" title="Remove" aria-label="Remove" @click="remove(i)">✕</button>
      </div>
    </template>
    <div class="w-add-line" :class="{ 'w-add-focus': open }">
      <i class="fas fa-plus w-add-ic" />
      <input ref="box" v-model="query" class="w-add-input" type="text" spellcheck="false"
        placeholder="Add a mod to search for…" aria-label="Add a mod to search for"
        role="combobox" :aria-expanded="open && results.length > 0"
        @focus="focused = true" @blur="focused = false"
        @keydown="onKey">
    </div>
    <div v-if="open" class="w-add-drop" role="listbox" @mousedown.prevent>
      <div class="w-add-chips">
        <button v-for="k in ADD_KINDS" :key="k.kind" type="button" tabindex="-1"
          :class="{ on: k.kind === kind, none: !counts[k.kind] }" :title="k.title"
          :data-add-kind="k.kind"
          @click="pickKind(k.kind)">{{ k.label }}</button>
      </div>
      <div v-for="(e, i) in results" :key="e.ref" role="option" :aria-selected="i === sel"
        class="w-add-opt" :class="[`w-poe-k-${kind}`, { sel: i === sel }]"
        @mouseenter="sel = i" @click="add(e)">{{ e.ref }}</div>
      <div v-if="!results.length" class="w-add-none">No {{ kindOf(kind).label.toLowerCase() }} mod matches</div>
      <div class="w-add-foot"><span>Tab kind</span><span>↑↓ pick</span><span>Enter add</span></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, shallowRef, watch } from 'vue'
import { STATS_ITERATOR } from '@/assets/data'
import type { AddedMod, AddedModKind, ItemFilters } from './interfaces'
import { ADD_KINDS, AddEntry, addedModFrom, kindCounts, searchAddIndex, sharedAddIndex } from '@/web/woke/price-insight/add-mod-search'

const props = defineProps<{ filters: ItemFilters }>()

const mods = computed(() => props.filters.addedMods ?? [])

// Built on the first keystroke, shared by every window, rebuilt when the data reloads.
const getIndex = () => sharedAddIndex(STATS_ITERATOR)

const query = ref('')
const focused = ref(false)
// The kind picked with a chip; when it has no match, the first kind that has one is shown.
const wanted = ref<AddedModKind>('pseudo')
const sel = ref(0)
const box = shallowRef<HTMLInputElement>()

const open = computed(() => focused.value && query.value.trim() !== '')
const counts = computed(() => kindCounts(open.value ? getIndex() : [], query.value))
const kind = computed<AddedModKind>(() => {
  if (counts.value[wanted.value]) return wanted.value
  return ADD_KINDS.find(k => counts.value[k.kind])?.kind ?? wanted.value
})
const results = computed(() => open.value ? searchAddIndex(getIndex(), query.value, kind.value) : [])
watch([query, kind], () => { sel.value = 0 })

function kindOf (k: AddedModKind) {
  return ADD_KINDS.find(x => x.kind === k)!
}

function pickKind (k: AddedModKind) {
  wanted.value = k
}

// Tab steps through the kinds that have a match.
function stepKind (by: 1 | -1) {
  const live = ADD_KINDS.filter(k => counts.value[k.kind]).map(k => k.kind)
  if (!live.length) return
  const at = live.indexOf(kind.value)
  wanted.value = live[(at + by + live.length) % live.length]
}

function onKey (e: KeyboardEvent) {
  if (e.isComposing) return
  if (e.key === 'Enter') {
    // Never the form's search, nor PoE mode's Enter-to-search.
    e.preventDefault()
    const hit = results.value[sel.value]
    if (open.value && hit) add(hit)
  } else if (!open.value) {
    return
  } else if (e.key === 'Tab') {
    e.preventDefault()
    stepKind(e.shiftKey ? -1 : 1)
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    sel.value = Math.max(0, Math.min(sel.value + 1, results.value.length - 1))
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    sel.value = Math.max(sel.value - 1, 0)
  } else if (e.key === 'Escape') {
    e.preventDefault()
    query.value = ''
  }
}

function add (e: AddEntry) {
  const k = kind.value
  if (!props.filters.addedMods) props.filters.addedMods = []
  const list = props.filters.addedMods
  // Adding one already there just ticks it again.
  const had = list.find(m => m.statRef === e.ref && m.kind === k)
  if (had) {
    had.disabled = false
  } else {
    list.push(addedModFrom(e, k))
  }
  query.value = ''
  const at = had ? list.indexOf(had) : list.length - 1
  // The new row's min, ready to type.
  nextTick(() => {
    const rows = box.value?.closest('[data-add-mod]')?.querySelectorAll<HTMLElement>('[data-added-mod]')
    rows?.[at]?.querySelector<HTMLInputElement>('input')?.focus()
  })
}

function remove (i: number) {
  props.filters.addedMods!.splice(i, 1)
}

function setNum (mod: AddedMod, side: 'min' | 'max', e: Event) {
  const raw = (e.target as HTMLInputElement).value.trim()
  const n = Number(raw)
  mod[side] = (raw === '' || !Number.isFinite(n)) ? '' : n
}
</script>

<style>
.w-add-sec {
  display: flex; align-items: center; gap: 8px;
  margin-top: 4px; padding: 0 6px;
  font-size: .75em; letter-spacing: .06em; text-transform: uppercase;
  color: var(--w-gold);
}
.w-add-sec::before, .w-add-sec::after {
  content: ''; flex: 1; height: 1px;
  background: linear-gradient(90deg, transparent, var(--w-gold-fade), transparent);
}
.w-add-row {
  display: flex; align-items: center; gap: 6px;
  margin: 2px 0; padding: 3px 6px;
  border: 1px solid var(--w-line);
}
.w-add-row.w-add-off .w-add-text { opacity: .5; }
.w-add-check { display: flex; color: var(--w-gold-hi, var(--w-fg)); }
.w-add-off .w-add-check { color: var(--w-dim); }
.w-add-kind {
  flex: none; font-size: .7em; color: var(--w-dim);
  text-transform: lowercase; min-width: 3.2em;
}
.w-add-text { flex: 1; min-width: 0; text-align: center; }
.w-add-num { width: 4.2em; flex: none; }
.w-add-x { flex: none; color: var(--w-dim); padding: 0 2px; }
.w-add-x:hover { color: var(--w-fg); }
.w-add-line {
  display: flex; align-items: center; gap: 6px;
  margin-top: 2px; padding: 3px 6px;
  border-top: 1px dashed var(--w-line);
}
.w-add-line.w-add-focus {
  background: rgba(0, 0, 0, .45);
  box-shadow: inset 0 0 0 1px var(--w-gold-fade);
  border-top-color: transparent;
}
.w-add-ic { width: 20px; text-align: center; font-size: .7em; color: var(--w-dim); }
.w-add-input {
  flex: 1; min-width: 0; background: transparent; border: 0; outline: 0;
  color: var(--w-fg); font: inherit; padding: 2px 0;
}
.w-add-input::placeholder { color: var(--w-dim); font-style: italic; opacity: .8; }
.w-add-drop {
  margin: 0 2px 2px;
  border: 1px solid var(--w-gold-fade);
  background: var(--w-panel-solid);
  padding-bottom: 2px;
}
.w-add-chips {
  display: flex; flex-wrap: wrap; gap: 4px;
  padding: 4px 8px 5px; border-bottom: 1px solid var(--w-line);
}
.w-add-chips button {
  font-size: .75em; padding: 1px 7px;
  border: 1px solid var(--w-line); color: var(--w-dim);
}
.w-add-chips button.on { border-color: var(--w-gold); color: var(--w-gold-hi, var(--w-fg)); }
.w-add-chips button.none { opacity: .4; }
.w-add-opt { padding: 3px 8px; cursor: pointer; }
.w-add-opt.sel { background: linear-gradient(90deg, rgba(175, 140, 80, .28), rgba(175, 140, 80, .06)); }
.w-add-none { padding: 3px 8px; color: var(--w-dim); font-style: italic; }
.w-add-foot {
  display: flex; gap: 12px; padding: 3px 8px 0;
  border-top: 1px solid var(--w-line);
  font-size: .7em; color: var(--w-dim);
}
</style>
