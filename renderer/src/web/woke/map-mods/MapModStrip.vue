<template>
  <!-- Guy's holistic pick A (2026-11-20): three questions, one section each.
       Run it? (your build, read-only) · Worth running (slot: Nightmare grid) ·
       Trade search (the only switches). Each mod is listed once, in Trade search. -->
  <div v-if="result" :class="[$style.strip, isUnsure(result) ? $style.unknown : $style[result.verdict.verdict]]" data-map-strip>
    <section :class="$style.zone" data-map-run>
      <div :class="$style.row">
        <span :class="$style.title">Run it?</span>
        <span :class="$style.badge">{{ isUnsure(result) ? '?' : VERDICT_LABEL[result.verdict.verdict] }}</span>
        <span :class="$style.headline" class="w-trunc">{{ headline }}</span>
        <span class="flex-1" />
        <template v-if="result.juice">
          <span class="w-dim text-xs">Juice</span>
          <span class="w-num w-accent font-semibold">{{ result.juice.score }}</span>
        </template>
      </div>
      <div v-if="summary" :class="$style.summary">{{ summary }}</div>
    </section>
    <slot name="worth" />
    <section :class="$style.zone" data-map-trade>
      <button type="button" :class="$style.row" @click="open = !open"
        :aria-expanded="open" aria-label="Show the map's mods for the trade search">
        <span :class="$style.title">Trade search</span>
        <span v-if="picked" :class="[$style.chip, $style.pickChip]" data-map-mod-picked>{{ picked }}</span>
        <span class="flex-1" />
        <span class="w-dim text-xs">only this search</span>
        <WInfo text="Only this price check's trade search: nothing is searched until you press Search. A number chip searches at least its minimum (scroll to change it). Has finds maps with the mod, Not finds maps without it, Any ignores it. Your Map mods ratings (the dots and the verdict) don't change." />
        <i class="fas w-dim text-xs" :class="open ? 'fa-chevron-up' : 'fa-chevron-down'" />
      </button>
      <div :class="$style.chips">
        <!-- A number with a trade filter is a toggle: on, the search wants at least the min. -->
        <template v-for="p in result.props" :key="p.label">
          <button v-if="propFilter(p.label)" type="button" :class="[$style.chip, $style.propChip, !propFilter(p.label)!.disabled && $style.propOn]" class="w-num"
            :aria-pressed="!propFilter(p.label)!.disabled" :title="propTitle(p.label)" :data-map-prop="p.label"
            data-own-wheel @click="toggleProp(p.label)" @wheel.prevent.stop="wheelMin(p.label, $event)">
            {{ p.label }} {{ p.value }}%<template v-if="!propFilter(p.label)!.disabled && minOf(p.label) != null"> ≥{{ minOf(p.label) }}</template>
          </button>
          <span v-else :class="$style.chip" class="w-num">{{ p.label }} {{ p.value }}%</span>
        </template>
      </div>
      <div v-if="open" :class="$style.list">
        <div v-for="(row, i) in rows" :key="`${i}:${row.mod.matcher}`" :class="[$style.mod, row.filter && $style[stateOf(row.filter)]]" data-map-mod>
          <span :class="[$style.dot, $style[row.mod.rating]]" :title="RATING_TITLE[row.mod.rating]" />
          <span :class="[$style.text, { 'w-dim': row.mod.rating === 'ok' && !row.filter?.disabled }]">{{ row.mod.text }}</span>
          <span v-if="row.filter" :class="$style.seg" role="radiogroup" :aria-label="`Search ${row.mod.text}`">
            <button v-for="opt in STATES" :key="opt" type="button" role="radio" :aria-checked="stateOf(row.filter) === opt"
              :class="stateOf(row.filter) === opt && $style[`on_${opt}`]" :data-state="opt" :title="STATE_TITLE[opt]"
              @click="setState(row.filter, opt)">{{ STATE_LABEL[opt] }}</button>
          </span>
        </div>
        <!-- Guy: any other mod goes in from here; the price check's own rows keep only special ones (enchants). -->
        <FilterAddMod v-if="filters && addMods" :filters="filters" data-map-add-mod />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, watchEffect } from 'vue'
import type { ShallowRef } from 'vue'
import { WInfo } from '../ui'
import { useFold } from '../ui/fold'
import type { ParsedItem } from '@/parser'
import { shortLabel } from './rules'
import { VERDICT_LABEL } from './rules'
import { checkMap, findMapModsConfig, isMapLike, isUnsure, PROP_TRADE_ID } from './check'
import type { FilterOrGroup, ItemFilters, StatFilter } from '@/web/price-check/filters/interfaces'
import FilterAddMod from '@/web/price-check/filters/FilterAddMod.vue'

// addMods: off on the bulk preset, which searches maps by type only.
const props = defineProps<{ item: ParsedItem, stats?: FilterOrGroup[], filters?: ItemFilters, addMods?: boolean }>()

const open = useFold('map-mod-strip')

