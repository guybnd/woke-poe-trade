<template>
  <!-- A Valdo map (Valdo's Puzzle Box): Void and Reward first, as you'd pick
       them on the trade site (Guy, 2026-11-21). Its mods are fixed, and the
       trade site searches only the Void one, so the rest are a folded list. -->
  <section :class="$style.zone" data-valdo-strip>
    <div :class="$style.row">
      <span :class="$style.title">Trade search</span>
      <span class="flex-1" />
      <WInfo text="Void and Reward go into this price check's search. Nothing is searched until you press Search." />
    </div>
    <div v-if="voidFilter" :class="$style.row" data-valdo-void>
      <span :class="$style.label">Void</span>
      <span :class="$style.seg" role="radiogroup" aria-label="Search by the Void mod">
        <button v-for="opt in VOID_STATES" :key="opt" type="button" role="radio" :aria-checked="voidState === opt"
          :class="voidState === opt && $style[`on_${opt}`]" :data-state="opt" :title="VOID_TITLE[opt]"
          @click="setVoid(opt)">{{ VOID_LABEL[opt] }}</button>
      </span>
      <span class="w-dim text-xs w-trunc">{{ hasVoid ? 'This map sends you to the Void' : 'This map has no Void mod' }}</span>
    </div>
    <div v-if="reward" :class="$style.row" data-valdo-reward>
      <span :class="$style.label">Reward</span>
      <button type="button" :class="[$style.pick, !reward.disabled && $style.pickOn]" :aria-expanded="picking"
        title="Search Valdo maps with another reward" data-valdo-reward-pick @click="togglePicker">
        {{ reward.disabled ? 'Any reward' : `Foil ${reward.name}` }}
        <i class="fas fa-chevron-down text-xs w-dim" />
      </button>
      <button v-if="reward.disabled || reward.name !== own.name" type="button" class="w-dim text-xs" :class="$style.link"
        :title="`Back to this map's reward, Foil ${own.name}`" data-valdo-reward-reset @click="pick(own)">This map's</button>
    </div>
    <div v-if="picking" :class="$style.picker" data-valdo-picker>
      <input ref="input" v-model="query" type="text" :class="$style.input" placeholder="Unique name…"
        aria-label="Reward to search for" @keydown.enter.prevent="pickFirst" @keydown.esc.prevent="picking = false">
      <button type="button" :class="$style.option" data-valdo-option="any" @click="pickAny">Any reward</button>
      <button v-for="u in matches" :key="u.refName" type="button" :class="$style.option" :data-valdo-option="u.name" @click="pick(u)">
        Foil {{ u.name }}
      </button>
      <span v-if="query && !matches.length" class="w-dim text-xs">No unique matches "{{ query }}"</span>
    </div>
    <button v-if="mods.length" type="button" :class="$style.row" class="w-dim text-xs" :aria-expanded="open" data-valdo-mods-toggle @click="open = !open">
      {{ modCount }} Valdo {{ modCount === 1 ? 'mod' : 'mods' }}
      <i class="fas" :class="open ? 'fa-chevron-up' : 'fa-chevron-down'" />
    </button>
    <ul v-if="open" :class="$style.list" data-valdo-mods>
      <li v-for="(m, i) in mods" :key="i" :class="m === VOID_TEXT && $style.void">{{ m }}</li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, shallowRef, watch } from 'vue'
import { WInfo } from '../ui'
import { useFold } from '../ui/fold'
import { CLIENT_STRINGS as _$, ITEMS_ITERATOR } from '@/assets/data'
import type { BaseType } from '@/assets/data'
import { ModifierType } from '@/parser/modifiers'
import type { ParsedItem } from '@/parser'
import { AppConfig } from '@/web/Config'
import type { FilterOrGroup, ItemFilters, StatFilter } from '@/web/price-check/filters/interfaces'

const props = defineProps<{ item: ParsedItem, stats: FilterOrGroup[], filters: ItemFilters }>()

const VOID_TEXT = 'Players who Die in area are sent to the Void'
type VoidState = 'any' | 'has' | 'not'
const VOID_STATES: VoidState[] = ['any', 'has', 'not']
const VOID_LABEL: Record<VoidState, string> = { any: 'Any', has: 'Void', not: 'No void' }
const VOID_TITLE: Record<VoidState, string> = {
  any: 'Trade search finds Valdo maps with or without the Void mod',
  has: 'Trade search finds only Valdo maps that send you to the Void',
  not: 'Trade search finds only Valdo maps without the Void mod'
}

// The one Void filter on every Valdo map (pseudo/maps.ts valdoBadMods).
const voidFilter = computed(() => props.stats.find((s): s is StatFilter => !s.group && !!s.valdoVoid) ?? null)
const hasVoid = computed(() => props.item.statsByType.some(c => c.stat.ref === VOID_TEXT))
const voidState = computed<VoidState>(() => {
  const f = voidFilter.value
  return !f || f.disabled ? 'any' : f.not ? 'not' : 'has'
})
function setVoid (state: VoidState) {
  const f = voidFilter.value
  if (!f) return
  f.disabled = state === 'any'
  f.not = state === 'not' ? true : undefined
}

