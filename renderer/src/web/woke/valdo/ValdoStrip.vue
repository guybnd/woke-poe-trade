<template>
  <!-- A Valdo map (Valdo's Puzzle Box), laid out like the map strip (MapModStrip.vue, Guy's pick A):
       Trade search on top with what's skipped, the Reward, then one list of the map's mods, each
       Any / Has / Not. The trade site searches only the Void mod; the rest filter the listings
       already loaded (skips.ts), so nothing is searched twice. A Not is saved on the Map mods
       profile, so each build profile keeps its own; a Has is for this price check only. -->
  <section :class="$style.zone" data-valdo-strip data-goto-spot="valdo-strip">
    <button type="button" :class="$style.row" :aria-expanded="open" data-valdo-mods-toggle @click="open = !open">
      <span :class="$style.title">Trade search</span>
      <span class="flex-1" />
      <span v-if="headline" :class="$style.headline" class="w-trunc" data-valdo-headline>{{ headline }}</span>
      <WInfo text="**Void** and **Reward** go into this price check's search. Nothing is searched until you press **Search**.
- The trade site can't search a Valdo map's other mods, so their **Has** and **Not** filter the listings already loaded.
- **Not** is remembered on your Map mods profile.
- **Red dots** are the mods that profile says you can't run." />
      <i class="fas w-dim text-xs" :class="open ? 'fa-chevron-up' : 'fa-chevron-down'" />
    </button>
    <div v-if="reward" :class="$style.line" data-valdo-reward>
      <span class="w-dim text-xs" :class="$style.label">Reward</span>
      <button type="button" :class="[$style.tool, !reward.disabled && $style.toolOn]" :aria-expanded="picking"
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
    <!-- The template: the Map mods profile that keeps your Not list. One per build. -->
    <div v-if="config" :class="$style.line" data-valdo-template>
      <span class="w-dim text-xs" :class="$style.label">Template</span>
      <select :class="$style.tool" :value="config.activeProfile" aria-label="Template (Map mods profile)"
        title="Your Not mods are kept on this Map mods profile and apply to every Valdo map. Switching it switches Map mods too."
        data-valdo-template-pick @change="pickProfile(($event.target as HTMLSelectElement).value)">
        <option v-for="p in config.profiles" :key="p.id" :value="p.id">{{ p.name }}</option>
      </select>
      <span class="w-dim text-xs w-trunc" data-valdo-saved>{{ savedNote }}</span>
    </div>
    <div v-if="shown.length" :class="$style.list" data-valdo-mods>
      <div v-for="(m, i) in shown" :key="i" :class="[$style.mod, $style[stateOf(m)]]" :data-valdo-mod="m.split('\n')[0]"
        :title="canCycle(m) ? 'Click to cycle Has, Not, Any' : undefined" @click="canCycle(m) && cycleState(m)">
        <!-- As on a normal map: the chip is the mod's rating, clicked through Bad, Care, Want, none; saved to the template. -->
        <button v-if="m !== VOID_TEXT && canSkip" type="button" :class="[$style.rateChip, $style[`rate_${ratingOf(m)}`]]" :title="rateTitle(m)"
          :aria-label="`Rating: ${RATE_WORD[ratingOf(m)]}. Click to change`" :data-valdo-rate="ratingOf(m)" @click.stop="rate(m)">{{ RATE_WORD[ratingOf(m)] }}</button>
        <span v-else :class="$style.rateGap" />
        <span :class="$style.text" :title="m">{{ m.split('\n')[0] }}</span>
        <span v-if="m !== VOID_TEXT && !onMap(m)" :class="$style.sub" title="Not on this map: it still filters the listings">other maps</span>
        <span v-if="m === VOID_TEXT && !hasVoid" :class="$style.sub" title="This map doesn't send you to the Void; the search looks for maps without it until you change it">not on this map</span>
        <span v-if="m === VOID_TEXT ? !!voidFilter : canSkip" :class="$style.seg" role="radiogroup" @click.stop :aria-label="`Search ${m.split('\n')[0]}`">
          <button v-for="opt in STATES" :key="opt" type="button" role="radio" :aria-checked="stateOf(m) === opt"
            :class="stateOf(m) === opt && $style[`on_${opt}`]" :data-state="opt" :title="stateTitle(m, opt)"
            @click="setState(m, opt)">{{ STATE_LABEL[opt] }}</button>
        </span>
      </div>
      <!-- Any other Valdo mod, from the ones met so far (on your maps and the listings loaded). -->
      <div v-if="open && canSkip" :class="$style.add" data-valdo-add>
        <input v-model="addQuery" type="text" :class="$style.addInput" placeholder="+ Add a mod…" aria-label="Add a Valdo mod"
          data-valdo-add-input @keydown.enter.prevent="addFirst" @keydown.esc.prevent="addQuery = ''">
        <button v-for="m in addMatches" :key="m" type="button" :class="$style.option" :data-valdo-add-option="m" @click="addMod(m)">{{ m }}</button>
        <span v-if="addQuery.trim() && !addMatches.length" class="w-dim text-xs">No Valdo mod met yet matches "{{ addQuery.trim() }}". Enter adds it as typed.</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { WInfo } from '../ui'
