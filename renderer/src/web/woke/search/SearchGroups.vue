<template>
  <div :class="$style.root" data-search-groups-list>
    <div :class="$style.top">
      <span :class="$style.title">What search shows</span>
      <span :class="$style.btns">
        <WButton size="sm" variant="ghost" :disabled="!changed" @click="emit('update:modelValue', {})">Reset</WButton>
        <WButton v-if="done" size="sm" @click="emit('done')">Done</WButton>
      </span>
    </div>
    <p class="w-dim" :class="$style.hint">Open shows every result. Folded shows the top {{ GROUP_CAP }}, then "+N more". Off leaves the group out, and the list end says so. Prices and answers always show in full, and a chip above the results shows its groups in full.</p>
    <div v-for="g in SEARCH_GROUPS" :key="g.id" :class="$style.row" :data-group="g.id" data-no-item-tip="a result group, named after what it lists">
      <span class="w-trunc">{{ g.name }}<span v-if="g.note" class="w-faint" :class="$style.note">{{ g.note }}</span></span>
      <WSegmented :model-value="groupMode(g.id, modelValue)" :options="OPTIONS" :aria-label="g.name" @update:model-value="set(g.id, $event as GroupMode)" />
    </div>
  </div>
</template>

<script setup lang="ts">
// The list of result groups with Open / Folded / Off each: in the search
// palette behind its cog, and on Settings > Search.
import { computed } from 'vue'
import { WButton } from '../ui'
import WSegmented from '../ui/WSegmented.vue'
import { GROUP_CAP, SEARCH_GROUPS, groupMode, withMode } from './groups'
import type { GroupMode } from './groups'

const props = withDefaults(defineProps<{ modelValue: Record<string, GroupMode> | undefined, done?: boolean }>(), { done: true })
const emit = defineEmits<{ (e: 'update:modelValue', v: Record<string, GroupMode>): void, (e: 'done'): void }>()

const OPTIONS = [
  { value: 'open', label: 'Open', title: 'Every result' },
  { value: 'folded', label: 'Folded', title: `The top ${GROUP_CAP}, then "+N more"` },
  { value: 'off', label: 'Off', title: 'Left out; the list end says so' }
]
const changed = computed(() => Object.keys(props.modelValue ?? {}).length > 0)
function set (id: string, mode: GroupMode) {
  emit('update:modelValue', withMode(props.modelValue, id, mode))
}
</script>

<style module>
.root { display: flex; flex-direction: column; padding: var(--w-s2) var(--w-pad); gap: 2px; }
.top { display: flex; align-items: center; gap: var(--w-s2); }
.title { font-family: var(--w-caps-face); text-transform: var(--w-caps-case); letter-spacing: 0.05em; color: var(--w-accent); flex: 1; }
.btns { display: flex; gap: var(--w-s2); }
.hint { font-size: var(--w-fs-sm); margin: 2px 0 var(--w-s2); }
.row { display: flex; align-items: center; justify-content: space-between; gap: var(--w-s2); min-height: 30px; border-bottom: 1px solid var(--w-line-soft); }
.note { margin-left: var(--w-s2); font-size: var(--w-fs-sm); }
</style>
