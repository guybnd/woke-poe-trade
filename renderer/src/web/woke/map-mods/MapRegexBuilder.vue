<template>
  <WPanel :title="config.wmTitle || 'Map mods'" :icon="panelIcon" width="44rem" max-height="85vh">
    <template #actions>
      <WSelect :model-value="String(config.activeProfile)" :options="profileOptions"
        @update:model-value="config.activeProfile = Number($event)" title="Build profile" />
      <WSegmented :model-value="tabOptions.highlight" :options="HIGHLIGHT_OPTIONS"
        @update:model-value="setSearchOption(profile, mode, { highlight: $event as 'good' | 'bad' })" />
      <slot name="actions" />
    </template>
    <template #tabs>
      <WTabs v-model="mode" :options="modeOptions" />
    </template>
    <template #toolbar>
      <div class="flex items-center gap-2 w-full">
        <span class="flex-1" />
        <WChip clickable :active="tabOptions.autoTrim" @click="setSearchOption(profile, mode, { autoTrim: !tabOptions.autoTrim })"
          title="When the search is too long, leave out wanted mods first, then avoided mods that aren't in a Quick preset, longest first">
          <i class="fas fa-cut" /> Auto-trim to fit
        </WChip>
        <WToggle v-if="mode === 'maps'" :model-value="!profile.hideT17" @update:model-value="profile.hideT17 = !$event">Include T17 mods</WToggle>
      </div>
      <div :class="$style.regexBar">
        <code :class="$style.regex" :title="regex.text">{{ regex.text || (mode === 'maps' ? 'Pick mods or minimums below' : 'Pick mods below') }}</code>
        <span class="w-num text-xs" :class="regex.tooLong ? 'w-down' : 'w-up'">{{ regex.length }}/{{ MAX_SEARCH_LENGTH }}</span>
        <WButton size="sm" variant="primary" :icon="copied ? 'fas fa-check' : 'far fa-copy'" :disabled="!regex.text" @click="copy">Copy</WButton>
        <WButton size="sm" icon="fas fa-search" :disabled="!regex.text" @click="paste" title="Type it into the open stash's search box">Stash</WButton>
        <WButton size="sm" variant="ghost" icon="far fa-bookmark" :disabled="!regex.text" @click="saveToLibrary" title="Keep this search in the Regex library">Save</WButton>
      </div>
      <div v-if="mode !== 'maps'" class="w-dim text-xs w-full">{{ MODE_HINT[mode] }}</div>
      <div v-if="regex.tooLong || regex.dropped.length" class="flex items-center gap-2 w-full text-xs">
        <span v-if="regex.tooLong" class="w-down">
          Too long by {{ regex.length - MAX_SEARCH_LENGTH }}. Biggest: {{ costliest }}
        </span>
        <span v-else-if="regex.dropped.length" class="w-warn" :title="regex.dropped.join('\n')">
          Left out {{ regex.dropped.length }} to fit: {{ regex.dropped.slice(0, 3).join(', ') }}{{ regex.dropped.length > 3 ? '…' : '' }}
        </span>
      </div>
      <div v-if="t17Kept" class="w-warn text-xs w-full">T17 picks are kept but left out of the search. Checking a T17 map still flags them.</div>
      <div v-if="regex.missing.length" class="w-warn text-xs w-full">No unique text found for: {{ regex.missing.join(', ') }}</div>
      <button v-if="mode === 'maps'" type="button" :class="$style.fold" :aria-expanded="quickOpen" @click="quickOpen = !quickOpen">
        <span class="w-dim">Quick presets</span>
        <span v-if="presetsOn" class="w-accent w-num">{{ presetsOn }} on</span>
        <i class="fas w-dim" :class="quickOpen ? 'fa-chevron-up' : 'fa-chevron-down'" />
      </button>
      <div v-if="mode === 'maps' && quickOpen" class="flex flex-wrap gap-1 w-full">
        <button v-for="p in presets" :key="p.preset.id" type="button"
          :class="[$style.preset, $style[p.rating]]" @click="cyclePreset(p.preset, p.rating)"
          :title="'Click: careful → can\'t run → off'">{{ p.preset.label }}</button>
      </div>
      <div class="flex items-center gap-2 w-full">
        <WField v-model="search" type="search" icon="fas fa-search" :placeholder="searchHint" class="flex-1" />
        <WSegmented v-model="filter" :options="filterOptions" title="Which mods to list" />
      </div>
    </template>
    <template v-for="row in visible" :key="row.kind === 'head' ? `head:${row.rating}` : row.matcher">
      <div v-if="row.kind === 'head'" :class="[$style.groupHead, $style[row.rating]]">{{ HEAD_LABEL[row.rating] }} · {{ row.count }}</div>
      <div v-else :class="$style.row">
        <span class="flex-1 min-w-0" :class="{ 'w-dim': !ratings[row.matcher] }">
          {{ row.matcher }}<span v-if="mode === 'maps' && t17.has(row.matcher)" :class="$style.t17">T17</span>
        </span>
        <span v-if="regex.tokens[row.matcher]" :class="$style.cost"
          :title="`Shortened to &quot;${regex.tokens[row.matcher]}&quot;, costs ${tokenCost(regex.tokens[row.matcher])} characters`">
          <code>{{ regex.tokens[row.matcher] }}</code> {{ tokenCost(regex.tokens[row.matcher]) }}
        </span>
        <span v-else-if="regex.dropped.includes(row.matcher)" class="w-warn text-xs" title="Left out by auto-trim">trimmed</span>
        <WSegmented :model-value="ratings[row.matcher] ?? 'ok'" :options="RATING_OPTIONS"
          @update:model-value="setRating(row.matcher, $event as ModRating)" />
      </div>
    </template>
    <WEmpty v-if="!visible.length" icon="fas fa-search">No mods match.</WEmpty>
    <div v-if="hiddenCount" class="w-dim text-xs p-2 text-center">{{ hiddenCount }} more. Search to narrow the list.</div>
    <template v-if="mode === 'maps'" #footer>
      <div class="flex flex-col gap-2 w-full">
      <button type="button" :class="$style.fold" :aria-expanded="minsOpen" @click="minsOpen = !minsOpen">
        <span class="w-dim">Minimums</span>
        <span class="w-num" :class="minsSet ? 'w-accent' : 'w-dim'">{{ minsSet ? `${minsSet} set` : 'none set' }}</span>
        <i class="fas w-dim" :class="minsOpen ? 'fa-chevron-down' : 'fa-chevron-up'" />
      </button>
      <div v-if="minsOpen" class="flex items-center gap-2 text-xs w-full">
        <span class="w-dim">A map needs</span>
        <WSegmented :model-value="profile.minsAny ? 'any' : 'all'" :options="MINS_MODE_OPTIONS"
          @update:model-value="profile.minsAny = $event === 'any'" />
        <span class="w-dim">of these minimums</span>
      </div>
      <div v-if="minsOpen" :class="$style.mins">
        <label v-for="key in MIN_KEYS" :key="key" class="flex flex-col gap-1">
          <span class="w-dim">Min {{ MIN_LABELS[key].toLowerCase() }}</span>
          <WField type="number" :model-value="profile.mins[key] ?? ''" placeholder="any" suffix="%"
            @update:model-value="setMin(key, $event)" />
        </label>
      </div>
      </div>
    </template>
  </WPanel>
