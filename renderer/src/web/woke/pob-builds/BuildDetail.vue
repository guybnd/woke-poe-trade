<template>
  <WPanel :title="entry.name" size-key="detail" width="25rem" max-height="70vh">
    <template #actions>
      <button @click="emit('close')" class="w-icon-btn" title="Close"><i class="fas fa-times" /></button>
    </template>
    <template #toolbar>
      <WButton size="sm" :variant="isActive ? 'default' : 'primary'" :icon="isActive ? 'fas fa-check-circle' : undefined" :disabled="isActive"
        :title="isActive ? 'Other windows use this build' : 'Make other windows use this build'" @click="setActive">{{ isActive ? 'In use' : 'Use build' }}</WButton>
      <WButton size="sm" icon="fas fa-external-link-alt" @click="run(pobApi.open(config, entry.relPath))">Open in PoB</WButton>
      <WButton v-if="trees.length" size="sm" icon="fas fa-project-diagram" title="This loadout's passive tree" @click="emit('tree', loadout?.tree?.title ?? trees[0].title)">Passive tree</WButton>
      <WButton size="sm" variant="ghost" icon="fas fa-ellipsis-h" title="More" @click="moreMenu" />
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

      <div v-if="statCells.length" :class="$style.stats" :title="details?.statsSet ? `Saved in PoB for ${details.statsSet}` : 'Saved in PoB'">
        <div v-for="c in statCells" :key="c.label" :class="$style.stat">
          <span class="w-num" :style="c.tone ? { color: `var(--w-${c.tone})` } : undefined">{{ c.value }}</span>
          <span class="w-faint text-xs">{{ c.label }}</span>
        </div>
        <div v-if="statsElsewhere" :class="$style.statsFor" class="w-faint text-xs">Saved for {{ details?.statsSet }}</div>
      </div>

      <!-- Leveling -->
      <template v-if="details && tab === 'leveling'">
        <div class="w-dim">
          <template v-if="level != null">Level {{ level }}<template v-if="act != null && act <= 10"> · Act {{ act }}</template></template>
          <template v-else>Level unknown: Campaign reads it from Client.txt.</template>
        </div>
        <div v-for="row in setChips" :key="row.label" class="flex flex-wrap items-center gap-1 pt-1">
          <WChip v-if="canUnlink && row.first" clickable :active="linked" :title="linked ? 'Gems, gear and tree move together. Click to pick them apart' : 'Gems and gear are picked apart. Click to move them together'" @click="toggleLinked">
            <i class="fas text-xs" :class="linked ? 'fa-link' : 'fa-unlink'" /><template v-if="!linked"> {{ row.label }}</template>
          </WChip>
          <span v-else-if="row.label" class="w-faint text-xs">{{ row.label }}</span>
          <WChip v-if="pick && row.first" clickable :title="AUTO_HINT" @click="clearPick">Auto</WChip>
          <WChip v-for="(c, i) in row.chips" :key="i" clickable :active="c.active" :title="c.hint" @click="c.choose()">
            <i v-if="pick && c.active" class="fas fa-thumbtack text-xs" /> {{ c.title }}<span v-if="c.active" class="w-accent"> · now</span>
          </WChip>
        </div>
        <div v-if="!isActive" class="pt-1 text-xs" style="color: var(--w-warn);">Other windows use your active build. Press Use build to use this loadout there.</div>
        <NextSection v-if="nextTree || nextGems_ || gearStep" :config="config" :tree="nextTree ?? null" :diff="treeData ? nextTreeDiff : null"
          :gems="nextGems_" :gear="gearStep" :pin="() => nextPin(entry.relPath, entry.name)" @tree="emit('tree', $event)" />
        <div :class="$style.heading">Links<template v-if="shownSet && skillSets.length > 1"> · {{ shownSet.title }}</template></div>
        <div v-for="(g, i) in shownLinks" :key="i" :class="$style.linkGroup">
          <div :class="$style.link">
            <SocketDots :colours="linkColours(g)" />
            <span v-if="linkItem(g)" :class="$style.linkItem" class="ml-auto text-xs whitespace-nowrap"
              @mouseenter="showTip($event, { kind: 'item', item: linkItem(g)! })" @mouseleave="hideTip">{{ g.label || slotLabel(g.slot) }}</span>
            <span v-else-if="g.label || g.slot" class="ml-auto w-faint text-xs whitespace-nowrap">{{ g.label || slotLabel(g.slot) }}</span>
            <PinButton :class="$style.rowPin" :make="() => gemsPin(entry.relPath, shownSet!.groups, g)" title="Pin this gem chain: keep it on screen while you play" />
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
      <template v-else-if="details && tab === 'gear'">
        <div v-for="row in setChips" :key="row.label" class="flex flex-wrap items-center gap-1 pt-1">
          <WChip v-if="canUnlink && row.first" clickable :active="linked" :title="linked ? 'Gems, gear and tree move together. Click to pick them apart' : 'Gems and gear are picked apart. Click to move them together'" @click="toggleLinked">
            <i class="fas text-xs" :class="linked ? 'fa-link' : 'fa-unlink'" /><template v-if="!linked"> {{ row.label }}</template>
          </WChip>
          <span v-else-if="row.label" class="w-faint text-xs">{{ row.label }}</span>
          <WChip v-if="pick && row.first" clickable :title="AUTO_HINT" @click="clearPick">Auto</WChip>
          <WChip v-for="(c, i) in row.chips" :key="i" clickable :active="c.active" :title="c.hint" @click="c.choose()">
            <i v-if="pick && c.active" class="fas fa-thumbtack text-xs" /> {{ c.title }}<span v-if="c.active" class="w-accent"> · now</span>
          </WChip>
        </div>
        <div v-if="!isActive" class="pt-1 text-xs" style="color: var(--w-warn);">Other windows use your active build. Press Use build to use this loadout there.</div>
        <WEmpty v-if="!hasGear" icon="fas fa-tshirt">No items or gems in this set. Add them in PoB to see what to look for.</WEmpty>

        <template v-if="layout.main">
          <div :class="[$style.rowWrap, $style.main]">
            <PinButton :class="$style.cornerPin" :make="() => slotPin(entry.relPath, layout.main!.slot)" title="Pin this item: keep it on screen while you shop" />
            <GearRowHead :row="layout.main" main />
            <div :class="$style.chains">
              <GemChain v-for="(g, i) in layout.main.groups" :key="i" :group="g" />
            </div>
          </div>
        </template>

        <template v-if="layout.loose.length">
          <div :class="$style.heading">Gems PoB doesn't tie to an item</div>
          <div v-for="(g, i) in layout.loose" :key="i" :class="$style.loose">
            <PinButton :class="$style.cornerPin" :make="() => gemsPin(entry.relPath, shownSet!.groups, g)" title="Pin this gem chain: keep it on screen while you play" />
            <div v-if="g === mainLink" class="w-accent text-xs">Main skill</div>
            <GemChain :group="g" />
          </div>
        </template>

        <template v-if="layout.linked.length">
          <div :class="$style.heading">{{ layout.main || layout.loose.length ? 'Other links' : 'Gear' }}<template v-if="shownItemSet && itemSets.length > 1"> · {{ shownItemSet.title }}</template></div>
          <div v-for="r in layout.linked" :key="r.slot" :class="$style.rowWrap">
            <PinButton :class="$style.cornerPin" :make="() => slotPin(entry.relPath, r.slot)" title="Pin this item: keep it on screen while you shop" />
            <GearRowHead :row="r" />
            <div v-if="r.groups.length" :class="$style.chains">
              <GemChain v-for="(g, i) in r.groups" :key="i" :group="g" />
            </div>
          </div>
        </template>

        <template v-if="layout.plain.length">
          <div :class="$style.heading">Other gear</div>
          <div :class="$style.plain">
            <div v-for="r in layout.plain" :key="r.slot" :class="$style.plainRow">
              <GearRowHead :row="r" small />
              <PinButton :class="$style.cornerPin" :make="() => slotPin(entry.relPath, r.slot)" title="Pin this item: keep it on screen while you shop" />
            </div>
          </div>
        </template>

        <BuildCosts :details="details" />

        <template v-if="trees.length > 1">
          <div :class="$style.heading">Passive trees</div>
          <a v-for="t in trees" :key="t.title + t.url" :href="safeUrl(t.url)" target="_blank"
            class="block w-trunc py-0.5 hover:underline" :class="t === loadout?.tree ? '' : 'w-dim'">
            <i class="fas fa-external-link-alt text-xs w-faint" /> {{ t.title }}<span v-if="t === loadout?.tree" class="w-accent"> · now</span>
          </a>
        </template>
      </template>

      <!-- Filter -->
      <template v-else-if="details && tab === 'filter'">
        <WEmpty v-if="!filterWidget" icon="fas fa-filter">Add the Loot filter editor to put rules for this build into your NeverSink filter.</WEmpty>
        <template v-else>
          <div class="w-dim pb-1">
            Rules from the <span class="w-accent">active</span> build go at the top of your saved filter copy.
            Save in the loot filter editor<template v-if="filterWidget.editorHotkey"> (<WKbd :keys="filterWidget.editorHotkey" />)</template> to write them.
          </div>
          <div v-if="!isActive" class="pb-1" style="color: var(--w-warn);">This isn't the active build; press Use build to use it for the filter.</div>
          <div v-else-if="skillSets.length > 1" class="w-dim pb-1">Uses {{ shownSet?.title }}<template v-if="shownItemSet && shownItemSet.title !== shownSet?.title"> and {{ shownItemSet.title }}</template>.</div>
          <div v-for="r in FILTER_ROWS" :key="r.key" class="flex items-center gap-2 py-1">
            <WChip clickable :active="filterWidget.buildRules[r.key]" @click="filterWidget.buildRules[r.key] = !filterWidget.buildRules[r.key]">
              {{ filterWidget.buildRules[r.key] ? 'On' : 'Off' }}
            </WChip>
            <span>{{ r.label }}</span>
          </div>
        </template>
      </template>

      <!-- Trades -->
      <BuildTrades v-else-if="details && tab === 'trades'" :config="config" :entry="entry" />

      <!-- Notes -->
      <template v-else-if="details">
        <div :class="$style.heading" class="flex"><span>Your notes</span><span class="ml-auto normal-case tracking-normal">kept by this app, not in the build file</span></div>
        <textarea :value="myNotes" :class="['w-field', $style.myNotes]" spellcheck="false" rows="4"
          placeholder="What to buy next, what to swap at which act…" @input="editNotes" @blur="saveNotes" />
        <div :class="$style.heading">Regex</div>
        <RegexFolderList :folder="buildRegexFolder(entry.relPath)" />
        <div v-if="details.notes" :class="$style.heading">From the build</div>
        <div v-if="details.notes" class="whitespace-pre-wrap w-dim"><span v-for="(r, i) in noteRuns(details.notesRaw || details.notes)" :key="i" :style="r.colour ? { color: r.colour } : undefined">{{ r.text }}</span></div>
        <div v-else class="w-faint text-xs pt-2">No notes in the build file.</div>
      </template>
    </div>
  </WPanel>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, provide, shallowRef, watch } from 'vue'
