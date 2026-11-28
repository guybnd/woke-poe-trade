<template>
  <div data-filter-history>
    <div class="flex items-center gap-2" :class="$style.label">
      <span class="w-group-label" style="padding: 0;">History</span>
      <span class="w-faint text-xs">newest first</span>
      <span class="grow" />
      <WButton size="sm" variant="ghost" icon="fas fa-undo" :disabled="at === 0" title="Undo" data-tip-keys="Ctrl + Z" @click="store.undoStep()">Undo</WButton>
      <WButton size="sm" variant="ghost" icon="fas fa-redo" :disabled="at >= stepCount" title="Redo" data-tip-keys="Ctrl + Y" @click="store.redoStep()">Redo</WButton>
    </div>
    <div v-if="tabCounts.length > 1" class="flex flex-wrap gap-1" :class="$style.chips">
      <WChip clickable :active="only === null" @click="only = null">All</WChip>
      <WChip v-for="t in tabCounts" :key="t.key" clickable :active="only === t.key" :data-history-tab="t.key" @click="only = only === t.key ? null : t.key">
        <i :class="t.icon" aria-hidden="true" /> {{ t.label }} <span class="w-faint">{{ t.count }}</span>
      </WChip>
    </div>
    <template v-for="r in shown" :key="r.n">
      <div :class="[$style.row, { [$style.undone]: r.n >= at, [$style.open]: open === r.n }]" data-history-row @click="toggle(r.n)">
        <i :class="iconOf(r)" class="w-dim" :title="tabLabel(r)" aria-hidden="true" />
        <span class="grow min-w-0 w-trunc" :title="rowSummary(r)" role="button" tabindex="0" :aria-expanded="open === r.n"
          @keydown.enter.prevent="toggle(r.n)" @keydown.space.prevent="toggle(r.n)">
          <template v-if="r.changes[0]">
            <span v-if="r.changes[0].item" v-item-tip="itemRefFromName(r.changes[0].item)" class="w-dim">{{ r.changes[0].where }}</span>
            <span v-else class="w-dim">{{ r.changes[0].where }}</span>
            <span class="w-dim"> · </span>
            <span>{{ r.changes[0].what }}</span>
            <template v-if="r.changes[0].from != null || r.changes[0].to != null">
              <span> {{ r.changes[0].from ?? '—' }}</span><span class="w-faint"> → </span><span :class="$style.to">{{ r.changes[0].to ?? '—' }}</span>
            </template>
            <span v-if="r.changes.length > 1" class="w-faint">, and {{ r.changes.length - 1 }} more</span>
          </template>
          <span v-else>{{ fallback(r) }}</span>
        </span>
        <span v-if="r.count > 1" :class="$style.count" :title="`${r.count} changes in a row to the same thing, shown as one`">×{{ r.count }}</span>
        <span class="w-faint text-xs w-num" :title="timeTitle(r)">{{ agoPhrase(r.ts) }}</span>
        <WButton v-if="r.n + 1 !== at" size="sm" variant="ghost" title="Your settings go back to right after this change. You can redo." @click.stop="store.goToStep(r.n + 1)">{{ r.n >= at ? 'Redo to here' : 'Back to here' }}</WButton>
        <WButton v-else size="sm" variant="ghost" :title="r.count > 1 ? `Undoes the last of these ${r.count}` : undefined" @click.stop="store.undoStep()">Undo</WButton>
      </div>
      <div v-if="open === r.n" :class="$style.detail" data-history-detail>
        <div v-for="c in r.changes" :key="c.key" :class="$style.line">
          <span v-if="c.item" v-item-tip="itemRefFromName(c.item)" class="w-dim">{{ c.where }}</span>
          <span v-else class="w-dim">{{ c.where }}</span>
          <span class="w-dim"> · </span>
          <span>{{ c.what }}</span>
          <template v-if="r.trails.get(c.key)">
            <template v-for="(v, i) in r.trails.get(c.key)" :key="i"><span v-if="i" class="w-faint"> → </span><span :class="i === r.trails.get(c.key)!.length - 1 ? $style.to : undefined">{{ v }}</span></template>
          </template>
          <template v-else-if="c.from != null || c.to != null">
            <span> {{ c.from ?? '—' }}</span><span class="w-faint"> → </span><span :class="$style.to">{{ c.to ?? '—' }}</span>
          </template>
        </div>
        <div v-if="!r.changes.length" :class="$style.line">{{ fallback(r) }}</div>
        <div v-if="r.count > 1" class="w-faint text-xs" :class="$style.line">{{ r.count }} changes from {{ clock(r.firstTs) }} to {{ clock(r.ts) }}. Back to here goes to after the last one.</div>
      </div>
    </template>
    <div v-if="!shown.length" class="w-faint text-sm" :class="$style.line">No changes on this tab yet.</div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { WButton, WChip, agoPhrase, vItemTip, itemRefFromName } from '../ui'
