<template>
  <WPanel ref="panel" :title="config.wmTitle || 'Loot filter'" icon="wisdom" width="68rem" max-height="85vh" :scroll="false"
    :busy="store.loading.value && !!store.doc.value" :hotkey="config.editorHotkey ?? undefined">
    <template #actions>
      <span v-if="config.sampleHotkey" class="w-dim text-xs flex items-center gap-1" title="Works on your inventory, stash and labels on the ground. Hold Alt to reach items your filter hides.">
        Find an item's rule: in game, hover it and press <WKbd :keys="config.sampleHotkey" />
      </span>
      <button class="w-icon-btn" title="Close" @click="emit('close')"><i class="fas fa-times" /></button>
    </template>
    <template #toolbar>
      <WButton v-if="trail.length" size="sm" variant="ghost" icon="fas fa-arrow-left" title="Back to where you were (mouse back button)" @click="goBack">Back</WButton>
      <WSelect :model-value="sourceKey" :options="fileOptions" style="max-width: 20rem;" @update:model-value="pickSource" />
      <WButton size="sm" variant="ghost" icon="fas fa-sync" title="Reload the file list and the filter" @click="refresh" />
      <WField v-model="search" type="search" icon="fas fa-search" placeholder="Find an item or base type" style="width: 16rem;" />
      <span class="grow" />
      <WTabs v-model="tab" :options="tabOptions" />
    </template>
    <template v-if="store.error.value || banner" #banner>
      <WBanner v-if="store.error.value">{{ store.error.value }}
        <template #actions><WButton size="sm" @click="refresh">Retry</WButton></template>
      </WBanner>
      <WBanner v-else-if="banner" :tone="banner.tone">{{ banner.text }}
        <template #actions><WButton v-for="a in banner.actions" :key="a.label" size="sm" :variant="a.primary ? 'primary' : 'ghost'" @click="a.run()">{{ a.label }}</WButton></template>
      </WBanner>
    </template>

    <div v-if="!store.doc.value && store.loading.value" :class="$style.layout" aria-busy="true">
      <WSkeleton :rows="10" :value="true" />
      <WSkeleton :rows="8" :value="false" />
      <WSkeleton :rows="5" :value="false" />
    </div>
    <WEmpty v-else-if="!store.doc.value" :art="{ item: 'Orb of Scouring' }">
      <template v-if="store.error.value">The filter couldn't be read. Pick another one above, or fix the file and press Retry.</template>
      <template v-else>Pick a NeverSink filter from your filter folder above. If the list is empty, download one from FilterBlade or NeverSink's GitHub first.</template>
      <template #actions><WButton size="sm" icon="fas fa-folder-open" @click="openFolder">Open filter folder</WButton></template>
    </WEmpty>

    <div v-else-if="tab === 'rules'" :class="$style.layout">
      <!-- groups -->
      <div :class="$style.tree" class="w-scroll">
        <div class="flex items-center gap-2" :class="$style.rulesHead">
          <span class="w-group-label">Your rules</span>
          <span class="grow" />
          <WButton size="sm" variant="ghost" icon="fas fa-plus" title="Make a rule from any conditions, above NeverSink's" @click="newOwnRule">New rule</WButton>
        </div>
        <WListItem v-if="config.rules.length" :active="selType === RULE_TYPE" @select="selectRules()">
          <span class="flex justify-between gap-2 w-full min-w-0">
            <span class="w-trunc">Rules you made</span>
            <span class="w-faint text-xs w-num">{{ config.rules.length }}</span>
          </span>
        </WListItem>
        <template v-for="sec in tree.filter(x => x.groups.some(g => g.type !== RULE_TYPE))" :key="sec.title">
          <div class="w-group-label w-trunc" :title="sec.title">{{ sec.title }}</div>
          <WListItem v-for="g in sec.groups.filter(x => x.type !== RULE_TYPE)" :key="g.type" :active="g.type === selType" @select="selectGroup(g.type)"
            @contextmenu="groupMenu($event, g.type)">
            <span class="flex justify-between gap-2 w-full min-w-0" :class="{ [$style.off]: g.hidden }">
              <span class="w-trunc">{{ shortName(g) }}</span>
              <span class="w-faint text-xs w-num">{{ g.tiers.length }}</span>
            </span>
          </WListItem>
        </template>
      </div>

      <!-- tiers or search results -->
      <div :class="$style.mid" class="w-scroll">
        <template v-if="search.trim().length >= 2">
          <div class="w-group-label">Search results</div>
          <WEmpty v-if="!results.length" icon="fas fa-search">No rule lists an item matching "{{ search }}".</WEmpty>
          <WListItem v-for="r in results" :key="`${r.base}|${r.type}|${r.tier}`" @select="jumpTo(r.type, r.tier, r.base)">
            <span class="flex items-center gap-2 w-full min-w-0">
              <LabelPreview :text="r.base" :actions="r.block.actions" :visibility="r.block.visibility" :extras="false" />
              <span class="grow" />
              <span class="w-dim text-xs w-trunc">{{ groupName(r.type) }} › {{ r.tier }}</span>
            </span>
          </WListItem>
        </template>

        <template v-else-if="selType === RULE_TYPE">
          <div class="flex items-center gap-2" :class="$style.groupHead">
            <span :class="$style.groupTitle">Rules you made</span>
            <span class="w-faint text-xs">top of the filter, first one wins</span>
          </div>
          <button v-for="r in config.rules" :key="r.id" class="w-focusable" :class="[$style.tierRow, { [$style.active]: r.id === editingRuleId, [$style.off]: !r.on || ruleProblem(r) }]"
            @click="editingRuleId = r.id" @contextmenu="ruleMenu($event, r)">
            <span :class="$style.tierName" :title="r.name">{{ r.name }}</span>
            <LabelPreview :text="r.conditions.find(c => c.key === 'BaseType')?.values[0] ?? r.name" :style-override="r.patch" :visibility="r.visibility" style="max-width: 100%; overflow: hidden;" />
            <span :class="$style.bases" class="w-trunc">
              <span v-if="ruleProblem(r)" style="color: var(--w-warn);">{{ ruleProblem(r) }}</span>
              <template v-else>{{ r.on ? '' : 'off · ' }}{{ ruleSummary(r) }}</template>
            </span>
          </button>
        </template>

        <template v-else-if="group">
          <div class="flex items-center gap-2" :class="$style.groupHead">
            <span :class="$style.groupTitle" class="w-trunc">{{ groupName(group.type) }}</span>
            <span class="w-faint text-xs">{{ group.tiers.length }} tiers · {{ group.blockCount }} rules</span>
            <span class="grow" />
            <WButton v-if="!isOwnGroup" size="sm" variant="ghost" @click="toggleGroup">{{ groupHiddenByMe ? 'Show group again' : 'Hide whole group' }}</WButton>
          </div>
          <button v-for="t in group.tiers" :key="t.tier" class="w-focusable" :class="[$style.tierRow, { [$style.active]: t.tier === selTier, [$style.off]: t.disabled, [$style.dropOk]: dragOver === t.tier }]"
            @click="selTier = t.tier; picked = []" @contextmenu="tierMenu($event, t)"
            @dragover="onDragOver(t, $event)" @dragleave="dragOver = dragOver === t.tier ? null : dragOver" @drop="onDrop(t, $event)">
            <span :class="$style.tierName" :title="t.tier">{{ t.tier.startsWith('#') ? 'rule' : t.tier }}</span>
            <LabelPreview :text="t.bases[0] ?? previewName(t)" :actions="firstLive(t).actions" :visibility="t.disabled ? 'Hide' : t.visibility" style="max-width: 100%; overflow: hidden;" />
            <span :class="$style.bases" class="w-trunc">
              <template v-if="t.bases.length">{{ t.bases.slice(0, 5).join(' · ') }}<span v-if="t.bases.length > 5" class="w-faint"> · +{{ t.bases.length - 5 }}</span></template>
              <span v-else class="w-faint">{{ conditionSummary(t) }}</span>
            </span>
          </button>
        </template>
      </div>

      <!-- selected tier -->
      <div :class="$style.side" class="w-scroll">
        <template v-if="selType === RULE_TYPE">
          <RuleBuilder v-if="editingRule" :key="editingRule.id" :store="store" :rule="editingRule" @delete="deleteRule(editingRule)" />
          <WEmpty v-else icon="fas fa-sliders-h">Pick a rule to change it, or make a new one.</WEmpty>
        </template>
        <template v-else-if="tier">
          <div :class="$style.groupTitle">{{ tier.tier.startsWith('#') ? 'Rule' : tier.tier }}</div>
          <div class="text-xs w-faint">{{ tier.blocks.length > 1 ? `${tier.blocks.length} rules` : `line ${tier.blocks[0].line}` }}<span v-if="tier.disabled"> · commented out in the filter</span></div>
          <StyleEditor v-if="!tier.tier.startsWith('#')" :look="readStyle(firstLive(tier).actions)" :visibility="firstLive(tier).visibility"
            :preview-text="tier.bases[0] ?? previewName(tier)" :copy-from="copyFrom"
            @patch="patchTier" @visibility="setTierVisibility" />
          <div v-else class="text-xs w-dim">This rule has no $tier tag, so it can't be edited by tier.</div>

          <template v-if="tier.bases.length && !isOwnGroup">
            <div class="w-group-label" style="padding: 8px 0 2px;">Items in this tier</div>
            <div class="flex flex-wrap gap-1">
              <WChip v-for="b in tier.bases" :key="b" clickable :active="picked.includes(b)" draggable="true"
                :title="'Drag onto a tier to move it. Shift-click to pick several.'"
                @click="pickBase(b, $event)" @dragstart="onDragStart(b, $event)" @dragend="dragOver = null">{{ b }}</WChip>
            </div>
            <div v-if="!picked.length" class="w-faint text-xs" style="margin-top: 4px;">Drag an item onto a tier in the middle to move it; shift-click to pick several.</div>
            <div v-if="picked.length" class="flex items-center gap-2 text-sm" style="margin-top: 6px;">
              <span class="w-dim">Move {{ picked.length > 1 ? `${picked.length} items` : picked[0] }} to</span>
              <select :class="$style.select" value="" aria-label="Target tier" @change="moveBase(($event.target as HTMLSelectElement).value)">
                <option value="" disabled>tier…</option>
                <option v-for="t in targets" :key="t" :value="t" :disabled="t === tier.tier">{{ t }}</option>
              </select>
            </div>
          </template>
          <WButton v-if="isOwnGroup && ownEditFor(tier)" size="sm" variant="ghost" icon="fas fa-trash" @click="removeEdit(ownEditFor(tier)!)">Remove this own rule</WButton>
        </template>
        <WEmpty v-else icon="fas fa-layer-group">Pick a tier to restyle it or move its items.</WEmpty>
      </div>
    </div>

    <!-- Rendered below, kept alive so Back returns to the same pile. -->
    <template v-else-if="tab === 'preview'" />
    <PresetsTab v-else-if="tab === 'presets'" :store="store" :config="config" />
    <PricesTab v-else-if="tab === 'prices'" :store="store" :config="config" :anchor="panel?.el" />
    <NeverSinkTab v-else-if="tab === 'neversink'" :store="store" :config="config" :anchor="panel?.el" />

    <!-- build rules -->
    <div v-else-if="tab === 'build'" :class="$style.changes" class="w-scroll">
      <WEmpty v-if="!buildInput" icon="fas fa-user-cog">
        No active build. Pick one in PoB builds and press "Make active"; its gems, link colours and uniques can then be added to your filter here.
      </WEmpty>
      <template v-else>
        <div class="w-dim text-sm" :class="$style.buildIntro">
          Rules for <span class="w-accent">{{ buildInput.buildName }}</span> go at the top of your saved copy, ahead of NeverSink's own.
          They follow the active build, and you can restyle them under Rules › Your build.
        </div>
        <div v-for="r in buildRows" :key="r.key" :class="$style.changeRow">
          <WChip clickable :active="config.buildRules[r.key]" :title="config.buildRules[r.key] ? 'Turn off' : 'Turn on'" @click="config.buildRules[r.key] = !config.buildRules[r.key]">
            {{ config.buildRules[r.key] ? 'On' : 'Off' }}
          </WChip>
          <span class="grow min-w-0 flex flex-col">
            <span>{{ r.label }}</span>
            <span class="w-dim text-xs w-trunc" :title="r.detail">{{ r.detail }}</span>
          </span>
          <LabelPreview v-if="r.block" :text="r.sample" :actions="r.block.actions" :visibility="r.block.visibility" />
          <span v-else-if="config.buildRules[r.key]" class="w-faint text-xs">nothing to add</span>
        </div>
      </template>
    </div>

    <!-- changes -->
    <div v-else :class="$style.changes" class="w-scroll">
      <div v-if="store.problems.value.length" :class="$style.problems">
        <div v-for="(p, i) in store.problems.value.slice(0, 6)" :key="i" class="text-sm">
          <i class="fas fa-exclamation-triangle" style="color: var(--w-down);" /> {{ describeProblem(p) }}
          <WButton v-if="p.block.type && p.block.tier" size="sm" variant="ghost" @click="jumpTo(p.block.type!, p.block.tier!)">Open rule</WButton>
        </div>
      </div>
      <WEmpty v-if="!config.edits.length" icon="fas fa-pen">No changes yet. Sample an item with <WKbd v-if="config.sampleHotkey" :keys="config.sampleHotkey" /> or edit a tier here.</WEmpty>
      <div v-for="s in store.statuses.value" :key="s.edit.id" :class="[$style.changeRow, { [$style.failed]: !s.ok }]">
        <i :class="iconFor(s.edit.kind)" class="w-dim" />
        <span class="grow min-w-0">
          <span class="w-trunc">{{ describeEdit(s.edit) }}</span>
          <span v-if="!s.ok" class="text-xs" style="color: var(--w-warn);"> · {{ s.message }}</span>
        </span>
        <WSelect v-if="!s.ok && homes(s.edit).length" :model-value="''" style="max-width: 16rem;"
          :options="[{ value: '', label: 'Give it a new home…' }, ...homes(s.edit).map((o, i) => ({ value: String(i), label: o.label }))]"
          @update:model-value="v => v !== '' && store.replaceEdit(rehome(s.edit, homes(s.edit)[Number(v)]))" />
        <WButton size="sm" variant="ghost" icon="fas fa-undo" title="Drop this change (you can bring it back from the note)" @click="removeEdit(s.edit)">Drop</WButton>
      </div>
      <div class="w-group-label" :class="$style.historyLabel">Share</div>
      <div :class="$style.changeRow">
        <i class="fas fa-share-alt w-dim" />
        <span class="grow min-w-0 text-sm w-dim">Your changes, own rules and presets as one code, for a friend or your other PC.</span>
        <WButton size="sm" :icon="copied === 'share' ? 'fas fa-check' : 'fas fa-copy'" @click="copyShareCode">{{ copied === 'share' ? 'Copied' : 'Copy code' }}</WButton>
      </div>
      <div :class="$style.changeRow">
        <i class="fas fa-paste w-dim" />
        <WField v-model="shareInput" placeholder="Paste a code (WOKEF1.…)" aria-label="Changes code" style="flex: 1; min-width: 0;" />
        <WButton size="sm" :disabled="!shareInput.trim()" @click="readShareCode">Read</WButton>
      </div>
      <div v-if="shared" :class="$style.changeRow">
        <i class="fas fa-box-open w-dim" />
        <span class="grow min-w-0 text-sm">This code has {{ describeShared(shared) }}.</span>
        <WButton size="sm" variant="ghost" @click="useShared('add')">Add to mine</WButton>
        <WButton size="sm" variant="primary" @click="useShared('replace')">Replace mine</WButton>
      </div>
      <template v-if="config.history.length">
        <div class="w-group-label" :class="$style.historyLabel">Earlier saves</div>
        <div v-for="h in config.history" :key="h.ts" :class="$style.changeRow">
          <i class="fas fa-history w-dim" />
          <span class="grow min-w-0 w-trunc">{{ h.label }}</span>
          <span class="w-faint text-xs w-num" :title="new Date(h.ts).toLocaleString()">{{ agoPhrase(h.ts) }}</span>
          <WButton size="sm" variant="ghost" title="Put your changes back the way they were at this save" @click="restoreSave(h.ts)">Go back to this</WButton>
        </div>
      </template>
    </div>

    <KeepAlive>
      <PreviewTab v-if="store.doc.value && tab === 'preview'" :store="store" :config="config" :anchor="panel?.el" @open-rule="openRule" />
    </KeepAlive>

    <template #footer>
      <div class="flex items-center gap-2 w-full">
        <span class="text-xs grow w-trunc" :style="store.error.value ? 'color: var(--w-down)' : ''" :class="store.error.value ? '' : 'w-dim'">
          <template v-if="store.error.value">{{ store.error.value }}</template>
          <template v-else>
            Saves to <span class="w-num">{{ outName }}</span>
            <span v-if="config.sourceOnline" style="color: var(--w-warn);" title="Edits can't be written into an online filter, so they go into a local copy. Pick that copy in game. When the online filter updates, reopen the editor and save again."> (local copy: won't auto-update)</span>
            <template v-if="store.dirty.value"> · unsaved changes</template><template v-else-if="store.lastSaved.value"> · saved</template>
            <template v-if="store.pendingReload.value"> · reloads when you're next in town or hideout</template>
          </template>
        </span>
        <WButton size="sm" variant="ghost" icon="fas fa-folder-open" @click="openFolder">Folder</WButton>
        <WButton v-if="config.reloadViaChat && store.outputSaved.value" size="sm" variant="ghost" title="Type /itemfilter in chat now to reload the saved filter" @click="store.reloadInGame(true)">Reload now</WButton>
        <WButton size="sm" variant="primary" :disabled="store.saving.value || !store.doc.value" @click="store.save({ reloadNow: true })">{{ config.reloadViaChat ? 'Save + reload' : 'Save' }}</WButton>
      </div>
    </template>
  </WPanel>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { WPanel, WButton, WSelect, WField, WTabs, WListItem, WChip, WEmpty, WKbd, WBanner, WSkeleton, agoPhrase, openMenu, toast, useCopy } from '../ui'
import { copyText } from '../ui/copy'
import LabelPreview from './LabelPreview.vue'
import PricesTab from './PricesTab.vue'
import PreviewTab from './PreviewTab.vue'
import PresetsTab from './PresetsTab.vue'
import RuleBuilder from './RuleBuilder.vue'
import { RULE_TYPE, newRule, ruleProblem, ruleSummary } from './rules'
import type { OwnRule } from './rules'
import { decodeChanges, describeShared, encodeChanges } from './share'
import type { SharedChanges } from './share'
import NeverSinkTab from './NeverSinkTab.vue'
import { LEVEL_NAMES } from './strictness'
import { describeProblem } from './validate'
import StyleEditor from './StyleEditor.vue'
import type { LootFilterStore } from './store'
import { outputName } from './widget'
import type { LootFilterWidget } from './widget'
import { OWN_RULE_TYPE, describeEdit, moveTargets, nextEditId, readStyle, rehome, rehomeOptions, slug } from './edits'
import type { RehomeOption } from './edits'
import type { FilterEdit, StylePatch } from './edits'
import type { Visibility } from './parse'
import { buildTree, findBase, groupName } from './groups'
import type { GroupNode, TierNode } from './groups'
import { hostRequest } from '../shared/host'
import { BUILD_RULE_TYPE, LEVELLING_BELOW, WEAPON_CLASSES } from './build-rules'
import type { BuildRuleSwitches } from './build-rules'
import { COLOUR_NAME } from '../pob-builds/build-model'

const props = defineProps<{
  store: LootFilterStore
  config: LootFilterWidget
  // Group/tier to show first (from the sample card).
  focus?: { type: string, tier: string } | null
}>()

const emit = defineEmits<{ (e: 'close'): void }>()

const tab = ref<'rules' | 'preview' | 'presets' | 'prices' | 'neversink' | 'build' | 'changes'>('rules')
const search = ref('')
const selType = ref<string | null>(null)
const selTier = ref<string | null>(null)
// Bases picked in the selected tier (shift-click adds), to move or drag.
const picked = ref<string[]>([])
const dragOver = ref<string | null>(null)
// The own rule open in the rule builder.
const editingRuleId = ref<number | null>(null)
const editingRule = computed(() => props.config.rules.find(r => r.id === editingRuleId.value) ?? null)

const tree = computed(() => props.store.doc.value ? buildTree(props.store.doc.value) : [])
const allGroups = computed(() => tree.value.flatMap(s => s.groups))
const group = computed<GroupNode | null>(() => allGroups.value.find(g => g.type === selType.value) ?? null)
const tier = computed<TierNode | null>(() => group.value?.tiers.find(t => t.tier === selTier.value) ?? null)
const isOwnGroup = computed(() => selType.value === OWN_RULE_TYPE)
const results = computed(() => props.store.doc.value ? findBase(props.store.doc.value, search.value) : [])
const targets = computed(() => props.store.doc.value && selType.value ? moveTargets(props.store.doc.value, selType.value) : [])
const outName = computed(() => props.config.sourceName ? outputName(props.config) : '—')

const tabOptions = computed(() => [
  { value: 'rules', label: 'Rules' },
  { value: 'preview', label: 'Preview' },
  { value: 'presets', label: 'Presets', count: Object.values(props.config.presets).filter(x => x.on).length || undefined },
  { value: 'prices', label: 'Prices', count: props.store.plan.value?.moves.length || undefined },
  { value: 'neversink', label: props.config.neversink.on ? `NeverSink · ${LEVEL_NAMES[props.config.neversink.level]}` : 'NeverSink', count: props.store.updateReady.value ? 1 : undefined },
  { value: 'build', label: 'Build', count: props.store.buildBlockCount.value || undefined },
  { value: 'changes', label: 'Changes', count: props.config.edits.length }
])

// ---- build rules ----

const buildInput = computed(() => props.store.buildInput.value)

function buildBlock (tier: string) {
  return props.store.doc.value?.blocks.find(b => b.type === BUILD_RULE_TYPE && b.tier === tier) ?? null
}

const buildRows = computed(() => {
  const input = buildInput.value
  if (!input) return []
  const list = (xs: string[]) => xs.length > 4 ? `${xs.slice(0, 4).join(', ')} +${xs.length - 4}` : xs.join(', ')
  const coloured = input.linkColours.filter(c => c !== 'w')
  const rows: Array<{ key: keyof BuildRuleSwitches, label: string, detail: string, tier: string, sample: string }> = [
    { key: 'gems', label: 'Show my gems', tier: 'gems', sample: input.gems[0] ?? 'Gem', detail: `${input.gems.length} gems, while levelling (area level below ${LEVELLING_BELOW})` },
    { key: 'links', label: 'Linked items in my colours', tier: coloured.length >= 4 ? 'links4' : 'links3', sample: 'Linked item', detail: coloured.length >= 2 ? `${coloured.map(c => COLOUR_NAME[c]).join('-')} main link, 3- and 4-links, while levelling` : 'The main link needs 2+ coloured gems' },
    { key: 'uniques', label: 'My uniques', tier: 'uniques', sample: input.uniqueBases[0] ?? 'Unique', detail: input.uniqueBases.length ? `Bases: ${list(input.uniqueBases)}` : 'No uniques in the build' },
    { key: 'bases', label: 'My rare bases', tier: 'bases', sample: input.rareBases[0] ?? 'Rare', detail: input.rareBases.length ? list(input.rareBases) : 'No rare items in the item set for your level' },
    { key: 'hideWeapons', label: 'Hide other weapon types while levelling', tier: 'otherweapons', sample: 'Other weapon', detail: input.weaponClasses.length ? `White and blue only; keeps ${input.weaponClasses.join(', ')} (${WEAPON_CLASSES.length - input.weaponClasses.length} types hidden)` : 'No weapon in the build' }
  ]
  return rows.map(r => ({ ...r, block: props.config.buildRules[r.key] ? buildBlock(r.tier) : null }))
})

// Online filters are keyed "online:<id>" in the picker; GitHub is "github".
const sourceKey = computed(() => props.config.neversink.on ? 'github' : props.config.sourceOnline ? `online:${props.config.sourceName}` : props.config.sourceName)

const fileOptions = computed(() => {
  const opts = props.store.files.value
    .map(f => f.online
      ? { value: `online:${f.name}`, label: `${f.title ?? f.name} (online, read only)` }
      : { value: f.name, label: f.name.replace(/\.filter$/i, '') })
  opts.unshift({ value: 'github', label: 'NeverSink from GitHub (keeps itself up to date)' })
  if (props.config.sourceName && !props.config.neversink.on && !opts.some(o => o.value === sourceKey.value)) {
    opts.unshift({ value: sourceKey.value, label: props.config.sourceOnline ? `${props.config.sourceTitle} (online)` : props.config.sourceName.replace(/\.filter$/i, '') })
  }

  return opts
})

interface BannerAction { label: string, run: () => void, primary?: boolean }
const banner = computed<{ text: string, tone: 'warn' | 'info', actions: BannerAction[] } | null>(() => {
  const s = props.store
  const failed = s.failed.value.length
  const review = { label: 'Review changes', run: () => { tab.value = 'changes' } }
  if (s.updatedSinceSave.value) {
    const total = s.statuses.value.length
    return { tone: 'warn', actions: [review], text: `NeverSink ${s.baseVersion.value} found (you last saved against ${props.config.lastVersion}). ${total - failed} of ${total} changes reapplied${failed ? `, ${failed} need a new home under Changes` : ''}. Save to update the game's copy.` }
  }
  if (failed) return { tone: 'warn', actions: [review], text: `${failed} change${failed > 1 ? 's need' : ' needs'} a new home in this filter version. See Changes.` }
  if (s.problems.value.length) return { tone: 'warn', actions: [review], text: 'The game would reject this filter as it is. See Changes for the rule to fix.' }
  const ready = s.updateReady.value
  if (ready) {
    return {
      tone: 'info',
      text: `NeverSink ${ready.version} is ready. ${ready.ok} of ${ready.total} of your changes fit.`,
      actions: [{ label: 'What changed', run: () => { tab.value = 'neversink' } }, { label: 'Update', primary: true, run: updateNow }]
    }
  }
  if (s.gameFilter.value.loaded === false) {
    return { tone: 'warn', actions: [], text: 'The game couldn\'t load your filter last time it tried. Save again; the syntax check will name the rule if one is broken.' }
  }
  if (s.wrongFilterInGame.value) {
    return {
      tone: 'warn',
      text: `Your changes won't show in game: it's using "${s.gameFilter.value.name}", not your saved copy "${outName.value.replace(/\.filter$/i, '')}".`,
      actions: props.config.reloadViaChat ? [{ label: 'Use mine in game', primary: true, run: () => s.reloadInGame(true) }] : []
    }
  }
  return null
})

async function updateNow () {
  const undo = await props.store.updateNeverSink()
  toast(`Updated to NeverSink ${props.config.neversink.version}`, { anchor: panel.value?.el, undo })
}

function homes (edit: FilterEdit): RehomeOption[] {
  return props.store.doc.value ? rehomeOptions(props.store.doc.value, edit).slice(0, 40) : []
}

function shortName (g: GroupNode): string {
  if (g.type.startsWith('untagged:')) return 'Untagged rules'
  return groupName(g.type)
}

function firstLive (t: TierNode) {
  return t.blocks.find(b => !b.disabled) ?? t.blocks[0]
}

function previewName (t: TierNode): string {
  const cls = firstLive(t).conditions.find(c => c.key === 'Class')
  return cls?.values[0] ?? 'Item'
}

function conditionSummary (t: TierNode): string {
  return firstLive(t).conditions.slice(0, 3).map(c => `${c.key} ${c.op} ${c.values.slice(0, 2).join(' ')}${c.values.length > 2 ? '…' : ''}`).join(' · ')
}

const copyFrom = computed(() => group.value
  ? group.value.tiers.filter(t => t.tier !== selTier.value && !t.tier.startsWith('#')).map(t => ({ tier: t.tier, look: readStyle(firstLive(t).actions) as StylePatch }))
  : [])

function selectGroup (type: string) {
  selType.value = type
  selTier.value = group.value?.tiers[0]?.tier ?? null
  picked.value = []
}

// Where a jump came from, for Back and the mouse's back button.
interface Place { tab: typeof tab.value, type: string | null, tier: string | null, search: string }
const trail = ref<Place[]>([])

function rememberPlace () {
  trail.value = [...trail.value.slice(-19), { tab: tab.value, type: selType.value, tier: selTier.value, search: search.value }]
}

function goBack () {
  const place = trail.value[trail.value.length - 1]
  if (!place) return
  trail.value = trail.value.slice(0, -1)
  tab.value = place.tab
  selType.value = place.type
  selTier.value = place.tier
  search.value = place.search
  picked.value = []
}

function onMouseBack (e: MouseEvent) {
  // The editor stays mounted while hidden: only clicks on it count.
  if (e.button !== 3 || !trail.value.length || !panel.value?.el?.contains(e.target as Node)) return
  e.preventDefault()
  goBack()
}
onMounted(() => window.addEventListener('mouseup', onMouseBack))
onUnmounted(() => window.removeEventListener('mouseup', onMouseBack))

function openRule (rule: { type: string, tier: string | null }) {
  if (rule.tier) jumpTo(rule.type, rule.tier)
  else { rememberPlace(); search.value = ''; tab.value = 'rules'; selectGroup(rule.type) }
}

function jumpTo (type: string, t: string, base?: string) {
  rememberPlace()
  goTo(type, t, base)
}

function goTo (type: string, t: string, base?: string) {
  search.value = ''
  tab.value = 'rules'
  selType.value = type
  selTier.value = t
  picked.value = base ? [base] : []
}

watch(() => props.focus, (f) => {
  if (f) goTo(f.type, f.tier)
}, { immediate: true })

// Default selection once the filter loads.
watch(tree, () => {
  if (!selType.value || (!group.value && selType.value !== RULE_TYPE)) {
    const first = allGroups.value.find(g => g.type === 'currency') ?? allGroups.value[0]
    if (first) selectGroup(first.type)
  }
})

function ownEditFor (t: TierNode) {
  return props.config.edits.find(e => e.kind === 'item' && slug(e.base) === t.tier) as Extract<FilterEdit, { kind: 'item' }> | undefined
}

function patchTier (patch: StylePatch) {
  if (!selType.value || !selTier.value) return
  if (isOwnGroup.value) {
    const own = tier.value && ownEditFor(tier.value)
    if (own) props.store.edit({ ...own, patch })
    return
  }
  props.store.edit({ kind: 'style', type: selType.value, tier: selTier.value, patch })
}

function setTierVisibility (v: Visibility) {
  if (!selType.value || !selTier.value) return
  if (isOwnGroup.value) {
    const own = tier.value && ownEditFor(tier.value)
    if (own) props.store.edit({ ...own, visibility: v, patch: {} })
    return
  }
  props.store.edit({ kind: 'visibility', type: selType.value, tier: selTier.value, visibility: v })
}

function moveBases (bases: string[], to: string) {
  const type = selType.value
  const from = selTier.value
  if (!bases.length || !type || !from || !to || to === from) return
  const undo = props.store.editsWithUndo(bases.map(base => ({ kind: 'move' as const, type, base, from, to })))
  toast(`Moved ${bases.length > 1 ? `${bases.length} items` : bases[0]} to ${to}`, { anchor: panel.value?.el, undo })
  picked.value = []
  selTier.value = to
}

function moveBase (to: string) {
  moveBases(picked.value, to)
}

function pickBase (b: string, e: MouseEvent) {
  if (e.shiftKey) picked.value = picked.value.includes(b) ? picked.value.filter(x => x !== b) : [...picked.value, b]
  else picked.value = picked.value.length === 1 && picked.value[0] === b ? [] : [b]
}

const DRAG_TYPE = 'application/x-woke-bases'

function onDragStart (b: string, e: DragEvent) {
  if (!picked.value.includes(b)) picked.value = [b]
  e.dataTransfer?.setData(DRAG_TYPE, JSON.stringify(picked.value))
  e.dataTransfer?.setData('text/plain', picked.value.join(', '))
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}

function canDrop (t: TierNode): boolean {
  return t.tier !== selTier.value && targets.value.includes(t.tier)
}

function onDragOver (t: TierNode, e: DragEvent) {
  if (!e.dataTransfer?.types.includes(DRAG_TYPE) || !canDrop(t)) return
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
  dragOver.value = t.tier
}

function onDrop (t: TierNode, e: DragEvent) {
  dragOver.value = null
  const raw = e.dataTransfer?.getData(DRAG_TYPE)
  if (!raw || !canDrop(t)) return
  e.preventDefault()
  try { moveBases(JSON.parse(raw) as string[], t.tier) } catch {}
}

// ---- own rules ----

function selectRules () {
  search.value = ''
  selType.value = RULE_TYPE
  selTier.value = null
  editingRuleId.value = editingRuleId.value ?? props.config.rules[0]?.id ?? null
}

function newOwnRule () {
  const rule = newRule(nextEditId(), props.config.rules.length + 1)
  const undo = props.store.changeWithUndo(c => { c.rules = [rule, ...c.rules] })
  tab.value = 'rules'
  selectRules()
  editingRuleId.value = rule.id
  toast('New rule at the top of your filter', { anchor: panel.value?.el, undo })
}

function deleteRule (r: OwnRule) {
  const undo = props.store.changeWithUndo(c => { c.rules = c.rules.filter(x => x.id !== r.id) })
  if (editingRuleId.value === r.id) editingRuleId.value = props.config.rules[0]?.id ?? null
  toast(`Deleted ${r.name}`, { anchor: panel.value?.el, undo })
}

function moveRule (r: OwnRule, dir: -1 | 1) {
  const list = [...props.config.rules]
  const i = list.findIndex(x => x.id === r.id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= list.length) return
  ;[list[i], list[j]] = [list[j], list[i]]
  props.config.rules = list
}

function ruleMenu (e: MouseEvent, r: OwnRule) {
  openMenu(e, [
    { label: r.on ? 'Switch off' : 'Switch on', icon: r.on ? 'fas fa-toggle-off' : 'fas fa-toggle-on', action: () => { r.on = !r.on } },
    { label: 'Move up (wins over the ones below)', icon: 'fas fa-arrow-up', action: () => moveRule(r, -1) },
    { label: 'Move down', icon: 'fas fa-arrow-down', action: () => moveRule(r, 1) },
    { label: 'Duplicate', icon: 'fas fa-clone', action: () => { const copy: OwnRule = { ...JSON.parse(JSON.stringify(r)), id: nextEditId(), name: `${r.name} (copy)` }; props.config.rules = [...props.config.rules, copy]; editingRuleId.value = copy.id } },
    { label: 'Delete', icon: 'fas fa-trash', action: () => deleteRule(r) }
  ])
}

// ---- share ----

const { copied, copy } = useCopy()
const shareInput = ref('')
const shared = ref<SharedChanges | null>(null)

async function copyShareCode () {
  const c = props.config
  const code = await encodeChanges({ edits: c.edits, rules: c.rules, presets: c.presets, locks: c.priceTiers.locks })
  if (!await copy(code, 'share')) toast('Couldn\'t copy to the clipboard', { anchor: panel.value?.el })
}

async function readShareCode () {
  try {
    shared.value = await decodeChanges(shareInput.value)
  } catch (e) {
    shared.value = null
    toast((e as Error).message, { anchor: panel.value?.el })
  }
}

function useShared (how: 'add' | 'replace') {
  const s = shared.value
  if (!s) return
  const undo = props.store.changeWithUndo(c => {
    // Fresh ids, so added changes never collide with yours.
    const edits = s.edits.map(e => ({ ...e, id: nextEditId() }))
    const rules = s.rules.map(r => ({ ...r, id: nextEditId() }))
    if (how === 'replace') {
      c.edits = edits
      c.rules = rules
      c.presets = s.presets
      c.priceTiers.locks = s.locks
    } else {
      c.edits = [...c.edits, ...edits]
      c.rules = [...c.rules, ...rules]
      c.priceTiers.locks = [...new Set([...c.priceTiers.locks, ...s.locks])]
    }
  })
  toast(how === 'replace' ? 'Replaced your changes with the code\'s' : `Added ${describeShared(s)}`, { anchor: panel.value?.el, undo })
  shared.value = null
  shareInput.value = ''
}

const groupHiddenByMe = computed(() => props.config.edits.some(e => e.kind === 'group' && e.type === selType.value))
function toggleGroup () {
  if (!selType.value) return
  props.store.edit({ kind: 'group', type: selType.value, hidden: !groupHiddenByMe.value })
}

const panel = ref<InstanceType<typeof WPanel> | null>(null)

// No "are you sure": drop now, offer Undo (P9).
function removeEdit (e: FilterEdit) {
  const undo = props.store.removeEdit(e.id)
  toast(`Dropped: ${describeEdit(e)}`, { anchor: panel.value?.el, undo })
}

function groupMenu (ev: MouseEvent, type: string) {
  const hidden = props.config.edits.some(e => e.kind === 'group' && e.type === type)
  openMenu(ev, [
    { label: 'Open', icon: 'fas fa-layer-group', keys: 'Enter', action: () => selectGroup(type) },
    ...(type === OWN_RULE_TYPE
      ? []
      : [{ label: hidden ? 'Show group again' : 'Hide whole group', icon: hidden ? 'fas fa-eye' : 'fas fa-eye-slash', action: () => props.store.edit({ kind: 'group', type, hidden: !hidden }) }])
  ])
}

function tierMenu (ev: MouseEvent, t: TierNode) {
  if (!selType.value || t.tier.startsWith('#')) return
  const type = selType.value
  const shown = firstLive(t).visibility !== 'Hide' && !t.disabled
  openMenu(ev, [
    { label: shown ? 'Hide this tier' : 'Show this tier', icon: shown ? 'fas fa-eye-slash' : 'fas fa-eye', action: () => props.store.edit({ kind: 'visibility', type, tier: t.tier, visibility: shown ? 'Hide' : 'Show' }) },
    ...(t.bases.length ? [{ label: 'Copy item names', icon: 'far fa-copy', action: () => { copyText(t.bases.join('\n')) } }] : [])
  ])
}

function restoreSave (ts: number) {
  const undo = props.store.restore(ts)
  toast('Changes are back the way they were at that save', { anchor: panel.value?.el, undo })
}

function iconFor (kind: FilterEdit['kind']): string {
  switch (kind) {
    case 'move': return 'fas fa-exchange-alt'
    case 'style': return 'fas fa-palette'
    case 'visibility': return 'fas fa-eye'
    case 'group': return 'fas fa-eye-slash'
    case 'item': return 'fas fa-star'
  }
}

async function pickSource (key: string) {
  if (!key || key === sourceKey.value) return
  if (key === 'github') {
    await props.store.useGitHub(true)
    tab.value = 'neversink'
    return
  }
  if (props.config.neversink.on) props.config.neversink.on = false
  const online = key.startsWith('online:')
  const name = online ? key.slice('online:'.length) : key
  props.config.sourceName = name
  props.config.sourceOnline = online
  props.config.sourceTitle = online ? (props.store.files.value.find(f => f.online && f.name === name)?.title ?? name) : ''
  await props.store.load()
}

async function refresh () {
  await props.store.listFiles()
  await props.store.load()
}

function openFolder () {
  hostRequest('filter-folder', { dir: props.config.folder }).catch(() => {})
}
</script>

<style module>
.layout {
  display: grid;
  grid-template-columns: 14rem minmax(0, 1fr) 19rem;
  height: min(36rem, 70vh);
  min-height: 0;
}
.tree {
  border-right: 1px solid var(--w-line);
  padding-bottom: 8px;
}
.rulesHead {
  padding: 4px 6px 0 0;
}
.dropOk {
  border-color: var(--w-accent) !important;
  background: var(--w-accent-soft);
}
.mid {
  padding: 8px var(--w-pad);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.side {
  border-left: 1px solid var(--w-line);
  padding: 10px var(--w-pad);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.groupHead {
  padding-bottom: 4px;
}
.groupTitle {
  font-family: var(--w-head);
  font-size: var(--w-head-size);
}
.tierRow {
  display: grid;
  grid-template-columns: 6rem 14rem minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  padding: 6px 8px;
  background: var(--w-panel-2);
  border: 1px solid transparent;
  border-radius: var(--w-r-sm);
  color: var(--w-fg);
  text-align: left;
  cursor: pointer;
}
.tierRow:hover {
  border-color: var(--w-line);
}
.active {
  background: var(--w-accent-soft);
  border-color: var(--w-line-strong);
}
.tierName {
  font-size: var(--w-text-sm);
  color: var(--w-dim);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bases {
  font-size: var(--w-text-sm);
  color: var(--w-dim);
}
.off {
  opacity: 0.5;
  text-decoration: line-through;
}
.changes {
  max-height: min(36rem, 70vh);
  padding: 6px 0;
}
.buildIntro {
  padding: 4px var(--w-pad) 8px;
  max-width: 60rem;
}
.changeRow {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px var(--w-pad);
  border-bottom: 1px solid var(--w-line-soft);
}
.problems {
  padding: 6px var(--w-pad);
  display: flex;
  flex-direction: column;
  gap: 4px;
  border-bottom: 1px solid var(--w-line-soft);
}
.historyLabel {
  padding: 12px var(--w-pad) 4px;
}
.failed {
  background: rgba(224, 103, 90, 0.08);
}
.select {
  background: var(--w-panel-2);
  color: var(--w-fg);
  border: 1px solid var(--w-line);
  border-radius: var(--w-r-sm);
  padding: 2px 4px;
}
</style>
