<template>
  <!-- Guy's pick A (2026-11-20): one section. Its top line is shared: Trade
       search on the left, the verdict (reason, badge) and Juice on the right.
       The counts, the number chips and the mod list (Any / Has / Not) follow. Worth running (a Nightmare
       Map) sits under it. Each mod is listed once. -->
  <div v-if="result" :class="[$style.strip, isUnsure(result) ? $style.unknown : $style[result.verdict.verdict]]" data-map-strip>
    <section :class="$style.zone" data-map-run data-map-trade>
      <button type="button" :class="$style.row" @click="open = !open"
        :aria-expanded="open">
        <span :class="$style.title">Trade search</span>
        <span class="flex-1" />
        <span v-if="headline" :class="$style.headline" class="w-trunc">{{ headline }}</span>
        <span :class="$style.badge">{{ isUnsure(result) ? '?' : VERDICT_LABEL[result.verdict.verdict] }}</span>
        <template v-if="result.juice">
          <span class="w-dim text-xs">Juice</span>
          <span class="w-num w-accent font-semibold" data-map-juice>{{ result.juice.score }}</span>
        </template>
        <WInfo text="The badge and dots are your Map mods ratings. Has finds maps with the mod, Not finds maps without it, Any ignores it; a number chip searches at least its minimum (type or scroll to change it). These change only this price check's search, and nothing is searched until you press Search." />
        <i class="fas w-dim text-xs" :class="open ? 'fa-chevron-up' : 'fa-chevron-down'" />
      </button>
      <div v-if="summary || picked" :class="$style.summary">
        {{ summary }}<template v-if="summary && picked"> · </template><template v-if="picked">Search: <span :class="$style.picked" data-map-mod-picked>{{ picked }}</span></template>
      </div>
      <!-- Guy's pick (veteran review, 2026-11-24): what you farm decides which numbers start on. Remembered. -->
      <div v-if="propFilters.length && isMap" :class="$style.goalRow" data-map-goal>
        <span class="w-dim text-xs">Farming</span>
        <span :class="$style.seg" role="radiogroup" aria-label="Farming goal">
          <button v-for="g in FARM_GOALS" :key="g" type="button" role="radio" :aria-checked="goal === g"
            :class="goal === g && $style.on_any" :data-goal="g" :title="GOAL_TITLE[g]" @click="setGoal(g)">{{ FARM_GOAL_LABEL[g] }}</button>
        </span>
      </div>
      <div :class="$style.chips">
        <!-- Guy's pick A (2026-11-23): every number is a chip and every chip is a filter.
             Off: dashed with +. On: the min, typed in its box or scrolled. -->
        <!-- Guy (2026-11-24): one click to search the plain map; again brings the picks back. Never searches. -->
        <button v-if="hasFilters" type="button" :class="[$style.chip, $style.baseBtn, baseOnly && $style.baseOn]" :aria-pressed="baseOnly"
          :title="baseTitle" data-map-base @click="toggleBase">Base map<template v-if="baseOnly"> ✓</template></button>
        <template v-for="p in result.props" :key="p.label">
          <span v-if="propFilter(p.label)" :class="[$style.chip, $style.propChip, isOn(p.label) ? $style.propOn : $style.propOff, p.label === 'Drops' && $style.propWarn, goalKeys.includes(p.label) && $style.goalKey, faded(p.label) && $style.faded]"
            class="w-num" data-own-wheel @wheel.prevent.stop="wheelMin(p.label, $event)">
            <button type="button" :class="$style.propBtn" :aria-pressed="isOn(p.label)" :title="propTitle(p.label)" :data-map-prop="p.label"
              @click="toggleProp(p.label)">{{ p.label }} {{ p.value }}%</button>
            <label v-if="isOn(p.label)" :class="$style.minBox" :title="`Search at least this ${p.label}`">≥<input type="number" min="0" :max="p.value" :value="minOf(p.label) ?? ''"
              :aria-label="`${p.label} minimum`" :data-map-prop-min="p.label" @change="typeMin(p.label, $event)" @keydown.enter="($event.target as HTMLInputElement).blur()"></label>
          </span>
          <!-- No filter: the bulk search finds maps by type only (or the item isn't a map). -->
          <span v-else :class="$style.chip" class="w-num" :title="addMods === false ? DEAD_TITLE : undefined">{{ p.label }} {{ p.value }}%</span>
        </template>
        <!-- WOKEPOET-523: Elder (or Shaper) maps list cheap and crowd the results; on from the start. -->
        <span v-if="noElder" :class="[$style.chip, $style.propChip, noElder.disabled ? $style.propOff : $style.propOn]">
          <button type="button" :class="$style.propBtn" :aria-pressed="!noElder.disabled" data-map-no-elder
            :title="noElder.disabled ? 'Elder and Shaper maps are in the search. Click to leave them out.' : 'Leaves out maps influenced by the Elder or the Shaper (they carry a guardian and list cheap). Click to include them.'"
            @click="toggleNoElder">No Elder</button>
        </span>
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
          <!-- Guy (2026-11-24): any Evocator (or buried Sentinel) does the job, so Has and Not
               take all three until narrowed to this one. -->
          <button v-if="row.filter?.anyOf" type="button" :class="$style.anyOf" data-map-any-of
            :aria-pressed="isAnyOf(row.filter)" :title="anyOfTitle(row.filter)" @click="toggleAnyOf(row.filter)">{{ isAnyOf(row.filter) ? `any ${row.filter.anyOf.label}` : 'this one' }}</button>
        </div>
        <!-- Guy: any other mod goes in from here; the price check's own rows keep only special ones (enchants). -->
        <FilterAddMod v-if="filters && addMods" :filters="filters" data-map-add-mod />
      </div>
    </section>
    <slot name="worth" />
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, shallowRef, watch, watchEffect } from 'vue'
import type { ShallowRef } from 'vue'
import { WInfo } from '../ui'
import { useFold } from '../ui/fold'
import type { ParsedItem } from '@/parser'
import { shortLabel } from './rules'
import { VERDICT_LABEL } from './rules'
import { checkMap, findMapModsConfig, isMapLike, isUnsure, PROP_TRADE_ID } from './check'
import { NO_ELDER_TRADE_ID } from '@/web/price-check/filters/pseudo/maps'
import type { AddedMod, FilterOrGroup, ItemFilters, StatFilter } from '@/web/price-check/filters/interfaces'
import FilterAddMod from '@/web/price-check/filters/FilterAddMod.vue'
import { FARM_GOALS, FARM_GOAL_LABEL, GOAL_KEYS, RAISES, goalDisabled } from './goal'
import { farmGoal, setFarmGoal } from './goal-config'
import { tickPref } from '../price-insight/tick-prefs'
import { ItemCategory } from '@/parser'
import type { FarmGoal } from './goal'