import { useFold } from '../ui/fold'
import { CLIENT_STRINGS as _$, ITEMS_ITERATOR } from '@/assets/data'
import type { BaseType } from '@/assets/data'
import { ModifierType } from '@/parser/modifiers'
import type { ParsedItem } from '@/parser'
import { AppConfig } from '@/web/Config'
import { isModuleOn } from '../modules'
import type { FilterOrGroup, ItemFilters, StatFilter } from '@/web/price-check/filters/interfaces'
import { ensureMapModsConfig } from '../map-mods/check'
import { activeProfile } from '../map-mods/widget'
import { nextModRating, withRating } from '../map-mods/rules'
import type { ModRating } from '../map-mods/rules'
import { isSkipped, profileSkips, rememberSeen, setSkipped, skipKey, skipLabel, valdoConfig, valdoHidden, valdoListingMods, valdoNeed, valdoProfile, VOID_TEXT, takeLookupAsk } from './skips'
import type { SkipEntry } from './skips'

const props = defineProps<{ item: ParsedItem, stats: FilterOrGroup[], filters: ItemFilters }>()

type ModState = 'any' | 'has' | 'not'
const STATES: ModState[] = ['any', 'has', 'not']
const STATE_LABEL: Record<ModState, string> = { any: 'Any', has: 'Has', not: 'Not' }
function stateTitle (m: string, opt: ModState): string {
  if (m === VOID_TEXT) {
    return opt === 'any' ? 'Trade search finds Valdo maps with or without the Void mod'
      : opt === 'has' ? 'Trade search finds only Valdo maps that send you to the Void'
        : 'Trade search finds only Valdo maps without the Void mod'
  }
  return opt === 'any' ? 'Show listings with or without this mod'
    : opt === 'has' ? 'Show only the loaded listings with this mod (this price check only)'
      : 'Hide the loaded listings with this mod. Remembered on your Map mods profile'
}