</template>

<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { MainProcess } from '@/web/background/IPC'
import { pushHostConfig } from '@/web/Config'
import { WPanel, WButton, WChip, WField, WSegmented, WSelect, WTabs, WToggle, WEmpty, toast } from '../ui'
import { useCopy } from '../ui/copy'
import { SAVE_MESSAGE, saveToRegexLibrary } from '../regex-library/save'
import { PRESETS, applyPreset, modListRows, modRatings, nextPresetRating, presetRating, searchOptions, setModRatings, setSearchOption, withRating } from './rules'
import type { MapModPreset, ModMode, ModRating } from './rules'
import { MAX_SEARCH_LENGTH, MIN_LABELS, tokenCost } from './regex'
import type { MinStat } from './regex'
import { modsForMode, profileRegex, tier17Mods } from './data'
import { activeProfile } from './widget'
import type { MapModsWidget } from './widget'
import { moduleIcon } from '../ui/game-icons'
// The header shows the module's own art, the same as the dock and tab bar.
const panelIcon = moduleIcon('map-mods').art ?? 'map'

const props = defineProps<{ config: MapModsWidget }>()

const RATING_OPTIONS = [
  { value: 'deadly', label: 'avoid' },
  { value: 'warn', label: 'careful' },
  { value: 'ok', label: '–' },
  { value: 'good', label: 'want' }
]
const HIGHLIGHT_OPTIONS = [
  { value: 'good', label: 'Highlight good' },
  { value: 'bad', label: 'Highlight bad' }
]
const MINS_MODE_OPTIONS = [
  { value: 'all', label: 'all' },
  { value: 'any', label: 'any one' }
]
const MIN_KEYS: MinStat[] = ['quantity', 'rarity', 'packSize', 'quality', 'currency', 'scarabs', 'maps', 'divCards']
const MAX_ROWS = 200
const MODE_HINT: Record<string, string> = {
  heist: 'These picks also set the verdict when you check a contract or blueprint.',
  charts: 'These picks also set the verdict when you check a chart.'
}
const MODE_NOUN: Record<ModMode, string> = { maps: 'map', heist: 'heist', charts: 'chart' }
const LIBRARY_NAME: Record<ModMode, string> = { maps: 'Maps', heist: 'Heist', charts: 'Charts' }
const HEAD_LABEL: Record<ModRating, string> = { deadly: 'Avoid', warn: 'Careful', good: 'Want', ok: 'Not rated' }