// addMods: off on the bulk preset, which searches maps by type only.
// worth: the worth slot is filled (a Nightmare Map).
const props = defineProps<{ item: ParsedItem, stats?: FilterOrGroup[], filters?: ItemFilters, addMods?: boolean, worth?: boolean }>()

const open = useFold('map-mod-strip')

const result = computed(() => {
  const config = findMapModsConfig()
  // A Valdo map has its own strip (ValdoStrip.vue): its mods are fixed and the trade site can't search them.
  if (!config || !config.stripOnPriceCheck || !isMapLike(props.item) || props.item.isUnidentified || props.item.mapCompletionReward) return null
  return checkMap(props.item, config)
})

// With Worth running in the slot (a Nightmare Map), one of it and the mod list
// is open at a time, so neither pushes the other out of the window (Guy, 2026-11-20).
// The strip is reused from item to item, so it watches the worth prop rather
// than checking once at setup.
const worthOpen = useFold('nightmare-strip', true)
const accordion = computed(() => !!props.worth && !!result.value)
watch(accordion, (on) => { if (on && open.value && worthOpen.value) open.value = false }, { immediate: true })
watch(open, (now) => { if (now && accordion.value) worthOpen.value = false })
watch(worthOpen, (now) => { if (now && accordion.value) open.value = false })

// Tells the price check which number rows the chips stand in for (CheckedItem.vue).
const owns = inject<ShallowRef<ReadonlySet<string> | null> | null>('map-strip-owns', null)
const PROP_IDS: ReadonlySet<string> = new Set([...Object.values(PROP_TRADE_ID), NO_ELDER_TRADE_ID])
watchEffect(() => { if (owns) owns.value = result.value ? PROP_IDS : null })
onBeforeUnmount(() => { if (owns) owns.value = null })