// The one Void filter on every Valdo map (pseudo/maps.ts valdoBadMods).
const voidFilter = computed(() => props.stats.find((s): s is StatFilter => !s.group && !!s.valdoVoid) ?? null)
const voidState = computed<ModState>(() => {
  const f = voidFilter.value
  return !f || f.disabled ? 'any' : f.not ? 'not' : 'has'
})
function setVoid (state: ModState) {
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
watch(() => props.item, () => { picking.value = false; query.value = ''; valdoNeed.value = new Set(); added.value = []; addQuery.value = ''; fromLookup() })
// Opened from Search ("valdo headhunter"): a made-up map with no Void mod, so
// any map with the reward, Void or not, until you pick.
function fromLookup () {
  if (takeLookupAsk() && !props.item.newMods.length) setVoid('any')
}
fromLookup()
onBeforeUnmount(() => { valdoNeed.value = new Set() })

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

// The map's mods as the game lists them, Void first.
const open = useFold('valdo-list', true)
const mods = computed(() => {
  const known = props.item.statsByType
    .filter(c => c.type === ModifierType.Explicit)
    .map(c => c.sources[0]?.stat.translation.string ?? c.stat.ref)
  const unknown = props.item.unknownModifiers
    .filter(m => m.type === ModifierType.Explicit)
    .map(m => m.text.endsWith(_$.UNSCALABLE_VALUE) ? m.text.slice(0, -_$.UNSCALABLE_VALUE.length) : m.text)
  // A minions line is the second line of the player mod above it: one row, one Skip.
  const all: string[] = []
  for (const line of [...known, ...unknown]) {
    if (line.startsWith("Players' Minions ") && all.length && all[all.length - 1].startsWith('Players ')) all[all.length - 1] += `\n${line}`
    else all.push(line)
  }
  // A map without the Void mod still has its Void filter (No void to start).
  if (voidFilter.value && !all.includes(VOID_TEXT)) all.push(VOID_TEXT)
  return all.sort((a, b) => Number(b === VOID_TEXT) - Number(a === VOID_TEXT))
})
// The Void line stays up when the list is folded: it's part of the search.
const hasVoid = computed(() => props.item.statsByType.some(c => c.stat.ref === VOID_TEXT))
// Rows for mods not on this map: ones added here, and the template's Not mods
// that Valdo maps have (a Not from a normal map mod that no Valdo map has met stays quiet).
const added = ref<string[]>([])
const config = computed(() => valdoConfig())
const seenKeys = computed(() => new Set((config.value?.valdoSeen ?? []).map(skipKey)))
const mapKeys = computed(() => new Set(mods.value.map(m => skipKey(m))))
const onMap = (m: string) => mapKeys.value.has(skipKey(m))
const extra = computed(() => {
  const out: string[] = []
  const keys = new Set(mapKeys.value)
  const push = (label: string) => {
    const k = skipKey(label)
    if (keys.has(k)) return
    keys.add(k)
    out.push(label)
  }
  for (const m of added.value) push(m)
  for (const s of skips.value) if (!s.auto || seenKeys.value.has(s.key)) push(s.label)
  return out
})
const rows = computed(() => [...mods.value, ...extra.value])
const shown = computed(() => open.value ? rows.value : rows.value.filter(m => m === VOID_TEXT))

// Add a mod: the mods met so far that aren't listed, by the text typed.
const addQuery = ref('')
const addMatches = computed(() => {
  const q = addQuery.value.trim().toLowerCase()
  if (!q) return []
  const listed = new Set(rows.value.map(m => skipKey(m)))
  return (config.value?.valdoSeen ?? []).filter(m => !listed.has(skipKey(m)) && m.toLowerCase().includes(q)).slice(0, 8)
})
function addMod (m: string) {
  if (!rows.value.some(r => skipKey(r) === skipKey(m))) added.value = [...added.value, m]
  addQuery.value = ''
}
function addFirst () {
  if (addMatches.value.length) addMod(addMatches.value[0])
  else if (addQuery.value.trim()) addMod(addQuery.value.trim())
}

// The mods met: this map's, and the loaded listings'.
// The config too: Map mods is set up on the first Not, after the listings loaded.
watch([mods, valdoListingMods, valdoConfig], ([own, listed, w]) => {
  if (w) rememberSeen(w, [...own, ...listed])
}, { immediate: true })

function pickProfile (id: string) {
  const w = ensureMapModsConfig()
  if (w) w.activeProfile = Number(id)
}
const savedNote = ref('')
let savedTimer: ReturnType<typeof setTimeout> | undefined
function flashSaved (name: string) {
  savedNote.value = `Saved to ${name}`
  clearTimeout(savedTimer)
  savedTimer = setTimeout(() => { savedNote.value = '' }, 2500)
}
onBeforeUnmount(() => clearTimeout(savedTimer))

// Not lives on the active Map mods profile: one list per build.
const profile = computed(() => valdoProfile())
const skips = computed<SkipEntry[]>(() => profile.value ? profileSkips(profile.value) : [])
// Skipping works while the Map mods module is on (the first Not sets it up).
const canSkip = computed(() => isModuleOn(AppConfig(), 'map-mods'))
// The template's rating of a mod: Bad (can't run) also sets it Not, as the
// Map mods window's "can't run" does. Keyed as the Map mods table keys it
// when it has the mod, else by the mod's text with numbers as "#".
const RATE_WORD: Record<ModRating, string> = { deadly: 'Bad', warn: 'Care', good: 'Want', ok: '–' }
const RATE_TITLE: Record<ModRating, string> = { deadly: "Bad: can't run, so set Not", warn: 'Care: risky', good: 'Want', ok: 'Not rated' }
function ratingKey (ratings: Record<string, ModRating>, m: string): string | undefined {
  const key = skipKey(m)
  return Object.keys(ratings).find(k => skipKey(k) === key)
}
function ratingOf (m: string): ModRating {
  const r = profile.value?.ratings ?? {}
  const k = ratingKey(r, m)
  return k ? r[k] : 'ok'
}
function rateTitle (m: string): string {
  const name = profile.value?.name
  return `${RATE_TITLE[ratingOf(m)]}. Click for the next: Bad, Care, Want, none${name ? `; saved to ${name}` : ''}.`
}
function rate (m: string) {
  const w = ensureMapModsConfig()
  if (!w) return
  const p = activeProfile(w)
  const next = nextModRating(ratingOf(m))
  const key = ratingKey(p.ratings, m) ?? skipLabel(m)
  p.ratings = withRating(p.ratings, [key], next)
  // A Bad mod is skipped even if it was set Any before.
  if (next === 'deadly' && !isSkipped(p, m)) setSkipped(p, m, true)
  // Kept on the list for this check once touched.
  if (!onMap(m) && !added.value.includes(m)) added.value = [...added.value, m]
  flashSaved(p.name)
}
// As in the price check: clicking a row goes Has, Not, Any.
const NEXT_STATE: Record<ModState, ModState> = { any: 'has', has: 'not', not: 'any' }
const canCycle = (m: string) => m === VOID_TEXT ? !!voidFilter.value : canSkip.value
function cycleState (m: string) { setState(m, NEXT_STATE[stateOf(m)]) }

function stateOf (m: string): ModState {
  if (m === VOID_TEXT) return voidState.value
  // Has (this price check) wins over a saved Not, without changing the profile.
  if (valdoNeed.value.has(skipKey(m))) return 'has'
  return profile.value && isSkipped(profile.value, m) ? 'not' : 'any'
}
function setState (m: string, state: ModState) {
  if (m === VOID_TEXT) { setVoid(state); return }
  const key = skipKey(m)
  const need = new Set(valdoNeed.value)
  if (state === 'has') need.add(key)
  else need.delete(key)
  valdoNeed.value = need
  // A row from the profile stays for this check once touched, so Any on it
  // doesn't take it away under the cursor.
  if (!onMap(m) && !added.value.includes(m)) added.value = [...added.value, m]
  // Has leaves the saved Not list alone; Not adds to it, Any takes it off.
  if (state === 'has') return
  const w = ensureMapModsConfig()
  if (!w) return
  const p = activeProfile(w)
  if (isSkipped(p, m) !== (state === 'not')) {
    setSkipped(p, m, state === 'not')
    flashSaved(p.name)
  }
}

// The top line: what's set beyond Any, and what it hid.
const headline = computed(() => {
  const not = rows.value.filter(m => m !== VOID_TEXT && stateOf(m) === 'not').length
  const has = rows.value.filter(m => m !== VOID_TEXT && stateOf(m) === 'has').length
  const h = valdoHidden.value
  return [
    not ? `${not} Not` : '',
    has ? `${has} Has` : '',
    h && h.hidden ? `${h.hidden} of ${h.loaded} listings hidden` : ''
  ].filter(Boolean).join(' · ')
})
</script>

<style module>
/* As the map strip's (MapModStrip.vue), so the two read as one design. */
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
.headline { font-weight: 500; min-width: 0; text-align: right; font-size: var(--w-fs-sm); }
.line { display: flex; align-items: center; gap: 8px; min-width: 0; }
.label { flex: none; width: 52px; }
.tool {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--w-fs-sm);
  padding: 0 8px;
  border-radius: var(--w-r-sm);
  border: 1px solid var(--w-line-strong);
  background: var(--w-panel-2);
  color: var(--w-dim);
}
.tool:hover { color: var(--w-fg); }
.toolOn { color: var(--w-fg); border-color: var(--w-accent); }
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
.list { display: flex; flex-direction: column; gap: 2px; padding-top: 4px; border-top: 1px solid var(--w-line); }
.mod { display: flex; align-items: center; gap: 6px; font-size: var(--w-fs-sm); padding: 1px 2px; border-radius: var(--w-r-sm); }
.mod[title] { cursor: pointer; }
.mod[title]:hover { background: var(--w-chip-ground); }
.rateChip { flex: none; width: 3.4em; padding: 0 2px; text-align: center; font-size: var(--w-fs-xs); line-height: 1.5;
  border: 1px solid transparent; border-radius: var(--w-r-sm); color: var(--w-dim); cursor: pointer; }
