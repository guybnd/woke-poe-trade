<template>
  <div v-if="result" :class="[$style.strip, isUnsure(result) ? $style.unknown : $style[result.verdict.verdict]]">
    <button type="button" :class="$style.row" @click="open = !open"
      :aria-expanded="open" aria-label="Show map mod ratings">
      <span :class="$style.badge">{{ isUnsure(result) ? '?' : VERDICT_LABEL[result.verdict.verdict] }}</span>
      <span :class="$style.headline" class="w-trunc">{{ headline }}</span>
      <span class="flex-1" />
      <template v-if="result.juice">
        <span class="w-dim text-xs">Juice</span>
        <span class="w-num w-accent font-semibold">{{ result.juice.score }}</span>
      </template>
      <i class="fas w-dim text-xs" :class="open ? 'fa-chevron-up' : 'fa-chevron-down'" />
    </button>
    <div :class="$style.chips">
      <span v-for="p in result.props" :key="p.label" :class="$style.chip" class="w-num">{{ p.label }} {{ p.value }}%</span>
      <!-- What the mod switches below add to the search, while the list is folded too. -->
      <span v-if="picked" :class="[$style.chip, $style.pickChip]" data-map-mod-picked>{{ picked }}</span>
    </div>
    <div v-if="open" :class="$style.list">
      <div v-if="searchable.length" :class="$style.listHead"><span>Mods</span><span>Any / Has / Not</span></div>
      <div v-for="(row, i) in rows" :key="`${i}:${row.mod.matcher}`" :class="[$style.mod, row.filter && $style[stateOf(row.filter)]]" data-map-mod>
        <span :class="[$style.dot, $style[row.mod.rating]]" />
        <span :class="[$style.text, { 'w-dim': row.mod.rating === 'ok' && !row.filter?.disabled }]">{{ row.mod.text }}</span>
        <span v-if="row.filter" :class="$style.seg" role="radiogroup" :aria-label="`Search ${row.mod.text}`">
          <button v-for="opt in STATES" :key="opt" type="button" role="radio" :aria-checked="stateOf(row.filter) === opt"
            :class="stateOf(row.filter) === opt && $style[`on_${opt}`]" :data-state="opt"
            @click="setState(row.filter, opt)">{{ STATE_LABEL[opt] }}</button>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useFold } from '../ui/fold'
import type { ParsedItem } from '@/parser'
import { shortLabel } from './rules'
import { VERDICT_LABEL } from './rules'
import { checkMap, findMapModsConfig, isMapLike, isUnsure } from './check'
import type { FilterOrGroup, StatFilter } from '@/web/price-check/filters/interfaces'

const props = defineProps<{ item: ParsedItem, stats?: FilterOrGroup[] }>()

const open = useFold('map-mod-strip')

const result = computed(() => {
  const config = findMapModsConfig()
  if (!config || !config.stripOnPriceCheck || !isMapLike(props.item) || props.item.isUnidentified) return null
  return checkMap(props.item, config)
})

const headline = computed(() => {
  const v = result.value!.verdict
  // The badge says how bad; this says why, once (the warn chip is gone).
  // Deadly first; risky ones too, so a folded strip still names them.
  if (v.deadly.length) return [...v.deadly, ...v.warn].map(m => shortLabel(m.matcher)).join(' · ')
  if (v.warn.length) return warnText.value
  if (result.value!.unknown.length) return "Couldn't read every mod"
  return ''
})