// The second line: how many mods of each rating, so a folded section keeps
// the verdict's reasons.
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
function isAnyOf (f: StatFilter): boolean {
  return f.tradeId.length > 1
}
function toggleAnyOf (f: StatFilter) {
  if (!f.anyOf) return
  f.tradeId = isAnyOf(f) ? f.anyOf.exact : f.anyOf.ids
}
function anyOfTitle (f: StatFilter): string {
  const label = f.anyOf!.label
  return isAnyOf(f)
    ? `Has and Not count any ${label} (all ${f.anyOf!.ids.length} kinds). Click to search only this one.`
    : `Has and Not count only this ${label}. Click to count any of the ${f.anyOf!.ids.length} kinds.`
}
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
// The map's "no Elder or Shaper influence" filter (pseudo/maps.ts); none on an influenced map.
const noElder = computed(() => (props.stats ?? []).find((s): s is StatFilter => !s.group && !!s.noElder) ?? null)
function toggleNoElder () {
  const f = noElder.value
  if (f) f.disabled = !f.disabled
}
function propFilter (label: string): StatFilter | null {
  const id = PROP_TRADE_ID[label]
  if (!id) return null
  return (props.stats ?? []).find((s): s is StatFilter => !s.group && s.tradeId[0] === id) ?? null
}
function isOn (label: string): boolean {
  return !propFilter(label)!.disabled
}
function minOf (label: string): number | null {
  const min = propFilter(label)?.roll?.min
  return typeof min === 'number' ? min : null
}
function toggleProp (label: string) {
  const f = propFilter(label)
  if (f) f.disabled = !f.disabled
}
// Never past the map's own number, or the search leaves this map out.
function clampMin (f: StatFilter, n: number): number {
  return Math.min(f.roll!.value, Math.max(0, n))
}
// The wheel moves the min, as on the rows it replaced; turns the chip on.
function wheelMin (label: string, e: WheelEvent) {
  const f = propFilter(label)
  // Sideways scroll and Ctrl+wheel (zoom) aren't a step, as on the other chips.
  if (!f?.roll || e.deltaY === 0 || e.ctrlKey) return
  const now = typeof f.roll.min === 'number' ? f.roll.min : f.roll.value
  f.roll.min = clampMin(f, now + (e.deltaY < 0 ? 1 : -1))
  f.disabled = false
}
// A typed min. Empty searches any amount (the chip stays on). Enter blurs the box, so
// the min is set first; in PoE mode Enter then searches, as in every number box there.
function typeMin (label: string, e: Event) {
  const f = propFilter(label)
  const box = e.target as HTMLInputElement
  if (!f?.roll) return
  const n = box.value.trim() === '' ? NaN : Number(box.value)
  f.roll.min = Number.isFinite(n) ? clampMin(f, Math.round(n)) : ''
  // Show the clamped number, not what was typed.
  box.value = typeof f.roll.min === 'number' ? String(f.roll.min) : ''
}
const DEAD_TITLE = 'The bulk search finds maps by type only. Switch to the normal search to use this number.'
function propTitle (label: string): string {
  const on = isOn(label)
  const raises = RAISES[label] ? `${RAISES[label]}\n\n` : ''
  // Checked 2026-11-15: the trade site's Atlas Drops filter matched no listing.
  if (label === 'Drops') return raises + (on ? 'Searching Atlas Drops. The trade site found no listings for this filter in 3.30, so results may be empty. Click to leave it out.' : 'The trade site found no listings for Atlas Drops in 3.30, so turning this on will likely empty the results.')
  return raises + (on ? 'In the search. Type or scroll the minimum, click to leave it out.' : 'Click to search at least this, or scroll to set the minimum.')
}

