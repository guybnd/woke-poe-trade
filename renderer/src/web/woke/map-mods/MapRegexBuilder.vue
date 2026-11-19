<template>
  <WPanel :title="config.wmTitle || 'Map mods'" :icon="panelIcon" width="60rem" max-height="85vh" :scroll="false" fill>
    <template #actions>
      <span class="w-dim text-xs">Build</span>
      <WSelect :model-value="String(config.activeProfile)" :options="profileOptions"
        @update:model-value="config.activeProfile = Number($event)" title="Build profile" />
    </template>
    <template #tabs>
      <WTabs v-model="mode" :options="modeOptions" />
    </template>
    <div :class="$style.split">
      <!-- Left: find and rate mods. -->
      <div :class="$style.left">
        <div :class="$style.tools">
          <div class="flex items-center gap-2 w-full">
            <WField v-model="search" type="search" icon="fas fa-search" :placeholder="searchHint" class="flex-1" />
            <WSegmented v-model="filter" :options="filterOptions" title="Which mods to list" />
          </div>
          <div v-if="mode === 'maps'" class="flex items-start gap-2 w-full">
            <div class="flex items-center gap-1 flex-wrap flex-1 min-w-0">
              <button type="button" :class="$style.fold" :aria-expanded="presetsOpen" title="Groups of mods rated together"
                @click="presetsOpen = !presetsOpen">
                Presets <i class="fas" :class="presetsOpen ? 'fa-chevron-up' : 'fa-chevron-down'" />
              </button>
              <button v-for="p in shownPresets" :key="p.preset.id" type="button"
                :class="[$style.preset, $style[p.rating]]" @click="cyclePreset(p.preset, p.rating)"
                title="Click: careful → avoid → off">{{ p.preset.label }}</button>
              <button v-if="!presetsOpen && presets.length > shownPresets.length" type="button" :class="$style.preset"
                @click="presetsOpen = true">+{{ presets.length - shownPresets.length }}</button>
            </div>
            <WToggle :model-value="!profile.hideT17" @update:model-value="profile.hideT17 = !$event">T17 mods</WToggle>
          </div>
          <div v-else class="w-dim text-xs w-full">{{ MODE_HINT[mode] }}</div>
          <div v-if="t17Kept" class="w-warn text-xs w-full">T17 picks are kept but left out of the search. Checking a T17 map still flags them.</div>
        </div>
        <div :class="$style.list" class="w-scroll">
          <template v-for="row in visible" :key="row.kind === 'head' ? `head:${row.rating}` : row.matcher">
            <div v-if="row.kind === 'head'" :class="[$style.groupHead, $style[row.rating]]">{{ HEAD_LABEL[row.rating] }} · {{ row.count }}</div>
            <div v-else :class="$style.row">
              <span class="flex-1 min-w-0" :class="{ 'w-dim': !ratings[row.matcher] }">
                {{ row.matcher }}<span v-if="mode === 'maps' && t17.has(row.matcher)" :class="$style.t17">T17</span>
              </span>
              <span v-if="regex.tokens[row.matcher]" :class="$style.cost"
                :title="`Searched as &quot;${regex.tokens[row.matcher]}&quot;, ${tokenCost(regex.tokens[row.matcher])} characters`">{{ regex.tokens[row.matcher] }}</span>
              <span v-else-if="regex.dropped.includes(row.matcher)" class="w-warn text-xs" title="Left out to fit the search">trimmed</span>
              <span :class="$style.rate" role="group" :aria-label="`Rate: ${row.matcher}`">
                <button v-for="r in RATE_BUTTONS" :key="r.value" type="button"
                  :class="[$style.rateBtn, $style[r.value]]" :aria-label="r.label"
                  :aria-pressed="ratings[row.matcher] === r.value"
                  :title="ratings[row.matcher] === r.value ? `Rated ${r.label}. Click to clear` : r.tip"
                  @click="setRating(row.matcher, ratings[row.matcher] === r.value ? 'ok' : r.value)"><i :class="r.icon" /></button>
              </span>
            </div>
          </template>
          <WEmpty v-if="!visible.length" icon="fas fa-search">No mods match.</WEmpty>
          <div v-if="hiddenCount" class="w-dim text-xs p-2 text-center">{{ hiddenCount }} more. Search to narrow the list.</div>
        </div>
      </div>

      <!-- Right: what you want from a map, and the search you take into the game. -->
      <div :class="$style.right" class="w-scroll">
        <section v-if="mode === 'maps'" ref="rewardsEl" :class="[$style.pane, { [$style.flash]: flash }]" data-testid="map-rewards-table">
          <div class="flex items-baseline gap-2">
            <span class="w-group-label flex-1" style="padding: 0;">Rewards</span>
            <span class="w-dim text-xs">{{ minsSet ? `${minsSet} ${minsSet === 1 ? 'minimum' : 'minimums'} set` : 'no minimums' }}</span>
          </div>
          <table :class="$style.rw">
            <thead>
              <tr>
                <th>Stat</th>
                <th title="The stash search and the map check card want at least this much">Need at least</th>
                <th title="How much the stat counts toward the juice score">Juice</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="key in MIN_KEYS" :key="key">
                <td :class="{ 'w-dim': isQuiet(key) }">{{ MIN_LABELS[key] }}</td>
                <td>
                  <WField type="number" :model-value="profile.mins[key] ?? ''" placeholder="any" suffix="%"
                    :label="`Minimum ${MIN_LABELS[key].toLowerCase()}`" :class="$style.min"
                    @update:model-value="setMin(key, $event)" />
                </td>
                <td>
                  <span v-if="key === 'quality'" class="w-faint">–</span>
                  <span v-else :class="$style.pips" role="group" :aria-label="`${MIN_LABELS[key]} juice weight`"
                    :title="`Counts ${weightOf(key).toFixed(1)}× toward juice. Click the last lit square to lower it`">
                    <button v-for="n in PIPS" :key="n" type="button" :aria-label="`${n * PIP_STEP}×`"
                      :aria-pressed="pipsOf(key) >= n"
                      :class="[$style.pip, { [$style.on]: pipsOf(key) >= n }]"
                      @click="setPips(key, n)" />
                    <span class="w-num w-faint" :class="$style.weight">{{ weightOf(key).toFixed(1) }}</span>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
          <div class="flex items-center gap-2 text-xs">
            <span class="w-dim">A map needs</span>
            <WSegmented :model-value="profile.minsAny ? 'any' : 'all'" :options="MINS_MODE_OPTIONS"
              @update:model-value="profile.minsAny = $event === 'any'" />
            <span class="w-dim">minimums</span>
          </div>
        </section>

        <span class="flex-1" />

        <section :class="[$style.pane, $style.dock]">
          <span class="w-group-label" style="padding: 0;">Stash search</span>
          <div class="flex items-center gap-2 text-xs">
            <span class="w-dim">Lights up</span>
            <WSegmented :model-value="tabOptions.highlight" :options="HIGHLIGHT_OPTIONS"
              title="Which maps the search lights up in the stash"
              @update:model-value="setSearchOption(profile, mode, { highlight: $event as 'good' | 'bad' })" />
          </div>
          <code :class="[$style.regex, { 'w-dim': !regex.text }]" :title="regex.text">{{ regex.text || emptyText }}</code>
          <div :class="$style.meter">
            <span :class="$style.bar"><span :class="{ [$style.over]: regex.tooLong }" :style="{ width: meterWidth }" /></span>
            <span class="w-num" :class="regex.tooLong ? 'w-down' : 'w-dim'">{{ regex.length }} / {{ MAX_SEARCH_LENGTH }}</span>
          </div>
          <div v-if="regex.tooLong" class="w-down text-xs">Too long by {{ regex.length - MAX_SEARCH_LENGTH }}. Biggest: {{ costliest }}</div>
          <div v-else-if="regex.dropped.length" class="w-warn text-xs" :title="regex.dropped.join('\n')">
            Left out {{ regex.dropped.length }} to fit: {{ regex.dropped.slice(0, 3).join(', ') }}{{ regex.dropped.length > 3 ? '…' : '' }}
          </div>
          <div v-if="regex.missing.length" class="w-warn text-xs">No unique text found for: {{ regex.missing.join(', ') }}</div>

          <template v-if="naming">
            <form :class="$style.savebox" @submit.prevent="confirmSave">
              <span class="text-xs w-accent">{{ existingName ? 'Rename' : 'Save as' }}</span>
              <WField ref="nameField" v-model="saveName" :clear-on-esc="false" class="flex-1" label="Name in the Regex library" />
              <WButton size="sm" variant="primary" :disabled="!saveName.trim()" @click="confirmSave">{{ existingName ? 'Rename' : 'Save' }}</WButton>
              <WButton size="sm" variant="ghost" @click="naming = false">Cancel</WButton>
            </form>
            <div class="w-faint text-xs">
              <template v-if="existingName">Already saved as "{{ existingName }}".</template>
              <template v-else>Goes into the Regex library under {{ LIBRARY_NAME[mode] }}. Enter saves.</template>
            </div>
          </template>
          <div v-else class="flex items-center gap-2 flex-wrap">
            <WButton size="sm" variant="primary" :icon="copied ? 'fas fa-check' : 'far fa-copy'" :disabled="!regex.text" @click="copy">Copy</WButton>
            <WButton size="sm" icon="fas fa-search" :disabled="!regex.text" @click="paste" title="Type it into the open stash's search box">Paste in stash</WButton>
          </div>
          <div class="flex items-center gap-2">
            <WButton v-if="!naming" size="sm" variant="ghost" icon="far fa-bookmark" :disabled="!regex.text" @click="startSave" title="Keep this search in the Regex library">Save…</WButton>
            <span class="flex-1" />
            <WChip clickable :active="tabOptions.autoTrim" @click="setSearchOption(profile, mode, { autoTrim: !tabOptions.autoTrim })"
              title="When the search is too long, leave out wanted mods first, then avoided mods that aren't in a preset, longest first">
              <i class="fas fa-cut" /> Trim to fit
            </WChip>
          </div>
        </section>
      </div>
    </div>
  </WPanel>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, shallowRef, watch } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { useFold } from '../ui/fold'