const profile = computed(() => activeProfile(props.config))
const profileOptions = computed(() => props.config.profiles.map(p => ({ value: String(p.id), label: p.name || 'Unnamed' })))
const quickOpen = shallowRef(false)
const minsOpen = shallowRef(false)
const presetsOn = computed(() => presets.value.filter(p => p.rating !== 'ok').length)
const minsSet = computed(() => MIN_KEYS.filter(k => (profile.value.mins[k] ?? 0) > 0).length)
const presets = computed(() => PRESETS
  .filter(preset => !(profile.value.hideT17 && preset.id === 't17-killers'))
  .map(preset => ({ preset, rating: presetRating(profile.value, preset) })))

const search = shallowRef('')
const filter = shallowRef('all')
const mode = shallowRef<ModMode>('maps')

// Mods the player hurts themselves with vs. mods that add monsters/rewards.
function isDanger (m: string) {
  return /^(Monsters|Players|Rare Monsters|Unique Boss|Monster |Buffs on Players|Auras)/.test(m) &&
    !/(more Quantity|Pack size|Rarity of Items)/i.test(m)
}

const t17 = computed(() => tier17Mods())
const ratings = computed(() => modRatings(profile.value, mode.value))
const tabOptions = computed(() => searchOptions(profile.value, mode.value))
const modeMods = computed(() => modsForMode(mode.value, profile.value))
const searchHint = computed(() => `Search ${modeMods.value.length} ${MODE_NOUN[mode.value]} mods`)

const modeOptions = computed(() => ([['maps', 'Maps'], ['heist', 'Heist'], ['charts', 'Charts']] as Array<[ModMode, string]>).map(([value, label]) => ({
  value,
  label,
  count: modsForMode(value, profile.value).filter(m => modRatings(profile.value, value)[m]).length
})))

const filterOptions = computed(() => [
  { value: 'all', label: 'All' },
  { value: 'picked', label: `Picked ${modeMods.value.filter(m => ratings.value[m]).length}` },
  ...(mode.value === 'maps' ? [{ value: 'danger', label: 'Danger' }, { value: 'reward', label: 'Reward' }] : [])
])

const t17Kept = computed(() => mode.value === 'maps' && !!profile.value.hideT17 &&
  Object.keys(profile.value.ratings).some(m => t17.value.has(m)))

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return modeMods.value.filter(m => {
    if (q && !m.toLowerCase().includes(q)) return false
    if (filter.value === 'picked') return ratings.value[m] != null
    if (filter.value === 'danger') return isDanger(m)
    if (filter.value === 'reward') return !isDanger(m)
    return true
  })
})

// Picked mods go on top. The order refreshes when the view or search changes or
// a Quick chip is used, not on a single rating, so a row doesn't jump away from
// the cursor while it's being rated.
const orderBy = shallowRef(ratings.value)
watch(mode, () => {
  filter.value = 'all'
  search.value = ''
})
watch([mode, filter, search, () => profile.value.hideT17, () => props.config.activeProfile, () => props.config.wmWants], () => {
  orderBy.value = ratings.value
})
const rows = computed(() => modListRows(filtered.value, orderBy.value))
const visible = computed(() => rows.value.slice(0, MAX_ROWS))
const hiddenCount = computed(() => rows.value.slice(MAX_ROWS).filter(row => row.kind === 'mod').length)