// The farming goal (goal.ts): picking one sets this map's number chips to the
// goal's, and the next maps start that way.
const goal = computed(() => farmGoal())
const goalKeys = computed(() => GOAL_KEYS[goal.value])
const GOAL_TITLE: Record<FarmGoal, string> = {
  currency: 'Farming currency: Rarity, Pack size and More Currency start on. Remembered for the next maps.',
  atlas: 'Farming maps and Threads: Pack size, More Maps and More Threads start on. Atlas Drops matters most but the trade site has no listings for it. Remembered for the next maps.',
  any: 'No goal: the numbers start as they always did.'
}
// Off and not one the goal wants: faded, so the ones that matter stand out.
function faded (label: string): boolean {
  return goal.value !== 'any' && !goalKeys.value.includes(label) && !isOn(label)
}
// Only maps: charts keep their own numbers (pseudo/maps.ts chartProps).
const isMap = computed(() => props.item.category === ItemCategory.Map)
function setGoal (g: FarmGoal) {
  // Base map on: bring its picks back first, so the goal doesn't lose them.
  if (baseOnly.value && clearedRef.value) toggleBase()
  setFarmGoal(g)
  applyGoal(g)
}
function applyGoal (g: FarmGoal) {
  for (const p of result.value?.props ?? []) {
    // Atlas Drops is off for every goal (no listings): one you turned on stays on.
    if (p.label === 'Drops') continue
    const f = propFilter(p.label)
    const off = goalDisabled(p.label, g)
    // An Always / Never tick you set on a number wins (price-insight/tick-prefs.ts).
    if (f && off !== undefined && !tickPref(f)) f.disabled = off
  }
}
// The price check builds a map's numbers as it always did; the strip sets them
// to the goal once per set of filters (a new item, or another preset), so
// clicks after that are kept. The strip loads lazily, which keeps this out of
// the startup budget.
const goalApplied = new WeakSet<object>()
watch(() => [props.stats, result.value] as const, () => {
  const stats = props.stats
  if (!stats || !result.value || !isMap.value || goalApplied.has(stats)) return
  goalApplied.add(stats)
  if (goal.value !== 'any') applyGoal(goal.value)
}, { immediate: true })

// The Base map button: every chip and every row below off (the 8-mod count too),
// every mod Any, added mods off. The picks it cleared come back on a second
// click (until the next item).
const propFilters = computed(() => result.value!.props.map(p => propFilter(p.label)).filter((f): f is StatFilter => f != null))
// Every filter other than the map's own mods (those are Any / Has / Not): chips and rows.
// The map's influence (Originator, Elder, Shaper, a guardian, a conqueror's Citadel) is what
// the base map is (Guy, 2026-11-24), so Base map never touches it.
const INFLUENCE = /^(Area is influenced by|Map is occupied by|Map contains \S+ Citadel)/i
const isMapIdentity = (s: FilterOrGroup) => !s.group && INFLUENCE.test(s.statRef)
const plainFilters = computed(() => (props.stats ?? []).filter(s => s.group || (!s.mapMod && !isMapIdentity(s))))
const isOnFilter = (s: FilterOrGroup) => s.group ? !s.meta.disabled : !s.disabled
const setOnFilter = (s: FilterOrGroup, on: boolean) => { if (s.group) s.meta.disabled = !on; else s.disabled = !on }
const hasFilters = computed(() => propFilters.value.length > 0 || searchable.value.length > 0)
const baseOnly = computed(() =>
  !plainFilters.value.some(isOnFilter) &&
  searchable.value.every(f => stateOf(f) === 'any') &&
  (props.filters?.addedMods ?? []).every(m => m.disabled))