import { MainProcess } from '@/web/background/IPC'
import { pushHostConfig } from '@/web/Config'
import { WPanel, WButton, WChip, WField, WSegmented, WSelect, WTabs, WToggle, WEmpty, toast } from '../ui'
import { useCopy } from '../ui/copy'
import { SAVE_MESSAGE, renameSavedRegex, saveToRegexLibrary, savedRegexName } from '../regex-library/save'
import { PRESETS, applyPreset, modListRows, modRatings, nextPresetRating, presetRating, searchOptions, setModRatings, setSearchOption, withRating } from './rules'
import type { JuiceWeights, MapModPreset, ModMode, ModRating } from './rules'
import { MAX_SEARCH_LENGTH, MIN_LABELS, tokenCost } from './regex'
import type { MinStat } from './regex'
import { modsForMode, profileRegex, tier17Mods } from './data'
import { activeProfile, rewardsAsk } from './widget'
import type { MapModsWidget } from './widget'
import { moduleIcon } from '../ui/game-icons'
// The header shows the module's own art, the same as the dock and tab bar.
const panelIcon = moduleIcon('map-mods').art ?? 'map'

const props = defineProps<{ config: MapModsWidget }>()

const RATE_BUTTONS: Array<{ value: ModRating, label: string, icon: string, tip: string }> = [
  { value: 'deadly', label: 'avoid', icon: 'fas fa-times', tip: "Avoid: your build can't run it" },
  { value: 'warn', label: 'careful', icon: 'fas fa-exclamation', tip: 'Careful: runnable, but watch out' },
  { value: 'good', label: 'want', icon: 'fas fa-check', tip: 'Want: adds to the juice score' }
]
const HIGHLIGHT_OPTIONS = [
  { value: 'good', label: 'Maps to run' },
  { value: 'bad', label: 'Maps to skip' }
]
const MINS_MODE_OPTIONS = [
  { value: 'all', label: 'all' },
  { value: 'any', label: 'any one' }
]
const MIN_KEYS: MinStat[] = ['quantity', 'rarity', 'packSize', 'currency', 'scarabs', 'maps', 'divCards', 'quality']
// Juice weight squares: each is half a point, four make the 2× maximum.
const PIP_STEP = 0.5
const PIPS = [1, 2, 3, 4]
const MAX_ROWS = 200
const MODE_HINT: Record<string, string> = {
  heist: 'These ratings also set the verdict when you check a contract or blueprint.',
  charts: 'These ratings also set the verdict when you check a chart.'
}
const MODE_NOUN: Record<ModMode, string> = { maps: 'map', heist: 'heist', charts: 'chart' }
const LIBRARY_NAME: Record<ModMode, string> = { maps: 'Maps', heist: 'Heist', charts: 'Charts' }
const HEAD_LABEL: Record<ModRating, string> = { deadly: 'Avoid', warn: 'Careful', good: 'Want', ok: 'Not rated' }

