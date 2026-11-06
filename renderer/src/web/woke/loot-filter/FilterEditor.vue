<template>
  <WPanel ref="panel" :title="config.wmTitle || 'Loot filter'" icon="wisdom" width="68rem" max-height="85vh" :scroll="false" fill
    :busy="store.loading.value && !!store.doc.value" :hotkey="config.editorHotkey ?? undefined">
    <template #actions>
      <button class="w-icon-btn" title="Close" @click="emit('close')"><i class="fas fa-times" /></button>
    </template>
    <template #toolbar>
      <WButton v-if="trail.length" size="sm" variant="ghost" icon="fas fa-arrow-left" title="Back to where you were (mouse back button)" @click="goBack">Back</WButton>
      <WSelect :model-value="sourceKey" :options="fileOptions" style="max-width: 20rem;" @update:model-value="pickSource" />
      <WButton size="sm" variant="ghost" icon="fas fa-sync" title="Reload the file list and the filter" @click="refresh" />
      <span :title="config.sampleHotkey ? `In game, hover an item and press ${config.sampleHotkey} to find its rule. Works on your inventory, stash and labels on the ground. Hold Alt to reach items your filter hides.` : undefined" @paste.capture="onSearchPaste">
        <WField v-model="search" type="search" icon="fas fa-search" placeholder="Find an item, or paste one to see its rule" style="width: 19rem;" />
      </span>
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
      <div :class="$style.tree">
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
        <RuleNav :class="$style.ruleNav" :tree="navTree" :sel-type="selType" :config="config" :changed-in="changedIn" :name-of="shortName"
          @select="selectGroup" @group-menu="groupMenu" />
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
              <span class="w-dim text-xs w-trunc">{{ ruleLabel(r.type, r.tier) }}</span>
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
          <StackScale v-if="ladder" :ladder="ladder" :colour-of="stackColour" :name-of="stackTierName" @preview="previewStack" @commit="setStack" />
          <div v-if="stuckTiers.length" class="text-xs" style="color: var(--w-warn);">{{ stuckTiers.join(', ') }} can't catch anything: a tier above takes those stacks first.</div>
          <div v-for="t in group.tiers" :key="t.tier" class="w-focusable" role="button" tabindex="0" :class="[$style.tierRow, { [$style.tierRowStack]: hasStacks, [$style.active]: t.tier === selTier, [$style.off]: t.disabled, [$style.dropOk]: dragOver === t.tier }]"
            @click="selTier = t.tier; picked = []" @contextmenu="tierMenu($event, t)" @keydown.enter.self="selTier = t.tier; picked = []" @keydown.space.self.prevent="selTier = t.tier; picked = []"
            @dragover="onDragOver(t, $event)" @dragleave="dragOver = dragOver === t.tier ? null : dragOver" @drop="onDrop(t, $event)">
            <span :class="$style.tierName" :title="t.tier">{{ tierName(firstLive(t)) }}<span v-if="tierChanged(t.tier)" :class="$style.dot" title="You changed this tier" /></span>
            <span v-if="hasStacks" :class="$style.stack">
              <template v-if="tierStack(t) != null && !t.disabled">
                &ge; <input type="number" min="1" :max="STACK_MAX" :class="$style.stackInput" :value="stackSizeOf(t)" :aria-label="`Stack size for ${stackTierName(t.tier)}`"
                  @click.stop @input="onStackInput(t, $event)" @change="onStackChange(t, $event)" @blur="dropStackDraft(t.tier)" @keydown.enter="($event.target as HTMLInputElement).blur()" @keydown.esc="cancelStack(t, $event)">
              </template>
              <span v-else-if="ladder?.floor === t.tier" class="w-faint">smaller</span>
            </span>
            <span :class="$style.icons" :title="t.bases.slice(0, 3).every(b => baseIcon(b)) ? undefined : t.bases.slice(0, 12).join(' · ')">
              <template v-if="t.bases.length">
                <template v-for="b in t.bases.slice(0, 3)" :key="b"><img v-if="baseIcon(b)" v-item-tip="baseTip(b)" :src="baseIcon(b)!" :class="$style.rowArt" alt=""></template>
                <span v-if="t.bases.length > 3" class="w-faint text-xs w-num" :title="t.bases.slice(3, 15).join(' · ')">+{{ t.bases.length - 3 }}</span>
              </template>
              <span v-else class="w-faint text-xs w-trunc">{{ conditionSummary(t) }}</span>
            </span>
            <LabelPreview :text="t.bases[0] ?? previewName(t)" :actions="firstLive(t).actions" :visibility="t.disabled ? 'Hide' : t.visibility" style="max-width: 100%; overflow: hidden;" />
          </div>
        </template>
      </div>

      <!-- selected tier -->
      <div :class="$style.side" class="w-scroll">
        <template v-if="selType === RULE_TYPE">
          <RuleBuilder v-if="editingRule" :key="editingRule.id" :store="store" :rule="editingRule" @delete="deleteRule(editingRule)" />
          <WEmpty v-else icon="fas fa-sliders-h">Pick a rule to change it, or make a new one.</WEmpty>
        </template>
        <template v-else-if="tier">
          <div class="flex items-center gap-2">
            <span :class="$style.groupTitle" class="w-trunc" :title="tier.tier">{{ tierName(firstLive(tier)) }}</span>
            <span class="grow" />
            <WButton v-if="tierChanged(tier.tier) && !isOwnGroup" size="sm" variant="ghost" icon="fas fa-undo" title="Take back your changes to this tier" @click="resetTier(tier.tier)">Reset tier</WButton>
          </div>
          <div class="text-xs w-faint">{{ tier.blocks.length > 1 ? `${tier.blocks.length} rules` : `line ${tier.blocks[0].line}` }}<span v-if="tier.disabled"> · commented out in the filter</span></div>
          <div v-if="bulkLook" :class="$style.bulkNote" class="text-xs">
            <span class="grow">Changes here go to the {{ picked.length }} item{{ picked.length === 1 ? '' : 's' }} you picked, not the tier.</span>
            <WButton size="sm" variant="ghost" @click="bulkLook = false">Whole tier</WButton>
          </div>
          <StyleEditor :source="bulkLook || isOwnGroup || !selType ? null : store.sourceLook(selType, tier.tier)" :look="readStyle(firstLive(tier).actions)" :visibility="firstLive(tier).visibility"
            :preview-text="(bulkLook ? picked[0] : tier.bases[0]) ?? previewName(tier)" :copy-from="copyFrom"
            @patch="patchTier" @visibility="setTierVisibility" />

          <template v-if="!isOwnGroup && (tier.bases.length || targets.includes(tier.tier))">
            <div class="w-group-label" style="padding: 8px 0 2px;">Items in this tier · {{ tier.bases.length }}</div>
            <div class="flex flex-wrap gap-1">
              <span v-for="b in tierItems" :key="b" :class="$style.chipWrap">
                <WChip clickable :active="picked.includes(b)" draggable="true"
                  title="Click to pick it, shift-click to pick a run. Drag onto a tier to move it, with any others you've picked. Right-click for Move to."
                  @click="pickBase(b, $event)" @contextmenu="baseMenu($event, b)" @dragstart="onDragStart(b, $event)" @dragend="dragOver = null">
                  <span v-item-tip="baseTip(b)" class="flex items-center gap-1">
                    <img v-if="baseIcon(b)" :src="baseIcon(b)!" :class="$style.chipArt" alt="">
                    <span>{{ b }}</span>
                    <span v-if="priceOf(b) != null" class="w-num" :class="$style[`p_${priceGrade(priceOf(b), config.safetyNet.minChaos)}`]">{{ priceText(priceOf(b)!) }}</span>
                    <i v-if="movedHere(b)" class="fas fa-lock w-faint" style="font-size: 0.75em;" title="You put it here, so prices won't move it" />
                  </span>
                </WChip>
                <button type="button" :class="$style.chipX" :title="movedHere(b) ? 'Back to where it was' : 'Take it off this tier'" :aria-label="`Take ${b} off this tier`" @click="takeOff(b)"><i aria-hidden="true" class="fas fa-times" /></button>
              </span>
            </div>
            <div v-if="picked.length" :class="$style.bulkBar" role="toolbar" aria-label="Picked items">
              <b class="text-xs">{{ picked.length }} picked</b>
              <span class="grow" />
              <WButton v-if="targets.length > 1" size="sm" variant="primary" @click="bulkMoveMenu">Move to</WButton>
              <WButton size="sm" variant="ghost" @click="bulkHide">Hide</WButton>
              <WButton size="sm" variant="ghost" title="Change the look of just these, using the controls above" @click="bulkLook = true">Own look</WButton>
              <WButton size="sm" variant="ghost" @click="bulkTakeOff">Take off</WButton>
              <button type="button" class="w-icon-btn" title="Clear" aria-label="Clear picked items" @click="picked = []"><i aria-hidden="true" class="fas fa-times" /></button>
            </div>
            <AddItemField v-if="store.doc.value && selType && targets.includes(tier.tier)" :tip-for="baseTip" :key="`${selType}|${tier.tier}`" :doc="store.doc.value" :type="selType" :tier="tier.tier" @add="addItem" />
          </template>
          <WButton v-if="isOwnGroup && ownEditFor(tier)" size="sm" variant="ghost" icon="fas fa-trash" @click="removeEdit(ownEditFor(tier)!)">Remove this own rule</WButton>
        </template>
        <WEmpty v-else icon="fas fa-layer-group">Pick a tier to restyle it or move its items.</WEmpty>
      </div>
    </div>

    <!-- Rendered below, kept alive so Back returns to the same pile. -->
    <template v-else-if="tab === 'preview'" />
    <PresetsTab v-else-if="tab === 'presets'" :store="store" :config="config" />
    <PricesTab v-else-if="tab === 'prices'" :store="store" :config="config" :anchor="panel?.el" @open-rule="r => jumpTo(r.type, r.tier, r.base)" />
    <NeverSinkTab v-else-if="tab === 'neversink'" :store="store" :config="config" :anchor="panel?.el" />

    <!-- build rules -->
    <div v-else-if="tab === 'build'" :class="$style.changes" class="w-scroll">
      <WEmpty v-if="!buildInput" icon="fas fa-user-cog">
        No active build. Pick one in PoB builds. <WInfo text="Press Use build there, and its gems, link colours and uniques can be added to your filter here." />
      </WEmpty>
      <template v-else>
        <div class="w-dim text-sm flex items-center gap-2" :class="$style.buildIntro">
          <span>Rules for <span class="w-accent">{{ buildInput.buildName }}</span></span>
          <WInfo text="They go at the top of your saved copy, ahead of NeverSink's own. They follow the active build, and you can restyle them under Rules › Your build." />
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
      <template v-if="config.timeline.steps.length">
        <div class="flex items-center gap-2" :class="$style.historyLabel">
          <span class="w-group-label" style="padding: 0;">History</span>
          <span class="w-faint text-xs">newest first</span>
          <span class="grow" />
          <WButton size="sm" variant="ghost" icon="fas fa-undo" :disabled="config.timeline.at === 0" title="Ctrl + Z" @click="store.undoStep()">Undo</WButton>
          <WButton size="sm" variant="ghost" icon="fas fa-redo" :disabled="config.timeline.at >= config.timeline.steps.length" title="Ctrl + Y" @click="store.redoStep()">Redo</WButton>
        </div>
        <div v-for="s in shownSteps" :key="s.n" :class="[$style.changeRow, { [$style.undone]: s.n >= config.timeline.at }]">
          <span class="grow min-w-0 w-trunc" :title="s.step.label">{{ s.step.label }}</span>
          <span class="w-faint text-xs w-num" :title="new Date(s.step.ts).toLocaleString()">{{ agoPhrase(s.step.ts) }}</span>
          <WButton v-if="s.n + 1 !== config.timeline.at" size="sm" variant="ghost" title="Your settings go back to right after this step. You can redo." @click="store.goToStep(s.n + 1)">{{ s.n >= config.timeline.at ? 'Redo to here' : 'Back to here' }}</WButton>
          <WButton v-else size="sm" variant="ghost" @click="store.undoStep()">Undo</WButton>
        </div>
      </template>
      <div class="w-group-label" v-if="config.edits.length || activePriceMoves" :class="$style.historyLabel">In effect now</div>
      <div v-if="activePriceMoves" :class="$style.changeRow">
        <i class="fas fa-chart-line w-dim" />
        <span class="grow min-w-0">{{ activePriceMoves }} item{{ activePriceMoves === 1 ? '' : 's' }} moved by prices</span>
        <WButton size="sm" variant="ghost" @click="tab = 'prices'">See them</WButton>
      </div>
      <WEmpty v-if="!config.edits.length && !activePriceMoves" icon="fas fa-pen">No changes yet. Sample an item with <WKbd v-if="config.sampleHotkey" :keys="config.sampleHotkey" /> or edit a tier here.</WEmpty>
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
        <span class="grow min-w-0 text-sm w-dim">Share your changes as a code <WInfo text="Your changes, own rules and presets as one code, for a friend or your other PC." /></span>
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
            <template v-if="store.pendingReload.value"> · press Reload now to use it</template>
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
import { WPanel, WButton, WSelect, WField, WTabs, WListItem, WChip, WEmpty, WInfo, WKbd, WBanner, WSkeleton, agoPhrase, openMenu, toast, useCopy, vItemTip } from '../ui'
import { copyText } from '../ui/copy'
import { hasUndoToast } from '../ui/layer'
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
import { OWN_RULE_TYPE, addEdit, conditionSignature, describeEdit, moveTargets, nextEditId, readStyle, rehome, rehomeOptions } from './edits'
import { ECONOMY_GROUPS } from './economy'
import { baseTipRef } from './base-tip'
import { priceGrade } from './health'
import type { RehomeOption } from './edits'
import type { FilterEdit, StylePatch } from './edits'
import { ruleLabel, tierName } from './parse'
import type { Visibility } from './parse'
import { tierLabel } from './names'
import AddItemField from './AddItemField.vue'
import RuleNav from './RuleNav.vue'
import StackScale from './StackScale.vue'
import { STACK_MAX, cleanStackSize, stackLadder, tierStack, unreachableTiers } from './stack'
import { baseIcon, labelCss } from './label-style'
import type { AddResult } from './groups'
import { buildTree, byPrice, findBase, groupName, pickBases } from './groups'
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
  // A tab to show (from the dock card). A new object each time.
  openTab?: { tab: 'prices' | 'neversink' | 'changes' } | null
}>()

