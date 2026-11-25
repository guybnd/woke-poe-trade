<template>
  <div :class="$style.split" data-testid="map-planner">
    <!-- Left: the bonus you want and the T17 mods that give it. -->
    <div :class="$style.left">
      <div :class="$style.tools">
        <div class="flex items-center gap-1 flex-wrap w-full">
          <span class="w-dim text-xs mr-1">I want</span>
          <WChip v-for="g in PLAN_GOALS" :key="g" clickable :active="state.goal === g" @click="setGoal(g)">{{ BONUS_LABEL[g] }}</WChip>
        </div>
        <div class="flex items-center gap-2 w-full">
          <span class="w-dim text-xs flex-1">
            T17 mods that give it{{ state.goal === 'p' ? ' (the 17-20% ones; every mod gives about 5%)' : '' }}. Untick the ones your build can't run: they're avoided. Mods you rated avoid in Maps start unticked, and are avoided even when not listed.
          </span>
          <WButton v-if="handTicked" size="sm" variant="ghost" title="Tick and untick by your Maps ratings again" @click="resetTicks">Reset ticks</WButton>
        </div>
      </div>
      <div :class="$style.list" class="w-scroll">
        <WEmpty v-if="!data" icon="fas fa-spinner">Loading what each mod gives…</WEmpty>
        <table v-else :class="$style.tbl">
          <thead>
            <tr>
              <th />
              <th :class="$style.modCol">
                Mod <span :class="[$style.ps, $style.P]">P</span> prefix <span :class="[$style.ps, $style.S]">S</span> suffix
              </th>
              <th v-for="c in COLUMNS" :key="c" :class="{ [$style.goal]: c === state.goal }" :title="BONUS_LABEL[c]">{{ SHORT[c] }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.key" :class="{ [$style.off]: !ticked.has(r.key) }" :title="tipOf(r)" @click="toggle(r)">
              <td><input type="checkbox" :checked="ticked.has(r.key)" :aria-label="`Use ${r.key}`" @click.stop="toggle(r)"></td>
              <td :class="$style.modCol">
                <span :class="[$style.ps, r.prefix ? $style.P : $style.S]">{{ r.prefix ? 'P' : 'S' }}</span>
                <b>{{ r.key }}</b> <span class="w-dim">{{ r.mod.lines.join(' · ') }}</span>
              </td>
              <td v-for="c in COLUMNS" :key="c" class="w-num" :class="{ [$style.goal]: c === state.goal }">{{ cell(r.mod, c) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Right: what a map must have, and the searches. -->
    <div :class="$style.right" class="w-scroll">
      <section :class="$style.pane">
        <span class="w-group-label" style="padding: 0;">A map must have</span>
        <div class="flex items-center gap-2 text-xs flex-wrap">
          <span class="w-dim">At least</span>
          <WSelect :model-value="String(state.need)" :options="countOptions(6)" title="How many of the ticked mods" @update:model-value="set({ need: Number($event) })" />
          <span class="w-dim">of the {{ ticked.size }} ticked mods</span>
        </div>
        <div class="flex items-center gap-2 text-xs flex-wrap">
          <span class="w-dim">of them prefixes ≥</span>
          <WSelect :model-value="String(state.pre)" :options="countOptions(3)" title="Ticked prefixes a map needs" @update:model-value="set({ pre: Number($event) })" />
          <span class="w-dim">suffixes ≥</span>
          <WSelect :model-value="String(state.suf)" :options="countOptions(3)" title="Ticked suffixes a map needs" @update:model-value="set({ suf: Number($event) })" />
        </div>
        <div class="flex items-center gap-2 text-xs">
          <span class="w-dim">Map total {{ BONUS_LABEL[state.goal].toLowerCase() }} ≥</span>
          <WField type="number" :model-value="state.total || ''" placeholder="–" suffix="%" :class="$style.min"
            :label="`Map total ${BONUS_LABEL[state.goal].toLowerCase()} at least`" @update:model-value="set({ total: Math.max(0, Math.min(999, Math.floor(Number($event) || 0))) })" />
        </div>
      </section>
      <!-- Guy's pick (veteran review, 2026-11-24): the trade search first, since it can count; stash text after, only when it fits. -->
      <section :class="$style.pane" data-testid="map-planner-trade">
        <span class="w-group-label" style="padding: 0;">Trade search</span>
        <div class="w-dim text-xs">T17 maps with {{ tradeWords }}. The trade site counts the mods itself, so any number works.</div>
        <div v-if="problem" class="w-warn text-xs">{{ problem }}</div>
        <WButton size="sm" variant="primary" icon="fas fa-external-link-alt" :disabled="!ticked.size || !!problem" @click="openTrade">Search trade</WButton>
      </section>
      <section :class="$style.pane" data-testid="map-planner-search">
        <div class="flex items-center gap-2">
          <span class="w-group-label flex-1" style="padding: 0;">Stash search</span>
          <WInfo v-if="usable" :text="tokenInfo" />
        </div>
        <template v-if="search.tooLong">
          <div class="w-dim text-xs" data-testid="map-planner-stash-too-long">
            Too many mods to fit the stash box: it can't count, so "{{ state.need }} of {{ ticked.size }}" needs a term for every group of mods. Use the trade search above, or tick fewer mods.
          </div>
        </template>
        <template v-else>
          <code :class="[$style.regex, { 'w-dim': !search.text }]" :title="search.text">{{ search.text || search.problem || 'Tick mods to build a search' }}</code>
          <div v-if="search.text" :class="$style.meter">
            <span :class="$style.bar"><span :style="{ width: `${Math.min(100, search.length / MAX_SEARCH_LENGTH * 100)}%` }" /></span>
            <span class="w-num w-dim">{{ search.length }} / {{ MAX_SEARCH_LENGTH }}</span>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <WButton size="sm" :icon="copied ? 'fas fa-check' : 'far fa-copy'" :disabled="!usable" @click="copy">Copy</WButton>
            <WButton size="sm" icon="fas fa-search" :disabled="!usable" title="Type it into the open stash's search box" @click="paste">Paste in stash</WButton>
          </div>
        </template>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { MainProcess } from '@/web/background/IPC'
import { useLeagues } from '@/web/background/Leagues'
import { getTradeEndpoint } from '@/web/price-check/trade/common'
import { WButton, WChip, WEmpty, WField, WInfo, WSelect, toast } from '../ui'
import { useCopy } from '../ui/copy'
import { tradeUrl } from '../search/search'
import { priceCheckTradeStatus } from '../shared/trade-status'
import { BONUS_LABEL, MORE_LABEL, bonusOf, bonusWords, loadMapBonuses, mapBonusData } from './bonuses'
import type { BonusKey, MapBonusMod } from './bonuses'
import { DEFAULT_PLANNER, PLAN_GOALS, isTicked, planProblem, planRows, planStashSearch, planTradeQuery, planUniverse, ratedAvoid, toggled } from './planner'
import type { PlanGoal, PlanRow, PlannerState } from './planner'
import { MAX_SEARCH_LENGTH } from './regex'
import { allMapNames } from './data'
import type { MapModProfile, ModRating } from './rules'
import { plannerGoalFor } from './goal'
import { farmGoal } from './goal-config'

const props = defineProps<{ profile: MapModProfile, ratings: Record<string, ModRating> }>()

const COLUMNS: BonusKey[] = ['d', 'r', 'p', 'currency', 'maps', 'threads']
const SHORT: Record<string, string> = { d: 'Drops', r: 'Rarity', p: 'Pack', currency: 'Currency', maps: 'Maps', threads: 'Threads' }

loadMapBonuses().catch(() => {})
const data = mapBonusData
const state = computed<PlannerState>(() => {
  // Until you pick a goal here, it follows the farming goal (goal.ts).
  const farm = plannerGoalFor(farmGoal())
  const saved = { ...DEFAULT_PLANNER, ...props.profile.planner }
  const s = farm && !saved.goalPicked ? { ...saved, goal: farm } : saved
  return PLAN_GOALS.includes(s.goal) ? s : { ...s, goal: DEFAULT_PLANNER.goal }
})
function set (patch: Partial<PlannerState>) {
  props.profile.planner = { ...state.value, ...patch }
}
function setGoal (goal: PlanGoal) {
  set({ goal, goalPicked: true })
}

const rows = computed(() => planRows(data.value, state.value.goal))
const ticked = computed(() => new Set(rows.value.filter(r => isTicked(r, state.value, props.ratings)).map(r => r.key)))
function toggle (r: PlanRow) {
  props.profile.planner = toggled(state.value, r.key, ticked.value.has(r.key))
}

function cell (mod: MapBonusMod, key: BonusKey): string {
  const v = bonusOf(mod, key)
  return v ? `${key === 'd' || key === 'r' || key === 'p' ? '' : '+'}${v}%` : '–'
}
function tipOf (r: PlanRow): string {
  return `${r.key} (T17 ${r.prefix ? 'prefix' : 'suffix'})\n${r.mod.lines.join('\n')}\n${bonusWords(r.mod)}`
}
const countOptions = (max: number) => Array.from({ length: max + 1 }, (_, i) => ({ value: String(i), label: String(i) }))

const problem = computed(() => planProblem(rows.value, ticked.value, state.value))
const handTicked = computed(() => !!(state.value.on?.length || state.value.off?.length))
function resetTicks () {
  set({ on: [], off: [] })
}
const universe = computed(() => planUniverse(data.value))
// Mods you rated avoid that the list leaves out are still avoided.
const alsoAvoid = computed(() => ratedAvoid(data.value, rows.value, props.ratings))
const search = computed(() => planStashSearch(rows.value, ticked.value, state.value, universe.value, allMapNames(), alsoAvoid.value))
const tokenInfo = computed(() => search.value.minToken > 3
  ? `There was room, so each mod is searched by ${search.value.minToken} or more characters of its text where its text allows, instead of the shortest 3.\n` +
    '- Longer text is less likely to also match a rare map\'s random name.\n' +
    '- It shortens again by itself when you tick more mods.'
  : 'Each mod is searched by the shortest text (3 characters or more) that no other T17 mod has, so the search fits.\n' +
    '- Text that short can, rarely, also match a rare map\'s random name.\n' +
    '- Tick fewer mods and it uses longer text by itself.')
const usable = computed(() => !!search.value.text && !search.value.tooLong)

const { copied, copy: copyText } = useCopy(1200)
async function copy () {
  if (usable.value) await copyText(search.value.text)
}
function paste () {
  if (!usable.value) return
  MainProcess.sendEvent({ name: 'CLIENT->MAIN::user-action', payload: { action: 'stash-search', text: search.value.text } })
}

const tradeWords = computed(() => {
  const s = state.value
  const parts = [`${s.need} or more of the ${ticked.value.size} ticked mods`]
  if (s.pre) parts.push(`${s.pre}+ ticked prefixes`)
  if (s.suf) parts.push(`${s.suf}+ ticked suffixes`)
  if (s.total) parts.push(`${s.total}%+ ${s.goal === 'p' ? 'pack size' : `more ${MORE_LABEL[s.goal]}`}`)
  return parts.join(', ')
})
const leagues = useLeagues()
function openTrade () {
  const league = leagues.selectedId.value
  if (!league) { toast('Pick a league in the settings first'); return }
  const q = planTradeQuery(rows.value, ticked.value, state.value, alsoAvoid.value)
  if (!q) return
  window.open(tradeUrl(league, { ...q, status: priceCheckTradeStatus() }, getTradeEndpoint()))
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
}
.pane + .pane { border-top: 1px solid var(--w-line); }
.tbl { width: 100%; border-collapse: collapse; font-size: var(--w-fs-sm); }
.tbl th {
  position: sticky;
  top: 0;
  background: var(--w-panel);
  font-weight: 500;
  font-size: var(--w-fs-xs);
  color: var(--w-dim);
  padding: 4px;
  text-align: right;
  white-space: nowrap;
}
.tbl td { padding: 3px 4px; border-top: 1px solid var(--w-line-soft); text-align: right; white-space: nowrap; }
.tbl tr { cursor: pointer; }
.tbl tbody tr:hover td { background: var(--w-panel-2); }
.tbl th:first-child, .tbl td:first-child { width: 1.6rem; padding-left: var(--w-pad); text-align: left; }
.tbl .modCol { text-align: left; white-space: normal; }
.goal { color: var(--w-accent); font-weight: 600; }
.off td { color: var(--w-faint); }
.off .modCol { text-decoration: line-through; }
.ps {
  display: inline-block;
  min-width: 1.3em;
  margin-right: 4px;
  font-size: var(--w-fs-xs);
  font-weight: 700;
  text-align: center;
  border-radius: var(--w-r-sm);
  border: 1px solid currentColor;
}
.P { color: var(--w-info); }
.S { color: var(--w-r-unique); }
.min { width: 5rem; }
.regex {
  font-family: var(--w-mono);
  font-size: var(--w-fs-sm);
  padding: 6px 8px;
  border-radius: var(--w-r-sm);
  background: var(--w-panel);
  border: 1px solid var(--w-line);
  overflow-wrap: anywhere;
  max-height: 8em;
  overflow: auto;
  user-select: text;
}
.meter { display: flex; align-items: center; gap: 8px; font-size: var(--w-fs-xs); }
.bar { flex: 1; height: 4px; border-radius: 2px; background: var(--w-panel-3); overflow: hidden; }
.bar > span { display: block; height: 100%; background: var(--w-up); }
</style>