const profile = computed(() => activeProfile(props.config))
const profileOptions = computed(() => props.config.profiles.map(p => ({ value: String(p.id), label: p.name || 'Unnamed' })))
const minsSet = computed(() => MIN_KEYS.filter(k => (profile.value.mins[k] ?? 0) > 0).length)
const presets = computed(() => PRESETS
  .filter(preset => !(profile.value.hideT17 && preset.id === 't17-killers'))
  .map(preset => ({ preset, rating: presetRating(profile.value, preset) })))

// Folded, the presets row shows only the ones in use.
const presetsOpen = useFold('map-regex.quick')
const shownPresets = computed(() => presetsOpen.value ? presets.value : presets.value.filter(p => p.rating !== 'ok'))

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
  { value: 'picked', label: `Rated ${modeMods.value.filter(m => ratings.value[m]).length}` },
  ...(mode.value === 'maps' ? [{ value: 'danger', label: 'Danger' }, { value: 'reward', label: 'Rewards' }] : [])
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

// Rated mods go on top. The order refreshes when the view or search changes or
// a preset is used, not on a single rating, so a row doesn't jump away from
// the cursor while it's being rated.
const orderBy = shallowRef(ratings.value)
watch(mode, () => {
  filter.value = 'all'
  search.value = ''
  naming.value = false
})
watch([mode, filter, search, () => profile.value.hideT17, () => props.config.activeProfile, () => props.config.wmWants], () => {
  orderBy.value = ratings.value
})
const rows = computed(() => modListRows(filtered.value, orderBy.value))
const visible = computed(() => rows.value.slice(0, MAX_ROWS))
const hiddenCount = computed(() => rows.value.slice(MAX_ROWS).filter(row => row.kind === 'mod').length)