const emit = defineEmits<{ (e: 'close' | 'tab-opened'): void, (e: 'paste-item', text: string): void }>()

// Pasting a copied item finds its rule, like the hotkey does in game.
function onSearchPaste (e: ClipboardEvent) {
  const text = e.clipboardData?.getData('text') ?? ''
  if (!text.startsWith('Item Class:')) return
  e.preventDefault()
  emit('paste-item', text)
}

const tab = ref<'rules' | 'preview' | 'presets' | 'prices' | 'neversink' | 'build' | 'changes'>('rules')
const search = ref('')
const selType = ref<string | null>(null)
const selTier = ref<string | null>(null)
// Bases picked in the selected tier (shift-click adds), to move or drag.
const picked = ref<string[]>([])
const lastPicked = ref<string | null>(null)
// The look controls change the picked items, not the tier.
const bulkLook = ref(false)
watch(picked, (list) => { if (!list.length) bulkLook.value = false })
const dragOver = ref<string | null>(null)
// The own rule open in the rule builder.
const editingRuleId = ref<number | null>(null)
const editingRule = computed(() => props.config.rules.find(r => r.id === editingRuleId.value) ?? null)

function baseTip (base: string) {
  return baseTipRef(props.store.prices.breakdown.value, props.config.safetyNet.minChaos, selType.value ?? '', base)
}