.rateGap { flex: none; width: 3.4em; }
.rateChip:hover { border-color: var(--w-line-strong); color: var(--w-fg); }
.rate_deadly { color: var(--w-down); border-color: color-mix(in srgb, var(--w-down) 55%, transparent); background: color-mix(in srgb, var(--w-down) 14%, transparent); }
.rate_warn { color: var(--w-warn); border-color: color-mix(in srgb, var(--w-warn) 55%, transparent); background: color-mix(in srgb, var(--w-warn) 14%, transparent); }
.rate_good { color: var(--w-up); border-color: color-mix(in srgb, var(--w-up) 55%, transparent); background: color-mix(in srgb, var(--w-up) 14%, transparent); }
.text { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.has .text { color: var(--w-up); }
.not .text { color: var(--w-down); text-decoration: line-through; text-decoration-color: color-mix(in srgb, var(--w-down) 50%, transparent); }
.seg { flex: none; display: inline-flex; border: 1px solid var(--w-line-strong); border-radius: var(--w-r-sm); overflow: hidden; }
.seg button { padding: 0 6px; font-size: var(--w-fs-xs); color: var(--w-dim); border-left: 1px solid var(--w-line); }
.seg button:first-child { border-left: 0; }
.seg button:hover { background: var(--w-chip-ground); }
.seg .on_any { background: var(--w-panel-2); color: var(--w-fg); }
.seg .on_has { background: color-mix(in srgb, var(--w-up) 28%, transparent); color: var(--w-fg); }
.seg .on_not { background: color-mix(in srgb, var(--w-down) 28%, transparent); color: var(--w-fg); }
.sub { flex: none; font-size: var(--w-fs-xs); color: var(--w-dim); border: 1px solid var(--w-line); padding: 0 4px; border-radius: var(--w-r-sm); }
.add { display: flex; flex-direction: column; gap: 2px; padding: 2px 0 0 13px; }
.addInput { font-size: var(--w-fs-sm); padding: 1px 6px; border: 1px dashed var(--w-line-strong); border-radius: var(--w-r-sm); background: transparent; color: var(--w-fg); font-style: italic; }
.addInput:focus { font-style: normal; border-style: solid; }
.also { padding: 2px 0 0 13px; color: var(--w-dim); font-size: var(--w-fs-xs); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