const mapRegex = computed(() => profileRegex(profile.value))
const regex = computed(() => mode.value === 'maps' ? mapRegex.value : profileRegex(profile.value, mode.value))
const emptyText = computed(() => mode.value === 'maps' ? 'Rate mods or set a minimum' : 'Rate mods to build a search')
const meterWidth = computed(() => `${Math.min(100, regex.value.length / MAX_SEARCH_LENGTH * 100)}%`)

// The three rated mods that cost the most characters.
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

// Quality has no juice weight.
type WeightKey = keyof JuiceWeights
function weightOf (key: MinStat): number {
  return key === 'quality' ? 0 : props.config.weights[key as WeightKey] ?? 0
}
function pipsOf (key: MinStat): number {
  return Math.round(weightOf(key) / PIP_STEP)
}
// Clicking the last lit square lowers it by one; any other square sets the weight there.
function setPips (key: MinStat, n: number) {
  if (key === 'quality') return
  const next = pipsOf(key) === n ? n - 1 : n
  props.config.weights = { ...props.config.weights, [key]: next * PIP_STEP }
}
function isQuiet (key: MinStat): boolean {
  return !weightOf(key) && !(profile.value.mins[key] ?? 0)
}

// "Edit rewards" on the map check card: show the Rewards table.
const rewardsEl = shallowRef<HTMLElement | null>(null)
const flash = shallowRef(false)
let flashTimer: ReturnType<typeof setTimeout> | undefined
watch(rewardsAsk, async () => {
  mode.value = 'maps'
  await nextTick()
  rewardsEl.value?.scrollIntoView({ block: 'nearest' })
  flash.value = true
  clearTimeout(flashTimer)
  flashTimer = setTimeout(() => { flash.value = false }, 1200)
})
onBeforeUnmount(() => {
  clearTimeout(flashTimer)
  clearTimeout(pushTimer)
})

const { copied, copy: copyText } = useCopy(1200)
async function copy () {
  await copyText(regex.value.text)
}

// Save asks for a name first. A string that's already saved offers to rename it.
const naming = shallowRef(false)
const saveName = shallowRef('')
const existingName = shallowRef<string | null>(null)
const nameField = shallowRef<ComponentPublicInstance | null>(null)
async function startSave () {
  if (!regex.value.text) return
  existingName.value = savedRegexName(regex.value.text)
  saveName.value = existingName.value ?? `${LIBRARY_NAME[mode.value]}: ${profile.value.name || 'Unnamed'}`
  naming.value = true
  await nextTick()
  const input = (nameField.value?.$el as HTMLElement | undefined)?.querySelector('input')
  input?.focus()
  input?.select()
}
function confirmSave () {
  const name = saveName.value.trim()
  if (!name || !regex.value.text) return
  if (existingName.value != null) {
    toast(renameSavedRegex(regex.value.text, name) ? `Renamed to "${name}"` : SAVE_MESSAGE['module-off'])
  } else {
    const library = LIBRARY_NAME[mode.value]
    toast(SAVE_MESSAGE[saveToRegexLibrary({ name, text: regex.value.text, category: library })])
  }
  naming.value = false
}
// A changed search is a different string: start over.
watch(() => regex.value.text, () => { naming.value = false })

