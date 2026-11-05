<template>
  <WPanel :title="entry.name" size-key="detail" width="25rem" max-height="70vh">
    <template #actions>
      <button @click="emit('close')" class="w-icon-btn" title="Close"><i class="fas fa-times" /></button>
    </template>
    <template #toolbar>
      <WButton size="sm" variant="primary" icon="fas fa-external-link-alt" @click="run(pobApi.open(config, entry.relPath))">Open in PoB</WButton>
      <WButton size="sm" @click="run(pobApi.show(config, entry.relPath))">Show file</WButton>
      <WButton size="sm" @click="setActive" :disabled="isActive">{{ isActive ? 'Active build' : 'Make active' }}</WButton>
      <WButton v-if="charName" size="sm" variant="ghost" :icon="followsMe ? 'fas fa-link' : 'fas fa-unlink'"
        :title="followsMe ? `Stop switching to this build when ${charName} levels` : `Make this the active build whenever ${charName} levels up (from Client.txt)`"
        @click="toggleFollow">
        {{ followsMe ? `Follows ${charName}` : `Follow ${charName}` }}
      </WButton>
    </template>
    <template #tabs>
      <WTabs v-model="tab" :options="tabOptions" />
    </template>
    <template v-if="error || followers.length" #meta>
      <span v-if="error" class="w-down">{{ error }}</span>
      <span v-else class="w-dim">Active while {{ followers.join(', ') }} {{ followers.length > 1 ? 'level' : 'levels' }} up</span>
    </template>

    <div :class="$style.body">
      <WEmpty v-if="!details" icon="fas fa-spinner fa-spin">Loading…</WEmpty>

      <!-- Leveling -->
      <template v-else-if="tab === 'leveling'">
        <div class="w-dim">
          <template v-if="level != null">Level {{ level }}<template v-if="act != null && act <= 10"> · Act {{ act }}</template></template>
          <template v-else>Level unknown: the campaign tracker reads it from Client.txt.</template>
        </div>
        <div v-if="skillSets.length > 1" class="flex flex-wrap gap-1 pt-1">
          <WChip v-for="(set, i) in skillSets" :key="i" clickable :active="set === shownSet" @click="viewSet = i">
            {{ set.title }}<span v-if="set === pickedSet?.item" class="w-accent"> ·  now</span>
          </WChip>
        </div>
        <div :class="$style.heading">Links<template v-if="shownSet && skillSets.length > 1"> · {{ shownSet.title }}</template></div>
        <div v-for="(g, i) in shownLinks" :key="i" :class="$style.linkGroup">
          <div :class="$style.link">
            <SocketDots :colours="linkColours(g)" />
            <span v-if="g.label || g.slot" class="ml-auto w-faint text-xs whitespace-nowrap">{{ g.label || g.slot }}</span>
          </div>
          <div :class="$style.names">
            <GemName v-for="x in orderedGems(g)" :key="x.name" :name="x.name" :level="x.level" :quality="x.quality" />
          </div>
        </div>
        <WEmpty v-if="!shownLinks.length" icon="fas fa-gem">No gem groups in this skill set.</WEmpty>

        <div :class="$style.heading" class="flex">
          <span>Gems by level</span>
          <span class="ml-auto normal-case tracking-normal">{{ canTick ? 'click a gem once you have it' : '' }}</span>
        </div>
        <button v-for="g in gems" :key="g.name" :class="[$style.gemRow, { [$style.later]: g.when === 'later' || got.includes(g.name) }]"
          :disabled="!canTick" @click="toggleGot(g.name)">
          <span class="w-num w-faint text-xs" :class="$style.lvl">{{ g.requiredLevel }}</span>
          <i v-if="got.includes(g.name)" class="fas fa-check text-xs w-up" />
          <GemName :class="$style.gemName" :name="g.name" :struck="got.includes(g.name)" :note="gemNote(g)" />
          <span v-if="g.when === 'soon' && !got.includes(g.name)" class="w-accent text-xs whitespace-nowrap">soon</span>
          <span class="ml-auto w-dim text-xs w-trunc" :class="$style.src">{{ g.source ?? 'trade / drop' }}</span>
        </button>
      </template>

      <!-- Gear -->
      <template v-else-if="tab === 'gear'">
        <template v-if="mainLink">
          <div :class="$style.heading">Links you need now</div>
          <div :class="$style.link">
            <SocketDots :colours="mainColours" />
            <span class="w-dim whitespace-nowrap">{{ mainColours.length }}-link for</span>
            <GemName v-if="orderedGems(mainLink)[0]" :name="orderedGems(mainLink)[0].name" />
          </div>
          <div v-if="regex" class="flex items-center gap-2 pt-1">
            <code :class="$style.rx" :title="regex.exact ? 'Exact colour orders' : 'Only these colours or white'">{{ regex.regex }}</code>
            <WButton size="sm" variant="primary" :icon="copied ? 'fas fa-check' : 'fas fa-copy'" @click="copyRegex">{{ copied ? 'Copied' : 'Copy regex' }}</WButton>
            <WButton size="sm" variant="ghost" icon="far fa-bookmark" title="Keep this search in the Regex library"
              @click="toast(SAVE_MESSAGE[saveToRegexLibrary({ name: `${entry.name}: link colours`, text: regex.regex, category: 'Builds' })])">Save</WButton>
          </div>
          <div v-if="regex" class="w-faint text-xs pt-0.5">
            Paste into a vendor's or your stash's search box: highlights {{ regex.size }}-links in these colours{{ regex.exact ? '' : ' (or white)' }}.
          </div>
        </template>

        <div v-if="itemSets.length > 1" class="flex flex-wrap gap-1 pt-2">
          <WChip v-for="(set, i) in itemSets" :key="i" clickable :active="set === shownItemSet" @click="viewItemSet = i">
            {{ set.title }}<span v-if="set === pickedItemSet" class="w-accent"> · now</span>
          </WChip>
        </div>
        <div :class="$style.heading">Gear<template v-if="shownItemSet && itemSets.length > 1"> · {{ shownItemSet.title }}</template></div>
        <WEmpty v-if="!gear.length" icon="fas fa-tshirt">No items in this build. Add them in PoB's Items tab to see what to look for.</WEmpty>
        <div v-for="(s, i) in gear" :key="i" :class="$style.gearRow"
          @mouseenter="showTip($event, { kind: 'item', item: s.item })" @mouseleave="hideTip">
          <span :class="[$style.cell, cellClass(s.item.rarity)]">
            <img v-if="itemArt(s.item)" :src="itemArt(s.item)!" alt="" :class="['w-game-icon', $style.art]" loading="lazy" draggable="false">
            <i v-else class="fas fa-question w-faint" />
          </span>
          <span class="min-w-0 flex flex-col">
            <span class="w-trunc" :class="rarityClass(s.item.rarity)">{{ s.item.name }}</span>
            <span class="w-dim text-xs w-trunc">
              <span class="w-faint">{{ slotLabel(s.slot) }}</span>
              <template v-if="s.item.base"> · {{ s.item.base }}</template>
              <template v-if="keyMods(s.item).length"> · {{ keyMods(s.item).join(' · ') }}</template>
            </span>
          </span>
          <span class="ml-auto flex items-center gap-1.5">
            <SocketDots v-for="(grp, j) in socketDots(s.item.sockets)" :key="j" :colours="grp" />
            <WButton v-if="tradeUrl(s.item)" size="sm" variant="ghost" icon="fas fa-search" :title="`Search the trade site for ${s.item.name}`" @click="openUrl(tradeUrl(s.item)!)" />
          </span>
        </div>
      </template>

      <!-- Setups -->
      <template v-else-if="tab === 'setups'">
        <div v-if="details.trees.length" class="pb-2">
          <div :class="$style.heading">Passive trees</div>
          <a v-for="t in details.trees" :key="t.title + t.url" :href="safeUrl(t.url)" target="_blank"
            class="block w-trunc py-0.5 hover:underline" :class="t.isActive ? '' : 'w-dim'">
            <i class="fas fa-external-link-alt text-xs w-faint" /> {{ t.title }}<span v-if="t.isActive" class="w-accent"> · active</span>
          </a>
        </div>
        <div v-for="(set, k) in skillSets" :key="k" class="pb-2">
          <div :class="$style.heading">Gem setups<template v-if="skillSets.length > 1"> · {{ set.title }}</template></div>
          <div v-for="(s, i) in set.groups" :key="i" :class="[$style.setup, { 'opacity-50': !s.enabled }]">
            <div class="w-dim text-xs">
              {{ s.label || s.slot || `Group ${i + 1}` }}<span v-if="s.isMain" class="w-accent"> · main</span>
            </div>
            <div :class="$style.names">
              <GemName v-for="(g, j) in s.gems" :key="j" :name="g.name" :level="g.level" :quality="g.quality" :off="!g.enabled" :struck="!g.enabled">
                <span v-if="g.level != null" class="w-faint text-xs w-num">{{ g.level }}/{{ g.quality ?? 0 }}</span>
              </GemName>
            </div>
          </div>
        </div>
      </template>

      <!-- Filter -->
      <template v-else-if="tab === 'filter'">
        <WEmpty v-if="!filterWidget" icon="fas fa-filter">Add the Loot filter editor to put rules for this build into your NeverSink filter.</WEmpty>
        <template v-else>
          <div class="w-dim pb-1">
            Rules from the <span class="w-accent">active</span> build go at the top of your saved filter copy.
            Save in the loot filter editor<template v-if="filterWidget.editorHotkey"> (<WKbd :keys="filterWidget.editorHotkey" />)</template> to write them.
          </div>
          <div v-if="!isActive" class="pb-1" style="color: var(--w-warn);">This isn't the active build; press Make active to use it for the filter.</div>
          <div v-for="r in FILTER_ROWS" :key="r.key" class="flex items-center gap-2 py-1">
            <WChip clickable :active="filterWidget.buildRules[r.key]" @click="filterWidget.buildRules[r.key] = !filterWidget.buildRules[r.key]">
              {{ filterWidget.buildRules[r.key] ? 'On' : 'Off' }}
            </WChip>
            <span>{{ r.label }}</span>
          </div>
        </template>
      </template>

      <!-- Notes -->
      <template v-else>
        <div v-if="details.notes" class="whitespace-pre-wrap w-dim"><span v-for="(r, i) in noteRuns(details.notesRaw || details.notes)" :key="i" :style="r.colour ? { color: r.colour } : undefined">{{ r.text }}</span></div>
        <WEmpty v-else icon="fas fa-sticky-note">No notes in this build.</WEmpty>
      </template>
    </div>
    <GameTooltip />
  </WPanel>
