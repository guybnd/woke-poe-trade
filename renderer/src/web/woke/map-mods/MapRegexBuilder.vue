<template>
  <WPanel :title="config.wmTitle || 'Map mods'" :icon="panelIcon" width="60rem" max-height="85vh" :scroll="false" fill>
    <template #actions>
      <span class="w-dim text-xs">Build</span>
      <WSelect :model-value="String(config.activeProfile)" :options="profileOptions"
        @update:model-value="config.activeProfile = Number($event)" title="Build profile" />
    </template>
    <template #tabs>
      <WTabs v-model="tab" :options="tabList" />
    </template>
    <!-- Scan: map scan's controls and every map it read (first window only). -->
    <div v-if="scanTab" :class="$style.scanTab" class="w-scroll">
      <MapScanBox :config="config" full />
    </div>
    <!-- Planner: pick a bonus, tick the T17 mods that give it, say how many a map needs. -->
    <MapPlanner v-else-if="plannerTab" :profile="profile" :ratings="mapRatings" />
    <div v-else :class="$style.split">
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
          <div v-if="mode === 'maps'" class="flex items-center gap-2 w-full text-xs" data-testid="map-mods-sort">
            <span class="w-dim">Sort</span>
            <WSelect :model-value="sortBy" :options="SORT_OPTIONS" title="Order the list by what each mod adds to a map"
              @update:model-value="sortBy = $event as SortKey" />
            <span class="flex-1" />
            <WButton v-if="wantable.length" size="sm" icon="fas fa-check" :title="WANT_ALL_TIP" @click="wantAll">
              Want all {{ wantable.length }} with {{ BONUS_LABEL[sortBy as BonusKey].toLowerCase() }}
            </WButton>
          </div>
          <div v-else class="w-dim text-xs w-full">{{ MODE_HINT[mode] }}</div>
          <div v-if="t17Kept" class="w-warn text-xs w-full">T17 picks are kept but left out of the search. Checking a T17 map still flags them.</div>
        </div>
        <div :class="$style.list" class="w-scroll">
          <template v-for="row in visible" :key="row.kind === 'head' ? `head:${row.rating}` : row.matcher">
            <div v-if="row.kind === 'head'" :class="[$style.groupHead, $style[row.rating]]">{{ HEAD_LABEL[row.rating] }} · {{ row.count }}</div>
            <div v-else :class="$style.row">
              <span class="flex-1 min-w-0" :class="{ 'w-dim': !ratings[row.matcher] }" :title="bonusRows[row.matcher]?.tip ?? row.matcher">
                {{ row.matcher }}<span v-if="mode === 'maps' && t17.has(row.matcher)" :class="$style.t17">T17</span>
              </span>
              <span v-if="bonusRows[row.matcher]" :class="$style.bonus" :title="bonusRows[row.matcher].tip">
                <span class="w-num">{{ bonusRows[row.matcher].b.d }}/{{ bonusRows[row.matcher].b.r }}/{{ bonusRows[row.matcher].b.p }}</span>
                <span v-for="x in bonusRows[row.matcher].b.more" :key="x.kind" :class="$style.more">{{ x.t17 ? 'T17 ' : '' }}+{{ x.pct }}% {{ MORE_LABEL[x.kind] }}</span>
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

      <!-- Right: the search you take into the game, then what you want from a map. -->
      <div :class="$style.right" class="w-scroll">
        <section :class="$style.pane" data-testid="map-stash-search">
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
              <span class="text-xs w-accent">{{ existingName ? 'Rename' : target ? 'Overwrite' : 'Save as' }}</span>
              <WField ref="nameField" v-model="saveName" :clear-on-esc="false" :class="$style.saveName" label="Name in the Regex library" />
              <button v-if="!existingName && saves.length" type="button" :class="$style.pickBtn" class="w-focusable"
                :aria-expanded="pickOpen" title="Pick a saved search to overwrite" aria-label="Saved searches"
                @click="pickOpen = !pickOpen"><i class="fas" :class="pickOpen ? 'fa-chevron-up' : 'fa-chevron-down'" /></button>
              <span :class="$style.saveBtns">
                <WButton size="sm" variant="primary" :disabled="!saveName.trim()" @click="confirmSave">{{ saveVerb }}</WButton>
                <WButton size="sm" variant="ghost" @click="naming = false">Cancel</WButton>
              </span>
            </form>
            <div v-if="pickOpen && saves.length" :class="$style.picks" class="w-scroll" role="listbox" aria-label="Saved searches to overwrite">
              <button v-for="(e, i) in saves" :key="i" type="button" role="option" :aria-selected="target === e"
                :class="[$style.pick, { [$style.picked]: target === e }]" class="w-focusable" :title="e.text" @click="pick(e)">
                <span class="w-trunc">{{ e.name }}</span>
                <code class="w-trunc w-faint">{{ e.text }}</code>
              </button>
            </div>
            <div class="w-faint text-xs">
              <template v-if="existingName">Already saved as "{{ existingName }}".</template>
              <template v-else-if="target">Replaces the search saved as "{{ target.name }}". Its notes and hotkey stay.</template>
              <template v-else-if="saves.length">Goes into the Regex library under {{ LIBRARY_NAME[mode] }}. The arrow picks a saved one to overwrite.</template>
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

        <section v-if="mode === 'maps'" ref="rewardsEl" :class="[$style.pane, { [$style.flash]: flash }]" data-testid="map-rewards-table">
          <div class="flex items-baseline gap-2">
            <span class="w-group-label flex-1" style="padding: 0;">Rewards</span>
            <WInfo :text="REWARDS_HELP" />
          </div>
          <div class="w-dim text-xs">What you want from a map. Minimums are ticked on the Alt+M card and filter the stash search for maps to run. Squares set how much a stat adds to the juice score.</div>
          <table :class="$style.rw">
            <thead>
              <tr>
                <th>Stat</th>
                <th title="Leave blank for no minimum">Map must have</th>
                <th><span class="inline-flex items-center gap-1">Juice score <WInfo :text="JUICE_HELP" /></span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="key in MIN_KEYS" :key="key">
                <td :class="{ 'w-dim': isQuiet(key) }">{{ MIN_LABELS[key] }}</td>
                <td>
                  <WField type="number" :model-value="profile.mins[key] ?? ''" placeholder="–" suffix="%"
                    :label="`Minimum ${MIN_LABELS[key].toLowerCase()}`" :class="$style.min"
                    @update:model-value="setMin(key, $event)" />
                </td>
                <td>
                  <span v-if="key === 'quality'" class="w-faint">–</span>
                  <span v-else :class="$style.pips" role="group" :aria-label="`${MIN_LABELS[key]} juice weight`"
                    :title="`Counts ${weightOf(key).toFixed(1)}× toward the juice score. Click the last lit square to lower it`">
                    <button v-for="n in PIPS" :key="n" type="button" :aria-label="`${n * PIP_STEP}×`"
                      :aria-pressed="pipsOf(key) >= n"
                      :class="[$style.pip, { [$style.on]: pipsOf(key) >= n }]"
                      @click="setPips(key, n)" />
                    <span class="w-faint" :class="$style.weight">{{ weightWord(key) }}</span>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
          <div class="flex items-center gap-2 text-xs">
            <span class="w-dim" :title="`${minsSet} ${minsSet === 1 ? 'minimum' : 'minimums'} set`">A map must meet</span>
            <WSegmented :model-value="profile.minsAny ? 'any' : 'all'" :options="MINS_MODE_OPTIONS"
              @update:model-value="profile.minsAny = $event === 'any'" />
            <span class="w-dim">minimum</span>
          </div>
        </section>
      </div>
    </div>
  </WPanel>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, shallowRef, watch } from 'vue'