interface BaseSnapshot { on: FilterOrGroup[], mods: Array<[StatFilter, ModState]>, added: AddedMod[] }
const clearedRef = shallowRef<BaseSnapshot | null>(null)
watch(() => props.item, () => { clearedRef.value = null })
function toggleBase () {
  if (!baseOnly.value) {
    const cleared: BaseSnapshot = {
      on: plainFilters.value.filter(isOnFilter),
      mods: searchable.value.filter(f => stateOf(f) !== 'any').map(f => [f, stateOf(f)]),
      added: (props.filters?.addedMods ?? []).filter(m => !m.disabled)
    }
    cleared.on.forEach(f => { setOnFilter(f, false) })
    cleared.mods.forEach(([f]) => { setState(f, 'any') })
    cleared.added.forEach(m => { m.disabled = true })
    clearedRef.value = cleared
  } else if (clearedRef.value) {
    const cleared = clearedRef.value
    // Only filters still on show: a preset switch makes new ones.
    const stats = props.stats ?? []
    cleared.on.filter(f => stats.includes(f)).forEach(f => { setOnFilter(f, true) })
    cleared.mods.filter(([f]) => stats.includes(f)).forEach(([f, state]) => { setState(f, state) })
    const added = props.filters?.addedMods ?? []
    cleared.added.filter(m => added.includes(m)).forEach(m => { m.disabled = false })
    clearedRef.value = null
  }
}
const baseTitle = computed(() => baseOnly.value
  ? (clearedRef.value ? 'Searching the plain map. Click to bring back the numbers and mods you had ticked.' : 'Searching the plain map: no number or mod is ticked.')
  : 'Untick every number, mod and line below, to search the plain map (its influence stays). Click again to bring them back. Searches only when you press Search.')

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
.summary { color: var(--w-dim); font-size: var(--w-fs-xs); }
.skip [data-map-run] { border-color: color-mix(in srgb, var(--w-down) 55%, transparent); }
.careful [data-map-run] { border-color: color-mix(in srgb, var(--w-warn) 45%, transparent); }
.title { flex: none; color: var(--w-gold); font-family: var(--w-caps-face); font-size: var(--w-fs-sm); }
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
.headline { font-weight: 500; min-width: 0; text-align: right; }
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
.seg { flex: none; display: inline-flex; border: 1px solid var(--w-line-strong); border-radius: var(--w-r-sm); overflow: hidden; }
.seg button { padding: 0 6px; font-size: var(--w-fs-xs); color: var(--w-dim); border-left: 1px solid var(--w-line); }
.seg button:first-child { border-left: 0; }
.seg button:hover { background: var(--w-chip-ground); }
.seg .on_any { background: var(--w-panel-2); color: var(--w-fg); }
.seg .on_has { background: color-mix(in srgb, var(--w-up) 28%, transparent); color: var(--w-fg); }
.seg .on_not { background: color-mix(in srgb, var(--w-down) 28%, transparent); color: var(--w-fg); }
.picked { color: var(--w-fg); }
.baseBtn { cursor: pointer; border: 1px solid var(--w-gold); color: var(--w-gold); background: transparent; }
.baseBtn:hover { color: var(--w-fg); }
.baseOn { background: var(--w-accent-soft); color: var(--w-fg); }
.propChip { display: inline-flex; align-items: center; gap: 4px; border: 1px solid transparent; }
.propBtn { cursor: pointer; color: inherit; }
.propOff { border: 1px dashed var(--w-line-strong); }
.propOff .propBtn::before { content: '+' / ''; margin-right: 3px; color: var(--w-gold); }
.propChip:hover { border-color: var(--w-line-strong); color: var(--w-fg); }
.goalRow { display: flex; align-items: center; gap: 6px; }
.goalKey { box-shadow: 0 0 0 1px var(--w-gold); }
.faded { opacity: 0.5; }
.faded:hover { opacity: 1; }
.propOn { color: var(--w-fg); background: var(--w-accent-soft); border-color: var(--w-accent); }
.propOn:hover { border-color: var(--w-accent); }
/* Atlas Drops: the trade site has no listings for it (pseudo/maps.ts). */
.propWarn.propOff { border-color: color-mix(in srgb, var(--w-warn) 70%, transparent); color: var(--w-warn); }
.propWarn.propOff .propBtn::before { content: '!' / ''; color: var(--w-warn); font-weight: 700; }
.minBox { display: inline-flex; align-items: center; gap: 1px; color: var(--w-dim); }
.minBox input {
  width: 3.2em; padding: 0 3px; border-radius: var(--w-r-sm);
  border: 1px solid var(--w-line-strong); background: var(--w-panel); color: var(--w-accent);
  font: inherit; text-align: right; -moz-appearance: textfield;
}
.minBox input::-webkit-inner-spin-button, .minBox input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
.minBox input:focus-visible { outline: 1px solid var(--w-accent); }
.anyOf { flex: none; font-size: var(--w-fs-xs); padding: 0 5px; border: 1px solid var(--w-line-strong); border-radius: var(--w-r-sm); color: var(--w-dim); cursor: pointer; }
.anyOf:hover { color: var(--w-fg); }
.dot { flex: none; width: 7px; height: 7px; border-radius: var(--w-r-sm); background: var(--w-panel-3); }
.dot.deadly { background: var(--w-down); }
.dot.warn { background: var(--w-warn); }
.dot.good { background: var(--w-up); }
</style>