</template>

<script setup lang="ts">
import { computed, shallowRef, useCssModule, watch } from 'vue'
import { WPanel, WButton, WEmpty, WTabs, WChip, WKbd, toast } from '../ui'
import { useCopy } from '../ui/copy'
import { SAVE_MESSAGE, saveToRegexLibrary } from '../regex-library/save'
import { AppConfig, saveConfig } from '@/web/Config'
import { useLeagues } from '@/web/background/Leagues'
import { CAMPAIGN_TYPE } from '../campaign/widget'
import type { CampaignWidget } from '../campaign/widget'
import { LOOT_FILTER_TYPE } from '../loot-filter/widget'
import type { LootFilterWidget } from '../loot-filter/widget'
import type { BuildRuleSwitches } from '../loot-filter/build-rules'
import GameTooltip from './GameTooltip.vue'
import GemName from './GemName.vue'
import SocketDots from './SocketDots.vue'
import { nextGems } from './gems'
import type { GemColour, NextGem } from './gems'
import {
  gearOrder, isGearSlot, itemSetsOf, linkColours, linkGroups, mainGroupOf, noteRuns, orderedGems, pickStage,
  relevantGems, skillSetsOf, slotLabel, socketGroups, socketRegex
} from './build-model'
import { itemArt } from './item-art'
import { hideTip, showTip } from './tooltip'
import { pobApi } from './widget'
import type { PobBuildEntry, PobBuildsWidget, PobDetails, PobItem } from './widget'
import { useActiveBuild } from './active'

