<template>
  <!-- Your rules (Guy's R1, 2026-11-28): the first row of the Loot rail, since
       they win over everything below. The list on the left, the builder on
       the right. -->
  <div :class="$style.wrap" data-own-rules>
    <div :class="$style.list" class="w-scroll">
      <div class="flex items-center gap-2" :class="$style.head">
        <span :class="$style.title">Your rules</span>
        <span class="w-faint text-xs">top of the filter, first one wins</span>
        <span class="grow" />
        <WButton size="sm" variant="ghost" icon="fas fa-plus" title="Make a rule from any conditions, ahead of everything else" @click="newOwnRule">New rule</WButton>
      </div>
      <WEmpty v-if="!config.rules.length" icon="fas fa-sliders-h">No rules of your own yet. Make one to show, hide or restyle anything by its conditions.</WEmpty>
      <button v-for="r in config.rules" :key="r.id" type="button" class="w-focusable" :class="[$style.row, { [$style.active]: r.id === editingId, [$style.off]: !r.on || ruleProblem(r, ruleNames) }]"
        data-no-item-tip="a rule's name, not an item" @click="editingId = r.id" @contextmenu="ruleMenu($event, r)">
        <span :class="$style.name" :title="r.name">{{ r.name }}</span>
        <LabelPreview :text="r.conditions.find(c => c.key === 'BaseType')?.values[0] ?? r.name" :style-override="r.patch" :visibility="r.visibility" style="max-width: 100%; overflow: hidden;" />
        <span class="w-trunc text-xs w-dim">
          <span v-if="ruleProblem(r, ruleNames)" style="color: var(--w-warn);">{{ ruleProblem(r, ruleNames) }}</span>
          <template v-else>{{ r.on ? '' : 'off · ' }}{{ ruleSummary(r) }}</template>
        </span>
      </button>
    </div>
    <div :class="$style.side" class="w-scroll">
      <RuleBuilder v-if="editing" :key="editing.id" :store="store" :rule="editing" @delete="deleteRule(editing)" />
      <WEmpty v-else icon="fas fa-sliders-h">Pick a rule to change it, or make a new one.</WEmpty>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { WButton, WEmpty, openMenu, toast } from '../ui'
import LabelPreview from './LabelPreview.vue'
import RuleBuilder from './RuleBuilder.vue'
import { nameCheck, newRule, ruleProblem, ruleSummary } from './rules'
import type { OwnRule } from './rules'
import { nextEditId } from './edits'
import type { LootFilterStore } from './store'
import type { LootFilterWidget } from './widget'

const props = defineProps<{ store: LootFilterStore, config: LootFilterWidget }>()

const editingId = ref<number | null>(props.config.rules[0]?.id ?? null)
const editing = computed(() => props.config.rules.find(r => r.id === editingId.value) ?? null)
const ruleNames = computed(() => nameCheck(props.store.doc.value))

function newOwnRule () {
  const rule = newRule(nextEditId(), props.config.rules.length + 1)
  const undo = props.store.changeWithUndo(c => { c.rules = [rule, ...c.rules] })
  editingId.value = rule.id
  toast('New rule at the top of your filter', { undo })
}

function deleteRule (r: OwnRule) {
  const undo = props.store.changeWithUndo(c => { c.rules = c.rules.filter(x => x.id !== r.id) })
  if (editingId.value === r.id) editingId.value = props.config.rules[0]?.id ?? null
  toast(`Deleted ${r.name}`, { undo })
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
    { label: 'Duplicate', icon: 'far fa-clone', action: () => { const copy: OwnRule = { ...JSON.parse(JSON.stringify(r)), id: nextEditId(), name: `${r.name} (copy)` }; props.config.rules = [...props.config.rules, copy]; editingId.value = copy.id } },
    { separator: true },
    { label: 'Remove', icon: 'fas fa-trash', danger: true, action: () => deleteRule(r) }
  ])
}
</script>

<style module>
.wrap { display: flex; flex: 1 1 auto; min-height: 0; }
.list { flex: 1 1 auto; min-width: 0; padding: 8px var(--w-pad); display: flex; flex-direction: column; gap: 4px; }
.side { flex: 0 0 24rem; border-left: 1px solid var(--w-line); padding: 10px var(--w-pad); display: flex; flex-direction: column; gap: 8px; }
.head { padding-bottom: 4px; }
.title { font-family: var(--w-head); font-size: var(--w-fs-lg); }
.row {
  display: grid;
  grid-template-columns: 8rem 11rem minmax(0, 1fr);
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
.row:hover { border-color: var(--w-line); }
.active { background: var(--w-accent-soft); border-color: var(--w-line-strong); }
.name { font-size: var(--w-fs-sm); color: var(--w-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.off { opacity: 0.5; text-decoration: line-through; }
</style>