import { useGoto } from '../tab-bar/goto'
import { GOTO_TARGETS } from '../tab-bar/goto-targets'
import type { ComponentPublicInstance } from 'vue'
import { useFold } from '../ui/fold'
import { MainProcess } from '@/web/background/IPC'
import { pushHostConfig } from '@/web/Config'
import { WPanel, WButton, WChip, WField, WInfo, WSegmented, WSelect, WTabs, WToggle, WEmpty, toast } from '../ui'
import { useCopy } from '../ui/copy'
import { SAVE_MESSAGE, renameSavedRegex, replaceSavedRegex, saveToRegexLibrary, savedRegexName } from '../regex-library/save'
import { regexesIn } from '../regex-library/folders'
import type { RegexEntry } from '../regex-library/widget'
import { PRESETS, applyPreset, modListRows, modRatings, nextPresetRating, presetRating, searchOptions, setModRatings, setSearchOption, withRating } from './rules'
import type { JuiceWeights, MapModPreset, ModMode, ModRating } from './rules'
import { MAX_SEARCH_LENGTH, MIN_LABELS, tokenCost } from './regex'
import type { MinStat } from './regex'
import { modsForMode, tier17Mods } from './data'
import { BONUS_LABEL, MORE_LABEL, bonusTip, loadMapBonuses, mapBonusData, modsOfLine, rowBonus, sortValue, wantsFor } from './bonuses'
import type { BonusKey, MoreKind, RowBonus } from './bonuses'
import { profileRegex } from './search'
import { activeProfile, rewardsAsk } from './widget'
import type { MapModsWidget } from './widget'
import { moduleIcon } from '../ui/game-icons'
import MapScanBox from './MapScanBox.vue'
import MapPlanner from './MapPlanner.vue'
import { entries as scanEntries, isScanOwner } from './scan-session'
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
  { value: 'all', label: 'every' },
  { value: 'any', label: 'any one' }
]
const MIN_KEYS: MinStat[] = ['quantity', 'rarity', 'packSize', 'currency', 'scarabs', 'maps', 'divCards', 'quality']
const REWARDS_HELP = 'Map must have: the lowest roll you accept, like 40 under More currency. Blank means no minimum. ' +
  'The Alt+M card ticks or crosses each one, and when the stash search lights up maps to run, it shows only maps that have them. ' +
  'Juice score: how much the stat counts toward the 0-100 score on the Alt+M card. ' +
  'Every / any one: whether a map must meet all the minimums you set, or just one of them.'