import { WPanel, WButton, WEmpty, WTabs, WChip, WKbd, openMenu } from '../ui'
import { buildRegexFolder } from '../regex-library/folder-names'
// Loads with the Notes tab.
const RegexFolderList = defineAsyncComponent(() => import('../regex-library/RegexFolderList.vue'))
import { AppConfig, saveConfig } from '@/web/Config'
import { CAMPAIGN_TYPE } from '../campaign/widget'
import type { CampaignWidget } from '../campaign/widget'
import { LOOT_FILTER_TYPE } from '../loot-filter/widget'
import type { LootFilterWidget } from '../loot-filter/widget'
import type { BuildRuleSwitches } from '../loot-filter/build-rules'
import BuildCosts from './BuildCosts.vue'
import BuildTrades from './BuildTrades.vue'
import GearRowHead from './GearRowHead.vue'
import GemChain from './GemChain.vue'
import GemName from './GemName.vue'
import NextSection from './NextSection.vue'
import SocketDots from './SocketDots.vue'
import PinButton from '../pins/PinButton.vue'
import { gemsPin, nextPin, slotPin } from './build-pins'
import { GEM_CLASS, gemWhere, nextGems } from './gems'
import type { NextGem } from './gems'
import {
  gearLayout, itemSetsOf, linkColours, linkGroups, loadoutOf, mainGroupOf, noteRuns, orderedGems,
  buildDps, gearChange, gemChange, nextSet, realSets, relevantGems, shortNumber, skillSetsOf, slotLabel
} from './build-model'
import { hideTip, showTip } from '../ui/tooltip/tooltip'
import { loadPassiveTree, treeDiff } from './passive-tree'
import type { TreeNode } from './passive-tree'
import { pobApi } from './widget'
import type { LoadoutPick, PobBuildEntry, PobBuildsWidget, PobDetails, PobItem, PobSkillGroup } from './widget'
import { useActiveBuild } from './active'