function paste () {
  MainProcess.sendEvent({
    name: 'CLIENT->MAIN::user-action',
    payload: { action: 'stash-search', text: regex.value.text }
  })
}
</script>

<style module>
.split {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 21rem;
  flex: 1;
  min-height: 0;
}
.left {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  border-right: 1px solid var(--w-line);
}
.tools {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px var(--w-pad);
  border-bottom: 1px solid var(--w-line);
}
.list { flex: 1; min-height: 0; }
.right {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  background: var(--w-panel-2);
}
.pane {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 10px var(--w-pad);
  transition: background 0.6s;
}
.pane:first-child:not(.dock) { border-bottom: 1px solid var(--w-line); }
.flash { background: var(--w-accent-soft); }
.dock { border-top: 1px solid var(--w-line); }
.rw { width: 100%; border-collapse: collapse; font-size: var(--w-fs-sm); }
.rw th {
  text-align: left;
  font-weight: 500;
  font-size: var(--w-fs-xs);
  color: var(--w-dim);
  padding: 2px 4px;
  white-space: nowrap;
}
.rw td { padding: 3px 4px; border-top: 1px solid var(--w-line-soft); white-space: nowrap; }
.min { width: 5rem; }
.pips { display: inline-flex; gap: 3px; }
.pip {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  border: 1px solid var(--w-line-strong);
  background: var(--w-panel-3);
}
.weight { margin-left: 4px; font-size: var(--w-fs-xs); }
.pip:hover { border-color: var(--w-accent); }
.pip.on { background: var(--w-accent); border-color: var(--w-accent); }
.regex {
  font-family: var(--w-mono);
  font-size: var(--w-fs-sm);
  padding: 6px 8px;
  border-radius: var(--w-r-sm);
  background: var(--w-panel);
  border: 1px solid var(--w-line);
  overflow-wrap: anywhere;
  max-height: 6.5em;
  overflow: auto;
  user-select: text;
}
.meter { display: flex; align-items: center; gap: 8px; font-size: var(--w-fs-xs); }
.bar { flex: 1; height: 4px; border-radius: 2px; background: var(--w-panel-3); overflow: hidden; }
.bar > span { display: block; height: 100%; background: var(--w-up); }
.bar > span.over { background: var(--w-down); }
.fold {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: var(--w-fs-xs);
  color: var(--w-dim);
  margin-right: 2px;
}
.fold:hover { color: var(--w-fg); }
.fold i { font-size: 0.8em; }
.savebox {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 6px;
  border-radius: var(--w-r-sm);
  border: 1px solid var(--w-accent);
  background: var(--w-accent-soft);
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
  border-bottom: 1px solid var(--w-line-soft);
  /* Up to 200 rows, ~30 on screen: the browser skips laying out and
     painting the rest until they scroll into view. */
  content-visibility: auto;
  contain-intrinsic-size: auto 30px;
}
.cost {
  font-size: var(--w-fs-xs);
  color: var(--w-faint);
  white-space: nowrap;
  font-family: var(--w-mono);
}
.rate { display: inline-flex; gap: 3px; flex: none; }
.rateBtn {
  width: 24px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--w-r-sm);
  border: 1px solid var(--w-line);
  background: var(--w-panel-2);
  color: var(--w-faint);
  font-size: var(--w-fs-xs);
}
.rateBtn:hover { color: var(--w-fg); border-color: var(--w-line-strong); }
.rateBtn.deadly[aria-pressed="true"] { background: var(--w-down); border-color: var(--w-down); color: var(--w-accent-fg); }
.rateBtn.warn[aria-pressed="true"] { background: var(--w-warn); border-color: var(--w-warn); color: var(--w-accent-fg); }
.rateBtn.good[aria-pressed="true"] { background: var(--w-up); border-color: var(--w-up); color: var(--w-accent-fg); }
.t17 {
  margin-left: 6px;
  font-size: var(--w-fs-xs);
  padding: 0 4px;
  border-radius: var(--w-r-sm);
  color: var(--w-warn);
  border: 1px solid color-mix(in srgb, var(--w-warn) 45%, transparent);
}
</style>