// Reward: this map's, any, or another unique to browse other Valdo maps.
const reward = computed(() => props.filters.mapCompletionReward ?? null)
const own = computed(() => props.item.mapCompletionReward!)
const picking = ref(false)
const query = ref('')
const input = shallowRef<HTMLInputElement | null>(null)
watch(() => props.item, () => { picking.value = false; query.value = '' })

function togglePicker () {
  picking.value = !picking.value
  query.value = ''
  if (picking.value) nextTick(() => input.value?.focus())
}

const matches = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return []
  const out: BaseType[] = []
  const seen = new Set<string>()
  for (const u of ITEMS_ITERATOR('"namespace":"UNIQUE"') as Generator<BaseType>) {
    // Valdo rewards are foil uniques, never replicas.
    if (u.namespace !== 'UNIQUE' || u.name.startsWith('Replica ') || seen.has(u.name) || !u.name.toLowerCase().includes(q)) continue
    seen.add(u.name)
    out.push(u)
  }
  // Names that start with the text first.
  out.sort((a, b) => Number(!a.name.toLowerCase().startsWith(q)) - Number(!b.name.toLowerCase().startsWith(q)) || a.name.localeCompare(b.name))
  return out.slice(0, 8)
})

function pick (u: BaseType) {
  const f = props.filters.mapCompletionReward
  if (!f) return
  f.name = u.name
  // As create-item-filters.ts names it for the trade site.
  f.nameTrade = AppConfig().useIntlSite ? u.refName : u.name
  f.disabled = undefined
  picking.value = false
}
function pickAny () {
  const f = props.filters.mapCompletionReward
  if (f) f.disabled = true
  picking.value = false
}
function pickFirst () {
  if (matches.value.length) pick(matches.value[0])
}

// A mod can take two lines ("less Damage per Equipped Item" and its minions line).
const modCount = computed(() => props.item.newMods.filter(m => m.info.type === ModifierType.Explicit).length || mods.value.length)
// The map's mods as the game lists them, Void first.
const open = useFold('valdo-mods')
const mods = computed(() => {
  const known = props.item.statsByType
    .filter(c => c.type === ModifierType.Explicit)
    .map(c => c.sources[0]?.stat.translation.string ?? c.stat.ref)
  const unknown = props.item.unknownModifiers
    .filter(m => m.type === ModifierType.Explicit)
    .map(m => m.text.endsWith(_$.UNSCALABLE_VALUE) ? m.text.slice(0, -_$.UNSCALABLE_VALUE.length) : m.text)
  const all = [...known, ...unknown]
  return all.sort((a, b) => Number(b === VOID_TEXT) - Number(a === VOID_TEXT))
})
</script>

<style module>
.zone {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 8px;
  border-radius: var(--w-r-md);
  border: 1px solid var(--w-line-strong);
  background: var(--w-panel);
  color: var(--w-fg);
  font-family: var(--w-body);
  font-size: var(--w-fs-md);
}
.title { flex: none; color: var(--w-gold); font-family: var(--w-caps-face); font-size: var(--w-fs-sm); }
.row { display: flex; align-items: center; gap: 8px; width: 100%; text-align: left; min-width: 0; }
.label { flex: none; width: 52px; color: var(--w-dim); font-size: var(--w-fs-sm); }
.seg { flex: none; display: inline-flex; border: 1px solid var(--w-line-strong); border-radius: var(--w-r-sm); overflow: hidden; }
.seg button { padding: 0 8px; font-size: var(--w-fs-sm); color: var(--w-dim); border-left: 1px solid var(--w-line); }
.seg button:first-child { border-left: 0; }
.seg button:hover { background: var(--w-chip-ground); }
.seg .on_any { background: var(--w-panel-2); color: var(--w-fg); }
.seg .on_has { background: color-mix(in srgb, var(--w-down) 28%, transparent); color: var(--w-fg); }
.seg .on_not { background: color-mix(in srgb, var(--w-up) 28%, transparent); color: var(--w-fg); }
.pick {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--w-fs-sm);
  padding: 0 8px;
  border-radius: var(--w-r-pill);
  border: 1px solid var(--w-line-strong);
  background: var(--w-panel-2);
  color: var(--w-dim);
}
.pick:hover { color: var(--w-fg); }
.pickOn { color: var(--w-fg); background: var(--w-accent-soft); border-color: var(--w-accent); }
.link:hover { color: var(--w-fg); text-decoration: underline; }
.picker { display: flex; flex-direction: column; gap: 2px; padding: 4px 0 4px 60px; }
.input {
  font-size: var(--w-fs-sm);
  padding: 2px 6px;
  border-radius: var(--w-r-sm);
  border: 1px solid var(--w-line-strong);
  background: var(--w-panel-2);
  color: var(--w-fg);
}
.option { text-align: left; font-size: var(--w-fs-sm); padding: 1px 6px; border-radius: var(--w-r-sm); }
.option:hover { background: var(--w-chip-ground); }
.list { display: flex; flex-direction: column; gap: 2px; padding-top: 4px; border-top: 1px solid var(--w-line); font-size: var(--w-fs-sm); }
.void { color: var(--w-down); }
</style>