const $style = useCssModule()

const props = defineProps<{
  config: PobBuildsWidget
  entry: PobBuildEntry
  details: PobDetails | null
}>()
const emit = defineEmits<{ (e: 'close'): void }>()

const build = useActiveBuild()
const level = build.level
const act = build.act
const charName = build.charName
const error = shallowRef('')

const tab = shallowRef<'leveling' | 'gear' | 'setups' | 'filter' | 'notes'>('leveling')
// The hovered row leaves with the tab, so no mouseleave comes.
watch(tab, hideTip)
const tabOptions = [
  { value: 'leveling', label: 'Leveling' },
  { value: 'gear', label: 'Gear' },
  { value: 'setups', label: 'Setups' },
  { value: 'filter', label: 'Filter' },
  { value: 'notes', label: 'Notes' }
]

const isActive = computed(() => props.config.activeBuild === props.entry.relPath)
const followers = computed(() => Object.entries(props.config.followChars)
  .filter(([, rel]) => rel === props.entry.relPath).map(([name]) => name))
const followsMe = computed(() => props.config.followChars[charName.value] === props.entry.relPath)

function setActive () {
  props.config.activeBuild = props.entry.relPath
  saveConfig()
}

function toggleFollow () {
  const name = charName.value
  if (!name) return
  const next = Object.fromEntries(Object.entries(props.config.followChars).filter(([n]) => n !== name))
  if (!followsMe.value) {
    next[name] = props.entry.relPath
    props.config.activeBuild = props.entry.relPath
  }
  props.config.followChars = next
  saveConfig()
}