const result = computed(() => {
  const config = findMapModsConfig()
  if (!config || !config.stripOnPriceCheck || !isMapLike(props.item) || props.item.isUnidentified) return null
  return checkMap(props.item, config)
})

// Tells the price check which number rows the chips stand in for (CheckedItem.vue).
const owns = inject<ShallowRef<ReadonlySet<string> | null> | null>('map-strip-owns', null)
const PROP_IDS: ReadonlySet<string> = new Set(Object.values(PROP_TRADE_ID))
watchEffect(() => { if (owns) owns.value = result.value ? PROP_IDS : null })
onBeforeUnmount(() => { if (owns) owns.value = null })

// Run it?'s second line: how many mods of each rating, so the mod list can
// live in Trade search without the verdict losing its reasons.
const RATING_TITLE: Record<string, string> = { deadly: "Your build can't run this", warn: 'Risky for your build', good: 'Wanted (juice)', ok: 'Not rated' }
const summary = computed(() => {
  const v = result.value!.verdict
  const n = (k: number, one: string, many: string) => k ? `${k} ${k === 1 ? one : many}` : ''
  return [
    n(v.deadly.length, "mod your build can't run", "mods your build can't run"),
    n(v.warn.length, 'risky mod', 'risky mods'),
    n(v.good.length, 'good mod', 'good mods'),
    n(result.value!.unknown.length, "mod I couldn't read", "mods I couldn't read")
  ].filter(Boolean).join(' · ')
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
const STATE_TITLE: Record<ModState, string> = {
  any: 'Trade search ignores this mod',
  has: 'Trade search finds maps with this mod',
  not: 'Trade search finds maps without this mod'
}
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
function propFilter (label: string): StatFilter | null {
  const id = PROP_TRADE_ID[label]
  if (!id) return null
  return (props.stats ?? []).find((s): s is StatFilter => !s.group && s.tradeId[0] === id) ?? null
}
function minOf (label: string): number | null {
  const min = propFilter(label)?.roll?.min
  return typeof min === 'number' ? min : null
}
function toggleProp (label: string) {
  const f = propFilter(label)
  if (f) f.disabled = !f.disabled
}
// The wheel moves the min, as on the rows it replaced; turns the chip on.
function wheelMin (label: string, e: WheelEvent) {
  const f = propFilter(label)
  // Sideways scroll and Ctrl+wheel (zoom) aren't a step, as on the other chips.
  if (!f?.roll || e.deltaY === 0 || e.ctrlKey) return
  const now = typeof f.roll.min === 'number' ? f.roll.min : f.roll.value
  // Never past the map's own number, or the search leaves this map out.
  f.roll.min = Math.min(f.roll.value, Math.max(0, now + (e.deltaY < 0 ? 1 : -1)))
  f.disabled = false
}
function propTitle (label: string): string {
  const on = !propFilter(label)!.disabled
  // Checked 2026-11-15: the trade site's Atlas Drops filter matched no listing.
  if (label === 'Drops') return on ? 'Searching Atlas Drops. The trade site found no listings for this filter in 3.30, so results may be empty.' : 'Search at least this Atlas Drops. The trade site found no listings for this filter in 3.30.'
  return on ? 'In the search. Scroll to change the minimum, click to leave it out.' : 'Click to search at least this, scroll to set the minimum.'
}

const picked = computed(() => {
  const has = searchable.value.filter(f => stateOf(f) === 'has').length
  const not = searchable.value.filter(f => stateOf(f) === 'not').length
  // Mods added from the line below count too, so a folded section still says what it searches.
  const added = (props.filters?.addedMods ?? []).filter(m => !m.disabled).length
  return [has ? `has ${has}` : '', not ? `not ${not}` : '', added ? `+${added} added` : ''].filter(Boolean).join(' · ')
})

const warnText = computed(() => result.value!.verdict.warn.map(m => shortLabel(m.matcher)).join(' · '))
</script>

<style module>
.strip {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--w-fg);
  font-family: var(--w-body);
  font-size: var(--w-fs-md);
}
.zone {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 8px;
  border-radius: var(--w-r-md);
  border: 1px solid var(--w-line-strong);
  background: var(--w-panel);
}
.title { flex: none; color: var(--w-gold); font-family: var(--w-caps-face); font-size: var(--w-fs-sm); }
.summary { color: var(--w-dim); font-size: var(--w-fs-xs); }
.skip [data-map-run] { border-color: color-mix(in srgb, var(--w-down) 55%, transparent); }
.careful [data-map-run] { border-color: color-mix(in srgb, var(--w-warn) 45%, transparent); }
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
.propChip { cursor: pointer; border: 1px solid transparent; }
.propChip:hover { border-color: var(--w-line-strong); color: var(--w-fg); }
.propOn { color: var(--w-fg); background: var(--w-accent-soft); border-color: var(--w-accent); }
.dot { flex: none; width: 7px; height: 7px; border-radius: var(--w-r-sm); background: var(--w-panel-3); }
.dot.deadly { background: var(--w-down); }
.dot.warn { background: var(--w-warn); }
.dot.good { background: var(--w-up); }
</style>
