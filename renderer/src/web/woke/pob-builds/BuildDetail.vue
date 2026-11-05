<template>
  <WPanel :title="entry.name" size-key="detail" width="25rem" max-height="70vh">
    <template #actions>
      <button @click="emit('close')" class="w-icon-btn" title="Close"><i class="fas fa-times" /></button>
    </template>
    <template #toolbar>
      <WButton size="sm" variant="primary" icon="fas fa-external-link-alt" @click="run(pobApi.open(config, entry.relPath))">Open in PoB</WButton>
      <WButton size="sm" @click="run(pobApi.show(config, entry.relPath))">Show file</WButton>
      <WButton size="sm" @click="setActive" :disabled="isActive">{{ isActive ? 'Active build' : 'Make active' }}</WButton>
      <WButton v-if="treeUrl" size="sm" icon="fas fa-project-diagram" title="Open this loadout's passive tree" @click="openTree">Passive tree</WButton>
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
          <template v-else>Level unknown: Campaign reads it from Client.txt.</template>
        </div>
        <div v-if="skillSets.length > 1" class="flex flex-wrap gap-1 pt-1">
          <WChip v-if="pick" clickable :title="AUTO_HINT" @click="clearPick">Auto</WChip>
          <WChip v-for="(set, i) in skillSets" :key="i" clickable :active="set === shownSet" :title="pickHint(set === shownSet, pick?.skillSet === set.title, loadout?.skillSet?.byStage)" @click="chooseSkillSet(set.title)">
            <i v-if="pick && set === shownSet" class="fas fa-thumbtack text-xs" /> {{ set.title }}<span v-if="set === shownSet" class="w-accent"> · now</span>
          </WChip>
        </div>
        <div v-if="!isActive" class="pt-1 text-xs" style="color: var(--w-warn);">Other windows use your active build. Press Make active to use this loadout there.</div>
        <div :class="$style.heading">Links<template v-if="shownSet && skillSets.length > 1"> · {{ shownSet.title }}</template></div>
        <div v-for="(g, i) in shownLinks" :key="i" :class="$style.linkGroup">
          <div :class="$style.link">
            <SocketDots :colours="linkColours(g)" />
            <span v-if="g.label || g.slot" class="ml-auto w-faint text-xs whitespace-nowrap">{{ g.label || g.slot }}</span>
          </div>
          <div :class="$style.names">
            <GemName v-for="(x, j) in orderedGems(g)" :key="j" :name="x.name" :level="x.level" :quality="x.quality" />
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
          <span class="ml-auto w-dim text-xs w-trunc" :class="$style.src" :title="g.source ?? 'Not sold in the campaign: buy or drop'">{{ g.source ?? 'trade / drop' }}</span>
        </button>
      </template>

      <!-- Gear -->
      <template v-else-if="tab === 'gear'">
        <div v-for="row in setChips" :key="row.label" class="flex flex-wrap items-center gap-1 pt-1">
          <span v-if="row.label" class="w-faint text-xs">{{ row.label }}</span>
          <WChip v-if="pick && row.first" clickable :title="AUTO_HINT" @click="clearPick">Auto</WChip>
          <WChip v-for="(c, i) in row.chips" :key="i" clickable :active="c.active" :title="c.hint" @click="c.choose()">
            <i v-if="pick && c.active" class="fas fa-thumbtack text-xs" /> {{ c.title }}<span v-if="c.active" class="w-accent"> · now</span>
          </WChip>
        </div>
        <div v-if="!isActive" class="pt-1 text-xs" style="color: var(--w-warn);">Other windows use your active build. Press Make active to use this loadout there.</div>
        <WEmpty v-if="!hasGear" icon="fas fa-tshirt">No items or gems in this set. Add them in PoB to see what to look for.</WEmpty>

        <template v-if="layout.main">
          <div :class="[$style.rowWrap, $style.main]">
            <GearRowHead :row="layout.main" main />
            <div :class="$style.chains">
              <GemChain v-for="(g, i) in layout.main.groups" :key="i" :group="g" />
            </div>
          </div>
        </template>

        <template v-if="layout.loose.length">
          <div :class="$style.heading">Gems PoB doesn't tie to an item</div>
          <div v-for="(g, i) in layout.loose" :key="i" :class="$style.loose">
            <div v-if="g === mainLink" class="w-accent text-xs">Main skill</div>
            <GemChain :group="g" />
          </div>
        </template>

        <template v-if="layout.linked.length">
          <div :class="$style.heading">{{ layout.main || layout.loose.length ? 'Other links' : 'Gear' }}<template v-if="shownItemSet && itemSets.length > 1"> · {{ shownItemSet.title }}</template></div>
          <div v-for="r in layout.linked" :key="r.slot" :class="$style.rowWrap">
            <GearRowHead :row="r" />
            <div v-if="r.groups.length" :class="$style.chains">
              <GemChain v-for="(g, i) in r.groups" :key="i" :group="g" />
            </div>
          </div>
        </template>

        <template v-if="layout.plain.length">
          <div :class="$style.heading">Other gear</div>
          <div :class="$style.plain">
            <GearRowHead v-for="r in layout.plain" :key="r.slot" :row="r" small />
          </div>
        </template>

        <template v-if="details.trees.length > 1">
          <div :class="$style.heading">Passive trees</div>
          <a v-for="t in details.trees" :key="t.title + t.url" :href="safeUrl(t.url)" target="_blank"
            class="block w-trunc py-0.5 hover:underline" :class="t === loadout?.tree ? '' : 'w-dim'">
            <i class="fas fa-external-link-alt text-xs w-faint" /> {{ t.title }}<span v-if="t === loadout?.tree" class="w-accent"> · now</span>
          </a>
        </template>
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
          <div v-else-if="skillSets.length > 1" class="w-dim pb-1">Uses {{ shownSet?.title }}<template v-if="shownItemSet && shownItemSet.title !== shownSet?.title"> and {{ shownItemSet.title }}</template>.</div>
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
  </WPanel>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, shallowRef, watch } from 'vue'