// ---- leveling ----

const skillSets = computed(() => props.details ? skillSetsOf(props.details) : [])
const pickedSet = computed(() => pickStage(skillSets.value, level.value, act.value))
const viewSet = shallowRef<number | null>(null)
const shownSet = computed(() => (viewSet.value != null ? skillSets.value[viewSet.value] : null) ?? pickedSet.value?.item ?? null)
const shownLinks = computed(() => shownSet.value ? linkGroups(shownSet.value.groups, 4) : [])

const className = computed(() => build.className.value || props.details?.ascendClassName || props.details?.className || '')
const gems = computed(() => props.details
  ? nextGems(props.details, level.value, className.value, relevantGems(props.details, level.value, act.value))
  : [])

const campaign = computed(() => AppConfig<CampaignWidget>(CAMPAIGN_TYPE))
const got = computed(() => campaign.value?.state.gemsGot ?? [])
const canTick = computed(() => Boolean(campaign.value))

function gemNote (g: NextGem): string {
  const source = g.source ?? 'Not sold in the campaign: buy or drop'
  if (!canTick.value) return source
  return `${source}\nClick to mark as ${got.value.includes(g.name) ? 'not got yet' : 'got'}`
}

function toggleGot (name: string) {
  const state = campaign.value?.state
  if (!state) return
  const list = state.gemsGot ?? []
  state.gemsGot = list.includes(name) ? list.filter(n => n !== name) : [...list, name]
  saveConfig()
}

// ---- gear ----

const itemSets = computed(() => props.details ? itemSetsOf(props.details) : [])
const pickedItemSet = computed(() => pickStage(itemSets.value, level.value, act.value)?.item ?? null)
const viewItemSet = shallowRef<number | null>(null)
const shownItemSet = computed(() => (viewItemSet.value != null ? itemSets.value[viewItemSet.value] : null) ?? pickedItemSet.value)
const gear = computed(() => (shownItemSet.value?.slots ?? []).filter(s => isGearSlot(s.slot))
  .sort((a, b) => gearOrder(a.slot) - gearOrder(b.slot)))

const mainLink = computed(() => pickedSet.value ? mainGroupOf(pickedSet.value.item.groups) : null)
const mainColours = computed<GemColour[]>(() => mainLink.value ? linkColours(mainLink.value) : [])
const regex = computed(() => socketRegex(mainColours.value))

watch(() => props.entry.relPath, () => { viewSet.value = null; viewItemSet.value = null })

const { copied, copy } = useCopy(1500)
async function copyRegex () {
  if (!regex.value) return
  if (!await copy(regex.value.regex)) error.value = "Couldn't copy to the clipboard"
}

function socketDots (sockets: string): GemColour[][] {
  return socketGroups(sockets).map(g => g.filter((c): c is GemColour => ['r', 'g', 'b', 'w'].includes(c)))
    .filter(g => g.length)
}

function rarityClass (rarity: PobItem['rarity']) {
  switch (rarity) {
    case 'UNIQUE':
    case 'RELIC': return 'w-rarity-unique'
    case 'RARE': return 'w-rarity-rare'
    case 'MAGIC': return 'w-rarity-magic'
    default: return 'w-rarity-normal'
  }
}

