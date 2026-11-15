<template>
  <DockItem id="claude" icon="fas fa-envelope" title="Suggestions" :show="open.length > 0"
    :badge="open.length" :wake="open.length" card-width="24rem" :menu="dockMenu">
    <template #card>
      <div :class="$style.body" data-claude-card>
        <div v-for="s in open" :key="s.id" :class="$style.row" data-claude-row>
          <div :class="$style.head">
            <span :class="$style.kind">{{ KIND_LABEL[s.kind] }}</span>
            <span :class="$style.title">{{ s.title }}</span>
          </div>
          <div v-if="s.why" :class="$style.why">{{ s.why }}</div>
          <div v-if="detail(s)" :class="$style.detail">{{ detail(s) }}</div>
          <div :class="$style.acts">
            <WButton size="sm" variant="primary" :disabled="busy === s.id" @click="onApply(s)">{{ s.kind === 'trade-search' ? 'Open search' : 'Apply' }}</WButton>
            <WButton size="sm" variant="ghost" :disabled="busy === s.id" @click="onDismiss(s)">Dismiss</WButton>
          </div>
        </div>
        <div class="w-faint text-xs">From Claude. Nothing changes until you apply it.</div>
      </div>
    </template>
  </DockItem>
</template>

<script setup lang="ts">
import { computed, onUnmounted, shallowRef } from 'vue'
import DockItem from '../dock/DockItem.vue'
import WButton from '../ui/WButton.vue'
import { toast } from '../ui'
import { describeEdit, isValidEdit } from '../loot-filter/edits'
import type { DockMenuAction } from '../dock/dock'
import type { ClaudeSuggestion, SuggestionKind } from '@ipc/claude-link'
import { apply, resolve, startClaudeLink, suggestions } from './suggestions'

const KIND_LABEL: Record<SuggestionKind, string> = {
  'trade-search': 'Trade search',
  'filter-change': 'Loot filter',
  'setting': 'Setting'
}

onUnmounted(startClaudeLink())

const open = computed(() => suggestions.value.filter(s => s.status === 'new').slice().reverse())
const busy = shallowRef<string | null>(null)

function detail (s: ClaudeSuggestion): string {
  if (s.kind === 'setting' && s.setting) return `${s.setting.key} → ${JSON.stringify(s.setting.value)}`
  if (s.kind === 'filter-change' && s.edit) {
    const e = { ...s.edit, id: 0 }
    return isValidEdit(e) ? describeEdit(e) : 'This change is not in a form the editor knows.'
  }
  return ''
}

async function onApply (s: ClaudeSuggestion) {
  busy.value = s.id
  try {
    const done = await apply(s)
    await resolve(s, 'applied')
    toast(done.message, { undo: done.undo, dock: true })
  } catch (e) {
    toast(e instanceof Error ? e.message : String(e), { dock: true })
  } finally {
    busy.value = null
  }
}

async function onDismiss (s: ClaudeSuggestion) {
  busy.value = s.id
  try {
    await resolve(s, 'dismissed')
  } catch (e) {
    toast(e instanceof Error ? e.message : String(e), { dock: true })
  } finally {
    busy.value = null
  }
}

const dockMenu = computed<DockMenuAction[]>(() => [
  { label: 'Dismiss all', icon: 'fas fa-times', action: () => { for (const s of open.value) resolve(s, 'dismissed').catch(() => {}) } }
])
</script>

<style module>
.body { display: flex; flex-direction: column; gap: 6px; padding: 6px var(--w-pad) 8px; max-height: 60vh; overflow-y: auto; }
.row { display: flex; flex-direction: column; gap: 3px; padding-bottom: 6px; border-bottom: 1px solid var(--w-row-fade, var(--w-line)); }
.head { display: flex; gap: 6px; align-items: baseline; min-width: 0; }
.kind { flex: none; font-size: calc(11px * var(--w-text-scale, 1)); padding: 0 5px; border: 1px solid var(--w-frame, var(--w-line)); border-radius: var(--w-r-sm); color: var(--w-gold, var(--w-fg)); }
.title { color: var(--w-gold-hi, var(--w-fg)); font-family: var(--w-label, inherit); min-width: 0; overflow-wrap: anywhere; }
.why { color: var(--w-fg-dim, var(--w-faint)); font-size: calc(12.5px * var(--w-text-scale, 1)); }
.detail { font-family: var(--w-num); font-size: calc(12px * var(--w-text-scale, 1)); background: var(--w-well, transparent); border: 1px solid var(--w-well-line, var(--w-line)); border-radius: var(--w-r-sm); padding: 2px 6px; overflow-wrap: anywhere; }
.acts { display: flex; gap: 6px; }
</style>