const mapRegex = computed(() => profileRegex(profile.value))
const regex = computed(() => mode.value === 'maps' ? mapRegex.value : profileRegex(profile.value, mode.value))

// The three picked mods that cost the most characters.
const costliest = computed(() => Object.entries(regex.value.tokens)
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 3)
  .map(([m, t]) => `${m.replace(/#/g, 'N')} (${tokenCost(t)})`)
  .join(', '))

// Keep the stored text in sync so the paste hotkey uses the latest map regex.
let pushTimer: ReturnType<typeof setTimeout> | undefined
watch(() => mapRegex.value.text, (text) => {
  if (props.config.regexText === text) return
  props.config.regexText = text
  if (!props.config.regexHotkey) return
  clearTimeout(pushTimer)
  pushTimer = setTimeout(() => { pushHostConfig() }, 600)
}, { immediate: true })

function setRating (matcher: string, rating: ModRating) {
  setModRatings(profile.value, mode.value, withRating(ratings.value, [matcher], rating))
}

function cyclePreset (preset: MapModPreset, current: ModRating) {
  applyPreset(profile.value, preset, nextPresetRating(current))
  orderBy.value = ratings.value
}

function setMin (key: MinStat, value: string | number) {
  const n = Number(value)
  profile.value.mins = { ...profile.value.mins, [key]: n > 0 ? Math.min(999, Math.floor(n)) : undefined }
}

const { copied, copy: copyText } = useCopy(1200)
async function copy () {
  await copyText(regex.value.text)
}

function saveToLibrary () {
  const library = LIBRARY_NAME[mode.value]
  const res = saveToRegexLibrary({ name: `${library}: ${profile.value.name}`, text: regex.value.text, category: library })
  toast(SAVE_MESSAGE[res])
}

function paste () {
  MainProcess.sendEvent({
    name: 'CLIENT->MAIN::user-action',
    payload: { action: 'stash-search', text: regex.value.text }
  })
}
</script>

<style module>
.regexBar {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 8px;
  border-radius: var(--w-r-sm);
  background: var(--w-panel-2);
  border: 1px solid var(--w-line);
}
.regex {
  flex: 1;
  min-width: 0;
  font-family: var(--w-mono);
  font-size: var(--w-fs-md);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.preset {
  font-size: var(--w-fs-sm);
  padding: 1px 8px;
  border-radius: var(--w-r-pill);
  border: 1px solid var(--w-line);
  background: var(--w-panel-2);
  color: var(--w-dim);
}
.preset:hover { color: var(--w-fg); }
.preset.warn {
  color: var(--w-warn);
  border-color: color-mix(in srgb, var(--w-warn) 45%, transparent);
  background: color-mix(in srgb, var(--w-warn) 12%, transparent);
}
.preset.deadly {
  color: var(--w-down);
  border-color: color-mix(in srgb, var(--w-down) 50%, transparent);
  background: color-mix(in srgb, var(--w-down) 14%, transparent);
}
.groupHead {
  padding: 6px var(--w-pad) 3px;
  font-size: var(--w-fs-xs);
  font-weight: 600;
  color: var(--w-dim);
}
.groupHead.deadly { color: var(--w-down); }
.groupHead.warn { color: var(--w-warn); }
.groupHead.good { color: var(--w-up); }
.row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px var(--w-pad);
  font-size: var(--w-fs-md);
  /* Up to 200 rows, ~30 on screen: the browser skips laying out and
     painting the rest until they scroll into view. */
  content-visibility: auto;
  contain-intrinsic-size: auto 30px;
}
.row:nth-child(odd) { background: var(--w-panel-2); }
.cost {
  font-size: var(--w-fs-xs);
  color: var(--w-dim);
  white-space: nowrap;
  font-family: var(--w-num);
}
.t17 {
  margin-left: 6px;
  font-size: var(--w-fs-xs);
  padding: 0 4px;
  border-radius: var(--w-r-sm);
  color: var(--w-warn);
  border: 1px solid color-mix(in srgb, var(--w-warn) 45%, transparent);
}
.fold {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--w-fs-sm);
  cursor: pointer;
}
.mins {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px 10px;
  width: 100%;
  padding: 4px 0;
}
</style>