function cellClass (rarity: PobItem['rarity']) {
  switch (rarity) {
    case 'UNIQUE':
    case 'RELIC': return $style.cellUnique
    case 'RARE': return $style.cellRare
    case 'MAGIC': return $style.cellMagic
    default: return undefined
  }
}

// Mods worth reading at a glance on a rare: the first few explicit ones.
function keyMods (item: PobItem): string[] {
  if (item.rarity === 'UNIQUE' || item.rarity === 'RELIC') return []
  return item.mods.slice(0, 2)
}

const leagues = useLeagues()
function tradeUrl (item: PobItem): string | null {
  const league = leagues.selectedId.value
  if (!league || (item.rarity !== 'UNIQUE' && item.rarity !== 'RELIC')) return null
  const query = {
    query: { status: { option: 'online' }, name: item.name, ...(item.base ? { type: item.base } : {}) },
    sort: { price: 'asc' }
  }
  return `https://www.pathofexile.com/trade/search/${encodeURIComponent(league)}?q=${encodeURIComponent(JSON.stringify(query))}`
}

function openUrl (url: string) {
  window.open(url)
}

// ---- filter ----

const filterWidget = computed(() => AppConfig().widgets.find(w => w.wmType === LOOT_FILTER_TYPE) as LootFilterWidget | undefined)
const FILTER_ROWS: Array<{ key: keyof BuildRuleSwitches, label: string }> = [
  { key: 'gems', label: 'Show my gems while levelling' },
  { key: 'links', label: 'Linked items in my colours while levelling' },
  { key: 'uniques', label: 'My uniques' },
  { key: 'bases', label: 'My rare bases' },
  { key: 'hideWeapons', label: 'Hide other weapon types while levelling' }
]

// Tree links come from build files, which may be shared by others:
// only web links are opened (window.open URLs go to the OS shell).
function safeUrl (url: string) {
  return /^https?:\/\//i.test(url) ? url : undefined
}

function run (p: Promise<unknown>) {
  p.catch((err: Error) => { error.value = err.message })
}
</script>

<style module>
.body {
  padding: 4px var(--w-pad) 10px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.heading {
  padding: 8px 0 2px;
  font-size: var(--w-fs-xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--w-faint);
}
.link {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 3px 0;
}
.linkGroup {
  padding: 3px 0 5px;
  border-bottom: 1px solid var(--w-line-soft);
}
.linkGroup .link { padding: 0 0 3px; }
.names {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 10px;
  min-width: 0;
}
.gemRow {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 2px 0;
  text-align: left;
  width: 100%;
}
.gemRow:not(:disabled):hover { background: var(--w-line-soft); }
.later { opacity: 0.62; }
.lvl { width: 1.6rem; text-align: right; flex: none; }
.gemName { flex: none; max-width: 62%; }
.src { min-width: 0; }
.rx {
  font-family: var(--w-num);
  font-size: var(--w-fs-sm);
  background: var(--w-panel-3);
  border-radius: var(--w-r-sm);
  padding: 2px 6px;
  overflow-wrap: anywhere;
  min-width: 0;
}
.gearRow {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  border-bottom: 1px solid var(--w-line-soft);
  min-width: 0;
}
.gearRow:hover { background: var(--w-line-soft); }
/* An inventory cell, tinted by rarity as the game tints a hovered item. */
.cell {
  width: 44px;
  height: 44px;
  flex: none;
  display: grid;
  place-items: center;
  background: rgba(8, 10, 30, 0.75);
  border: 1px solid var(--w-line);
}
.cellUnique { background: rgba(175, 96, 37, 0.2); border-color: rgba(175, 96, 37, 0.6); }
.cellRare { background: rgba(255, 255, 119, 0.08); border-color: rgba(255, 255, 119, 0.35); }
.cellMagic { background: rgba(136, 136, 255, 0.12); border-color: rgba(136, 136, 255, 0.45); }
.art { max-width: 40px; max-height: 40px; object-fit: contain; }
.setup {
  padding: 4px 0;
  border-bottom: 1px solid var(--w-line-soft);
}
</style>