// The price check's filters for the map's own mods (create-stat-filters.ts): each
// verdict line gets an Any / Has / Not switch for the trade search.
type ModState = 'any' | 'has' | 'not'
const STATES: ModState[] = ['any', 'has', 'not']
const STATE_LABEL: Record<ModState, string> = { any: 'Any', has: 'Has', not: 'Not' }
const searchable = computed(() => (props.stats ?? []).filter((s): s is StatFilter => !s.group && !!s.mapMod))
const rows = computed(() => {
  const used = new Set<StatFilter>()
  return result.value!.verdict.mods.map(mod => {
    // The verdict names a mod by its wording, the filter by its stat's ref; a
    // stat has several wordings (plural, 100%, reworded), so any of them counts.
    const filter = searchable.value.find(f => !used.has(f) && (f.statRef === mod.matcher ||
      f.sources.some(s => s.stat.stat.matchers.some(m => m.string === mod.matcher)))) ?? null
    if (filter) used.add(filter)
    return { mod, filter }
  })
})
function stateOf (f: StatFilter): ModState {
  return f.disabled ? 'any' : f.not ? 'not' : 'has'
}
// The roll range each filter was made with (one-sided: at least a good roll,
// at most a bad one), put back when Has follows Not.
const madeWith = new WeakMap<StatFilter, { min: number | '' | undefined, max: number | '' | undefined }>()
// Has searches this map's roll as the filter was made; Not wants none of it, any roll.
function setState (f: StatFilter, state: ModState) {
  if (f.roll && !madeWith.has(f)) madeWith.set(f, { min: f.roll.min, max: f.roll.max })
  f.disabled = state === 'any'
  f.not = state === 'not' ? true : undefined
  if (f.roll) {
    const made = madeWith.get(f)!
    f.roll.min = state === 'not' ? '' : made.min
    f.roll.max = state === 'not' ? '' : made.max
  }
}
const picked = computed(() => {
  const has = searchable.value.filter(f => stateOf(f) === 'has').length
  const not = searchable.value.filter(f => stateOf(f) === 'not').length
  return [has ? `has ${has}` : '', not ? `not ${not}` : ''].filter(Boolean).join(' · ')
})

const warnText = computed(() => result.value!.verdict.warn.map(m => shortLabel(m.matcher)).join(' · '))
</script>

<style module>
.strip {
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
.skip { border-color: color-mix(in srgb, var(--w-down) 55%, transparent); }
.careful { border-color: color-mix(in srgb, var(--w-warn) 45%, transparent); }
.row { display: flex; align-items: center; gap: 8px; width: 100%; text-align: left; }
.badge {
  flex: none;
  font-size: var(--w-fs-xs);
  font-weight: 600;
  padding: 1px 6px;
  border-radius: var(--w-r-sm);
  color: var(--w-accent-fg);
}
.skip .badge { background: var(--w-down); }
.careful .badge { background: var(--w-warn); }
.run .badge { background: var(--w-up); }
.unknown .badge { background: var(--w-panel-3); color: var(--w-dim); }
.headline { font-weight: 500; min-width: 0; }
.skip .headline { color: var(--w-down); }
.careful .headline { color: var(--w-warn); }
.run .headline { color: var(--w-up); }
.chips { display: flex; flex-wrap: wrap; gap: 4px; }
.chip {
  font-size: var(--w-fs-sm);
  padding: 0 7px;
  border-radius: var(--w-r-pill);
  background: var(--w-panel-2);
  color: var(--w-dim);
}
.list { display: flex; flex-direction: column; gap: 2px; padding-top: 4px; border-top: 1px solid var(--w-line); }
.mod { display: flex; align-items: center; gap: 6px; font-size: var(--w-fs-sm); padding: 1px 0; }
.text { flex: 1; min-width: 0; }
.has .text { color: var(--w-up); }
.not .text { color: var(--w-down); text-decoration: line-through; text-decoration-color: color-mix(in srgb, var(--w-down) 50%, transparent); }
.listHead { display: flex; justify-content: space-between; color: var(--w-faint); font-size: var(--w-fs-xs); }
.seg { flex: none; display: inline-flex; border: 1px solid var(--w-line-strong); border-radius: var(--w-r-sm); overflow: hidden; }
.seg button { padding: 0 6px; font-size: var(--w-fs-xs); color: var(--w-dim); border-left: 1px solid var(--w-line); }
.seg button:first-child { border-left: 0; }
.seg button:hover { background: var(--w-chip-ground); }
.seg .on_any { background: var(--w-panel-2); color: var(--w-fg); }
.seg .on_has { background: color-mix(in srgb, var(--w-up) 28%, transparent); color: var(--w-fg); }
.seg .on_not { background: color-mix(in srgb, var(--w-down) 28%, transparent); color: var(--w-fg); }
.pickChip { color: var(--w-fg); background: var(--w-accent-soft); }
.dot { flex: none; width: 7px; height: 7px; border-radius: var(--w-r-sm); background: var(--w-panel-3); }
.dot.deadly { background: var(--w-down); }
.dot.warn { background: var(--w-warn); }
.dot.good { background: var(--w-up); }
</style>