const JUICE_HELP = 'The Alt+M card scores each map from 0 to 100 on how rewarding it is. These squares set how much each stat counts. ' +
  'Atlas drops, item rarity and pack size are weighed against each other. The More currency, threads, maps and div cards squares add on top. ' +
  'No squares lit means the score ignores the stat. Click a square to set it, click the last lit one to lower it. ' +
  'This changes only the score, never the search.'
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
// Map scan lives in the first Map mods window only.
const scanOwner = computed(() => isScanOwner(props.config))
// The Scan tab sits beside Maps, Heist and Charts; mode keeps the last of those.
const scanTab = shallowRef(false)
watch(scanOwner, (own) => { if (!own) scanTab.value = false })
// The Planner works on T17 maps, with the Maps ratings.
const plannerTab = shallowRef(false)
const mapRatings = computed(() => modRatings(profile.value, 'maps'))
const tab = computed<string>({
  get: () => scanTab.value ? 'scan' : plannerTab.value ? 'planner' : mode.value,
  set: (v) => {
    scanTab.value = v === 'scan'
    plannerTab.value = v === 'planner'
    if (v !== 'scan' && v !== 'planner') mode.value = v as ModMode
  }
})

// What's new's Show me opens a tab by name (Scan only in the scanning window).
useGoto(props.config, 'woke-map-mods', {
  maps: () => { tab.value = 'maps' },
  heist: () => { tab.value = 'heist' },
  charts: () => { tab.value = 'charts' },
  planner: () => { tab.value = 'planner' },
  scan: () => { if (scanOwner.value) tab.value = 'scan' }
})

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