const props = defineProps<{
  config: PobBuildsWidget
  entry: PobBuildEntry
  details: PobDetails | null
}>()
const emit = defineEmits<{ (e: 'close'): void, (e: 'tree' | 'compare', value: string): void }>()

const build = useActiveBuild()
const level = build.level
const act = build.act
const charName = build.charName
const error = shallowRef('')

const tab = shallowRef<'leveling' | 'gear' | 'filter' | 'notes' | 'trades'>('leveling')
// The hovered row leaves with the tab, so no mouseleave comes.
watch(tab, hideTip)
onBeforeUnmount(hideTip)
const tabOptions = [
  { value: 'leveling', label: 'Leveling' },
  { value: 'gear', label: 'Gear' },
  { value: 'filter', label: 'Filter' },
  { value: 'notes', label: 'Notes' },
  { value: 'trades', label: 'Trades' }
]

const isActive = computed(() => props.config.activeBuild === props.entry.relPath)
const followers = computed(() => Object.entries(props.config.followChars)
  .filter(([, rel]) => rel === props.entry.relPath).map(([name]) => name))
const followsMe = computed(() => props.config.followChars[charName.value] === props.entry.relPath)

function setActive () {
  props.config.activeBuild = props.entry.relPath
  saveConfig()
}

function moreMenu (e: MouseEvent) {
  const name = charName.value
  openMenu(e, [
    { label: 'Compare with another build', icon: 'fas fa-balance-scale', action: () => emit('compare', props.entry.relPath) },
    { label: 'Show file', icon: 'fas fa-folder-open', action: () => run(pobApi.show(props.config, props.entry.relPath)) },
    ...(name
      ? [{
          label: followsMe.value ? `Stop following ${name}` : `Follow ${name}`,
          icon: followsMe.value ? 'fas fa-unlink' : 'fas fa-link',
          action: toggleFollow
        }]
      : [])
  ])
}