import { WPanel, WButton, WEmpty, WTabs, WChip, WKbd } from '../ui'
import { AppConfig, saveConfig } from '@/web/Config'
import { CAMPAIGN_TYPE } from '../campaign/widget'
import type { CampaignWidget } from '../campaign/widget'
import { LOOT_FILTER_TYPE } from '../loot-filter/widget'
import type { LootFilterWidget } from '../loot-filter/widget'
import type { BuildRuleSwitches } from '../loot-filter/build-rules'
import GearRowHead from './GearRowHead.vue'
import GemChain from './GemChain.vue'
import GemName from './GemName.vue'
import SocketDots from './SocketDots.vue'
import { nextGems } from './gems'
import type { NextGem } from './gems'
import {
  gearLayout, itemSetsOf, linkColours, linkGroups, loadoutOf, mainGroupOf, noteRuns, orderedGems,
  relevantGems, skillSetsOf
} from './build-model'
import { hideTip } from '../ui/tooltip/tooltip'
import { pobApi } from './widget'
import type { LoadoutPick, PobBuildEntry, PobBuildsWidget, PobDetails } from './widget'
import { useActiveBuild } from './active'

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

const tab = shallowRef<'leveling' | 'gear' | 'filter' | 'notes'>('leveling')
// The hovered row leaves with the tab, so no mouseleave comes.
watch(tab, hideTip)
onBeforeUnmount(hideTip)
const tabOptions = [
  { value: 'leveling', label: 'Leveling' },
  { value: 'gear', label: 'Gear' },
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

// ---- loadout: saved per build, so the campaign card, the price check and
// the filter rules see the same sets as this panel ----

const AUTO_HINT = 'Go back to following your level'
const pick = computed<LoadoutPick | undefined>(() => props.config.loadouts[props.entry.relPath])
const loadout = computed(() => props.details ? loadoutOf(props.details, level.value, act.value, pick.value) : null)

function setPick (next: LoadoutPick | null) {
  const rest = Object.fromEntries(Object.entries(props.config.loadouts).filter(([rel]) => rel !== props.entry.relPath))
  props.config.loadouts = next ? { ...rest, [props.entry.relPath]: next } : rest
  saveConfig()
}

function clearPick () {
  setPick(null)
}

function pickHint (inUse: boolean, byHand: boolean, byStage?: boolean) {
  if (!inUse) return 'Use this loadout in every window'
  if (byHand) return 'Picked by hand. Click to go back to following your level'
  return byStage ? 'Picked from your level. Click to keep this one' : 'The set active in PoB. Click to keep this one'
}

// Drops one kind from the pick; nothing left means auto.
function withoutKind (kind: keyof LoadoutPick): LoadoutPick | null {
  const next: LoadoutPick = { ...pick.value, [kind]: undefined }
  return next.skillSet || next.itemSet ? next : null
}

// Clicking the set you picked by hand unpicks just that one; any other click
// pins it. A skill set takes its same-named item set and tree along.
function chooseSkillSet (title: string) {
  setPick(pick.value?.skillSet === title ? withoutKind('skillSet') : { skillSet: title })
}

// Item sets can differ from the skill set, so the skill set stays as it was.
function chooseItemSet (title: string) {
  setPick(pick.value?.itemSet === title ? withoutKind('itemSet') : { ...pick.value, itemSet: title })
}

// ---- leveling ----

const skillSets = computed(() => props.details ? skillSetsOf(props.details) : [])
const shownSet = computed(() => loadout.value?.skillSet?.item ?? null)
const shownLinks = computed(() => shownSet.value ? linkGroups(shownSet.value.groups, 4) : [])

const className = computed(() => build.className.value || props.details?.ascendClassName || props.details?.className || '')
const gems = computed(() => props.details
  ? nextGems(props.details, level.value, className.value, relevantGems(props.details, level.value, act.value, pick.value))
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
const shownItemSet = computed(() => loadout.value?.itemSet?.item ?? null)
const mainLink = computed(() => shownSet.value ? mainGroupOf(shownSet.value.groups) : null)
const layout = computed(() => gearLayout(shownItemSet.value?.slots ?? [], shownSet.value?.groups ?? []))
const hasGear = computed(() => Boolean(layout.value.main || layout.value.loose.length || layout.value.linked.length || layout.value.plain.length))

// One row of chips while skill and item sets go together, where a pick moves
// both; two when PoB's names differ or the two are showing different sets.
const setChips = computed(() => {
  const skills = skillSets.value
  const items = itemSets.value
  const titles = (sets: Array<{ title: string }>) => sets.map(s => s.title).sort().join('\n')
  const together = skills.length > 1 && titles(skills) === titles(items) && shownSet.value?.title === shownItemSet.value?.title
  const skillChips = skills.map(set => ({
    title: set.title,
    active: set === shownSet.value,
    hint: pickHint(set === shownSet.value, pick.value?.skillSet === set.title, loadout.value?.skillSet?.byStage),
    choose: () => chooseSkillSet(set.title)
  }))
  if (together) return [{ label: '', first: true, chips: skillChips }]
  const itemChips = items.map(set => ({
    title: set.title,
    active: set === shownItemSet.value,
    hint: pickHint(set === shownItemSet.value, pick.value?.itemSet === set.title, loadout.value?.itemSet?.byStage),
    choose: () => chooseItemSet(set.title)
  }))
  const rows: Array<{ label: string, first: boolean, chips: typeof skillChips }> = []
  if (skills.length > 1) rows.push({ label: 'Gems', first: true, chips: skillChips })
  if (items.length > 1) rows.push({ label: 'Gear', first: !rows.length, chips: itemChips })
  return rows
})

const treeUrl = computed(() => {
  const tree = loadout.value?.tree ?? props.details?.trees[0]
  return tree ? safeUrl(tree.url) : undefined
})

function openTree () {
  if (treeUrl.value) window.open(treeUrl.value)
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
.rowWrap {
  padding: 4px 0 5px;
  border-bottom: 1px solid var(--w-line-soft);
  min-width: 0;
}
.main {
  margin-top: 6px;
  padding: 6px;
  background: var(--w-accent-soft);
  border: 1px solid var(--w-line-strong);
  border-radius: var(--w-r-sm);
}
/* Under the item's name, past its art. */
.chains {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 4px 0 0 52px;
  min-width: 0;
}
.loose {
  padding: 4px 0 5px;
  border-bottom: 1px solid var(--w-line-soft);
}
.plain {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 2px 10px;
}
</style>