// Tab labels shared with What's new's Show me (tab-bar/goto.ts).
const TAB = GOTO_TARGETS['woke-map-mods']
const modeOptions = computed(() => (['maps', 'heist', 'charts'] as const).map(value => ({
  value,
  label: TAB[value],
  count: modsForMode(value, profile.value).filter(m => modRatings(profile.value, value)[m]).length
})))

const tabList = computed(() => [
  ...modeOptions.value,
  { value: 'planner', label: TAB.planner, title: 'Pick a bonus and how many T17 mods give it, get a stash and trade search' },
  ...(scanOwner.value
    ? [{ value: 'scan', label: TAB.scan, count: scanEntries.value.length || undefined, title: 'Map scan: read hovered maps on screen and see each verdict' }]
    : [])
])

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
// What each mod adds to a map (Atlas Drops / rarity / pack size, more-X), from
// poedb's tables. Sorting by one keeps rated mods grouped on top.
type SortKey = 'rated' | BonusKey
const SORT_KEYS: BonusKey[] = ['d', 'r', 'p', 'currency', 'maps', 'threads']
const MORE_KEYS: BonusKey[] = ['currency', 'maps', 'threads', 'divCards', 'scarabs']
const SORT_OPTIONS = [{ value: 'rated', label: 'Rated first' }, ...SORT_KEYS.map(k => ({ value: k, label: BONUS_LABEL[k] }))]
const WANT_ALL_TIP = 'Rates as want every unrated mod in the list that gives this bonus. Mods you rated stay as they are. ' +
  'A T17 mod and a regular one can share a line, and the stash search can\'t tell them apart.'
const sortBy = shallowRef<SortKey>('rated')
loadMapBonuses().catch(() => {})
const withT17 = computed(() => !profile.value.hideT17)
const sorted = computed(() => {
  const key = sortBy.value
  const data = mapBonusData.value
  if (mode.value !== 'maps' || key === 'rated' || !data) return filtered.value
  const value = new Map(filtered.value.map(m => [m, sortValue(modsOfLine(data, m, withT17.value), key)]))
  return [...filtered.value].sort((a, b) => value.get(b)! - value.get(a)!)
})
const wantable = computed(() => {
  const key = sortBy.value
  const data = mapBonusData.value
  if (mode.value !== 'maps' || key === 'rated' || !MORE_KEYS.includes(key) || !data) return []
  return filtered.value.filter(m => !ratings.value[m] && wantsFor(modsOfLine(data, m, withT17.value), key as MoreKind))
})
function wantAll () {
  setModRatings(profile.value, mode.value, withRating(ratings.value, wantable.value, 'good'))
  orderBy.value = ratings.value
}
watch(sortBy, () => { orderBy.value = ratings.value })
const rows = computed(() => modListRows(sorted.value, orderBy.value))
const visible = computed(() => rows.value.slice(0, MAX_ROWS))
const hiddenCount = computed(() => rows.value.slice(MAX_ROWS).filter(row => row.kind === 'mod').length)
const bonusRows = computed(() => {
  const out: Record<string, { b: RowBonus, tip: string }> = {}
  const data = mapBonusData.value
  if (mode.value !== 'maps' || !data) return out
  for (const row of visible.value) {
    if (row.kind !== 'mod') continue
    const mods = modsOfLine(data, row.matcher, withT17.value)
    const b = rowBonus(mods)
    if (b) out[row.matcher] = { b, tip: `${row.matcher}\n\n${bonusTip(mods, data.built)}` }
  }
  return out
})

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
// Any weight above 0 lights at least one square, so "none lit" always means ignored.
function pipsOf (key: MinStat): number {
  const w = weightOf(key)
  return w > 0 ? Math.max(1, Math.min(PIPS.length, Math.round(w / PIP_STEP))) : 0
}
// Clicking the last lit square lowers it by one; any other square sets the weight there.
function setPips (key: MinStat, n: number) {
  if (key === 'quality') return
  const next = pipsOf(key) === n ? n - 1 : n
  props.config.weights = { ...props.config.weights, [key]: next * PIP_STEP }
}
// The squares in words; the exact number is in the tooltip.
const WEIGHT_WORDS = ['off', 'low', 'normal', 'high', 'max']
function weightWord (key: MinStat): string {
  return WEIGHT_WORDS[pipsOf(key)]
}
function isQuiet (key: MinStat): boolean {
  return !weightOf(key) && !(profile.value.mins[key] ?? 0)
}