// A levelling build is usually saved on its last set, far from where you are.
const statsElsewhere = computed(() => {
  const saved = props.details?.statsSet
  return Boolean(saved && skillSets.value.length > 1 && saved !== shownSet.value?.title)
})

// What PoB saved, for the sets active when it saved.
const statCells = computed(() => {
  const st = props.details?.stats
  if (!st) return []
  const cells: Array<{ label: string, value: string, tone?: 'up' | 'warn' }> = []
  const dps = buildDps(st)
  if (dps) cells.push({ label: 'DPS', value: shortNumber(dps) })
  if (st.Life && st.Life > 1) cells.push({ label: 'life', value: shortNumber(st.Life) })
  if (st.EnergyShield) cells.push({ label: 'ES', value: shortNumber(st.EnergyShield) })
  if (st.TotalEHP) cells.push({ label: 'EHP', value: shortNumber(st.TotalEHP) })
  const res = [st.FireResist, st.ColdResist, st.LightningResist]
  if (res.every(r => r != null)) {
    cells.push({
      label: 'res',
      value: res.join(' / '),
      tone: res.every(r => (r as number) >= 75) ? 'up' : 'warn'
    })
  }
  return cells
})

function toggleFollow () {
  const name = charName.value
  if (!name) return
  const next = Object.fromEntries(Object.entries(props.config.followChars).filter(([n]) => n !== name))
  const off = props.config.followOff.filter(n => n !== name)
  if (followsMe.value) {
    off.push(name)
  } else {
    next[name] = props.entry.relPath
    props.config.activeBuild = props.entry.relPath
  }
  props.config.followChars = next
  props.config.followOff = off
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
  // Linked, a set pick is the whole loadout: unpicking goes back to Auto.
  if (linked.value && canUnlink.value) setPick(pick.value?.skillSet === title && !pick.value.itemSet ? null : { skillSet: title })
  else setPick(pick.value?.skillSet === title ? withoutKind('skillSet') : { skillSet: title })
}