import type { LootFilterStore } from './store'
import type { TimelineStep } from './timeline'
import { describeSavedStep } from './timeline'
import { HISTORY_TABS, historyRows, rowSummary, stepChanges } from './history-words'
import type { Change, HistoryRow, HistoryTab } from './history-words'

const props = defineProps<{ store: LootFilterStore }>()

const at = computed(() => props.store.timeline.value.at)
const stepCount = computed(() => props.store.timeline.value.steps.length)

// A step never changes once made: work out its words once.
const cache = new WeakMap<TimelineStep, Change[]>()
function changesOf (step: TimelineStep): Change[] {
  let cs = cache.get(step)
  if (!cs) {
    try {
      cs = stepChanges(step.before, step.after, props.store.sourceLook)
    } catch {
      cs = []
    }
    cache.set(step, cs)
  }
  return cs
}

const rows = computed(() => historyRows(props.store.timeline.value.steps, changesOf))
const only = ref<HistoryTab | null>(null)
const open = ref<number | null>(null)

const tabCounts = computed(() => HISTORY_TABS
  .map(t => ({ ...t, count: rows.value.filter(r => r.tabs.includes(t.key)).length }))
  .filter(t => t.count))
const shown = computed(() => only.value ? rows.value.filter(r => r.tabs.includes(only.value!)) : rows.value)

function toggle (n: number) {
  open.value = open.value === n ? null : n
}
function iconOf (r: HistoryRow) {
  return HISTORY_TABS.find(t => t.key === r.tabs[0])?.icon ?? 'fas fa-history'
}
function tabLabel (r: HistoryRow) {
  return r.tabs.map(k => HISTORY_TABS.find(t => t.key === k)?.label).join(', ')
}
function fallback (r: HistoryRow) {
  const step = props.store.timeline.value.steps[r.n]
  return step ? describeSavedStep(step, props.store.sourceLook) : 'Changed settings'
}
const clock = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
function timeTitle (r: HistoryRow) {
  return r.count > 1 ? `${new Date(r.firstTs).toLocaleString()} to ${clock(r.ts)}` : new Date(r.ts).toLocaleString()
}
</script>

<style lang="postcss" module>
.label {
  padding: 12px var(--w-pad) 4px;
}
.chips {
  padding: 2px var(--w-pad) 6px;
}
.row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px var(--w-pad);
  border-bottom: 1px solid var(--w-line-soft);
  cursor: pointer;
}
.row:hover,
.open {
  background: rgba(255, 255, 255, 0.03);
}
.undone { opacity: 0.45; }
.to {
  color: var(--w-fg);
  font-weight: 500;
}
.count {
  font-size: 0.75rem;
  color: var(--w-dim);
  border: 1px solid var(--w-line-soft);
  border-radius: 8px;
  padding: 0 6px;
}
.detail {
  padding: 4px var(--w-pad) 8px calc(var(--w-pad) + 24px);
  border-bottom: 1px solid var(--w-line-soft);
  background: rgba(0, 0, 0, 0.18);
}
.line {
  padding: 2px 0;
  font-size: 0.875rem;
}
</style>