// Today's price of a base, in groups poe.ninja prices.
function priceOf (base: string): number | null {
  const lookup = props.store.prices.lookup.value
  // Prices are in chaos, so poe.ninja doesn't list chaos itself.
  if (lookup && base === 'Chaos Orb' && selType.value === 'currency') return 1
  const group = ECONOMY_GROUPS.find(g => g.type === selType.value)
  return (lookup && group && lookup(group, base)?.chaos) ?? null
}
const priceText = (chaos: number) => chaos >= 10 ? `${Math.round(chaos)}c` : (chaos < 0.1 ? '<0.1c' : `${Math.round(chaos * 10) / 10}c`)
const tierItems = computed(() => byPrice(tier.value?.bases ?? [], priceOf))

const tree = computed(() => props.store.doc.value ? buildTree(props.store.doc.value) : [])
// Your made rules have their own row above the list.
const navTree = computed(() => tree.value.map(x => ({ ...x, groups: x.groups.filter(g => g.type !== RULE_TYPE) })).filter(x => x.groups.length))
const allGroups = computed(() => tree.value.flatMap(s => s.groups))
const group = computed<GroupNode | null>(() => allGroups.value.find(g => g.type === selType.value) ?? null)
const tier = computed<TierNode | null>(() => group.value?.tiers.find(t => t.tier === selTier.value) ?? null)
// An undo can take a picked item off the tier.
watch(tierItems, (list) => {
  if (picked.value.some(b => !list.includes(b))) picked.value = picked.value.filter(b => list.includes(b))
})
const isOwnGroup = computed(() => selType.value === OWN_RULE_TYPE)
const results = computed(() => props.store.doc.value ? findBase(props.store.doc.value, search.value) : [])
const targets = computed(() => props.store.doc.value && selType.value ? moveTargets(props.store.doc.value, selType.value) : [])
const outName = computed(() => props.config.sourceName ? outputName(props.config) : '—')