// Item sets can differ from the skill set, so the skill set stays as it was.
function chooseItemSet (title: string) {
  setPick(pick.value?.itemSet === title ? withoutKind('itemSet') : { ...pick.value, itemSet: title })
}

// ---- your notes ----
// Kept in the app's settings by build file: PoB rewrites the whole file when
// it saves, so text written into an open build would be lost.

const myNotes = computed(() => props.config.myNotes?.[props.entry.relPath] ?? '')
let notesTimer: ReturnType<typeof setTimeout> | undefined
function editNotes (e: Event) {
  const text = (e.target as HTMLTextAreaElement).value
  const rest = Object.fromEntries(Object.entries(props.config.myNotes ?? {}).filter(([rel]) => rel !== props.entry.relPath))
  props.config.myNotes = text.trim() ? { ...rest, [props.entry.relPath]: text } : rest
  clearTimeout(notesTimer)
  notesTimer = setTimeout(saveNotes, 600)
}
function saveNotes () {
  clearTimeout(notesTimer)
  notesTimer = undefined
  saveConfig()
}
onBeforeUnmount(() => { if (notesTimer) saveNotes() })

// ---- leveling ----

const skillSets = computed(() => props.details ? skillSetsOf(props.details) : [])
const shownSet = computed(() => loadout.value?.skillSet?.item ?? null)
const shownLinks = computed(() => shownSet.value ? linkGroups(shownSet.value.groups, 4) : [])

const className = computed(() => build.className.value || props.details?.ascendClassName || props.details?.className || '')
provide(GEM_CLASS, className)
const gems = computed(() => props.details
  ? nextGems(props.details, level.value, className.value, relevantGems(props.details, level.value, act.value, pick.value))
  : [])

const campaign = computed(() => AppConfig<CampaignWidget>(CAMPAIGN_TYPE))
const got = computed(() => campaign.value?.state.gemsGot ?? [])
const canTick = computed(() => Boolean(campaign.value))