// "Edit rewards" on the map check card: show the Rewards table.
const rewardsEl = shallowRef<HTMLElement | null>(null)
const flash = shallowRef(false)
let flashTimer: ReturnType<typeof setTimeout> | undefined
watch(rewardsAsk, async () => {
  scanTab.value = false
  plannerTab.value = false
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

// Save asks for a name first. A string that's already saved offers to rename
// it. Picking one of the tab's saved searches, or typing its name, overwrites it.
const naming = shallowRef(false)
const saveName = shallowRef('')
const existingName = shallowRef<string | null>(null)
const nameField = shallowRef<ComponentPublicInstance | null>(null)
const pickOpen = shallowRef(false)
const saves = computed(() => naming.value && existingName.value == null ? regexesIn(LIBRARY_NAME[mode.value]) : [])
const target = computed(() => {
  const name = saveName.value.trim().toLowerCase()
  return name ? saves.value.find(e => e.name.trim().toLowerCase() === name) ?? null : null
})
const saveVerb = computed(() => existingName.value != null ? 'Rename' : target.value ? 'Overwrite' : 'Save')
function pick (e: RegexEntry) {
  saveName.value = e.name
  pickOpen.value = false
}
async function startSave () {
  if (!regex.value.text) return
  existingName.value = savedRegexName(regex.value.text)
  saveName.value = existingName.value ?? `${LIBRARY_NAME[mode.value]}: ${profile.value.name || 'Unnamed'}`
  pickOpen.value = false
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
  } else if (target.value) {
    const old = target.value.name
    toast(replaceSavedRegex(target.value, regex.value.text) ? `Overwrote "${old}"` : SAVE_MESSAGE['module-off'])
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
.scanTab { flex: 1; min-height: 0; }
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
.pane + .pane { border-top: 1px solid var(--w-line); }
.flash { background: var(--w-accent-soft); }
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
.weight { margin-left: 4px; font-size: var(--w-fs-xs); min-width: 3.2em; }
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
  flex-wrap: wrap;
}
/* The name keeps room to read; the buttons drop to a second row when the
   pane is narrow. */
.saveName { flex: 1 1 9rem; }
.saveBtns { display: flex; gap: 6px; margin-left: auto; }
.pickBtn {
  width: 24px;
  height: 24px;
  flex: none;
  border-radius: var(--w-r-sm);
  border: 1px solid var(--w-line);
  background: var(--w-panel);
  color: var(--w-dim);
  font-size: var(--w-fs-xs);
}
.pickBtn:hover, .pickBtn[aria-expanded="true"] { color: var(--w-fg); border-color: var(--w-line-strong); }
.picks {
  display: flex;
  flex-direction: column;
  max-height: 10rem;
  border: 1px solid var(--w-line);
  border-radius: var(--w-r-sm);
  background: var(--w-panel);
}
.pick {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 8px;
  padding: 4px 8px;
  text-align: left;
  font-size: var(--w-fs-sm);
  border-bottom: 1px solid var(--w-line-soft);
}
.pick:last-child { border-bottom: 0; }
.pick:hover { background: var(--w-panel-2); }
.pick code { font-family: var(--w-mono); font-size: var(--w-fs-xs); }
.picked { color: var(--w-accent); }
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
.bonus {
  display: inline-flex;
  gap: 6px;
  flex: none;
  font-size: var(--w-fs-xs);
  color: var(--w-faint);
  white-space: nowrap;
}
.more { color: var(--w-accent); font-weight: 600; }
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