// Stored moves only count while re-tiering is on: otherwise they aren't applied.
const activePriceMoves = computed(() => props.config.priceTiers.on ? props.config.priceTiers.moves.length : 0)

const tabOptions = computed(() => [
  { value: 'rules', label: 'Rules' },
  { value: 'preview', label: 'Preview' },
  { value: 'presets', label: 'Presets', count: Object.values(props.config.presets).filter(x => x.on).length || undefined },
  { value: 'prices', label: 'Prices', count: props.store.plan.value?.moves.length || undefined },
  { value: 'neversink', label: props.config.neversink.on ? `NeverSink · ${LEVEL_NAMES[props.config.neversink.level]}` : 'NeverSink', count: props.store.updateReady.value ? 1 : undefined },
  { value: 'build', label: 'Build', count: props.store.buildBlockCount.value || undefined },
  // Price moves are changes to your filter too.
  { value: 'changes', label: 'Changes', count: props.config.edits.length + activePriceMoves.value }
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
  if (g.type.startsWith('untagged:')) return g.tiers.length > 1 ? `${g.tiers.length} rules` : 'Rule'
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

watch(() => props.openTab, (t) => {
  if (!t) return
  tab.value = t.tab
  // Once: the editor is rebuilt each time it opens, and must not come back here.
  emit('tab-opened')
}, { immediate: true })

// Default selection once the filter loads.
watch(tree, () => {
  if (!selType.value || (!group.value && selType.value !== RULE_TYPE)) {
    const first = allGroups.value.find(g => g.type === 'currency') ?? allGroups.value[0]
    if (first) selectGroup(first.type)
  }
})

function ownEditFor (t: TierNode) {
  const id = t.blocks[0]?.editId
  return props.config.edits.find(e => e.kind === 'item' && e.id === id) as Extract<FilterEdit, { kind: 'item' }> | undefined
}

function patchTier (patch: StylePatch) {
  if (!selType.value || !selTier.value) return
  if (bulkLook.value) {
    bulkOwnRules(tier.value!, { patch })
    return
  }
  if (isOwnGroup.value) {
    const own = tier.value && ownEditFor(tier.value)
    if (own) props.store.edit({ ...own, patch })
    return
  }
  props.store.edit({ kind: 'style', type: selType.value, tier: selTier.value, patch })
}

function setTierVisibility (v: Visibility) {
  if (!selType.value || !selTier.value) return
  if (bulkLook.value) {
    bulkOwnRules(tier.value!, { visibility: v })
    return
  }
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
  toast(`Moved ${bases.length > 1 ? `${bases.length} items` : bases[0]} to ${tierLabel(to)}`, { anchor: panel.value?.el, undo })
  picked.value = []
  selTier.value = to
}

function pickBase (b: string, e: MouseEvent) {
  picked.value = pickBases(tierItems.value, picked.value, b, e.shiftKey, lastPicked.value)
  lastPicked.value = b
}

// ---- several items at once ----

function ownVisibility (type: string, t: string, base: string): Visibility | undefined {
  const own = props.config.edits.find(e => e.kind === 'item' && e.type === type && e.tier === t && e.base === base)
  return own?.kind === 'item' ? own.visibility : undefined
}

// Changes the picked items' own rules, one undo for all of them.
function bulkOwnRules (t: TierNode, change: { visibility?: Visibility, patch?: StylePatch }) {
  const type = selType.value
  if (!type || !picked.value.length) return undefined
  const block = firstLive(t)
  return props.store.editsWithUndo(picked.value.map(base => ({
    kind: 'item' as const,
    type,
    tier: t.tier,
    base,
    // A look change leaves an item you already hid hidden.
    visibility: change.visibility ?? ownVisibility(type, t.tier, base) ?? block.visibility,
    patch: change.patch ?? {},
    anchor: conditionSignature(block)
  })))
}

function bulkHide () {
  const t = tier.value
  if (!t) return
  const n = picked.value.length
  const undo = bulkOwnRules(t, { visibility: 'Hide' })
  picked.value = []
  if (undo) toast(`Hid ${n} item${n === 1 ? '' : 's'}`, { anchor: panel.value?.el, undo })
}

function bulkTakeOff () {
  const type = selType.value
  const from = selTier.value
  if (!type || !from || !picked.value.length) return
  const bases = picked.value
  const moved = (e: FilterEdit, b: string) => e.kind === 'move' && e.type === type && e.base === b && e.to === from
  const undo = props.store.changeWithUndo(c => {
    let edits = c.edits
    for (const base of bases) {
      edits = edits.some(e => moved(e, base))
        ? edits.filter(e => !moved(e, base))
        : addEdit(edits, { id: nextEditId(), kind: 'move', type, base, from, to: '' })
    }
    c.edits = edits
  })
  picked.value = []
  toast(`Took ${bases.length} item${bases.length === 1 ? '' : 's'} off ${tierLabel(from)}`, { anchor: panel.value?.el, undo })
}

function tierMoveEntries (bases: () => string[]) {
  const doc = props.store.doc.value
  const type = selType.value
  if (!doc || !type) return []
  return targets.value.filter(t => t !== selTier.value).map(t => {
    const block = doc.blocks.find(x => x.type === type && x.tier === t && !x.disabled) ?? doc.blocks.find(x => x.type === type && x.tier === t)
    return { label: tierLabel(t), labelStyle: block ? labelCss(block.actions) : undefined, icon: 'fas fa-share', action: () => { moveBases(bases(), t) } }
  })
}

function bulkMoveMenu (e: MouseEvent) {
  const list = [...picked.value]
  openMenu(e, tierMoveEntries(() => list))
}

// ---- what you changed ----

function changedIn (type: string): number {
  return props.config.edits.filter(e => e.type === type).length
}

// ---- stack sizes ----

// What you're typing or dragging: shown at once, saved when you let go.
const stackDrafts = ref<Record<string, number>>({})
watch(selType, () => { stackDrafts.value = {} })
// Undo or a reset moves the number out from under a draft.
watch(() => props.config.edits, () => { stackDrafts.value = {} })

function stackSizeOf (t: TierNode): number | null {
  const size = tierStack(t)
  return size == null ? null : stackDrafts.value[t.tier] ?? size
}
// Your own rules and the safety net hold copies: those change with what made them.
const stacksEditable = computed(() => Boolean(group.value) && !group.value!.type.startsWith('woke->'))
const hasStacks = computed(() => stacksEditable.value && group.value!.tiers.some(t => !t.disabled && tierStack(t) != null))
const ladder = computed(() => stacksEditable.value ? stackLadder(group.value!.tiers, stackSizeOf) : null)
const stuckTiers = computed(() => stacksEditable.value && group.value ? unreachableTiers(group.value.tiers, stackSizeOf).map(stackTierName) : [])

function stackTierName (tier: string): string {
  const t = group.value?.tiers.find(x => x.tier === tier)
  return t ? tierName(firstLive(t)) : tier
}

function stackColour (tier: string): string {
  const t = group.value?.tiers.find(x => x.tier === tier)
  if (!t) return 'var(--w-panel-2)'
  const look = readStyle(firstLive(t).actions)
  // Gold's piles are all on black: their text is what tells them apart.
  const c = look.background && look.background[0] + look.background[1] + look.background[2] > 120 ? look.background : look.text
  return c ? `rgb(${c[0]}, ${c[1]}, ${c[2]})` : 'var(--w-panel-2)'
}

function previewStack (tier: string, size: number) {
  stackDrafts.value = { ...stackDrafts.value, [tier]: size }
}

function dropStackDraft (tier: string) {
  stackDrafts.value = Object.fromEntries(Object.entries(stackDrafts.value).filter(([k]) => k !== tier))
}

function setStack (tier: string, size: number) {
  dropStackDraft(tier)
  const t = group.value?.tiers.find(x => x.tier === tier)
  const type = selType.value
  if (!t || !type || tierStack(t) === size) return
  const mine = props.config.edits.find(e => e.kind === 'stack' && e.type === type && e.tier === tier)
  if (mine && props.store.sourceStack(type, tier) === size) props.store.removeEdit(mine.id)
  else props.store.edit({ kind: 'stack', type, tier, size })
}

function onStackInput (t: TierNode, e: Event) {
  const size = cleanStackSize((e.target as HTMLInputElement).value)
  if (size != null) previewStack(t.tier, size)
}

// Esc leaves the field the way it came. The panel blurs it right after.
function cancelStack (t: TierNode, e: Event) {
  dropStackDraft(t.tier)
  ;(e.target as HTMLInputElement).value = String(tierStack(t) ?? '')
}

function onStackChange (t: TierNode, e: Event) {
  const input = e.target as HTMLInputElement
  const size = cleanStackSize(input.value)
  // Left empty: back to what it was.
  if (size == null) {
    dropStackDraft(t.tier)
    input.value = String(tierStack(t) ?? '')
    return
  }
  input.value = String(size)
  setStack(t.tier, size)
}

function touchesTier (e: FilterEdit, t: string): boolean {
  switch (e.kind) {
    case 'move': return e.from === t || e.to === t
    case 'style': case 'visibility': case 'item': case 'stack': return e.tier === t
    default: return false
  }
}

function tierChanged (t: string): boolean {
  return props.config.edits.some(e => e.type === selType.value && touchesTier(e, t))
}

function resetTier (t: string) {
  const type = selType.value
  const undo = props.store.changeWithUndo(c => { c.edits = c.edits.filter(e => !(e.type === type && touchesTier(e, t))) })
  toast(`${tierLabel(t)} is back to NeverSink's`, { anchor: panel.value?.el, undo })
}

// ---- items on a tier ----

function moveEditHere (b: string) {
  return props.config.edits.find(e => e.kind === 'move' && e.type === selType.value && e.base === b && e.to === selTier.value)
}
const movedHere = (b: string) => Boolean(moveEditHere(b))

function takeOff (b: string) {
  const type = selType.value
  const from = selTier.value
  if (!type || !from) return
  const moved = moveEditHere(b)
  const undo = moved ? props.store.removeEdit(moved.id) : props.store.editWithUndo({ kind: 'move', type, base: b, from, to: '' })
  picked.value = picked.value.filter(x => x !== b)
  toast(moved ? `${b} is back where it was` : `Took ${b} off ${tierLabel(from)}`, { anchor: panel.value?.el, undo })
}

function addItem (r: AddResult) {
  const type = selType.value
  const to = selTier.value
  if (!type || !to) return
  const from = r.sameGroup ? r.block?.tier ?? '' : ''
  const undo = props.store.editWithUndo({ kind: 'move', type, base: r.base, from, to })
  const note = r.caughtBy ? `. ${ruleLabel(r.caughtBy.type, r.caughtBy.tier)} comes first, so it still decides how it looks` : ''
  toast(`${r.sameGroup ? 'Moved' : 'Added'} ${r.base} to ${tierLabel(to)}${note}`, { anchor: panel.value?.el, undo })
}

// Every tier drawn in its own look, so you see the result before you pick.
function baseMenu (ev: MouseEvent, b: string) {
  const moved = moveEditHere(b)
  openMenu(ev, [
    ...tierMoveEntries(() => picked.value.includes(b) ? [...picked.value] : [b]),
    { separator: true as const },
    picked.value.includes(b) && picked.value.length > 1
      ? { label: `Take ${picked.value.length} off this tier`, icon: 'fas fa-times', action: bulkTakeOff }
      : { label: moved ? 'Back to where it was' : 'Take it off this tier', icon: 'fas fa-times', action: () => { takeOff(b) } }
  ])
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

// Newest first, with each step's place in the list.
const shownSteps = computed(() => props.config.timeline.steps.map((step, n) => ({ step, n })).reverse())

function onUndoKeys (e: KeyboardEvent) {
  // Only with this window up, and not when something else already took the key
  // (the Undo note, whichever heard it first) or you're typing somewhere.
  if (e.defaultPrevented || props.config.wmWants !== 'show') return
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return
  const t = e.target as HTMLElement | null
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
  const key = e.key.toLowerCase()
  // A note on screen with Undo on it takes Ctrl + Z first, and it ends in the same place.
  if (key === 'z' && !e.shiftKey) {
    if (!hasUndoToast()) { e.preventDefault(); props.store.undoStep() }
  } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
    e.preventDefault()
    props.store.redoStep()
  }
}
onMounted(() => window.addEventListener('keydown', onUndoKeys))
onUnmounted(() => window.removeEventListener('keydown', onUndoKeys))

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
  if (!selType.value) return
  const type = selType.value
  const shown = firstLive(t).visibility !== 'Hide' && !t.disabled
  const own = isOwnGroup.value ? ownEditFor(t) : undefined
  openMenu(ev, [
    {
      label: shown ? (own ? 'Hide this item' : 'Hide this tier') : (own ? 'Show this item' : 'Show this tier'),
      icon: shown ? 'fas fa-eye-slash' : 'fas fa-eye',
      action: () => props.store.edit(own ? { ...own, visibility: shown ? 'Hide' : 'Show', patch: {} } : { kind: 'visibility', type, tier: t.tier, visibility: shown ? 'Hide' : 'Show' })
    },
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
    case 'stack': return 'fas fa-layer-group'
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
  flex: 1 1 min(36rem, calc(70vh / var(--w-ui-scale, 1)));
  min-height: 0;
}
.tree {
  border-right: 1px solid var(--w-line);
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
.ruleNav {
  flex: 1;
  min-height: 0;
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
  grid-template-columns: 6.5rem 5.5rem minmax(0, 1fr);
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
.tierRowStack { grid-template-columns: 4.5rem 5rem 3.5rem minmax(0, 1fr); }
.stack {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: var(--w-text-sm);
  color: var(--w-dim);
  white-space: nowrap;
}
.stackInput {
  width: 3.6rem;
  padding: 1px 3px;
  background: var(--w-panel);
  color: var(--w-fg);
  border: 1px solid var(--w-line-strong);
  border-radius: var(--w-r-sm);
  font: inherit;
  font-variant-numeric: tabular-nums;
  -moz-appearance: textfield;
}
.stackInput::-webkit-inner-spin-button { display: none; }
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
.icons {
  display: flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
  overflow: hidden;
}
.rowArt { width: 18px; height: 18px; object-fit: contain; flex: none; }
.chipArt { width: 16px; height: 16px; object-fit: contain; flex: none; }
.chipWrap { display: inline-flex; align-items: center; }
.p_high { color: var(--w-accent); }
.p_mid { color: var(--w-dim); }
.p_trash { color: var(--w-down); }
.p_unknown { color: var(--w-faint); }
.bulkBar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  padding: 4px 6px;
  background: var(--w-panel-3);
  border: 1px solid var(--w-line-strong);
  border-radius: var(--w-r-sm);
}
.bulkNote {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 6px;
  background: var(--w-accent-soft);
  border-radius: var(--w-r-sm);
}
.chipX {
  background: none;
  border: 0;
  padding: 0 4px 0 2px;
  color: var(--w-faint);
  font-size: 0.75em;
  cursor: pointer;
}
.chipX:hover { color: var(--w-fg); }
.dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-left: 5px;
  border-radius: 50%;
  background: var(--w-warn);
  vertical-align: 1px;
}
.changed { color: var(--w-warn); white-space: nowrap; }
.off {
  opacity: 0.5;
  text-decoration: line-through;
}
.changes {
  max-height: min(36rem, calc(70vh / var(--w-ui-scale, 1)));
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
.undone { opacity: 0.45; }
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