function gemNote (g: NextGem): string {
  const source = gemWhere(g.name, className.value) || 'Not sold in the campaign: buy or drop'
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
// The item a link group sits on in the shown gear set, for its hover.
function linkItem (g: PobSkillGroup): PobItem | null {
  if (!g.slot) return null
  return shownItemSet.value?.slots.find(x => x.slot === g.slot)?.item ?? null
}
const layout = computed(() => gearLayout(shownItemSet.value?.slots ?? [], shownSet.value?.groups ?? []))
const hasGear = computed(() => Boolean(layout.value.main || layout.value.loose.length || layout.value.linked.length || layout.value.plain.length))

// One row of chips while skill and item sets go together, where a pick moves
// both; two when PoB's names differ or the two are showing different sets.
// Gems and gear move together unless you unlink them for this build.
const linked = computed(() => !(props.config.unlinkedSets ?? []).includes(props.entry.relPath))
// Only sets PoB names alike can move together; differently named ones are
// always picked apart.
const sameNames = computed(() => {
  const titles = (sets: Array<{ title: string }>) => sets.map(s => s.title).sort().join('\n')
  return titles(skillSets.value) === titles(itemSets.value)
})
const canUnlink = computed(() => skillSets.value.length > 1 && itemSets.value.length > 1 && sameNames.value)
function toggleLinked () {
  const rel = props.entry.relPath
  const list = props.config.unlinkedSets ?? []
  if (linked.value) {
    props.config.unlinkedSets = [...list, rel]
  } else {
    props.config.unlinkedSets = list.filter(r => r !== rel)
    // Linking again brings the gear back to the gems' stage.
    if (pick.value?.itemSet) setPick(withoutKind('itemSet'))
  }
  saveConfig()
}

const setChips = computed(() => {
  const skills = skillSets.value
  const items = itemSets.value
  // Linked (the default): one row, and a pick takes the same-named gear set
  // and tree along. Unlinked: gems and gear are picked apart.
  const together = canUnlink.value ? linked.value : skills.length < 2 || items.length < 2
  const skillChips = skills.map(set => ({
    title: set.title,
    active: set === shownSet.value,
    hint: pickHint(set === shownSet.value, pick.value?.skillSet === set.title, loadout.value?.skillSet?.byStage),
    choose: () => chooseSkillSet(set.title)
  }))
  const itemChips = items.map(set => ({
    title: set.title,
    active: set === shownItemSet.value,
    hint: pickHint(set === shownItemSet.value, pick.value?.itemSet === set.title, loadout.value?.itemSet?.byStage),
    choose: () => chooseItemSet(set.title)
  }))
  if (together) return skills.length > 1 || items.length > 1 ? [{ label: '', first: true, chips: skills.length > 1 ? skillChips : itemChips }] : []
  const rows: Array<{ label: string, first: boolean, chips: typeof skillChips }> = []
  if (skills.length > 1) rows.push({ label: 'Gems', first: true, chips: skillChips })
  if (items.length > 1) rows.push({ label: 'Gear', first: !rows.length, chips: itemChips })
  return rows
})

const trees = computed(() => realSets(props.details?.trees ?? []))

// ---- next step ----

const treeData = shallowRef<Map<number, TreeNode> | null>(null)
const nextTree = computed(() => nextSet(trees.value, loadout.value?.tree))
// The names only come once the tree has loaded, which the count doesn't need.
watch(nextTree, (t) => {
  if (t) loadPassiveTree().then(data => { treeData.value = data }, () => {})
}, { immediate: true })
const nextTreeDiff = computed(() => treeDiff(treeData.value, loadout.value?.tree?.nodes ?? [], nextTree.value?.nodes ?? []))

const nextGems_ = computed(() => {
  const from = shownSet.value
  const to = nextSet(skillSets.value, from)
  if (!from || !to) return null
  const change = gemChange(from, to)
  return change.add.length || change.drop.length ? { title: to.title, change } : null
})

const gearStep = computed(() => {
  const from = shownItemSet.value
  const to = nextSet(itemSets.value, from)
  if (!from || !to) return null
  const changes = gearChange(from, to)
  return changes.length ? { title: to.title, changes } : null
})

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
.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 16px;
  padding: 2px 0 6px;
  border-bottom: 1px solid var(--w-line-soft);
}
.statsFor { flex-basis: 100%; }
.stat {
  display: flex;
  flex-direction: column;
  white-space: nowrap;
}
.myNotes {
  width: 100%;
  min-height: 5.5rem;
  padding: 6px 8px;
  resize: vertical;
  line-height: 1.4;
  font-size: var(--w-fs-md);
}
.heading {
  padding: 8px 0 2px;
  font-size: var(--w-fs-caps);
  text-transform: var(--w-caps-case);
  letter-spacing: 0.08em;
  color: var(--w-faint);
  font-family: var(--w-caps-face);
}
.linkItem {
  color: var(--w-dim);
  text-decoration: underline dotted;
  text-underline-offset: 3px;
  cursor: default;
}
.linkItem:hover { color: var(--w-fg); }
.link {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 3px 0;
}
/* Pins show on the row under the mouse, or once pinned. */
.cornerPin { position: absolute; top: 2px; right: 0; z-index: 1; }
.plainRow { position: relative; min-width: 0; }
.rowPin { flex: none; }
.cornerPin:not([aria-pressed="true"]), .rowPin:not([aria-pressed="true"]) { opacity: 0; }
.rowWrap:hover .cornerPin, .loose:hover .cornerPin, .plainRow:hover .cornerPin, .linkGroup:hover .rowPin,
.cornerPin:focus-visible, .rowPin:focus-visible { opacity: 1; }
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
button.next:hover { border-color: var(--w-line-strong); }
.rowWrap {
  position: relative;
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
  position: relative;
  padding: 4px 0 5px;
  border-bottom: 1px solid var(--w-line-soft);
}
.plain {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 2px 10px;
}
</style>
